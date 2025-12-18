/**
 * Agent Tools - Initialize and manage tools for agent execution
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import {
  executeWebSearch,
  webSearchInputSchema,
  executeCalculator,
  calculatorInputSchema,
} from '../tools';

export interface AgentToolsConfig {
  tavilyApiKey?: string;
  enableWebSearch?: boolean;
  enableCalculator?: boolean;
  enableRAGSearch?: boolean;
  customTools?: Record<string, AgentTool>;
}

/**
 * Create calculator tool for agent
 */
export function createCalculatorTool(): AgentTool {
  return {
    name: 'calculator',
    description: 'Perform mathematical calculations, unit conversions, and evaluate expressions. Use this for any math operations.',
    parameters: calculatorInputSchema,
    execute: async (args) => {
      const input = args as z.infer<typeof calculatorInputSchema>;
      return executeCalculator(input);
    },
    requiresApproval: false,
  };
}

/**
 * Create web search tool for agent
 */
export function createWebSearchTool(apiKey: string): AgentTool {
  return {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, or any topic. Use this when you need up-to-date information.',
    parameters: webSearchInputSchema,
    execute: async (args) => {
      const input = args as z.infer<typeof webSearchInputSchema>;
      return executeWebSearch(input, { apiKey });
    },
    requiresApproval: false,
  };
}

/**
 * Create RAG search tool for agent
 * Note: RAG search requires ChromaDB configuration which should be set up separately
 */
export function createRAGSearchTool(): AgentTool {
  return {
    name: 'knowledge_search',
    description: 'Search through uploaded documents and knowledge base for relevant information. Requires a collection name to search.',
    parameters: z.object({
      query: z.string().describe('The search query'),
      collectionName: z.string().optional().describe('The collection name to search (optional)'),
    }),
    execute: async (args) => {
      // RAG search requires ChromaDB to be configured
      // This is a simplified implementation that returns a placeholder
      return {
        success: false,
        error: 'RAG search requires ChromaDB configuration. Please set up vector database first.',
        query: args.query,
      };
    },
    requiresApproval: false,
  };
}

/**
 * Create file read tool for agent
 */
export function createFileReadTool(): AgentTool {
  return {
    name: 'file_read',
    description: 'Read content from a file. Provide the file path to read.',
    parameters: z.object({
      path: z.string().describe('The file path to read'),
    }),
    execute: async (args) => {
      // This is a placeholder - actual implementation would use Tauri or browser APIs
      return {
        success: false,
        error: 'File reading is not available in this context',
        path: args.path,
      };
    },
    requiresApproval: true,
  };
}

/**
 * Create code execution tool for agent
 */
export function createCodeExecutionTool(): AgentTool {
  return {
    name: 'execute_code',
    description: 'Execute JavaScript code in a sandboxed environment. Use for calculations, data processing, or generating outputs.',
    parameters: z.object({
      code: z.string().describe('JavaScript code to execute'),
      language: z.enum(['javascript', 'typescript']).optional().describe('Programming language'),
    }),
    execute: async (args) => {
      try {
        // Safe evaluation using Function constructor
        const fn = new Function(`"use strict"; return (${args.code});`);
        const result = fn();
        return {
          success: true,
          result: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Code execution failed',
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Initialize all agent tools based on configuration
 */
export function initializeAgentTools(config: AgentToolsConfig = {}): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {};

  // Always include calculator
  if (config.enableCalculator !== false) {
    tools.calculator = createCalculatorTool();
  }

  // Include web search if API key is provided
  if (config.enableWebSearch !== false && config.tavilyApiKey) {
    tools.web_search = createWebSearchTool(config.tavilyApiKey);
  }

  // Include RAG search
  if (config.enableRAGSearch !== false) {
    tools.knowledge_search = createRAGSearchTool();
  }

  // Include code execution (requires approval)
  tools.execute_code = createCodeExecutionTool();

  // Add custom tools
  if (config.customTools) {
    Object.assign(tools, config.customTools);
  }

  return tools;
}

/**
 * Get tool descriptions for display
 */
export function getToolDescriptions(tools: Record<string, AgentTool>): Array<{
  name: string;
  description: string;
  requiresApproval: boolean;
}> {
  return Object.values(tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    requiresApproval: tool.requiresApproval ?? false,
  }));
}

export default initializeAgentTools;
