import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { summaryStorePersistConfig } from './persist-config';
import { createConfigSlice } from './slices/config.slice';
import { createCrudSlice } from './slices/crud.slice';
import { createQuerySlice } from './slices/query.slice';
import { createSessionSlice } from './slices/session.slice';
import { createStatusSlice } from './slices/status.slice';
import type { SummaryStore } from './types';

export const useSummaryStore = create<SummaryStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createSessionSlice(set, get),
      ...createCrudSlice(set, get),
      ...createQuerySlice(get),
      ...createConfigSlice(set, get),
      ...createStatusSlice(set),
    }),
    summaryStorePersistConfig
  )
);

export default useSummaryStore;
