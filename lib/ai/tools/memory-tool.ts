/**
 * Memory Tools - Tools for persistent memory management
 *
 * Features:
 * - Store key-value memories with tags
 * - Recall memories by key
 * - Search memories by tags or content
 * - Manage memory lifecycle (TTL, deletion)
 */

import { z } from 'zod';
import type { ToolDefinition } from './registry';
import { globalMemoryManager } from '../agent/memory-manager';

// Memory entry interface (inline to avoid circular dependency)
interface MemoryEntry {
  key: string;
  value: unknown;
  tags: string[];
  timestamp: Date;
  accessCount: number;
  ttl?: number;
  metadata?: Record<string, unknown>;
}

interface MemoryManager {
  set: (key: string, value: unknown, options?: { tags?: string[]; ttl?: number; metadata?: Record<string, unknown> }) => void;
  get: (key: string) => unknown | null;
  delete: (key: string) => boolean;
  has: (key: string) => boolean;
  query: (options: { tags?: string[]; limit?: number }) => MemoryEntry[];
  getStats: () => { totalEntries: number; totalAccessCount: number; tags: Record<string, number> };
}

function getMemoryManager(): MemoryManager {
  return globalMemoryManager as unknown as MemoryManager;
}

// Input schemas
export const memoryStoreInputSchema = z.object({
  key: z.string().describe('Unique key to identify this memory'),
  value: z.string().describe('Content to store in memory'),
  tags: z.array(z.string()).optional().describe('Tags for categorizing and searching the memory'),
  ttl: z.number().optional().describe('Time to live in milliseconds (default: 24 hours)'),
  metadata: z.record(z.unknown()).optional().describe('Optional metadata to attach'),
});

export const memoryRecallInputSchema = z.object({
  key: z.string().describe('Key of the memory to recall'),
});

export const memorySearchInputSchema = z.object({
  query: z.string().optional().describe('Text to search for in memory values'),
  tags: z.array(z.string()).optional().describe('Tags to filter by (AND logic - must match all)'),
  limit: z.number().optional().default(10).describe('Maximum number of results to return'),
});

export const memoryDeleteInputSchema = z.object({
  key: z.string().describe('Key of the memory to delete'),
});

export const memoryListInputSchema = z.object({
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  limit: z.number().optional().default(20).describe('Maximum number of memories to list'),
});

export const memoryUpdateInputSchema = z.object({
  key: z.string().describe('Key of the memory to update'),
  value: z.string().optional().describe('New value'),
  tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
  metadata: z.record(z.unknown()).optional().describe('New metadata (merged with existing)'),
});

// Type exports
export type MemoryStoreInput = z.infer<typeof memoryStoreInputSchema>;
export type MemoryRecallInput = z.infer<typeof memoryRecallInputSchema>;
export type MemorySearchInput = z.infer<typeof memorySearchInputSchema>;
export type MemoryDeleteInput = z.infer<typeof memoryDeleteInputSchema>;
export type MemoryListInput = z.infer<typeof memoryListInputSchema>;
export type MemoryUpdateInput = z.infer<typeof memoryUpdateInputSchema>;

export interface MemoryToolResult {
  success: boolean;
  message: string;
  key?: string;
  value?: unknown;
  memories?: Array<{
    key: string;
    value: unknown;
    tags: string[];
    createdAt: string;
    accessCount: number;
  }>;
  stats?: {
    totalEntries: number;
    totalAccessCount: number;
    tagCounts: Record<string, number>;
  };
  error?: string;
}

/**
 * Format memory entry for output
 */
function formatMemoryEntry(entry: MemoryEntry): {
  key: string;
  value: unknown;
  tags: string[];
  createdAt: string;
  accessCount: number;
} {
  return {
    key: entry.key,
    value: entry.value,
    tags: entry.tags,
    createdAt: entry.timestamp.toISOString(),
    accessCount: entry.accessCount,
  };
}

/**
 * Execute memory store
 */
export async function executeMemoryStore(input: MemoryStoreInput): Promise<MemoryToolResult> {
  try {
    const manager = getMemoryManager();
    manager.set(input.key, input.value, {
      tags: input.tags,
      ttl: input.ttl,
      metadata: input.metadata,
    });

    return {
      success: true,
      message: `Stored memory with key "${input.key}"${input.tags?.length ? ` (tags: ${input.tags.join(', ')})` : ''}.`,
      key: input.key,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to store memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute memory recall
 */
export async function executeMemoryRecall(input: MemoryRecallInput): Promise<MemoryToolResult> {
  try {
    const manager = getMemoryManager();
    const value = manager.get(input.key);

    if (value === null || value === undefined) {
      return {
        success: false,
        message: `No memory found with key "${input.key}".`,
      };
    }

    return {
      success: true,
      message: `Retrieved memory "${input.key}".`,
      key: input.key,
      value,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to recall memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute memory search
 */
export async function executeMemorySearch(input: MemorySearchInput): Promise<MemoryToolResult> {
  try {
    const manager = getMemoryManager();
    let results = manager.query({
      tags: input.tags,
      limit: input.limit || 10,
    });

    // Filter by query if provided
    if (input.query) {
      const queryLower = input.query.toLowerCase();
      results = results.filter((entry) => {
        const valueStr = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
        return (
          entry.key.toLowerCase().includes(queryLower) ||
          valueStr.toLowerCase().includes(queryLower)
        );
      });
    }

    return {
      success: true,
      message: `Found ${results.length} memory/memories.`,
      memories: results.map(formatMemoryEntry),
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to search memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute memory delete
 */
export async function executeMemoryDelete(input: MemoryDeleteInput): Promise<MemoryToolResult> {
  try {
    const manager = getMemoryManager();
    const deleted = manager.delete(input.key);

    if (!deleted) {
      return {
        success: false,
        message: `No memory found with key "${input.key}".`,
      };
    }

    return {
      success: true,
      message: `Deleted memory "${input.key}".`,
      key: input.key,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute memory list
 */
export async function executeMemoryList(input: MemoryListInput): Promise<MemoryToolResult> {
  try {
    const manager = getMemoryManager();
    const memories = manager.query({
      tags: input.tags,
      limit: input.limit || 20,
    });

    const stats = manager.getStats();

    return {
      success: true,
      message: `Listed ${memories.length} memory/memories.`,
      memories: memories.map(formatMemoryEntry),
      stats: {
        totalEntries: stats.totalEntries,
        totalAccessCount: stats.totalAccessCount,
        tagCounts: stats.tags,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to list memories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute memory update
 */
export async function executeMemoryUpdate(input: MemoryUpdateInput): Promise<MemoryToolResult> {
  try {
    const manager = getMemoryManager();

    if (!manager.has(input.key)) {
      return {
        success: false,
        message: `No memory found with key "${input.key}". Use memory_store to create a new memory.`,
      };
    }

    // Get current value if updating metadata only
    const currentValue = manager.get(input.key);

    manager.set(input.key, input.value ?? currentValue, {
      tags: input.tags,
      metadata: input.metadata,
    });

    return {
      success: true,
      message: `Updated memory "${input.key}".`,
      key: input.key,
      value: input.value ?? currentValue,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Tool definitions for registry
export const memoryStoreTool: ToolDefinition = {
  name: 'memory_store',
  category: 'memory',
  description: `Store information in long-term memory for later recall.

Use this to remember:
- User preferences and context
- Important facts from the conversation
- Intermediate results for complex tasks
- Any information that should persist across messages

Memories are automatically persisted and have a default TTL of 24 hours.`,
  parameters: memoryStoreInputSchema,
  create: () => async (args: unknown) => executeMemoryStore(args as MemoryStoreInput),
  requiresApproval: false,
};

export const memoryRecallTool: ToolDefinition = {
  name: 'memory_recall',
  category: 'memory',
  description: 'Retrieve a specific memory by its key.',
  parameters: memoryRecallInputSchema,
  create: () => async (args: unknown) => executeMemoryRecall(args as MemoryRecallInput),
  requiresApproval: false,
};

export const memorySearchTool: ToolDefinition = {
  name: 'memory_search',
  category: 'memory',
  description: 'Search memories by text query or tags. Returns matching memories.',
  parameters: memorySearchInputSchema,
  create: () => async (args: unknown) => executeMemorySearch(args as MemorySearchInput),
  requiresApproval: false,
};

export const memoryDeleteTool: ToolDefinition = {
  name: 'memory_forget',
  category: 'memory',
  description: 'Delete a specific memory by its key.',
  parameters: memoryDeleteInputSchema,
  create: () => async (args: unknown) => executeMemoryDelete(args as MemoryDeleteInput),
  requiresApproval: false,
};

export const memoryListTool: ToolDefinition = {
  name: 'memory_list',
  category: 'memory',
  description: 'List memories with optional tag filtering. Also returns memory statistics.',
  parameters: memoryListInputSchema,
  create: () => async (args: unknown) => executeMemoryList(args as MemoryListInput),
  requiresApproval: false,
};

export const memoryUpdateTool: ToolDefinition = {
  name: 'memory_update',
  category: 'memory',
  description: 'Update the value or tags of an existing memory.',
  parameters: memoryUpdateInputSchema,
  create: () => async (args: unknown) => executeMemoryUpdate(args as MemoryUpdateInput),
  requiresApproval: false,
};

// All memory tools for registration
export const memoryTools: ToolDefinition[] = [
  memoryStoreTool,
  memoryRecallTool,
  memorySearchTool,
  memoryDeleteTool,
  memoryListTool,
  memoryUpdateTool,
];

/**
 * Register all memory tools to the registry
 */
export function registerMemoryTools(registry: { register: (tool: ToolDefinition) => void }): void {
  for (const tool of memoryTools) {
    registry.register(tool);
  }
}

/**
 * Get memory tools prompt for system message
 */
export function getMemoryToolsPrompt(): string {
  return `## Memory Tools

You have access to persistent memory storage:

- **memory_store**: Store information for later recall (key-value with tags)
- **memory_recall**: Retrieve a specific memory by key
- **memory_search**: Search memories by text or tags
- **memory_forget**: Delete a memory
- **memory_list**: List all memories with stats
- **memory_update**: Update an existing memory

Use memories to:
- Remember user preferences
- Store important context across conversations
- Track intermediate results in complex tasks
- Build up knowledge over time`;
}
