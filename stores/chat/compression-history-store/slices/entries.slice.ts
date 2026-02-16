import type { StoreApi } from 'zustand';
import { MAX_ENTRIES_PER_SESSION, MAX_TOTAL_ENTRIES } from '../initial-state';
import type { CompressionHistoryStore, CompressionHistoryStoreActions } from '../types';

type CompressionHistoryStoreSet = StoreApi<CompressionHistoryStore>['setState'];
type EntriesSlice = Pick<
  CompressionHistoryStoreActions,
  'addEntry' | 'removeEntry' | 'clearSession' | 'reset'
>;

export const createEntriesSlice = (set: CompressionHistoryStoreSet): EntriesSlice => ({
  addEntry: (entry) => {
    set((state) => {
      let entries = [...state.entries, entry];

      const sessionEntries = entries.filter((e) => e.sessionId === entry.sessionId);
      if (sessionEntries.length > MAX_ENTRIES_PER_SESSION) {
        const oldest = sessionEntries[0];
        entries = entries.filter((e) => e.id !== oldest.id);
      }

      if (entries.length > MAX_TOTAL_ENTRIES) {
        entries = entries.slice(entries.length - MAX_TOTAL_ENTRIES);
      }

      return { entries };
    });
  },

  removeEntry: (entryId) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== entryId),
    }));
  },

  clearSession: (sessionId) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.sessionId !== sessionId),
    }));
  },

  reset: () => set({ entries: [] }),
});
