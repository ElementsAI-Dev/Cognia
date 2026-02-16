import type { PersistOptions } from 'zustand/middleware';
import type { ContextStore } from './types';

type PersistedContextStoreState = Pick<
  ContextStore,
  'autoRefreshEnabled' | 'refreshIntervalMs' | 'cacheDurationMs'
>;

export const contextStorePersistConfig: PersistOptions<ContextStore, PersistedContextStoreState> = {
  name: 'cognia-context',
  partialize: (state) => ({
    autoRefreshEnabled: state.autoRefreshEnabled,
    refreshIntervalMs: state.refreshIntervalMs,
    cacheDurationMs: state.cacheDurationMs,
  }),
};

