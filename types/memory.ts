/**
 * Memory type definitions
 */

export type MemoryType = 'preference' | 'fact' | 'instruction' | 'context';
export type MemorySource = 'explicit' | 'inferred' | 'ai-suggested';
export type MemoryScope = 'global' | 'session';

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  source: MemorySource;
  category?: string;
  tags?: string[];
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
  enabled: boolean;
  pinned?: boolean; // Pinned memories are always included in prompts
  priority?: number; // Higher priority = included first (0-10, default 5)
  sessionId?: string; // If set, memory is scoped to this session; 'global' means all sessions
  scope?: MemoryScope; // Whether memory is global or session-scoped
  embedding?: number[]; // Cached embedding vector for semantic search
  expiresAt?: Date; // Optional expiration date
  metadata?: Record<string, unknown>; // Additional metadata
}

export interface CreateMemoryInput {
  type: MemoryType;
  content: string;
  source?: MemorySource;
  category?: string;
  tags?: string[];
  sessionId?: string;
  scope?: MemoryScope;
  priority?: number;
  pinned?: boolean;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryInput {
  content?: string;
  type?: MemoryType;
  category?: string;
  tags?: string[];
  enabled?: boolean;
  pinned?: boolean;
  priority?: number;
  sessionId?: string;
  scope?: MemoryScope;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface MemorySettings {
  enabled: boolean;
  autoInfer: boolean;
  maxMemories: number;
  injectInSystemPrompt: boolean;
  enableSemanticSearch: boolean;
  semanticSearchThreshold: number;
  autoDecay: boolean;
  decayDays: number;
  autoCleanup: boolean;
  cleanupDays: number;
  defaultScope: MemoryScope;
  conflictDetection: boolean;
  conflictThreshold: number;
  // Provider settings
  provider: 'local' | 'mem0';
  // Mem0 specific settings
  mem0ApiKey?: string;
  mem0UserId?: string;
  mem0EnableGraph?: boolean;
  mem0UseMcp?: boolean;
  mem0McpServerId?: string;
  // Pipeline settings
  enablePipeline: boolean;
  pipelineRecentMessages: number;
  enableRollingSummary: boolean;
}

export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  enabled: true,
  autoInfer: true,
  maxMemories: 100,
  injectInSystemPrompt: true,
  enableSemanticSearch: false,
  semanticSearchThreshold: 0.7,
  autoDecay: false,
  decayDays: 30,
  autoCleanup: false,
  cleanupDays: 60,
  defaultScope: 'global',
  conflictDetection: true,
  conflictThreshold: 0.7,
  // Provider settings
  provider: 'local',
  // Pipeline settings
  enablePipeline: true,
  pipelineRecentMessages: 5,
  enableRollingSummary: false,
};

/**
 * Memory conflict resolution options
 */
export interface MemoryConflict {
  existingMemoryId: string;
  newContent: string;
  similarity: number;
  suggestedAction: 'merge' | 'replace' | 'keep_both' | 'skip';
}

/**
 * Memory search result with relevance score
 */
export interface MemorySearchResult {
  memory: Memory;
  score: number;
  matchType: 'exact' | 'partial' | 'semantic';
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  total: number;
  enabled: number;
  pinned: number;
  byType: Record<MemoryType, number>;
  byScope: Record<MemoryScope, number>;
  expiringSoon: number;
  recentlyUsed: number;
}

/**
 * Memory export format
 */
export interface MemoryExportData {
  version: string;
  exportedAt: string;
  settings: MemorySettings;
  memories: Memory[];
}
