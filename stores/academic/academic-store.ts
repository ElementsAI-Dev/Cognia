/**
 * Academic Mode Store - Zustand state management for paper library
 *
 * Composes domain slices for search, library, collections, PDF, annotations,
 * providers, UI actions, and app-level reset/error handling.
 * Each slice is defined in stores/academic/slices/ for maintainability.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_ACADEMIC_SETTINGS } from '@/types/academic';
import {
  createSearchSlice,
  createLibrarySlice,
  createCollectionSlice,
  createPdfSlice,
  createAnnotationSlice,
  createProviderSlice,
  createZoteroSlice,
  createUiSlice,
  createAppSlice,
  initialSearchState,
  initialLibraryState,
  initialUiState,
  initialAppState,
} from './slices';
import type { AcademicInitialState, AcademicState } from './types';
import { partializeAcademicStore } from './persist-config';

export type { AcademicState, AcademicActiveTab } from './types';

const initialState: AcademicInitialState = {
  search: initialSearchState,
  library: initialLibraryState,
  ...initialUiState,
  ...initialAppState,
  settings: DEFAULT_ACADEMIC_SETTINGS,
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
      ...createUiSlice(set, get),
      ...createAppSlice(set, get, initialState),
    }),
    {
      name: 'academic-store',
      storage: createJSONStorage(() => localStorage),
      partialize: partializeAcademicStore,
    }
  )
);

export default useAcademicStore;
