/**
 * useStorageStats Hook
 * React hook for accessing storage statistics and health
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StorageManager,
  storageMetrics,
  type StorageStats,
  type StorageHealth,
  type StorageTrend,
  type StorageCategory,
  type StorageCategoryInfo,
} from '@/lib/storage';

/**
 * Hook options
 */
export interface UseStorageStatsOptions {
  /** Auto refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Calculate trend over N days */
  trendDays?: number;
  /** Enable automatic snapshots for metrics */
  enableMetrics?: boolean;
}

/**
 * Hook return value
 */
export interface UseStorageStatsReturn {
  /** Current storage statistics */
  stats: StorageStats | null;
  /** Storage health status */
  health: StorageHealth | null;
  /** Storage usage trend */
  trend: StorageTrend | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Manually refresh stats */
  refresh: () => Promise<void>;
  /** Get category info */
  getCategoryInfo: (category: StorageCategory) => StorageCategoryInfo | null;
  /** Format bytes to human readable */
  formatBytes: (bytes: number) => string;
  /** Take a metrics snapshot */
  takeSnapshot: () => Promise<void>;
}

/**
 * Storage statistics hook
 */
export function useStorageStats(options: UseStorageStatsOptions = {}): UseStorageStatsReturn {
  const { refreshInterval = 0, trendDays = 7, enableMetrics = false } = options;

  const [stats, setStats] = useState<StorageStats | null>(null);
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [trend, setTrend] = useState<StorageTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Fetch all storage data
   */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [newStats, newHealth] = await Promise.all([
        StorageManager.getStats(true),
        StorageManager.getHealth(),
      ]);

      setStats(newStats);
      setHealth(newHealth);

      // Calculate trend if metrics enabled
      if (enableMetrics) {
        const newTrend = storageMetrics.calculateTrend(trendDays);
        setTrend(newTrend);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enableMetrics, trendDays]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Get category info
   */
  const getCategoryInfo = useCallback(
    (category: StorageCategory): StorageCategoryInfo | null => {
      if (!stats) return null;
      return stats.byCategory.find((c) => c.category === category) || null;
    },
    [stats]
  );

  /**
   * Take metrics snapshot
   */
  const takeSnapshot = useCallback(async () => {
    if (enableMetrics) {
      await storageMetrics.takeSnapshot();
      const newTrend = storageMetrics.calculateTrend(trendDays);
      setTrend(newTrend);
    }
  }, [enableMetrics, trendDays]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, fetchData]);

  return {
    stats,
    health,
    trend,
    isLoading,
    error,
    refresh,
    getCategoryInfo,
    formatBytes: StorageManager.formatBytes.bind(StorageManager),
    takeSnapshot,
  };
}

/**
 * Simplified hook for just getting storage usage
 */
export function useStorageUsage(): {
  used: number;
  quota: number;
  usagePercent: number;
  isLoading: boolean;
} {
  const { stats, isLoading } = useStorageStats();

  return {
    used: stats?.total.used || 0,
    quota: stats?.total.quota || 0,
    usagePercent: stats?.total.usagePercent || 0,
    isLoading,
  };
}

/**
 * Hook for storage health monitoring
 */
export function useStorageHealth(): {
  status: 'healthy' | 'warning' | 'critical' | null;
  issues: StorageHealth['issues'];
  recommendations: StorageHealth['recommendations'];
  isLoading: boolean;
} {
  const { health, isLoading } = useStorageStats();

  return {
    status: health?.status || null,
    issues: health?.issues || [],
    recommendations: health?.recommendations || [],
    isLoading,
  };
}

export default useStorageStats;
