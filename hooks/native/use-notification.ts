'use client';

/**
 * useNotification - hook for sending desktop notifications
 */

import { useCallback } from 'react';
import { useNativeStore } from '@/stores/system';
import { isTauri } from '@/lib/native/utils';
import {
  sendNotification,
  requestNotificationPermission,
  isNotificationPermissionGranted,
  type NotificationOptions,
} from '@/lib/native/notification';

export interface UseNotificationReturn {
  isEnabled: boolean;
  hasPermission: boolean;
  isDesktop: boolean;
  notify: (title: string, body?: string) => Promise<boolean>;
  notifyWithOptions: (options: NotificationOptions) => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
}

export function useNotification(): UseNotificationReturn {
  const { notificationsEnabled, notificationPermission, isDesktop, setNotificationPermission } =
    useNativeStore();

  const notify = useCallback(
    async (title: string, body?: string): Promise<boolean> => {
      if (!notificationsEnabled) return false;
      return sendNotification({ title, body });
    },
    [notificationsEnabled]
  );

  const notifyWithOptions = useCallback(
    async (options: NotificationOptions): Promise<boolean> => {
      if (!notificationsEnabled) return false;
      return sendNotification(options);
    },
    [notificationsEnabled]
  );

  const handleRequestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted);
    return granted;
  }, [setNotificationPermission]);

  const handleCheckPermission = useCallback(async (): Promise<boolean> => {
    const granted = await isNotificationPermissionGranted();
    setNotificationPermission(granted);
    return granted;
  }, [setNotificationPermission]);

  return {
    isEnabled: notificationsEnabled,
    hasPermission: notificationPermission,
    isDesktop: isDesktop && isTauri(),
    notify,
    notifyWithOptions,
    requestPermission: handleRequestPermission,
    checkPermission: handleCheckPermission,
  };
}

export default useNotification;
