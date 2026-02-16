import type { StoreApi } from 'zustand';
import type { ParallelContextStore, ParallelContextStoreActions } from '../types';

type ParallelContextStoreSet = StoreApi<ParallelContextStore>['setState'];
type ParallelContextStoreGet = StoreApi<ParallelContextStore>['getState'];
type TempDataSlice = Pick<
  ParallelContextStoreActions,
  'setTempData' | 'getTempData' | 'clearTempData'
>;

export const createTempDataSlice = (
  set: ParallelContextStoreSet,
  get: ParallelContextStoreGet
): TempDataSlice => ({
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
});
