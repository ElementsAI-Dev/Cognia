/**
 * useStorageCleanup Hook
 * React hook for storage cleanup operations
 */

import { useState, useCallback } from 'react';
import {
  storageCleanup,
  StorageManager,
  type CleanupOptions,
  type CleanupResult,
  type StorageCategory,
} from '@/lib/storage';

/**
 * Hook return value
 */
export interface UseStorageCleanupReturn {
  /** Run cleanup with options */
  cleanup: (options?: CleanupOptions) => Promise<CleanupResult>;
  /** Quick cleanup (cache only) */
  quickCleanup: () => Promise<CleanupResult>;
  /** Deep cleanup (aggressive) */
  deepCleanup: () => Promise<CleanupResult>;
  /** Preview cleanup without deleting */
  previewCleanup: (options?: CleanupOptions) => Promise<CleanupResult>;
  /** Clear a specific category */
  clearCategory: (category: StorageCategory) => Promise<number>;
  /** Clear all Cognia data */
  clearAll: () => Promise<{ localStorage: number; indexedDB: boolean }>;
  /** Delete specific keys */
  deleteKeys: (keys: string[]) => number;
  /** Cleanup orphaned data */
  cleanupOrphans: () => Promise<number>;
  /** Clear expired cache */
  clearExpiredCache: () => Promise<number>;
  /** Is cleanup in progress */
  isRunning: boolean;
  /** Last cleanup result */
  lastResult: CleanupResult | null;
  /** Error if any */
  error: Error | null;
}

/**
 * Storage cleanup hook
 */
export function useStorageCleanup(): UseStorageCleanupReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Run cleanup with options
   */
  const cleanup = useCallback(async (options?: CleanupOptions): Promise<CleanupResult> => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await storageCleanup.cleanup(options);
      setLastResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Quick cleanup
   */
  const quickCleanup = useCallback(async (): Promise<CleanupResult> => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await storageCleanup.quickCleanup();
      setLastResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Deep cleanup
   */
  const deepCleanup = useCallback(async (): Promise<CleanupResult> => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await storageCleanup.deepCleanup();
      setLastResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Preview cleanup
   */
  const previewCleanup = useCallback(async (options?: CleanupOptions): Promise<CleanupResult> => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await storageCleanup.previewCleanup(options);
      setLastResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Clear category
   */
  const clearCategory = useCallback(async (category: StorageCategory): Promise<number> => {
    setIsRunning(true);
    setError(null);

    try {
      const deleted = StorageManager.clearCategory(category);
      return deleted;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Clear all Cognia data
   */
  const clearAll = useCallback(async (): Promise<{ localStorage: number; indexedDB: boolean }> => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await StorageManager.clearAllCogniaData();
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Delete specific keys
   */
  const deleteKeys = useCallback((keys: string[]): number => {
    return StorageManager.deleteKeys(keys);
  }, []);

  /**
   * Cleanup orphaned data
   */
  const cleanupOrphans = useCallback(async (): Promise<number> => {
    setIsRunning(true);
    setError(null);

    try {
      const cleaned = await storageCleanup.cleanupOrphanedData();
      return cleaned;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  /**
   * Clear expired cache
   */
  const clearExpiredCache = useCallback(async (): Promise<number> => {
    setIsRunning(true);
    setError(null);

    try {
      const cleared = await storageCleanup.clearExpiredCache();
      return cleared;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    cleanup,
    quickCleanup,
    deepCleanup,
    previewCleanup,
    clearCategory,
    clearAll,
    deleteKeys,
    cleanupOrphans,
    clearExpiredCache,
    isRunning,
    lastResult,
    error,
  };
}

export default useStorageCleanup;
