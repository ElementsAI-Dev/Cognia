export interface IsolatedSessionContext {
  sessionId: string;
  createdAt: Date;
  lastActivityAt: Date;
  workingMemory: WorkingMemoryItem[];
  toolResults: Map<string, ToolResultCache>;
  tempData: Map<string, unknown>;
  isActive: boolean;
}

export interface WorkingMemoryItem {
  id: string;
  type: 'fact' | 'instruction' | 'context' | 'reference';
  content: string;
  priority: number;
  addedAt: Date;
  expiresAt?: Date;
}

export interface ToolResultCache {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  cachedAt: Date;
  expiresAt: Date;
}

export interface ContextIsolationConfig {
  maxWorkingMemoryItems: number;
  toolCacheTtlMs: number;
  maxToolCacheSize: number;
  inactiveContextTtlMs: number;
}

export interface ParallelContextStoreState {
  contexts: Map<string, IsolatedSessionContext>;
  config: ContextIsolationConfig;
}

export interface ParallelContextStoreActions {
  getContext: (sessionId: string) => IsolatedSessionContext;
  hasContext: (sessionId: string) => boolean;
  clearContext: (sessionId: string) => void;
  clearAllContexts: () => void;
  setConfig: (config: Partial<ContextIsolationConfig>) => void;
  addWorkingMemory: (sessionId: string, item: Omit<WorkingMemoryItem, 'id' | 'addedAt'>) => string;
  removeWorkingMemory: (sessionId: string, itemId: string) => void;
  getWorkingMemory: (sessionId: string) => WorkingMemoryItem[];
  cleanupExpiredMemory: (sessionId: string) => void;
  cacheToolResult: (
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown
  ) => void;
  getCachedToolResult: (
    sessionId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => unknown | undefined;
  clearToolCache: (sessionId: string) => void;
  setTempData: (sessionId: string, key: string, value: unknown) => void;
  getTempData: <T>(sessionId: string, key: string) => T | undefined;
  clearTempData: (sessionId: string, key?: string) => void;
  cleanupInactiveContexts: () => number;
  touchContext: (sessionId: string) => void;
}

export type ParallelContextStore = ParallelContextStoreState & ParallelContextStoreActions;
