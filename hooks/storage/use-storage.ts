/**
 * Unified Storage Hook
 * Provides a single hook for all storage operations
 */

import { useState, useCallback, useEffect } from 'react';
import {
  StorageManager,
  storageCleanup,
  storageMetrics,
  importFullBackup,
  parseImportFile,
  downloadExport,
  type StorageStats,
  type StorageHealth,
  type StorageTrend,
  type StorageCategory,
  type CleanupResult,
  type ImportResult,
  type ImportOptions,
  type ExportOptions,
} from '@/lib/storage';

/**
 * Unified storage hook return type
 */
export interface UseStorageReturn {
  // Stats
  stats: StorageStats | null;
  health: StorageHealth | null;
  trend: StorageTrend | null;
  isLoading: boolean;
  error: Error | null;

  // Persistence
  isPersistent: boolean;
  requestPersistence: () => Promise<boolean>;

  // Actions
  refresh: () => Promise<void>;
  cleanup: (aggressive?: boolean) => Promise<CleanupResult>;
  clearCategory: (category: StorageCategory) => Promise<number>;
  clearAll: () => Promise<{ localStorage: number; indexedDB: boolean }>;

  // Backup/Restore
  createBackup: (options?: Partial<ExportOptions>) => Promise<void>;
  restoreBackup: (file: File, options?: Partial<ImportOptions>) => Promise<ImportResult>;

  // Utils
  formatBytes: (bytes: number) => string;
  takeSnapshot: () => Promise<void>;
}

/**
 * Unified storage hook options
 */
export interface UseStorageOptions {
  /** Auto refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Enable metrics tracking */
  enableMetrics?: boolean;
  /** Auto-request persistent storage */
  autoRequestPersistence?: boolean;
}

/**
 * Unified storage hook
 */
export function useStorage(options: UseStorageOptions = {}): UseStorageReturn {
  const {
    refreshInterval = 0,
    enableMetrics = false,
    autoRequestPersistence = true,
  } = options;

  const [stats, setStats] = useState<StorageStats | null>(null);
  const [health, setHealth] = useState<StorageHealth | null>(null);
  const [trend, setTrend] = useState<StorageTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isPersistent, setIsPersistent] = useState(false);

  /**
   * Fetch all storage data
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [newStats, newHealth] = await Promise.all([
        StorageManager.getStats(true),
        StorageManager.getHealth(),
      ]);

      setStats(newStats);
      setHealth(newHealth);

      if (enableMetrics) {
        setTrend(storageMetrics.calculateTrend(7));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [enableMetrics]);

  /**
   * Request persistent storage
   */
  const requestPersistence = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      return false;
    }

    try {
      const granted = await navigator.storage.persist();
      setIsPersistent(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  /**
   * Run cleanup
   */
  const cleanup = useCallback(async (aggressive = false): Promise<CleanupResult> => {
    const result = aggressive
      ? await storageCleanup.deepCleanup()
      : await storageCleanup.quickCleanup();
    await refresh();
    return result;
  }, [refresh]);

  /**
   * Clear category
   */
  const clearCategory = useCallback(async (category: StorageCategory): Promise<number> => {
    const deleted = StorageManager.clearCategory(category);
    await refresh();
    return deleted;
  }, [refresh]);

  /**
   * Clear all data
   */
  const clearAll = useCallback(async (): Promise<{ localStorage: number; indexedDB: boolean }> => {
    const result = await StorageManager.clearAllCogniaData();
    await refresh();
    return result;
  }, [refresh]);

  /**
   * Create and download backup
   */
  const createBackup = useCallback(async (exportOptions?: Partial<ExportOptions>): Promise<void> => {
    await downloadExport(exportOptions);
  }, []);

  /**
   * Restore from backup file
   */
  const restoreBackup = useCallback(async (
    file: File,
    importOptions?: Partial<ImportOptions>
  ): Promise<ImportResult> => {
    const { data, errors } = await parseImportFile(file);

    if (!data || errors.length > 0) {
      return {
        success: false,
        imported: { sessions: 0, messages: 0, artifacts: 0, documents: 0, projects: 0, settings: false },
        skipped: { sessions: 0, messages: 0, artifacts: 0 },
        errors: errors.map((msg) => ({ category: 'parse', message: msg })),
        warnings: [],
        duration: 0,
      };
    }

    const result = await importFullBackup(data, importOptions);
    await refresh();
    return result;
  }, [refresh]);

  /**
   * Take metrics snapshot
   */
  const takeSnapshot = useCallback(async () => {
    if (enableMetrics) {
      await storageMetrics.takeSnapshot();
      setTrend(storageMetrics.calculateTrend(7));
    }
  }, [enableMetrics]);

  // Initial fetch and persistence check
  useEffect(() => {
    refresh();

    // Check persistence status
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      navigator.storage.persisted().then(setIsPersistent);
    }
  }, [refresh]);

  // Auto-request persistence
  useEffect(() => {
    if (autoRequestPersistence && !isPersistent) {
      requestPersistence();
    }
  }, [autoRequestPersistence, isPersistent, requestPersistence]);

  // Auto refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  return {
    // Stats
    stats,
    health,
    trend,
    isLoading,
    error,

    // Persistence
    isPersistent,
    requestPersistence,

    // Actions
    refresh,
    cleanup,
    clearCategory,
    clearAll,

    // Backup/Restore
    createBackup,
    restoreBackup,

    // Utils
    formatBytes: StorageManager.formatBytes.bind(StorageManager),
    takeSnapshot,
  };
}

export default useStorage;
