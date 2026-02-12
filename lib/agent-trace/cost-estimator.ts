/**
 * Agent Trace Cost Estimator
 * Calculates estimated costs for agent trace events based on model pricing.
 * Reuses pricing data from the quota-manager but provides a trace-specific API.
 */

import type { TraceCostEstimate } from '@/types/agent-trace';

/** Model pricing in USD per 1M tokens */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
  // Anthropic
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  // Google
  'gemini-2.0-flash-exp': { input: 0, output: 0 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  // DeepSeek
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  // Groq (free tier)
  'llama-3.3-70b-versatile': { input: 0, output: 0 },
  'llama-3.1-70b-versatile': { input: 0, output: 0 },
  'mixtral-8x7b-32768': { input: 0, output: 0 },
  // Mistral
  'mistral-large-latest': { input: 2, output: 6 },
  'mistral-small-latest': { input: 0.2, output: 0.6 },
  'codestral-latest': { input: 0.2, output: 0.6 },
};

/**
 * Extract the base model name from a provider/model string.
 * e.g. "openai/gpt-4o" → "gpt-4o", "anthropic/claude-sonnet-4-20250514" → "claude-sonnet-4-20250514"
 */
function extractModelName(modelId: string): string {
  const parts = modelId.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : modelId;
}

/**
 * Estimate cost for a given model and token usage.
 * Returns null if pricing is unavailable for the model.
 */
export function estimateTraceCost(
  modelId: string | undefined,
  tokenUsage: { promptTokens: number; completionTokens: number } | undefined
): TraceCostEstimate | undefined {
  if (!modelId || !tokenUsage) return undefined;
  if (tokenUsage.promptTokens === 0 && tokenUsage.completionTokens === 0) return undefined;

  const baseName = extractModelName(modelId);
  const pricing = MODEL_PRICING[baseName];
  if (!pricing) return undefined;

  const inputCost = (tokenUsage.promptTokens / 1_000_000) * pricing.input;
  const outputCost = (tokenUsage.completionTokens / 1_000_000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
  };
}

/**
 * Check if pricing data is available for a model.
 */
export function hasPricingData(modelId: string): boolean {
  const baseName = extractModelName(modelId);
  return baseName in MODEL_PRICING;
}

/**
 * Get all known model IDs with pricing data.
 */
export function getKnownPricedModels(): string[] {
  return Object.keys(MODEL_PRICING);
}

// Re-export canonical formatCost from @/lib/observability
export { formatCost } from '@/lib/observability';
