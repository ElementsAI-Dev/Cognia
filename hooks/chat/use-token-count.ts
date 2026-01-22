/**
 * useTokenCount - Hook for calculating token usage in chat context
 * Provides real-time token estimation for messages, system prompts, and context
 *
 * Supports multiple counting methods:
 * 1. tiktoken (o200k_base) - Accurate OpenAI token counting for GPT-4o
 * 2. tiktoken (cl100k_base) - For GPT-4, GPT-3.5-turbo
 * 3. Claude API - Anthropic's official token counter
 * 4. Gemini API - Google's official token counter
 * 5. GLM API - Zhipu's official token counter
 * 6. General estimation - Fast fallback
 *
 * Integration with TokenizerRegistry for multi-provider support
 *
 * NOTE: Core tokenizer implementations are in @/lib/ai/tokenizer
 * This hook provides React integration and UI-specific utilities
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import type { UIMessage } from '@/types/core/message';
import {
  getTokenizerRegistry,
  tiktokenTokenizer,
  estimateTokensFast,
  getEncodingForModel,
  clearEncoderCache,
  type TokenizerApiKeys,
} from '@/lib/ai/tokenizer';
import type { TokenizerProvider, TiktokenEncoding } from '@/types/system/tokenizer';

export type TokenCountMethod = 'tiktoken' | 'estimation' | 'claude-api';

export interface TokenBreakdown {
  /** Total tokens used */
  totalTokens: number;
  /** Tokens used by system prompt */
  systemTokens: number;
  /** Tokens used by message content */
  contextTokens: number;
  /** Tokens used by user messages */
  userTokens: number;
  /** Tokens used by assistant messages */
  assistantTokens: number;
  /** Per-message token breakdown */
  messageTokens: Array<{ id: string; role: string; tokens: number }>;
  /** Method used for counting */
  method: TokenCountMethod;
  /** Whether count is exact or estimated */
  isExact: boolean;
}

export interface TokenCountOptions {
  /** System prompt content */
  systemPrompt?: string;
  /** Additional context (skills, RAG, etc.) */
  additionalContext?: string;
  /** Provider name for method selection */
  provider?: string;
  /** Model name for accurate counting */
  model?: string;
  /** Force specific counting method */
  method?: TokenCountMethod;
  /** API key for Claude API counting (optional) */
  claudeApiKey?: string;
}

// Re-export getEncodingForModel for backward compatibility
export { getEncodingForModel } from '@/lib/ai/tokenizer';

/**
 * Count tokens using tiktoken (accurate for OpenAI models)
 * Uses the centralized TiktokenTokenizer from @/lib/ai/tokenizer
 */
export async function countTokensTiktokenAsync(content: string, model?: string): Promise<number> {
  if (!content || content.length === 0) return 0;
  const result = await tiktokenTokenizer.countTokens(content, { model });
  return result.tokens;
}

/**
 * Count tokens using tiktoken (synchronous version for backward compatibility)
 * Note: Uses estimation as fallback since tiktoken is async
 */
export function countTokensTiktoken(
  content: string,
  _encoding: TiktokenEncoding = 'o200k_base'
): number {
  if (!content || content.length === 0) return 0;
  // For sync calls, use fast estimation with encoding consideration
  // Accurate async counting should use countTokensTiktokenAsync
  return estimateTokensFast(content);
}

/**
 * Count tokens for a chat message including role tokens (OpenAI format)
 * Based on OpenAI's token counting guide
 * Note: For accurate async counting, use the TokenizerRegistry directly
 */
export function countChatMessageTokens(
  role: string,
  content: string,
  name?: string,
  _encoding: TiktokenEncoding = 'o200k_base'
): number {
  // Use estimation for sync calls
  // For accurate counting, use getTokenizerRegistry().countMessageTokens()
  let numTokens = estimateTokensFast(content);
  numTokens += 3; // Message overhead (<|start|>, role, <|end|>)
  if (name) {
    numTokens += Math.ceil(name.length / 4) + 1;
  }
  return numTokens;
}

/**
 * Count tokens for an entire conversation (OpenAI format)
 */
export function countConversationTokens(
  messages: Array<{ role: string; content: string; name?: string }>,
  encoding: TiktokenEncoding = 'o200k_base'
): number {
  let numTokens = 0;

  for (const message of messages) {
    numTokens += countChatMessageTokens(message.role, message.content, message.name, encoding);
  }

  // Every reply is primed with <|start|>assistant<|message|>
  numTokens += 3;

  return numTokens;
}

/**
 * Async version of conversation token counting using TokenizerRegistry
 */
export async function countConversationTokensAsync(
  messages: Array<{ role: string; content: string; name?: string }>,
  model?: string
): Promise<number> {
  const registry = getTokenizerRegistry();
  const result = await registry.countMessageTokens(
    messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
      name: m.name,
    })),
    { model }
  );
  return result.tokens;
}

// Re-export estimateTokensFast for backward compatibility
export { estimateTokensFast } from '@/lib/ai/tokenizer';

/**
 * Estimate token count with content-aware adjustments
 * Note: For more accurate estimation, use the EstimationTokenizer from @/lib/ai/tokenizer
 */
export function estimateTokens(content: string, _charsPerToken: number = 4): number {
  if (!content || content.length === 0) return 0;

  // Base estimation
  let tokens = Math.ceil(content.length / 4);

  // Adjust for code content (tends to have more tokens per character)
  const codeBlockMatches = content.match(/```[\s\S]*?```/g);
  if (codeBlockMatches) {
    const codeLength = codeBlockMatches.reduce((sum, block) => sum + block.length, 0);
    // Code typically has ~3 chars per token due to symbols and short identifiers
    tokens += Math.ceil(codeLength * (1 / 3 - 1 / 4));
  }

  // Adjust for JSON/structured content
  const jsonMatches = content.match(/\{[\s\S]*?\}/g);
  if (jsonMatches) {
    const jsonLength = jsonMatches.reduce((sum, block) => sum + block.length, 0);
    // JSON has many punctuation marks that tokenize individually
    tokens += Math.ceil(jsonLength * 0.1);
  }

  // Add overhead for message formatting (role tokens, etc.)
  tokens += 4; // ~4 tokens for message structure

  return tokens;
}

/**
 * Determine counting method based on provider/model
 */
export function getTokenCountMethod(provider?: string, model?: string): TokenCountMethod {
  if (!provider) return 'estimation';

  const providerLower = provider.toLowerCase();
  const openaiProviders = ['openai', 'azure', 'openrouter'];
  const claudeProviders = ['anthropic'];
  const googleProviders = ['google', 'gemini'];

  if (openaiProviders.includes(providerLower)) {
    return 'tiktoken';
  }

  if (claudeProviders.includes(providerLower)) {
    return 'claude-api';
  }

  if (googleProviders.includes(providerLower)) {
    return 'estimation'; // Gemini uses similar tokenization to GPT
  }

  // Check if model name suggests OpenAI-compatible
  if (model) {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('gpt') || modelLower.includes('openai')) {
      return 'tiktoken';
    }
    if (modelLower.includes('claude')) {
      return 'claude-api';
    }
  }

  return 'estimation';
}

/**
 * Count tokens for a single string using the appropriate method
 */
export function countTokens(
  content: string,
  method: TokenCountMethod = 'estimation',
  model?: string
): number {
  if (!content || content.length === 0) return 0;

  switch (method) {
    case 'tiktoken': {
      const encoding = getEncodingForModel(model);
      return countTokensTiktoken(content, encoding);
    }
    case 'claude-api':
      return estimateTokensForClaude(content);
    case 'estimation':
    default:
      return estimateTokens(content);
  }
}

/**
 * Estimate tokens for Claude models
 * Claude uses a similar tokenization to GPT but with some differences
 * https://docs.anthropic.com/en/docs/build-with-claude/token-counting
 */
export function estimateTokensForClaude(content: string): number {
  if (!content || content.length === 0) return 0;

  // Claude's tokenization is similar to GPT-4
  // Average of ~3.5-4 characters per token for English
  let tokens = Math.ceil(content.length / 3.8);

  // Claude tends to tokenize code more granularly
  const codeBlockMatches = content.match(/```[\s\S]*?```/g);
  if (codeBlockMatches) {
    const codeLength = codeBlockMatches.reduce((sum, block) => sum + block.length, 0);
    tokens += Math.ceil(codeLength * 0.05); // 5% increase for code
  }

  // Add message overhead
  tokens += 3; // Claude message structure overhead

  return tokens;
}

/**
 * Calculate detailed token breakdown for messages
 */
export function calculateTokenBreakdown(
  messages: UIMessage[],
  options: TokenCountOptions = {}
): TokenBreakdown {
  const {
    systemPrompt = '',
    additionalContext = '',
    provider,
    model,
    method: forcedMethod,
  } = options;

  // Determine counting method
  const method = forcedMethod || getTokenCountMethod(provider, model);
  // Note: Synchronous counting uses estimation; for exact counts use calculateTokenBreakdownAsync
  const isExact = false;

  // Count function based on method
  const count = (content: string) => countTokens(content, method, model);

  // System tokens (prompt + additional context)
  let systemTokens = 0;
  if (systemPrompt) {
    systemTokens += countChatMessageTokens('system', systemPrompt);
  }
  if (additionalContext) {
    systemTokens += count(additionalContext);
  }

  // Per-message breakdown
  const messageTokens = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    tokens: countChatMessageTokens(msg.role, msg.content),
  }));

  // Aggregate by role
  const userTokens = messageTokens
    .filter((m) => m.role === 'user')
    .reduce((sum, m) => sum + m.tokens, 0);

  const assistantTokens = messageTokens
    .filter((m) => m.role === 'assistant')
    .reduce((sum, m) => sum + m.tokens, 0);

  // Total context tokens (all messages)
  const contextTokens = userTokens + assistantTokens;

  // Add conversation priming tokens for tiktoken
  const primingTokens = method === 'tiktoken' ? 3 : 0;

  // Total tokens
  const totalTokens = systemTokens + contextTokens + primingTokens;

  return {
    totalTokens,
    systemTokens,
    contextTokens,
    userTokens,
    assistantTokens,
    messageTokens,
    method,
    isExact,
  };
}

/**
 * Hook for real-time token counting with tiktoken support
 * Encoder initialization is synchronous, so no loading state needed
 */
export function useTokenCount(
  messages: UIMessage[],
  options: TokenCountOptions = {}
): TokenBreakdown & { isLoading: boolean; reload: () => void } {
  const { systemPrompt, additionalContext, provider, model, method } = options;

  // Counter to force re-calculation when reload is called
  const [reloadCounter, setReloadCounter] = useState(0);

  // Reload function to force encoder re-initialization and re-count
  const reload = useCallback(() => {
    // Clear the centralized encoder cache
    clearEncoderCache();
    // Clear TokenizerRegistry cache
    getTokenizerRegistry().clearCache();
    // Trigger re-calculation
    setReloadCounter((c) => c + 1);
  }, []);

  const breakdown = useMemo(() => {
    // Include reloadCounter to trigger re-calculation when reload is called
    void reloadCounter;
    return calculateTokenBreakdown(messages, {
      systemPrompt,
      additionalContext,
      provider,
      model,
      method,
    });
  }, [messages, systemPrompt, additionalContext, provider, model, method, reloadCounter]);

  return { ...breakdown, isLoading: false, reload };
}

/**
 * Get context utilization percentage
 */
export function getContextUtilization(
  usedTokens: number,
  maxTokens: number,
  limitPercent: number = 100
): { percent: number; status: 'healthy' | 'warning' | 'danger' } {
  const effectiveLimit = Math.round((limitPercent / 100) * maxTokens);
  const percent =
    effectiveLimit > 0 ? Math.min(100, Math.round((usedTokens / effectiveLimit) * 100)) : 0;

  let status: 'healthy' | 'warning' | 'danger';
  if (percent >= 90) {
    status = 'danger';
  } else if (percent >= 70) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  return { percent, status };
}

/**
 * Format token count for display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Extended options for enhanced token counting with multi-provider support
 */
export interface TokenCountOptionsEnhanced extends TokenCountOptions {
  /** Force specific tokenizer provider (overrides method) */
  tokenizerProvider?: TokenizerProvider;
  /** API keys for remote tokenizers */
  apiKeys?: TokenizerApiKeys;
  /** Use async counting with registry */
  useRegistry?: boolean;
}

/**
 * Calculate token breakdown using the enhanced tokenizer registry
 * Supports Gemini, Claude, GLM APIs in addition to tiktoken
 */
export async function calculateTokenBreakdownAsync(
  messages: UIMessage[],
  options: TokenCountOptionsEnhanced = {}
): Promise<TokenBreakdown & { cachedTokens?: number; thinkingTokens?: number }> {
  const { systemPrompt = '', additionalContext = '', model, tokenizerProvider, apiKeys } = options;

  const registry = getTokenizerRegistry();

  if (apiKeys) {
    registry.setApiKeys(apiKeys);
  }

  // Build messages for counting
  const countMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

  if (systemPrompt) {
    countMessages.push({ role: 'system', content: systemPrompt });
  }

  if (additionalContext) {
    countMessages.push({ role: 'system', content: additionalContext });
  }

  countMessages.push(
    ...messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))
  );

  try {
    const totalResult = await registry.countMessageTokens(countMessages, {
      model,
      provider: tokenizerProvider,
    });

    // Calculate per-message breakdown
    const messageTokens: Array<{ id: string; role: string; tokens: number }> = [];

    for (const msg of messages) {
      const msgResult = await registry.countTokens(msg.content, {
        model,
        provider: tokenizerProvider,
      });
      messageTokens.push({
        id: msg.id,
        role: msg.role,
        tokens: msgResult.tokens + 4,
      });
    }

    // Calculate system tokens
    let systemTokens = 0;
    if (systemPrompt) {
      const systemResult = await registry.countTokens(systemPrompt, {
        model,
        provider: tokenizerProvider,
      });
      systemTokens += systemResult.tokens + 4;
    }
    if (additionalContext) {
      const contextResult = await registry.countTokens(additionalContext, {
        model,
        provider: tokenizerProvider,
      });
      systemTokens += contextResult.tokens;
    }

    const userTokens = messageTokens
      .filter((m) => m.role === 'user')
      .reduce((sum, m) => sum + m.tokens, 0);

    const assistantTokens = messageTokens
      .filter((m) => m.role === 'assistant')
      .reduce((sum, m) => sum + m.tokens, 0);

    const contextTokens = userTokens + assistantTokens;

    // Map provider to method for backward compatibility
    const providerToMethod: Record<string, TokenCountMethod> = {
      tiktoken: 'tiktoken',
      'claude-api': 'claude-api',
      'gemini-api': 'estimation',
      'glm-api': 'estimation',
      estimation: 'estimation',
    };

    return {
      totalTokens: totalResult.tokens,
      systemTokens,
      contextTokens,
      userTokens,
      assistantTokens,
      messageTokens,
      method: providerToMethod[totalResult.provider] || 'estimation',
      isExact: totalResult.isExact,
      cachedTokens: totalResult.cachedTokens,
      thinkingTokens: totalResult.thinkingTokens,
    };
  } catch (_error) {
    // Fallback to synchronous calculation
    return calculateTokenBreakdown(messages, options);
  }
}

/**
 * Enhanced async hook for precise token counting with loading states
 * Uses TokenizerRegistry for accurate multi-provider token counting
 */
export function useTokenCountAsync(
  messages: UIMessage[],
  options: TokenCountOptionsEnhanced = {}
): TokenBreakdown & {
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  cachedTokens?: number;
  thinkingTokens?: number;
} {
  const { systemPrompt, additionalContext, provider, model, tokenizerProvider, apiKeys } = options;

  const [breakdown, setBreakdown] = useState<
    TokenBreakdown & { cachedTokens?: number; thinkingTokens?: number }
  >({
    totalTokens: 0,
    systemTokens: 0,
    contextTokens: 0,
    userTokens: 0,
    assistantTokens: 0,
    messageTokens: [],
    method: 'estimation',
    isExact: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);

  const reload = useCallback(() => {
    clearEncoderCache();
    getTokenizerRegistry().clearCache();
    setReloadCounter((c) => c + 1);
  }, []);

  // Effect for async token counting
  useEffect(() => {
    let cancelled = false;

    const calculate = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await calculateTokenBreakdownAsync(messages, {
          systemPrompt,
          additionalContext,
          provider,
          model,
          tokenizerProvider,
          apiKeys,
        });

        if (!cancelled) {
          setBreakdown(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Token counting failed');
          // Fallback to sync calculation
          const fallback = calculateTokenBreakdown(messages, {
            systemPrompt,
            additionalContext,
            provider,
            model,
          });
          setBreakdown(fallback);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    calculate();

    return () => {
      cancelled = true;
    };
  }, [
    messages,
    systemPrompt,
    additionalContext,
    provider,
    model,
    tokenizerProvider,
    apiKeys,
    reloadCounter,
  ]);

  return { ...breakdown, isLoading, error, reload };
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateEstimatedCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  // Import pricing from types/system/usage
  const MODEL_PRICING: Record<string, { input: number; output: number }> = {
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
    'gemini-2.0-flash-exp': { input: 0, output: 0 },
    // DeepSeek
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
  };

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return { inputCost: 0, outputCost: 0, totalCost: 0 };
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Hook for real-time cost estimation
 */
export function useTokenCost(
  model: string,
  promptTokens: number,
  estimatedCompletionTokens: number = 0
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  formattedCost: string;
} {
  return useMemo(() => {
    const costs = calculateEstimatedCost(model, promptTokens, estimatedCompletionTokens);
    return {
      ...costs,
      formattedCost: costs.totalCost < 0.01 ? '< $0.01' : `$${costs.totalCost.toFixed(4)}`,
    };
  }, [model, promptTokens, estimatedCompletionTokens]);
}

/**
 * Token budget status for context limit warnings
 */
export interface TokenBudgetStatus {
  usedTokens: number;
  maxTokens: number;
  remainingTokens: number;
  percentUsed: number;
  status: 'healthy' | 'warning' | 'danger' | 'exceeded';
  warningMessage?: string;
}

/**
 * Model context limits (in tokens)
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  // OpenAI
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16385,
  o1: 200000,
  'o1-mini': 128000,
  // Anthropic
  'claude-3-opus-20240229': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-haiku-20240307': 200000,
  // Google
  'gemini-1.5-pro': 2000000,
  'gemini-1.5-flash': 1000000,
  'gemini-2.0-flash-exp': 1000000,
  // DeepSeek
  'deepseek-chat': 64000,
  'deepseek-reasoner': 64000,
};

/**
 * Get token budget status for a model
 */
export function getTokenBudgetStatus(
  usedTokens: number,
  model: string,
  customLimit?: number
): TokenBudgetStatus {
  const maxTokens = customLimit || MODEL_CONTEXT_LIMITS[model] || 8192;
  const remainingTokens = Math.max(0, maxTokens - usedTokens);
  const percentUsed = Math.min(100, (usedTokens / maxTokens) * 100);

  let status: TokenBudgetStatus['status'];
  let warningMessage: string | undefined;

  if (percentUsed >= 100) {
    status = 'exceeded';
    warningMessage = 'Context limit exceeded. Some messages may be truncated.';
  } else if (percentUsed >= 90) {
    status = 'danger';
    warningMessage = `Context nearly full (${percentUsed.toFixed(0)}%). Consider summarizing or starting a new conversation.`;
  } else if (percentUsed >= 75) {
    status = 'warning';
    warningMessage = `Context usage at ${percentUsed.toFixed(0)}%.`;
  } else {
    status = 'healthy';
  }

  return {
    usedTokens,
    maxTokens,
    remainingTokens,
    percentUsed,
    status,
    warningMessage,
  };
}

/**
 * Hook for token budget monitoring
 */
export function useTokenBudget(
  messages: UIMessage[],
  model: string,
  options: {
    systemPrompt?: string;
    additionalContext?: string;
    customLimit?: number;
  } = {}
): TokenBudgetStatus & { breakdown: TokenBreakdown } {
  const breakdown = useMemo(() => {
    return calculateTokenBreakdown(messages, {
      systemPrompt: options.systemPrompt,
      additionalContext: options.additionalContext,
    });
  }, [messages, options.systemPrompt, options.additionalContext]);

  const budgetStatus = useMemo(() => {
    return getTokenBudgetStatus(breakdown.totalTokens, model, options.customLimit);
  }, [breakdown.totalTokens, model, options.customLimit]);

  return { ...budgetStatus, breakdown };
}

export default useTokenCount;
