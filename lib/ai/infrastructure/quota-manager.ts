/**
 * Quota Manager - Track and manage API usage quotas
 * 
 * Handles:
 * - Usage tracking (requests, tokens, costs)
 * - Quota limits and enforcement
 * - Budget alerts and notifications
 * - Usage history and reporting
 */

import { loggers } from '@/lib/logger';
import { getModelPricingUSD } from '@/types/system/usage';

const log = loggers.ai;

export interface QuotaLimits {
  /** Maximum requests per day */
  maxRequestsPerDay?: number;
  /** Maximum requests per month */
  maxRequestsPerMonth?: number;
  /** Maximum tokens per day (input + output) */
  maxTokensPerDay?: number;
  /** Maximum tokens per month */
  maxTokensPerMonth?: number;
  /** Maximum cost per day in USD */
  maxCostPerDay?: number;
  /** Maximum cost per month in USD */
  maxCostPerMonth?: number;
}

export interface UsageRecord {
  timestamp: number;
  providerId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  success: boolean;
  latencyMs: number;
}

export interface UsageStats {
  providerId: string;
  period: 'day' | 'month' | 'all';
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageLatency: number;
}

export interface QuotaStatus {
  providerId: string;
  limits: QuotaLimits;
  usage: {
    today: UsageStats;
    thisMonth: UsageStats;
  };
  remaining: {
    requestsToday?: number;
    requestsThisMonth?: number;
    tokensToday?: number;
    tokensThisMonth?: number;
    costToday?: number;
    costThisMonth?: number;
  };
  alerts: QuotaAlert[];
  isBlocked: boolean;
  blockReason?: string;
}

export interface QuotaAlert {
  type: 'warning' | 'critical' | 'blocked';
  message: string;
  metric: string;
  percentage: number;
  timestamp: number;
}

export interface QuotaManagerConfig {
  /** Enable quota enforcement */
  enabled: boolean;
  /** Warning threshold (0-1, default 0.8 = 80%) */
  warningThreshold: number;
  /** Critical threshold (0-1, default 0.95 = 95%) */
  criticalThreshold: number;
  /** Block requests when quota exceeded */
  blockOnExceeded: boolean;
  /** Persist usage data */
  persistUsage: boolean;
  /** Storage key prefix */
  storageKeyPrefix: string;
}

const DEFAULT_CONFIG: QuotaManagerConfig = {
  enabled: true,
  warningThreshold: 0.8,
  criticalThreshold: 0.95,
  blockOnExceeded: false,
  persistUsage: true,
  storageKeyPrefix: 'cognia_quota_',
};

/** Default quota limits per provider */
export const DEFAULT_QUOTA_LIMITS: Record<string, QuotaLimits> = {
  openai: {
    maxRequestsPerDay: 10000,
    maxCostPerMonth: 100,
  },
  anthropic: {
    maxRequestsPerDay: 10000,
    maxCostPerMonth: 100,
  },
  google: {
    maxRequestsPerDay: 1500, // Free tier limit
    maxCostPerMonth: 50,
  },
  deepseek: {
    maxRequestsPerDay: 5000,
    maxCostPerMonth: 20,
  },
  groq: {
    maxRequestsPerDay: 14400, // 10 RPM
    maxTokensPerDay: 500000,
  },
  mistral: {
    maxRequestsPerDay: 5000,
    maxCostPerMonth: 50,
  },
  openrouter: {
    maxCostPerMonth: 100,
  },
  ollama: {
    // No limits for local
  },
};

/**
 * Quota Manager for tracking and enforcing API usage limits
 */
export class QuotaManager {
  private config: QuotaManagerConfig;
  private limits: Map<string, QuotaLimits> = new Map();
  private usageRecords: UsageRecord[] = [];
  private alerts: Map<string, QuotaAlert[]> = new Map();
  private alertCallbacks: ((alert: QuotaAlert, providerId: string) => void)[] = [];

  constructor(config?: Partial<QuotaManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadFromStorage();
  }

  /**
   * Set quota limits for a provider
   */
  setLimits(providerId: string, limits: QuotaLimits): void {
    this.limits.set(providerId, limits);
    this.saveToStorage();
  }

  /**
   * Get quota limits for a provider
   */
  getLimits(providerId: string): QuotaLimits {
    return this.limits.get(providerId) || DEFAULT_QUOTA_LIMITS[providerId] || {};
  }

  /**
   * Check if a request is allowed (doesn't exceed quota)
   */
  canMakeRequest(providerId: string): { allowed: boolean; reason?: string } {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const status = this.getQuotaStatus(providerId);

    if (status.isBlocked) {
      return { allowed: false, reason: status.blockReason };
    }

    return { allowed: true };
  }

  /**
   * Record a usage event
   */
  recordUsage(record: Omit<UsageRecord, 'timestamp'>): void {
    const fullRecord: UsageRecord = {
      ...record,
      timestamp: Date.now(),
    };

    this.usageRecords.push(fullRecord);

    // Trim old records (keep last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.usageRecords = this.usageRecords.filter((r) => r.timestamp > thirtyDaysAgo);

    // Check for quota alerts
    this.checkQuotaAlerts(record.providerId);

    // Persist
    if (this.config.persistUsage) {
      this.saveToStorage();
    }
  }

  /**
   * Get usage statistics for a provider and period
   */
  getUsageStats(providerId: string, period: 'day' | 'month' | 'all'): UsageStats {
    let startTime: number;

    switch (period) {
      case 'day':
        startTime = this.getStartOfDay();
        break;
      case 'month':
        startTime = this.getStartOfMonth();
        break;
      case 'all':
      default:
        startTime = 0;
        break;
    }

    const records = this.usageRecords.filter(
      (r) => r.providerId === providerId && r.timestamp >= startTime
    );

    const totalRequests = records.length;
    const successfulRequests = records.filter((r) => r.success).length;
    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0);
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const averageLatency =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length
        : 0;

    return {
      providerId,
      period,
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      averageLatency,
    };
  }

  /**
   * Get full quota status for a provider
   */
  getQuotaStatus(providerId: string): QuotaStatus {
    const limits = this.getLimits(providerId);
    const todayStats = this.getUsageStats(providerId, 'day');
    const monthStats = this.getUsageStats(providerId, 'month');
    const providerAlerts = this.alerts.get(providerId) || [];

    // Calculate remaining
    const remaining: QuotaStatus['remaining'] = {};

    if (limits.maxRequestsPerDay) {
      remaining.requestsToday = Math.max(0, limits.maxRequestsPerDay - todayStats.totalRequests);
    }
    if (limits.maxRequestsPerMonth) {
      remaining.requestsThisMonth = Math.max(
        0,
        limits.maxRequestsPerMonth - monthStats.totalRequests
      );
    }
    if (limits.maxTokensPerDay) {
      const todayTokens = todayStats.totalInputTokens + todayStats.totalOutputTokens;
      remaining.tokensToday = Math.max(0, limits.maxTokensPerDay - todayTokens);
    }
    if (limits.maxTokensPerMonth) {
      const monthTokens = monthStats.totalInputTokens + monthStats.totalOutputTokens;
      remaining.tokensThisMonth = Math.max(0, limits.maxTokensPerMonth - monthTokens);
    }
    if (limits.maxCostPerDay) {
      remaining.costToday = Math.max(0, limits.maxCostPerDay - todayStats.totalCost);
    }
    if (limits.maxCostPerMonth) {
      remaining.costThisMonth = Math.max(0, limits.maxCostPerMonth - monthStats.totalCost);
    }

    // Check if blocked
    let isBlocked = false;
    let blockReason: string | undefined;

    if (this.config.blockOnExceeded) {
      if (remaining.requestsToday === 0) {
        isBlocked = true;
        blockReason = 'Daily request limit exceeded';
      } else if (remaining.requestsThisMonth === 0) {
        isBlocked = true;
        blockReason = 'Monthly request limit exceeded';
      } else if (remaining.tokensToday === 0) {
        isBlocked = true;
        blockReason = 'Daily token limit exceeded';
      } else if (remaining.tokensThisMonth === 0) {
        isBlocked = true;
        blockReason = 'Monthly token limit exceeded';
      } else if (remaining.costToday === 0) {
        isBlocked = true;
        blockReason = 'Daily cost limit exceeded';
      } else if (remaining.costThisMonth === 0) {
        isBlocked = true;
        blockReason = 'Monthly cost limit exceeded';
      }
    }

    return {
      providerId,
      limits,
      usage: {
        today: todayStats,
        thisMonth: monthStats,
      },
      remaining,
      alerts: providerAlerts,
      isBlocked,
      blockReason,
    };
  }

  /**
   * Check and generate quota alerts
   */
  private checkQuotaAlerts(providerId: string): void {
    const status = this.getQuotaStatus(providerId);
    const limits = status.limits;
    const newAlerts: QuotaAlert[] = [];

    const checkMetric = (
      used: number,
      limit: number | undefined,
      metricName: string
    ) => {
      if (!limit) return;

      const percentage = used / limit;

      if (percentage >= 1) {
        newAlerts.push({
          type: 'blocked',
          message: `${metricName} limit exceeded`,
          metric: metricName,
          percentage,
          timestamp: Date.now(),
        });
      } else if (percentage >= this.config.criticalThreshold) {
        newAlerts.push({
          type: 'critical',
          message: `${metricName} at ${Math.round(percentage * 100)}% of limit`,
          metric: metricName,
          percentage,
          timestamp: Date.now(),
        });
      } else if (percentage >= this.config.warningThreshold) {
        newAlerts.push({
          type: 'warning',
          message: `${metricName} at ${Math.round(percentage * 100)}% of limit`,
          metric: metricName,
          percentage,
          timestamp: Date.now(),
        });
      }
    };

    // Check daily limits
    checkMetric(
      status.usage.today.totalRequests,
      limits.maxRequestsPerDay,
      'Daily requests'
    );
    checkMetric(
      status.usage.today.totalInputTokens + status.usage.today.totalOutputTokens,
      limits.maxTokensPerDay,
      'Daily tokens'
    );
    checkMetric(status.usage.today.totalCost, limits.maxCostPerDay, 'Daily cost');

    // Check monthly limits
    checkMetric(
      status.usage.thisMonth.totalRequests,
      limits.maxRequestsPerMonth,
      'Monthly requests'
    );
    checkMetric(
      status.usage.thisMonth.totalInputTokens + status.usage.thisMonth.totalOutputTokens,
      limits.maxTokensPerMonth,
      'Monthly tokens'
    );
    checkMetric(status.usage.thisMonth.totalCost, limits.maxCostPerMonth, 'Monthly cost');

    // Store and notify
    if (newAlerts.length > 0) {
      this.alerts.set(providerId, newAlerts);
      newAlerts.forEach((alert) => {
        this.alertCallbacks.forEach((cb) => cb(alert, providerId));
      });
    }
  }

  /**
   * Register a callback for quota alerts
   */
  onAlert(callback: (alert: QuotaAlert, providerId: string) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Get all usage records for a provider
   */
  getUsageHistory(
    providerId: string,
    options?: { startTime?: number; endTime?: number; limit?: number }
  ): UsageRecord[] {
    let records = this.usageRecords.filter((r) => r.providerId === providerId);

    if (options?.startTime) {
      records = records.filter((r) => r.timestamp >= options.startTime!);
    }
    if (options?.endTime) {
      records = records.filter((r) => r.timestamp <= options.endTime!);
    }

    records.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      records = records.slice(0, options.limit);
    }

    return records;
  }

  /**
   * Get usage summary across all providers
   */
  getAllProviderStats(period: 'day' | 'month'): Map<string, UsageStats> {
    const providers = new Set(this.usageRecords.map((r) => r.providerId));
    const stats = new Map<string, UsageStats>();

    providers.forEach((providerId) => {
      stats.set(providerId, this.getUsageStats(providerId, period));
    });

    return stats;
  }

  /**
   * Clear usage data
   */
  clearUsageData(providerId?: string): void {
    if (providerId) {
      this.usageRecords = this.usageRecords.filter((r) => r.providerId !== providerId);
      this.alerts.delete(providerId);
    } else {
      this.usageRecords = [];
      this.alerts.clear();
    }
    this.saveToStorage();
  }

  /**
   * Get start of today (midnight)
   */
  private getStartOfDay(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  }

  /**
   * Get start of current month
   */
  private getStartOfMonth(): number {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const usageData = localStorage.getItem(`${this.config.storageKeyPrefix}usage`);
      if (usageData) {
        this.usageRecords = JSON.parse(usageData);
      }

      const limitsData = localStorage.getItem(`${this.config.storageKeyPrefix}limits`);
      if (limitsData) {
        const parsed = JSON.parse(limitsData);
        Object.entries(parsed).forEach(([key, value]) => {
          this.limits.set(key, value as QuotaLimits);
        });
      }
    } catch (error) {
      log.warn('QuotaManager failed to load from storage', { error: String(error) });
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        `${this.config.storageKeyPrefix}usage`,
        JSON.stringify(this.usageRecords)
      );

      const limitsObj: Record<string, QuotaLimits> = {};
      this.limits.forEach((value, key) => {
        limitsObj[key] = value;
      });
      localStorage.setItem(`${this.config.storageKeyPrefix}limits`, JSON.stringify(limitsObj));
    } catch (error) {
      log.warn('QuotaManager failed to save to storage', { error: String(error) });
    }
  }
}

/** Global quota manager singleton */
let globalQuotaManager: QuotaManager | null = null;

/**
 * Get the global quota manager
 */
export function getQuotaManager(config?: Partial<QuotaManagerConfig>): QuotaManager {
  if (!globalQuotaManager) {
    globalQuotaManager = new QuotaManager(config);
  }
  return globalQuotaManager;
}

/**
 * Record API usage
 */
export function recordApiUsage(record: Omit<UsageRecord, 'timestamp'>): void {
  getQuotaManager().recordUsage(record);
}

/**
 * Check if a request can be made (within quota)
 */
export function checkQuota(providerId: string): { allowed: boolean; reason?: string } {
  return getQuotaManager().canMakeRequest(providerId);
}

/**
 * Get quota status for a provider
 */
export function getProviderQuotaStatus(providerId: string): QuotaStatus {
  return getQuotaManager().getQuotaStatus(providerId);
}

/**
 * Calculate cost for a request based on provider pricing
 * Uses centralized MODEL_PRICING from @/types/system/usage
 */
export function calculateRequestCost(
  _providerId: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const modelPricing = getModelPricingUSD(modelId);
  if (!modelPricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}
