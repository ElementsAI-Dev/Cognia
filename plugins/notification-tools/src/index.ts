/**
 * Notification Tools Plugin
 *
 * Notifications and reminders for AI agents.
 */

import { definePlugin, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

interface NotificationConfig {
  maxReminders: number;
}

interface Reminder {
  id: string;
  message: string;
  triggerAt: number;
  created: number;
  triggered: boolean;
}

const reminders: Map<string, Reminder> = new Map();
const timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface NotifyArgs {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface RemindArgs {
  message: string;
  delaySeconds?: number;
  at?: string;
}

function createNotifyTool(context: PluginContext) {
  return {
    name: 'notify',
    description: 'Send a notification to the user',
    parametersSchema: parameters(
      {
        title: Schema.string('Notification title'),
        message: Schema.string('Notification message'),
        type: Schema.enum(['info', 'success', 'warning', 'error'], 'Notification type'),
      },
      ['title', 'message']
    ),
    execute: async (args: NotifyArgs, _toolContext: PluginToolContext) => {
      const type = args.type || 'info';

      // Use the UI API to show notification
      context.ui.showNotification({
        title: args.title,
        message: args.message,
        type,
      });

      context.logger.info(`Notification sent: ${args.title}`);

      return {
        success: true,
        title: args.title,
        message: args.message,
        type,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

function createRemindTool(config: NotificationConfig, context: PluginContext) {
  return {
    name: 'remind',
    description: 'Set a reminder that will notify the user after a delay or at a specific time',
    parametersSchema: parameters(
      {
        message: Schema.string('Reminder message'),
        delaySeconds: Schema.number('Delay in seconds before reminder'),
        at: Schema.string('Specific time for reminder (ISO format or "HH:MM")'),
      },
      ['message']
    ),
    execute: async (args: RemindArgs, _toolContext: PluginToolContext) => {
      if (reminders.size >= config.maxReminders) {
        return {
          success: false,
          error: `Maximum reminders reached (${config.maxReminders})`,
        };
      }

      let triggerAt: number;

      if (args.at) {
        // Parse time string
        const now = new Date();
        let targetDate: Date;

        if (args.at.includes('T') || args.at.includes('-')) {
          // ISO format
          targetDate = new Date(args.at);
        } else if (args.at.includes(':')) {
          // HH:MM format - set for today or tomorrow
          const [hours, minutes] = args.at.split(':').map(Number);
          targetDate = new Date(now);
          targetDate.setHours(hours, minutes, 0, 0);

          if (targetDate.getTime() <= now.getTime()) {
            // Already passed today, set for tomorrow
            targetDate.setDate(targetDate.getDate() + 1);
          }
        } else {
          return { success: false, error: 'Invalid time format' };
        }

        triggerAt = targetDate.getTime();
      } else if (args.delaySeconds) {
        triggerAt = Date.now() + args.delaySeconds * 1000;
      } else {
        // Default: 5 minutes
        triggerAt = Date.now() + 5 * 60 * 1000;
      }

      const reminder: Reminder = {
        id: generateId(),
        message: args.message,
        triggerAt,
        created: Date.now(),
        triggered: false,
      };

      reminders.set(reminder.id, reminder);

      // Set timer
      const delay = Math.max(0, triggerAt - Date.now());
      const timer = setTimeout(() => {
        reminder.triggered = true;
        context.ui.showNotification({
          title: '⏰ Reminder',
          message: args.message,
          type: 'info',
        });
        context.logger.info(`Reminder triggered: ${args.message}`);
      }, delay);

      timers.set(reminder.id, timer);

      context.logger.info(`Reminder set for ${new Date(triggerAt).toISOString()}`);

      return {
        success: true,
        id: reminder.id,
        message: args.message,
        triggerAt: new Date(triggerAt).toISOString(),
        delaySeconds: Math.round(delay / 1000),
      };
    },
  };
}

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Notification Tools plugin activated');

    const config: NotificationConfig = {
      maxReminders: (context.config.maxReminders as number) || 100,
    };

    const tools = [
      createNotifyTool(context),
      createRemindTool(config, context),
    ];

    for (const tool of tools) {
      context.agent.registerTool({
        name: tool.name,
        pluginId: context.pluginId,
        definition: {
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
        },
        execute: tool.execute,
      });
    }

    context.logger.info(`Registered ${tools.length} notification tools`);

    return {
      onEnable: async () => context.logger.info('Notification Tools enabled'),
      onDisable: async () => {
        // Clear all timers
        for (const timer of timers.values()) {
          clearTimeout(timer);
        }
        timers.clear();
        reminders.clear();
        context.logger.info('Notification Tools disabled');
      },
    };
  },
});
