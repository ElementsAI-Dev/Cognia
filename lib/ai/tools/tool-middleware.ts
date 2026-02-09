/**
 * Tool Execution Middleware - Wraps tool execution with cache, retry, and rate limiting
 * 
 * Features:
 * - Automatic result caching for cacheable tools (read-only operations)
 * - Retry with exponential backoff for transient failures (network tools)
 * - Rate limiting to prevent API abuse
 * - Execution logging for observability
 * 
 * Best practices from:
 * - MCP Architecture: input validation, timeouts, rate limiting, logging
 * - Agentic AI patterns: retry boundaries, idempotency, state awareness
 */

import { globalToolCache, type ToolCache } from './tool-cache';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

// ==================== Types ====================

export interface ToolMiddlewareConfig {
  /** Enable result caching for cacheable tools */
  enableCache: boolean;
  /** Enable retry for retriable tools */
  enableRetry: boolean;
  /** Enable rate limiting */
  enableRateLimit: boolean;
  /** Custom cache instance (defaults to globalToolCache) */
  cache?: ToolCache;
  /** Default retry config */
  retryConfig?: RetryConfig;
  /** Default rate limit config */
  rateLimitConfig?: RateLimitConfig;
}

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in ms before first retry */
  initialDelayMs: number;
  /** Maximum delay between retries in ms */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2 for exponential) */
  backoffMultiplier: number;
  /** Whether to add jitter to retry delays */
  jitter: boolean;
  /** Function to determine if an error is retriable */
  isRetriable?: (error: unknown) => boolean;
}

export interface RateLimitConfig {
  /** Maximum calls per window */
  maxCallsPerWindow: number;
  /** Window duration in ms */
  windowMs: number;
}

export interface ToolMiddlewareOptions {
  /** Whether the tool result can be cached */
  cacheable?: boolean;
  /** Custom cache TTL in ms for this tool */
  cacheTtl?: number;
  /** Whether the tool supports retry on failure */
  retriable?: boolean;
  /** Custom retry config for this tool */
  retryConfig?: Partial<RetryConfig>;
  /** Rate limit group (tools in the same group share a rate limit) */
  rateLimitGroup?: string;
  /** Custom rate limit for this tool */
  rateLimitConfig?: RateLimitConfig;
}

// ==================== Defaults ====================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  backoffMultiplier: 2,
  jitter: true,
};

const _DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxCallsPerWindow: 30,
  windowMs: 60000, // 1 minute
};

const DEFAULT_MIDDLEWARE_CONFIG: ToolMiddlewareConfig = {
  enableCache: true,
  enableRetry: true,
  enableRateLimit: true,
};

/**
 * Tools that are safe to cache (read-only, deterministic)
 */
const CACHEABLE_TOOLS = new Set([
  'calculator',
  'file_read',
  'file_exists',
  'file_info',
  'file_list',
  'file_search',
  'file_hash',
  'content_search',
  'document_summarize',
  'document_chunk',
  'document_analyze',
  'document_extract_tables',
  'document_read_file',
  'list_rag_collections',
  'subtitle_parse',
  'academic_analysis',
  'paper_comparison',
]);

/**
 * Tools that should retry on transient failures
 */
const RETRIABLE_TOOLS = new Set([
  'web_search',
  'web_scraper',
  'bulk_web_scraper',
  'search_and_scrape',
  'rag_search',
  'academic_search',
  'video_generate',
  'video_status',
  'image_generate',
  'image_edit',
  'image_variation',
  'video_subtitles',
  'video_analyze',
]);

/**
 * Rate limit groups - tools that share a rate limit window
 */
const RATE_LIMIT_GROUPS: Record<string, RateLimitConfig> = {
  web_search: { maxCallsPerWindow: 20, windowMs: 60000 },
  web_scraper: { maxCallsPerWindow: 10, windowMs: 60000 },
  image: { maxCallsPerWindow: 5, windowMs: 60000 },
  video: { maxCallsPerWindow: 3, windowMs: 60000 },
  academic: { maxCallsPerWindow: 15, windowMs: 60000 },
};

/**
 * Map tool names to their rate limit groups
 */
const TOOL_RATE_LIMIT_MAP: Record<string, string> = {
  web_search: 'web_search',
  web_scraper: 'web_scraper',
  bulk_web_scraper: 'web_scraper',
  search_and_scrape: 'web_search',
  image_generate: 'image',
  image_edit: 'image',
  image_variation: 'image',
  video_generate: 'video',
  video_status: 'video',
  academic_search: 'academic',
};

// ==================== Rate Limiter ====================

interface RateLimitWindow {
  timestamps: number[];
  config: RateLimitConfig;
}

const rateLimitWindows = new Map<string, RateLimitWindow>();

function checkRateLimit(group: string, config: RateLimitConfig): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  let window = rateLimitWindows.get(group);

  if (!window) {
    window = { timestamps: [], config };
    rateLimitWindows.set(group, window);
  }

  // Clean expired entries
  window.timestamps = window.timestamps.filter(ts => now - ts < config.windowMs);

  if (window.timestamps.length >= config.maxCallsPerWindow) {
    const oldestInWindow = window.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return { allowed: false, retryAfterMs };
  }

  window.timestamps.push(now);
  return { allowed: true };
}

/**
 * Reset rate limit state for a group (useful for testing)
 */
export function resetRateLimit(group?: string): void {
  if (group) {
    rateLimitWindows.delete(group);
  } else {
    rateLimitWindows.clear();
  }
}

/**
 * Get current rate limit status for all groups
 */
export function getRateLimitStatus(): Record<string, { used: number; limit: number; windowMs: number; resetInMs: number }> {
  const now = Date.now();
  const status: Record<string, { used: number; limit: number; windowMs: number; resetInMs: number }> = {};

  for (const [group, window] of rateLimitWindows.entries()) {
    const active = window.timestamps.filter(ts => now - ts < window.config.windowMs);
    const oldest = active[0];
    status[group] = {
      used: active.length,
      limit: window.config.maxCallsPerWindow,
      windowMs: window.config.windowMs,
      resetInMs: oldest ? window.config.windowMs - (now - oldest) : 0,
    };
  }

  return status;
}

// ==================== Retry Logic ====================

/**
 * Default retriable error detection
 * Handles network errors, rate limits, server errors
 */
function defaultIsRetriable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Network errors
    if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('econnrefused') ||
        msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('dns')) {
      return true;
    }
    // HTTP 5xx errors
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
      return true;
    }
    // Rate limit errors
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests')) {
      return true;
    }
    // Timeout
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return true;
    }
  }

  // Check result objects with success: false and retriable error patterns
  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;
    if (obj.success === false && typeof obj.error === 'string') {
      return defaultIsRetriable(new Error(obj.error));
    }
  }

  return false;
}

/**
 * Calculate retry delay with exponential backoff and optional jitter
 */
function calculateRetryDelay(attempt: number, config: RetryConfig): number {
  const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const clampedDelay = Math.min(baseDelay, config.maxDelayMs);

  if (config.jitter) {
    // Add random jitter between 0 and clampedDelay
    return Math.round(clampedDelay * (0.5 + Math.random() * 0.5));
  }

  return clampedDelay;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Middleware Wrapper ====================

/**
 * Wrap a tool execution function with middleware (cache + retry + rate limit)
 * 
 * @param toolName - Name of the tool
 * @param executeFn - Original execution function
 * @param options - Middleware options for this specific tool
 * @param config - Global middleware configuration
 * @returns Wrapped execution function
 */
export function withMiddleware<TArgs, TResult>(
  toolName: string,
  executeFn: (args: TArgs) => Promise<TResult>,
  options?: ToolMiddlewareOptions,
  config?: Partial<ToolMiddlewareConfig>
): (args: TArgs) => Promise<TResult> {
  const mergedConfig = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config };
  const cache = mergedConfig.cache ?? globalToolCache;

  const isCacheable = options?.cacheable ?? CACHEABLE_TOOLS.has(toolName);
  const isRetriable = options?.retriable ?? RETRIABLE_TOOLS.has(toolName);
  const rateLimitGroup = options?.rateLimitGroup ?? TOOL_RATE_LIMIT_MAP[toolName];
  const rateLimitCfg = options?.rateLimitConfig ?? (rateLimitGroup ? RATE_LIMIT_GROUPS[rateLimitGroup] : undefined);

  return async (args: TArgs): Promise<TResult> => {
    // 1. Check rate limit
    if (mergedConfig.enableRateLimit && rateLimitGroup && rateLimitCfg) {
      const rl = checkRateLimit(rateLimitGroup, rateLimitCfg);
      if (!rl.allowed) {
        log.warn(`Rate limit exceeded for tool '${toolName}' (group: ${rateLimitGroup}). Retry after ${rl.retryAfterMs}ms`);
        // For retriable tools, wait and retry; otherwise return error
        if (isRetriable && mergedConfig.enableRetry && rl.retryAfterMs && rl.retryAfterMs < 10000) {
          await sleep(rl.retryAfterMs);
        } else {
          return {
            success: false,
            error: `Rate limit exceeded. Please wait ${Math.ceil((rl.retryAfterMs ?? 0) / 1000)} seconds before trying again.`,
          } as TResult;
        }
      }
    }

    // 2. Check cache
    if (mergedConfig.enableCache && isCacheable) {
      const argsObj = (typeof args === 'object' && args !== null) ? args as Record<string, unknown> : { _raw: args };
      const cached = cache.get(toolName, argsObj);
      if (cached !== null) {
        log.debug(`Cache hit for tool '${toolName}'`);
        return cached as TResult;
      }
    }

    // 3. Execute with retry logic
    const retryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...(options?.retryConfig ?? {}),
    };
    const isRetriableFn = retryConfig.isRetriable ?? defaultIsRetriable;

    let lastError: unknown;
    const maxAttempts = (mergedConfig.enableRetry && isRetriable) ? retryConfig.maxRetries + 1 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await executeFn(args);

        // Check if result indicates a retriable failure
        if (attempt < maxAttempts - 1 && isRetriable && mergedConfig.enableRetry) {
          const resultObj = result as Record<string, unknown>;
          if (resultObj && resultObj.success === false && typeof resultObj.error === 'string' && isRetriableFn(result)) {
            lastError = result;
            const delay = calculateRetryDelay(attempt, retryConfig);
            log.debug(`Retriable failure for tool '${toolName}' (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms: ${resultObj.error}`);
            await sleep(delay);
            continue;
          }
        }

        // Cache successful results
        if (mergedConfig.enableCache && isCacheable) {
          const resultObj = result as Record<string, unknown>;
          if (!resultObj || resultObj.success !== false) {
            const argsObj = (typeof args === 'object' && args !== null) ? args as Record<string, unknown> : { _raw: args };
            cache.set(toolName, argsObj, result);
          }
        }

        return result;
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts - 1 && isRetriable && mergedConfig.enableRetry && isRetriableFn(error)) {
          const delay = calculateRetryDelay(attempt, retryConfig);
          log.debug(`Tool '${toolName}' threw retriable error (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`);
          await sleep(delay);
          continue;
        }

        throw error;
      }
    }

    // All retries exhausted - return last error result
    if (lastError && typeof lastError === 'object' && 'success' in (lastError as Record<string, unknown>)) {
      return lastError as TResult;
    }

    throw lastError;
  };
}

/**
 * Apply middleware to all tools in a record
 * Automatically determines cacheable/retriable based on tool name.
 * Wraps each tool's execute function with cache/retry/rate-limit logic.
 */
export function applyMiddlewareToTools(
  tools: Record<string, unknown>,
  config?: Partial<ToolMiddlewareConfig>
): void {
  for (const [name, tool] of Object.entries(tools)) {
    const t = tool as { execute: (args: Record<string, unknown>) => Promise<unknown>; name: string };
    if (t && typeof t.execute === 'function') {
      const originalExecute = t.execute;
      t.execute = withMiddleware(
        name,
        originalExecute,
        undefined,
        config
      );
    }
  }
}

/**
 * Get cache stats for display
 */
export function getToolCacheStats() {
  return globalToolCache.getStats();
}

/**
 * Clear the global tool cache
 */
export function clearToolCache() {
  globalToolCache.clear();
}

/**
 * Invalidate cache for a specific tool
 */
export function invalidateToolCache(toolName: string) {
  globalToolCache.invalidate(toolName);
}
