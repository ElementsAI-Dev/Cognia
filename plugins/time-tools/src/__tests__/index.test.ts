/**
 * Time Tools Plugin Tests
 */

import { createMockContext, createMockToolContext } from '@cognia/plugin-sdk';
import type { MockPluginContext } from '@cognia/plugin-sdk';
import plugin from '../index';

describe('Time Tools Plugin', () => {
  let context: MockPluginContext;

  beforeEach(() => {
    context = createMockContext({
      pluginId: 'cognia-time-tools',
      config: { defaultTimezone: 'UTC', defaultFormat: 'ISO' },
    });
  });

  afterEach(() => {
    plugin.deactivate?.();
    context.reset();
  });

  describe('activation', () => {
    it('should activate and register 7 tools', () => {
      plugin.activate(context);
      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('7 time tools') })
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
        hooks.onConfigChange({ defaultTimezone: 'US/Eastern', defaultFormat: 'short' });
        expect(context.logger.logs).toContainEqual(
          expect.objectContaining({ message: 'Time Tools config updated' })
        );
      }
    });

    it('should handle onCommand', () => {
      const hooks = plugin.activate(context);
      if (hooks && 'onCommand' in hooks && hooks.onCommand) {
        expect(hooks.onCommand('time-tools.now')).toBe(true);
        expect(hooks.onCommand('time-tools.active-timers')).toBe(true);
        expect(hooks.onCommand('unknown')).toBe(false);
      }
    });
  });

  describe('deactivate', () => {
    it('should clean up without errors', () => {
      plugin.activate(context);
      expect(() => plugin.deactivate?.()).not.toThrow();
    });
  });

  describe('tools - time_now', () => {
    it('should return current time', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_now');

      const result = await tool!.execute({}, toolContext) as { success: boolean; timestamp: string; formatted: string };
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.formatted).toBeDefined();
    });
  });

  describe('tools - time_timer', () => {
    it('should start a timer', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_timer');

      const result = await tool!.execute(
        { action: 'start', label: 'Test Timer' },
        toolContext
      ) as { success: boolean; id: string; label: string };

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.label).toBe('Test Timer');
    });

    it('should list timers', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_timer');

      await tool!.execute({ action: 'start', label: 'Timer 1' }, toolContext);
      const result = await tool!.execute({ action: 'list' }, toolContext) as {
        success: boolean; timers: unknown[]; count: number;
      };

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should stop a timer', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_timer');

      const startResult = await tool!.execute(
        { action: 'start', label: 'Stoppable' },
        toolContext
      ) as { id: string };

      const stopResult = await tool!.execute(
        { action: 'stop', id: startResult.id },
        toolContext
      ) as { success: boolean; elapsedSeconds: number };

      expect(stopResult.success).toBe(true);
      expect(stopResult.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should persist timer to storage', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_timer');

      await tool!.execute({ action: 'start', label: 'Persist' }, toolContext);

      const stored = await context.storage.get('activeTimers');
      expect(stored).toBeDefined();
      expect(Array.isArray(stored)).toBe(true);
    });
  });

  describe('tools - time_list_timezones', () => {
    it('should list all timezones', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_list_timezones');

      const result = await tool!.execute({}, toolContext) as {
        success: boolean; timezones: unknown[]; count: number; totalAvailable: number;
      };

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
      expect(result.totalAvailable).toBe(result.count);
    });

    it('should filter timezones', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_list_timezones');

      const result = await tool!.execute({ filter: 'US' }, toolContext) as {
        success: boolean; count: number; totalAvailable: number;
      };

      expect(result.success).toBe(true);
      expect(result.count).toBeLessThan(result.totalAvailable);
    });
  });

  describe('events', () => {
    it('should clear timers via event', async () => {
      plugin.activate(context);
      const toolContext = createMockToolContext();
      const agentApi = context.agent as unknown as { _tools: Map<string, { execute: (args: Record<string, unknown>, ctx: unknown) => Promise<unknown> }> };
      const tool = agentApi._tools.get('time_timer');

      await tool!.execute({ action: 'start', label: 'Clearable' }, toolContext);

      context.events.emit('time-tools:clear-timers');
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(context.logger.logs).toContainEqual(
        expect.objectContaining({ message: 'All timers cleared' })
      );
    });
  });
});
