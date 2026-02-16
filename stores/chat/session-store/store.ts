import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { sessionStorePersistConfig } from './persist-config';
import { createBranchSlice } from './slices/branch.slice';
import { createBulkSlice } from './slices/bulk.slice';
import { createCoreSlice } from './slices/core.slice';
import { createGoalSlice } from './slices/goal.slice';
import { createModeSlice } from './slices/mode.slice';
import { createViewSlice } from './slices/view.slice';
import type { SessionStore } from './types';

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createCoreSlice(set, get),
      ...createModeSlice(set, get),
      ...createBranchSlice(set, get),
      ...createViewSlice(set, get),
      ...createGoalSlice(set, get),
      ...createBulkSlice(set, get),
    }),
    sessionStorePersistConfig
  )
);
