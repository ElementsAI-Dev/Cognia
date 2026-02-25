/**
 * Search Provider Manager - Unified management for search providers
 * 
 * Extends the core provider management infrastructure for search providers:
 * - Load balancing across multiple search providers
 * - Failover and fallback handling
 * - Quota tracking per provider
 * - Health monitoring
 * - Cost optimization
 */

import type {
  SearchProviderType,
  SearchProviderSettings,
  SearchOptions,
  SearchResponse,
} from '@/types/search';
import { getEnabledProviders, isProviderConfigured, SEARCH_PROVIDERS } from '@/types/search';
import { loggers } from '@/lib/logger';

const log = loggers.network;
import {
  circuitBreakerRegistry,
  type CircuitBreakerConfig,
} from '@/lib/ai/infrastructure/circuit-breaker';
import {
  QuotaManager,
  type QuotaLimits,
  type QuotaStatus,
} from '@/lib/ai/infrastructure/quota-manager';
import { search, testProviderConnection } from './search-service';

export type SearchLoadBalancingStrategy = 'priority' | 'round-robin' | 'cost-optimized' | 'latency-based';

export interface SearchProviderMetrics {
  providerId: SearchProviderType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  lastLatency: number;
  lastRequestTime: number;
  totalCost: number;
  isHealthy: boolean;
  isAvailable: boolean;
}

export interface SearchProviderManagerConfig {
  /** Load balancing strategy */
  strategy: SearchLoadBalancingStrategy;
  /** Enable automatic failover */
  enableFailover: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Enable quota tracking */
  enableQuotaTracking: boolean;
  /** Enable circuit breaker */
  enableCircuitBreaker: boolean;
  /** Health check interval in ms */
  healthCheckInterval: number;
  /** Circuit breaker configuration */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
}

export interface SearchSandboxExecutionResult {
  response: SearchResponse;
  providerId: SearchProviderType;
  latencyMs: number;
  cost: number;
  attempts: number;
}

const DEFAULT_CONFIG: SearchProviderManagerConfig = {
  strategy: 'priority',
  enableFailover: true,
  maxRetries: 3,
  enableQuotaTracking: true,
  enableCircuitBreaker: true,
  healthCheckInterval: 300000, // 5 minutes
};

const SEARCH_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeout: 60000,
  successThreshold: 2,
  failureWindow: 120000,
  requestTimeout: 30000,
};

/**
 * Search Provider Manager
 */
export class SearchProviderManager {
  private config: SearchProviderManagerConfig;
  private providerSettings: Map<SearchProviderType, SearchProviderSettings> = new Map();
  private metrics: Map<SearchProviderType, SearchProviderMetrics> = new Map();
  private quotaManager: QuotaManager;
  private roundRobinIndex: number = 0;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<SearchProviderManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.quotaManager = new QuotaManager({
      enabled: this.config.enableQuotaTracking,
      storageKeyPrefix: 'cognia_search_quota_',
    });
  }

  /**
   * Initialize with provider settings
   */
  initialize(settings: Record<SearchProviderType, SearchProviderSettings>): void {
    Object.entries(settings).forEach(([id, providerSettings]) => {
      const providerId = id as SearchProviderType;
      this.providerSettings.set(providerId, providerSettings);
      
      if (!this.metrics.has(providerId)) {
        this.metrics.set(providerId, this.getDefaultMetrics(providerId));
      }

      // Set up quota limits based on provider pricing
      if (this.config.enableQuotaTracking) {
        const providerConfig = SEARCH_PROVIDERS[providerId];
        if (providerConfig?.pricing) {
          this.quotaManager.setLimits(`search:${providerId}`, {
            maxCostPerMonth: 50, // Default $50/month limit
          });
        }
      }
    });

    // Start health check interval
    if (this.config.healthCheckInterval > 0) {
      this.startHealthChecks();
    }
  }

  /**
   * Get default metrics for a provider
   */
  private getDefaultMetrics(providerId: SearchProviderType): SearchProviderMetrics {
    return {
      providerId,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      lastLatency: 0,
      lastRequestTime: 0,
      totalCost: 0,
      isHealthy: true,
      isAvailable: true,
    };
  }

  /**
   * Get enabled providers sorted by strategy
   */
  private getEnabledProvidersSorted(): SearchProviderSettings[] {
    const settings: Partial<Record<SearchProviderType, SearchProviderSettings>> = {};
    this.providerSettings.forEach((value, key) => {
      settings[key] = value;
    });

    const enabled = getEnabledProviders(settings);

    switch (this.config.strategy) {
      case 'priority':
        return enabled.sort((a, b) => a.priority - b.priority);

      case 'round-robin':
        return enabled;

      case 'cost-optimized':
        return enabled.sort((a, b) => {
          const costA = SEARCH_PROVIDERS[a.providerId]?.pricing?.pricePerSearch || 0;
          const costB = SEARCH_PROVIDERS[b.providerId]?.pricing?.pricePerSearch || 0;
          return costA - costB;
        });

      case 'latency-based':
        return enabled.sort((a, b) => {
          const metricsA = this.metrics.get(a.providerId);
          const metricsB = this.metrics.get(b.providerId);
          const latencyA = metricsA?.averageLatency || Infinity;
          const latencyB = metricsB?.averageLatency || Infinity;
          return latencyA - latencyB;
        });

      default:
        return enabled;
    }
  }

  /**
   * Select the next provider for round-robin
   */
  private selectRoundRobin(providers: SearchProviderSettings[]): SearchProviderSettings {
    this.roundRobinIndex = (this.roundRobinIndex + 1) % providers.length;
    return providers[this.roundRobinIndex];
  }

  /**
   * Check if a provider is available
   */
  private isProviderAvailable(providerId: SearchProviderType): boolean {
    const metrics = this.metrics.get(providerId);
    if (!metrics?.isAvailable || !metrics?.isHealthy) {
      return false;
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker) {
      const breaker = circuitBreakerRegistry.get(
        `search:${providerId}`,
        this.config.circuitBreakerConfig || SEARCH_CIRCUIT_CONFIG
      );
      if (!breaker.canExecute()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a search with provider management
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchSandboxExecutionResult> {
    const enabledProviders = this.getEnabledProvidersSorted();

    if (enabledProviders.length === 0) {
      throw new Error('No search providers are enabled');
    }

    let lastError: Error | null = null;
    let attempts = 0;
    const triedProviders = new Set<SearchProviderType>();

    while (attempts < this.config.maxRetries) {
      attempts++;

      // Select provider
      let provider: SearchProviderSettings | undefined;

      if (this.config.strategy === 'round-robin') {
        const available = enabledProviders.filter(
          (p) => !triedProviders.has(p.providerId) && this.isProviderAvailable(p.providerId)
        );
        if (available.length > 0) {
          provider = this.selectRoundRobin(available);
        }
      } else {
        provider = enabledProviders.find(
          (p) => !triedProviders.has(p.providerId) && this.isProviderAvailable(p.providerId)
        );
      }

      if (!provider) {
        break;
      }

      triedProviders.add(provider.providerId);
      const startTime = Date.now();

      try {
        const result = await this.executeWithProvider(provider, query, options);
        const latencyMs = Date.now() - startTime;
        const cost = this.calculateCost(provider.providerId);

        // Record success
        this.recordSuccess(provider.providerId, latencyMs, cost);

        return {
          response: result,
          providerId: provider.providerId,
          latencyMs,
          cost,
          attempts,
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        lastError = error instanceof Error ? error : new Error(String(error));

        // Record failure
        this.recordFailure(provider.providerId, latencyMs, lastError);

        log.warn(
          `SearchProviderManager: Provider ${provider.providerId} failed (attempt ${attempts}): ${lastError.message}`
        );

        if (!this.config.enableFailover) {
          break;
        }
      }
    }

    throw lastError || new Error('All search providers failed');
  }

  /**
   * Execute search with a specific provider
   */
  private async executeWithProvider(
    provider: SearchProviderSettings,
    query: string,
    options: SearchOptions
  ): Promise<SearchResponse> {
    const execute = () =>
      search(query, {
        ...options,
        provider: provider.providerId,
        providerSettings: this.getProviderSettingsRecord(),
        fallbackEnabled: false,
      });

    if (this.config.enableCircuitBreaker) {
      const breaker = circuitBreakerRegistry.get(
        `search:${provider.providerId}`,
        this.config.circuitBreakerConfig || SEARCH_CIRCUIT_CONFIG
      );

      const result = await breaker.execute(execute);

      if (!result.success) {
        throw result.error || new Error('Circuit breaker rejected request');
      }

      return result.data!;
    }

    return execute();
  }

  /**
   * Get provider settings as a record
   */
  private getProviderSettingsRecord(): Record<SearchProviderType, SearchProviderSettings> {
    const record: Partial<Record<SearchProviderType, SearchProviderSettings>> = {};
    this.providerSettings.forEach((value, key) => {
      record[key] = value;
    });
    return record as Record<SearchProviderType, SearchProviderSettings>;
  }

  /**
   * Calculate cost for a search
   */
  private calculateCost(providerId: SearchProviderType): number {
    const config = SEARCH_PROVIDERS[providerId];
    return config?.pricing?.pricePerSearch || 0;
  }

  /**
   * Record successful search
   */
  private recordSuccess(
    providerId: SearchProviderType,
    latencyMs: number,
    cost: number
  ): void {
    const metrics = this.metrics.get(providerId) || this.getDefaultMetrics(providerId);

    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.lastLatency = latencyMs;
    metrics.lastRequestTime = Date.now();
    metrics.totalCost += cost;
    metrics.isHealthy = true;

    // Update average latency (exponential moving average)
    if (metrics.averageLatency === 0) {
      metrics.averageLatency = latencyMs;
    } else {
      metrics.averageLatency = metrics.averageLatency * 0.8 + latencyMs * 0.2;
    }

    this.metrics.set(providerId, metrics);

    // Record quota usage
    if (this.config.enableQuotaTracking) {
      this.quotaManager.recordUsage({
        providerId: `search:${providerId}`,
        modelId: 'search',
        inputTokens: 0,
        outputTokens: 0,
        cost,
        success: true,
        latencyMs,
      });
    }

    // Record circuit breaker success
    if (this.config.enableCircuitBreaker) {
      circuitBreakerRegistry.get(`search:${providerId}`).recordSuccess();
    }
  }

  /**
   * Record failed search
   */
  private recordFailure(
    providerId: SearchProviderType,
    latencyMs: number,
    error: Error
  ): void {
    const metrics = this.metrics.get(providerId) || this.getDefaultMetrics(providerId);

    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.lastLatency = latencyMs;
    metrics.lastRequestTime = Date.now();

    // Mark as unhealthy if too many failures
    const failureRate = metrics.failedRequests / metrics.totalRequests;
    if (failureRate > 0.5 && metrics.totalRequests >= 5) {
      metrics.isHealthy = false;
    }

    this.metrics.set(providerId, metrics);

    // Record quota usage (even for failures)
    if (this.config.enableQuotaTracking) {
      this.quotaManager.recordUsage({
        providerId: `search:${providerId}`,
        modelId: 'search',
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        success: false,
        latencyMs,
      });
    }

    // Record circuit breaker failure
    if (this.config.enableCircuitBreaker) {
      circuitBreakerRegistry.get(`search:${providerId}`).recordFailure(error);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkAllProvidersHealth();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check health of all providers
   */
  async checkAllProvidersHealth(): Promise<Map<SearchProviderType, boolean>> {
    const results = new Map<SearchProviderType, boolean>();

    const promises = Array.from(this.providerSettings.entries()).map(
      async ([providerId, settings]) => {
        if (!settings.enabled || !isProviderConfigured(providerId, settings)) {
          results.set(providerId, false);
          return;
        }

        try {
          const isHealthy = await testProviderConnection(providerId, settings.apiKey, settings);
          results.set(providerId, isHealthy);

          const metrics = this.metrics.get(providerId);
          if (metrics) {
            metrics.isHealthy = isHealthy;
            metrics.isAvailable = isHealthy;
            this.metrics.set(providerId, metrics);
          }
        } catch {
          results.set(providerId, false);
        }
      }
    );

    await Promise.all(promises);
    return results;
  }

  /**
   * Get provider metrics
   */
  getMetrics(providerId: SearchProviderType): SearchProviderMetrics | undefined {
    return this.metrics.get(providerId);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<SearchProviderType, SearchProviderMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get quota status for a provider
   */
  getQuotaStatus(providerId: SearchProviderType): QuotaStatus {
    return this.quotaManager.getQuotaStatus(`search:${providerId}`);
  }

  /**
   * Set quota limits for a provider
   */
  setQuotaLimits(providerId: SearchProviderType, limits: QuotaLimits): void {
    this.quotaManager.setLimits(`search:${providerId}`, limits);
  }

  /**
   * Get total cost across all providers
   */
  getTotalCost(): number {
    let total = 0;
    this.metrics.forEach((m) => {
      total += m.totalCost;
    });
    return total;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalProviders: number;
    enabledProviders: number;
    healthyProviders: number;
    totalRequests: number;
    successRate: number;
    totalCost: number;
    averageLatency: number;
  } {
    let totalProviders = 0;
    let enabledProviders = 0;
    let healthyProviders = 0;
    let totalRequests = 0;
    let successfulRequests = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    this.providerSettings.forEach((settings, providerId) => {
      totalProviders++;
      if (settings.enabled && settings.apiKey) {
        enabledProviders++;
      }

      const metrics = this.metrics.get(providerId);
      if (metrics) {
        if (metrics.isHealthy) {
          healthyProviders++;
        }
        totalRequests += metrics.totalRequests;
        successfulRequests += metrics.successfulRequests;
        totalCost += metrics.totalCost;
        if (metrics.averageLatency > 0) {
          totalLatency += metrics.averageLatency;
          latencyCount++;
        }
      }
    });

    return {
      totalProviders,
      enabledProviders,
      healthyProviders,
      totalRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 1,
      totalCost,
      averageLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
    this.providerSettings.forEach((_, providerId) => {
      this.metrics.set(providerId, this.getDefaultMetrics(providerId));
    });
  }

  /**
   * Reset circuit breakers
   */
  resetCircuitBreakers(): void {
    this.providerSettings.forEach((_, providerId) => {
      circuitBreakerRegistry.reset(`search:${providerId}`);
    });
  }

  /**
   * Shutdown the manager
   */
  shutdown(): void {
    this.stopHealthChecks();
  }
}

/** Global search provider manager singleton */
let globalSearchManager: SearchProviderManager | null = null;

/**
 * Get the global search provider manager
 */
export function getSearchProviderManager(
  config?: Partial<SearchProviderManagerConfig>
): SearchProviderManager {
  if (!globalSearchManager) {
    globalSearchManager = new SearchProviderManager(config);
  }
  return globalSearchManager;
}

/**
 * Initialize the global search provider manager
 */
export function initializeSearchProviderManager(
  settings: Record<SearchProviderType, SearchProviderSettings>,
  config?: Partial<SearchProviderManagerConfig>
): SearchProviderManager {
  globalSearchManager = new SearchProviderManager(config);
  globalSearchManager.initialize(settings);
  return globalSearchManager;
}

/**
 * Execute a search with the global manager
 */
export async function searchWithManager(
  query: string,
  options?: SearchOptions
): Promise<SearchSandboxExecutionResult> {
  return getSearchProviderManager().search(query, options);
}
