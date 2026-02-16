/**
 * Knowledge Map Store - Zustand state management for knowledge maps
 *
 * Composes slices for CRUD, generation, annotations, navigation,
 * import/export, traces/locations, and app-level state actions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  createKnowledgeMapCrudSlice,
  createKnowledgeMapGenerationSlice,
  createKnowledgeMapAnnotationSlice,
  createKnowledgeMapNavigationSlice,
  createKnowledgeMapImportExportSlice,
  createKnowledgeMapTraceSlice,
  createKnowledgeMapAppSlice,
  initialKnowledgeMapStoreState,
} from './knowledge-map-slices';
import type {
  KnowledgeMapStoreInitialState,
  KnowledgeMapStoreState,
} from './knowledge-map-store-types';
import { partializeKnowledgeMapStore } from './knowledge-map-persist-config';

export type { KnowledgeMapStoreState } from './knowledge-map-store-types';

const initialState: KnowledgeMapStoreInitialState = initialKnowledgeMapStoreState;

export const useKnowledgeMapStore = create<KnowledgeMapStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      ...createKnowledgeMapCrudSlice(set, get),
      ...createKnowledgeMapGenerationSlice(set, get),
      ...createKnowledgeMapAnnotationSlice(set, get),
      ...createKnowledgeMapNavigationSlice(set, get),
      ...createKnowledgeMapImportExportSlice(set, get),
      ...createKnowledgeMapTraceSlice(set, get),
      ...createKnowledgeMapAppSlice(set, get, initialState),
    }),
    {
      name: 'knowledge-map-store',
      storage: createJSONStorage(() => localStorage),
      partialize: partializeKnowledgeMapStore,
    }
  )
);

export default useKnowledgeMapStore;
