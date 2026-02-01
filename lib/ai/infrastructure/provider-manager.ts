/**
 * Provider Manager - Unified service for provider management
 * 
 * Integrates all provider infrastructure components:
 * - Circuit Breaker for fault tolerance
 * - Load Balancer for request distribution
 * - Quota Manager for usage tracking
 * - Availability Monitor for health checks
 * - Rate Limiter for request throttling
 * - API Key Rotation for key management
 */

import { loggers } from '@/lib/logger';
import {
  circuitBreakerRegistry,
  type CircuitBreakerConfig,
} from './circuit-breaker';

import {
  ProviderLoadBalancer,
  type LoadBalancerConfig,
  type SelectionResult,
  type ProviderMetrics,
} from './load-balancer';
import {
  QuotaManager,
  type QuotaManagerConfig,
  type QuotaStatus,
  calculateRequestCost,
} from './quota-manager';
import {
  AvailabilityMonitor,
  type AvailabilityMonitorConfig,
  type ProviderAvailability,
  type HealthCheckResult,
} from './availability-monitor';
import {
  getRateLimiter,
  type RateLimitResult,
  type RateLimiter,
} from './rate-limit';
import {
  getNextApiKey,
  recordApiKeySuccess,
  recordApiKeyError,
} from './api-key-rotation';
import type { ApiKeyRotationStrategy, ApiKeyUsageStats } from '@/types/provider';

const log = loggers.ai;

export interface ProviderManagerConfig {
  /** Circuit breaker configuration */
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  /** Load balancer configuration */
  loadBalancer?: Partial<LoadBalancerConfig>;
  /** Quota manager configuration */
  quotaManager?: Partial<QuotaManagerConfig>;
  /** Availability monitor configuration */
  availabilityMonitor?: Partial<AvailabilityMonitorConfig>;
  /** Enable automatic health monitoring */
  enableHealthMonitoring?: boolean;
  /** Enable quota enforcement */
  enableQuotaEnforcement?: boolean;
  /** Enable rate limiting */
  enableRateLimiting?: boolean;
  /** Enable circuit breaker */
  enableCircuitBreaker?: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  apiKeys?: string[];
  apiKeyRotationEnabled?: boolean;
  apiKeyRotationStrategy?: ApiKeyRotationStrategy;
  apiKeyUsageStats?: Record<string, ApiKeyUsageStats>;
  currentKeyIndex?: number;
  baseURL?: string;
}

export interface ProviderState {
  providerId: string;
  credentials: ProviderCredentials;
  enabled: boolean;
  availability: ProviderAvailability | null;
  metrics: ProviderMetrics | null;
  quota: QuotaStatus | null;
  rateLimit: RateLimitResult | null;
  circuitState: 'closed' | 'open' | 'half_open';
}

export interface ExecutionContext {
  providerId: string;
  modelId: string;
  apiKey: string;
  baseURL?: string;
  attempt: number;
  startTime: number;
}

export interface SandboxExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  context: ExecutionContext;
  latencyMs: number;
  providerId: string;
  modelId: string;
}

export interface RequestOptions {
  /** Preferred provider (optional) */
  preferredProvider?: string;
  /** Model ID */
  modelId: string;
  /** Estimated input tokens */
  estimatedInputTokens?: number;
  /** Estimated output tokens */
  estimatedOutputTokens?: number;
  /** Session ID for sticky sessions */
  sessionId?: string;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Timeout in ms */
  timeout?: number;
  /** Skip quota check */
  skipQuotaCheck?: boolean;
  /** Skip rate limit check */
  skipRateLimitCheck?: boolean;
}

const DEFAULT_CONFIG: ProviderManagerConfig = {
  enableHealthMonitoring: true,
  enableQuotaEnforcement: true,
  enableRateLimiting: true,
  enableCircuitBreaker: true,
};

/**
 * Unified Provider Manager
 */
export class ProviderManager {
  private config: ProviderManagerConfig;
  private providers: Map<string, ProviderCredentials> = new Map();
  private enabledProviders: Set<string> = new Set();
  private loadBalancer: ProviderLoadBalancer;
  private quotaManager: QuotaManager;
  private availabilityMonitor: AvailabilityMonitor;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private initialized: boolean = false;

  constructor(config?: Partial<ProviderManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadBalancer = new ProviderLoadBalancer(this.config.loadBalancer);
    this.quotaManager = new QuotaManager(this.config.quotaManager);
    this.availabilityMonitor = new AvailabilityMonitor({
      ...this.config.availabilityMonitor,
      autoStart: false,
    });
  }

  /**
   * Initialize the provider manager with providers
   */
  initialize(
    providers: { id: string; credentials: ProviderCredentials; enabled: boolean }[]
  ): void {
    providers.forEach((p) => {
      this.registerProvider(p.id, p.credentials, p.enabled);
    });

    // Initialize load balancer
    this.loadBalancer.initialize(Array.from(this.enabledProviders));

    // Start availability monitoring if enabled
    if (this.config.enableHealthMonitoring) {
      this.availabilityMonitor.start();
    }

    this.initialized = true;
  }

  /**
   * Register a provider
   */
  registerProvider(
    providerId: string,
    credentials: ProviderCredentials,
    enabled: boolean = true
  ): void {
    this.providers.set(providerId, credentials);

    if (enabled) {
      this.enabledProviders.add(providerId);
    } else {
      this.enabledProviders.delete(providerId);
    }

    // Register with availability monitor
    this.availabilityMonitor.registerProvider(providerId, {
      apiKey: credentials.apiKey,
      baseURL: credentials.baseURL,
    });

    // Create rate limiter
    if (!this.rateLimiters.has(providerId)) {
      this.rateLimiters.set(providerId, getRateLimiter(providerId));
    }
  }

  /**
   * Update provider credentials
   */
  updateCredentials(providerId: string, credentials: Partial<ProviderCredentials>): void {
    const current = this.providers.get(providerId);
    if (current) {
      this.providers.set(providerId, { ...current, ...credentials });
    }
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    if (enabled) {
      this.enabledProviders.add(providerId);
    } else {
      this.enabledProviders.delete(providerId);
    }
    this.loadBalancer.initialize(Array.from(this.enabledProviders));
  }

  /**
   * Get the active API key for a provider (handles rotation)
   */
  getActiveApiKey(providerId: string): string | undefined {
    const credentials = this.providers.get(providerId);
    if (!credentials) return undefined;

    // If rotation is not enabled or no multiple keys, use primary key
    if (
      !credentials.apiKeyRotationEnabled ||
      !credentials.apiKeys ||
      credentials.apiKeys.length <= 1
    ) {
      return credentials.apiKey;
    }

    // Return current key from rotation
    const index = credentials.currentKeyIndex || 0;
    return credentials.apiKeys[index] || credentials.apiKey;
  }

  /**
   * Rotate to the next API key
   */
  rotateApiKey(providerId: string): string | undefined {
    const credentials = this.providers.get(providerId);
    if (
      !credentials ||
      !credentials.apiKeyRotationEnabled ||
      !credentials.apiKeys ||
      credentials.apiKeys.length <= 1
    ) {
      return credentials?.apiKey;
    }

    const result = getNextApiKey(
      credentials.apiKeys,
      credentials.apiKeyRotationStrategy || 'round-robin',
      credentials.currentKeyIndex || 0,
      credentials.apiKeyUsageStats || {}
    );

    credentials.currentKeyIndex = result.index;
    this.providers.set(providerId, credentials);

    return result.apiKey;
  }

  /**
   * Select the best provider for a request
   */
  async selectProvider(options: RequestOptions): Promise<SelectionResult | null> {
    // If a preferred provider is specified and available, use it
    if (options.preferredProvider) {
      const canUse = await this.canUseProvider(options.preferredProvider, options);
      if (canUse.allowed) {
        return {
          providerId: options.preferredProvider,
          reason: 'preferred',
          alternatives: this.getAlternativeProviders(options.preferredProvider),
        };
      }
    }

    // Use load balancer to select
    return this.loadBalancer.selectProvider(options.sessionId);
  }

  /**
   * Check if a provider can be used
   */
  async canUseProvider(
    providerId: string,
    options: RequestOptions
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if enabled
    if (!this.enabledProviders.has(providerId)) {
      return { allowed: false, reason: 'Provider is disabled' };
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker) {
      const breaker = circuitBreakerRegistry.get(providerId);
      if (!breaker.canExecute()) {
        return { allowed: false, reason: 'Circuit breaker is open' };
      }
    }

    // Check availability
    if (this.config.enableHealthMonitoring) {
      const availability = this.availabilityMonitor.getAvailability(providerId);
      if (availability?.status === 'unavailable') {
        return { allowed: false, reason: 'Provider is unavailable' };
      }
    }

    // Check quota
    if (this.config.enableQuotaEnforcement && !options.skipQuotaCheck) {
      const quotaCheck = this.quotaManager.canMakeRequest(providerId);
      if (!quotaCheck.allowed) {
        return { allowed: false, reason: quotaCheck.reason };
      }
    }

    // Check rate limit
    if (this.config.enableRateLimiting && !options.skipRateLimitCheck) {
      const limiter = this.rateLimiters.get(providerId);
      if (limiter) {
        const status = await limiter.getStatus(providerId);
        if (!status.success) {
          return {
            allowed: false,
            reason: `Rate limited. Retry after ${status.retryAfter}s`,
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Execute a request with full provider management
   */
  async execute<T>(
    fn: (context: ExecutionContext) => Promise<T>,
    options: RequestOptions
  ): Promise<SandboxExecutionResult<T>> {
    const maxRetries = options.maxRetries || 3;
    let lastError: Error | null = null;
    let attempt = 0;
    const triedProviders = new Set<string>();

    while (attempt < maxRetries) {
      attempt++;

      // Select a provider
      const selection = await this.selectProvider({
        ...options,
        preferredProvider:
          attempt === 1 ? options.preferredProvider : undefined,
      });

      if (!selection) {
        throw new Error('No available providers');
      }

      // Skip if already tried
      if (triedProviders.has(selection.providerId)) {
        this.loadBalancer.setProviderAvailability(selection.providerId, false);
        continue;
      }
      triedProviders.add(selection.providerId);

      const credentials = this.providers.get(selection.providerId);
      if (!credentials) continue;

      const apiKey = this.getActiveApiKey(selection.providerId);
      if (!apiKey && selection.providerId !== 'ollama') {
        continue;
      }

      const context: ExecutionContext = {
        providerId: selection.providerId,
        modelId: options.modelId,
        apiKey: apiKey || '',
        baseURL: credentials.baseURL,
        attempt,
        startTime: Date.now(),
      };

      // Track request start
      this.loadBalancer.recordRequestStart(selection.providerId);

      // Apply rate limiting
      if (this.config.enableRateLimiting) {
        const limiter = this.rateLimiters.get(selection.providerId);
        if (limiter) {
          await limiter.limit(selection.providerId);
        }
      }

      try {
        // Execute with circuit breaker if enabled
        let result: T;
        const startTime = Date.now();

        if (this.config.enableCircuitBreaker) {
          const cbResult = await circuitBreakerRegistry
            .get(selection.providerId, this.config.circuitBreaker)
            .execute(() => fn(context));

          if (!cbResult.success) {
            throw cbResult.error || new Error('Circuit breaker rejected request');
          }
          result = cbResult.data!;
        } else {
          result = await fn(context);
        }

        const latencyMs = Date.now() - startTime;

        // Record success
        this.loadBalancer.recordRequestEnd(selection.providerId, latencyMs, true);
        this.recordApiKeyUsage(selection.providerId, apiKey || '', true);

        // Record quota usage
        if (this.config.enableQuotaEnforcement) {
          const cost = calculateRequestCost(
            selection.providerId,
            options.modelId,
            options.estimatedInputTokens || 0,
            options.estimatedOutputTokens || 0
          );

          this.quotaManager.recordUsage({
            providerId: selection.providerId,
            modelId: options.modelId,
            inputTokens: options.estimatedInputTokens || 0,
            outputTokens: options.estimatedOutputTokens || 0,
            cost,
            success: true,
            latencyMs,
          });
        }

        return {
          success: true,
          data: result,
          context,
          latencyMs,
          providerId: selection.providerId,
          modelId: options.modelId,
        };
      } catch (error) {
        const latencyMs = Date.now() - context.startTime;
        lastError = error instanceof Error ? error : new Error(String(error));

        // Record failure
        this.loadBalancer.recordRequestEnd(selection.providerId, latencyMs, false);
        this.loadBalancer.setProviderHealth(selection.providerId, false);
        this.recordApiKeyUsage(selection.providerId, apiKey || '', false, lastError.message);

        // Record quota usage (even for failures)
        if (this.config.enableQuotaEnforcement) {
          this.quotaManager.recordUsage({
            providerId: selection.providerId,
            modelId: options.modelId,
            inputTokens: 0,
            outputTokens: 0,
            cost: 0,
            success: false,
            latencyMs,
          });
        }

        log.warn(`ProviderManager provider ${selection.providerId} failed`, { providerId: selection.providerId, attempt, error: lastError.message });
      }
    }

    return {
      success: false,
      error: lastError || new Error('All providers failed'),
      context: {
        providerId: '',
        modelId: options.modelId,
        apiKey: '',
        attempt,
        startTime: Date.now(),
      },
      latencyMs: 0,
      providerId: '',
      modelId: options.modelId,
    };
  }

  /**
   * Record API key usage
   */
  private recordApiKeyUsage(
    providerId: string,
    apiKey: string,
    success: boolean,
    errorMessage?: string
  ): void {
    const credentials = this.providers.get(providerId);
    if (!credentials) return;

    const currentStats = credentials.apiKeyUsageStats?.[apiKey];
    const newStats = success
      ? recordApiKeySuccess(currentStats)
      : recordApiKeyError(currentStats, errorMessage);

    credentials.apiKeyUsageStats = {
      ...(credentials.apiKeyUsageStats || {}),
      [apiKey]: newStats,
    };
    this.providers.set(providerId, credentials);
  }

  /**
   * Get alternative providers
   */
  private getAlternativeProviders(excludeId: string): string[] {
    return Array.from(this.enabledProviders).filter((id) => id !== excludeId);
  }

  /**
   * Get provider state
   */
  getProviderState(providerId: string): ProviderState | null {
    const credentials = this.providers.get(providerId);
    if (!credentials) return null;

    return {
      providerId,
      credentials,
      enabled: this.enabledProviders.has(providerId),
      availability: this.availabilityMonitor.getAvailability(providerId) || null,
      metrics: this.loadBalancer.getProviderMetrics(providerId) || null,
      quota: this.quotaManager.getQuotaStatus(providerId),
      rateLimit: null, // Would need async call
      circuitState: circuitBreakerRegistry.getState(providerId) || 'closed',
    };
  }

  /**
   * Get all provider states
   */
  getAllProviderStates(): Map<string, ProviderState> {
    const states = new Map<string, ProviderState>();
    this.providers.forEach((_, providerId) => {
      const state = this.getProviderState(providerId);
      if (state) {
        states.set(providerId, state);
      }
    });
    return states;
  }

  /**
   * Get enabled provider IDs
   */
  getEnabledProviders(): string[] {
    return Array.from(this.enabledProviders);
  }

  /**
   * Force health check for a provider
   */
  async checkProviderHealth(providerId: string): Promise<HealthCheckResult> {
    return this.availabilityMonitor.checkProvider(providerId);
  }

  /**
   * Force health check for all providers
   */
  async checkAllProvidersHealth(): Promise<Map<string, HealthCheckResult>> {
    return this.availabilityMonitor.checkAllProviders();
  }

  /**
   * Reset circuit breaker for a provider
   */
  resetCircuitBreaker(providerId: string): void {
    circuitBreakerRegistry.reset(providerId);
  }

  /**
   * Get quota status for a provider
   */
  getQuotaStatus(providerId: string): QuotaStatus {
    return this.quotaManager.getQuotaStatus(providerId);
  }

  /**
   * Set quota limits for a provider
   */
  setQuotaLimits(providerId: string, limits: QuotaStatus['limits']): void {
    this.quotaManager.setLimits(providerId, limits);
  }

  /**
   * Subscribe to availability events
   */
  onAvailabilityChange(
    listener: (event: { providerId: string; status: string }) => void
  ): () => void {
    return this.availabilityMonitor.subscribe((event) => {
      listener({
        providerId: event.providerId,
        status: event.currentStatus,
      });
    });
  }

  /**
   * Subscribe to quota alerts
   */
  onQuotaAlert(
    listener: (alert: { providerId: string; type: string; message: string }) => void
  ): () => void {
    return this.quotaManager.onAlert((alert, providerId) => {
      listener({
        providerId,
        type: alert.type,
        message: alert.message,
      });
    });
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalProviders: number;
    enabledProviders: number;
    availableProviders: number;
    openCircuits: string[];
    quotaAlerts: number;
  } {
    const availabilitySummary = this.availabilityMonitor.getSummary();
    const openCircuits = circuitBreakerRegistry.getOpenCircuits();

    let quotaAlerts = 0;
    this.providers.forEach((_, providerId) => {
      const status = this.quotaManager.getQuotaStatus(providerId);
      quotaAlerts += status.alerts.length;
    });

    return {
      totalProviders: this.providers.size,
      enabledProviders: this.enabledProviders.size,
      availableProviders: availabilitySummary.available + availabilitySummary.degraded,
      openCircuits,
      quotaAlerts,
    };
  }

  /**
   * Shutdown the provider manager
   */
  shutdown(): void {
    this.availabilityMonitor.stop();
    this.initialized = false;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/** Global provider manager singleton */
let globalProviderManager: ProviderManager | null = null;

/**
 * Get the global provider manager
 */
export function getProviderManager(config?: Partial<ProviderManagerConfig>): ProviderManager {
  if (!globalProviderManager) {
    globalProviderManager = new ProviderManager(config);
  }
  return globalProviderManager;
}

/**
 * Initialize the global provider manager
 */
export function initializeProviderManager(
  providers: { id: string; credentials: ProviderCredentials; enabled: boolean }[],
  config?: Partial<ProviderManagerConfig>
): ProviderManager {
  globalProviderManager = new ProviderManager(config);
  globalProviderManager.initialize(providers);
  return globalProviderManager;
}

/**
 * Execute a request with the global provider manager
 */
export async function executeWithProviderManager<T>(
  fn: (context: ExecutionContext) => Promise<T>,
  options: RequestOptions
): Promise<SandboxExecutionResult<T>> {
  return getProviderManager().execute(fn, options);
}
