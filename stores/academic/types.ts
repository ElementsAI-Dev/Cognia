/**
 * Academic Store Types
 * Shared state/action/slice creator types for academic store and slices
 */

import type {
  AcademicModeSettings,
  AcademicStatistics,
} from '@/types/academic';
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

export interface UiActions {
  setActiveTab: (tab: AcademicActiveTab) => void;
  setSelectedPaper: (paperId: string | null) => void;
  setSelectedCollection: (collectionId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list' | 'table') => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export interface AppActions {
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

export interface AcademicStoreDataState {
  search: SearchState;
  library: LibraryState;
  settings: AcademicModeSettings;
  statistics: AcademicStatistics | null;
  isLoading: boolean;
  error: string | null;
  activeTab: AcademicActiveTab;
}

export type AcademicInitialState = AcademicStoreDataState;

export type AcademicState = AcademicStoreDataState &
  SearchActions &
  LibraryActions &
  CollectionActions &
  PdfActions &
  AnnotationActions &
  ProviderActions &
  ZoteroActions &
  UiActions &
  AppActions;

export type AcademicSetState = (
  updater:
    | Partial<AcademicState>
    | ((state: AcademicState) => Partial<AcademicState>)
) => void;

export type AcademicGetState = () => AcademicState;

export type AcademicSliceCreator<T> = (
  set: AcademicSetState,
  get: AcademicGetState
) => T;
