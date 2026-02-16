import { loggers } from '@/lib/logger';
import type { StoreApi } from 'zustand';
import type { ParallelContextStore, ParallelContextStoreActions } from '../types';

const log = loggers.chat;

type ParallelContextStoreSet = StoreApi<ParallelContextStore>['setState'];
type ParallelContextStoreGet = StoreApi<ParallelContextStore>['getState'];
type MaintenanceSlice = Pick<ParallelContextStoreActions, 'cleanupInactiveContexts' | 'touchContext'>;

export const createMaintenanceSlice = (
  set: ParallelContextStoreSet,
  get: ParallelContextStoreGet
): MaintenanceSlice => ({
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
});
