/**
 * Academic Store - UI Slice
 * Academic panel tab and library view selection state actions
 */

import type { AcademicActiveTab, AcademicSliceCreator, UiActions } from '../types';

export const initialUiState: { activeTab: AcademicActiveTab } = {
  activeTab: 'search',
};

export const createUiSlice: AcademicSliceCreator<UiActions> = (set) => ({
  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedPaper: (paperId) => {
    set((state) => ({
      library: { ...state.library, selectedPaperId: paperId },
    }));
  },

  setSelectedCollection: (collectionId) => {
    set((state) => ({
      library: { ...state.library, selectedCollectionId: collectionId },
    }));
  },

  setViewMode: (mode) => {
    set((state) => ({
      library: { ...state.library, viewMode: mode },
    }));
  },

  setSort: (sortBy, sortOrder) => {
    set((state) => ({
      library: { ...state.library, sortBy, sortOrder },
    }));
  },
});
