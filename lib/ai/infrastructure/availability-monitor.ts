/**
 * Availability Monitor - Continuous health monitoring for providers
 * 
 * Provides:
 * - Periodic health checks for all configured providers
 * - Real-time availability status
 * - Latency tracking and trending
 * - Event-based notifications for status changes
 */

import { testProviderConnection } from './api-test';
import { circuitBreakerRegistry, type CircuitState } from './circuit-breaker';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export type AvailabilityStatus = 'available' | 'degraded' | 'unavailable' | 'unknown';

export interface ProviderAvailability {
  providerId: string;
  status: AvailabilityStatus;
  lastCheck: number;
  lastSuccess: number | null;
  latencyMs: number | null;
  errorMessage: string | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  uptimePercentage: number;
  circuitState: CircuitState;
}

export interface HealthCheckResult {
  providerId: string;
  success: boolean;
  latencyMs: number;
  message: string;
  timestamp: number;
}

export interface AvailabilityMonitorConfig {
  /** Health check interval in ms (default: 60000 = 1 minute) */
  checkInterval: number;
  /** Timeout for health checks in ms (default: 10000 = 10 seconds) */
  checkTimeout: number;
  /** Number of consecutive failures before marking unavailable */
  failureThreshold: number;
  /** Number of consecutive successes before marking available again */
  recoveryThreshold: number;
  /** Maximum latency to consider provider healthy (ms) */
  maxHealthyLatency: number;
  /** Enable automatic health checks */
  autoStart: boolean;
  /** Provider credentials for health checks */
  providerCredentials: Map<string, { apiKey?: string; baseURL?: string }>;
}

export type AvailabilityEventType = 'status_changed' | 'health_check' | 'error';

export interface AvailabilityEvent {
  type: AvailabilityEventType;
  providerId: string;
  previousStatus?: AvailabilityStatus;
  currentStatus: AvailabilityStatus;
  timestamp: number;
  details?: string;
}

const DEFAULT_CONFIG: AvailabilityMonitorConfig = {
  checkInterval: 60000, // 1 minute
  checkTimeout: 10000, // 10 seconds
  failureThreshold: 3,
  recoveryThreshold: 2,
  maxHealthyLatency: 5000,
  autoStart: false,
  providerCredentials: new Map(),
};

/**
 * Availability Monitor for tracking provider health
 */
export class AvailabilityMonitor {
  private config: AvailabilityMonitorConfig;
  private availability: Map<string, ProviderAvailability> = new Map();
  private checkHistory: Map<string, HealthCheckResult[]> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private eventListeners: ((event: AvailabilityEvent) => void)[] = [];
  private isRunning: boolean = false;

  constructor(config?: Partial<AvailabilityMonitorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      providerCredentials: config?.providerCredentials || new Map(),
    };

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start the availability monitor
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkAllProviders();
    }, this.config.checkInterval);

    // Perform initial check
    this.checkAllProviders();
  }

  /**
   * Stop the availability monitor
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Check if monitor is running
   */
  isMonitorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Register a provider for monitoring
   */
  registerProvider(
    providerId: string,
    credentials?: { apiKey?: string; baseURL?: string }
  ): void {
    if (credentials) {
      this.config.providerCredentials.set(providerId, credentials);
    }

    if (!this.availability.has(providerId)) {
      this.availability.set(providerId, this.getDefaultAvailability(providerId));
    }
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerId: string): void {
    this.availability.delete(providerId);
    this.checkHistory.delete(providerId);
    this.config.providerCredentials.delete(providerId);
  }

  /**
   * Get default availability state
   */
  private getDefaultAvailability(providerId: string): ProviderAvailability {
    return {
      providerId,
      status: 'unknown',
      lastCheck: 0,
      lastSuccess: null,
      latencyMs: null,
      errorMessage: null,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      uptimePercentage: 100,
      circuitState: 'closed',
    };
  }

  /**
   * Check all registered providers
   */
  async checkAllProviders(): Promise<Map<string, HealthCheckResult>> {
    const results = new Map<string, HealthCheckResult>();
    const providers = Array.from(this.availability.keys());

    await Promise.all(
      providers.map(async (providerId) => {
        const result = await this.checkProvider(providerId);
        results.set(providerId, result);
      })
    );

    return results;
  }

  /**
   * Check a specific provider
   */
  async checkProvider(providerId: string): Promise<HealthCheckResult> {
    const credentials = this.config.providerCredentials.get(providerId);
    const startTime = Date.now();

    let result: HealthCheckResult;

    try {
      // Perform the health check with timeout
      const testResult = await this.withTimeout(
        testProviderConnection(
          providerId,
          credentials?.apiKey || '',
          credentials?.baseURL
        ),
        this.config.checkTimeout
      );

      result = {
        providerId,
        success: testResult.success,
        latencyMs: testResult.latency_ms || (Date.now() - startTime),
        message: testResult.message,
        timestamp: Date.now(),
      };
    } catch (error) {
      result = {
        providerId,
        success: false,
        latencyMs: Date.now() - startTime,
        message: error instanceof Error ? error.message : 'Health check failed',
        timestamp: Date.now(),
      };
    }

    // Update availability state
    this.updateAvailability(providerId, result);

    // Store in history
    this.addToHistory(providerId, result);

    return result;
  }

  /**
   * Update provider availability based on check result
   */
  private updateAvailability(providerId: string, result: HealthCheckResult): void {
    const current = this.availability.get(providerId) || this.getDefaultAvailability(providerId);
    const previousStatus = current.status;

    // Update metrics
    const updated: ProviderAvailability = {
      ...current,
      lastCheck: result.timestamp,
      latencyMs: result.latencyMs,
      circuitState: circuitBreakerRegistry.getState(providerId) || 'closed',
    };

    if (result.success) {
      updated.lastSuccess = result.timestamp;
      updated.consecutiveSuccesses++;
      updated.consecutiveFailures = 0;
      updated.errorMessage = null;

      // Determine status
      if (updated.consecutiveSuccesses >= this.config.recoveryThreshold) {
        if (result.latencyMs > this.config.maxHealthyLatency) {
          updated.status = 'degraded';
        } else {
          updated.status = 'available';
        }
      } else if (previousStatus === 'unavailable') {
        updated.status = 'degraded'; // Recovering
      }
    } else {
      updated.consecutiveFailures++;
      updated.consecutiveSuccesses = 0;
      updated.errorMessage = result.message;

      // Determine status
      if (updated.consecutiveFailures >= this.config.failureThreshold) {
        updated.status = 'unavailable';
      } else if (previousStatus === 'available') {
        updated.status = 'degraded';
      }
    }

    // Calculate uptime percentage
    updated.uptimePercentage = this.calculateUptimePercentage(providerId);

    this.availability.set(providerId, updated);

    // Emit event if status changed
    if (previousStatus !== updated.status) {
      this.emitEvent({
        type: 'status_changed',
        providerId,
        previousStatus,
        currentStatus: updated.status,
        timestamp: result.timestamp,
        details: result.message,
      });
    }

    // Always emit health check event
    this.emitEvent({
      type: 'health_check',
      providerId,
      currentStatus: updated.status,
      timestamp: result.timestamp,
      details: result.message,
    });
  }

  /**
   * Add check result to history
   */
  private addToHistory(providerId: string, result: HealthCheckResult): void {
    const history = this.checkHistory.get(providerId) || [];
    history.push(result);

    // Keep last 100 checks
    if (history.length > 100) {
      history.shift();
    }

    this.checkHistory.set(providerId, history);
  }

  /**
   * Calculate uptime percentage from history
   */
  private calculateUptimePercentage(providerId: string): number {
    const history = this.checkHistory.get(providerId) || [];
    if (history.length === 0) return 100;

    const successCount = history.filter((r) => r.success).length;
    return (successCount / history.length) * 100;
  }

  /**
   * Get availability for a provider
   */
  getAvailability(providerId: string): ProviderAvailability | undefined {
    return this.availability.get(providerId);
  }

  /**
   * Get all availability states
   */
  getAllAvailability(): Map<string, ProviderAvailability> {
    return new Map(this.availability);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.availability.entries())
      .filter(([_, a]) => a.status === 'available' || a.status === 'degraded')
      .map(([id]) => id);
  }

  /**
   * Check if a provider is available
   */
  isAvailable(providerId: string): boolean {
    const availability = this.availability.get(providerId);
    return availability?.status === 'available' || availability?.status === 'degraded';
  }

  /**
   * Get check history for a provider
   */
  getCheckHistory(
    providerId: string,
    limit?: number
  ): HealthCheckResult[] {
    const history = this.checkHistory.get(providerId) || [];
    if (limit) {
      return history.slice(-limit);
    }
    return [...history];
  }

  /**
   * Subscribe to availability events
   */
  subscribe(listener: (event: AvailabilityEvent) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Emit an availability event
   */
  private emitEvent(event: AvailabilityEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        log.error('AvailabilityMonitor event listener error', error as Error);
      }
    });
  }

  /**
   * Promise timeout wrapper with proper timer cleanup
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Force a status for a provider (manual override)
   */
  setProviderStatus(providerId: string, status: AvailabilityStatus): void {
    const current = this.availability.get(providerId);
    if (current) {
      const previousStatus = current.status;
      current.status = status;
      this.availability.set(providerId, current);

      if (previousStatus !== status) {
        this.emitEvent({
          type: 'status_changed',
          providerId,
          previousStatus,
          currentStatus: status,
          timestamp: Date.now(),
          details: 'Manual status override',
        });
      }
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    available: number;
    degraded: number;
    unavailable: number;
    unknown: number;
  } {
    const summary = {
      total: 0,
      available: 0,
      degraded: 0,
      unavailable: 0,
      unknown: 0,
    };

    this.availability.forEach((a) => {
      summary.total++;
      summary[a.status]++;
    });

    return summary;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AvailabilityMonitorConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...config };

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.availability.clear();
    this.checkHistory.clear();
  }
}

/** Global availability monitor singleton */
let globalMonitor: AvailabilityMonitor | null = null;

/**
 * Get the global availability monitor
 */
export function getAvailabilityMonitor(
  config?: Partial<AvailabilityMonitorConfig>
): AvailabilityMonitor {
  if (!globalMonitor) {
    globalMonitor = new AvailabilityMonitor(config);
  }
  return globalMonitor;
}

/**
 * Initialize the availability monitor with providers
 */
export function initializeAvailabilityMonitor(
  providers: { id: string; apiKey?: string; baseURL?: string }[],
  config?: Partial<AvailabilityMonitorConfig>
): AvailabilityMonitor {
  const monitor = getAvailabilityMonitor(config);

  providers.forEach((p) => {
    monitor.registerProvider(p.id, { apiKey: p.apiKey, baseURL: p.baseURL });
  });

  return monitor;
}

/**
 * Check if a provider is currently available
 */
export function isProviderHealthy(providerId: string): boolean {
  return getAvailabilityMonitor().isAvailable(providerId);
}

/**
 * Get provider availability status
 */
export function getProviderAvailability(providerId: string): ProviderAvailability | undefined {
  return getAvailabilityMonitor().getAvailability(providerId);
}

/**
 * Manually trigger a health check for a provider
 */
export async function checkProviderHealth(providerId: string): Promise<HealthCheckResult> {
  return getAvailabilityMonitor().checkProvider(providerId);
}
