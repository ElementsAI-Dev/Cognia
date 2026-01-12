/**
 * Tokenizer Registry - Unified interface for all tokenizer providers
 * 
 * Features:
 * - Auto-detection of tokenizer based on model
 * - Caching of token counts
 * - Fallback chain for reliability
 * - Provider-specific API key management
 */

import type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
  TokenizerSettings,
  TokenCountCacheEntry,
} from '@/types/system/tokenizer';
import {
  getTokenizerForModel,
  hashContent,
  DEFAULT_TOKENIZER_SETTINGS,
} from '@/types/system/tokenizer';
import { EstimationTokenizer } from './base-tokenizer';
import { TiktokenTokenizer } from './tiktoken-tokenizer';
import { GeminiTokenizer } from './gemini-tokenizer';
import { ClaudeTokenizer } from './claude-tokenizer';
import { GLMTokenizer } from './glm-tokenizer';

/** API keys for different providers */
export interface TokenizerApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  zhipu?: string;
}

/** Token count cache */
class TokenCountCache {
  private cache: Map<string, TokenCountCacheEntry> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttlSeconds: number = 300) {
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): TokenCountResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  set(key: string, result: TokenCountResult): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hash: key,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  setTTL(ttlSeconds: number): void {
    this.ttl = ttlSeconds * 1000;
  }
}

/**
 * Tokenizer Registry - Main entry point for token counting
 */
export class TokenizerRegistry {
  private tokenizers: Map<TokenizerProvider, Tokenizer> = new Map();
  private cache: TokenCountCache;
  private settings: TokenizerSettings;
  private apiKeys: TokenizerApiKeys = {};

  constructor(settings?: Partial<TokenizerSettings>) {
    this.settings = { ...DEFAULT_TOKENIZER_SETTINGS, ...settings };
    this.cache = new TokenCountCache(1000, this.settings.cacheTTL);
    this.initializeTokenizers();
  }

  private initializeTokenizers(): void {
    // Always available tokenizers
    this.tokenizers.set('estimation', new EstimationTokenizer());
    this.tokenizers.set('tiktoken', new TiktokenTokenizer());

    // Remote tokenizers (initialized without API keys, keys provided per-request)
    this.tokenizers.set('gemini-api', new GeminiTokenizer());
    this.tokenizers.set('claude-api', new ClaudeTokenizer());
    this.tokenizers.set('glm-api', new GLMTokenizer());
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<TokenizerSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.cache.setTTL(this.settings.cacheTTL);
  }

  /**
   * Set API keys for providers
   */
  setApiKeys(keys: Partial<TokenizerApiKeys>): void {
    this.apiKeys = { ...this.apiKeys, ...keys };
  }

  /**
   * Get the appropriate tokenizer for a model
   */
  getTokenizer(provider: TokenizerProvider): Tokenizer | null {
    if (provider === 'auto') {
      return null; // Will be resolved based on model
    }
    return this.tokenizers.get(provider) || null;
  }

  /**
   * Resolve the tokenizer provider for a model
   */
  resolveProvider(model?: string, preferredProvider?: TokenizerProvider): TokenizerProvider {
    if (preferredProvider && preferredProvider !== 'auto') {
      return preferredProvider;
    }

    if (this.settings.autoDetect && model) {
      return getTokenizerForModel(model);
    }

    return this.settings.preferredProvider === 'auto'
      ? 'estimation'
      : this.settings.preferredProvider;
  }

  /**
   * Get API key for a provider
   */
  private getApiKeyForProvider(provider: TokenizerProvider): string | undefined {
    switch (provider) {
      case 'gemini-api':
        return this.apiKeys.google;
      case 'claude-api':
        return this.apiKeys.anthropic;
      case 'glm-api':
        return this.apiKeys.zhipu;
      default:
        return undefined;
    }
  }

  /**
   * Count tokens for content
   */
  async countTokens(
    content: string,
    options?: TokenCountOptions & { model?: string }
  ): Promise<TokenCountResult> {
    if (!content || content.length === 0) {
      return { tokens: 0, isExact: true, provider: 'estimation' };
    }

    // Resolve provider
    const provider = this.resolveProvider(options?.model, options?.provider);

    // Check cache if enabled
    if (this.settings.enableCache && options?.useCache !== false) {
      const cacheKey = `${provider}:${options?.model || 'default'}:${hashContent(content)}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get tokenizer
    const tokenizer = this.tokenizers.get(provider);
    if (!tokenizer) {
      // Fallback to estimation
      const estimator = this.tokenizers.get('estimation')!;
      return estimator.countTokens(content, options);
    }

    // Prepare options with API key
    const enrichedOptions: TokenCountOptions = {
      ...options,
      apiKey: options?.apiKey || this.getApiKeyForProvider(provider),
      timeout: options?.timeout || this.settings.apiTimeout,
    };

    try {
      const result = await tokenizer.countTokens(content, enrichedOptions);

      // Cache result if successful and exact
      if (this.settings.enableCache && result.isExact) {
        const cacheKey = `${provider}:${options?.model || 'default'}:${hashContent(content)}`;
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      // Fallback to estimation if enabled
      if (this.settings.fallbackToEstimation) {
        const estimator = this.tokenizers.get('estimation')!;
        const result = await estimator.countTokens(content, options);
        return {
          ...result,
          error: error instanceof Error ? error.message : 'Primary tokenizer failed',
        };
      }
      throw error;
    }
  }

  /**
   * Count tokens for chat messages
   */
  async countMessageTokens(
    messages: TokenCountMessage[],
    options?: TokenCountOptions & { model?: string }
  ): Promise<TokenCountResult> {
    if (messages.length === 0) {
      return { tokens: 0, isExact: true, provider: 'estimation' };
    }

    // Resolve provider
    const provider = this.resolveProvider(options?.model, options?.provider);

    // Check cache if enabled
    if (this.settings.enableCache && options?.useCache !== false) {
      const contentHash = hashContent(messages.map((m) => `${m.role}:${m.content}`).join('|'));
      const cacheKey = `msg:${provider}:${options?.model || 'default'}:${contentHash}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get tokenizer
    const tokenizer = this.tokenizers.get(provider);
    if (!tokenizer) {
      const estimator = this.tokenizers.get('estimation')!;
      return estimator.countMessageTokens(messages, options);
    }

    // Prepare options with API key
    const enrichedOptions: TokenCountOptions = {
      ...options,
      apiKey: options?.apiKey || this.getApiKeyForProvider(provider),
      timeout: options?.timeout || this.settings.apiTimeout,
    };

    try {
      const result = await tokenizer.countMessageTokens(messages, enrichedOptions);

      // Cache result if successful and exact
      if (this.settings.enableCache && result.isExact) {
        const contentHash = hashContent(messages.map((m) => `${m.role}:${m.content}`).join('|'));
        const cacheKey = `msg:${provider}:${options?.model || 'default'}:${contentHash}`;
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      if (this.settings.fallbackToEstimation) {
        const estimator = this.tokenizers.get('estimation')!;
        const result = await estimator.countMessageTokens(messages, options);
        return {
          ...result,
          error: error instanceof Error ? error.message : 'Primary tokenizer failed',
        };
      }
      throw error;
    }
  }

  /**
   * Clear the token count cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if a tokenizer supports a model
   */
  supportsModel(provider: TokenizerProvider, model: string): boolean {
    const tokenizer = this.tokenizers.get(provider);
    return tokenizer?.supportsModel(model) || false;
  }

  /**
   * Get all available tokenizer providers
   */
  getAvailableProviders(): TokenizerProvider[] {
    return Array.from(this.tokenizers.keys());
  }
}

// Singleton instance
let registryInstance: TokenizerRegistry | null = null;

/**
 * Get the global tokenizer registry instance
 */
export function getTokenizerRegistry(settings?: Partial<TokenizerSettings>): TokenizerRegistry {
  if (!registryInstance) {
    registryInstance = new TokenizerRegistry(settings);
  } else if (settings) {
    registryInstance.updateSettings(settings);
  }
  return registryInstance;
}

/**
 * Reset the global registry (useful for testing)
 */
export function resetTokenizerRegistry(): void {
  registryInstance = null;
}
