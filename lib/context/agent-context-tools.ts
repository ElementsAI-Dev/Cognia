/**
 * Agent Context Tools - Tools for dynamic context discovery
 * 
 * These tools allow the agent to access context files on-demand
 * instead of having everything injected into the prompt statically.
 */

import { z } from 'zod';
import type { AgentTool } from '@/lib/ai/agent/agent-executor';
import {
  readContextFile,
  tailContextFile,
  searchContextFiles,
  grepContextFiles,
  getContextStats,
} from './context-fs';
import type { ContextCategory } from '@/types/context';

/**
 * Create the read_context_file tool
 * Allows agent to read specific line ranges from context files
 */
export function createReadContextFileTool(): AgentTool {
  return {
    name: 'read_context_file',
    description: `Read content from a context file. Use this to access long tool outputs, chat history, MCP tool descriptions, or terminal logs that were saved to files instead of being included directly in the conversation.

Supports reading specific line ranges for efficiency:
- Omit startLine/endLine to read the entire file
- Specify both to read a range (1-indexed, inclusive)
- Large files should be read in chunks to avoid context bloat`,
    parameters: z.object({
      path: z.string().describe('The context file path to read'),
      startLine: z.number().optional().describe('Start line (1-indexed)'),
      endLine: z.number().optional().describe('End line (1-indexed, inclusive)'),
    }),
    execute: async (args) => {
      const { path, startLine, endLine } = args as {
        path: string;
        startLine?: number;
        endLine?: number;
      };
      
      const file = await readContextFile(path, { startLine, endLine });
      if (!file) {
        return { error: `File not found: ${path}` };
      }
      
      return {
        path: file.path,
        content: file.content,
        metadata: {
          totalSize: file.metadata.sizeBytes,
          estimatedTokens: file.metadata.estimatedTokens,
          source: file.metadata.source,
          createdAt: file.metadata.createdAt.toISOString(),
        },
      };
    },
  };
}

/**
 * Create the tail_context_file tool
 * Allows agent to read the last N lines of a context file
 */
export function createTailContextFileTool(): AgentTool {
  return {
    name: 'tail_context_file',
    description: `Read the last N lines of a context file. Useful for checking the end of long outputs, logs, or terminal sessions without loading the entire file.

This is typically the first step when investigating a long output - check the tail, then read specific ranges if needed.`,
    parameters: z.object({
      path: z.string().describe('The context file path to tail'),
      lineCount: z.number().default(50).describe('Number of lines to read from the end (default: 50)'),
    }),
    execute: async (args) => {
      const { path, lineCount } = args as { path: string; lineCount: number };
      
      const file = await tailContextFile(path, lineCount);
      if (!file) {
        return { error: `File not found: ${path}` };
      }
      
      return {
        path: file.path,
        content: file.content,
        linesReturned: file.content.split('\n').length,
        metadata: {
          totalSize: file.metadata.sizeBytes,
          source: file.metadata.source,
        },
      };
    },
  };
}

/**
 * Create the grep_context tool
 * Allows agent to search across context files
 */
export function createGrepContextTool(): AgentTool {
  return {
    name: 'grep_context',
    description: `Search for patterns across context files. Use this to find specific content in tool outputs, history, or terminal logs without reading entire files.

Supports:
- Plain text or regex patterns
- Category filtering (tool-output, history, terminal, mcp, skills)
- Case-insensitive search`,
    parameters: z.object({
      pattern: z.string().describe('Search pattern (text or regex)'),
      category: z.enum(['tool-output', 'history', 'terminal', 'mcp', 'skills', 'temp'])
        .optional()
        .describe('Filter by category'),
      isRegex: z.boolean().default(false).describe('Treat pattern as regex'),
      ignoreCase: z.boolean().default(true).describe('Case-insensitive search'),
      limit: z.number().default(20).describe('Maximum results to return'),
    }),
    execute: async (args) => {
      const { pattern, category, isRegex, ignoreCase, limit } = args as {
        pattern: string;
        category?: ContextCategory;
        isRegex: boolean;
        ignoreCase: boolean;
        limit: number;
      };
      
      const results = await grepContextFiles(pattern, {
        category,
        isRegex,
        ignoreCase,
        limit,
      });
      
      return {
        matchCount: results.length,
        matches: results.map(r => ({
          path: r.path,
          lineNumber: r.lineNumber,
          content: r.content,
        })),
      };
    },
  };
}

/**
 * Create the list_context_files tool
 * Allows agent to discover available context files
 */
export function createListContextFilesTool(): AgentTool {
  return {
    name: 'list_context_files',
    description: `List available context files. Use this to discover what tool outputs, history files, or terminal logs are available for reading.

Returns file metadata without content - use read_context_file or tail_context_file to access content.`,
    parameters: z.object({
      category: z.enum(['tool-output', 'history', 'terminal', 'mcp', 'skills', 'temp'])
        .optional()
        .describe('Filter by category'),
      source: z.string().optional().describe('Filter by source (tool name, session id, etc.)'),
      limit: z.number().default(20).describe('Maximum files to list'),
    }),
    execute: async (args) => {
      const { category, source, limit } = args as {
        category?: ContextCategory;
        source?: string;
        limit: number;
      };
      
      const files = await searchContextFiles({
        category,
        source,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      
      return {
        fileCount: files.length,
        files: files.map(f => ({
          id: f.id,
          path: `${category ? '' : f.category + '/'}${f.source}_${f.id}.txt`,
          category: f.category,
          source: f.source,
          size: f.sizeBytes,
          estimatedTokens: f.estimatedTokens,
          createdAt: f.createdAt.toISOString(),
          tags: f.tags,
        })),
      };
    },
  };
}

/**
 * Create the context_stats tool
 * Provides overview of context usage
 */
export function createContextStatsTool(): AgentTool {
  return {
    name: 'context_stats',
    description: 'Get statistics about context files - total size, token estimates, file counts by category. Useful for understanding context usage.',
    parameters: z.object({}),
    execute: async () => {
      const stats = await getContextStats();
      
      return {
        filesByCategory: stats.filesByCategory,
        totalSize: stats.totalSizeBytes,
        estimatedTokens: stats.estimatedTotalTokens,
        oldestFile: stats.oldestFile?.toISOString(),
        lastAccessed: stats.lastAccessed?.toISOString(),
      };
    },
  };
}

/**
 * Create all context tools as a record
 */
export function createContextTools(): Record<string, AgentTool> {
  return {
    read_context_file: createReadContextFileTool(),
    tail_context_file: createTailContextFileTool(),
    grep_context: createGrepContextTool(),
    list_context_files: createListContextFilesTool(),
    context_stats: createContextStatsTool(),
  };
}

/**
 * Get minimal static prompt about context tools
 * This tells the agent about the tools without including full descriptions
 */
export function getContextToolsPrompt(): string {
  return `## Dynamic Context Access

When tool outputs, chat history, or terminal logs exceed size limits, they are saved to context files instead of being truncated. You can access them using these tools:

- \`read_context_file(path, startLine?, endLine?)\` - Read file content (supports ranges)
- \`tail_context_file(path, lineCount)\` - Read last N lines
- \`grep_context(pattern, category?, isRegex?)\` - Search across files
- \`list_context_files(category?)\` - Discover available files

**Best Practice**: Start with \`tail_context_file\` to check the end of long outputs, then read specific ranges if needed. Use \`grep_context\` to find specific content without loading entire files.`;
}
