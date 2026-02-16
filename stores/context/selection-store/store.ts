import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialState } from './initial-state';
import { selectionStorePersistConfig } from './persist-config';
import { createConfigActionsSlice } from './slices/config-actions.slice';
import { createHistorySlice } from './slices/history.slice';
import { createMultiSelectionSlice } from './slices/multi-selection.slice';
import { createProcessingSlice } from './slices/processing.slice';
import { createReferencesSlice } from './slices/references.slice';
import { createTranslationMemorySlice } from './slices/translation-memory.slice';
import { createUiSlice } from './slices/ui.slice';
import type { SelectionStore } from './types';

export const useSelectionStore = create<SelectionStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createUiSlice(set),
      ...createProcessingSlice(set),
      ...createHistorySlice(set, get),
      ...createMultiSelectionSlice(set, get),
      ...createReferencesSlice(set),
      ...createTranslationMemorySlice(set, get),
      ...createConfigActionsSlice(set, get),
    }),
    selectionStorePersistConfig
  )
);

