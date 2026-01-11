/**
 * Tests for Extended Hooks Manager
 */

import {
  ExtendedHooksManager,
  getExtendedHooksManager,
  resetExtendedHooksManager,
  type HookPriority,
} from './extended-hooks';

describe('ExtendedHooksManager', () => {
  let manager: ExtendedHooksManager;

  beforeEach(() => {
    resetExtendedHooksManager();
    manager = new ExtendedHooksManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe('Hook Registration', () => {
    it('should register a hook', () => {
      const hook = jest.fn();
      manager.registerHook('test-hook', 'plugin-a', hook);

      const registered = manager.getRegisteredHooks('test-hook');
      expect(registered.get('test-hook')).toContain('plugin-a');
    });

    it('should return unregister function', () => {
      const hook = jest.fn();
      const unregister = manager.registerHook('test-hook', 'plugin-a', hook);

      unregister();

      const registered = manager.getRegisteredHooks('test-hook');
      expect(registered.get('test-hook')).not.toContain('plugin-a');
    });

    it('should unregister hook by name and plugin', () => {
      const hook = jest.fn();
      manager.registerHook('test-hook', 'plugin-a', hook);
      manager.unregisterHook('test-hook', 'plugin-a');

      const registered = manager.getRegisteredHooks('test-hook');
      expect(registered.get('test-hook')).toBeUndefined();
    });

    it('should unregister all hooks for a plugin', () => {
      manager.registerHook('hook-1', 'plugin-a', jest.fn());
      manager.registerHook('hook-2', 'plugin-a', jest.fn());
      manager.registerHook('hook-1', 'plugin-b', jest.fn());

      manager.unregisterAllHooks('plugin-a');

      const allHooks = manager.getRegisteredHooks();
      expect(allHooks.get('hook-1')).not.toContain('plugin-a');
      expect(allHooks.get('hook-2')).toBeUndefined();
      expect(allHooks.get('hook-1')).toContain('plugin-b');
    });
  });

  describe('Hook Execution', () => {
    it('should execute hooks', async () => {
      const hook = jest.fn().mockReturnValue('result');
      manager.registerHook('test-hook', 'plugin-a', hook);

      const results = await manager.executeHook('test-hook', ['arg1', 'arg2']);

      expect(hook).toHaveBeenCalledWith('arg1', 'arg2');
      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('result');
    });

    it('should execute async hooks', async () => {
      const hook = jest.fn().mockResolvedValue('async result');
      manager.registerHook('async-hook', 'plugin-a', hook);

      const results = await manager.executeHook('async-hook', []);

      expect(results[0].success).toBe(true);
      expect(results[0].result).toBe('async result');
    });

    it('should handle hook errors', async () => {
      const hook = jest.fn().mockImplementation(() => {
        throw new Error('Hook error');
      });
      manager.registerHook('error-hook', 'plugin-a', hook);

      const results = await manager.executeHook('error-hook', []);

      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toBe('Hook error');
    });

    it('should skip disabled hooks', async () => {
      const hook = jest.fn();
      manager.registerHook('test-hook', 'plugin-a', hook, { enabled: false });

      const results = await manager.executeHook('test-hook', []);

      expect(results[0].skipped).toBe(true);
      expect(hook).not.toHaveBeenCalled();
    });

    it('should execute hooks in parallel', async () => {
      const order: number[] = [];

      manager.registerHook('parallel-hook', 'plugin-a', async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push(1);
      });
      manager.registerHook('parallel-hook', 'plugin-b', async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(2);
      });

      await manager.executeHook('parallel-hook', [], { parallel: true });

      expect(order).toEqual([2, 1]);
    });

    it('should stop on first result', async () => {
      const hook1 = jest.fn().mockReturnValue('first');
      const hook2 = jest.fn().mockReturnValue('second');

      manager.registerHook('stop-hook', 'plugin-a', hook1, { priority: 'high' });
      manager.registerHook('stop-hook', 'plugin-b', hook2, { priority: 'low' });

      const results = await manager.executeHook('stop-hook', [], { stopOnFirst: true });

      expect(results.length).toBe(1);
      expect(hook2).not.toHaveBeenCalled();
    });
  });

  describe('Priority', () => {
    it('should execute hooks in priority order', async () => {
      const order: string[] = [];

      manager.registerHook('priority-hook', 'plugin-low', () => order.push('low'), { priority: 'low' });
      manager.registerHook('priority-hook', 'plugin-high', () => order.push('high'), { priority: 'high' });
      manager.registerHook('priority-hook', 'plugin-normal', () => order.push('normal'), { priority: 'normal' });

      await manager.executeHook('priority-hook', []);

      expect(order).toEqual(['high', 'normal', 'low']);
    });

    it('should support all priority levels', async () => {
      const priorities: HookPriority[] = ['highest', 'high', 'normal', 'low', 'lowest'];
      const order: string[] = [];

      for (const priority of priorities) {
        manager.registerHook('priority-test', `plugin-${priority}`, () => order.push(priority), { priority });
      }

      await manager.executeHook('priority-test', []);

      expect(order).toEqual(['highest', 'high', 'normal', 'low', 'lowest']);
    });
  });

  describe('Middleware', () => {
    it('should apply before middleware', async () => {
      const hook = jest.fn((x: number) => x * 2);
      manager.registerHook('mw-hook', 'plugin-a', hook);

      manager.addMiddleware('mw-hook', {
        before: (args) => [args[0] + 10] as [unknown],
      });

      await manager.executeHook('mw-hook', [5]);

      expect(hook).toHaveBeenCalledWith(15);
    });

    it('should apply after middleware', async () => {
      const hook = jest.fn().mockReturnValue(10);
      manager.registerHook('mw-hook', 'plugin-a', hook);

      manager.addMiddleware('mw-hook', {
        after: (result) => (result as number) * 2,
      });

      const results = await manager.executeHook<number>('mw-hook', []);

      expect(results[0].result).toBe(20);
    });

    it('should handle error middleware', async () => {
      const errorHandler = jest.fn();
      const hook = jest.fn().mockImplementation(() => {
        throw new Error('test');
      });

      manager.registerHook('error-mw-hook', 'plugin-a', hook);
      manager.addMiddleware('error-mw-hook', {
        error: errorHandler,
      });

      await manager.executeHook('error-mw-hook', []);

      expect(errorHandler).toHaveBeenCalled();
    });

    it('should remove middleware', () => {
      const removeMiddleware = manager.addMiddleware('test', {
        before: () => {},
      });

      removeMiddleware();
      // No error means success
    });
  });

  describe('Pipeline Execution', () => {
    it('should execute pipeline transformations', async () => {
      manager.registerHook('transform', 'plugin-a', (value: number) => value * 2);
      manager.registerHook('transform', 'plugin-b', (value: number) => value + 10);

      const { result, transformations } = await manager.executePipeline('transform', 5);

      expect(result).toBe(20); // (5 * 2) + 10
      expect(transformations.length).toBe(2);
    });

    it('should track transformation order', async () => {
      manager.registerHook('transform', 'plugin-a', (v: string) => v + 'A', { priority: 'high' });
      manager.registerHook('transform', 'plugin-b', (v: string) => v + 'B', { priority: 'low' });

      const { result, transformations } = await manager.executePipeline('transform', '');

      expect(result).toBe('AB');
      expect(transformations).toEqual(['plugin-a', 'plugin-b']);
    });
  });

  describe('Hook Configuration', () => {
    it('should set hook enabled state', () => {
      manager.registerHook('config-hook', 'plugin-a', jest.fn());

      manager.setHookEnabled('config-hook', 'plugin-a', false);

      const reg = manager.getHookRegistration('config-hook', 'plugin-a');
      expect(reg?.enabled).toBe(false);
    });

    it('should set hook priority', () => {
      manager.registerHook('config-hook', 'plugin-a', jest.fn());

      manager.setHookPriority('config-hook', 'plugin-a', 'highest');

      const reg = manager.getHookRegistration('config-hook', 'plugin-a');
      expect(reg?.priority).toBe('highest');
    });
  });

  describe('Execution History', () => {
    it('should record execution history', async () => {
      manager.registerHook('history-hook', 'plugin-a', jest.fn());

      await manager.executeHook('history-hook', []);
      await manager.executeHook('history-hook', []);

      const history = manager.getExecutionHistory();
      expect(history.length).toBe(2);
    });

    it('should clear execution history', async () => {
      manager.registerHook('history-hook', 'plugin-a', jest.fn());
      await manager.executeHook('history-hook', []);

      manager.clearExecutionHistory();

      expect(manager.getExecutionHistory().length).toBe(0);
    });
  });

  describe('Introspection', () => {
    it('should get all registered hooks', () => {
      manager.registerHook('hook-1', 'plugin-a', jest.fn());
      manager.registerHook('hook-2', 'plugin-b', jest.fn());

      const allHooks = manager.getRegisteredHooks();

      expect(allHooks.size).toBe(2);
      expect(allHooks.has('hook-1')).toBe(true);
      expect(allHooks.has('hook-2')).toBe(true);
    });

    it('should get hook registration', () => {
      const hook = jest.fn();
      manager.registerHook('test-hook', 'plugin-a', hook, { priority: 'high' });

      const reg = manager.getHookRegistration('test-hook', 'plugin-a');

      expect(reg?.pluginId).toBe('plugin-a');
      expect(reg?.priority).toBe('high');
      expect(reg?.hook).toBe(hook);
    });
  });
});

describe('Singleton', () => {
  it('should return the same instance', () => {
    resetExtendedHooksManager();
    const instance1 = getExtendedHooksManager();
    const instance2 = getExtendedHooksManager();
    expect(instance1).toBe(instance2);
  });
});
