/**
 * Knowledge Map Store - App Slice
 */

import type {
  KnowledgeMapAppActions,
  KnowledgeMapStoreGet,
  KnowledgeMapStoreInitialState,
  KnowledgeMapStoreSet,
} from '../knowledge-map-store-types';

export function createKnowledgeMapAppSlice(
  set: KnowledgeMapStoreSet,
  _get: KnowledgeMapStoreGet,
  initialState: KnowledgeMapStoreInitialState
): KnowledgeMapAppActions {
  return {
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    reset: () => set(initialState),
  };
}
