/**
 * Circuit Breaker - Fault tolerance pattern for API calls
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * when a provider is experiencing issues. States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if provider has recovered
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close an open circuit */
  resetTimeout: number;
  /** Number of successful requests required to close a half-open circuit */
  successThreshold: number;
  /** Time window in ms for counting failures */
  failureWindow: number;
  /** Optional: Timeout for each request in ms */
  requestTimeout?: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
  consecutiveSuccesses: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  circuitState: CircuitState;
  rejected: boolean;
}

/** Default configuration for circuit breakers */
export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  successThreshold: 3,
  failureWindow: 60000, // 1 minute
  requestTimeout: 30000, // 30 seconds
};

/** Provider-specific circuit breaker configurations */
export const PROVIDER_CIRCUIT_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  openai: { failureThreshold: 5, resetTimeout: 30000 },
  anthropic: { failureThreshold: 5, resetTimeout: 30000 },
  google: { failureThreshold: 5, resetTimeout: 30000 },
  deepseek: { failureThreshold: 3, resetTimeout: 60000 }, // More conservative
  groq: { failureThreshold: 3, resetTimeout: 30000 },
  mistral: { failureThreshold: 5, resetTimeout: 30000 },
  ollama: { failureThreshold: 10, resetTimeout: 10000 }, // Local, faster recovery
  openrouter: { failureThreshold: 5, resetTimeout: 30000 },
};

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number[] = [];
  private consecutiveSuccesses: number = 0;
  private lastStateChange: number = Date.now();
  private stats: CircuitBreakerStats;
  private config: CircuitBreakerConfig;
  private providerId: string;

  constructor(providerId: string, config?: Partial<CircuitBreakerConfig>) {
    this.providerId = providerId;
    this.config = {
      ...DEFAULT_CIRCUIT_CONFIG,
      ...(PROVIDER_CIRCUIT_CONFIGS[providerId] || {}),
      ...config,
    };
    this.stats = this.getInitialStats();
  }

  private getInitialStats(): CircuitBreakerStats {
    return {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      lastStateChange: Date.now(),
      totalRequests: 0,
      totalFailures: 0,
      consecutiveSuccesses: 0,
    };
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitBreakerStats {
    this.updateState();
    return {
      ...this.stats,
      state: this.state,
      failures: this.getRecentFailures().length,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }

  /**
   * Check if circuit allows requests
   */
  canExecute(): boolean {
    this.updateState();
    return this.state !== 'open';
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    this.updateState();
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === 'open') {
      return {
        success: false,
        error: new Error(`Circuit breaker is open for provider: ${this.providerId}`),
        circuitState: this.state,
        rejected: true,
      };
    }

    try {
      // Execute with optional timeout
      const result = this.config.requestTimeout
        ? await this.withTimeout(fn(), this.config.requestTimeout)
        : await fn();

      this.recordSuccess();
      return {
        success: true,
        data: result,
        circuitState: this.state,
        rejected: false,
      };
    } catch (error) {
      this.recordFailure(error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        circuitState: this.state,
        rejected: false,
      };
    }
  }

  /**
   * Wrap a promise with a timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.stats.successes++;
    this.stats.lastSuccess = Date.now();
    this.consecutiveSuccesses++;

    if (this.state === 'half_open') {
      if (this.consecutiveSuccesses >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: Error): void {
    const now = Date.now();
    this.failures.push(now);
    this.stats.totalFailures++;
    this.stats.lastFailure = now;
    this.consecutiveSuccesses = 0;

    // Clean up old failures outside the window
    this.cleanupFailures();

    if (this.state === 'half_open') {
      // Any failure in half-open state reopens the circuit
      this.transitionTo('open');
    } else if (this.state === 'closed') {
      // Check if we've exceeded the failure threshold
      if (this.getRecentFailures().length >= this.config.failureThreshold) {
        this.transitionTo('open');
      }
    }

    // Log the failure for debugging
    if (error) {
      console.warn(`[CircuitBreaker:${this.providerId}] Failure recorded:`, error.message);
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.transitionTo('closed');
    this.stats = this.getInitialStats();
  }

  /**
   * Force the circuit to open
   */
  forceOpen(): void {
    this.transitionTo('open');
  }

  /**
   * Force the circuit to close
   */
  forceClose(): void {
    this.failures = [];
    this.consecutiveSuccesses = 0;
    this.transitionTo('closed');
  }

  /**
   * Update state based on time (check if open circuit should transition to half-open)
   */
  private updateState(): void {
    if (this.state === 'open') {
      const timeSinceOpen = Date.now() - this.lastStateChange;
      if (timeSinceOpen >= this.config.resetTimeout) {
        this.transitionTo('half_open');
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(
        `[CircuitBreaker:${this.providerId}] State transition: ${this.state} -> ${newState}`
      );
      this.state = newState;
      this.lastStateChange = Date.now();
      this.stats.lastStateChange = this.lastStateChange;

      if (newState === 'closed') {
        this.failures = [];
        this.consecutiveSuccesses = 0;
      } else if (newState === 'half_open') {
        this.consecutiveSuccesses = 0;
      }
    }
  }

  /**
   * Get failures within the failure window
   */
  private getRecentFailures(): number[] {
    const now = Date.now();
    return this.failures.filter((f) => now - f < this.config.failureWindow);
  }

  /**
   * Clean up old failures
   */
  private cleanupFailures(): void {
    this.failures = this.getRecentFailures();
  }
}

/**
 * Circuit Breaker Registry - manages circuit breakers for all providers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create a circuit breaker for a provider
   */
  get(providerId: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(providerId);
    if (!breaker) {
      breaker = new CircuitBreaker(providerId, config);
      this.breakers.set(providerId, breaker);
    }
    return breaker;
  }

  /**
   * Check if a provider's circuit allows requests
   */
  canExecute(providerId: string): boolean {
    const breaker = this.breakers.get(providerId);
    return breaker ? breaker.canExecute() : true;
  }

  /**
   * Get circuit state for a provider
   */
  getState(providerId: string): CircuitState | undefined {
    return this.breakers.get(providerId)?.getState();
  }

  /**
   * Get stats for all providers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, providerId) => {
      stats[providerId] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }

  /**
   * Reset a specific provider's circuit breaker
   */
  reset(providerId: string): void {
    this.breakers.get(providerId)?.reset();
  }

  /**
   * Get all provider IDs with open circuits
   */
  getOpenCircuits(): string[] {
    const open: string[] = [];
    this.breakers.forEach((breaker, providerId) => {
      if (breaker.getState() === 'open') {
        open.push(providerId);
      }
    });
    return open;
  }

  /**
   * Remove a circuit breaker
   */
  remove(providerId: string): void {
    this.breakers.delete(providerId);
  }
}

/** Global circuit breaker registry singleton */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

/**
 * Execute a function with circuit breaker protection for a provider
 */
export async function withCircuitBreaker<T>(
  providerId: string,
  fn: () => Promise<T>,
  config?: Partial<CircuitBreakerConfig>
): Promise<CircuitBreakerResult<T>> {
  const breaker = circuitBreakerRegistry.get(providerId, config);
  return breaker.execute(fn);
}

/**
 * Check if a provider is available (circuit not open)
 */
export function isProviderAvailable(providerId: string): boolean {
  return circuitBreakerRegistry.canExecute(providerId);
}

/**
 * Get the circuit state for a provider
 */
export function getCircuitState(providerId: string): CircuitState {
  return circuitBreakerRegistry.getState(providerId) || 'closed';
}

/**
 * Record a provider failure (for manual tracking)
 */
export function recordProviderFailure(providerId: string, error?: Error): void {
  const breaker = circuitBreakerRegistry.get(providerId);
  breaker.recordFailure(error);
}

/**
 * Record a provider success (for manual tracking)
 */
export function recordProviderSuccess(providerId: string): void {
  const breaker = circuitBreakerRegistry.get(providerId);
  breaker.recordSuccess();
}
