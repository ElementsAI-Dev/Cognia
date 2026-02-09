/**
 * Notification Tools Plugin
 *
 * Notifications and reminders for AI agents.
 * Provides persistent reminders, toast notifications, and reminder management.
 */

import { definePlugin, defineCommand, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// State
// ============================================================================

const reminders: Map<string, Reminder> = new Map();
const timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
const eventCleanups: Array<() => void> = [];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Persistence Helpers
// ============================================================================

async function saveRemindersToStorage(context: PluginContext): Promise<void> {
  const data = Array.from(reminders.values());
  await context.storage.set('reminders', data);
}

async function loadRemindersFromStorage(context: PluginContext): Promise<void> {
  const data = await context.storage.get<Reminder[]>('reminders');
  if (!data) return;

  const now = Date.now();
  for (const reminder of data) {
    if (reminder.triggered) continue;
    if (reminder.triggerAt <= now) {
      // Already past — trigger immediately
      reminder.triggered = true;
      context.ui.showNotification({
        title: 'Reminder',
        message: reminder.message,
        type: 'info',
      });
      context.events.emit('notification-tools:reminder-triggered', { id: reminder.id, message: reminder.message });
    } else {
      // Schedule timer
      reminders.set(reminder.id, reminder);
      const delay = reminder.triggerAt - now;
      const timer = setTimeout(() => {
        reminder.triggered = true;
        context.ui.showNotification({
          title: 'Reminder',
          message: reminder.message,
          type: 'info',
        });
        context.events.emit('notification-tools:reminder-triggered', { id: reminder.id, message: reminder.message });
        context.logger.info(`Reminder triggered: ${reminder.message}`);
        saveRemindersToStorage(context);
      }, delay);
      timers.set(reminder.id, timer);
    }
  }
}

// ============================================================================
// Tools
// ============================================================================

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
    execute: async (args: { title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }, _toolContext: PluginToolContext) => {
      const type = args.type || 'info';

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

function createToastTool(context: PluginContext) {
  return {
    name: 'toast',
    description: 'Show a lightweight toast notification that auto-dismisses',
    parametersSchema: parameters(
      {
        message: Schema.string('Toast message'),
        type: Schema.enum(['info', 'success', 'warning', 'error'], 'Toast type'),
      },
      ['message']
    ),
    execute: async (args: { message: string; type?: 'info' | 'success' | 'warning' | 'error' }, _toolContext: PluginToolContext) => {
      const type = args.type || 'info';

      context.ui.showNotification({
        title: '',
        message: args.message,
        type,
      });

      return {
        success: true,
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
    description: 'Set a reminder that will notify the user after a delay or at a specific time. Reminders persist across sessions.',
    parametersSchema: parameters(
      {
        message: Schema.string('Reminder message'),
        delaySeconds: Schema.number('Delay in seconds before reminder'),
        at: Schema.string('Specific time for reminder (ISO format or "HH:MM")'),
      },
      ['message']
    ),
    execute: async (args: { message: string; delaySeconds?: number; at?: string }, _toolContext: PluginToolContext) => {
      if (reminders.size >= config.maxReminders) {
        return {
          success: false,
          error: `Maximum reminders reached (${config.maxReminders})`,
        };
      }

      let triggerAt: number;

      if (args.at) {
        const now = new Date();
        let targetDate: Date;

        if (args.at.includes('T') || args.at.includes('-')) {
          targetDate = new Date(args.at);
        } else if (args.at.includes(':')) {
          const [hours, minutes] = args.at.split(':').map(Number);
          targetDate = new Date(now);
          targetDate.setHours(hours, minutes, 0, 0);

          if (targetDate.getTime() <= now.getTime()) {
            targetDate.setDate(targetDate.getDate() + 1);
          }
        } else {
          return { success: false, error: 'Invalid time format' };
        }

        triggerAt = targetDate.getTime();
      } else if (args.delaySeconds) {
        triggerAt = Date.now() + args.delaySeconds * 1000;
      } else {
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

      const delay = Math.max(0, triggerAt - Date.now());
      const timer = setTimeout(() => {
        reminder.triggered = true;
        context.ui.showNotification({
          title: 'Reminder',
          message: args.message,
          type: 'info',
        });
        context.events.emit('notification-tools:reminder-triggered', { id: reminder.id, message: reminder.message });
        context.logger.info(`Reminder triggered: ${args.message}`);
        saveRemindersToStorage(context);
      }, delay);

      timers.set(reminder.id, timer);

      // Persist to storage
      await saveRemindersToStorage(context);

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

function createListRemindersTool() {
  return {
    name: 'list_reminders',
    description: 'List all active (non-triggered) reminders',
    parametersSchema: parameters(
      {
        includeTriggered: Schema.boolean('Include already triggered reminders'),
      },
      []
    ),
    execute: async (args: { includeTriggered?: boolean }, _toolContext: PluginToolContext) => {
      const all = Array.from(reminders.values());
      const filtered = args.includeTriggered ? all : all.filter((r) => !r.triggered);

      const result = filtered.map((r) => ({
        id: r.id,
        message: r.message,
        triggerAt: new Date(r.triggerAt).toISOString(),
        created: new Date(r.created).toISOString(),
        triggered: r.triggered,
        remainingSeconds: r.triggered ? 0 : Math.max(0, Math.round((r.triggerAt - Date.now()) / 1000)),
      }));

      return {
        success: true,
        reminders: result,
        activeCount: all.filter((r) => !r.triggered).length,
        totalCount: all.length,
      };
    },
  };
}

function createCancelReminderTool(context: PluginContext) {
  return {
    name: 'cancel_reminder',
    description: 'Cancel a pending reminder by its ID',
    parametersSchema: parameters(
      {
        id: Schema.string('Reminder ID to cancel'),
      },
      ['id']
    ),
    execute: async (args: { id: string }, _toolContext: PluginToolContext) => {
      const reminder = reminders.get(args.id);
      if (!reminder) {
        return { success: false, error: `Reminder not found: ${args.id}` };
      }

      if (reminder.triggered) {
        return { success: false, error: 'Reminder has already been triggered' };
      }

      // Clear timer
      const timer = timers.get(args.id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(args.id);
      }

      reminders.delete(args.id);

      // Persist
      await saveRemindersToStorage(context);

      context.events.emit('notification-tools:reminder-cancelled', { id: args.id, message: reminder.message });
      context.logger.info(`Reminder cancelled: ${reminder.message}`);

      return {
        success: true,
        id: args.id,
        message: reminder.message,
      };
    },
  };
}

// ============================================================================
// Commands
// ============================================================================

function createNotificationCommands(context: PluginContext) {
  return [
    defineCommand(
      'notification-tools.list-reminders',
      'List Reminders',
      async () => {
        const active = Array.from(reminders.values()).filter((r) => !r.triggered);
        const msg = active.length > 0
          ? active.map((r) => `- ${r.message} (${new Date(r.triggerAt).toLocaleTimeString()})`).join('\n')
          : 'No active reminders';
        context.ui.showNotification({
          title: `Active Reminders (${active.length})`,
          message: msg,
          type: 'info',
        });
      },
      { description: 'Show all active reminders', icon: 'bell' }
    ),
    defineCommand(
      'notification-tools.clear-all',
      'Clear All Reminders',
      async () => {
        for (const timer of timers.values()) {
          clearTimeout(timer);
        }
        timers.clear();
        const count = reminders.size;
        reminders.clear();
        await context.storage.delete('reminders');

        context.ui.showNotification({
          title: 'Reminders Cleared',
          message: `Cleared ${count} reminder(s)`,
          type: 'success',
        });
        context.logger.info(`Cleared ${count} reminders`);
      },
      { description: 'Clear all pending reminders', icon: 'bell-off' }
    ),
  ];
}

// ============================================================================
// Plugin Definition
// ============================================================================

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Notification Tools plugin activated');

    const config: NotificationConfig = {
      maxReminders: (context.config.maxReminders as number) || 100,
    };

    // Restore persisted reminders
    loadRemindersFromStorage(context).then(() => {
      context.logger.info(`Restored ${reminders.size} reminder(s) from storage`);
    });

    // Register tools
    const tools = [
      createNotifyTool(context),
      createToastTool(context),
      createRemindTool(config, context),
      createListRemindersTool(),
      createCancelReminderTool(context),
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

    // Register commands
    const commands = createNotificationCommands(context);
    context.logger.info(`Registered ${commands.length} commands`);

    // Event listeners
    const unsub1 = context.events.on('notification-tools:clear-all', async () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      reminders.clear();
      await context.storage.delete('reminders');
      context.logger.info('All reminders cleared via event');
    });
    eventCleanups.push(unsub1);

    return {
      onEnable: async () => context.logger.info('Notification Tools enabled'),
      onDisable: async () => {
        // Save state before disabling
        await saveRemindersToStorage(context);
        // Clear timers but keep reminder data in storage
        for (const timer of timers.values()) {
          clearTimeout(timer);
        }
        timers.clear();
        reminders.clear();
        context.logger.info('Notification Tools disabled — reminders saved to storage');
      },
      onConfigChange: (newConfig: Record<string, unknown>) => {
        config.maxReminders = (newConfig.maxReminders as number) || 100;
        context.logger.info('Notification Tools config updated');
      },
      onCommand: (commandId: string) => {
        const command = commands.find((c) => c.id === commandId);
        if (command) {
          command.execute();
          return true;
        }
        return false;
      },
    };
  },

  deactivate() {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    reminders.clear();
    for (const cleanup of eventCleanups) {
      cleanup();
    }
    eventCleanups.length = 0;
  },
});
