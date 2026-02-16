import { loggers } from '@/lib/logger';
import { createIsolatedContext } from '../helpers';
import type { ParallelContextStore, ParallelContextStoreActions } from '../types';
import type { StoreApi } from 'zustand';

const log = loggers.chat;

type ParallelContextStoreSet = StoreApi<ParallelContextStore>['setState'];
type ParallelContextStoreGet = StoreApi<ParallelContextStore>['getState'];
type ContextSlice = Pick<
  ParallelContextStoreActions,
  'getContext' | 'hasContext' | 'clearContext' | 'clearAllContexts' | 'setConfig'
>;

export const createContextSlice = (
  set: ParallelContextStoreSet,
  get: ParallelContextStoreGet
): ContextSlice => ({
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

  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
  },
});
