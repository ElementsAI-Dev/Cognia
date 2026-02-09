/**
 * Unified Retry Utility
 *
 * Provides consistent retry logic across the codebase with:
 * - Configurable retry strategies (exponential, linear, constant)
 * - Jitter support for better load distribution
 * - Retryable error detection
 * - Circuit breaker pattern
 * - Timeout handling
 */

/**
 * Retry configuration options
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  initialDelay: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay: number;
  /** Backoff strategy */
  backoffStrategy: 'exponential' | 'linear' | 'constant';
  /** Multiplier for exponential/linear backoff (default: 2) */
  backoffMultiplier: number;
  /** Add random jitter to delays (default: true) */
  jitter: boolean;
  /** Maximum jitter in milliseconds (default: 1000) */
  maxJitter: number;
  /** Patterns in error messages that indicate retryable errors */
  retryableErrors: string[];
  /** Timeout for each attempt in milliseconds (optional) */
  attemptTimeout?: number;
  /** Callback on each retry attempt */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffStrategy: 'exponential',
  backoffMultiplier: 2,
  jitter: true,
  maxJitter: 1000,
  retryableErrors: [
    'timeout',
    'rate_limit',
    'rate limit',
    '429',
    '500',
    '502',
    '503',
    '504',
    'network',
    'econnreset',
    'econnrefused',
    'etimedout',
    'enotfound',
    'socket hang up',
    'fetch failed',
  ],
};

/**
 * Network-focused retry configuration
 */
export const NETWORK_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 5,
  initialDelay: 500,
  retryableErrors: [
    ...DEFAULT_RETRY_CONFIG.retryableErrors,
    'connection refused',
    'dns lookup failed',
    'ssl',
    'tls',
  ],
};

/**
 * Agent/AI retry configuration
 */
export const AGENT_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 2,
  initialDelay: 2000,
  maxDelay: 60000,
  retryableErrors: [
    ...DEFAULT_RETRY_CONFIG.retryableErrors,
    'overloaded',
    'capacity',
    'busy',
  ],
};

/**
 * Check if an error is retryable based on configuration
 */
export function isRetryableError(error: Error, config: Partial<RetryConfig> = {}): boolean {
  const patterns = config.retryableErrors || DEFAULT_RETRY_CONFIG.retryableErrors;
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  return patterns.some(
    (pattern) => message.includes(pattern.toLowerCase()) || name.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay for a given retry attempt
 */
export function calculateDelay(attempt: number, config: Partial<RetryConfig> = {}): number {
  const {
    initialDelay = DEFAULT_RETRY_CONFIG.initialDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    backoffStrategy = DEFAULT_RETRY_CONFIG.backoffStrategy,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
    jitter = DEFAULT_RETRY_CONFIG.jitter,
    maxJitter = DEFAULT_RETRY_CONFIG.maxJitter,
  } = config;

  let delay: number;

  switch (backoffStrategy) {
    case 'exponential':
      delay = initialDelay * Math.pow(backoffMultiplier, attempt);
      break;
    case 'linear':
      delay = initialDelay * (1 + attempt * backoffMultiplier);
      break;
    case 'constant':
    default:
      delay = initialDelay;
      break;
  }

  // Apply max delay cap
  delay = Math.min(delay, maxDelay);

  // Add jitter if enabled
  if (jitter) {
    delay += Math.random() * maxJitter;
  }

  return Math.round(delay);
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async operation with retry logic
 *
 * @param operation - The async operation to execute
 * @param config - Retry configuration (partial, merged with defaults)
 * @returns Promise resolving to the operation result
 * @throws Last error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const mergedConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      // Execute with optional timeout
      if (mergedConfig.attemptTimeout) {
        return await withTimeout(operation(), mergedConfig.attemptTimeout);
      }
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry =
        attempt < mergedConfig.maxRetries && isRetryableError(lastError, mergedConfig);

      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, mergedConfig);

      // Notify callback
      mergedConfig.onRetry?.(lastError, attempt + 1, delay);

      // Wait before next attempt
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit (default: 60000) */
  resetTimeout: number;
  /** Optional callback when circuit opens */
  onOpen?: () => void;
  /** Optional callback when circuit closes */
  onClose?: () => void;
}

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,
};

/**
 * Create a circuit breaker for an operation
 * @deprecated Use `CircuitBreaker` from `@/lib/ai/infrastructure/circuit-breaker` instead,
 * which provides a more complete implementation with state events, registry, and provider-specific configs.
 */
export function createCircuitBreaker<T>(
  operation: () => Promise<T>,
  config: Partial<CircuitBreakerConfig> = {}
): {
  execute: () => Promise<T>;
  getState: () => CircuitBreakerState;
  reset: () => void;
} {
  const mergedConfig: CircuitBreakerConfig = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  const state: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  const execute = async (): Promise<T> => {
    // Check if circuit is open
    if (state.isOpen) {
      const timeSinceFailure = Date.now() - state.lastFailure;
      if (timeSinceFailure < mergedConfig.resetTimeout) {
        throw new Error('Circuit breaker is open');
      }
      // Try to close circuit (half-open state)
      state.isOpen = false;
    }

    try {
      const result = await operation();
      // Success - reset failure count
      if (state.failures > 0) {
        state.failures = 0;
        mergedConfig.onClose?.();
      }
      return result;
    } catch (error) {
      state.failures++;
      state.lastFailure = Date.now();

      if (state.failures >= mergedConfig.failureThreshold) {
        state.isOpen = true;
        mergedConfig.onOpen?.();
      }

      throw error;
    }
  };

  const getState = () => ({ ...state });

  const reset = () => {
    state.failures = 0;
    state.lastFailure = 0;
    state.isOpen = false;
  };

  return { execute, getState, reset };
}

/**
 * Retry decorator for class methods
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return withRetry(() => originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}
