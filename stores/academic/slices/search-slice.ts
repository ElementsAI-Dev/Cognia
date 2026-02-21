/**
 * Academic Store - Search Slice
 * Search state, actions, and history management
 */

import { academicRuntimeInvoke } from '@/lib/native/academic-runtime';
import type {
  Paper,
  PaperSearchFilter,
  AggregatedSearchResult,
  AcademicProviderType,
} from '@/types/academic';
import type { AcademicSliceCreator } from '../types';

// ============================================================================
// Search State Type
// ============================================================================

export interface SearchState {
  query: string;
  filter: PaperSearchFilter;
  results: Paper[];
  totalResults: number;
  isSearching: boolean;
  searchError: string | null;
  lastSearchTime: number;
  searchHistory: string[];
  degradedProviders: Record<string, { reason: string; retriable: boolean }>;
}

export const initialSearchState: SearchState = {
  query: '',
  filter: {},
  results: [],
  totalResults: 0,
  isSearching: false,
  searchError: null,
  lastSearchTime: 0,
  searchHistory: [],
  degradedProviders: {},
};

// ============================================================================
// Search Actions Type
// ============================================================================

export interface SearchActions {
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: Partial<PaperSearchFilter>) => void;
  searchPapers: (query?: string) => Promise<void>;
  searchWithProvider: (provider: AcademicProviderType, query: string) => Promise<void>;
  clearSearchResults: () => void;
  addSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
}

// ============================================================================
// Search Slice Creator
// ============================================================================

export const createSearchSlice: AcademicSliceCreator<SearchActions> = (set, get) => ({
  setSearchQuery: (query) => {
    set((state) => ({
      search: { ...state.search, query },
    }));
  },

  setSearchFilter: (filter) => {
    set((state) => ({
      search: {
        ...state.search,
        filter: { ...state.search.filter, ...filter },
      },
    }));
  },

  searchPapers: async (query) => {
    const state = get();
    const searchQuery = query ?? state.search.query;

    if (!searchQuery.trim()) {
      set((state) => ({
        search: {
          ...state.search,
          results: [],
          totalResults: 0,
          searchError: null,
          degradedProviders: {},
        },
      }));
      return;
    }

    set((state) => ({
      search: { ...state.search, isSearching: true, searchError: null },
    }));

    try {
      const result = await academicRuntimeInvoke<AggregatedSearchResult>('academic_search', {
        query: searchQuery,
        options: {
          ...state.search.filter,
          providers: state.settings.defaultProviders,
          sortBy: state.search.filter.sortBy || 'relevance',
          sortOrder: state.search.filter.sortOrder || 'desc',
          limit: state.settings.defaultSearchLimit,
        },
      });

      set((state) => ({
        search: {
          ...state.search,
          results: result.papers,
          totalResults: result.totalResults,
          isSearching: false,
          lastSearchTime: result.searchTimeMs ?? result.searchTime,
          degradedProviders: result.degradedProviders ?? {},
        },
      }));
    } catch (error) {
      set((state) => ({
        search: {
          ...state.search,
          isSearching: false,
          searchError: error instanceof Error ? error.message : String(error),
        },
      }));
    }
  },

  searchWithProvider: async (provider, query) => {
    set((state) => ({
      search: { ...state.search, isSearching: true, searchError: null },
    }));

    try {
      const result = await academicRuntimeInvoke<{
        papers: Paper[];
        totalResults: number;
        searchTime: number;
        searchTimeMs?: number;
      }>('academic_search_provider', {
        providerId: provider,
        query,
        options: {
          ...get().search.filter,
          sortBy: 'relevance',
          sortOrder: 'desc',
          limit: get().settings.defaultSearchLimit,
        },
      });

      set((state) => ({
        search: {
          ...state.search,
          results: result.papers,
          totalResults: result.totalResults,
          isSearching: false,
          lastSearchTime: result.searchTimeMs ?? result.searchTime,
          degradedProviders: {},
        },
      }));
    } catch (error) {
      set((state) => ({
        search: {
          ...state.search,
          isSearching: false,
          searchError: error instanceof Error ? error.message : String(error),
        },
      }));
    }
  },

  clearSearchResults: () => {
    set((state) => ({
      search: {
        ...initialSearchState,
        query: state.search.query,
        filter: state.search.filter,
      },
    }));
  },

  addSearchHistory: (query) => {
    if (!query.trim()) return;
    set((state) => {
      const history = state.search.searchHistory.filter((q) => q !== query);
      const newHistory = [query, ...history].slice(0, 20);
      return {
        search: { ...state.search, searchHistory: newHistory },
      };
    });
  },

  clearSearchHistory: () => {
    set((state) => ({
      search: { ...state.search, searchHistory: [] },
    }));
  },
});
