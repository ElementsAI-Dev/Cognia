import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { SummaryStore, SummaryStoreState } from './types';

type PersistedSummaryStore = Pick<SummaryStoreState, 'autoSummaryConfig'>;

export const summaryStorePersistConfig: PersistOptions<SummaryStore, PersistedSummaryStore> = {
  name: 'summary-store',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    autoSummaryConfig: state.autoSummaryConfig,
  }),
};
