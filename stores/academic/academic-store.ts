/**
 * Academic Mode Store - Zustand state management for paper library
 *
 * Composes domain slices for search, library, collections, PDF, annotations, and providers.
 * Each slice is defined in stores/academic/slices/ for maintainability.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AcademicModeSettings,
  AcademicStatistics,
} from '@/types/academic';
import { DEFAULT_ACADEMIC_SETTINGS } from '@/types/academic';
import {
  createSearchSlice,
  createLibrarySlice,
  createCollectionSlice,
  createPdfSlice,
  createAnnotationSlice,
  createProviderSlice,
  createZoteroSlice,
  initialSearchState,
  initialLibraryState,
} from './slices';
import type { SearchState, SearchActions } from './slices/search-slice';
import type { LibraryState, LibraryActions } from './slices/library-slice';
import type { CollectionActions } from './slices/collection-slice';
import type { PdfActions } from './slices/pdf-slice';
import type { AnnotationActions } from './slices/annotation-slice';
import type { ProviderActions } from './slices/provider-slice';
import type { ZoteroActions } from './slices/zotero-slice';

export type AcademicActiveTab =
  | 'search'
  | 'library'
  | 'collections'
  | 'analysis'
  | 'stats'
  | 'compare'
  | 'recommend'
  | 'smart'
  | 'knowledge';

export interface AcademicState
  extends SearchActions,
    LibraryActions,
    CollectionActions,
    PdfActions,
    AnnotationActions,
    ProviderActions,
    ZoteroActions {
  // Nested state
  search: SearchState;
  library: LibraryState;
  settings: AcademicModeSettings;
  statistics: AcademicStatistics | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  activeTab: AcademicActiveTab;

  // UI actions
  setActiveTab: (tab: AcademicActiveTab) => void;
  setSelectedPaper: (paperId: string | null) => void;
  setSelectedCollection: (collectionId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list' | 'table') => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState = {
  search: initialSearchState,
  library: initialLibraryState,
  settings: DEFAULT_ACADEMIC_SETTINGS,
  statistics: null as AcademicStatistics | null,
  isLoading: false,
  error: null as string | null,
  activeTab: 'search' as AcademicActiveTab,
};

export const useAcademicStore = create<AcademicState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Compose domain slices
      ...createSearchSlice(set, get),
      ...createLibrarySlice(set, get),
      ...createCollectionSlice(set, get),
      ...createPdfSlice(set, get),
      ...createAnnotationSlice(set, get),
      ...createProviderSlice(set, get),
      ...createZoteroSlice(set, get),

      // UI actions (not in slices)
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

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'academic-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        search: {
          searchHistory: state.search.searchHistory,
        },
        library: {
          viewMode: state.library.viewMode,
          sortBy: state.library.sortBy,
          sortOrder: state.library.sortOrder,
          analysisHistory: state.library.analysisHistory,
        },
      }),
    }
  )
);

export default useAcademicStore;
