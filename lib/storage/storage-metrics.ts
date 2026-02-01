/**
 * Storage Metrics Service
 * Collects and tracks storage usage metrics over time
 */

import { StorageManager } from './storage-manager';
import type { StorageStats, StorageCategory, StorageHealth } from './types';
import { loggers } from '@/lib/logger';

const log = loggers.store;

/**
 * Storage metric snapshot
 */
export interface StorageMetricSnapshot {
  timestamp: number;
  totalUsed: number;
  totalQuota: number;
  usagePercent: number;
  localStorageUsed: number;
  indexedDBUsed: number;
  categoryBreakdown: Record<StorageCategory, number>;
}

/**
 * Storage trend data
 */
export interface StorageTrend {
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  averageDaily: number;
  projectedFull?: Date;
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Maximum snapshots to retain */
  maxSnapshots: number;
  /** Snapshot interval in ms */
  snapshotInterval: number;
  /** Enable automatic snapshots */
  autoSnapshot: boolean;
  /** Storage key for metrics data */
  storageKey: string;
}

const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  maxSnapshots: 30,
  snapshotInterval: 24 * 60 * 60 * 1000, // 24 hours
  autoSnapshot: false,
  storageKey: 'cognia-storage-metrics',
};

/**
 * Storage Metrics Service
 */
export class StorageMetricsService {
  private config: MetricsConfig;
  private snapshots: StorageMetricSnapshot[] = [];
  private snapshotIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<MetricsConfig> = {}) {
    this.config = { ...DEFAULT_METRICS_CONFIG, ...config };
    this.loadSnapshots();
  }

  /**
   * Initialize metrics service
   */
  initialize(config?: Partial<MetricsConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.autoSnapshot) {
      this.startAutoSnapshot();
    }
  }

  /**
   * Take a storage snapshot
   */
  async takeSnapshot(): Promise<StorageMetricSnapshot> {
    const stats = await StorageManager.getStats(true);

    const categoryBreakdown: Record<StorageCategory, number> = {} as Record<StorageCategory, number>;
    for (const cat of stats.byCategory) {
      categoryBreakdown[cat.category] = cat.totalSize;
    }

    const snapshot: StorageMetricSnapshot = {
      timestamp: Date.now(),
      totalUsed: stats.total.used,
      totalQuota: stats.total.quota,
      usagePercent: stats.total.usagePercent,
      localStorageUsed: stats.localStorage.used,
      indexedDBUsed: stats.indexedDB.used,
      categoryBreakdown,
    };

    this.addSnapshot(snapshot);
    return snapshot;
  }

  /**
   * Add snapshot to history
   */
  private addSnapshot(snapshot: StorageMetricSnapshot): void {
    this.snapshots.push(snapshot);

    // Trim to max snapshots
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.config.maxSnapshots);
    }

    this.saveSnapshots();
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): StorageMetricSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get latest snapshot
   */
  getLatestSnapshot(): StorageMetricSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get snapshots within time range
   */
  getSnapshotsInRange(startTime: number, endTime: number): StorageMetricSnapshot[] {
    return this.snapshots.filter((s) => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  /**
   * Calculate storage trend
   */
  calculateTrend(days: number = 7): StorageTrend | null {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentSnapshots = this.snapshots.filter((s) => s.timestamp >= cutoff);

    if (recentSnapshots.length < 2) {
      return null;
    }

    const firstSnapshot = recentSnapshots[0];
    const lastSnapshot = recentSnapshots[recentSnapshots.length - 1];
    const timeDiff = lastSnapshot.timestamp - firstSnapshot.timestamp;
    const usageDiff = lastSnapshot.totalUsed - firstSnapshot.totalUsed;

    // Calculate daily average change
    const daysElapsed = timeDiff / (24 * 60 * 60 * 1000);
    const averageDaily = daysElapsed > 0 ? usageDiff / daysElapsed : 0;

    // Determine direction
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    const changePercent = firstSnapshot.totalUsed > 0 
      ? (usageDiff / firstSnapshot.totalUsed) * 100 
      : 0;

    if (changePercent > 5) {
      direction = 'increasing';
    } else if (changePercent < -5) {
      direction = 'decreasing';
    }

    // Project when storage will be full
    let projectedFull: Date | undefined;
    if (direction === 'increasing' && averageDaily > 0) {
      const remainingSpace = lastSnapshot.totalQuota - lastSnapshot.totalUsed;
      const daysUntilFull = remainingSpace / averageDaily;
      if (daysUntilFull > 0 && daysUntilFull < 365) {
        projectedFull = new Date(Date.now() + daysUntilFull * 24 * 60 * 60 * 1000);
      }
    }

    return {
      direction,
      changePercent,
      averageDaily,
      projectedFull,
    };
  }

  /**
   * Get category growth
   */
  getCategoryGrowth(category: StorageCategory, days: number = 7): {
    current: number;
    change: number;
    changePercent: number;
  } | null {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recentSnapshots = this.snapshots.filter((s) => s.timestamp >= cutoff);

    if (recentSnapshots.length < 2) {
      return null;
    }

    const firstValue = recentSnapshots[0].categoryBreakdown[category] || 0;
    const lastValue = recentSnapshots[recentSnapshots.length - 1].categoryBreakdown[category] || 0;
    const change = lastValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

    return {
      current: lastValue,
      change,
      changePercent,
    };
  }

  /**
   * Get storage summary
   */
  async getSummary(): Promise<{
    currentStats: StorageStats;
    health: StorageHealth;
    trend: StorageTrend | null;
    largestCategories: { category: StorageCategory; size: number }[];
  }> {
    const currentStats = await StorageManager.getStats(true);
    const health = await StorageManager.getHealth();
    const trend = this.calculateTrend();

    const largestCategories = [...currentStats.byCategory]
      .sort((a, b) => b.totalSize - a.totalSize)
      .slice(0, 5)
      .map((c) => ({ category: c.category, size: c.totalSize }));

    return {
      currentStats,
      health,
      trend,
      largestCategories,
    };
  }

  /**
   * Start automatic snapshots
   */
  private startAutoSnapshot(): void {
    if (this.snapshotIntervalId) return;

    this.snapshotIntervalId = setInterval(() => {
      this.takeSnapshot().catch((e) => log.error('Failed to take snapshot', e as Error));
    }, this.config.snapshotInterval);

    // Take initial snapshot
    this.takeSnapshot().catch((e) => log.error('Failed to take initial snapshot', e as Error));
  }

  /**
   * Stop automatic snapshots
   */
  stopAutoSnapshot(): void {
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }
  }

  /**
   * Load snapshots from storage
   */
  private loadSnapshots(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        this.snapshots = JSON.parse(stored);
      }
    } catch {
      this.snapshots = [];
    }
  }

  /**
   * Save snapshots to storage
   */
  private saveSnapshots(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.snapshots));
    } catch (error) {
      log.warn('Failed to save storage metrics', { error: String(error) });
    }
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots = [];
    this.saveSnapshots();
  }

  /**
   * Export metrics data
   */
  exportMetrics(): {
    snapshots: StorageMetricSnapshot[];
    exportedAt: number;
    config: MetricsConfig;
  } {
    return {
      snapshots: this.getSnapshots(),
      exportedAt: Date.now(),
      config: this.config,
    };
  }

  /**
   * Import metrics data
   */
  importMetrics(data: { snapshots: StorageMetricSnapshot[] }): void {
    this.snapshots = data.snapshots;
    this.saveSnapshots();
  }

  /**
   * Dispose service
   */
  dispose(): void {
    this.stopAutoSnapshot();
  }
}

// Singleton instance
export const storageMetrics = new StorageMetricsService();
