/**
 * Adaptive Concurrency Controller
 *
 * Dynamically adjusts concurrency limits based on:
 * - Response latency metrics
 * - Error rates
 * - System load indicators
 *
 * Uses a sliding window approach for metric calculation
 */

import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Metrics for concurrency decisions
 */
export interface ConcurrencyMetrics {
  /** Average response latency in milliseconds */
  avgLatency: number;
  /** 95th percentile latency */
  p95Latency: number;
  /** Error rate (0-1) */
  errorRate: number;
  /** Total requests in window */
  totalRequests: number;
  /** Successful requests in window */
  successCount: number;
  /** Failed requests in window */
  failureCount: number;
}

/**
 * Configuration for adaptive concurrency
 */
export interface AdaptiveConcurrencyConfig {
  /** Minimum concurrency level (default: 1) */
  minConcurrency: number;
  /** Maximum concurrency level (default: 10) */
  maxConcurrency: number;
  /** Initial concurrency level (default: 3) */
  initialConcurrency: number;
  /** Sliding window size for metrics (default: 100) */
  windowSize: number;
  /** Target latency in ms - increase concurrency if below (default: 1000) */
  targetLatencyMs: number;
  /** High latency threshold - decrease concurrency if above (default: 5000) */
  highLatencyThresholdMs: number;
  /** Error rate threshold - decrease concurrency if above (default: 0.1) */
  errorRateThreshold: number;
  /** Low error rate - can increase concurrency if below (default: 0.01) */
  lowErrorRateThreshold: number;
  /** Cooldown period between adjustments in ms (default: 10000) */
  adjustmentCooldownMs: number;
}

/**
 * Default configuration
 */
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConcurrencyConfig = {
  minConcurrency: 1,
  maxConcurrency: 10,
  initialConcurrency: 3,
  windowSize: 100,
  targetLatencyMs: 1000,
  highLatencyThresholdMs: 5000,
  errorRateThreshold: 0.1,
  lowErrorRateThreshold: 0.01,
  adjustmentCooldownMs: 10000,
};

/**
 * Execution record for sliding window
 */
interface ExecutionRecord {
  timestamp: number;
  latencyMs: number;
  success: boolean;
}

/**
 * Adaptive Concurrency Controller
 *
 * Automatically adjusts concurrency based on observed performance metrics
 */
export class AdaptiveConcurrencyController {
  private config: AdaptiveConcurrencyConfig;
  private currentConcurrency: number;
  private records: ExecutionRecord[] = [];
  private lastAdjustmentTime: number = 0;
  private listeners: Set<(concurrency: number) => void> = new Set();

  constructor(config: Partial<AdaptiveConcurrencyConfig> = {}) {
    this.config = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
    this.currentConcurrency = this.config.initialConcurrency;
  }

  /**
   * Record an execution result
   */
  recordExecution(latencyMs: number, success: boolean): void {
    const record: ExecutionRecord = {
      timestamp: Date.now(),
      latencyMs,
      success,
    };

    this.records.push(record);

    // Trim to window size
    if (this.records.length > this.config.windowSize) {
      this.records = this.records.slice(-this.config.windowSize);
    }

    // Check if we should adjust concurrency
    this.maybeAdjust();
  }

  /**
   * Get current concurrency level
   */
  getConcurrency(): number {
    return this.currentConcurrency;
  }

  /**
   * Set concurrency level directly (bypasses adaptive logic)
   */
  setConcurrency(level: number): void {
    const newLevel = Math.max(
      this.config.minConcurrency,
      Math.min(this.config.maxConcurrency, level)
    );
    if (newLevel !== this.currentConcurrency) {
      this.currentConcurrency = newLevel;
      this.notifyListeners();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConcurrencyMetrics {
    if (this.records.length === 0) {
      return {
        avgLatency: 0,
        p95Latency: 0,
        errorRate: 0,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    const latencies = this.records.map((r) => r.latencyMs);
    const successCount = this.records.filter((r) => r.success).length;
    const failureCount = this.records.length - successCount;

    // Calculate average latency
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    // Calculate p95 latency
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95Latency = sortedLatencies[p95Index] || avgLatency;

    return {
      avgLatency,
      p95Latency,
      errorRate: failureCount / this.records.length,
      totalRequests: this.records.length,
      successCount,
      failureCount,
    };
  }

  /**
   * Subscribe to concurrency changes
   */
  subscribe(listener: (concurrency: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.records = [];
    this.currentConcurrency = this.config.initialConcurrency;
    this.lastAdjustmentTime = 0;
    this.notifyListeners();
  }

  /**
   * Get recommended concurrency based on metrics
   */
  getRecommendedConcurrency(): number {
    const metrics = this.getMetrics();

    if (metrics.totalRequests < 5) {
      // Not enough data
      return this.currentConcurrency;
    }

    // High error rate - decrease
    if (metrics.errorRate > this.config.errorRateThreshold) {
      return Math.max(this.config.minConcurrency, this.currentConcurrency - 1);
    }

    // High latency - decrease
    if (metrics.avgLatency > this.config.highLatencyThresholdMs) {
      return Math.max(this.config.minConcurrency, this.currentConcurrency - 1);
    }

    // Low error rate and good latency - can increase
    if (
      metrics.errorRate < this.config.lowErrorRateThreshold &&
      metrics.avgLatency < this.config.targetLatencyMs
    ) {
      return Math.min(this.config.maxConcurrency, this.currentConcurrency + 1);
    }

    return this.currentConcurrency;
  }

  /**
   * Check if adjustment is needed and apply it
   */
  private maybeAdjust(): void {
    const now = Date.now();

    // Check cooldown
    if (now - this.lastAdjustmentTime < this.config.adjustmentCooldownMs) {
      return;
    }

    const recommended = this.getRecommendedConcurrency();

    if (recommended !== this.currentConcurrency) {
      const oldConcurrency = this.currentConcurrency;
      this.currentConcurrency = recommended;
      this.lastAdjustmentTime = now;

      log.info('Concurrency adjusted', {
        from: oldConcurrency,
        to: recommended,
        metrics: this.getMetrics(),
      });

      this.notifyListeners();
    }
  }

  /**
   * Notify all listeners of concurrency change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentConcurrency);
      } catch (error) {
        log.error('Concurrency listener error', error as Error);
      }
    });
  }
}

/**
 * Global adaptive controller instance
 */
let globalController: AdaptiveConcurrencyController | null = null;

/**
 * Get or create the global adaptive concurrency controller
 */
export function getAdaptiveConcurrencyController(
  config?: Partial<AdaptiveConcurrencyConfig>
): AdaptiveConcurrencyController {
  if (!globalController) {
    globalController = new AdaptiveConcurrencyController(config);
  }
  return globalController;
}

/**
 * Reset the global controller
 */
export function resetAdaptiveConcurrencyController(): void {
  globalController?.reset();
  globalController = null;
}
