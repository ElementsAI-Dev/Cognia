/**
 * Base Hooks Tests
 *
 * @description Tests for base plugin hook definitions.
 */

import type {
  PluginMessage,
  PluginHooks,
  HookPriority,
  HookRegistrationOptions,
  HookSandboxExecutionResult,
} from './base';

describe('Base Hooks Types', () => {
  describe('PluginMessage', () => {
    it('should create a valid user message', () => {
      const message: PluginMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, how are you?',
      };

      expect(message.id).toBe('msg-1');
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, how are you?');
    });

    it('should create a valid assistant message', () => {
      const message: PluginMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'I am doing well, thank you!',
        metadata: {
          model: 'gpt-4',
          tokens: 100,
        },
      };

      expect(message.role).toBe('assistant');
      expect(message.metadata?.model).toBe('gpt-4');
    });

    it('should create a valid system message', () => {
      const message: PluginMessage = {
        id: 'msg-0',
        role: 'system',
        content: 'You are a helpful assistant.',
      };

      expect(message.role).toBe('system');
    });

    it('should support all role types', () => {
      const roles: PluginMessage['role'][] = ['user', 'assistant', 'system'];
      expect(roles).toHaveLength(3);
    });
  });

  describe('PluginHooks', () => {
    it('should create empty hooks', () => {
      const hooks: PluginHooks = {};
      expect(Object.keys(hooks)).toHaveLength(0);
    });

    it('should create hooks with lifecycle methods', () => {
      const hooks: PluginHooks = {
        onLoad: jest.fn(),
        onEnable: jest.fn(),
        onDisable: jest.fn(),
        onUnload: jest.fn(),
        onConfigChange: jest.fn(),
      };

      expect(hooks.onLoad).toBeDefined();
      expect(hooks.onEnable).toBeDefined();
      expect(hooks.onDisable).toBeDefined();
      expect(hooks.onUnload).toBeDefined();
      expect(hooks.onConfigChange).toBeDefined();
    });

    it('should create hooks with A2UI methods', () => {
      const hooks: PluginHooks = {
        onA2UISurfaceCreate: jest.fn(),
        onA2UISurfaceDestroy: jest.fn(),
        onA2UIAction: jest.fn(),
        onA2UIDataChange: jest.fn(),
      };

      expect(hooks.onA2UISurfaceCreate).toBeDefined();
      expect(hooks.onA2UISurfaceDestroy).toBeDefined();
      expect(hooks.onA2UIAction).toBeDefined();
      expect(hooks.onA2UIDataChange).toBeDefined();
    });

    it('should create hooks with agent methods', () => {
      const hooks: PluginHooks = {
        onAgentStart: jest.fn(),
        onAgentStep: jest.fn(),
        onAgentToolCall: jest.fn(),
        onAgentComplete: jest.fn(),
        onAgentError: jest.fn(),
      };

      expect(hooks.onAgentStart).toBeDefined();
      expect(hooks.onAgentStep).toBeDefined();
      expect(hooks.onAgentToolCall).toBeDefined();
      expect(hooks.onAgentComplete).toBeDefined();
      expect(hooks.onAgentError).toBeDefined();
    });

    it('should create hooks with message methods', () => {
      const hooks: PluginHooks = {
        onMessageSend: jest.fn(),
        onMessageReceive: jest.fn(),
        onMessageRender: jest.fn(),
      };

      expect(hooks.onMessageSend).toBeDefined();
      expect(hooks.onMessageReceive).toBeDefined();
      expect(hooks.onMessageRender).toBeDefined();
    });

    it('should create hooks with session methods', () => {
      const hooks: PluginHooks = {
        onSessionCreate: jest.fn(),
        onSessionSwitch: jest.fn(),
        onSessionDelete: jest.fn(),
      };

      expect(hooks.onSessionCreate).toBeDefined();
      expect(hooks.onSessionSwitch).toBeDefined();
      expect(hooks.onSessionDelete).toBeDefined();
    });

    it('should create hooks with command method', () => {
      const hooks: PluginHooks = {
        onCommand: jest.fn(),
      };

      expect(hooks.onCommand).toBeDefined();
    });

    it('should call lifecycle hooks', async () => {
      const onLoad = jest.fn();
      const onEnable = jest.fn();
      const hooks: PluginHooks = {
        onLoad,
        onEnable,
      };

      await hooks.onLoad?.();
      await hooks.onEnable?.();

      expect(onLoad).toHaveBeenCalled();
      expect(onEnable).toHaveBeenCalled();
    });

    it('should call config change hook with config', () => {
      const onConfigChange = jest.fn();
      const hooks: PluginHooks = { onConfigChange };

      hooks.onConfigChange?.({ apiKey: 'new-key', maxResults: 20 });

      expect(onConfigChange).toHaveBeenCalledWith({
        apiKey: 'new-key',
        maxResults: 20,
      });
    });

    it('should call agent hooks with correct arguments', () => {
      const onAgentStart = jest.fn();
      const onAgentStep = jest.fn();
      const onAgentComplete = jest.fn();

      const hooks: PluginHooks = {
        onAgentStart,
        onAgentStep,
        onAgentComplete,
      };

      hooks.onAgentStart?.('agent-1', { mode: 'chat' });
      hooks.onAgentStep?.('agent-1', {
        stepNumber: 1,
        type: 'thinking',
        content: 'Processing...',
      });
      hooks.onAgentComplete?.('agent-1', { success: true });

      expect(onAgentStart).toHaveBeenCalledWith('agent-1', { mode: 'chat' });
      expect(onAgentStep).toHaveBeenCalledWith('agent-1', expect.objectContaining({
        stepNumber: 1,
        type: 'thinking',
      }));
      expect(onAgentComplete).toHaveBeenCalledWith('agent-1', { success: true });
    });

    it('should call message hooks and allow modification', async () => {
      const onMessageSend = jest.fn((msg) => ({
        ...msg,
        content: msg.content + ' (modified)',
      }));

      const hooks: PluginHooks = { onMessageSend };

      const message: PluginMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
      };

      const modified = await hooks.onMessageSend?.(message);

      expect(modified?.content).toBe('Hello (modified)');
    });
  });

  describe('HookPriority', () => {
    it('should support all priority levels', () => {
      const priorities: HookPriority[] = ['high', 'normal', 'low'];

      expect(priorities).toContain('high');
      expect(priorities).toContain('normal');
      expect(priorities).toContain('low');
      expect(priorities).toHaveLength(3);
    });
  });

  describe('HookRegistrationOptions', () => {
    it('should create valid registration options', () => {
      const options: HookRegistrationOptions = {
        priority: 'high',
        cancellable: true,
        timeout: 5000,
      };

      expect(options.priority).toBe('high');
      expect(options.cancellable).toBe(true);
      expect(options.timeout).toBe(5000);
    });

    it('should create minimal registration options', () => {
      const options: HookRegistrationOptions = {};

      expect(options.priority).toBeUndefined();
      expect(options.cancellable).toBeUndefined();
      expect(options.timeout).toBeUndefined();
    });

    it('should create options with only priority', () => {
      const options: HookRegistrationOptions = {
        priority: 'low',
      };

      expect(options.priority).toBe('low');
    });
  });

  describe('HookSandboxExecutionResult', () => {
    it('should create a successful execution result', () => {
      const result: HookSandboxExecutionResult<string> = {
        success: true,
        result: 'completed',
        pluginId: 'test-plugin',
        executionTime: 150,
      };

      expect(result.success).toBe(true);
      expect(result.result).toBe('completed');
      expect(result.pluginId).toBe('test-plugin');
      expect(result.executionTime).toBe(150);
    });

    it('should create a failed execution result', () => {
      const result: HookSandboxExecutionResult = {
        success: false,
        error: new Error('Hook failed'),
        pluginId: 'test-plugin',
        executionTime: 50,
      };

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Hook failed');
    });

    it('should create a skipped execution result', () => {
      const result: HookSandboxExecutionResult = {
        success: true,
        pluginId: 'test-plugin',
        executionTime: 0,
        skipped: true,
      };

      expect(result.skipped).toBe(true);
    });

    it('should support duration as alternative to executionTime', () => {
      const result: HookSandboxExecutionResult = {
        success: true,
        pluginId: 'test-plugin',
        executionTime: 100,
        duration: 100,
      };

      expect(result.executionTime).toBe(result.duration);
    });

    it('should create result with typed value', () => {
      interface MyResult {
        count: number;
        items: string[];
      }

      const result: HookSandboxExecutionResult<MyResult> = {
        success: true,
        result: {
          count: 5,
          items: ['a', 'b', 'c', 'd', 'e'],
        },
        pluginId: 'test-plugin',
        executionTime: 200,
      };

      expect(result.result?.count).toBe(5);
      expect(result.result?.items).toHaveLength(5);
    });
  });
});
