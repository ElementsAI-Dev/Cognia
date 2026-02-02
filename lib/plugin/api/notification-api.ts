/**
 * Plugin Notification Center API Implementation
 * 
 * Provides notification capabilities to plugins.
 */

import type {
  PluginNotificationCenterAPI,
  NotificationOptions,
  Notification,
} from '@/types/plugin/plugin-extended';
import { nanoid } from 'nanoid';
import { createPluginSystemLogger } from '../core/logger';

// Global notification registry
const notifications = new Map<string, Notification>();
const actionHandlers = new Map<string, (id: string, action: string) => void>();

/**
 * Create the Notification Center API for a plugin
 */
export function createNotificationCenterAPI(pluginId: string): PluginNotificationCenterAPI {
  const logger = createPluginSystemLogger(pluginId);
  return {
    create: (options: NotificationOptions): string => {
      const id = `${pluginId}:${nanoid()}`;
      
      const notification: Notification = {
        id,
        title: options.title,
        message: options.message,
        type: options.type || 'info',
        createdAt: new Date(),
        actions: options.actions,
        progress: options.progress,
        persistent: options.persistent || false,
      };

      notifications.set(id, notification);

      // Auto-dismiss non-persistent notifications
      if (!options.persistent && options.duration !== 0) {
        const duration = options.duration || 5000;
        setTimeout(() => {
          notifications.delete(id);
        }, duration);
      }

      // Log for now - would integrate with toast system
      logger.info(`Notification: ${options.title} - ${options.message}`);
      
      return id;
    },

    update: (id: string, updates: Partial<NotificationOptions>) => {
      const notification = notifications.get(id);
      if (notification) {
        Object.assign(notification, {
          title: updates.title ?? notification.title,
          message: updates.message ?? notification.message,
          type: updates.type ?? notification.type,
          progress: updates.progress ?? notification.progress,
          actions: updates.actions ?? notification.actions,
        });
      }
    },

    dismiss: (id: string) => {
      notifications.delete(id);
      logger.info(`Dismissed notification: ${id}`);
    },

    dismissAll: () => {
      // Only dismiss this plugin's notifications
      const prefix = `${pluginId}:`;
      for (const key of notifications.keys()) {
        if (key.startsWith(prefix)) {
          notifications.delete(key);
        }
      }
      logger.info('Dismissed all notifications');
    },

    getAll: (): Notification[] => {
      const prefix = `${pluginId}:`;
      return Array.from(notifications.values())
        .filter(n => n.id.startsWith(prefix));
    },

    onAction: (handler: (id: string, action: string) => void) => {
      const handlerId = `${pluginId}:${nanoid()}`;
      actionHandlers.set(handlerId, handler);

      return () => {
        actionHandlers.delete(handlerId);
      };
    },

    createProgress: (title: string, message: string) => {
      const id = `${pluginId}:${nanoid()}`;
      
      const notification: Notification = {
        id,
        title,
        message,
        type: 'info',
        createdAt: new Date(),
        progress: 0,
        persistent: true,
      };

      notifications.set(id, notification);
      logger.info(`Progress notification: ${title}`);

      return {
        id,
        update: (progress: number, newMessage?: string) => {
          const n = notifications.get(id);
          if (n) {
            n.progress = Math.min(100, Math.max(0, progress));
            if (newMessage) n.message = newMessage;
          }
        },
        complete: (completeMessage?: string) => {
          const n = notifications.get(id);
          if (n) {
            n.progress = 100;
            n.type = 'success';
            if (completeMessage) n.message = completeMessage;
            
            // Auto-dismiss after completion
            setTimeout(() => {
              notifications.delete(id);
            }, 3000);
          }
        },
        error: (errorMessage: string) => {
          const n = notifications.get(id);
          if (n) {
            n.type = 'error';
            n.message = errorMessage;
            n.persistent = false;
            
            // Auto-dismiss after error
            setTimeout(() => {
              notifications.delete(id);
            }, 5000);
          }
        },
      };
    },
  };
}

/**
 * Dispatch a notification action
 */
export function dispatchNotificationAction(notificationId: string, action: string) {
  for (const handler of actionHandlers.values()) {
    handler(notificationId, action);
  }
}
