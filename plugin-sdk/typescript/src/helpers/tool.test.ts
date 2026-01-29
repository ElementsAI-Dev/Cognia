/**
 * Tool Helper Tests
 */

import { tool } from './tool';
import type { ToolConfig, ToolDefinition } from './tool';

describe('tool helper', () => {
  describe('tool()', () => {
    it('should create a tool definition with basic config', () => {
      const calculateTool = tool({
        name: 'calculate',
        description: 'Perform basic math calculations',
        parameters: {
          type: 'object',
          properties: {
            a: { type: 'number', description: 'First operand' },
            b: { type: 'number', description: 'Second operand' },
          },
          required: ['a', 'b'],
        },
        execute: async ({ a, b }: { a: number; b: number }) => {
          return { result: a + b };
        },
      });

      expect(calculateTool.name).toBe('calculate');
      expect(calculateTool.description).toBe('Perform basic math calculations');
      expect(calculateTool.parametersSchema).toEqual({
        type: 'object',
        properties: {
          a: { type: 'number', description: 'First operand' },
          b: { type: 'number', description: 'Second operand' },
        },
        required: ['a', 'b'],
      });
    });

    it('should include optional properties', () => {
      const searchTool = tool({
        name: 'search',
        description: 'Search for items',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
        execute: async () => ({ results: [] }),
        requiresApproval: true,
        category: 'search',
      });

      expect(searchTool.requiresApproval).toBe(true);
      expect(searchTool.category).toBe('search');
    });

    it('should execute the tool function correctly', async () => {
      const addTool = tool({
        name: 'add',
        description: 'Add two numbers',
        parameters: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
        execute: async ({ a, b }: { a: number; b: number }) => {
          return { sum: a + b };
        },
      });

      const result = await addTool.execute({ a: 5, b: 3 });
      expect(result).toEqual({ sum: 8 });
    });

    it('should work with enum parameters', () => {
      const formatTool = tool({
        name: 'format',
        description: 'Format text',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to format' },
            format: {
              type: 'string',
              enum: ['uppercase', 'lowercase', 'titlecase'],
              description: 'Format type',
            },
          },
          required: ['text', 'format'],
        },
        execute: async ({ text, format }: { text: string; format: string }) => {
          switch (format) {
            case 'uppercase':
              return { result: text.toUpperCase() };
            case 'lowercase':
              return { result: text.toLowerCase() };
            default:
              return { result: text };
          }
        },
      });

      const props = formatTool.parametersSchema.properties as Record<string, unknown>;
      expect(props.format).toEqual({
        type: 'string',
        enum: ['uppercase', 'lowercase', 'titlecase'],
        description: 'Format type',
      });
    });

    it('should handle array parameters', () => {
      const batchTool = tool({
        name: 'batch',
        description: 'Process items in batch',
        parameters: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { type: 'string' },
              description: 'Items to process',
            },
          },
          required: ['items'],
        },
        execute: async ({ items }: { items: string[] }) => {
          return { processed: items.length };
        },
      });

      const props = batchTool.parametersSchema.properties as Record<string, unknown>;
      expect(props.items).toEqual({
        type: 'array',
        items: { type: 'string' },
        description: 'Items to process',
      });
    });

    it('should handle nested object parameters', () => {
      const configTool = tool({
        name: 'configure',
        description: 'Configure settings',
        parameters: {
          type: 'object',
          properties: {
            settings: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                threshold: { type: 'number' },
              },
              description: 'Configuration object',
            },
          },
          required: ['settings'],
        },
        execute: async ({ settings }: { settings: { enabled: boolean; threshold: number } }) => {
          return { applied: settings };
        },
      });

      const props = configTool.parametersSchema.properties as Record<string, { type: string }>;
      expect(props.settings.type).toBe('object');
    });
  });

  describe('ToolConfig type', () => {
    it('should accept valid tool configurations', () => {
      const config: ToolConfig<{ query: string }> = {
        name: 'test',
        description: 'Test tool',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string' },
          },
          required: ['query'],
        },
        execute: async ({ query }) => ({ result: query }),
      };

      expect(config.name).toBe('test');
    });
  });

  describe('ToolDefinition type', () => {
    it('should match expected structure', () => {
      const definition: ToolDefinition<{ input: string }> = {
        name: 'process',
        description: 'Process input',
        parametersSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        execute: async ({ input }) => ({ output: input }),
      };

      expect(definition.name).toBe('process');
      expect(definition.parametersSchema).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle optional parameters', () => {
      const optionalTool = tool({
        name: 'optional-params',
        description: 'Tool with optional params',
        parameters: {
          type: 'object',
          properties: {
            required: { type: 'string', description: 'Required param' },
            optional: { type: 'string', description: 'Optional param' },
          },
          required: ['required'],
        },
        execute: async ({ required, optional }: { required: string; optional?: string }) => {
          return { required, optional: optional ?? 'default' };
        },
      });

      expect(optionalTool.parametersSchema.required).toEqual(['required']);
    });

    it('should handle empty parameters', () => {
      const noParamsTool = tool({
        name: 'no-params',
        description: 'Tool without params',
        parameters: {
          type: 'object',
          properties: {},
        },
        execute: async () => {
          return { success: true };
        },
      });

      expect(noParamsTool.parametersSchema.properties).toEqual({});
    });

    it('should pass context to execute function', async () => {
      const contextTool = tool({
        name: 'context-aware',
        description: 'Uses context',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
          required: ['message'],
        },
        execute: async ({ message }: { message: string }, context) => {
          return {
            message,
            sessionId: context?.sessionId,
            hasContext: !!context,
          };
        },
      });

      const mockContext = { sessionId: 'test-session', messageId: 'msg-1', config: {} };
      const result = await contextTool.execute({ message: 'hello' }, mockContext);

      expect(result).toEqual({
        message: 'hello',
        sessionId: 'test-session',
        hasContext: true,
      });
    });

    it('should handle async execution errors', async () => {
      const errorTool = tool({
        name: 'error-tool',
        description: 'Throws errors',
        parameters: {
          type: 'object',
          properties: {
            shouldError: { type: 'boolean' },
          },
          required: ['shouldError'],
        },
        execute: async ({ shouldError }: { shouldError: boolean }) => {
          if (shouldError) {
            throw new Error('Intentional error');
          }
          return { success: true };
        },
      });

      await expect(errorTool.execute({ shouldError: true })).rejects.toThrow('Intentional error');
      await expect(errorTool.execute({ shouldError: false })).resolves.toEqual({ success: true });
    });

    it('should preserve all optional tool properties', () => {
      const fullTool = tool({
        name: 'full-tool',
        description: 'Tool with all options',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' },
          },
        },
        execute: async () => ({}),
        requiresApproval: true,
        category: 'utility',
      });

      expect(fullTool.requiresApproval).toBe(true);
      expect(fullTool.category).toBe('utility');
    });

    it('should handle complex return types', async () => {
      interface ComplexResult {
        data: { items: Array<{ id: number; name: string }> };
        metadata: { count: number; page: number };
      }

      const complexTool = tool({
        name: 'complex-return',
        description: 'Returns complex data',
        parameters: {
          type: 'object',
          properties: {
            page: { type: 'number' },
          },
          required: ['page'],
        },
        execute: async ({ page }: { page: number }): Promise<ComplexResult> => {
          return {
            data: {
              items: [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' },
              ],
            },
            metadata: { count: 2, page },
          };
        },
      });

      const result = await complexTool.execute({ page: 1 }) as ComplexResult;
      expect(result.data.items).toHaveLength(2);
      expect(result.metadata.page).toBe(1);
    });
  });
});
