/**
 * Plugin Task Executor
 *
 * Handles execution of plugin-defined scheduled tasks
 */

import type { ScheduledTask, TaskExecution } from '@/types/scheduler';
import type {
  PluginTaskContext,
  PluginTaskResult as _PluginTaskResult,
} from '@/types/plugin/plugin-scheduler';
import {
  getPluginTaskHandler,
} from '@/lib/plugin/scheduler/scheduler-plugin-executor';
import { createLogger } from '@/lib/logger';

const log = createLogger('scheduler:plugin-executor');

// =============================================================================
// Plugin Task Payload
// =============================================================================

export interface PluginTaskPayload {
  pluginId: string;
  handler: string;
  args?: Record<string, unknown>;
}

// =============================================================================
// Execution Context
// =============================================================================

/**
 * Active execution contexts for cancellation support
 */
const activeExecutions = new Map<string, AbortController>();

/**
 * Execution logs per execution
 */
const executionLogs = new Map<
  string,
  Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
  }>
>();

// =============================================================================
// Plugin Task Executor
// =============================================================================

/**
 * Execute a plugin task
 */
export async function executePluginTask(
  task: ScheduledTask,
  execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  const payload = task.payload as unknown as PluginTaskPayload | undefined;

  if (!payload) {
    return { success: false, error: 'Plugin task payload is missing' };
  }

  const { pluginId, handler, args = {} } = payload;
  const fullHandlerName = `${pluginId}:${handler}`;

  // Get the registered handler from the canonical plugin registry
  const taskHandler = getPluginTaskHandler(fullHandlerName);
  if (!taskHandler) {
    return {
      success: false,
      error: `Plugin task handler not found: ${fullHandlerName}`,
    };
  }

  // Create abort controller for cancellation
  const abortController = new AbortController();
  activeExecutions.set(execution.id, abortController);

  // Initialize execution logs
  executionLogs.set(execution.id, []);

  try {
    // Merge override args if this is a manual execution
    const effectiveArgs = {
      ...args,
      ...(execution.input?.overrideArgs as Record<string, unknown> || {}),
    };

    // Create task context
    const context: PluginTaskContext = {
      taskId: task.id,
      executionId: execution.id,
      pluginId,
      taskName: task.name,
      scheduledAt: execution.startedAt || new Date(),
      startedAt: new Date(),
      attemptNumber: execution.retryAttempt + 1,
      signal: abortController.signal,
      reportProgress: (progress: number, message?: string) => {
        log.debug(`Task ${task.id} progress: ${progress}%${message ? ` - ${message}` : ''}`);
        // Could emit progress event here
      },
      log: (
        level: 'debug' | 'info' | 'warn' | 'error',
        message: string,
        data?: Record<string, unknown>
      ) => {
        const logs = executionLogs.get(execution.id) || [];
        logs.push({ timestamp: new Date(), level, message, data });
        executionLogs.set(execution.id, logs);

        // Also log to system logger
        log[level](`[${pluginId}:${handler}] ${message}`, data);
      },
    };

    log.info(`Executing plugin task: ${task.name} (${fullHandlerName})`);

    // Execute the handler
    const result = await taskHandler(effectiveArgs, context);

    // Get execution logs
    const logs = executionLogs.get(execution.id) || [];

    log.info(`Plugin task completed: ${task.name}`, { success: result.success });

    return {
      success: result.success,
      output: {
        ...result.output,
        metrics: result.metrics,
        logs,
      },
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Plugin task failed: ${task.name}`, { error: errorMessage });

    return {
      success: false,
      error: errorMessage,
      output: {
        logs: executionLogs.get(execution.id) || [],
      },
    };
  } finally {
    // Cleanup
    activeExecutions.delete(execution.id);
    executionLogs.delete(execution.id);
  }
}

/**
 * Cancel a running plugin task execution
 */
export function cancelPluginTaskExecution(executionId: string): boolean {
  const controller = activeExecutions.get(executionId);
  if (controller) {
    controller.abort();
    activeExecutions.delete(executionId);
    executionLogs.delete(executionId);
    log.info(`Cancelled plugin task execution: ${executionId}`);
    return true;
  }
  return false;
}

/**
 * Get the number of active plugin task executions
 */
export function getActivePluginTaskCount(): number {
  return activeExecutions.size;
}

/**
 * Check if a specific execution is active
 */
export function isPluginTaskExecutionActive(executionId: string): boolean {
  return activeExecutions.has(executionId);
}
