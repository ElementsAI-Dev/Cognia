'use client';

/**
 * useContextStats - Hook for monitoring context file usage
 *
 * Provides real-time statistics about context files including
 * storage usage, token estimates, and file counts by category.
 */

import { useState, useEffect, useCallback } from 'react';
import { getContextStats, gcContextFiles, clearAllContextFiles } from '@/lib/context';
import { formatTokens as formatTokensCanonical } from '@/lib/observability/format-utils';

export interface ContextStats {
  /** Files count by category */
  filesByCategory: Record<string, number>;
  /** Total storage size in bytes */
  totalSizeBytes: number;
  /** Estimated total tokens */
  estimatedTotalTokens: number;
  /** Oldest file timestamp */
  oldestFile: Date | null;
  /** Last accessed file timestamp */
  lastAccessed: Date | null;
}

export interface UseContextStatsOptions {
  /** Auto-refresh interval in ms (0 = disabled) */
  refreshIntervalMs?: number;
  /** Refresh on mount */
  refreshOnMount?: boolean;
}

export interface UseContextStatsReturn {
  /** Current stats */
  stats: ContextStats | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh stats manually */
  refresh: () => Promise<void>;
  /** Run garbage collection */
  runGC: (maxAgeMs?: number) => Promise<number>;
  /** Clear all context files */
  clearAll: () => Promise<void>;
  /** Format size for display */
  formatSize: (bytes: number) => string;
  /** Format token count for display */
  formatTokens: (tokens: number) => string;
}

export function useContextStats(options: UseContextStatsOptions = {}): UseContextStatsReturn {
  const { refreshIntervalMs = 0, refreshOnMount = true } = options;

  const [stats, setStats] = useState<ContextStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh stats
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getContextStats();
      setStats({
        filesByCategory: result.filesByCategory,
        totalSizeBytes: result.totalSizeBytes,
        estimatedTotalTokens: result.estimatedTotalTokens,
        oldestFile: result.oldestFile || null,
        lastAccessed: result.lastAccessed || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run garbage collection
  const runGC = useCallback(
    async (maxAgeMs?: number): Promise<number> => {
      try {
        const result = await gcContextFiles(maxAgeMs ? { maxAge: maxAgeMs } : {});
        await refresh(); // Refresh stats after GC
        return result.filesRemoved;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'GC failed');
        return 0;
      }
    },
    [refresh]
  );

  // Clear all context files
  const clearAll = useCallback(async () => {
    try {
      await clearAllContextFiles();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clear failed');
    }
  }, [refresh]);

  // Format size for display
  const formatSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  // Format token count for display (delegates to canonical implementation)
  const formatTokens = useCallback((tokens: number): string => {
    return formatTokensCanonical(tokens);
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    if (refreshOnMount) {
      refresh();
    }
  }, [refreshOnMount, refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshIntervalMs <= 0) return;

    const interval = setInterval(refresh, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshIntervalMs, refresh]);

  return {
    stats,
    isLoading,
    error,
    refresh,
    runGC,
    clearAll,
    formatSize,
    formatTokens,
  };
}
