/**
 * Token Usage types and utilities
 *
 * Unified token usage tracking across the application.
 * Field naming follows AI SDK convention (inputTokens/outputTokens)
 * with aliases for backward compatibility (prompt/completion).
 */

export interface TokenUsage {
  /** Input/prompt tokens */
  prompt: number;
  /** Output/completion tokens */
  completion: number;
  /** Total tokens (prompt + completion) */
  total: number;
  /** Alias for prompt tokens (AI SDK naming) */
  inputTokens?: number;
  /** Alias for completion tokens (AI SDK naming) */
  outputTokens?: number;
}

/** Request status for tracking success/error states */
export type UsageRecordStatus = 'success' | 'error' | 'timeout' | 'cancelled';

export interface UsageRecord {
  id: string;
  sessionId: string;
  messageId: string;
  provider: string;
  model: string;
  tokens: TokenUsage;
  cost: number;
  createdAt: Date;
  /** Response latency in milliseconds */
  latency?: number;
  /** Request status for error tracking */
  status?: UsageRecordStatus;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Time to first token in milliseconds (streaming) */
  timeToFirstToken?: number;
}

export interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

export interface ProviderUsage {
  provider: string;
  tokens: number;
  cost: number;
  requests: number;
}

// Model pricing (per 1M tokens) - approximate values
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  o1: { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },

  // Anthropic
  'claude-3-opus-20240229': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

  // Google
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash-exp': { input: 0, output: 0 }, // Free tier

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

  // Ollama (local, free)
  'llama3.2': { input: 0, output: 0 },
  'llama3.1': { input: 0, output: 0 },
  mistral: { input: 0, output: 0 },
  mixtral: { input: 0, output: 0 },
  'qwen2.5': { input: 0, output: 0 },
};

/**
 * Calculate cost from token usage
 */
export function calculateCost(model: string, tokens: TokenUsage): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (tokens.prompt / 1_000_000) * pricing.input;
  const outputCost = (tokens.completion / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Calculate cost from input/output tokens (AI SDK naming convention)
 */
export function calculateCostFromTokens(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Normalize token usage to standard format
 */
export function normalizeTokenUsage(usage: {
  prompt?: number;
  completion?: number;
  inputTokens?: number;
  outputTokens?: number;
  total?: number;
}): TokenUsage {
  const prompt = usage.prompt ?? usage.inputTokens ?? 0;
  const completion = usage.completion ?? usage.outputTokens ?? 0;
  return {
    prompt,
    completion,
    total: usage.total ?? prompt + completion,
    inputTokens: prompt,
    outputTokens: completion,
  };
}

/**
 * Format token count
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Format cost
 */
export function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}
