import { create } from 'zustand';
import { initialState } from './initial-state';
import { createContextSlice } from './slices/context.slice';
import { createMaintenanceSlice } from './slices/maintenance.slice';
import { createTempDataSlice } from './slices/temp-data.slice';
import { createToolCacheSlice } from './slices/tool-cache.slice';
import { createWorkingMemorySlice } from './slices/working-memory.slice';
import type { ParallelContextStore } from './types';

export const useParallelContextStore = create<ParallelContextStore>()((set, get) => ({
  ...initialState,
  ...createContextSlice(set, get),
  ...createWorkingMemorySlice(set, get),
  ...createToolCacheSlice(set, get),
  ...createTempDataSlice(set, get),
  ...createMaintenanceSlice(set, get),
}));
