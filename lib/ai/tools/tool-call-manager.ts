/**
 * Tool Call Manager - Parallel tool execution with blocking/non-blocking modes
 * 
 * Features:
 * - Concurrent tool execution with configurable pool size
 * - Blocking mode: waits for all results before returning
 * - Non-blocking mode: returns immediately with pending status, results collected via callbacks
 * - Timeout handling per tool call
 * - Result aggregation and error handling
 * - Integration with existing ToolCall structure
 */

import { nanoid } from 'nanoid';
import type { ToolCall } from '../agent/agent-executor';
import { createCancellationToken, type CancellationToken } from '@/types/agent/sub-agent';

/**
 * Tool execution mode
 */
export type ToolExecutionMode = 'blocking' | 'non-blocking';

/**
 * Pending tool result for non-blocking mode
 */
export interface PendingToolResult {
  id: string;
  toolCallId: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'timeout' | 'cancelled';
  promise: Promise<unknown>;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

/**
 * Tool execution task in the queue
 */
interface ToolExecutionTask {
  id: string;
  toolCall: ToolCall;
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout?: number;
  blocking: boolean;
  priority: number;
  queuedAt: Date;
  timeoutHandler?: ReturnType<typeof setTimeout>;
}

/**
 * Tool call manager configuration
 */
export interface ToolCallManagerConfig {
  /** Default execution mode */
  mode: ToolExecutionMode;
  /** Maximum concurrent tool executions */
  maxConcurrent: number;
  /** Default timeout per tool call in milliseconds */
  defaultTimeout?: number;
  /** Callback when tool execution starts */
  onToolStart?: (toolCall: ToolCall) => void;
  /** Callback when tool execution completes */
  onToolResult?: (toolCall: ToolCall) => void;
  /** Callback when tool execution fails */
  onToolError?: (toolCall: ToolCall, error: Error) => void;
  /** Callback for progress updates */
  onProgress?: (stats: ToolCallManagerStats) => void;
  /** Cancellation token for aborting all executions */
  cancellationToken?: CancellationToken;
}

/**
 * Tool call manager statistics
 */
export interface ToolCallManagerStats {
  /** Total tools queued */
  queued: number;
  /** Currently running tools */
  running: number;
  /** Completed tools */
  completed: number;
  /** Failed tools */
  failed: number;
  /** Pending tools (non-blocking mode) */
  pending: number;
  /** Max concurrent allowed */
  maxConcurrent: number;
}

/**
 * Detailed tool call metrics for observability
 */
export interface ToolCallMetrics {
  /** Basic stats */
  stats: ToolCallManagerStats;
  /** Total tool calls ever enqueued */
  totalEnqueued: number;
  /** Total tool calls timed out */
  totalTimeouts: number;
  /** Total tool calls cancelled */
  totalCancelled: number;
  /** Average execution time in ms */
  avgExecutionTime: number;
  /** Min execution time in ms */
  minExecutionTime: number;
  /** Max execution time in ms */
  maxExecutionTime: number;
  /** P50 execution time in ms */
  p50ExecutionTime: number;
  /** P95 execution time in ms */
  p95ExecutionTime: number;
  /** P99 execution time in ms */
  p99ExecutionTime: number;
  /** Execution times by tool name */
  executionTimesByTool: Record<string, {
    count: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }>;
  /** Error counts by tool name */
  errorsByTool: Record<string, number>;
  /** Success rate percentage */
  successRate: number;
  /** Throughput (completions per minute) */
  throughputPerMinute: number;
  /** Manager uptime in ms */
  uptimeMs: number;
}

/**
 * Flush result containing all pending tool results
 */
export interface FlushResult {
  /** All completed tool calls */
  completed: ToolCall[];
  /** All failed tool calls */
  failed: ToolCall[];
  /** Total duration of flush operation */
  duration: number;
}

/**
 * Default configuration
 */
export const DEFAULT_TOOL_CALL_MANAGER_CONFIG: ToolCallManagerConfig = {
  mode: 'blocking',
  maxConcurrent: 5,
  defaultTimeout: 60000, // 1 minute
};

/**
 * Tool Call Manager class for managing parallel tool executions
 */
export class ToolCallManager {
  private config: ToolCallManagerConfig;
  private queue: ToolExecutionTask[] = [];
  private running: Map<string, ToolExecutionTask> = new Map();
  private pendingResults: Map<string, PendingToolResult> = new Map();
  private completedCalls: ToolCall[] = [];
  private failedCalls: ToolCall[] = [];
  private isProcessing = false;
  private cancellationToken: CancellationToken;

  // Metrics tracking
  private startTime: number = Date.now();
  private totalEnqueued: number = 0;
  private totalTimeouts: number = 0;
  private totalCancelled: number = 0;
  private executionTimes: number[] = [];
  private executionTimesByTool: Map<string, number[]> = new Map();
  private errorsByTool: Map<string, number> = new Map();

  constructor(config: Partial<ToolCallManagerConfig> = {}) {
    this.config = { ...DEFAULT_TOOL_CALL_MANAGER_CONFIG, ...config };
    this.cancellationToken = config.cancellationToken ?? createCancellationToken();
  }

  /**
   * Get current statistics
   */
  getStats(): ToolCallManagerStats {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completedCalls.length,
      failed: this.failedCalls.length,
      pending: this.pendingResults.size,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  /**
   * Get detailed metrics for observability
   */
  getMetrics(): ToolCallMetrics {
    const stats = this.getStats();
    const uptimeMs = Date.now() - this.startTime;

    // Calculate percentiles
    const sortedTimes = [...this.executionTimes].sort((a, b) => a - b);
    const getPercentile = (p: number): number => {
      if (sortedTimes.length === 0) return 0;
      const index = Math.ceil((p / 100) * sortedTimes.length) - 1;
      return sortedTimes[Math.max(0, index)] ?? 0;
    };

    // Calculate per-tool metrics
    const executionTimesByTool: ToolCallMetrics['executionTimesByTool'] = {};
    for (const [toolName, times] of this.executionTimesByTool.entries()) {
      if (times.length > 0) {
        const totalTime = times.reduce((a, b) => a + b, 0);
        executionTimesByTool[toolName] = {
          count: times.length,
          avgTime: totalTime / times.length,
          minTime: Math.min(...times),
          maxTime: Math.max(...times),
          totalTime,
        };
      }
    }

    // Convert error map to object
    const errorsByTool: Record<string, number> = {};
    for (const [toolName, count] of this.errorsByTool.entries()) {
      errorsByTool[toolName] = count;
    }

    // Calculate success rate
    const totalFinished = this.completedCalls.length + this.failedCalls.length;
    const successRate = totalFinished > 0 
      ? (this.completedCalls.length / totalFinished) * 100 
      : 100;

    // Calculate throughput (completions per minute)
    const uptimeMinutes = uptimeMs / 60000;
    const throughputPerMinute = uptimeMinutes > 0 
      ? this.completedCalls.length / uptimeMinutes 
      : 0;

    return {
      stats,
      totalEnqueued: this.totalEnqueued,
      totalTimeouts: this.totalTimeouts,
      totalCancelled: this.totalCancelled,
      avgExecutionTime: sortedTimes.length > 0 
        ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length 
        : 0,
      minExecutionTime: sortedTimes.length > 0 ? sortedTimes[0] : 0,
      maxExecutionTime: sortedTimes.length > 0 ? sortedTimes[sortedTimes.length - 1] : 0,
      p50ExecutionTime: getPercentile(50),
      p95ExecutionTime: getPercentile(95),
      p99ExecutionTime: getPercentile(99),
      executionTimesByTool,
      errorsByTool,
      successRate,
      throughputPerMinute,
      uptimeMs,
    };
  }

  /**
   * Record execution time for metrics
   */
  private recordExecutionTime(toolName: string, durationMs: number): void {
    this.executionTimes.push(durationMs);
    
    // Keep only last 1000 samples for memory efficiency
    if (this.executionTimes.length > 1000) {
      this.executionTimes.shift();
    }

    // Record per-tool times
    if (!this.executionTimesByTool.has(toolName)) {
      this.executionTimesByTool.set(toolName, []);
    }
    const toolTimes = this.executionTimesByTool.get(toolName)!;
    toolTimes.push(durationMs);
    if (toolTimes.length > 100) {
      toolTimes.shift();
    }
  }

  /**
   * Record error for metrics
   */
  private recordError(toolName: string): void {
    const current = this.errorsByTool.get(toolName) ?? 0;
    this.errorsByTool.set(toolName, current + 1);
  }

  /**
   * Reset metrics (but not state)
   */
  resetMetrics(): void {
    this.startTime = Date.now();
    this.totalEnqueued = 0;
    this.totalTimeouts = 0;
    this.totalCancelled = 0;
    this.executionTimes = [];
    this.executionTimesByTool.clear();
    this.errorsByTool.clear();
  }

  /**
   * Enqueue a tool call for execution
   * 
   * @param toolCall - The tool call to execute
   * @param execute - The execution function
   * @param options - Execution options
   * @returns Promise that resolves to result (blocking) or PendingToolResult (non-blocking)
   */
  async enqueue(
    toolCall: ToolCall,
    execute: () => Promise<unknown>,
    options: {
      blocking?: boolean;
      timeout?: number;
      priority?: number;
    } = {}
  ): Promise<unknown | PendingToolResult> {
    const {
      blocking = this.config.mode === 'blocking',
      timeout = this.config.defaultTimeout,
      priority = 5,
    } = options;

    // Check cancellation
    if (this.cancellationToken.isCancelled) {
      const error = new Error('Tool call manager cancelled');
      toolCall.status = 'error';
      toolCall.error = error.message;
      throw error;
    }

    return new Promise<unknown | PendingToolResult>((resolve, reject) => {
      const taskId = nanoid();
      
      const task: ToolExecutionTask = {
        id: taskId,
        toolCall,
        execute,
        resolve,
        reject,
        timeout,
        blocking,
        priority,
        queuedAt: new Date(),
      };

      // Add to queue (sorted by priority)
      this.queue.push(task);
      this.queue.sort((a, b) => a.priority - b.priority);

      // Track metrics
      this.totalEnqueued++;

      // Update tool call status
      toolCall.status = 'pending';

      // For non-blocking mode, create pending result and resolve immediately
      if (!blocking) {
        const pendingResult: PendingToolResult = {
          id: taskId,
          toolCallId: toolCall.id,
          status: 'pending',
          promise: new Promise((res, rej) => {
            // Store original resolve/reject for later
            task.resolve = (value) => {
              pendingResult.status = 'completed';
              pendingResult.result = value;
              pendingResult.completedAt = new Date();
              res(value);
            };
            task.reject = (error) => {
              pendingResult.status = 'error';
              pendingResult.error = error.message;
              pendingResult.completedAt = new Date();
              rej(error);
            };
          }),
          startedAt: new Date(),
        };
        
        this.pendingResults.set(taskId, pendingResult);
        
        // Resolve with pending result immediately
        resolve(pendingResult);
      }

      // Start processing queue
      this.processQueue();
    });
  }

  /**
   * Enqueue multiple tool calls for parallel execution
   */
  async enqueueAll(
    toolCalls: Array<{
      toolCall: ToolCall;
      execute: () => Promise<unknown>;
      options?: {
        blocking?: boolean;
        timeout?: number;
        priority?: number;
      };
    }>,
    options: {
      blocking?: boolean;
    } = {}
  ): Promise<Array<unknown | PendingToolResult>> {
    const { blocking = this.config.mode === 'blocking' } = options;

    const promises = toolCalls.map(({ toolCall, execute, options: taskOptions }) =>
      this.enqueue(toolCall, execute, { blocking, ...taskOptions })
    );

    if (blocking) {
      // Wait for all to complete
      return Promise.all(promises);
    } else {
      // Return pending results immediately
      return promises;
    }
  }

  /**
   * Process the execution queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (
        this.queue.length > 0 &&
        this.running.size < this.config.maxConcurrent &&
        !this.cancellationToken.isCancelled
      ) {
        const task = this.queue.shift();
        if (!task) break;

        this.executeTask(task);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: ToolExecutionTask): Promise<void> {
    const { toolCall, execute, timeout } = task;

    // Add to running
    this.running.set(task.id, task);
    toolCall.status = 'running';
    toolCall.startedAt = new Date();

    // Update pending result status if exists
    const pendingResult = this.pendingResults.get(task.id);
    if (pendingResult) {
      pendingResult.status = 'running';
    }

    // Notify start
    this.config.onToolStart?.(toolCall);

    // Setup timeout if configured
    let timeoutHandler: ReturnType<typeof setTimeout> | undefined;
    let timeoutPromise: Promise<never> | undefined;

    if (timeout && timeout > 0) {
      timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandler = setTimeout(() => {
          reject(new Error(`Tool call timeout after ${timeout}ms`));
        }, timeout);
      });
      task.timeoutHandler = timeoutHandler;
    }

    try {
      // Execute with optional timeout
      const result = await (timeoutPromise
        ? Promise.race([execute(), timeoutPromise])
        : execute());

      // Clear timeout
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }

      // Update tool call
      toolCall.status = 'completed';
      toolCall.result = result;
      toolCall.completedAt = new Date();

      // Track completed
      this.completedCalls.push(toolCall);

      // Record metrics
      if (toolCall.startedAt && toolCall.completedAt) {
        const duration = toolCall.completedAt.getTime() - toolCall.startedAt.getTime();
        this.recordExecutionTime(toolCall.name, duration);
      }

      // Notify result
      this.config.onToolResult?.(toolCall);

      // Resolve the promise
      task.resolve(result);

    } catch (error) {
      // Clear timeout
      if (timeoutHandler) {
        clearTimeout(timeoutHandler);
      }

      const err = error instanceof Error ? error : new Error(String(error));

      // Check if it's a timeout
      const isTimeout = err.message.includes('timeout');
      
      // Update tool call
      toolCall.status = 'error';
      toolCall.error = err.message;
      toolCall.completedAt = new Date();

      // Update pending result if exists
      if (pendingResult) {
        pendingResult.status = isTimeout ? 'timeout' : 'error';
        pendingResult.error = err.message;
        pendingResult.completedAt = new Date();
      }

      // Track failed
      this.failedCalls.push(toolCall);

      // Record error metrics
      this.recordError(toolCall.name);
      if (isTimeout) {
        this.totalTimeouts++;
      }

      // Notify error
      this.config.onToolError?.(toolCall, err);

      // Reject the promise
      task.reject(err);

    } finally {
      // Remove from running
      this.running.delete(task.id);

      // Emit progress
      this.config.onProgress?.(this.getStats());

      // Continue processing queue
      this.processQueue();
    }
  }

  /**
   * Flush all pending results - wait for all queued/running tasks to complete
   */
  async flushPending(): Promise<FlushResult> {
    const startTime = Date.now();

    // Wait for all pending results
    const pendingPromises = Array.from(this.pendingResults.values()).map(
      (pending) => pending.promise.catch(() => {}) // Ignore errors, they're already tracked
    );

    // Also wait for any blocking tasks
    const runningPromises = Array.from(this.running.values()).map(
      (task) => new Promise((resolve) => {
        // Create a promise that resolves when task completes
        const originalResolve = task.resolve;
        const originalReject = task.reject;
        task.resolve = (value) => {
          originalResolve(value);
          resolve(value);
        };
        task.reject = (error) => {
          originalReject(error);
          resolve(undefined);
        };
      })
    );

    await Promise.all([...pendingPromises, ...runningPromises]);

    // Wait for queue to drain
    while (this.queue.length > 0 || this.running.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return {
      completed: [...this.completedCalls],
      failed: [...this.failedCalls],
      duration: Date.now() - startTime,
    };
  }

  /**
   * Cancel all pending executions
   */
  cancelPending(reason: string = 'Cancelled'): void {
    // Cancel the token
    this.cancellationToken.cancel();

    // Clear timeouts for running tasks
    for (const task of this.running.values()) {
      if (task.timeoutHandler) {
        clearTimeout(task.timeoutHandler);
      }
      
      // Update tool call
      task.toolCall.status = 'error';
      task.toolCall.error = reason;
      task.toolCall.completedAt = new Date();
      
      // Reject the promise
      task.reject(new Error(reason));
    }

    // Clear queue
    for (const task of this.queue) {
      task.toolCall.status = 'error';
      task.toolCall.error = reason;
      task.reject(new Error(reason));
    }

    // Update pending results
    for (const pending of this.pendingResults.values()) {
      if (pending.status === 'pending' || pending.status === 'running') {
        pending.status = 'cancelled';
        pending.error = reason;
        pending.completedAt = new Date();
      }
    }

    this.queue = [];
    this.running.clear();
  }

  /**
   * Get all pending results
   */
  getPendingResults(): PendingToolResult[] {
    return Array.from(this.pendingResults.values());
  }

  /**
   * Get a specific pending result by ID
   */
  getPendingResult(id: string): PendingToolResult | undefined {
    return this.pendingResults.get(id);
  }

  /**
   * Check if there are any pending or running tasks
   */
  hasPending(): boolean {
    return this.queue.length > 0 || this.running.size > 0;
  }

  /**
   * Get completed tool calls
   */
  getCompletedCalls(): ToolCall[] {
    return [...this.completedCalls];
  }

  /**
   * Get failed tool calls
   */
  getFailedCalls(): ToolCall[] {
    return [...this.failedCalls];
  }

  /**
   * Reset the manager state
   */
  reset(): void {
    this.cancelPending('Reset');
    this.pendingResults.clear();
    this.completedCalls = [];
    this.failedCalls = [];
    this.cancellationToken = createCancellationToken();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ToolCallManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolCallManagerConfig {
    return { ...this.config };
  }
}

/**
 * Create a new ToolCallManager instance
 */
export function createToolCallManager(
  config: Partial<ToolCallManagerConfig> = {}
): ToolCallManager {
  return new ToolCallManager(config);
}

/**
 * Global tool call manager instance (optional singleton)
 */
let globalToolCallManager: ToolCallManager | null = null;

/**
 * Get or create the global tool call manager
 */
export function getGlobalToolCallManager(): ToolCallManager {
  if (!globalToolCallManager) {
    globalToolCallManager = new ToolCallManager();
  }
  return globalToolCallManager;
}

/**
 * Set the global tool call manager
 */
export function setGlobalToolCallManager(manager: ToolCallManager): void {
  globalToolCallManager = manager;
}

/**
 * Reset the global tool call manager
 */
export function resetGlobalToolCallManager(): void {
  if (globalToolCallManager) {
    globalToolCallManager.reset();
  }
  globalToolCallManager = null;
}
