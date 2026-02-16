import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { compressionHistoryPersistConfig } from './persist-config';
import { createEntriesSlice } from './slices/entries.slice';
import { createQuerySlice } from './slices/query.slice';
import type { CompressionHistoryStore } from './types';

export const useCompressionHistoryStore = create<CompressionHistoryStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createEntriesSlice(set),
      ...createQuerySlice(get),
    }),
    compressionHistoryPersistConfig
  )
);

export default useCompressionHistoryStore;
