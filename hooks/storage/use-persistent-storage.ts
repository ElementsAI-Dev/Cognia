/**
 * usePersistentStorage Hook
 * Requests persistent storage from the browser to prevent data eviction
 */

import { useState, useEffect, useCallback } from 'react';

export interface UsePersistentStorageReturn {
  /** Whether persistent storage is granted */
  isPersistent: boolean;
  /** Whether the check is in progress */
  isChecking: boolean;
  /** Request persistent storage */
  requestPersistence: () => Promise<boolean>;
  /** Storage estimate */
  estimate: StorageEstimate | null;
  /** Refresh storage estimate */
  refreshEstimate: () => Promise<void>;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  usagePercent: number;
}

/**
 * Hook for managing persistent storage
 */
export function usePersistentStorage(): UsePersistentStorageReturn {
  const [isPersistent, setIsPersistent] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

  /**
   * Check if storage is already persistent
   */
  const checkPersistence = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
      setIsChecking(false);
      return;
    }

    try {
      const persisted = await navigator.storage.persisted();
      setIsPersistent(persisted);
    } catch (error) {
      console.warn('Failed to check persistent storage:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

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
      
      if (granted) {
        console.log('[Storage] Persistent storage granted');
      } else {
        console.log('[Storage] Persistent storage denied');
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }, []);

  /**
   * Get storage estimate
   */
  const refreshEstimate = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return;
    }

    try {
      const est = await navigator.storage.estimate();
      const usage = est.usage || 0;
      const quota = est.quota || 0;
      
      setEstimate({
        usage,
        quota,
        usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
      });
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }
  }, []);

  // Check persistence and estimate on mount
  useEffect(() => {
    checkPersistence();
    refreshEstimate();
  }, [checkPersistence, refreshEstimate]);

  // Auto-request persistence if not already granted
  useEffect(() => {
    if (!isChecking && !isPersistent) {
      // Request persistence automatically (browser may show prompt)
      requestPersistence();
    }
  }, [isChecking, isPersistent, requestPersistence]);

  return {
    isPersistent,
    isChecking,
    requestPersistence,
    estimate,
    refreshEstimate,
  };
}

/**
 * Request persistent storage immediately (for use outside React)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) {
      return true;
    }

    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('[Storage] Persistent storage granted');
    }
    return granted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persistent
 */
export async function isPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export default usePersistentStorage;
