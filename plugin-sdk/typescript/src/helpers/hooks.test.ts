/**
 * Tests for Hook Composition Helpers
 */

import { composeHooks, defineHooks, conditionalHook, debouncedHook } from './hooks';
import type { PluginHooksAll } from '../hooks/extended';

describe('Hook Composition Helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('defineHooks', () => {
    it('should return the same hooks object', () => {
      const hooks: Partial<PluginHooksAll> = { onMessageDelete: jest.fn() };
      const result = defineHooks(hooks);
      expect(result).toBe(hooks);
    });

    it('should accept partial hooks', () => {
      const hooks = defineHooks({
        onSessionCreate: jest.fn(),
      });
      expect(hooks.onSessionCreate).toBeDefined();
    });
  });

  describe('composeHooks', () => {
    it('should merge non-overlapping hooks', () => {
      const hooks1: Partial<PluginHooksAll> = { onMessageDelete: jest.fn() };
      const hooks2: Partial<PluginHooksAll> = { onSessionCreate: jest.fn() };

      const composed = composeHooks(hooks1, hooks2);

      expect(composed.onMessageDelete).toBeDefined();
      expect(composed.onSessionCreate).toBeDefined();
    });

    it('should chain overlapping hooks in order', async () => {
      const callOrder: number[] = [];
      const hooks1: Partial<PluginHooksAll> = {
        onMessageDelete: jest.fn(() => { callOrder.push(1); }),
      };
      const hooks2: Partial<PluginHooksAll> = {
        onMessageDelete: jest.fn(() => { callOrder.push(2); }),
      };

      const composed = composeHooks(hooks1, hooks2);
      await (composed.onMessageDelete as unknown as (...args: unknown[]) => Promise<void>)('msg-1', 'session-1');

      expect(callOrder).toEqual([1, 2]);
    });

    it('should handle three or more hook sets', async () => {
      const callOrder: number[] = [];
      const hooks1: Partial<PluginHooksAll> = { onSessionCreate: jest.fn(() => { callOrder.push(1); }) };
      const hooks2: Partial<PluginHooksAll> = { onSessionCreate: jest.fn(() => { callOrder.push(2); }) };
      const hooks3: Partial<PluginHooksAll> = { onSessionCreate: jest.fn(() => { callOrder.push(3); }) };

      const composed = composeHooks(hooks1, hooks2, hooks3);
      await (composed.onSessionCreate as unknown as (...args: unknown[]) => Promise<void>)('session-1');

      expect(callOrder).toEqual([1, 2, 3]);
    });

    it('should handle empty hook sets', () => {
      const composed = composeHooks({}, {});
      expect(Object.keys(composed)).toHaveLength(0);
    });

    it('should ignore non-function properties', () => {
      const hooks = { nonFunction: 'string value' } as unknown as Partial<PluginHooksAll>;
      const composed = composeHooks(hooks);
      expect(composed).not.toHaveProperty('nonFunction');
    });
  });

  describe('conditionalHook', () => {
    it('should execute hook when condition is true', () => {
      const handler = jest.fn();
      const hooks = conditionalHook(() => true, { onSessionCreate: handler });

      (hooks.onSessionCreate as unknown as (...args: unknown[]) => void)('session-1');
      expect(handler).toHaveBeenCalledWith('session-1');
    });

    it('should not execute hook when condition is false', () => {
      const handler = jest.fn();
      const hooks = conditionalHook(() => false, { onSessionCreate: handler });

      (hooks.onSessionCreate as unknown as (...args: unknown[]) => void)('session-1');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should re-evaluate condition on each call', () => {
      let flag = false;
      const handler = jest.fn();
      const hooks = conditionalHook(() => flag, { onSessionCreate: handler });

      (hooks.onSessionCreate as unknown as (...args: unknown[]) => void)('session-1');
      expect(handler).not.toHaveBeenCalled();

      flag = true;
      (hooks.onSessionCreate as unknown as (...args: unknown[]) => void)('session-2');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('debouncedHook', () => {
    it('should debounce hook execution', () => {
      const handler = jest.fn();
      const hooks = debouncedHook({ onMessageDelete: handler }, 300);

      (hooks.onMessageDelete as unknown as (...args: unknown[]) => void)('msg-1', 'session-1');
      (hooks.onMessageDelete as unknown as (...args: unknown[]) => void)('msg-2', 'session-1');
      (hooks.onMessageDelete as unknown as (...args: unknown[]) => void)('msg-3', 'session-1');

      expect(handler).not.toHaveBeenCalled();

      jest.advanceTimersByTime(300);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('msg-3', 'session-1');
    });

    it('should use default delay of 300ms', () => {
      const handler = jest.fn();
      const hooks = debouncedHook({ onSessionCreate: handler });

      (hooks.onSessionCreate as unknown as (...args: unknown[]) => void)('session-1');

      jest.advanceTimersByTime(299);
      expect(handler).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple different hooks independently', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const hooks = debouncedHook({
        onMessageDelete: handler1,
        onSessionCreate: handler2,
      }, 200);

      (hooks.onMessageDelete as unknown as (...args: unknown[]) => void)('msg-1', 'session-1');
      jest.advanceTimersByTime(100);
      (hooks.onSessionCreate as unknown as (...args: unknown[]) => void)('session-1');
      jest.advanceTimersByTime(100);

      // onMessageDelete should have fired (200ms elapsed)
      expect(handler1).toHaveBeenCalledTimes(1);
      // onSessionCreate should not yet (only 100ms elapsed)
      expect(handler2).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });
});
