'use client';

/**
 * useNative - hook for initializing and managing native desktop functionality
 */

import { useEffect, useCallback, useState } from 'react';
import { useNativeStore } from '@/stores/system';
import { isTauri } from '@/lib/native/utils';
import { getSystemInfo } from '@/lib/native/system';
import { checkForUpdates, downloadAndInstallUpdate, type UpdateInfo } from '@/lib/native/updater';
import {
  requestNotificationPermission,
  isNotificationPermissionGranted,
} from '@/lib/native/notification';

export interface UseNativeOptions {
  checkUpdatesOnMount?: boolean;
  requestNotificationPermission?: boolean;
}

export interface UseNativeReturn {
  isDesktop: boolean;
  platform: string | null;
  appVersion: string | null;
  isInitialized: boolean;
  updateInfo: UpdateInfo | null;
  isCheckingUpdates: boolean;
  checkForUpdates: () => Promise<UpdateInfo>;
  installUpdate: () => Promise<boolean>;
  requestNotifications: () => Promise<boolean>;
}

export function useNative(options: UseNativeOptions = {}): UseNativeReturn {
  const { checkUpdatesOnMount = false, requestNotificationPermission: requestNotifPerm = false } =
    options;

  const [isInitialized, setIsInitialized] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);

  const {
    platform,
    appVersion,
    isDesktop,
    setSystemInfo,
    setIsDesktop,
    setNotificationPermission,
    setUpdateAvailable,
    setUpdateDownloading,
    setUpdateProgress,
  } = useNativeStore();

  // Initialize native state
  useEffect(() => {
    const init = async () => {
      const inTauri = isTauri();
      setIsDesktop(inTauri);

      if (inTauri) {
        const info = await getSystemInfo();
        setSystemInfo(info.platform, info.appVersion);

        // Check notification permission
        const hasNotifPerm = await isNotificationPermissionGranted();
        setNotificationPermission(hasNotifPerm);
      }

      setIsInitialized(true);
    };

    init();
  }, [setIsDesktop, setSystemInfo, setNotificationPermission]);

  // Check for updates on mount if enabled
  useEffect(() => {
    if (checkUpdatesOnMount && isInitialized && isDesktop) {
      handleCheckUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkUpdatesOnMount, isInitialized, isDesktop]);

  // Request notification permission on mount if enabled
  useEffect(() => {
    if (requestNotifPerm && isInitialized && isDesktop) {
      handleRequestNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNotifPerm, isInitialized, isDesktop]);

  const handleCheckUpdates = useCallback(async (): Promise<UpdateInfo> => {
    setIsCheckingUpdates(true);
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      setUpdateAvailable(info.available, info.version);
      return info;
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [setUpdateAvailable]);

  const handleInstallUpdate = useCallback(async (): Promise<boolean> => {
    setUpdateDownloading(true);
    try {
      return await downloadAndInstallUpdate((progress) => {
        setUpdateProgress(progress.percentage);
      });
    } finally {
      setUpdateDownloading(false);
    }
  }, [setUpdateDownloading, setUpdateProgress]);

  const handleRequestNotifications = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted);
    return granted;
  }, [setNotificationPermission]);

  return {
    isDesktop,
    platform,
    appVersion,
    isInitialized,
    updateInfo,
    isCheckingUpdates,
    checkForUpdates: handleCheckUpdates,
    installUpdate: handleInstallUpdate,
    requestNotifications: handleRequestNotifications,
  };
}

export default useNative;
