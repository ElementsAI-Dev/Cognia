/**
 * AI Step Executor
 * Executes AI-based workflow steps using language models
 */

import { generateText } from 'ai';
import { getProviderModel } from '@/lib/ai/core/client';
import type { WorkflowStepDefinition, StepExecutorConfig } from './types';

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

  const result = await generateText({
    model: modelInstance,
    prompt,
    temperature: config.temperature || 0.7,
  });

  return {
    text: result.text,
    usage: result.usage,
  };
}
