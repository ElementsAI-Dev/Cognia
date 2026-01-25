/**
 * Memory Provider Types - Support for multiple memory backends (local, mem0, etc.)
 */

import type {
  Memory,
  MemoryType,
  MemoryScope,
  CreateMemoryInput,
  UpdateMemoryInput,
} from '../system/memory';

/**
 * Memory provider type
 */
export type MemoryProviderType = 'local' | 'mem0';

/**
 * Memory provider configuration
 */
export interface MemoryProviderConfig {
  type: MemoryProviderType;
  // Local provider settings
  local?: {
    /** Use localStorage for persistence */
    useLocalStorage: boolean;
  };
  // Mem0 provider settings
  mem0?: Mem0Config;
}

/**
 * Mem0 configuration
 */
export interface Mem0Config {
  /** API key for mem0 platform */
  apiKey: string;
  /** Default user ID for memory operations */
  userId: string;
  /** Enable graph memory for richer relationships */
  enableGraph?: boolean;
  /** Base URL for self-hosted mem0 */
  baseUrl?: string;
  /** Use MCP server instead of direct API */
  useMcp?: boolean;
  /** MCP server ID if using MCP */
  mcpServerId?: string;
}

/**
 * Mem0 memory format (from API response)
 */
export interface Mem0Memory {
  id: string;
  memory: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  score?: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  agent_id?: string;
  app_id?: string;
  categories?: string[];
  immutable?: boolean;
}

/**
 * Mem0 entity (for graph memory)
 */
export interface Mem0Entity {
  name: string;
  entity_type: string;
  observations?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Mem0 search result
 */
export interface Mem0SearchResult {
  id: string;
  memory: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * Memory extraction result from two-phase pipeline
 */
export interface MemoryExtractionResult {
  /** Extracted candidate memories */
  candidates: ExtractedMemory[];
  /** Rolling summary of conversation */
  summary?: string;
}

/**
 * Extracted memory candidate
 */
export interface ExtractedMemory {
  content: string;
  type: MemoryType;
  confidence: number;
  source: 'conversation' | 'summary' | 'context';
}

/**
 * Memory update operation type (from mem0 algorithm)
 */
export type MemoryUpdateOperation = 'ADD' | 'UPDATE' | 'DELETE' | 'NOOP';

/**
 * Memory update decision
 */
export interface MemoryUpdateDecision {
  operation: MemoryUpdateOperation;
  memory: ExtractedMemory;
  existingMemoryId?: string;
  mergedContent?: string;
  reason: string;
}

/**
 * Memory provider interface - abstract interface for different backends
 */
export interface IMemoryProvider {
  readonly type: MemoryProviderType;

  // Core CRUD operations
  addMemory(input: CreateMemoryInput, userId?: string): Promise<Memory>;
  getMemory(id: string): Promise<Memory | null>;
  getMemories(filters?: MemoryFilters): Promise<Memory[]>;
  updateMemory(id: string, updates: UpdateMemoryInput): Promise<Memory>;
  deleteMemory(id: string): Promise<boolean>;
  deleteAllMemories(userId?: string): Promise<number>;

  // Search operations
  searchMemories(query: string, options?: MemorySearchOptions): Promise<MemorySearchResultItem[]>;

  // Batch operations
  batchAdd(inputs: CreateMemoryInput[]): Promise<Memory[]>;
  batchDelete(ids: string[]): Promise<number>;

  // Entity operations (for graph memory)
  listEntities?(userId?: string): Promise<Mem0Entity[]>;
  deleteEntities?(entityNames: string[]): Promise<number>;

  // Sync operations
  sync?(): Promise<void>;
  getLastSyncTime?(): Date | null;
}

/**
 * Memory filters for querying
 */
export interface MemoryFilters {
  userId?: string;
  sessionId?: string;
  scope?: MemoryScope;
  type?: MemoryType;
  enabled?: boolean;
  pinned?: boolean;
  tags?: string[];
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  limit?: number;
  threshold?: number;
  userId?: string;
  sessionId?: string;
  rerank?: boolean;
  filters?: MemoryFilters;
}

/**
 * Memory search result item
 */
export interface MemorySearchResultItem {
  memory: Memory;
  score: number;
  matchType: 'exact' | 'partial' | 'semantic';
}

/**
 * Two-phase memory pipeline configuration
 */
export interface MemoryPipelineConfig {
  /** Enable two-phase extraction */
  enablePipeline: boolean;
  /** Number of recent messages to include in extraction */
  recentMessageCount: number;
  /** Enable rolling summary */
  enableSummary: boolean;
  /** Maximum candidates per extraction */
  maxCandidates: number;
  /** Similarity threshold for update phase */
  similarityThreshold: number;
  /** Top-k similar memories to compare */
  topKSimilar: number;
}

export const DEFAULT_PIPELINE_CONFIG: MemoryPipelineConfig = {
  enablePipeline: true,
  recentMessageCount: 5,
  enableSummary: true,
  maxCandidates: 5,
  similarityThreshold: 0.7,
  topKSimilar: 3,
};

/**
 * Convert mem0 memory to local memory format
 */
export function mem0ToLocalMemory(mem0Memory: Mem0Memory): Memory {
  return {
    id: mem0Memory.id,
    type: (mem0Memory.metadata?.type as MemoryType) || 'fact',
    content: mem0Memory.memory,
    source: 'explicit',
    category: mem0Memory.categories?.[0],
    tags: mem0Memory.categories,
    createdAt: mem0Memory.created_at ? new Date(mem0Memory.created_at) : new Date(),
    lastUsedAt: mem0Memory.updated_at ? new Date(mem0Memory.updated_at) : new Date(),
    useCount: 0,
    enabled: !mem0Memory.immutable,
    pinned: mem0Memory.immutable,
    priority: 5,
    scope: 'global',
    metadata: mem0Memory.metadata,
  };
}

/**
 * Convert local memory to mem0 format for API calls
 */
export function localToMem0Memory(memory: Memory, userId: string): Partial<Mem0Memory> {
  return {
    memory: memory.content,
    user_id: userId,
    metadata: {
      type: memory.type,
      category: memory.category,
      tags: memory.tags,
      priority: memory.priority,
      scope: memory.scope,
      ...memory.metadata,
    },
    categories: memory.tags,
    immutable: memory.pinned,
  };
}
