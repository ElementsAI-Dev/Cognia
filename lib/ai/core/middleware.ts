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
import { loggers } from '@/lib/logger';

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
    logger = (msg: string) => loggers.ai.debug(msg),
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

// ============================================================================
// Safety Mode - Security Rules and Patterns
// ============================================================================

export interface SafetyCheckResult {
  blocked: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedRule?: string;
  reason?: string;
  category?: 'injection' | 'jailbreak' | 'dangerous_command' | 'data_leak' | 'other';
}

export interface SafetyCheckOptions {
  mode: 'off' | 'warn' | 'block';
  checkUserInput: boolean;
  checkSystemPrompt: boolean;
  checkToolCalls: boolean;
  blockDangerousCommands: boolean;
  customBlockedPatterns: (string | RegExp)[];
  customAllowedPatterns: (string | RegExp)[];
}

/**
 * Default safety rules for prompt injection, jailbreak, and dangerous commands
 */
export const DEFAULT_SAFETY_RULES = {
  // Prompt injection patterns
  injection: [
    { pattern: /ignore\s+(all\s+)?(previous|above|preceding)\s+instructions/gi, severity: 'critical' as const, category: 'injection' as const },
    { pattern: /disregard\s+(all\s+)?(previous|above|preceding)\s+instructions/gi, severity: 'critical' as const, category: 'injection' as const },
    { pattern: /forget\s+(everything|all\s+instructions|previous\s+instructions)/gi, severity: 'critical' as const, category: 'injection' as const },
    { pattern: /new\s+(system\s+)?prompt:/gi, severity: 'critical' as const, category: 'injection' as const },
    { pattern: /system\s+prompt\s*:/gi, severity: 'high' as const, category: 'injection' as const },
    { pattern: /developer\s+message\s*:/gi, severity: 'high' as const, category: 'injection' as const },
    { pattern: /user\s+message\s*:/gi, severity: 'medium' as const, category: 'injection' as const },
    { pattern: /assistant\s+message\s*:/gi, severity: 'medium' as const, category: 'injection' as const },
  ],

  // Jailbreak patterns
  jailbreak: [
    { pattern: /\b(jailbreak|jail\s*break|bypass|circumvent|override)\b/gi, severity: 'high' as const, category: 'jailbreak' as const },
    { pattern: /\b(dan|developer\s+access\s+mode)\b/gi, severity: 'high' as const, category: 'jailbreak' as const },
    { pattern: /\b(above\s+policy|policy\s+override)\b/gi, severity: 'high' as const, category: 'jailbreak' as const },
    { pattern: /\b(no\s+restrictions|without\s+restrictions|ignore\s+restrictions)\b/gi, severity: 'medium' as const, category: 'jailbreak' as const },
    { pattern: /\b(assume\s+role|pretend\s+to\s+be|act\s+as)\s+(unrestricted|uncensored|unfiltered)\b/gi, severity: 'high' as const, category: 'jailbreak' as const },
    { pattern: /\b(above\s+ethics|ignore\s+ethics|without\s+ethics)\b/gi, severity: 'high' as const, category: 'jailbreak' as const },
  ],

  // Dangerous command patterns
  dangerousCommands: [
    { pattern: /\b(rm\s+-rf|del\s+\/f|format\s+c\s*:)\b/gi, severity: 'critical' as const, category: 'dangerous_command' as const },
    { pattern: /\b(shutdown\s+(now|\/s\/t\s*0)|reboot\s+\/f)\b/gi, severity: 'critical' as const, category: 'dangerous_command' as const },
    { pattern: /\b(sudo\s+(rm|del|format|shutdown|reboot))\b/gi, severity: 'critical' as const, category: 'dangerous_command' as const },
    { pattern: /\b(exec\(|execSync\(|spawn\(|child_process)\b/gi, severity: 'high' as const, category: 'dangerous_command' as const },
    { pattern: /\b(os\.system|subprocess\.run|subprocess\.Popen)\b/gi, severity: 'high' as const, category: 'dangerous_command' as const },
    { pattern: /\b(Invoke-Expression|iex)\s+\(/gi, severity: 'critical' as const, category: 'dangerous_command' as const },
    { pattern: /\b(eval\(|Function\(|setTimeout\(.*\()\b/gi, severity: 'high' as const, category: 'dangerous_command' as const },
  ],

  // Data leak patterns
  dataLeak: [
    { pattern: /\b(reveal|show|display|expose|leak)\s+(system\s+prompt|instructions|secrets|api\s+key|password)\b/gi, severity: 'high' as const, category: 'data_leak' as const },
    { pattern: /\b(print|output|echo)\s+(system\s+prompt|instructions)\b/gi, severity: 'medium' as const, category: 'data_leak' as const },
    { pattern: /\b(ignore\s+confidentiality|bypass\s+security|leak\s+data)\b/gi, severity: 'high' as const, category: 'data_leak' as const },
  ],
};

/**
 * Check content against safety rules
 */
export function checkSafety(
  content: string,
  options: SafetyCheckOptions
): SafetyCheckResult {
  // If safety mode is off, always allow
  if (options.mode === 'off') {
    return { blocked: false, severity: 'low' };
  }

  // Check custom allowed patterns first (whitelist)
  for (const pattern of options.customAllowedPatterns) {
    if (typeof pattern === 'string') {
      if (content.includes(pattern)) {
        return { blocked: false, severity: 'low' };
      }
    } else {
      if (pattern.test(content)) {
        return { blocked: false, severity: 'low' };
      }
    }
  }

  // Check custom blocked patterns (blacklist)
  for (const pattern of options.customBlockedPatterns) {
    if (typeof pattern === 'string') {
      if (content.includes(pattern)) {
        return {
          blocked: options.mode === 'block',
          severity: 'high',
          matchedRule: pattern,
          reason: 'Content matches custom blocked pattern',
          category: 'other',
        };
      }
    } else {
      if (pattern.test(content)) {
        return {
          blocked: options.mode === 'block',
          severity: 'high',
          matchedRule: pattern.toString(),
          reason: 'Content matches custom blocked pattern',
          category: 'other',
        };
      }
    }
  }

  // Check default safety rules
  const allRules = [
    ...DEFAULT_SAFETY_RULES.injection,
    ...DEFAULT_SAFETY_RULES.jailbreak,
    ...DEFAULT_SAFETY_RULES.dangerousCommands,
    ...DEFAULT_SAFETY_RULES.dataLeak,
  ];

  for (const rule of allRules) {
    if (rule.pattern.test(content)) {
      const blocked = options.mode === 'block' || 
        (options.mode === 'warn' && rule.severity === 'critical');
      
      return {
        blocked,
        severity: rule.severity,
        matchedRule: rule.pattern.toString(),
        reason: `Content matches ${rule.category} pattern`,
        category: rule.category,
      };
    }
  }

  return { blocked: false, severity: 'low' };
}

/**
 * Check if a tool call is safe
 */
export function checkToolCallSafety(
  toolName: string,
  args: Record<string, unknown>,
  options: SafetyCheckOptions
): SafetyCheckResult {
  // If safety mode is off or tool checking is disabled, always allow
  if (options.mode === 'off' || !options.checkToolCalls) {
    return { blocked: false, severity: 'low' };
  }

  // Check tool name for dangerous patterns
  const toolCheck = checkSafety(toolName, options);
  if (toolCheck.blocked) {
    return {
      ...toolCheck,
      reason: `Tool name is potentially dangerous: ${toolCheck.reason}`,
    };
  }

  // Check arguments for dangerous patterns
  const argsString = JSON.stringify(args);
  const argsCheck = checkSafety(argsString, options);
  if (argsCheck.blocked) {
    return {
      ...argsCheck,
      reason: `Tool arguments contain potentially dangerous content: ${argsCheck.reason}`,
    };
  }

  // Specific dangerous tool checks
  const dangerousTools = [
    'execute_shell',
    'run_command',
    'exec',
    'spawn',
    'file_delete',
    'file_write',
    'start_process',
    'process_terminate',
    'start_processes_parallel',
    'terminate_processes_parallel',
    'start_processes_async',
    'terminate_processes_async',
  ];

  if (dangerousTools.some(dt => toolName.includes(dt))) {
    if (options.blockDangerousCommands) {
      return {
        blocked: options.mode === 'block',
        severity: 'high',
        matchedRule: toolName,
        reason: 'Tool is classified as potentially dangerous',
        category: 'dangerous_command',
      };
    }
  }

  return { blocked: false, severity: 'low' };
}

/**
 * Create a safety check middleware that filters content before sending to model
 */
export function createSafetyCheckMiddleware(options: SafetyCheckOptions): LanguageModelMiddleware {
  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      // Check system prompt if enabled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paramsAny = params as any;
      if (options.checkSystemPrompt && paramsAny.system) {
        const systemCheck = checkSafety(paramsAny.system as string, options);
        if (systemCheck.blocked) {
          throw new Error(
            `System prompt blocked by safety mode: ${systemCheck.reason} (severity: ${systemCheck.severity})`
          );
        }
      }

      // Check user messages if enabled
      if (options.checkUserInput && paramsAny.messages) {
        for (const message of paramsAny.messages) {
          if (message.role === 'user' && typeof message.content === 'string') {
            const userCheck = checkSafety(message.content, options);
            if (userCheck.blocked) {
              throw new Error(
                `User message blocked by safety mode: ${userCheck.reason} (severity: ${userCheck.severity})`
              );
            }
          }
        }
      }

      return doGenerate();
    },
  };
}

/**
 * Get a human-readable safety warning message
 */
export function getSafetyWarningMessage(result: SafetyCheckResult): string {
  if (!result.blocked) {
    return '';
  }

  const severityMessages = {
    critical: 'This content has been blocked for security reasons.',
    high: 'This content appears to violate safety guidelines.',
    medium: 'This content may be unsafe.',
    low: 'This content triggered a safety warning.',
  };

  return `${severityMessages[result.severity]} ${result.reason || ''}`;
}

/**
 * External review API response interface
 */
export interface ExternalReviewResponse {
  safe: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  category?: 'injection' | 'jailbreak' | 'dangerous_command' | 'data_leak' | 'other';
  details?: Record<string, unknown>;
}

/**
 * Call external review API to check content safety
 */
export async function callExternalReviewAPI(
  content: string,
  config: {
    endpoint: string;
    apiKey?: string;
    headers?: Record<string, string>;
    timeoutMs: number;
  }
): Promise<ExternalReviewResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`External review API failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ExternalReviewResponse;
    return data;
  } catch (error) {
    throw new Error(`External review API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check content safety with external API as fallback
 */
export async function checkSafetyWithExternalAPI(
  content: string,
  localCheck: SafetyCheckResult,
  externalReviewConfig: {
    enabled: boolean;
    endpoint: string;
    apiKey?: string;
    headers?: Record<string, string>;
    timeoutMs: number;
    minSeverity: 'low' | 'medium' | 'high' | 'critical';
    fallbackMode: 'allow' | 'block';
  }
): Promise<SafetyCheckResult> {
  // If local check already blocked, return it immediately
  if (localCheck.blocked) {
    return localCheck;
  }

  // If external review is disabled, return local check
  if (!externalReviewConfig.enabled || !externalReviewConfig.endpoint) {
    return localCheck;
  }

  try {
    const externalResult = await callExternalReviewAPI(content, externalReviewConfig);

    // Convert external result to SafetyCheckResult
    const result: SafetyCheckResult = {
      blocked: !externalResult.safe,
      severity: externalResult.severity || 'medium',
      reason: externalResult.reason || 'External review flagged content',
      category: externalResult.category || 'other',
    };

    // Apply severity threshold
    const severityOrder = ['low', 'medium', 'high', 'critical'] as const;
    const minSeverityIndex = severityOrder.indexOf(externalReviewConfig.minSeverity);
    const resultSeverityIndex = severityOrder.indexOf(result.severity);

    if (resultSeverityIndex < minSeverityIndex) {
      // Below threshold, treat as safe
      return { blocked: false, severity: result.severity };
    }

    return result;
  } catch (error) {
    // External API failed, apply fallback mode
    if (externalReviewConfig.fallbackMode === 'block') {
      return {
        blocked: true,
        severity: 'high',
        reason: `External review failed and fallback mode is block: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Allow mode - log warning but don't block
    loggers.ai.warn(`External review API failed, allowing content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { blocked: false, severity: 'low' };
  }
}
