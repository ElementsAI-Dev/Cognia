import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { contextStorePersistConfig } from './persist-config';
import { createConfigSlice } from './slices/config.slice';
import { createContextSlice } from './slices/context.slice';
import { createHistorySlice } from './slices/history.slice';
import { createResetSlice } from './slices/reset.slice';
import { createStatusSlice } from './slices/status.slice';
import type { ContextStore } from './types';

export const useContextStore = create<ContextStore>()(
  persist(
    (set) => ({
      ...initialState,
      ...createContextSlice(set),
      ...createStatusSlice(set),
      ...createConfigSlice(set),
      ...createHistorySlice(set),
      ...createResetSlice(set),
    }),
    contextStorePersistConfig
  )
);

