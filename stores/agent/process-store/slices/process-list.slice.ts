import type { StoreApi } from 'zustand';
import type { ProcessStoreState } from '../types';

type ProcessStoreSet = StoreApi<ProcessStoreState>['setState'];

type ProcessListSlice = Pick<ProcessStoreState, 'setProcesses' | 'setLoading' | 'setError'>;

export const createProcessListSlice = (set: ProcessStoreSet): ProcessListSlice => ({
  setProcesses: (processes) =>
    set({
      processes,
      lastRefresh: new Date(),
      error: null,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),
});
