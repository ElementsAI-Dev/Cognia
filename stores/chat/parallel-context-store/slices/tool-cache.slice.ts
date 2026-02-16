import type { StoreApi } from 'zustand';
import { getToolCacheKey } from '../helpers';
import type { ParallelContextStore, ParallelContextStoreActions } from '../types';

type ParallelContextStoreSet = StoreApi<ParallelContextStore>['setState'];
type ParallelContextStoreGet = StoreApi<ParallelContextStore>['getState'];
type ToolCacheSlice = Pick<
  ParallelContextStoreActions,
  'cacheToolResult' | 'getCachedToolResult' | 'clearToolCache'
>;

export const createToolCacheSlice = (
  set: ParallelContextStoreSet,
  get: ParallelContextStoreGet
): ToolCacheSlice => ({
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

  getCachedToolResult: (sessionId: string, toolName: string, args: Record<string, unknown>) => {
    const context = get().contexts.get(sessionId);
    if (!context) return undefined;

    const cacheKey = getToolCacheKey(toolName, args);
    const cached = context.toolResults.get(cacheKey);

    if (!cached) return undefined;

    if (cached.expiresAt < new Date()) {
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
});
