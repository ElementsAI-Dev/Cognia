import type { ContextIsolationConfig, ParallelContextStoreState } from './types';

export const DEFAULT_CONTEXT_ISOLATION_CONFIG: ContextIsolationConfig = {
  maxWorkingMemoryItems: 20,
  toolCacheTtlMs: 5 * 60 * 1000,
  maxToolCacheSize: 50,
  inactiveContextTtlMs: 30 * 60 * 1000,
};

export const initialState: ParallelContextStoreState = {
  contexts: new Map(),
  config: DEFAULT_CONTEXT_ISOLATION_CONFIG,
};
