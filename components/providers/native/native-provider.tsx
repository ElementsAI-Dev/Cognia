'use client';

/**
 * NativeProvider - Initializes native desktop functionality
 * Wraps the app to provide native features when running in Tauri
 */

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useNativeStore } from '@/stores/system';
import { isTauri } from '@/lib/native/utils';
import { getSystemInfo } from '@/lib/native/system';
import { isNotificationPermissionGranted } from '@/lib/native/notification';
import { checkForUpdates } from '@/lib/native/updater';
import {
  initializeDeepLinks,
  registerHandler,
  type ParsedDeepLink,
} from '@/lib/native/deep-link';

export interface NativeProviderProps {
  children: ReactNode;
  checkUpdatesOnMount?: boolean;
}

export function NativeProvider({
  children,
  checkUpdatesOnMount = true,
}: NativeProviderProps) {
  const router = useRouter();

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

      // Initialize deep link handling
      await initializeDeepLinkHandlers();
    };

    const initializeDeepLinkHandlers = async () => {
      // Register deep link handlers for different actions
      
      // Handle chat/open - open a specific chat session
      registerHandler('chat/open', (params) => {
        if (params.id) {
          router.push(`/?session=${params.id}`);
        }
      });

      // Handle chat/new - create a new chat with optional prompt
      registerHandler('chat/new', (params) => {
        const queryParams = new URLSearchParams();
        if (params.prompt) {
          queryParams.set('prompt', params.prompt);
        }
        router.push(`/?${queryParams.toString()}`);
      });

      // Handle settings/open - open settings page
      registerHandler('settings/open', (params) => {
        const section = params.section || '';
        router.push(`/settings${section ? `?section=${section}` : ''}`);
      });

      // Handle project/open - open a project
      registerHandler('project/open', (params) => {
        if (params.id) {
          router.push(`/projects/${params.id}`);
        }
      });

      // Initialize and process any startup deep links
      await initializeDeepLinks((parsed: ParsedDeepLink) => {
        console.log('Deep link received:', parsed);
      });
    };

    initNative();
  }, [checkUpdatesOnMount, router]);

  return <>{children}</>;
}

export default NativeProvider;
