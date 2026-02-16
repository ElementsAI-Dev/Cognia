import { nanoid } from 'nanoid';
import type { StoreApi } from 'zustand';
import type { ParallelContextStore, ParallelContextStoreActions, WorkingMemoryItem } from '../types';

type ParallelContextStoreSet = StoreApi<ParallelContextStore>['setState'];
type ParallelContextStoreGet = StoreApi<ParallelContextStore>['getState'];
type WorkingMemorySlice = Pick<
  ParallelContextStoreActions,
  'addWorkingMemory' | 'removeWorkingMemory' | 'getWorkingMemory' | 'cleanupExpiredMemory'
>;

export const createWorkingMemorySlice = (
  set: ParallelContextStoreSet,
  get: ParallelContextStoreGet
): WorkingMemorySlice => ({
  addWorkingMemory: (sessionId: string, item: Omit<WorkingMemoryItem, 'id' | 'addedAt'>) => {
    const { contexts, config } = get();
    const context = get().getContext(sessionId);
    const newItem: WorkingMemoryItem = {
      ...item,
      id: nanoid(),
      addedAt: new Date(),
    };

    let memory = [...context.workingMemory, newItem];
    if (memory.length > config.maxWorkingMemoryItems) {
      memory = memory.sort((a, b) => b.priority - a.priority).slice(0, config.maxWorkingMemoryItems);
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
    const validMemory = context.workingMemory.filter((item) => !item.expiresAt || item.expiresAt > now);

    if (validMemory.length !== context.workingMemory.length) {
      const newContext = { ...context, workingMemory: validMemory };
      const newContexts = new Map(contexts);
      newContexts.set(sessionId, newContext);
      set({ contexts: newContexts });
    }
  },
});
