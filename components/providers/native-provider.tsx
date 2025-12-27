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
  useEffect(() => {
    const initNative = async () => {
      const store = useNativeStore.getState();
      const inTauri = isTauri();
      store.setIsDesktop(inTauri);

      if (!inTauri) return;

      // Get system info
      const info = await getSystemInfo();
      store.setSystemInfo(info.platform, info.appVersion);

      // Check notification permission
      const hasNotifPerm = await isNotificationPermissionGranted();
      store.setNotificationPermission(hasNotifPerm);

      // Check for updates if enabled
      if (checkUpdatesOnMount) {
        try {
          const updateInfo = await checkForUpdates();
          if (updateInfo.available) {
            store.setUpdateAvailable(true, updateInfo.version);
          }
        } catch (error) {
          console.warn('Failed to check for updates:', error);
        }
      }
    };

    initNative();
  }, [checkUpdatesOnMount]);

  return <>{children}</>;
}

export default NativeProvider;
