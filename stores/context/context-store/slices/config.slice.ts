import type { StoreApi } from 'zustand';
import type { ContextStore } from '../types';

type ContextStoreSet = StoreApi<ContextStore>['setState'];

type ConfigSlice = Pick<
  ContextStore,
  'setAutoRefreshEnabled' | 'setRefreshIntervalMs' | 'setCacheDurationMs'
>;

export const createConfigSlice = (set: ContextStoreSet): ConfigSlice => ({
  setAutoRefreshEnabled: (autoRefreshEnabled) => set({ autoRefreshEnabled }),
  setRefreshIntervalMs: (refreshIntervalMs) => set({ refreshIntervalMs }),
  setCacheDurationMs: (cacheDurationMs) => set({ cacheDurationMs }),
});

