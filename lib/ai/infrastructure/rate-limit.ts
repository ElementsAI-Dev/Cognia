/**
 * Rate Limiting - API request rate limiting utilities
 * 
 * Provides rate limiting for AI API requests to prevent abuse
 * and manage costs. Supports multiple strategies:
 * - Fixed window
 * - Sliding window
 * - Token bucket
 * 
 * Based on AI SDK documentation:
 * https://ai-sdk.dev/docs/advanced/rate-limiting
 */

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Total limit for the window */
  limit: number;
  /** Time in ms until the limit resets */
  resetInMs: number;
  /** Retry after in seconds (if rate limited) */
  retryAfter?: number;
}

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  /** Check and consume a request */
  limit: (identifier: string) => Promise<RateLimitResult>;
  /** Get current status without consuming */
  getStatus: (identifier: string) => Promise<RateLimitResult>;
  /** Reset the limiter for an identifier */
  reset: (identifier: string) => Promise<void>;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum number of requests */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * In-memory rate limiter using fixed window algorithm
 */
export function createFixedWindowRateLimiter(config: RateLimitConfig): RateLimiter {
  const { limit, windowSeconds } = config;
  const windows = new Map<string, { count: number; resetAt: number }>();

  const getWindow = (identifier: string) => {
    const now = Date.now();
    let window = windows.get(identifier);

    // Reset if window expired
    if (!window || now >= window.resetAt) {
      window = {
        count: 0,
        resetAt: now + windowSeconds * 1000,
      };
      windows.set(identifier, window);
    }

    return window;
  };

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const window = getWindow(identifier);

      if (window.count >= limit) {
        return {
          success: false,
          remaining: 0,
          limit,
          resetInMs: Math.max(0, window.resetAt - now),
          retryAfter: Math.ceil((window.resetAt - now) / 1000),
        };
      }

      window.count++;
      windows.set(identifier, window);

      return {
        success: true,
        remaining: limit - window.count,
        limit,
        resetInMs: Math.max(0, window.resetAt - now),
      };
    },

    async getStatus(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const window = getWindow(identifier);

      return {
        success: window.count < limit,
        remaining: Math.max(0, limit - window.count),
        limit,
        resetInMs: Math.max(0, window.resetAt - now),
      };
    },

    async reset(identifier: string): Promise<void> {
      windows.delete(identifier);
    },
  };
}

/**
 * In-memory rate limiter using sliding window algorithm
 * More accurate than fixed window but slightly more memory intensive
 */
export function createSlidingWindowRateLimiter(config: RateLimitConfig): RateLimiter {
  const { limit, windowSeconds } = config;
  const requests = new Map<string, number[]>();

  const cleanupOldRequests = (identifier: string) => {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const userRequests = requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => time > windowStart);
    requests.set(identifier, validRequests);
    return validRequests;
  };

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const validRequests = cleanupOldRequests(identifier);

      if (validRequests.length >= limit) {
        const oldestRequest = validRequests[0];
        const resetInMs = oldestRequest + windowSeconds * 1000 - now;

        return {
          success: false,
          remaining: 0,
          limit,
          resetInMs: Math.max(0, resetInMs),
          retryAfter: Math.ceil(Math.max(0, resetInMs) / 1000),
        };
      }

      validRequests.push(now);
      requests.set(identifier, validRequests);

      return {
        success: true,
        remaining: limit - validRequests.length,
        limit,
        resetInMs: windowSeconds * 1000,
      };
    },

    async getStatus(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const validRequests = cleanupOldRequests(identifier);
      const resetInMs = validRequests.length > 0 
        ? validRequests[0] + windowSeconds * 1000 - now 
        : windowSeconds * 1000;

      return {
        success: validRequests.length < limit,
        remaining: Math.max(0, limit - validRequests.length),
        limit,
        resetInMs: Math.max(0, resetInMs),
      };
    },

    async reset(identifier: string): Promise<void> {
      requests.delete(identifier);
    },
  };
}

/**
 * Token bucket rate limiter
 * Good for allowing bursts while maintaining average rate
 */
export function createTokenBucketRateLimiter(config: {
  /** Maximum tokens (burst capacity) */
  maxTokens: number;
  /** Tokens added per second (refill rate) */
  refillRate: number;
}): RateLimiter {
  const { maxTokens, refillRate } = config;
  const buckets = new Map<string, { tokens: number; lastRefill: number }>();

  const getBucket = (identifier: string) => {
    const now = Date.now();
    let bucket = buckets.get(identifier);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      buckets.set(identifier, bucket);
      return bucket;
    }

    // Refill tokens based on time elapsed
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refillAmount = elapsed * refillRate;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + refillAmount);
    bucket.lastRefill = now;
    buckets.set(identifier, bucket);

    return bucket;
  };

  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const bucket = getBucket(identifier);

      if (bucket.tokens < 1) {
        const waitTime = (1 - bucket.tokens) / refillRate * 1000;
        return {
          success: false,
          remaining: 0,
          limit: maxTokens,
          resetInMs: waitTime,
          retryAfter: Math.ceil(waitTime / 1000),
        };
      }

      bucket.tokens -= 1;
      buckets.set(identifier, bucket);

      return {
        success: true,
        remaining: Math.floor(bucket.tokens),
        limit: maxTokens,
        resetInMs: ((maxTokens - bucket.tokens) / refillRate) * 1000,
      };
    },

    async getStatus(identifier: string): Promise<RateLimitResult> {
      const bucket = getBucket(identifier);

      return {
        success: bucket.tokens >= 1,
        remaining: Math.floor(bucket.tokens),
        limit: maxTokens,
        resetInMs: ((maxTokens - bucket.tokens) / refillRate) * 1000,
      };
    },

    async reset(identifier: string): Promise<void> {
      buckets.delete(identifier);
    },
  };
}

/**
 * Provider-specific rate limits (requests per minute)
 */
export const PROVIDER_RATE_LIMITS: Record<string, RateLimitConfig> = {
  openai: { limit: 60, windowSeconds: 60 },
  anthropic: { limit: 60, windowSeconds: 60 },
  google: { limit: 60, windowSeconds: 60 },
  deepseek: { limit: 60, windowSeconds: 60 },
  groq: { limit: 30, windowSeconds: 60 },
  mistral: { limit: 60, windowSeconds: 60 },
  xai: { limit: 60, windowSeconds: 60 },
  togetherai: { limit: 60, windowSeconds: 60 },
  openrouter: { limit: 200, windowSeconds: 60 },
  cohere: { limit: 100, windowSeconds: 60 },
  fireworks: { limit: 100, windowSeconds: 60 },
  cerebras: { limit: 30, windowSeconds: 60 },
  sambanova: { limit: 30, windowSeconds: 60 },
  ollama: { limit: 1000, windowSeconds: 60 }, // Local, so higher limit
};

/**
 * Create a rate limiter for a specific provider
 */
export function createProviderRateLimiter(provider: string): RateLimiter {
  const config = PROVIDER_RATE_LIMITS[provider] || { limit: 60, windowSeconds: 60 };
  return createSlidingWindowRateLimiter(config);
}

/**
 * Composite rate limiter that combines multiple limiters
 * All limiters must pass for a request to be allowed
 */
export function createCompositeRateLimiter(limiters: RateLimiter[]): RateLimiter {
  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      for (const limiter of limiters) {
        const result = await limiter.limit(identifier);
        if (!result.success) {
          return result;
        }
      }

      // All passed - return combined result
      const statuses = await Promise.all(
        limiters.map(l => l.getStatus(identifier))
      );
      
      const minRemaining = Math.min(...statuses.map(s => s.remaining));
      const maxResetInMs = Math.max(...statuses.map(s => s.resetInMs));
      const totalLimit = statuses.reduce((sum, s) => sum + s.limit, 0);

      return {
        success: true,
        remaining: minRemaining,
        limit: totalLimit,
        resetInMs: maxResetInMs,
      };
    },

    async getStatus(identifier: string): Promise<RateLimitResult> {
      const statuses = await Promise.all(
        limiters.map(l => l.getStatus(identifier))
      );

      const allSuccess = statuses.every(s => s.success);
      const minRemaining = Math.min(...statuses.map(s => s.remaining));
      const maxResetInMs = Math.max(...statuses.map(s => s.resetInMs));
      const totalLimit = statuses.reduce((sum, s) => sum + s.limit, 0);

      return {
        success: allSuccess,
        remaining: minRemaining,
        limit: totalLimit,
        resetInMs: maxResetInMs,
        retryAfter: allSuccess ? undefined : Math.ceil(maxResetInMs / 1000),
      };
    },

    async reset(identifier: string): Promise<void> {
      await Promise.all(limiters.map(l => l.reset(identifier)));
    },
  };
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly result: RateLimitResult
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Wrapper function to apply rate limiting to an async operation
 */
export async function withRateLimit<T>(
  limiter: RateLimiter,
  identifier: string,
  operation: () => Promise<T>
): Promise<T> {
  const result = await limiter.limit(identifier);
  
  if (!result.success) {
    throw new RateLimitError(
      `Rate limit exceeded. Retry after ${result.retryAfter} seconds.`,
      result
    );
  }

  return operation();
}

/**
 * Default rate limiters (singleton instances)
 */
const providerLimiters = new Map<string, RateLimiter>();

/**
 * Get rate limiter for a provider
 */
export function getRateLimiter(provider: string): RateLimiter {
  let limiter = providerLimiters.get(provider);
  if (!limiter) {
    limiter = createProviderRateLimiter(provider);
    providerLimiters.set(provider, limiter);
  }
  return limiter;
}

/**
 * Check rate limit for a provider and identifier
 */
export async function checkRateLimit(
  provider: string,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(provider);
  return limiter.limit(identifier);
}

/**
 * Record a Retry-After value from an API response header.
 * This temporarily blocks the provider for the specified duration,
 * preventing further requests until the retry-after period expires.
 *
 * @param provider - The provider ID
 * @param retryAfterSeconds - The Retry-After value in seconds from the API response
 */
export function recordRetryAfter(provider: string, retryAfterSeconds: number): void {
  const retryAfterMs = retryAfterSeconds * 1000;
  retryAfterOverrides.set(provider, {
    blockedUntil: Date.now() + retryAfterMs,
    retryAfterSeconds,
  });
}

/**
 * Check if a provider is blocked due to a Retry-After header
 */
export function isProviderRetryBlocked(provider: string): { blocked: boolean; retryAfterSeconds?: number } {
  const override = retryAfterOverrides.get(provider);
  if (!override) return { blocked: false };

  const now = Date.now();
  if (now >= override.blockedUntil) {
    retryAfterOverrides.delete(provider);
    return { blocked: false };
  }

  return {
    blocked: true,
    retryAfterSeconds: Math.ceil((override.blockedUntil - now) / 1000),
  };
}

/**
 * Parse Retry-After header value (supports both seconds and HTTP-date formats)
 */
export function parseRetryAfterHeader(headerValue: string): number | null {
  if (!headerValue || headerValue.trim() === '') return null;

  // Try parsing as number of seconds
  const seconds = Number(headerValue);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds;
  }

  // Try parsing as HTTP-date
  const date = new Date(headerValue);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return Math.max(0, Math.ceil(delayMs / 1000));
  }

  return null;
}

/**
 * Retry-After overrides per provider (populated from API response headers)
 */
const retryAfterOverrides = new Map<string, { blockedUntil: number; retryAfterSeconds: number }>();
