/**
 * Parallel Session Context Store
 *
 * Provides isolated context for parallel chat sessions to prevent
 * state pollution between concurrent conversations.
 *
 * Each session gets its own:
 * - Working memory slot
 * - Tool results cache
 * - Temporary state
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';

const log = loggers.chat;

/**
 * Isolated context for a single session
 */
export interface IsolatedSessionContext {
  /** Session ID this context belongs to */
  sessionId: string;
  /** When this context was created */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date;
  /** Working memory for this session */
  workingMemory: WorkingMemoryItem[];
  /** Cached tool results */
  toolResults: Map<string, ToolResultCache>;
  /** Session-specific temporary data */
  tempData: Map<string, unknown>;
  /** Whether this context is currently active */
  isActive: boolean;
}

/**
 * Working memory item
 */
export interface WorkingMemoryItem {
  id: string;
  type: 'fact' | 'instruction' | 'context' | 'reference';
  content: string;
  priority: number;
  addedAt: Date;
  expiresAt?: Date;
}

/**
 * Cached tool result
 */
export interface ToolResultCache {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Configuration for context isolation
 */
export interface ContextIsolationConfig {
  /** Maximum working memory items per session */
  maxWorkingMemoryItems: number;
  /** Tool result cache TTL in milliseconds */
  toolCacheTtlMs: number;
  /** Maximum cached tool results per session */
  maxToolCacheSize: number;
  /** Auto-cleanup inactive contexts after this duration (ms) */
  inactiveContextTtlMs: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CONTEXT_ISOLATION_CONFIG: ContextIsolationConfig = {
  maxWorkingMemoryItems: 20,
  toolCacheTtlMs: 5 * 60 * 1000, // 5 minutes
  maxToolCacheSize: 50,
  inactiveContextTtlMs: 30 * 60 * 1000, // 30 minutes
};

/**
 * Parallel context store state
 */
interface ParallelContextState {
  /** Map of session ID to isolated context */
  contexts: Map<string, IsolatedSessionContext>;
  /** Configuration */
  config: ContextIsolationConfig;

  // Actions
  /** Get or create context for a session */
  getContext: (sessionId: string) => IsolatedSessionContext;
  /** Check if context exists */
  hasContext: (sessionId: string) => boolean;
  /** Clear context for a session */
  clearContext: (sessionId: string) => void;
  /** Clear all contexts */
  clearAllContexts: () => void;
  /** Update configuration */
  setConfig: (config: Partial<ContextIsolationConfig>) => void;

  // Working memory operations
  /** Add item to working memory */
  addWorkingMemory: (sessionId: string, item: Omit<WorkingMemoryItem, 'id' | 'addedAt'>) => string;
  /** Remove item from working memory */
  removeWorkingMemory: (sessionId: string, itemId: string) => void;
  /** Get working memory for session */
  getWorkingMemory: (sessionId: string) => WorkingMemoryItem[];
  /** Clear expired working memory items */
  cleanupExpiredMemory: (sessionId: string) => void;

  // Tool cache operations
  /** Cache a tool result */
  cacheToolResult: (
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown
  ) => void;
  /** Get cached tool result */
  getCachedToolResult: (
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => unknown | undefined;
  /** Clear tool cache for session */
  clearToolCache: (sessionId: string) => void;

  // Temp data operations
  /** Set temporary data */
  setTempData: (sessionId: string, key: string, value: unknown) => void;
  /** Get temporary data */
  getTempData: <T>(sessionId: string, key: string) => T | undefined;
  /** Clear temporary data */
  clearTempData: (sessionId: string, key?: string) => void;

  // Maintenance
  /** Cleanup inactive contexts */
  cleanupInactiveContexts: () => number;
  /** Mark context as active */
  touchContext: (sessionId: string) => void;
}

/**
 * Create a new isolated context
 */
function createIsolatedContext(sessionId: string): IsolatedSessionContext {
  return {
    sessionId,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    workingMemory: [],
    toolResults: new Map(),
    tempData: new Map(),
    isActive: true,
  };
}

/**
 * Generate cache key for tool results
 */
function getToolCacheKey(toolName: string, args: Record<string, unknown>): string {
  return `${toolName}:${JSON.stringify(args)}`;
}

/**
 * Parallel Context Store
 */
export const useParallelContextStore = create<ParallelContextState>()((set, get) => ({
  contexts: new Map(),
  config: DEFAULT_CONTEXT_ISOLATION_CONFIG,

  getContext: (sessionId: string) => {
    const { contexts } = get();
    let context = contexts.get(sessionId);

    if (!context) {
      context = createIsolatedContext(sessionId);
      const newContexts = new Map(contexts);
      newContexts.set(sessionId, context);
      set({ contexts: newContexts });
      log.debug('Created isolated context', { sessionId });
    }

    return context;
  },

  hasContext: (sessionId: string) => {
    return get().contexts.has(sessionId);
  },

  clearContext: (sessionId: string) => {
    const { contexts } = get();
    if (contexts.has(sessionId)) {
      const newContexts = new Map(contexts);
      newContexts.delete(sessionId);
      set({ contexts: newContexts });
      log.debug('Cleared isolated context', { sessionId });
    }
  },

  clearAllContexts: () => {
    set({ contexts: new Map() });
    log.debug('Cleared all isolated contexts');
  },

  setConfig: (config: Partial<ContextIsolationConfig>) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },

  addWorkingMemory: (sessionId: string, item: Omit<WorkingMemoryItem, 'id' | 'addedAt'>) => {
    const { contexts, config } = get();
    const context = get().getContext(sessionId);
    const newItem: WorkingMemoryItem = {
      ...item,
      id: nanoid(),
      addedAt: new Date(),
    };

    // Trim if over limit (remove lowest priority items)
    let memory = [...context.workingMemory, newItem];
    if (memory.length > config.maxWorkingMemoryItems) {
      memory = memory
        .sort((a, b) => b.priority - a.priority)
        .slice(0, config.maxWorkingMemoryItems);
    }

    const newContext = { ...context, workingMemory: memory, lastActivityAt: new Date() };
    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });

    return newItem.id;
  },

  removeWorkingMemory: (sessionId: string, itemId: string) => {
    const { contexts } = get();
    const context = contexts.get(sessionId);
    if (!context) return;

    const newContext = {
      ...context,
      workingMemory: context.workingMemory.filter((item) => item.id !== itemId),
      lastActivityAt: new Date(),
    };

    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });
  },

  getWorkingMemory: (sessionId: string) => {
    const context = get().contexts.get(sessionId);
    return context?.workingMemory || [];
  },

  cleanupExpiredMemory: (sessionId: string) => {
    const { contexts } = get();
    const context = contexts.get(sessionId);
    if (!context) return;

    const now = new Date();
    const validMemory = context.workingMemory.filter(
      (item) => !item.expiresAt || item.expiresAt > now
    );

    if (validMemory.length !== context.workingMemory.length) {
      const newContext = { ...context, workingMemory: validMemory };
      const newContexts = new Map(contexts);
      newContexts.set(sessionId, newContext);
      set({ contexts: newContexts });
    }
  },

  cacheToolResult: (
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown
  ) => {
    const { contexts, config } = get();
    const context = get().getContext(sessionId);
    const cacheKey = getToolCacheKey(toolName, args);

    const newToolResults = new Map(context.toolResults);
    newToolResults.set(cacheKey, {
      toolName,
      args,
      result,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + config.toolCacheTtlMs),
    });

    // Trim if over limit (remove oldest entries)
    if (newToolResults.size > config.maxToolCacheSize) {
      const entries = Array.from(newToolResults.entries())
        .sort((a, b) => b[1].cachedAt.getTime() - a[1].cachedAt.getTime())
        .slice(0, config.maxToolCacheSize);
      newToolResults.clear();
      entries.forEach(([key, value]) => newToolResults.set(key, value));
    }

    const newContext = { ...context, toolResults: newToolResults, lastActivityAt: new Date() };
    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });
  },

  getCachedToolResult: (
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => {
    const context = get().contexts.get(sessionId);
    if (!context) return undefined;

    const cacheKey = getToolCacheKey(toolName, args);
    const cached = context.toolResults.get(cacheKey);

    if (!cached) return undefined;

    // Check expiration
    if (cached.expiresAt < new Date()) {
      // Remove expired entry
      const newToolResults = new Map(context.toolResults);
      newToolResults.delete(cacheKey);

      const { contexts } = get();
      const newContext = { ...context, toolResults: newToolResults };
      const newContexts = new Map(contexts);
      newContexts.set(sessionId, newContext);
      set({ contexts: newContexts });

      return undefined;
    }

    return cached.result;
  },

  clearToolCache: (sessionId: string) => {
    const { contexts } = get();
    const context = contexts.get(sessionId);
    if (!context) return;

    const newContext = { ...context, toolResults: new Map(), lastActivityAt: new Date() };
    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });
  },

  setTempData: (sessionId: string, key: string, value: unknown) => {
    const { contexts } = get();
    const context = get().getContext(sessionId);

    const newTempData = new Map(context.tempData);
    newTempData.set(key, value);

    const newContext = { ...context, tempData: newTempData, lastActivityAt: new Date() };
    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });
  },

  getTempData: <T>(sessionId: string, key: string): T | undefined => {
    const context = get().contexts.get(sessionId);
    return context?.tempData.get(key) as T | undefined;
  },

  clearTempData: (sessionId: string, key?: string) => {
    const { contexts } = get();
    const context = contexts.get(sessionId);
    if (!context) return;

    let newTempData: Map<string, unknown>;
    if (key) {
      newTempData = new Map(context.tempData);
      newTempData.delete(key);
    } else {
      newTempData = new Map();
    }

    const newContext = { ...context, tempData: newTempData, lastActivityAt: new Date() };
    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });
  },

  cleanupInactiveContexts: () => {
    const { contexts, config } = get();
    const now = Date.now();
    const threshold = now - config.inactiveContextTtlMs;

    let cleanedCount = 0;
    const newContexts = new Map(contexts);

    for (const [sessionId, context] of contexts.entries()) {
      if (context.lastActivityAt.getTime() < threshold) {
        newContexts.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      set({ contexts: newContexts });
      log.info('Cleaned up inactive contexts', { count: cleanedCount });
    }

    return cleanedCount;
  },

  touchContext: (sessionId: string) => {
    const { contexts } = get();
    const context = contexts.get(sessionId);
    if (!context) return;

    const newContext = { ...context, lastActivityAt: new Date() };
    const newContexts = new Map(contexts);
    newContexts.set(sessionId, newContext);
    set({ contexts: newContexts });
  },
}));

/**
 * Selector for a specific session's context
 */
export const selectSessionContext = (sessionId: string) => (state: ParallelContextState) =>
  state.contexts.get(sessionId);

/**
 * Selector for context count
 */
export const selectContextCount = (state: ParallelContextState) => state.contexts.size;
