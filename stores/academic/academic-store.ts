/**
 * Academic Mode Store - Zustand state management for paper library
 * 
 * Manages paper search, library, collections, and analysis state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type {
  Paper,
  LibraryPaper,
  PaperCollection,
  PaperAnnotation,
  AcademicProviderType,
  AcademicProviderConfig,
  PaperSearchFilter,
  AggregatedSearchResult,
  AcademicModeSettings,
  AcademicStatistics,
  ImportResult,
  AcademicExportResult,
} from '@/types/learning/academic';
import { DEFAULT_ACADEMIC_SETTINGS } from '@/types/learning/academic';

interface SearchState {
  query: string;
  filter: PaperSearchFilter;
  results: Paper[];
  totalResults: number;
  isSearching: boolean;
  searchError: string | null;
  lastSearchTime: number;
}

interface LibraryState {
  papers: Record<string, LibraryPaper>;
  collections: Record<string, PaperCollection>;
  selectedPaperId: string | null;
  selectedCollectionId: string | null;
  viewMode: 'grid' | 'list' | 'table';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AcademicState {
  // Search state
  search: SearchState;
  
  // Library state
  library: LibraryState;
  
  // Settings
  settings: AcademicModeSettings;
  
  // Statistics
  statistics: AcademicStatistics | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  activeTab: 'search' | 'library' | 'collections' | 'analysis' | 'stats' | 'compare' | 'recommend' | 'smart';
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: Partial<PaperSearchFilter>) => void;
  searchPapers: (query?: string) => Promise<void>;
  searchWithProvider: (provider: AcademicProviderType, query: string) => Promise<void>;
  clearSearchResults: () => void;
  
  // Library actions
  addToLibrary: (paper: Paper, collectionId?: string) => Promise<LibraryPaper>;
  removeFromLibrary: (paperId: string) => Promise<void>;
  updatePaper: (paperId: string, updates: Partial<LibraryPaper>) => Promise<void>;
  getPaper: (paperId: string) => Promise<LibraryPaper | null>;
  refreshLibrary: () => Promise<void>;
  
  // Collection actions
  createCollection: (name: string, description?: string, color?: string) => Promise<PaperCollection>;
  updateCollection: (collectionId: string, updates: Partial<PaperCollection>) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  addToCollection: (paperId: string, collectionId: string) => Promise<void>;
  removeFromCollection: (paperId: string, collectionId: string) => Promise<void>;
  refreshCollections: () => Promise<void>;
  
  // PDF actions
  downloadPdf: (paperId: string, pdfUrl: string) => Promise<string>;
  getPdfPath: (paperId: string) => Promise<string | null>;
  deletePdf: (paperId: string) => Promise<void>;
  
  // Annotation actions
  addAnnotation: (paperId: string, annotation: Omit<PaperAnnotation, 'id' | 'paperId' | 'createdAt' | 'updatedAt'>) => Promise<PaperAnnotation>;
  updateAnnotation: (annotationId: string, updates: Partial<PaperAnnotation>) => Promise<void>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  getAnnotations: (paperId: string) => Promise<PaperAnnotation[]>;
  
  // Citation/Reference actions
  getCitations: (paperId: string, provider: AcademicProviderType) => Promise<Paper[]>;
  getReferences: (paperId: string, provider: AcademicProviderType) => Promise<Paper[]>;
  
  // Import/Export actions
  importPapers: (data: string, format: string, options?: { mergeStrategy?: string; targetCollection?: string }) => Promise<ImportResult>;
  exportPapers: (paperIds?: string[], collectionId?: string, format?: string) => Promise<AcademicExportResult>;
  
  // Provider actions
  getProviders: () => Promise<AcademicProviderConfig[]>;
  setProviderApiKey: (providerId: AcademicProviderType, apiKey: string | null) => Promise<void>;
  setProviderEnabled: (providerId: AcademicProviderType, enabled: boolean) => Promise<void>;
  testProvider: (providerId: AcademicProviderType) => Promise<boolean>;
  
  // Statistics actions
  refreshStatistics: () => Promise<void>;
  
  // Settings actions
  updateSettings: (settings: Partial<AcademicModeSettings>) => void;
  
  // UI actions
  setActiveTab: (tab: 'search' | 'library' | 'collections' | 'analysis' | 'stats' | 'compare' | 'recommend' | 'smart') => void;
  setSelectedPaper: (paperId: string | null) => void;
  setSelectedCollection: (collectionId: string | null) => void;
  setViewMode: (mode: 'grid' | 'list' | 'table') => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Reset
  reset: () => void;
}

const initialSearchState: SearchState = {
  query: '',
  filter: {},
  results: [],
  totalResults: 0,
  isSearching: false,
  searchError: null,
  lastSearchTime: 0,
};

const initialLibraryState: LibraryState = {
  papers: {},
  collections: {},
  selectedPaperId: null,
  selectedCollectionId: null,
  viewMode: 'list',
  sortBy: 'added_at',
  sortOrder: 'desc',
};

const initialState = {
  search: initialSearchState,
  library: initialLibraryState,
  settings: DEFAULT_ACADEMIC_SETTINGS,
  statistics: null,
  isLoading: false,
  error: null,
  activeTab: 'search' as const,
};

export const useAcademicStore = create<AcademicState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Search actions
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
            },
          }));
          return;
        }

        set((state) => ({
          search: { ...state.search, isSearching: true, searchError: null },
        }));

        try {
          const result = await invoke<AggregatedSearchResult>('academic_search', {
            query: searchQuery,
            options: {
              ...state.search.filter,
              providers: state.settings.defaultProviders,
              sort_by: state.search.filter.sortBy || 'relevance',
              sort_order: state.search.filter.sortOrder || 'desc',
              limit: state.settings.defaultSearchLimit,
            },
          });

          set((state) => ({
            search: {
              ...state.search,
              results: result.papers,
              totalResults: result.totalResults,
              isSearching: false,
              lastSearchTime: result.searchTime,
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
          const result = await invoke<{ papers: Paper[]; totalResults: number; searchTime: number }>('academic_search_provider', {
            providerId: provider,
            query,
            options: {
              ...get().search.filter,
              sort_by: 'relevance',
              sort_order: 'desc',
              limit: get().settings.defaultSearchLimit,
            },
          });

          set((state) => ({
            search: {
              ...state.search,
              results: result.papers,
              totalResults: result.totalResults,
              isSearching: false,
              lastSearchTime: result.searchTime,
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
          search: { ...initialSearchState, query: state.search.query, filter: state.search.filter },
        }));
      },

      // Library actions
      addToLibrary: async (paper, collectionId) => {
        set({ isLoading: true, error: null });
        try {
          const libraryPaper = await invoke<LibraryPaper>('academic_add_to_library', {
            paper,
            collectionId,
          });

          set((state) => ({
            library: {
              ...state.library,
              papers: { ...state.library.papers, [libraryPaper.id]: libraryPaper },
            },
            isLoading: false,
          }));

          return libraryPaper;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      removeFromLibrary: async (paperId) => {
        set({ isLoading: true, error: null });
        try {
          await invoke('academic_remove_from_library', { paperId });

          set((state) => {
            const papers = { ...state.library.papers };
            delete papers[paperId];
            return {
              library: { ...state.library, papers },
              isLoading: false,
            };
          });
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      updatePaper: async (paperId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await invoke<LibraryPaper>('academic_update_paper', {
            paperId,
            updates: {
              reading_status: updates.readingStatus,
              priority: updates.priority,
              reading_progress: updates.readingProgress,
              user_rating: updates.userRating,
              user_notes: updates.userNotes,
              tags: updates.tags,
              ai_summary: updates.aiSummary,
              ai_key_insights: updates.aiKeyInsights,
              ai_related_topics: updates.aiRelatedTopics,
            },
          });

          set((state) => ({
            library: {
              ...state.library,
              papers: { ...state.library.papers, [paperId]: updated },
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      getPaper: async (paperId) => {
        try {
          const paper = await invoke<LibraryPaper | null>('academic_get_paper_by_id', { paperId });
          return paper;
        } catch {
          return null;
        }
      },

      refreshLibrary: async () => {
        set({ isLoading: true, error: null });
        try {
          const papers = await invoke<LibraryPaper[]>('academic_get_library_papers', { filter: null });
          
          const papersMap: Record<string, LibraryPaper> = {};
          for (const paper of papers) {
            papersMap[paper.id] = paper;
          }

          set((state) => ({
            library: { ...state.library, papers: papersMap },
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
        }
      },

      // Collection actions
      createCollection: async (name, description, color) => {
        set({ isLoading: true, error: null });
        try {
          const collection = await invoke<PaperCollection>('academic_create_collection', {
            name,
            description,
            color,
            parentId: null,
          });

          set((state) => ({
            library: {
              ...state.library,
              collections: { ...state.library.collections, [collection.id]: collection },
            },
            isLoading: false,
          }));

          return collection;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      updateCollection: async (collectionId, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await invoke<PaperCollection>('academic_update_collection', {
            collectionId,
            updates,
          });

          set((state) => ({
            library: {
              ...state.library,
              collections: { ...state.library.collections, [collectionId]: updated },
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      deleteCollection: async (collectionId) => {
        set({ isLoading: true, error: null });
        try {
          await invoke('academic_delete_collection', { collectionId });

          set((state) => {
            const collections = { ...state.library.collections };
            delete collections[collectionId];
            return {
              library: { ...state.library, collections },
              isLoading: false,
            };
          });
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      addToCollection: async (paperId, collectionId) => {
        try {
          await invoke('academic_add_paper_to_collection', { paperId, collectionId });
          await get().refreshLibrary();
          await get().refreshCollections();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      removeFromCollection: async (paperId, collectionId) => {
        try {
          await invoke('academic_remove_paper_from_collection', { paperId, collectionId });
          await get().refreshLibrary();
          await get().refreshCollections();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      refreshCollections: async () => {
        try {
          const collections = await invoke<PaperCollection[]>('academic_get_collections');
          
          const collectionsMap: Record<string, PaperCollection> = {};
          for (const collection of collections) {
            collectionsMap[collection.id] = collection;
          }

          set((state) => ({
            library: { ...state.library, collections: collectionsMap },
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
        }
      },

      // PDF actions
      downloadPdf: async (paperId, pdfUrl) => {
        set({ isLoading: true, error: null });
        try {
          const path = await invoke<string>('academic_download_pdf', { paperId, pdfUrl });
          set({ isLoading: false });
          await get().refreshLibrary();
          return path;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      getPdfPath: async (paperId) => {
        try {
          const path = await invoke<string | null>('academic_get_pdf_path', { paperId });
          return path;
        } catch {
          return null;
        }
      },

      deletePdf: async (paperId) => {
        try {
          await invoke('academic_delete_pdf', { paperId });
          await get().refreshLibrary();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      // Annotation actions
      addAnnotation: async (paperId, annotation) => {
        try {
          const result = await invoke<PaperAnnotation>('academic_add_annotation', {
            paperId,
            annotation: {
              type: annotation.type,
              content: annotation.content,
              page_number: annotation.pageNumber,
              position: annotation.position,
              color: annotation.color,
            },
          });
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      updateAnnotation: async (annotationId, updates) => {
        try {
          await invoke('academic_update_annotation', {
            annotationId,
            updates: {
              content: updates.content,
              color: updates.color,
            },
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      deleteAnnotation: async (annotationId) => {
        try {
          await invoke('academic_delete_annotation', { annotationId });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      getAnnotations: async (paperId) => {
        try {
          const annotations = await invoke<PaperAnnotation[]>('academic_get_annotations', { paperId });
          return annotations;
        } catch {
          return [];
        }
      },

      // Citation/Reference actions
      getCitations: async (paperId, provider) => {
        try {
          const citations = await invoke<Paper[]>('academic_get_citations', {
            providerId: provider,
            paperId,
            limit: 50,
            offset: 0,
          });
          return citations;
        } catch {
          return [];
        }
      },

      getReferences: async (paperId, provider) => {
        try {
          const references = await invoke<Paper[]>('academic_get_references', {
            providerId: provider,
            paperId,
            limit: 50,
            offset: 0,
          });
          return references;
        } catch {
          return [];
        }
      },

      // Import/Export actions
      importPapers: async (data, format, options) => {
        set({ isLoading: true, error: null });
        try {
          const result = await invoke<ImportResult>('academic_import_papers', {
            data,
            format,
            options: {
              merge_strategy: options?.mergeStrategy || 'skip',
              import_annotations: true,
              import_notes: true,
              target_collection: options?.targetCollection,
            },
          });
          await get().refreshLibrary();
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      exportPapers: async (paperIds, collectionId, format = 'bibtex') => {
        set({ isLoading: true, error: null });
        try {
          const result = await invoke<AcademicExportResult>('academic_export_papers', {
            paperIds,
            collectionId,
            format,
            options: {
              include_annotations: true,
              include_notes: true,
              include_ai_analysis: true,
            },
          });
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      // Provider actions
      getProviders: async () => {
        try {
          const providers = await invoke<AcademicProviderConfig[]>('academic_get_providers');
          return providers;
        } catch {
          return [];
        }
      },

      setProviderApiKey: async (providerId, apiKey) => {
        try {
          await invoke('academic_set_provider_api_key', { providerId, apiKey });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      setProviderEnabled: async (providerId, enabled) => {
        try {
          await invoke('academic_set_provider_enabled', { providerId, enabled });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },

      testProvider: async (providerId) => {
        try {
          const result = await invoke<boolean>('academic_test_provider', { providerId });
          return result;
        } catch {
          return false;
        }
      },

      // Statistics actions
      refreshStatistics: async () => {
        try {
          const statistics = await invoke<AcademicStatistics>('academic_get_statistics');
          set({ statistics });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : String(error) });
        }
      },

      // Settings actions
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      // UI actions
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
        library: {
          viewMode: state.library.viewMode,
          sortBy: state.library.sortBy,
          sortOrder: state.library.sortOrder,
        },
      }),
    }
  )
);

export default useAcademicStore;
