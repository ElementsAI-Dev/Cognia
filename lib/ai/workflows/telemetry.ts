/**
 * Workflow Telemetry Module
 * Collects and manages execution metrics for workflow steps and workflows
 */

import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Step-level telemetry data
 */
export interface StepTelemetry {
  workflowId: string;
  executionId: string;
  stepId: string;
  stepName: string;
  stepType: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'success' | 'failed' | 'skipped';
  inputSize: number;
  outputSize?: number;
  tokensUsed?: number;
  retryCount: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow-level telemetry data
 */
export interface WorkflowTelemetry {
  workflowId: string;
  workflowName: string;
  executionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  totalTokensUsed: number;
  steps: StepTelemetry[];
  status: 'running' | 'success' | 'failed' | 'cancelled';
  error?: string;
}

/**
 * Aggregated metrics for analysis
 */
export interface WorkflowMetrics {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  totalTokensUsed: number;
  stepMetrics: Record<string, StepMetrics>;
}

/**
 * Step-level aggregated metrics
 */
export interface StepMetrics {
  stepId: string;
  stepType: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  averageDuration: number;
  retryRate: number;
  totalTokensUsed: number;
}

/**
 * Telemetry collector class
 * Manages collection and aggregation of workflow execution metrics
 */
class TelemetryCollector {
  private executions = new Map<string, WorkflowTelemetry>();
  private maxStoredExecutions = 1000;
  private listeners: Set<(telemetry: WorkflowTelemetry) => void> = new Set();

  /**
   * Start tracking a new workflow execution
   */
  startExecution(
    workflowId: string,
    workflowName: string,
    executionId: string,
    totalSteps: number
  ): void {
    const telemetry: WorkflowTelemetry = {
      workflowId,
      workflowName,
      executionId,
      startTime: Date.now(),
      totalSteps,
      completedSteps: 0,
      failedSteps: 0,
      skippedSteps: 0,
      totalTokensUsed: 0,
      steps: [],
      status: 'running',
    };

    this.executions.set(executionId, telemetry);
    this.cleanupOldExecutions();

    log.debug('[Telemetry] Started tracking execution', {
      workflowId,
      executionId,
      totalSteps,
    });
  }

  /**
   * Record a step starting
   */
  startStep(
    executionId: string,
    stepId: string,
    stepName: string,
    stepType: string,
    inputSize: number
  ): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stepTelemetry: StepTelemetry = {
      workflowId: execution.workflowId,
      executionId,
      stepId,
      stepName,
      stepType,
      startTime: Date.now(),
      status: 'running',
      inputSize,
      retryCount: 0,
    };

    execution.steps.push(stepTelemetry);
  }

  /**
   * Record a step completing (success or failure)
   */
  completeStep(
    executionId: string,
    stepId: string,
    options: {
      success: boolean;
      outputSize?: number;
      tokensUsed?: number;
      retryCount?: number;
      error?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stepTelemetry = execution.steps.find((s) => s.stepId === stepId);
    if (!stepTelemetry) return;

    const endTime = Date.now();
    stepTelemetry.endTime = endTime;
    stepTelemetry.duration = endTime - stepTelemetry.startTime;
    stepTelemetry.status = options.success ? 'success' : 'failed';
    stepTelemetry.outputSize = options.outputSize;
    stepTelemetry.tokensUsed = options.tokensUsed;
    stepTelemetry.retryCount = options.retryCount ?? 0;
    stepTelemetry.error = options.error;
    stepTelemetry.metadata = options.metadata;

    // Update execution counters
    if (options.success) {
      execution.completedSteps++;
    } else {
      execution.failedSteps++;
    }

    if (options.tokensUsed) {
      execution.totalTokensUsed += options.tokensUsed;
    }

    log.debug('[Telemetry] Step completed', {
      executionId,
      stepId,
      duration: stepTelemetry.duration,
      success: options.success,
    });
  }

  /**
   * Record a step being skipped
   */
  skipStep(executionId: string, stepId: string, stepName: string, stepType: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const stepTelemetry: StepTelemetry = {
      workflowId: execution.workflowId,
      executionId,
      stepId,
      stepName,
      stepType,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      status: 'skipped',
      inputSize: 0,
      retryCount: 0,
    };

    execution.steps.push(stepTelemetry);
    execution.skippedSteps++;
  }

  /**
   * Complete a workflow execution
   */
  completeExecution(
    executionId: string,
    options: {
      success: boolean;
      error?: string;
    }
  ): WorkflowTelemetry | undefined {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.endTime = Date.now();
    execution.totalDuration = execution.endTime - execution.startTime;
    execution.status = options.success ? 'success' : 'failed';
    execution.error = options.error;

    log.info('[Telemetry] Workflow execution completed', {
      workflowId: execution.workflowId,
      executionId,
      status: execution.status,
      duration: execution.totalDuration,
      completedSteps: execution.completedSteps,
      failedSteps: execution.failedSteps,
      totalTokensUsed: execution.totalTokensUsed,
    });

    // Notify listeners
    this.notifyListeners(execution);

    return execution;
  }

  /**
   * Cancel a workflow execution
   */
  cancelExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.endTime = Date.now();
    execution.totalDuration = execution.endTime - execution.startTime;
    execution.status = 'cancelled';

    this.notifyListeners(execution);
  }

  /**
   * Get telemetry for a specific execution
   */
  getExecution(executionId: string): WorkflowTelemetry | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions for a workflow
   */
  getWorkflowExecutions(workflowId: string): WorkflowTelemetry[] {
    return Array.from(this.executions.values()).filter(
      (e) => e.workflowId === workflowId
    );
  }

  /**
   * Calculate aggregated metrics for a workflow
   */
  getWorkflowMetrics(workflowId: string): WorkflowMetrics | null {
    const executions = this.getWorkflowExecutions(workflowId);
    if (executions.length === 0) return null;

    const completedExecutions = executions.filter(
      (e) => e.status === 'success' || e.status === 'failed'
    );

    const durations = completedExecutions
      .filter((e) => e.totalDuration !== undefined)
      .map((e) => e.totalDuration!)
      .sort((a, b) => a - b);

    const stepMetrics: Record<string, StepMetrics> = {};

    // Aggregate step metrics
    for (const execution of executions) {
      for (const step of execution.steps) {
        if (!stepMetrics[step.stepId]) {
          stepMetrics[step.stepId] = {
            stepId: step.stepId,
            stepType: step.stepType,
            totalExecutions: 0,
            successCount: 0,
            failureCount: 0,
            averageDuration: 0,
            retryRate: 0,
            totalTokensUsed: 0,
          };
        }

        const metrics = stepMetrics[step.stepId];
        metrics.totalExecutions++;
        if (step.status === 'success') metrics.successCount++;
        if (step.status === 'failed') metrics.failureCount++;
        if (step.duration) {
          metrics.averageDuration =
            (metrics.averageDuration * (metrics.totalExecutions - 1) + step.duration) /
            metrics.totalExecutions;
        }
        if (step.retryCount > 0) {
          metrics.retryRate =
            (metrics.retryRate * (metrics.totalExecutions - 1) + 1) / metrics.totalExecutions;
        }
        if (step.tokensUsed) metrics.totalTokensUsed += step.tokensUsed;
      }
    }

    return {
      totalExecutions: executions.length,
      successCount: executions.filter((e) => e.status === 'success').length,
      failureCount: executions.filter((e) => e.status === 'failed').length,
      averageDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p50Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0,
      p95Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0,
      p99Duration: durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0,
      totalTokensUsed: executions.reduce((sum, e) => sum + e.totalTokensUsed, 0),
      stepMetrics,
    };
  }

  /**
   * Export all telemetry data
   */
  exportAll(): WorkflowTelemetry[] {
    return Array.from(this.executions.values());
  }

  /**
   * Clear all telemetry data
   */
  clear(): void {
    this.executions.clear();
  }

  /**
   * Subscribe to telemetry updates
   */
  subscribe(listener: (telemetry: WorkflowTelemetry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(telemetry: WorkflowTelemetry): void {
    for (const listener of this.listeners) {
      try {
        listener(telemetry);
      } catch (error) {
        log.warn('[Telemetry] Listener error', { error });
      }
    }
  }

  private cleanupOldExecutions(): void {
    if (this.executions.size > this.maxStoredExecutions) {
      // Remove oldest executions
      const entries = Array.from(this.executions.entries())
        .sort((a, b) => a[1].startTime - b[1].startTime);

      const toRemove = entries.slice(0, entries.length - this.maxStoredExecutions);
      for (const [id] of toRemove) {
        this.executions.delete(id);
      }
    }
  }
}

/**
 * Singleton telemetry collector instance
 */
export const telemetryCollector = new TelemetryCollector();

/**
 * Helper to calculate object size in bytes (approximate)
 */
export function estimateObjectSize(obj: unknown): number {
  try {
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    return 0;
  }
}

/**
 * Create a telemetry-enabled step executor wrapper
 */
export function withTelemetry<T>(
  executionId: string,
  stepId: string,
  stepName: string,
  stepType: string,
  input: Record<string, unknown>,
  executor: () => Promise<T>
): Promise<T> {
  const inputSize = estimateObjectSize(input);
  telemetryCollector.startStep(executionId, stepId, stepName, stepType, inputSize);

  return executor()
    .then((result) => {
      const outputSize = estimateObjectSize(result);
      const resultObj = result as Record<string, unknown>;
      const usage = resultObj?.usage as Record<string, unknown> | undefined;
      telemetryCollector.completeStep(executionId, stepId, {
        success: true,
        outputSize,
        tokensUsed: usage?.totalTokens as number | undefined,
      });
      return result;
    })
    .catch((error) => {
      telemetryCollector.completeStep(executionId, stepId, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
}
