import type { StoreApi } from 'zustand';
import type { ContextStore } from '../types';

type ContextStoreSet = StoreApi<ContextStore>['setState'];

type StatusSlice = Pick<ContextStore, 'setIsLoading' | 'setError'>;

export const createStatusSlice = (set: ContextStoreSet): StatusSlice => ({
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
});

