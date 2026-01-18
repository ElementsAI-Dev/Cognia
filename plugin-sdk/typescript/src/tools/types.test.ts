/**
 * Tool Types Tests
 *
 * @description Tests for tool integration type definitions.
 */

import type {
  PluginToolDef,
  PluginTool,
  PluginToolContext,
  PluginAgentStep,
  PluginAgentAPI,
} from './types';

describe('Tool Types', () => {
  describe('PluginToolDef', () => {
    it('should create a valid tool definition', () => {
      const toolDef: PluginToolDef = {
        name: 'web_search',
        description: 'Search the web for information',
        category: 'search',
        requiresApproval: false,
        parametersSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              description: 'Maximum results',
              default: 10,
            },
          },
          required: ['query'],
        },
      };

      expect(toolDef.name).toBe('web_search');
      expect(toolDef.description).toBe('Search the web for information');
      expect(toolDef.category).toBe('search');
      expect(toolDef.requiresApproval).toBe(false);
      expect(toolDef.parametersSchema).toBeDefined();
    });

    it('should create a minimal tool definition', () => {
      const toolDef: PluginToolDef = {
        name: 'simple_tool',
        description: 'A simple tool',
        parametersSchema: {
          type: 'object',
          properties: {},
        },
      };

      expect(toolDef.name).toBe('simple_tool');
      expect(toolDef.category).toBeUndefined();
      expect(toolDef.requiresApproval).toBeUndefined();
    });

    it('should create a tool requiring approval', () => {
      const toolDef: PluginToolDef = {
        name: 'delete_file',
        description: 'Deletes a file from the system',
        category: 'filesystem',
        requiresApproval: true,
        parametersSchema: {
          type: 'object',
          properties: {
            path: { type: 'string' },
          },
          required: ['path'],
        },
      };

      expect(toolDef.requiresApproval).toBe(true);
    });

    it('should support complex parameter schemas', () => {
      const toolDef: PluginToolDef = {
        name: 'complex_tool',
        description: 'Tool with complex parameters',
        parametersSchema: {
          type: 'object',
          properties: {
            filters: {
              type: 'object',
              properties: {
                dateRange: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
            options: {
              type: 'object',
              properties: {
                includeMetadata: { type: 'boolean' },
                sortBy: { type: 'string', enum: ['date', 'name', 'relevance'] },
              },
            },
          },
        },
      };

      expect((toolDef.parametersSchema.properties as Record<string, { type: string }>).filters.type).toBe('object');
      expect((toolDef.parametersSchema.properties as Record<string, { type: string }>).options.type).toBe('object');
    });
  });

  describe('PluginTool', () => {
    it('should create a valid registered tool', () => {
      const tool: PluginTool = {
        name: 'my_tool',
        pluginId: 'com.example.plugin',
        definition: {
          name: 'my_tool',
          description: 'My custom tool',
          parametersSchema: { type: 'object', properties: {} },
        },
        execute: async (args, context) => {
          return { result: 'success' };
        },
      };

      expect(tool.name).toBe('my_tool');
      expect(tool.pluginId).toBe('com.example.plugin');
      expect(tool.definition.name).toBe('my_tool');
      expect(typeof tool.execute).toBe('function');
    });

    it('should execute tool with arguments', async () => {
      const tool: PluginTool = {
        name: 'calculator',
        pluginId: 'com.example.calculator',
        definition: {
          name: 'calculator',
          description: 'Performs calculations',
          parametersSchema: {
            type: 'object',
            properties: {
              operation: { type: 'string' },
              a: { type: 'number' },
              b: { type: 'number' },
            },
          },
        },
        execute: async (args) => {
          const { operation, a, b } = args as { operation: string; a: number; b: number };
          switch (operation) {
            case 'add':
              return { result: a + b };
            case 'subtract':
              return { result: a - b };
            case 'multiply':
              return { result: a * b };
            case 'divide':
              return { result: a / b };
            default:
              throw new Error('Unknown operation');
          }
        },
      };

      const context: PluginToolContext = {
        config: {},
      };

      const result = await tool.execute({ operation: 'add', a: 5, b: 3 }, context);
      expect(result).toEqual({ result: 8 });
    });
  });

  describe('PluginToolContext', () => {
    it('should create a valid tool context', () => {
      const context: PluginToolContext = {
        sessionId: 'session-123',
        messageId: 'message-456',
        config: {
          apiKey: 'test-key',
          maxRetries: 3,
        },
        reportProgress: jest.fn(),
        signal: new AbortController().signal,
      };

      expect(context.sessionId).toBe('session-123');
      expect(context.messageId).toBe('message-456');
      expect(context.config.apiKey).toBe('test-key');
      expect(context.reportProgress).toBeDefined();
      expect(context.signal).toBeDefined();
    });

    it('should create a minimal tool context', () => {
      const context: PluginToolContext = {
        config: {},
      };

      expect(context.sessionId).toBeUndefined();
      expect(context.messageId).toBeUndefined();
      expect(context.config).toEqual({});
    });

    it('should call progress reporter', () => {
      const reportProgress = jest.fn();
      const context: PluginToolContext = {
        config: {},
        reportProgress,
      };

      context.reportProgress?.(50, 'Processing...');
      expect(reportProgress).toHaveBeenCalledWith(50, 'Processing...');

      context.reportProgress?.(100, 'Done!');
      expect(reportProgress).toHaveBeenCalledWith(100, 'Done!');
    });

    it('should support abort signal', () => {
      const controller = new AbortController();
      const context: PluginToolContext = {
        config: {},
        signal: controller.signal,
      };

      expect(context.signal?.aborted).toBe(false);
      controller.abort();
      expect(context.signal?.aborted).toBe(true);
    });
  });

  describe('PluginAgentStep', () => {
    it('should create a thinking step', () => {
      const step: PluginAgentStep = {
        stepNumber: 1,
        type: 'thinking',
        content: 'Let me analyze this problem...',
      };

      expect(step.stepNumber).toBe(1);
      expect(step.type).toBe('thinking');
      expect(step.content).toBe('Let me analyze this problem...');
    });

    it('should create a tool_call step', () => {
      const step: PluginAgentStep = {
        stepNumber: 2,
        type: 'tool_call',
        tool: 'web_search',
        toolArgs: { query: 'TypeScript best practices' },
      };

      expect(step.type).toBe('tool_call');
      expect(step.tool).toBe('web_search');
      expect(step.toolArgs).toEqual({ query: 'TypeScript best practices' });
    });

    it('should create a tool_result step', () => {
      const step: PluginAgentStep = {
        stepNumber: 3,
        type: 'tool_result',
        tool: 'web_search',
        toolResult: {
          results: [{ title: 'Result 1', url: 'https://example.com' }],
        },
      };

      expect(step.type).toBe('tool_result');
      expect(step.toolResult).toBeDefined();
    });

    it('should create a response step', () => {
      const step: PluginAgentStep = {
        stepNumber: 4,
        type: 'response',
        content: 'Based on my analysis, here are the best practices...',
      };

      expect(step.type).toBe('response');
      expect(step.content).toBeDefined();
    });

    it('should support all step types', () => {
      const types: PluginAgentStep['type'][] = ['thinking', 'tool_call', 'tool_result', 'response'];
      expect(types).toHaveLength(4);
    });
  });

  describe('PluginAgentAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginAgentAPI = {
        registerTool: jest.fn(),
        unregisterTool: jest.fn(),
        registerMode: jest.fn(),
        unregisterMode: jest.fn(),
        executeAgent: jest.fn(),
        cancelAgent: jest.fn(),
      };

      expect(mockAPI.registerTool).toBeDefined();
      expect(mockAPI.unregisterTool).toBeDefined();
      expect(mockAPI.registerMode).toBeDefined();
      expect(mockAPI.unregisterMode).toBeDefined();
      expect(mockAPI.executeAgent).toBeDefined();
      expect(mockAPI.cancelAgent).toBeDefined();
    });

    it('should call tool registration methods correctly', () => {
      const mockAPI: PluginAgentAPI = {
        registerTool: jest.fn(),
        unregisterTool: jest.fn(),
        registerMode: jest.fn(),
        unregisterMode: jest.fn(),
        executeAgent: jest.fn().mockResolvedValue({ success: true }),
        cancelAgent: jest.fn(),
      };

      const tool: PluginTool = {
        name: 'test_tool',
        pluginId: 'test-plugin',
        definition: {
          name: 'test_tool',
          description: 'Test tool',
          parametersSchema: { type: 'object', properties: {} },
        },
        execute: jest.fn(),
      };

      mockAPI.registerTool(tool);
      expect(mockAPI.registerTool).toHaveBeenCalledWith(tool);

      mockAPI.unregisterTool('test_tool');
      expect(mockAPI.unregisterTool).toHaveBeenCalledWith('test_tool');
    });

    it('should handle agent execution', async () => {
      const mockAPI: PluginAgentAPI = {
        registerTool: jest.fn(),
        unregisterTool: jest.fn(),
        registerMode: jest.fn(),
        unregisterMode: jest.fn(),
        executeAgent: jest.fn().mockResolvedValue({ success: true, result: 'completed' }),
        cancelAgent: jest.fn(),
      };

      const result = await mockAPI.executeAgent({
        mode: 'chat',
        prompt: 'Hello!',
      });

      expect(mockAPI.executeAgent).toHaveBeenCalled();
      expect(result).toEqual({ success: true, result: 'completed' });
    });

    it('should handle agent cancellation', () => {
      const mockAPI: PluginAgentAPI = {
        registerTool: jest.fn(),
        unregisterTool: jest.fn(),
        registerMode: jest.fn(),
        unregisterMode: jest.fn(),
        executeAgent: jest.fn(),
        cancelAgent: jest.fn(),
      };

      mockAPI.cancelAgent('agent-123');
      expect(mockAPI.cancelAgent).toHaveBeenCalledWith('agent-123');
    });
  });
});
