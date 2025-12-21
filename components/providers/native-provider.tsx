'use client';

/**
 * NativeProvider - Initializes native desktop functionality
 * Wraps the app to provide native features when running in Tauri
 */

import { useEffect, type ReactNode } from 'react';
import { useNativeStore } from '@/stores/native-store';
import { isTauri } from '@/lib/native/utils';
import { getSystemInfo } from '@/lib/native/system';
import { isNotificationPermissionGranted } from '@/lib/native/notification';
import { checkForUpdates } from '@/lib/native/updater';

export interface NativeProviderProps {
  children: ReactNode;
  checkUpdatesOnMount?: boolean;
}

export function NativeProvider({
  children,
  checkUpdatesOnMount = true,
}: NativeProviderProps) {
  const {
    setSystemInfo,
    setIsDesktop,
    setNotificationPermission,
    setUpdateAvailable,
  } = useNativeStore();

  useEffect(() => {
    const initNative = async () => {
      const inTauri = isTauri();
      setIsDesktop(inTauri);

      if (!inTauri) return;

      // Get system info
      const info = await getSystemInfo();
      setSystemInfo(info.platform, info.appVersion);

      // Check notification permission
      const hasNotifPerm = await isNotificationPermissionGranted();
      setNotificationPermission(hasNotifPerm);

      // Check for updates if enabled
      if (checkUpdatesOnMount) {
        try {
          const updateInfo = await checkForUpdates();
          if (updateInfo.available) {
            setUpdateAvailable(true, updateInfo.version);
          }
        } catch (error) {
          console.warn('Failed to check for updates:', error);
        }
      }
    };

    initNative();
  }, [
    setIsDesktop,
    setSystemInfo,
    setNotificationPermission,
    setUpdateAvailable,
    checkUpdatesOnMount,
  ]);

  return <>{children}</>;
}

export default NativeProvider;
