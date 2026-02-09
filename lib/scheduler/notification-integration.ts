/**
 * Scheduler Notification Integration
 * Integrates with existing notification systems (desktop, toast, webhook)
 */

import type { ScheduledTask, TaskExecution, NotificationChannel } from '@/types/scheduler';
import { sendNotification } from '@/lib/native/notification';
import { toast } from '@/components/ui/toaster';
import { loggers } from '@/lib/logger';

// Logger
const log = loggers.app;

type TaskEventType = 'start' | 'progress' | 'complete' | 'error';

/**
 * Notify about a task event
 */
export async function notifyTaskEvent(
  task: ScheduledTask,
  execution: TaskExecution,
  eventType: TaskEventType
): Promise<void> {
  const channels = task.notification.channels ?? [];
  
  if (channels.includes('none') || channels.length === 0) {
    return;
  }

  const { title, body, icon } = getNotificationContent(task, execution, eventType);

  // Send to each configured channel
  for (const channel of channels) {
    try {
      await sendToChannel(channel, title, body, icon, task, execution, eventType);
    } catch (error) {
      log.error(`Failed to send notification to ${channel}:`, error);
    }
  }
}

/**
 * Get notification content based on event type
 */
function getNotificationContent(
  task: ScheduledTask,
  execution: TaskExecution,
  eventType: TaskEventType
): { title: string; body: string; icon: string } {
  switch (eventType) {
    case 'start':
      return {
        title: `Task Started: ${task.name}`,
        body: `The scheduled task "${task.name}" has started execution.`,
        icon: '🚀',
      };

    case 'progress':
      return {
        title: `Task Progress: ${task.name}`,
        body: `Task "${task.name}" is in progress...`,
        icon: '⏳',
      };

    case 'complete':
      const duration = execution.duration 
        ? `Completed in ${formatDuration(execution.duration)}.`
        : 'Completed successfully.';
      return {
        title: `Task Completed: ${task.name}`,
        body: `The scheduled task "${task.name}" has completed. ${duration}`,
        icon: '✅',
      };

    case 'error':
      return {
        title: `Task Failed: ${task.name}`,
        body: `The scheduled task "${task.name}" failed: ${execution.error || 'Unknown error'}`,
        icon: '❌',
      };

    default:
      return {
        title: `Task Event: ${task.name}`,
        body: `Event occurred for task "${task.name}".`,
        icon: 'ℹ️',
      };
  }
}

/**
 * Send notification to a specific channel
 */
async function sendToChannel(
  channel: NotificationChannel,
  title: string,
  body: string,
  _icon: string,
  task: ScheduledTask,
  execution: TaskExecution,
  eventType: TaskEventType
): Promise<void> {
  switch (channel) {
    case 'desktop':
      await sendDesktopNotification(title, body);
      break;

    case 'toast':
      sendToastNotification(title, body, eventType);
      break;

    case 'webhook':
      if (task.notification.webhookUrl) {
        await sendWebhookNotification(task.notification.webhookUrl, {
          task: {
            id: task.id,
            name: task.name,
            type: task.type,
          },
          execution: {
            id: execution.id,
            status: execution.status,
            duration: execution.duration,
            error: execution.error,
          },
          eventType,
          timestamp: new Date().toISOString(),
        });
      }
      break;

    case 'none':
      // Do nothing
      break;
  }
}

/**
 * Send desktop notification
 */
async function sendDesktopNotification(title: string, body: string): Promise<void> {
  try {
    await sendNotification({ title, body });
    log.debug(`Desktop notification sent: ${title}`);
  } catch (error) {
    log.warn('Failed to send desktop notification:', { error });
  }
}

/**
 * Send toast notification
 */
function sendToastNotification(title: string, body: string, eventType: TaskEventType): void {
  switch (eventType) {
    case 'complete':
      toast.success(title, body);
      break;
    case 'error':
      toast.error(title, body);
      break;
    case 'start':
    case 'progress':
    default:
      toast.info(title, body);
      break;
  }
  log.debug(`Toast notification sent: ${title}`);
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(
  url: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }

    log.debug(`Webhook notification sent to: ${url}`);
  } catch (error) {
    log.error(`Failed to send webhook notification to ${url}:`, error);
    throw error;
  }
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * Test notification channels
 */
export async function testNotificationChannel(
  channel: NotificationChannel,
  webhookUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (channel) {
      case 'desktop':
        await sendDesktopNotification(
          'Notification Test',
          'This is a test notification from the scheduler.'
        );
        break;

      case 'toast':
        sendToastNotification(
          'Notification Test',
          'This is a test notification from the scheduler.',
          'start'
        );
        break;

      case 'webhook':
        if (!webhookUrl) {
          return { success: false, error: 'Webhook URL is required' };
        }
        await sendWebhookNotification(webhookUrl, {
          test: true,
          message: 'This is a test notification from the scheduler.',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'none':
        return { success: true };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}
