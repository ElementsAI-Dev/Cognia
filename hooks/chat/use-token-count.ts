/**
 * useTokenCount - Hook for calculating token usage in chat context
 * Provides real-time token estimation for messages, system prompts, and context
 * 
 * Supports multiple counting methods:
 * 1. tiktoken (o200k_base) - Accurate OpenAI token counting for GPT-4o
 * 2. tiktoken (cl100k_base) - For GPT-4, GPT-3.5-turbo
 * 3. Claude estimation - Provider-specific estimation
 * 4. General estimation - Fast fallback
 */

import { useMemo, useState, useCallback } from 'react';
import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type { UIMessage } from '@/types/core/message';

// Encoder cache for different encodings
const encoderCache: Map<string, Tiktoken> = new Map();

// Supported tiktoken encodings
type TiktokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base';

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

/**
 * Get or create a tiktoken encoder for the specified encoding
 */
function getTiktokenEncoder(encoding: TiktokenEncoding = 'o200k_base'): Tiktoken | null {
  try {
    if (!encoderCache.has(encoding)) {
      const encoder = getEncoding(encoding);
      encoderCache.set(encoding, encoder);
    }
    return encoderCache.get(encoding) || null;
  } catch (error) {
    console.warn(`Failed to get tiktoken encoder for ${encoding}:`, error);
    return null;
  }
}

/**
 * Get the appropriate tiktoken encoding for a model
 */
export function getEncodingForModel(model?: string): TiktokenEncoding {
  if (!model) return 'o200k_base';
  
  const modelLower = model.toLowerCase();
  
  // GPT-4o and newer use o200k_base
  if (modelLower.includes('gpt-4o') || modelLower.includes('o1') || modelLower.includes('o3')) {
    return 'o200k_base';
  }
  
  // GPT-4, GPT-3.5-turbo use cl100k_base
  if (modelLower.includes('gpt-4') || modelLower.includes('gpt-3.5') || modelLower.includes('text-embedding')) {
    return 'cl100k_base';
  }
  
  // Older models use p50k_base
  if (modelLower.includes('davinci') || modelLower.includes('curie') || modelLower.includes('babbage') || modelLower.includes('ada')) {
    return 'p50k_base';
  }
  
  // Default to newest encoding
  return 'o200k_base';
}

/**
 * Count tokens using tiktoken (accurate for OpenAI models)
 */
export function countTokensTiktoken(content: string, encoding: TiktokenEncoding = 'o200k_base'): number {
  if (!content || content.length === 0) return 0;
  
  const encoder = getTiktokenEncoder(encoding);
  if (!encoder) return estimateTokensFast(content);
  
  try {
    const tokens = encoder.encode(content);
    return tokens.length;
  } catch (error) {
    console.warn('Tiktoken encoding failed, falling back to estimation:', error);
    return estimateTokensFast(content);
  }
}

/**
 * Count tokens for a chat message including role tokens (OpenAI format)
 * Based on OpenAI's token counting guide
 */
export function countChatMessageTokens(
  role: string,
  content: string,
  name?: string,
  encoding: TiktokenEncoding = 'o200k_base'
): number {
  const encoder = getTiktokenEncoder(encoding);
  if (!encoder) return estimateTokensFast(content) + 4;
  
  try {
    let numTokens = 0;
    
    // Every message follows <|start|>{role/name}\n{content}<|end|>\n
    numTokens += 3; // <|start|>, role, <|end|>
    numTokens += encoder.encode(content).length;
    
    if (name) {
      numTokens += encoder.encode(name).length;
      numTokens += 1; // role is always required and name is additional
    }
    
    return numTokens;
  } catch (_error) {
    return estimateTokensFast(content) + 4;
  }
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
 * Fast estimation fallback (~4 chars per token)
 */
export function estimateTokensFast(content: string): number {
  if (!content || content.length === 0) return 0;
  // OpenAI's rule of thumb: 1 token ≈ 4 characters for English
  // Add 10% for special tokens and encoding overhead
  return Math.ceil(content.length / 4 * 1.1);
}

/**
 * Estimate token count with content-aware adjustments
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
    tokens += Math.ceil(codeLength * (1/3 - 1/4));
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
  const encoding = method === 'tiktoken' ? getEncodingForModel(model) : 'o200k_base';
  const encoder = method === 'tiktoken' ? getTiktokenEncoder(encoding) : null;
  const isExact = method === 'tiktoken' && encoder !== null;

  // Count function based on method
  const count = (content: string) => countTokens(content, method, model);

  // System tokens (prompt + additional context)
  let systemTokens = 0;
  if (systemPrompt) {
    systemTokens += method === 'tiktoken' 
      ? countChatMessageTokens('system', systemPrompt, undefined, encoding)
      : count(systemPrompt);
  }
  if (additionalContext) {
    systemTokens += count(additionalContext);
  }

  // Per-message breakdown using accurate chat message counting
  const messageTokens = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    tokens: method === 'tiktoken'
      ? countChatMessageTokens(msg.role, msg.content, undefined, encoding)
      : count(msg.content),
  }));

  // Aggregate by role
  const userTokens = messageTokens
    .filter(m => m.role === 'user')
    .reduce((sum, m) => sum + m.tokens, 0);
  
  const assistantTokens = messageTokens
    .filter(m => m.role === 'assistant')
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
    const effectiveMethod = method || getTokenCountMethod(provider, model);
    if (effectiveMethod === 'tiktoken') {
      const encoding = getEncodingForModel(model);
      // Clear cache to force re-initialization
      encoderCache.delete(encoding);
    }
    // Trigger re-calculation
    setReloadCounter(c => c + 1);
  }, [provider, model, method]);

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
  const percent = effectiveLimit > 0 
    ? Math.min(100, Math.round((usedTokens / effectiveLimit) * 100)) 
    : 0;

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

export default useTokenCount;
