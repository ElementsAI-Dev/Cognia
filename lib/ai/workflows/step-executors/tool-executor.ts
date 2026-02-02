/**
 * Tool Step Executor
 * Executes tool-based workflow steps
 * Enhanced with error handling, timeout, and retry support
 */

import { getGlobalToolRegistry } from '@/lib/ai/tools/registry';
import { withRetry, withTimeout, DEFAULT_RETRY_CONFIG } from '@/lib/utils/retry';
import { loggers } from '@/lib/logger';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';

const log = loggers.ai;

const DEFAULT_TOOL_TIMEOUT = 60000; // 60 seconds
const DEFAULT_TOOL_RETRIES = 2;

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly stepId: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export async function executeToolStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  config?: StepExecutorConfig
): Promise<unknown> {
  if (!step.toolName) {
    throw new ToolExecutionError(
      'Tool step requires toolName',
      'unknown',
      step.id
    );
  }

  const registry = getGlobalToolRegistry();
  const toolDef = registry.get(step.toolName);

  if (!toolDef) {
    throw new ToolExecutionError(
      `Tool not found: ${step.toolName}`,
      step.toolName,
      step.id
    );
  }

  const timeout = step.timeout || config?.stepTimeout || DEFAULT_TOOL_TIMEOUT;
  const maxRetries = step.retryCount ?? config?.maxRetries ?? DEFAULT_TOOL_RETRIES;

  log.info(`[Tool Step] Executing tool`, {
    stepId: step.id,
    stepName: step.name,
    toolName: step.toolName,
    timeout,
    maxRetries,
  });

  try {
    const toolFn = toolDef.create({});

    const result = await withRetry(
      async () => {
        return withTimeout(toolFn(input), timeout);
      },
      {
        ...DEFAULT_RETRY_CONFIG,
        maxRetries,
        onRetry: (error, attempt, delay) => {
          log.warn(`[Tool Step] Retry attempt ${attempt} after ${delay}ms`, {
            stepId: step.id,
            toolName: step.toolName,
            error: error.message,
          });
        },
      }
    );

    log.info(`[Tool Step] Execution completed`, {
      stepId: step.id,
      toolName: step.toolName,
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log.error(`[Tool Step] Execution failed`, {
      stepId: step.id,
      toolName: step.toolName,
      error: errorMessage,
    });

    throw new ToolExecutionError(
      `Tool execution failed: ${errorMessage}`,
      step.toolName,
      step.id,
      error instanceof Error ? error : undefined
    );
  }
}
