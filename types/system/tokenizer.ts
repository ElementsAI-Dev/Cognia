/**
 * Tokenizer types and interfaces for multi-provider token counting
 *
 * Supports:
 * - OpenAI tiktoken (local, accurate)
 * - Anthropic Claude API (remote, exact)
 * - Google Gemini API (remote, exact)
 * - Zhipu GLM API (remote, exact)
 * - Estimation fallback (local, approximate)
 */

/** Supported tokenizer providers */
export type TokenizerProvider =
  | 'tiktoken' // OpenAI local tokenizer
  | 'claude-api' // Anthropic remote API
  | 'gemini-api' // Google Gemini remote API
  | 'glm-api' // Zhipu GLM remote API
  | 'estimation' // Local estimation fallback
  | 'auto'; // Auto-detect based on model

/** Tiktoken encoding types */
export type TiktokenEncoding = 'o200k_base' | 'cl100k_base' | 'p50k_base';

/** Token count result from any tokenizer */
export interface TokenCountResult {
  /** Total token count */
  tokens: number;
  /** Whether this is an exact count or estimation */
  isExact: boolean;
  /** Tokenizer provider used */
  provider: TokenizerProvider;
  /** Model used for counting (if applicable) */
  model?: string;
  /** Encoding used (for tiktoken) */
  encoding?: TiktokenEncoding;
  /** Cached content tokens (for Gemini) */
  cachedTokens?: number;
  /** Thinking/reasoning tokens (for thinking models) */
  thinkingTokens?: number;
  /** Image tokens (for multimodal) */
  imageTokens?: number;
  /** Video tokens (for multimodal) */
  videoTokens?: number;
  /** Audio tokens (for multimodal) */
  audioTokens?: number;
  /** Error message if counting failed */
  error?: string;
}

/** Message format for API token counting */
export interface TokenCountMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

/** Options for token counting */
export interface TokenCountOptions {
  /** Tokenizer provider to use */
  provider?: TokenizerProvider;
  /** Model name for accurate counting */
  model?: string;
  /** API key for remote tokenizers */
  apiKey?: string;
  /** Base URL for API (for custom endpoints) */
  baseUrl?: string;
  /** Timeout for API calls in ms */
  timeout?: number;
  /** Whether to include tool/function definitions */
  includeTools?: boolean;
  /** System instruction content */
  systemInstruction?: string;
  /** Whether to use cache for repeated counts */
  useCache?: boolean;
}

/** Tokenizer interface that all providers must implement */
export interface Tokenizer {
  /** Provider identifier */
  readonly provider: TokenizerProvider;

  /** Whether this tokenizer requires network access */
  readonly isRemote: boolean;

  /** Count tokens for a single string */
  countTokens(content: string, options?: TokenCountOptions): Promise<TokenCountResult>;

  /** Count tokens for chat messages */
  countMessageTokens(
    messages: TokenCountMessage[],
    options?: TokenCountOptions
  ): Promise<TokenCountResult>;

  /** Check if this tokenizer supports the given model */
  supportsModel(model: string): boolean;

  /** Get recommended encoding for a model */
  getEncodingForModel?(model: string): TiktokenEncoding | undefined;
}

/** Tokenizer settings stored in user preferences */
export interface TokenizerSettings {
  /** Enable precise token counting (may use remote APIs) */
  enablePreciseCounting: boolean;

  /** Preferred tokenizer provider */
  preferredProvider: TokenizerProvider;

  /** Auto-detect tokenizer based on model */
  autoDetect: boolean;

  /** Use cached token counts when available */
  enableCache: boolean;

  /** Cache TTL in seconds */
  cacheTTL: number;

  /** Timeout for remote API calls in ms */
  apiTimeout: number;

  /** Fallback to estimation if remote API fails */
  fallbackToEstimation: boolean;

  /** Show token count breakdown in UI */
  showBreakdown: boolean;

  /** Show warning when approaching context limit */
  showContextWarning: boolean;

  /** Context warning threshold (percentage) */
  contextWarningThreshold: number;
}

/** Default tokenizer settings */
export const DEFAULT_TOKENIZER_SETTINGS: TokenizerSettings = {
  enablePreciseCounting: true,
  preferredProvider: 'auto',
  autoDetect: true,
  enableCache: true,
  cacheTTL: 300, // 5 minutes
  apiTimeout: 5000, // 5 seconds
  fallbackToEstimation: true,
  showBreakdown: true,
  showContextWarning: true,
  contextWarningThreshold: 80,
};

/** Model to tokenizer provider mapping */
export const MODEL_TOKENIZER_MAP: Record<string, TokenizerProvider> = {
  // OpenAI models -> tiktoken
  'gpt-4o': 'tiktoken',
  'gpt-4o-mini': 'tiktoken',
  'gpt-4-turbo': 'tiktoken',
  'gpt-4': 'tiktoken',
  'gpt-3.5-turbo': 'tiktoken',
  o1: 'tiktoken',
  'o1-mini': 'tiktoken',
  'o1-preview': 'tiktoken',
  o3: 'tiktoken',
  'o3-mini': 'tiktoken',

  // Anthropic models -> Claude API
  'claude-3-opus': 'claude-api',
  'claude-3-sonnet': 'claude-api',
  'claude-3-haiku': 'claude-api',
  'claude-3-5-sonnet': 'claude-api',
  'claude-3-5-haiku': 'claude-api',
  'claude-sonnet-4': 'claude-api',
  'claude-opus-4': 'claude-api',

  // Google models -> Gemini API
  'gemini-1.5-pro': 'gemini-api',
  'gemini-1.5-flash': 'gemini-api',
  'gemini-2.0-flash': 'gemini-api',
  'gemini-2.0-pro': 'gemini-api',
  'gemini-2.5-pro': 'gemini-api',
  'gemini-2.5-flash': 'gemini-api',

  // Zhipu GLM models -> GLM API
  'glm-4': 'glm-api',
  'glm-4-plus': 'glm-api',
  'glm-4v': 'glm-api',
  'glm-4.5': 'glm-api',
  'glm-4.6': 'glm-api',
  'glm-4.6v': 'glm-api',
};

/** Get tokenizer provider for a model */
export function getTokenizerForModel(model: string): TokenizerProvider {
  if (!model) return 'estimation';

  const modelLower = model.toLowerCase();

  // Check exact match first
  for (const [key, provider] of Object.entries(MODEL_TOKENIZER_MAP)) {
    if (modelLower.includes(key.toLowerCase())) {
      return provider;
    }
  }

  // Check by provider prefix
  if (modelLower.includes('gpt') || modelLower.includes('o1') || modelLower.includes('o3')) {
    return 'tiktoken';
  }
  if (modelLower.includes('claude')) {
    return 'claude-api';
  }
  if (modelLower.includes('gemini')) {
    return 'gemini-api';
  }
  if (modelLower.includes('glm')) {
    return 'glm-api';
  }

  // Default to estimation for unknown models
  return 'estimation';
}

/** Token count cache entry */
export interface TokenCountCacheEntry {
  result: TokenCountResult;
  timestamp: number;
  hash: string;
}

/** Simple hash function for cache keys */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
