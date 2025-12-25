/**
 * Tool Registry - Manages available tools for AI agents
 * 
 * Uses AI SDK compatible tool definitions with Zod schemas
 * Provides centralized tool management for agent execution
 */

import { z } from 'zod';
import { calculatorInputSchema, executeCalculator } from './calculator';
import { ragSearchInputSchema, executeRAGSearch, type RAGSearchInput } from './rag-search';
import type { RAGConfig } from '../rag';
import { webSearchInputSchema, executeWebSearch } from './web-search';
import { 
  documentSummarizeInputSchema, 
  documentChunkInputSchema, 
  documentAnalyzeInputSchema,
  executeDocumentSummarize,
  executeDocumentChunk,
  executeDocumentAnalyze 
} from './document-tool';
import {
  fileReadInputSchema,
  fileWriteInputSchema,
  fileListInputSchema,
  fileExistsInputSchema,
  fileDeleteInputSchema,
  directoryCreateInputSchema,
  fileCopyInputSchema,
  fileRenameInputSchema,
  fileInfoInputSchema,
  fileSearchInputSchema,
  fileAppendInputSchema,
  executeFileRead,
  executeFileWrite,
  executeFileList,
  executeFileExists,
  executeFileDelete,
  executeDirectoryCreate,
  executeFileCopy,
  executeFileRename,
  executeFileInfo,
  executeFileSearch,
  executeFileAppend,
} from './file-tool';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolFunction = (...args: any[]) => any;

export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  parameters: T;
  requiresApproval?: boolean;
  category?: 'search' | 'code' | 'file' | 'system' | 'custom' | 'ppt';
  create: (config: Record<string, unknown>) => ToolFunction;
}

/**
 * Tool format compatible with AI SDK's tool calling
 */
export interface AICompatibleTool {
  description: string;
  parameters: z.ZodType;
  execute: (args: unknown) => Promise<unknown>;
}

/**
 * Convert a ToolDefinition to AI SDK compatible format
 */
export function toAICompatibleTool<T extends z.ZodType>(
  toolDef: ToolDefinition<T>,
  config: Record<string, unknown> = {}
): AICompatibleTool {
  const executeFn = toolDef.create(config);
  
  return {
    description: toolDef.description,
    parameters: toolDef.parameters,
    execute: async (args: unknown) => executeFn(args),
  };
}

/**
 * Convert multiple ToolDefinitions to AI SDK compatible tools record
 */
export function toAICompatibleTools(
  toolDefs: ToolDefinition[],
  config: Record<string, unknown> = {}
): Record<string, AICompatibleTool> {
  const result: Record<string, AICompatibleTool> = {};
  
  for (const toolDef of toolDefs) {
    result[toolDef.name] = toAICompatibleTool(toolDef, config);
  }
  
  return result;
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
  /**
   * Create AI compatible tools from registry
   */
  toAICompatibleTools: (
    toolNames: string[],
    config: Record<string, unknown>
  ) => Record<string, AICompatibleTool>;
  /**
   * Get all tools as AI compatible tools
   */
  getAllAsAICompatibleTools: (config: Record<string, unknown>) => Record<string, AICompatibleTool>;
}

/**
 * Create a new tool registry
 */
export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();

  return {
    tools,

    register(toolDef: ToolDefinition) {
      tools.set(toolDef.name, toolDef);
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
        const toolDef = tools.get(name);
        if (toolDef) {
          result[name] = toolDef.create(config);
        }
      }

      return result;
    },

    toAICompatibleTools(toolNames: string[], config: Record<string, unknown>) {
      const result: Record<string, AICompatibleTool> = {};

      for (const name of toolNames) {
        const toolDef = tools.get(name);
        if (toolDef) {
          result[name] = toAICompatibleTool(toolDef, config);
        }
      }

      return result;
    },

    getAllAsAICompatibleTools(config: Record<string, unknown>) {
      return toAICompatibleTools(this.getAll(), config);
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
    // Pre-register default tools
    registerDefaultTools(globalRegistry);
  }
  return globalRegistry;
}

/**
 * Register all default tools to a registry
 */
function registerDefaultTools(registry: ToolRegistry): void {
  // Calculator tool
  registry.register({
    name: 'calculator',
    description: 'Perform mathematical calculations. Supports basic operations (+, -, *, /, ^, %), and functions (sqrt, sin, cos, tan, log, ln, abs, floor, ceil, round).',
    parameters: calculatorInputSchema,
    requiresApproval: false,
    category: 'system',
    create: () => executeCalculator,
  });

  // RAG search tool
  registry.register({
    name: 'rag_search',
    description: 'Search the knowledge base for relevant information using semantic similarity.',
    parameters: ragSearchInputSchema,
    requiresApproval: false,
    category: 'search',
    create: (config) => (input: unknown) => executeRAGSearch(input as RAGSearchInput, config as unknown as RAGConfig),
  });

  // Web search tool
  registry.register({
    name: 'web_search',
    description: 'Search the web for current information using multiple search providers.',
    parameters: webSearchInputSchema,
    requiresApproval: false,
    category: 'search',
    create: (config) => (input: unknown) => executeWebSearch(input as Parameters<typeof executeWebSearch>[0], config as unknown as Parameters<typeof executeWebSearch>[1]),
  });

  // Document tools
  registry.register({
    name: 'document_summarize',
    description: 'Generate a concise summary of document content.',
    parameters: documentSummarizeInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentSummarize,
  });

  registry.register({
    name: 'document_chunk',
    description: 'Split document content into smaller chunks for processing.',
    parameters: documentChunkInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentChunk,
  });

  registry.register({
    name: 'document_analyze',
    description: 'Analyze document structure and extract metadata.',
    parameters: documentAnalyzeInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeDocumentAnalyze,
  });

  // File tools
  registry.register({
    name: 'file_read',
    description: 'Read the contents of a text file from the local file system.',
    parameters: fileReadInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileRead,
  });

  registry.register({
    name: 'file_write',
    description: 'Write content to a file on the local file system.',
    parameters: fileWriteInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileWrite,
  });

  registry.register({
    name: 'file_list',
    description: 'List the contents of a directory.',
    parameters: fileListInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileList,
  });

  registry.register({
    name: 'file_exists',
    description: 'Check if a file or directory exists.',
    parameters: fileExistsInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileExists,
  });

  registry.register({
    name: 'file_delete',
    description: 'Delete a file from the local file system.',
    parameters: fileDeleteInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileDelete,
  });

  registry.register({
    name: 'directory_create',
    description: 'Create a new directory on the local file system.',
    parameters: directoryCreateInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeDirectoryCreate,
  });

  registry.register({
    name: 'file_copy',
    description: 'Copy a file from one location to another on the local file system.',
    parameters: fileCopyInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileCopy,
  });

  registry.register({
    name: 'file_rename',
    description: 'Rename or move a file to a new location on the local file system.',
    parameters: fileRenameInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileRename,
  });

  registry.register({
    name: 'file_info',
    description: 'Get detailed information about a file or directory, including size, type, and modification time.',
    parameters: fileInfoInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileInfo,
  });

  registry.register({
    name: 'file_search',
    description: 'Search for files in a directory by name pattern or file extension. Can search recursively.',
    parameters: fileSearchInputSchema,
    requiresApproval: false,
    category: 'file',
    create: () => executeFileSearch,
  });

  registry.register({
    name: 'file_append',
    description: 'Append content to the end of an existing file. Creates the file if it does not exist.',
    parameters: fileAppendInputSchema,
    requiresApproval: true,
    category: 'file',
    create: () => executeFileAppend,
  });
}
