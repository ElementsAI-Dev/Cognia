import type { StoreApi } from 'zustand';
import type { CompressionHistoryStore, CompressionHistoryStoreActions } from '../types';

type CompressionHistoryStoreGet = StoreApi<CompressionHistoryStore>['getState'];
type QuerySlice = Pick<
  CompressionHistoryStoreActions,
  'getEntriesForSession' | 'getLatestEntry' | 'canUndo'
>;

export const createQuerySlice = (get: CompressionHistoryStoreGet): QuerySlice => ({
  getEntriesForSession: (sessionId) => {
    return get().entries.filter((e) => e.sessionId === sessionId);
  },

  getLatestEntry: (sessionId) => {
    const sessionEntries = get().entries.filter((e) => e.sessionId === sessionId);
    if (sessionEntries.length === 0) return undefined;
    return sessionEntries[sessionEntries.length - 1];
  },

  canUndo: (sessionId) => {
    return get().entries.some((e) => e.sessionId === sessionId);
  },
});
