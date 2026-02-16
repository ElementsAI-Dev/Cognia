import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { processStorePersistConfig } from './persist-config';
import { createProcessListSlice } from './slices/process-list.slice';
import { createResetSlice } from './slices/reset.slice';
import { createSettingsConfigSlice } from './slices/settings-config.slice';
import { createTrackedSlice } from './slices/tracked.slice';
import type { ProcessStoreState } from './types';

export const useProcessStore = create<ProcessStoreState>()(
  persist(
    (set) => ({
      ...initialState,
      ...createProcessListSlice(set),
      ...createTrackedSlice(set),
      ...createSettingsConfigSlice(set),
      ...createResetSlice(set),
    }),
    processStorePersistConfig
  )
);
