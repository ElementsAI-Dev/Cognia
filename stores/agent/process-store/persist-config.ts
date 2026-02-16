import type { PersistOptions } from 'zustand/middleware';
import type { ProcessStoreState, TrackedProcess } from './types';

type PersistedProcessStoreState = Pick<ProcessStoreState, 'autoRefresh' | 'autoRefreshInterval'> & {
  trackedProcesses: [number, TrackedProcess][];
};

export const processStorePersistConfig: PersistOptions<
  ProcessStoreState,
  PersistedProcessStoreState
> = {
  name: 'cognia-process-store',
  partialize: (state) => ({
    autoRefresh: state.autoRefresh,
    autoRefreshInterval: state.autoRefreshInterval,
    // Convert Map to array for persistence
    trackedProcesses: Array.from(state.trackedProcesses.entries()),
  }),
  merge: (persisted, current) => {
    const persistedState = persisted as PersistedProcessStoreState | undefined;

    return {
      ...current,
      ...(persistedState ?? {}),
      // Convert array back to Map
      trackedProcesses: persistedState?.trackedProcesses
        ? new Map(persistedState.trackedProcesses)
        : new Map(),
    };
  },
};
