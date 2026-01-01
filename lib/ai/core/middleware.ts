/**
 * AI Middleware - Composable middleware for language models
 * Provides caching, logging, retry logic, and reasoning extraction
 * 
 * Built-in middlewares from AI SDK:
 * - extractReasoningMiddleware: Extract reasoning from <think> tags
 * - simulateStreamingMiddleware: Simulate streaming for non-streaming models
 * - defaultSettingsMiddleware: Apply default settings to models
 * - addToolInputExamplesMiddleware: Add examples to tool descriptions
 * 
 * Based on AI SDK documentation:
 * https://ai-sdk.dev/docs/ai-sdk-core/middleware
 */

import {
  wrapLanguageModel,
  extractReasoningMiddleware,
  simulateStreamingMiddleware,
  defaultSettingsMiddleware,
  type LanguageModel,
  type LanguageModelMiddleware,
} from 'ai';

// Re-export built-in middlewares for convenience
export {
  extractReasoningMiddleware,
  simulateStreamingMiddleware,
  defaultSettingsMiddleware,
};

export interface MiddlewareConfig {
  enableLogging?: boolean;
  enableCaching?: boolean;
  enableReasoning?: boolean;
  reasoningTagName?: string;
  cacheStore?: CacheStore;
  onRequest?: (params: RequestLogParams) => void;
  onResponse?: (params: ResponseLogParams) => void;
  onError?: (error: Error) => void;
}

export interface RequestLogParams {
  provider: string;
  model: string;
  prompt?: string;
  timestamp: Date;
}

export interface ResponseLogParams {
  provider: string;
  model: string;
  text?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  duration: number;
  timestamp: Date;
}

export interface CacheStore {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
}

/**
 * Create a simple in-memory cache store
 */
export function createInMemoryCacheStore(maxSize: number = 100): CacheStore {
  const cache = new Map<string, { value: string; expiry: number }>();

  return {
    async get(key: string): Promise<string | null> {
      const entry = cache.get(key);
      if (!entry) return null;
      if (entry.expiry && Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
      }
      return entry.value;
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      // Evict oldest entries if cache is full
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }

      cache.set(key, {
        value,
        expiry: ttl ? Date.now() + ttl * 1000 : 0,
      });
    },
  };
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('429')) {
    return true;
  }
  
  // Server errors
  if (message.includes('500') || message.includes('502') || 
      message.includes('503') || message.includes('504')) {
    return true;
  }
  
  // Network errors
  if (message.includes('network') || message.includes('timeout') ||
      message.includes('econnreset') || message.includes('enotfound')) {
    return true;
  }
  
  return false;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Apply middleware to a language model using AI SDK's wrapLanguageModel
 */
export function applyMiddleware<T extends LanguageModel>(
  model: T,
  config: MiddlewareConfig
): T {
  let wrappedModel = model;

  // Add reasoning extraction middleware
  if (config.enableReasoning) {
    wrappedModel = wrapLanguageModel({
      model: wrappedModel as Parameters<typeof wrapLanguageModel>[0]['model'],
      middleware: extractReasoningMiddleware({
        tagName: config.reasoningTagName || 'think',
      }),
    }) as T;
  }

  return wrappedModel;
}

/**
 * Create a model with reasoning extraction
 */
export function withReasoningExtraction<T extends LanguageModel>(
  model: T,
  tagName: string = 'think'
): T {
  return wrapLanguageModel({
    model: model as Parameters<typeof wrapLanguageModel>[0]['model'],
    middleware: extractReasoningMiddleware({ tagName }),
  }) as T;
}

/**
 * Retry wrapper for async operations
 */
export async function withRetryAsync<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  onError?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      onError?.(lastError, attempt);
      
      // Check if it's a retryable error
      if (!isRetryableError(lastError) || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Create a cached version of an async function
 */
export function createCachedFunction<T, R>(
  fn: (input: T) => Promise<R>,
  store: CacheStore,
  keyFn: (input: T) => string,
  ttl: number = 3600
): (input: T) => Promise<R> {
  return async (input: T): Promise<R> => {
    const cacheKey = keyFn(input);
    
    // Check cache
    const cached = await store.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as R;
      } catch {
        // Invalid cache entry, continue
      }
    }

    // Execute function
    const result = await fn(input);
    
    // Cache result
    await store.set(cacheKey, JSON.stringify(result), ttl);
    
    return result;
  };
}

/**
 * Telemetry/observability wrapper for AI operations
 */
export interface TelemetryOptions {
  onStart?: (params: { operation: string; timestamp: Date }) => void;
  onSuccess?: (params: { operation: string; duration: number; timestamp: Date }) => void;
  onError?: (params: { operation: string; error: Error; duration: number; timestamp: Date }) => void;
}

export function withTelemetry<T>(
  operation: string,
  fn: () => Promise<T>,
  options: TelemetryOptions
): Promise<T> {
  const startTime = Date.now();
  const timestamp = new Date();
  
  options.onStart?.({ operation, timestamp });
  
  return fn()
    .then((result) => {
      options.onSuccess?.({
        operation,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
      return result;
    })
    .catch((error) => {
      options.onError?.({
        operation,
        error: error as Error,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      });
      throw error;
    });
}

/**
 * Default settings configuration for models
 */
export interface DefaultModelSettings {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  providerOptions?: Record<string, unknown>;
}

/**
 * Create a model with default settings applied
 */
export function withDefaultSettings<T extends LanguageModel>(
  model: T,
  settings: DefaultModelSettings
): T {
  // Build settings object without providerOptions first
  const baseSettings: Record<string, unknown> = {};
  if (settings.temperature !== undefined) baseSettings.temperature = settings.temperature;
  if (settings.maxTokens !== undefined) baseSettings.maxOutputTokens = settings.maxTokens;
  if (settings.topP !== undefined) baseSettings.topP = settings.topP;
  if (settings.topK !== undefined) baseSettings.topK = settings.topK;
  if (settings.frequencyPenalty !== undefined) baseSettings.frequencyPenalty = settings.frequencyPenalty;
  if (settings.presencePenalty !== undefined) baseSettings.presencePenalty = settings.presencePenalty;
  if (settings.providerOptions) baseSettings.providerOptions = settings.providerOptions;

  return wrapLanguageModel({
    model: model as Parameters<typeof wrapLanguageModel>[0]['model'],
    middleware: defaultSettingsMiddleware({
      settings: baseSettings as Parameters<typeof defaultSettingsMiddleware>[0]['settings'],
    }),
  }) as T;
}

/**
 * Create a model that simulates streaming for non-streaming providers
 */
export function withSimulatedStreaming<T extends LanguageModel>(model: T): T {
  return wrapLanguageModel({
    model: model as Parameters<typeof wrapLanguageModel>[0]['model'],
    middleware: simulateStreamingMiddleware(),
  }) as T;
}

/**
 * Combine multiple middlewares into a single wrapped model
 */
export function withMiddlewares<T extends LanguageModel>(
  model: T,
  middlewares: LanguageModelMiddleware[]
): T {
  if (middlewares.length === 0) {
    return model;
  }

  return wrapLanguageModel({
    model: model as Parameters<typeof wrapLanguageModel>[0]['model'],
    middleware: middlewares.length === 1 ? middlewares[0] : middlewares,
  }) as T;
}

/**
 * Create a logging middleware
 */
export function createLoggingMiddleware(options?: {
  logParams?: boolean;
  logResult?: boolean;
  logger?: (message: string, data?: unknown) => void;
}): LanguageModelMiddleware {
  const {
    logParams = true,
    logResult = true,
    logger = console.log,
  } = options || {};

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      
      if (logParams) {
        logger('[AI] Generate started', { params });
      }

      const result = await doGenerate();
      
      if (logResult) {
        // Extract text from content array
        const textContent = result.content?.find((c: { type: string }) => c.type === 'text');
        const textLength = textContent && 'text' in textContent ? (textContent.text as string)?.length : 0;
        logger('[AI] Generate completed', {
          duration: Date.now() - startTime,
          textLength,
          finishReason: result.finishReason,
        });
      }

      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const startTime = Date.now();
      
      if (logParams) {
        logger('[AI] Stream started', { params });
      }

      const result = await doStream();
      
      if (logResult) {
        logger('[AI] Stream initiated', {
          duration: Date.now() - startTime,
        });
      }

      return result;
    },
  };
}

/**
 * Create a guardrail middleware for content filtering
 */
export function createGuardrailMiddleware(options: {
  /** Words or patterns to filter from output */
  blockedPatterns?: (string | RegExp)[];
  /** Replacement text for blocked content */
  replacement?: string;
  /** Custom filter function */
  customFilter?: (text: string) => string;
}): LanguageModelMiddleware {
  const {
    blockedPatterns = [],
    replacement = '[FILTERED]',
    customFilter,
  } = options;

  const filterText = (text: string | undefined): string | undefined => {
    if (!text) return text;
    
    let filtered = text;
    
    // Apply blocked patterns
    for (const pattern of blockedPatterns) {
      if (typeof pattern === 'string') {
        filtered = filtered.replaceAll(pattern, replacement);
      } else {
        filtered = filtered.replace(pattern, replacement);
      }
    }
    
    // Apply custom filter
    if (customFilter) {
      filtered = customFilter(filtered);
    }
    
    return filtered;
  };

  return {
    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate();
      // Filter text content in the content array
      const filteredContent = result.content?.map((item) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyItem = item as any;
        if (anyItem.type === 'text' && 'text' in anyItem) {
          return { ...anyItem, text: filterText(anyItem.text) };
        }
        return item;
      });
      return {
        ...result,
        content: filteredContent,
      };
    },
  };
}

// Re-export wrapLanguageModel for advanced usage
export { wrapLanguageModel };

// Export type for external use
export type { LanguageModelMiddleware };
