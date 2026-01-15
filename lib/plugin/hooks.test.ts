/**
 * Tests for hooks.ts
 * Plugin Hooks Manager
 */

import { PluginHooksManager } from './hooks';
import type { PluginHooks, PluginMessage, PluginAgentStep, PluginA2UIAction, PluginA2UIDataChange } from '@/types/plugin';
import React from 'react';

describe('PluginHooksManager', () => {
  let manager: PluginHooksManager;

  beforeEach(() => {
    manager = new PluginHooksManager();
    jest.clearAllMocks();
  });

  describe('registerHooks', () => {
    it('should register hooks for a plugin', () => {
      const hooks: PluginHooks = {
        onLoad: jest.fn(),
      };

      manager.registerHooks('plugin-1', hooks);

      expect(manager.getRegisteredPlugins()).toContain('plugin-1');
    });

    it('should track hooks with priority', () => {
      manager.registerHooks('plugin-1', {}, 10);
      manager.registerHooks('plugin-2', {}, 20);

      const plugins = manager.getRegisteredPlugins();
      expect(plugins).toContain('plugin-1');
      expect(plugins).toContain('plugin-2');
    });

    it('should override existing hooks for same plugin', () => {
      const hooks1: PluginHooks = { onLoad: jest.fn() };
      const hooks2: PluginHooks = { onEnable: jest.fn() };

      manager.registerHooks('plugin-1', hooks1);
      manager.registerHooks('plugin-1', hooks2);

      expect(manager.hasHook('plugin-1', 'onLoad')).toBe(false);
      expect(manager.hasHook('plugin-1', 'onEnable')).toBe(true);
    });
  });

  describe('unregisterHooks', () => {
    it('should remove hooks for a plugin', () => {
      manager.registerHooks('plugin-1', { onLoad: jest.fn() });
      
      manager.unregisterHooks('plugin-1');

      expect(manager.getRegisteredPlugins()).not.toContain('plugin-1');
    });

    it('should handle unregistering non-existent plugin', () => {
      expect(() => manager.unregisterHooks('unknown')).not.toThrow();
    });
  });

  describe('Lifecycle Hooks', () => {
    describe('dispatchOnLoad', () => {
      it('should call onLoad hook', async () => {
        const onLoad = jest.fn();
        manager.registerHooks('plugin-1', { onLoad });

        await manager.dispatchOnLoad('plugin-1');

        expect(onLoad).toHaveBeenCalled();
      });

      it('should not throw for plugin without onLoad', async () => {
        manager.registerHooks('plugin-1', {});
        await expect(manager.dispatchOnLoad('plugin-1')).resolves.not.toThrow();
      });
    });

    describe('dispatchOnEnable', () => {
      it('should call onEnable hook', async () => {
        const onEnable = jest.fn();
        manager.registerHooks('plugin-1', { onEnable });

        await manager.dispatchOnEnable('plugin-1');

        expect(onEnable).toHaveBeenCalled();
      });
    });

    describe('dispatchOnDisable', () => {
      it('should call onDisable hook', async () => {
        const onDisable = jest.fn();
        manager.registerHooks('plugin-1', { onDisable });

        await manager.dispatchOnDisable('plugin-1');

        expect(onDisable).toHaveBeenCalled();
      });
    });

    describe('dispatchOnUnload', () => {
      it('should call onUnload hook', async () => {
        const onUnload = jest.fn();
        manager.registerHooks('plugin-1', { onUnload });

        await manager.dispatchOnUnload('plugin-1');

        expect(onUnload).toHaveBeenCalled();
      });
    });

    describe('dispatchOnConfigChange', () => {
      it('should call onConfigChange with config', () => {
        const onConfigChange = jest.fn();
        manager.registerHooks('plugin-1', { onConfigChange });

        manager.dispatchOnConfigChange('plugin-1', { key: 'value' });

        expect(onConfigChange).toHaveBeenCalledWith({ key: 'value' });
      });
    });
  });

  describe('A2UI Hooks', () => {
    describe('dispatchOnA2UISurfaceCreate', () => {
      it('should dispatch to all plugins in priority order', () => {
        const hook1 = jest.fn();
        const hook2 = jest.fn();
        
        manager.registerHooks('plugin-1', { onA2UISurfaceCreate: hook1 }, 10);
        manager.registerHooks('plugin-2', { onA2UISurfaceCreate: hook2 }, 20);

        manager.dispatchOnA2UISurfaceCreate('surface-1', 'panel');

        expect(hook1).toHaveBeenCalledWith('surface-1', 'panel');
        expect(hook2).toHaveBeenCalledWith('surface-1', 'panel');
      });

      it('should continue on error', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const hook1 = jest.fn().mockImplementation(() => { throw new Error('test'); });
        const hook2 = jest.fn();

        manager.registerHooks('plugin-1', { onA2UISurfaceCreate: hook1 });
        manager.registerHooks('plugin-2', { onA2UISurfaceCreate: hook2 });

        manager.dispatchOnA2UISurfaceCreate('surface-1', 'panel');

        expect(hook2).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('dispatchOnA2UISurfaceDestroy', () => {
      it('should dispatch to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onA2UISurfaceDestroy: hook });

        manager.dispatchOnA2UISurfaceDestroy('surface-1');

        expect(hook).toHaveBeenCalledWith('surface-1');
      });
    });

    describe('dispatchOnA2UIAction', () => {
      it('should dispatch action to all plugins', async () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onA2UIAction: hook });

        const action: PluginA2UIAction = {
          surfaceId: 'surface-1',
          actionType: 'click',
          componentId: 'btn-1',
          payload: {},
        };

        await manager.dispatchOnA2UIAction(action);

        expect(hook).toHaveBeenCalledWith(action);
      });
    });

    describe('dispatchOnA2UIDataChange', () => {
      it('should dispatch data change to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onA2UIDataChange: hook });

        const change: PluginA2UIDataChange = {
          surfaceId: 'surface-1',
          path: 'data.value',
          oldValue: 1,
          newValue: 2,
        };

        manager.dispatchOnA2UIDataChange(change);

        expect(hook).toHaveBeenCalledWith(change);
      });
    });
  });

  describe('Agent Hooks', () => {
    describe('dispatchOnAgentStart', () => {
      it('should dispatch to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onAgentStart: hook });

        manager.dispatchOnAgentStart('agent-1', { mode: 'auto' });

        expect(hook).toHaveBeenCalledWith('agent-1', { mode: 'auto' });
      });
    });

    describe('dispatchOnAgentStep', () => {
      it('should dispatch step to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onAgentStep: hook });

        const step: PluginAgentStep = {
          stepNumber: 1,
          type: 'thinking',
          content: 'Analyzing...',
        };

        manager.dispatchOnAgentStep('agent-1', step);

        expect(hook).toHaveBeenCalledWith('agent-1', step);
      });
    });

    describe('dispatchOnAgentToolCall', () => {
      it('should return result from first plugin that handles it', async () => {
        const hook1 = jest.fn().mockResolvedValue('result-1');
        const hook2 = jest.fn().mockResolvedValue('result-2');

        manager.registerHooks('plugin-1', { onAgentToolCall: hook1 }, 20);
        manager.registerHooks('plugin-2', { onAgentToolCall: hook2 }, 10);

        const result = await manager.dispatchOnAgentToolCall('agent-1', 'tool', { arg: 1 });

        expect(result).toBe('result-1');
        expect(hook2).not.toHaveBeenCalled();
      });

      it('should continue to next plugin if undefined returned', async () => {
        const hook1 = jest.fn().mockResolvedValue(undefined);
        const hook2 = jest.fn().mockResolvedValue('result-2');

        manager.registerHooks('plugin-1', { onAgentToolCall: hook1 }, 20);
        manager.registerHooks('plugin-2', { onAgentToolCall: hook2 }, 10);

        const result = await manager.dispatchOnAgentToolCall('agent-1', 'tool', {});

        expect(result).toBe('result-2');
      });

      it('should return undefined if no plugin handles', async () => {
        manager.registerHooks('plugin-1', {});

        const result = await manager.dispatchOnAgentToolCall('agent-1', 'tool', {});

        expect(result).toBeUndefined();
      });
    });

    describe('dispatchOnAgentComplete', () => {
      it('should dispatch to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onAgentComplete: hook });

        manager.dispatchOnAgentComplete('agent-1', { success: true });

        expect(hook).toHaveBeenCalledWith('agent-1', { success: true });
      });
    });

    describe('dispatchOnAgentError', () => {
      it('should dispatch error to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onAgentError: hook });

        const error = new Error('Test error');
        manager.dispatchOnAgentError('agent-1', error);

        expect(hook).toHaveBeenCalledWith('agent-1', error);
      });
    });
  });

  describe('Message Hooks', () => {
    describe('dispatchOnMessageSend', () => {
      it('should pipeline message through plugins', async () => {
        const hook1 = jest.fn().mockImplementation(async (msg: PluginMessage) => ({
          ...msg,
          content: msg.content + ' [p1]',
        }));
        const hook2 = jest.fn().mockImplementation(async (msg: PluginMessage) => ({
          ...msg,
          content: msg.content + ' [p2]',
        }));

        manager.registerHooks('plugin-1', { onMessageSend: hook1 }, 20);
        manager.registerHooks('plugin-2', { onMessageSend: hook2 }, 10);

        const message: PluginMessage = {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
        };

        const result = await manager.dispatchOnMessageSend(message);

        expect(result.content).toBe('Hello [p1] [p2]');
      });
    });

    describe('dispatchOnMessageReceive', () => {
      it('should pipeline message through plugins', async () => {
        const hook = jest.fn().mockImplementation(async (msg: PluginMessage) => ({
          ...msg,
          processed: true,
        }));

        manager.registerHooks('plugin-1', { onMessageReceive: hook });

        const message: PluginMessage = { id: 'msg-1', role: 'assistant', content: 'Hi' };
        const result = await manager.dispatchOnMessageReceive(message);

        expect((result as PluginMessage & { processed: boolean }).processed).toBe(true);
      });
    });

    describe('dispatchOnMessageRender', () => {
      it('should return first non-null render result', () => {
        const hook1 = jest.fn().mockReturnValue(null);
        const hook2 = jest.fn().mockReturnValue(React.createElement('div', null, 'Custom'));

        manager.registerHooks('plugin-1', { onMessageRender: hook1 }, 20);
        manager.registerHooks('plugin-2', { onMessageRender: hook2 }, 10);

        const message: PluginMessage = { id: 'msg-1', role: 'user', content: 'Test' };
        const result = manager.dispatchOnMessageRender(message);

        expect(result).not.toBeNull();
      });

      it('should return null if no plugin renders', () => {
        manager.registerHooks('plugin-1', {});

        const message: PluginMessage = { id: 'msg-1', role: 'user', content: 'Test' };
        const result = manager.dispatchOnMessageRender(message);

        expect(result).toBeNull();
      });
    });
  });

  describe('Session Hooks', () => {
    describe('dispatchOnSessionCreate', () => {
      it('should dispatch to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onSessionCreate: hook });

        manager.dispatchOnSessionCreate('session-1');

        expect(hook).toHaveBeenCalledWith('session-1');
      });
    });

    describe('dispatchOnSessionSwitch', () => {
      it('should dispatch to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onSessionSwitch: hook });

        manager.dispatchOnSessionSwitch('session-2');

        expect(hook).toHaveBeenCalledWith('session-2');
      });
    });

    describe('dispatchOnSessionDelete', () => {
      it('should dispatch to all plugins', () => {
        const hook = jest.fn();
        manager.registerHooks('plugin-1', { onSessionDelete: hook });

        manager.dispatchOnSessionDelete('session-1');

        expect(hook).toHaveBeenCalledWith('session-1');
      });
    });
  });

  describe('Command Hooks', () => {
    describe('dispatchOnCommand', () => {
      it('should return true when command handled', async () => {
        const hook = jest.fn().mockResolvedValue(true);
        manager.registerHooks('plugin-1', { onCommand: hook });

        const result = await manager.dispatchOnCommand('/test', ['arg1', 'arg2']);

        expect(hook).toHaveBeenCalledWith('/test', ['arg1', 'arg2']);
        expect(result).toBe(true);
      });

      it('should try next plugin if not handled', async () => {
        const hook1 = jest.fn().mockResolvedValue(false);
        const hook2 = jest.fn().mockResolvedValue(true);

        manager.registerHooks('plugin-1', { onCommand: hook1 }, 20);
        manager.registerHooks('plugin-2', { onCommand: hook2 }, 10);

        const result = await manager.dispatchOnCommand('/cmd', []);

        expect(hook1).toHaveBeenCalled();
        expect(hook2).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should return false if no plugin handles', async () => {
        const hook = jest.fn().mockResolvedValue(false);
        manager.registerHooks('plugin-1', { onCommand: hook });

        const result = await manager.dispatchOnCommand('/unknown', []);

        expect(result).toBe(false);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('hasHook', () => {
      it('should return true if plugin has hook', () => {
        manager.registerHooks('plugin-1', { onLoad: jest.fn() });
        expect(manager.hasHook('plugin-1', 'onLoad')).toBe(true);
      });

      it('should return false if plugin does not have hook', () => {
        manager.registerHooks('plugin-1', {});
        expect(manager.hasHook('plugin-1', 'onLoad')).toBe(false);
      });

      it('should return false for unknown plugin', () => {
        expect(manager.hasHook('unknown', 'onLoad')).toBe(false);
      });
    });

    describe('getPluginsWithHook', () => {
      it('should return plugins that have specific hook', () => {
        manager.registerHooks('plugin-1', { onLoad: jest.fn() });
        manager.registerHooks('plugin-2', { onEnable: jest.fn() });
        manager.registerHooks('plugin-3', { onLoad: jest.fn() });

        const plugins = manager.getPluginsWithHook('onLoad');

        expect(plugins).toContain('plugin-1');
        expect(plugins).not.toContain('plugin-2');
        expect(plugins).toContain('plugin-3');
      });
    });

    describe('getRegisteredPlugins', () => {
      it('should return all registered plugin IDs', () => {
        manager.registerHooks('plugin-1', {});
        manager.registerHooks('plugin-2', {});

        const plugins = manager.getRegisteredPlugins();

        expect(plugins).toContain('plugin-1');
        expect(plugins).toContain('plugin-2');
      });
    });

    describe('clear', () => {
      it('should remove all registered hooks', () => {
        manager.registerHooks('plugin-1', { onLoad: jest.fn() });
        manager.registerHooks('plugin-2', { onEnable: jest.fn() });

        manager.clear();

        expect(manager.getRegisteredPlugins()).toHaveLength(0);
      });
    });
  });

  describe('Priority Execution Order', () => {
    it('should execute hooks in priority order (higher first)', () => {
      const order: string[] = [];
      
      manager.registerHooks('plugin-low', { 
        onSessionCreate: () => order.push('low') 
      }, 10);
      manager.registerHooks('plugin-high', { 
        onSessionCreate: () => order.push('high') 
      }, 20);
      manager.registerHooks('plugin-mid', { 
        onSessionCreate: () => order.push('mid') 
      }, 15);

      manager.dispatchOnSessionCreate('session-1');

      expect(order).toEqual(['high', 'mid', 'low']);
    });
  });
});
