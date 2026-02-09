/**
 * Notification Tools Plugin Tests
 */

import { createMockContext, createMockToolContext } from '@cognia/plugin-sdk';
import type { MockPluginContext } from '@cognia/plugin-sdk';
import plugin from '../index';

describe('Notification Tools Plugin', () => {
  let context: MockPluginContext;

  beforeEach(() => {
    context = createMockContext({
      pluginId: 'cognia-notification-tools',
      config: { maxReminders: 10 },
    });
  });

  afterEach(() => {
    plugin.deactivate?.();
    context.reset();
  });

  describe('activation', () => {
    it('should activate and register 5 tools', () => {
      plugin.activate(context);
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('5 notification tools') })
      );
    });

    it('should register 2 commands', () => {
      plugin.activate(context);
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('2 commands') })
      );
    });
  });

  describe('hooks', () => {
    it('should handle onConfigChange', () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onConfigChange' in hooks && hooks.onConfigChange) {
        hooks.onConfigChange({ maxReminders: 50 });
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Notification Tools config updated' })
        );
      }
    });

    it('should handle onCommand', () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onCommand' in hooks && hooks.onCommand) {
        expect(hooks.onCommand('notification-tools.list-reminders')).toBe(true);
        expect(hooks.onCommand('unknown')).toBe(false);
      }
    });

    it('should save reminders on disable', async () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onDisable' in hooks && hooks.onDisable) {
        await hooks.onDisable();
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: expect.stringContaining('reminders saved to storage') })
        );
      }
    });
  });

  describe('deactivate', () => {
    it('should clean up without errors', () => {
      plugin.activate(context);
      expect(() => plugin.deactivate?.()).not.toThrow();
    });
  });

  describe('tools - notify', () => {
    it('should send a notification', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('notify');

      const result = await tool!.execute(
        { title: 'Test', message: 'Hello world' },
        toolContext
      ) as { success: boolean; title: string };

      expect(result.success).toBe(true);
      expect(result.title).toBe('Test');
    });
  });

  describe('tools - toast', () => {
    it('should send a toast notification', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('toast');

      const result = await tool!.execute(
        { message: 'Quick toast', type: 'success' },
        toolContext
      ) as { success: boolean; message: string; type: string };

      expect(result.success).toBe(true);
      expect(result.message).toBe('Quick toast');
      expect(result.type).toBe('success');
    });
  });

  describe('tools - remind', () => {
    it('should set a reminder with delay', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('remind');

      const result = await tool!.execute(
        { message: 'Test reminder', delaySeconds: 60 },
        toolContext
      ) as { success: boolean; id: string; message: string };

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.message).toBe('Test reminder');
    });

    it('should persist reminder to storage', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('remind');

      await tool!.execute({ message: 'Persist test', delaySeconds: 300 }, toolContext);

      const stored = await context.storage.get('reminders');
      expect(stored).toBeDefined();
      expect(Array.isArray(stored)).toBe(true);
    });

    it('should enforce max reminders limit', async () => {
      context = createMockContext({
        pluginId: 'cognia-notification-tools',
        config: { maxReminders: 1 },
      });
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('remind');

      await tool!.execute({ message: 'First', delaySeconds: 600 }, toolContext);
      const result = await tool!.execute(
        { message: 'Second', delaySeconds: 600 },
        toolContext
      ) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum reminders reached');
    });
  });

  describe('tools - list_reminders', () => {
    it('should list active reminders', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };

      // Set a reminder first
      const remindTool = agentApi._tools.get('remind');
      await remindTool!.execute({ message: 'Listed', delaySeconds: 600 }, toolContext);

      const listTool = agentApi._tools.get('list_reminders');
      const result = await listTool!.execute({}, toolContext) as {
        success: boolean;
        reminders: unknown[];
        activeCount: number;
      };

      expect(result.success).toBe(true);
      expect(result.activeCount).toBe(1);
      expect(result.reminders).toHaveLength(1);
    });
  });

  describe('tools - cancel_reminder', () => {
    it('should cancel a pending reminder', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };

      // Set a reminder
      const remindTool = agentApi._tools.get('remind');
      const remindResult = await remindTool!.execute(
        { message: 'Cancel me', delaySeconds: 600 },
        toolContext
      ) as { id: string };

      // Cancel it
      const cancelTool = agentApi._tools.get('cancel_reminder');
      const result = await cancelTool!.execute(
        { id: remindResult.id },
        toolContext
      ) as { success: boolean; id: string };

      expect(result.success).toBe(true);
      expect(result.id).toBe(remindResult.id);

      // Verify event emitted
      expect(context.events.emittedEvents).toContainEqual(
        expect.objectContaining({ event: 'notification-tools:reminder-cancelled' })
      );
    });

    it('should fail for non-existent reminder', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };

      const cancelTool = agentApi._tools.get('cancel_reminder');
      const result = await cancelTool!.execute(
        { id: 'non-existent' },
        toolContext
      ) as { success: boolean; error: string };

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
});
