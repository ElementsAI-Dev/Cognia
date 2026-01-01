/**
 * Mem0 Memory Provider - Integration with mem0 via MCP or direct API
 * 
 * Supports:
 * - MCP server integration (recommended for Claude Desktop, Cursor, etc.)
 * - Direct API calls to mem0 platform
 * - Graph memory for richer entity relationships
 */

import type {
  Memory,
  CreateMemoryInput,
  UpdateMemoryInput,
  IMemoryProvider,
  MemoryFilters,
  MemorySearchOptions,
  MemorySearchResultItem,
  Mem0Config,
  Mem0Memory,
  Mem0Entity,
} from '@/types';
import { mem0ToLocalMemory } from '@/types/memory-provider';
import type { ToolCallResult } from '@/types/mcp';

/**
 * Mem0 API response types
 */
interface Mem0AddResponse {
  results: Array<{
    id: string;
    memory: string;
    event: 'ADD' | 'UPDATE' | 'DELETE' | 'NOOP';
  }>;
}

interface Mem0SearchResponse {
  results: Mem0Memory[];
}

interface Mem0GetResponse {
  results: Mem0Memory[];
}

/**
 * MCP tool call function type
 */
type McpCallToolFn = (
  serverId: string,
  toolName: string,
  args: Record<string, unknown>
) => Promise<ToolCallResult>;

/**
 * Mem0 Provider Implementation
 */
export class Mem0Provider implements IMemoryProvider {
  readonly type = 'mem0' as const;
  
  private config: Mem0Config;
  private mcpCallTool?: McpCallToolFn;
  private lastSyncTime: Date | null = null;

  constructor(config: Mem0Config, mcpCallTool?: McpCallToolFn) {
    this.config = config;
    this.mcpCallTool = mcpCallTool;
  }

  /**
   * Call mem0 tool via MCP
   */
  private async callMcpTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.mcpCallTool || !this.config.mcpServerId) {
      throw new Error('MCP not configured for mem0 provider');
    }

    const result = await this.mcpCallTool(
      this.config.mcpServerId,
      toolName,
      args
    );

    if (result.isError) {
      const errorText = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      throw new Error(`Mem0 MCP error: ${errorText}`);
    }

    // Parse the JSON response from MCP
    const textContent = result.content.find(c => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      try {
        return JSON.parse(textContent.text);
      } catch {
        return textContent.text;
      }
    }

    return null;
  }

  /**
   * Call mem0 API directly
   */
  private async callApi(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: Record<string, unknown>
  ): Promise<unknown> {
    const baseUrl = this.config.baseUrl || 'https://api.mem0.ai/v1';
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mem0 API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Execute mem0 operation (via MCP or direct API)
   */
  private async execute(
    mcpTool: string,
    apiEndpoint: string,
    apiMethod: 'GET' | 'POST' | 'PUT' | 'DELETE',
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (this.config.useMcp && this.mcpCallTool) {
      return this.callMcpTool(mcpTool, args);
    }
    return this.callApi(apiEndpoint, apiMethod, args);
  }

  /**
   * Add a new memory
   */
  async addMemory(input: CreateMemoryInput, userId?: string): Promise<Memory> {
    const effectiveUserId = userId || this.config.userId;
    
    const args = {
      messages: [{ role: 'user', content: input.content }],
      user_id: effectiveUserId,
      metadata: {
        type: input.type,
        category: input.category,
        tags: input.tags,
        priority: input.priority,
        scope: input.scope,
        sessionId: input.sessionId,
        ...input.metadata,
      },
      ...(this.config.enableGraph && { enable_graph: true }),
    };

    const response = await this.execute(
      'add_memory',
      '/memories/',
      'POST',
      args
    ) as Mem0AddResponse;

    // Get the first result
    const result = response.results?.[0];
    if (!result) {
      throw new Error('No memory returned from mem0');
    }

    // Convert to local memory format
    return {
      id: result.id,
      type: input.type,
      content: result.memory,
      source: input.source || 'explicit',
      category: input.category,
      tags: input.tags || [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      enabled: true,
      pinned: input.pinned || false,
      priority: input.priority ?? 5,
      scope: input.scope || 'global',
      sessionId: input.sessionId,
      metadata: input.metadata,
    };
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id: string): Promise<Memory | null> {
    try {
      const response = await this.execute(
        'get_memory',
        `/memories/${id}/`,
        'GET',
        { memory_id: id }
      ) as Mem0Memory;

      if (!response) return null;
      return mem0ToLocalMemory(response);
    } catch {
      return null;
    }
  }

  /**
   * Get all memories with optional filters
   */
  async getMemories(filters?: MemoryFilters): Promise<Memory[]> {
    const args: Record<string, unknown> = {
      user_id: filters?.userId || this.config.userId,
    };

    if (filters?.limit) args.limit = filters.limit;
    if (filters?.offset) args.offset = filters.offset;

    const response = await this.execute(
      'get_memories',
      '/memories/',
      'GET',
      args
    ) as Mem0GetResponse;

    let memories = (response.results || []).map(mem0ToLocalMemory);

    // Apply local filters
    if (filters?.type) {
      memories = memories.filter(m => m.type === filters.type);
    }
    if (filters?.scope) {
      memories = memories.filter(m => m.scope === filters.scope);
    }
    if (filters?.enabled !== undefined) {
      memories = memories.filter(m => m.enabled === filters.enabled);
    }
    if (filters?.pinned !== undefined) {
      memories = memories.filter(m => m.pinned === filters.pinned);
    }
    if (filters?.tags?.length) {
      memories = memories.filter(m => 
        filters.tags!.some(tag => m.tags?.includes(tag))
      );
    }
    if (filters?.category) {
      memories = memories.filter(m => m.category === filters.category);
    }

    return memories;
  }

  /**
   * Update an existing memory
   */
  async updateMemory(id: string, updates: UpdateMemoryInput): Promise<Memory> {
    const args: Record<string, unknown> = {
      memory_id: id,
    };

    if (updates.content) {
      args.text = updates.content;
    }

    // Update metadata
    const metadata: Record<string, unknown> = {};
    if (updates.type) metadata.type = updates.type;
    if (updates.category) metadata.category = updates.category;
    if (updates.tags) metadata.tags = updates.tags;
    if (updates.priority !== undefined) metadata.priority = updates.priority;
    if (updates.scope) metadata.scope = updates.scope;
    if (updates.sessionId) metadata.sessionId = updates.sessionId;
    if (updates.metadata) Object.assign(metadata, updates.metadata);

    if (Object.keys(metadata).length > 0) {
      args.metadata = metadata;
    }

    await this.execute(
      'update_memory',
      `/memories/${id}/`,
      'PUT',
      args
    );

    // Fetch updated memory
    const updated = await this.getMemory(id);
    if (!updated) {
      throw new Error('Failed to fetch updated memory');
    }

    return updated;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(id: string): Promise<boolean> {
    try {
      await this.execute(
        'delete_memory',
        `/memories/${id}/`,
        'DELETE',
        { memory_id: id }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all memories for a user
   */
  async deleteAllMemories(userId?: string): Promise<number> {
    const effectiveUserId = userId || this.config.userId;
    
    try {
      await this.execute(
        'delete_all_memories',
        '/memories/',
        'DELETE',
        { user_id: effectiveUserId }
      );
      // Return -1 since we don't know exact count
      return -1;
    } catch {
      return 0;
    }
  }

  /**
   * Search memories semantically
   */
  async searchMemories(
    query: string,
    options?: MemorySearchOptions
  ): Promise<MemorySearchResultItem[]> {
    const args: Record<string, unknown> = {
      query,
      user_id: options?.userId || this.config.userId,
    };

    if (options?.limit) args.limit = options.limit;
    if (options?.rerank) args.rerank = options.rerank;

    const response = await this.execute(
      'search_memories',
      '/memories/search/',
      'POST',
      args
    ) as Mem0SearchResponse;

    return (response.results || []).map(mem0Mem => ({
      memory: mem0ToLocalMemory(mem0Mem),
      score: mem0Mem.score || 0,
      matchType: 'semantic' as const,
    }));
  }

  /**
   * Batch add memories
   */
  async batchAdd(inputs: CreateMemoryInput[]): Promise<Memory[]> {
    const results: Memory[] = [];
    
    // Mem0 API doesn't support true batch add, so we process sequentially
    for (const input of inputs) {
      try {
        const memory = await this.addMemory(input);
        results.push(memory);
      } catch (error) {
        console.error('Failed to add memory:', error);
      }
    }

    return results;
  }

  /**
   * Batch delete memories
   */
  async batchDelete(ids: string[]): Promise<number> {
    let deleted = 0;
    
    for (const id of ids) {
      if (await this.deleteMemory(id)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * List entities (for graph memory)
   */
  async listEntities(userId?: string): Promise<Mem0Entity[]> {
    if (!this.config.enableGraph) {
      return [];
    }

    const effectiveUserId = userId || this.config.userId;

    try {
      const response = await this.execute(
        'list_entities',
        '/entities/',
        'GET',
        { user_id: effectiveUserId }
      ) as { results: Mem0Entity[] };

      return response.results || [];
    } catch {
      return [];
    }
  }

  /**
   * Delete entities
   */
  async deleteEntities(entityNames: string[]): Promise<number> {
    if (!this.config.enableGraph) {
      return 0;
    }

    try {
      await this.execute(
        'delete_entities',
        '/entities/',
        'DELETE',
        { entity_names: entityNames }
      );
      return entityNames.length;
    } catch {
      return 0;
    }
  }

  /**
   * Sync with mem0 server
   */
  async sync(): Promise<void> {
    // Force refresh by fetching all memories
    await this.getMemories();
    this.lastSyncTime = new Date();
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}

/**
 * Create mem0 provider with MCP integration
 */
export function createMem0Provider(
  config: Mem0Config,
  mcpCallTool?: McpCallToolFn
): Mem0Provider {
  return new Mem0Provider(config, mcpCallTool);
}
