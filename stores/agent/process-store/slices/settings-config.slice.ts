import type { StoreApi } from 'zustand';
import type { ProcessStoreState } from '../types';

type ProcessStoreSet = StoreApi<ProcessStoreState>['setState'];

type SettingsConfigSlice = Pick<
  ProcessStoreState,
  'setAutoRefresh' | 'setAutoRefreshInterval' | 'setConfig' | 'setConfigLoading'
>;

export const createSettingsConfigSlice = (set: ProcessStoreSet): SettingsConfigSlice => ({
  setAutoRefresh: (autoRefresh) => set({ autoRefresh }),

  setAutoRefreshInterval: (autoRefreshInterval) => set({ autoRefreshInterval }),

  setConfig: (config) => set({ config, configLoading: false }),

  setConfigLoading: (configLoading) => set({ configLoading }),
});
