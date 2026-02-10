'use client';

/**
 * useSync - Custom hook for sync operations
 * Provides a clean API layer over the sync store with computed properties
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useSyncStore } from '@/stores/sync';
import type { SyncDirection, SyncResult, BackupInfo } from '@/types/sync';

/**
 * Hook for sync status and computed properties
 */
export function useSync() {
  const {
    activeProvider,
    webdavConfig,
    githubConfig,
    googleDriveConfig,
    status,
    progress,
    lastError,
    syncHistory,
  } = useSyncStore();

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeConfig = useMemo(() => {
    if (!activeProvider) return null;
    switch (activeProvider) {
      case 'webdav':
        return webdavConfig;
      case 'github':
        return githubConfig;
      case 'googledrive':
        return googleDriveConfig;
      default:
        return null;
    }
  }, [activeProvider, webdavConfig, githubConfig, googleDriveConfig]);

  const lastSyncTime = activeConfig?.lastSyncAt ?? null;

  const formattedLastSync = useMemo(() => {
    if (!lastSyncTime) return null;
    return new Date(lastSyncTime).toLocaleString();
  }, [lastSyncTime]);

  const isSyncing = status === 'syncing';
  const isEnabled = activeConfig?.enabled ?? false;
  const isAutoSync = activeConfig?.autoSync ?? false;
  const canSync = isEnabled && !isSyncing && isOnline;

  return {
    activeProvider,
    activeConfig,
    status,
    progress,
    lastError,
    syncHistory,
    lastSyncTime,
    formattedLastSync,
    isSyncing,
    isEnabled,
    isAutoSync,
    isOnline,
    canSync,
  };
}

/**
 * Hook for sync actions
 */
export function useSyncActions() {
  const { startSync, cancelSync, testConnection, listBackups, deleteBackup } =
    useSyncStore();

  const sync = useCallback(
    async (direction: SyncDirection = 'bidirectional'): Promise<SyncResult> => {
      return await startSync(direction);
    },
    [startSync]
  );

  const upload = useCallback(async (): Promise<SyncResult> => {
    return await startSync('upload');
  }, [startSync]);

  const download = useCallback(async (): Promise<SyncResult> => {
    return await startSync('download');
  }, [startSync]);

  const cancel = useCallback(() => {
    cancelSync();
  }, [cancelSync]);

  const test = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    return await testConnection();
  }, [testConnection]);

  const getBackups = useCallback(async (): Promise<BackupInfo[]> => {
    return await listBackups();
  }, [listBackups]);

  const removeBackup = useCallback(
    async (id: string): Promise<boolean> => {
      return await deleteBackup(id);
    },
    [deleteBackup]
  );

  const restoreBackup = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { getSyncManager } = await import('@/lib/sync');
      const manager = getSyncManager();
      return await manager.restoreBackup(id);
    } catch {
      return false;
    }
  }, []);

  return {
    sync,
    upload,
    download,
    cancel,
    test,
    getBackups,
    removeBackup,
    restoreBackup,
  };
}
