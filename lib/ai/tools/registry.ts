/**
 * Tool Registry - Manages available tools for AI agents
 */

import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolFunction = (...args: any[]) => any;

export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  parameters: T;
  requiresApproval?: boolean;
  category?: 'search' | 'code' | 'file' | 'system' | 'custom';
  create: (config: Record<string, unknown>) => ToolFunction;
}

export interface ToolRegistry {
  tools: Map<string, ToolDefinition>;
  register: (tool: ToolDefinition) => void;
  unregister: (name: string) => void;
  get: (name: string) => ToolDefinition | undefined;
  getAll: () => ToolDefinition[];
  getByCategory: (category: ToolDefinition['category']) => ToolDefinition[];
  createTools: (
    toolNames: string[],
    config: Record<string, unknown>
  ) => Record<string, ToolFunction>;
}

/**
 * Create a new tool registry
 */
export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();

  return {
    tools,

    register(tool: ToolDefinition) {
      tools.set(tool.name, tool);
    },

    unregister(name: string) {
      tools.delete(name);
    },

    get(name: string) {
      return tools.get(name);
    },

    getAll() {
      return Array.from(tools.values());
    },

    getByCategory(category: ToolDefinition['category']) {
      return Array.from(tools.values()).filter((t) => t.category === category);
    },

    createTools(toolNames: string[], config: Record<string, unknown>) {
      const result: Record<string, ToolFunction> = {};

      for (const name of toolNames) {
        const tool = tools.get(name);
        if (tool) {
          result[name] = tool.create(config);
        }
      }

      return result;
    },
  };
}

/**
 * Global tool registry instance
 */
let globalRegistry: ToolRegistry | null = null;

export function getGlobalToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = createToolRegistry();
  }
  return globalRegistry;
}
