import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { CompressionHistoryStore, CompressionHistoryStoreState } from './types';

type PersistedCompressionHistoryStore = Pick<CompressionHistoryStoreState, 'entries'>;

export const compressionHistoryPersistConfig: PersistOptions<
  CompressionHistoryStore,
  PersistedCompressionHistoryStore
> = {
  name: 'cognia-compression-history',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    entries: state.entries,
  }),
};
