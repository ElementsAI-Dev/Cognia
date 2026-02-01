/**
 * Native Notifications - System notification support for desktop
 */

import { isTauri } from './utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  sound?: string;
}

/**
 * Check if notification permission is granted
 */
export async function isNotificationPermissionGranted(): Promise<boolean> {
  if (!isTauri()) {
    // Browser fallback
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  try {
    const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    return await isPermissionGranted();
  } catch {
    return false;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isTauri()) {
    // Browser fallback
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  try {
    const { requestPermission, isPermissionGranted } = await import('@tauri-apps/plugin-notification');
    
    const granted = await isPermissionGranted();
    if (granted) return true;
    
    await requestPermission();
    return await isPermissionGranted();
  } catch {
    return false;
  }
}

/**
 * Send a system notification
 */
export async function sendNotification(options: NotificationOptions): Promise<boolean> {
  if (!isTauri()) {
    // Browser fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon,
      });
      return true;
    }
    return false;
  }

  try {
    const { sendNotification: tauriNotify } = await import('@tauri-apps/plugin-notification');
    // Build notification options, only including defined properties
    const notifOptions: { title: string; body?: string; sound?: string } = {
      title: options.title,
    };
    if (options.body) notifOptions.body = options.body;
    if (options.sound) notifOptions.sound = options.sound;
    
    await tauriNotify(notifOptions);
    return true;
  } catch (error) {
    log.error('Failed to send notification', error as Error);
    return false;
  }
}

/**
 * Send a simple notification with just title and body
 */
export async function notify(title: string, body?: string): Promise<boolean> {
  return sendNotification({ title, body });
}
