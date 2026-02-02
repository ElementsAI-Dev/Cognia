/**
 * AI Step Executor
 * Executes AI-based workflow steps using language models
 * Enhanced with retry logic and circuit breaker protection
 */

import { generateText } from 'ai';
import { getProviderModel } from '@/lib/ai/core/client';
import { withRetry, AGENT_RETRY_CONFIG } from '@/lib/utils/retry';
import { withCircuitBreaker } from '@/lib/ai/infrastructure/circuit-breaker';
import { loggers } from '@/lib/logger';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';

const log = loggers.ai;

export async function executeAIStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  config: StepExecutorConfig
): Promise<unknown> {
  const modelInstance = getProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL
  );

  // Build prompt with input context
  let prompt = step.aiPrompt || '';
  for (const [key, value] of Object.entries(input)) {
    prompt = prompt.replace(`{{${key}}}`, String(value));
  }

  // Execute with circuit breaker and retry protection
  const circuitResult = await withCircuitBreaker(config.provider, async () => {
    return withRetry(
      async () => {
        const result = await generateText({
          model: modelInstance,
          prompt,
          temperature: config.temperature || 0.7,
        });
        return result;
      },
      {
        ...AGENT_RETRY_CONFIG,
        maxRetries: config.maxRetries ?? 2,
        onRetry: (error, attempt, delay) => {
          log.warn(`[AI Step] Retry attempt ${attempt} after ${delay}ms`, {
            stepId: step.id,
            stepName: step.name,
            provider: config.provider,
            error: error.message,
          });
        },
      }
    );
  });

  if (!circuitResult.success) {
    const errorMessage = circuitResult.rejected
      ? `Circuit breaker open for provider: ${config.provider}`
      : circuitResult.error?.message || 'Unknown AI execution error';
    throw new Error(`AI step execution failed: ${errorMessage}`);
  }

  return {
    text: circuitResult.data!.text,
    usage: circuitResult.data!.usage,
  };
}
