import type { StoreApi } from 'zustand';
import type { ContextStore } from '../types';

type ContextStoreSet = StoreApi<ContextStore>['setState'];

type HistorySlice = Pick<ContextStore, 'viewHistoryEntry' | 'viewLatest' | 'clearHistory'>;

export const createHistorySlice = (set: ContextStoreSet): HistorySlice => ({
  viewHistoryEntry: (index) =>
    set((state) => {
      const entry = state.contextHistory[index];
      if (!entry) return state;
      return {
        context: entry.context,
        window: entry.context.window ?? null,
        app: entry.context.app ?? null,
        file: entry.context.file ?? null,
        browser: entry.context.browser ?? null,
        editor: entry.context.editor ?? null,
        historyIndex: index,
      };
    }),

  viewLatest: () =>
    set((state) => {
      const last = state.contextHistory[state.contextHistory.length - 1];
      if (!last) return { historyIndex: null };
      return {
        context: last.context,
        window: last.context.window ?? null,
        app: last.context.app ?? null,
        file: last.context.file ?? null,
        browser: last.context.browser ?? null,
        editor: last.context.editor ?? null,
        historyIndex: null,
      };
    }),

  clearHistory: () => set({ contextHistory: [], historyIndex: null }),
});

