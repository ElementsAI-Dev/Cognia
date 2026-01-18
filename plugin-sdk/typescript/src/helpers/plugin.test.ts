/**
 * Plugin Definition Helpers Tests
 *
 * @description Tests for plugin definition helper functions.
 */

import { definePlugin, defineTool, defineCommand } from './plugin';
import type { PluginDefinition } from './plugin';
import type { PluginContext } from '../context/base';
import type { PluginToolContext } from '../tools/types';
import { parameters, Schema } from './schema';

describe('Plugin Definition Helpers', () => {
  describe('definePlugin', () => {
    it('should return the same plugin definition', () => {
      const definition: PluginDefinition = {
        activate: () => {},
      };

      const result = definePlugin(definition);

      expect(result).toBe(definition);
    });

    it('should create a plugin with hooks', () => {
      const hooks = {
        onAgentStep: jest.fn(),
        onMessageSend: jest.fn(),
      };

      const definition = definePlugin({
        activate: () => hooks,
      });

      const result = definition.activate({} as PluginContext);
      expect(result).toBe(hooks);
    });

    it('should create a plugin with async activation', async () => {
      const definition = definePlugin({
        activate: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            onEnable: jest.fn(),
          };
        },
      });

      const result = await definition.activate({} as PluginContext);
      expect(result).toHaveProperty('onEnable');
    });

    it('should create a plugin with deactivation', () => {
      const deactivate = jest.fn();

      const definition = definePlugin({
        activate: () => {},
        deactivate,
      });

      expect(definition.deactivate).toBe(deactivate);
    });

    it('should create a plugin that uses context', () => {
      const logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const mockContext: PluginContext = {
        pluginId: 'test-plugin',
        pluginPath: '/plugins/test',
        config: { setting: 'value' },
        logger,
        storage: { get: jest.fn(), set: jest.fn(), delete: jest.fn(), keys: jest.fn(), clear: jest.fn() },
        events: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), once: jest.fn() },
        ui: {} as any,
        a2ui: {} as any,
        agent: {} as any,
        settings: { get: jest.fn(), set: jest.fn(), onChange: jest.fn() },
        network: {} as any,
        fs: {} as any,
        clipboard: {} as any,
        shell: {} as any,
        db: {} as any,
        shortcuts: {} as any,
        contextMenu: {} as any,
        window: {} as any,
        secrets: {} as any,
      };

      const definition = definePlugin({
        activate: (context) => {
          context.logger.info('Plugin activated!');
          return {
            onEnable: () => {
              context.logger.debug('Plugin enabled');
            },
          };
        },
      });

      definition.activate(mockContext);

      expect(logger.info).toHaveBeenCalledWith('Plugin activated!');
    });

    it('should create a plugin with void return', () => {
      const definition = definePlugin({
        activate: () => {
          // No hooks returned
        },
      });

      const result = definition.activate({} as PluginContext);
      expect(result).toBeUndefined();
    });
  });

  describe('defineTool', () => {
    it('should create a basic tool definition', () => {
      const tool = defineTool(
        'simple_tool',
        'A simple tool',
        { type: 'object', properties: {} },
        async () => ({ result: 'success' }),
      );

      expect(tool.name).toBe('simple_tool');
      expect(tool.description).toBe('A simple tool');
      expect(tool.parametersSchema).toEqual({ type: 'object', properties: {} });
      expect(typeof tool.execute).toBe('function');
    });

    it('should create a tool with options', () => {
      const tool = defineTool(
        'approval_tool',
        'Requires approval',
        { type: 'object', properties: {} },
        async () => ({}),
        {
          requiresApproval: true,
          category: 'sensitive',
        },
      );

      expect(tool.requiresApproval).toBe(true);
      expect(tool.category).toBe('sensitive');
    });

    it('should create a tool with parameters schema', () => {
      const tool = defineTool(
        'search_tool',
        'Search for information',
        parameters(
          {
            query: Schema.string('Search query'),
            limit: Schema.optional(Schema.integer('Max results')),
          },
          ['query'],
        ),
        async (args) => {
          const { query, limit = 10 } = args as { query: string; limit?: number };
          return { results: [], query, limit };
        },
      );

      expect(tool.parametersSchema.type).toBe('object');
      expect(tool.parametersSchema.required).toEqual(['query']);
    });

    it('should execute tool with context', async () => {
      const tool = defineTool(
        'context_tool',
        'Uses context',
        { type: 'object', properties: {} },
        async (args, context) => {
          return {
            sessionId: context.sessionId,
            config: context.config,
          };
        },
      );

      const context: PluginToolContext = {
        sessionId: 'session-123',
        config: { apiKey: 'test-key' },
      };

      const result = await tool.execute({}, context) as { sessionId: string; config: Record<string, unknown> };
      expect(result.sessionId).toBe('session-123');
      expect(result.config.apiKey).toBe('test-key');
    });

    it('should execute tool with progress reporting', async () => {
      const reportProgress = jest.fn();

      const tool = defineTool(
        'progress_tool',
        'Reports progress',
        { type: 'object', properties: {} },
        async (args, context) => {
          context.reportProgress?.(25, 'Starting...');
          context.reportProgress?.(50, 'Processing...');
          context.reportProgress?.(75, 'Finalizing...');
          context.reportProgress?.(100, 'Done!');
          return { completed: true };
        },
      );

      const context: PluginToolContext = {
        config: {},
        reportProgress,
      };

      await tool.execute({}, context);

      expect(reportProgress).toHaveBeenCalledTimes(4);
      expect(reportProgress).toHaveBeenCalledWith(25, 'Starting...');
      expect(reportProgress).toHaveBeenCalledWith(100, 'Done!');
    });

    it('should handle tool execution errors', async () => {
      const tool = defineTool(
        'error_tool',
        'May throw error',
        { type: 'object', properties: {} },
        async () => {
          throw new Error('Tool execution failed');
        },
      );

      const context: PluginToolContext = { config: {} };

      await expect(tool.execute({}, context)).rejects.toThrow('Tool execution failed');
    });

    it('should handle abort signal', async () => {
      const controller = new AbortController();

      const tool = defineTool(
        'abortable_tool',
        'Can be aborted',
        { type: 'object', properties: {} },
        async (args, context) => {
          if (context.signal?.aborted) {
            throw new Error('Aborted');
          }
          return { completed: true };
        },
      );

      const context: PluginToolContext = {
        config: {},
        signal: controller.signal,
      };

      // Not aborted
      const result = await tool.execute({}, context);
      expect(result).toEqual({ completed: true });

      // Aborted
      controller.abort();
      await expect(tool.execute({}, context)).rejects.toThrow('Aborted');
    });
  });

  describe('defineCommand', () => {
    it('should create a basic command', () => {
      const command = defineCommand(
        'my-plugin.do-something',
        'Do Something',
        () => {
          console.log('Command executed');
        },
      );

      expect(command.id).toBe('my-plugin.do-something');
      expect(command.name).toBe('Do Something');
      expect(typeof command.execute).toBe('function');
    });

    it('should create a command with all options', () => {
      const command = defineCommand(
        'my-plugin.action',
        'Execute Action',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        },
        {
          description: 'Executes a specific action',
          icon: 'zap',
          shortcut: 'Ctrl+Shift+A',
          enabled: true,
        },
      );

      expect(command.description).toBe('Executes a specific action');
      expect(command.icon).toBe('zap');
      expect(command.shortcut).toBe('Ctrl+Shift+A');
      expect(command.enabled).toBe(true);
    });

    it('should create a command with dynamic enabled state', () => {
      let isEnabled = true;

      const command = defineCommand(
        'dynamic-command',
        'Dynamic Command',
        () => {},
        {
          enabled: () => isEnabled,
        },
      );

      expect(typeof command.enabled).toBe('function');
      if (typeof command.enabled === 'function') {
        expect(command.enabled()).toBe(true);
        isEnabled = false;
        expect(command.enabled()).toBe(false);
      }
    });

    it('should execute command with arguments', async () => {
      const execute = jest.fn();

      const command = defineCommand(
        'test-command',
        'Test Command',
        execute,
      );

      await command.execute({ target: 'file.txt', force: true });

      expect(execute).toHaveBeenCalledWith({ target: 'file.txt', force: true });
    });

    it('should execute async command', async () => {
      let executed = false;

      const command = defineCommand(
        'async-command',
        'Async Command',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          executed = true;
        },
      );

      await command.execute();

      expect(executed).toBe(true);
    });

    it('should create command without options', () => {
      const command = defineCommand(
        'minimal-command',
        'Minimal',
        () => {},
      );

      expect(command.description).toBeUndefined();
      expect(command.icon).toBeUndefined();
      expect(command.shortcut).toBeUndefined();
      expect(command.enabled).toBeUndefined();
    });
  });

  describe('Integration - Real World Plugin', () => {
    it('should create a complete plugin with tools and commands', () => {
      // Define tools
      const searchTool = defineTool(
        'web_search',
        'Search the web for information',
        parameters(
          {
            query: Schema.string('Search query'),
            limit: Schema.optional(Schema.integer('Max results', { maximum: 100 })),
          },
          ['query'],
        ),
        async (args) => {
          const { query, limit = 10 } = args as { query: string; limit?: number };
          return { results: [], query, limit };
        },
        { category: 'search' },
      );

      // Define commands
      const showPanelCommand = defineCommand(
        'my-plugin.show-panel',
        'Show Plugin Panel',
        () => {},
        {
          icon: 'layout-sidebar',
          shortcut: 'Ctrl+Shift+P',
        },
      );

      // Define plugin
      const plugin = definePlugin({
        activate: (context) => {
          context.logger.info('Plugin activated');
          context.agent.registerTool({
            name: searchTool.name,
            pluginId: context.pluginId,
            definition: searchTool,
            execute: searchTool.execute,
          });

          return {
            onCommand: (command) => {
              if (command === showPanelCommand.id) {
                showPanelCommand.execute();
                return true;
              }
              return false;
            },
          };
        },
        deactivate: () => {
          // Cleanup
        },
      });

      expect(plugin.activate).toBeDefined();
      expect(plugin.deactivate).toBeDefined();
      expect(searchTool.name).toBe('web_search');
      expect(showPanelCommand.id).toBe('my-plugin.show-panel');
    });
  });
});
