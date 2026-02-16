import type { StoreApi } from 'zustand';
import type { SummaryStore, SummaryStoreActions } from '../types';

type SummaryStoreSet = StoreApi<SummaryStore>['setState'];
type StatusSlice = Pick<SummaryStoreActions, 'clearError' | 'reset'>;

export const createStatusSlice = (set: SummaryStoreSet): StatusSlice => ({
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      currentSessionId: null,
      summaries: [],
      isLoading: false,
      error: null,
    }),
});
