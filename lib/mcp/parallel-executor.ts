/**
 * MCP Parallel Tool Executor
 *
 * Provides parallel execution of MCP tools with:
 * - Configurable concurrency limits
 * - Timeout handling
 * - Progress tracking
 * - Priority queue
 */

import type { ToolCallResult } from '@/types/mcp';
import { createClassifiedError, type ClassifiedMcpError } from './error-handler';

/**
 * Parallel execution configuration
 */
export interface ParallelExecutionConfig {
  /** Maximum concurrent tool executions (default: 5) */
  maxConcurrent: number;
  /** Timeout per tool execution in milliseconds (default: 30000) */
  timeout: number;
  /** Whether to retry on transient errors (default: false) */
  retryOnError: boolean;
  /** Maximum retry attempts (default: 1) */
  maxRetries: number;
}

const DEFAULT_CONFIG: ParallelExecutionConfig = {
  maxConcurrent: 5,
  timeout: 30000,
  retryOnError: false,
  maxRetries: 1,
};

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
  /** Unique call ID */
  callId: string;
  /** Target server ID */
  serverId: string;
  /** Tool name */
  toolName: string;
  /** Tool arguments */
  args: Record<string, unknown>;
  /** Priority (0-10, higher = more urgent) */
  priority?: number;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Call ID */
  callId: string;
  /** Successful result */
  result?: ToolCallResult;
  /** Error if failed */
  error?: ClassifiedMcpError;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether the execution succeeded */
  success: boolean;
}

/**
 * Executor status
 */
export interface ExecutorStatus {
  /** Currently running executions */
  running: number;
  /** Queued executions */
  queued: number;
  /** Completed executions */
  completed: number;
  /** Failed executions */
  failed: number;
}

/**
 * Parallel tool executor for MCP
 */
export class ParallelToolExecutor {
  private config: ParallelExecutionConfig;
  private queue: Array<{
    request: ToolExecutionRequest;
    resolve: (result: ToolExecutionResult) => void;
  }> = [];
  private running: Map<string, AbortController> = new Map();
  private stats = { completed: 0, failed: 0 };
  private callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<ToolCallResult>;

  constructor(
    callTool: (
      serverId: string,
      toolName: string,
      args: Record<string, unknown>
    ) => Promise<ToolCallResult>,
    config: Partial<ParallelExecutionConfig> = {}
  ) {
    this.callTool = callTool;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Submit a tool execution request
   */
  async submit(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    return new Promise((resolve) => {
      // Check if we can execute immediately
      if (this.running.size < this.config.maxConcurrent) {
        this.execute(request, resolve);
      } else {
        // Add to priority queue
        this.queue.push({ request, resolve });
        this.queue.sort((a, b) => (b.request.priority || 0) - (a.request.priority || 0));
      }
    });
  }

  /**
   * Submit multiple requests in batch
   */
  async submitBatch(requests: ToolExecutionRequest[]): Promise<ToolExecutionResult[]> {
    return Promise.all(requests.map((req) => this.submit(req)));
  }

  /**
   * Cancel a pending or running execution
   */
  cancel(callId: string): boolean {
    // Try to cancel running execution
    const controller = this.running.get(callId);
    if (controller) {
      controller.abort();
      this.running.delete(callId);
      return true;
    }

    // Remove from queue
    const index = this.queue.findIndex((item) => item.request.callId === callId);
    if (index !== -1) {
      const item = this.queue.splice(index, 1)[0];
      item.resolve({
        callId,
        duration: 0,
        success: false,
        error: createClassifiedError('Cancelled by user'),
      });
      return true;
    }

    return false;
  }

  /**
   * Cancel all pending and running executions
   */
  cancelAll(): void {
    // Cancel all running
    for (const [callId, controller] of this.running) {
      controller.abort();
      this.running.delete(callId);
    }

    // Clear queue
    for (const item of this.queue) {
      item.resolve({
        callId: item.request.callId,
        duration: 0,
        success: false,
        error: createClassifiedError('Cancelled by user'),
      });
    }
    this.queue = [];
  }

  /**
   * Get current executor status
   */
  getStatus(): ExecutorStatus {
    return {
      running: this.running.size,
      queued: this.queue.length,
      completed: this.stats.completed,
      failed: this.stats.failed,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { completed: 0, failed: 0 };
  }

  /**
   * Execute a tool request
   */
  private async execute(
    request: ToolExecutionRequest,
    resolve: (result: ToolExecutionResult) => void
  ): Promise<void> {
    const controller = new AbortController();
    this.running.set(request.callId, controller);

    const startTime = Date.now();

    try {
      const result = await this.executeWithTimeout(request, controller.signal);
      const duration = Date.now() - startTime;

      this.stats.completed++;
      resolve({
        callId: request.callId,
        result,
        duration,
        success: true,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const classifiedError = createClassifiedError(String(error));

      this.stats.failed++;
      resolve({
        callId: request.callId,
        error: classifiedError,
        duration,
        success: false,
      });
    } finally {
      this.running.delete(request.callId);
      this.processQueue();
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    request: ToolExecutionRequest,
    signal: AbortSignal
  ): Promise<ToolCallResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Check if already aborted
      if (signal.aborted) {
        clearTimeout(timeoutId);
        reject(new Error('Cancelled'));
        return;
      }

      // Listen for abort
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('Cancelled'));
      });

      this.callTool(request.serverId, request.toolName, request.args)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Process queued items
   */
  private processQueue(): void {
    while (this.queue.length > 0 && this.running.size < this.config.maxConcurrent) {
      const item = this.queue.shift();
      if (item) {
        this.execute(item.request, item.resolve);
      }
    }
  }
}

/**
 * Create a parallel executor bound to the MCP store
 */
export function createParallelExecutor(
  callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<ToolCallResult>,
  config?: Partial<ParallelExecutionConfig>
): ParallelToolExecutor {
  return new ParallelToolExecutor(callTool, config);
}
