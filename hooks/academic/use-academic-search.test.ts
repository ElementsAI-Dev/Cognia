/**
 * Unit tests for useAcademicSearch hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAcademicSearch } from './use-academic-search';
import { useAcademicStore } from '@/stores/academic';
import { useA2UI } from '@/hooks/a2ui/use-a2ui';
import { useSettingsStore } from '@/stores/settings';
import * as searchTool from '@/lib/ai/tools/academic-search-tool';
import * as academicTemplates from '@/lib/a2ui/academic-templates';

// Mock dependencies
jest.mock('@/stores/academic', () => ({
  useAcademicStore: jest.fn(),
}));

jest.mock('@/hooks/a2ui/use-a2ui', () => ({
  useA2UI: jest.fn(),
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn(),
}));

jest.mock('@/lib/ai/tools/academic-search-tool', () => ({
  executeAcademicSearch: jest.fn(),
}));

jest.mock('@/lib/a2ui/academic-templates', () => ({
  createSearchResultsSurface: jest.fn(),
  createPaperCardSurface: jest.fn(),
  createPaperComparisonSurface: jest.fn(),
}));

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockUseAcademicStore = useAcademicStore as jest.MockedFunction<typeof useAcademicStore>;
const mockUseA2UI = useA2UI as jest.MockedFunction<typeof useA2UI>;
const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

const mockStoreState = {
  search: {
    query: '',
    filter: {},
    results: [],
    totalResults: 0,
    isSearching: false,
    searchError: null,
    lastSearchTime: 0,
    searchHistory: [],
  },
  library: { papers: {}, collections: {}, selectedPaperId: null, selectedCollectionId: null, selectedPaperIds: [], viewMode: 'list' as const, sortBy: 'added_at', sortOrder: 'desc' as const, analysisHistory: {} },
  settings: { defaultProviders: ['arxiv'], defaultSearchLimit: 20, providers: {}, aggregateSearch: true, preferOpenAccess: true, autoDownloadPdf: false, defaultAnalysisDepth: 'standard' as const, autoAnalyzeOnAdd: false, preferredLanguage: 'en', enableGuidedLearning: true, learningDifficulty: 'intermediate' as const, enableSpacedRepetition: true, defaultView: 'list' as const, showCitationCounts: true, showAbstractPreview: true },
  statistics: null,
  isLoading: false,
  error: null,
  activeTab: 'search' as const,
  setSearchQuery: jest.fn(),
  setSearchFilter: jest.fn(),
  searchPapers: jest.fn(),
  searchWithProvider: jest.fn(),
  clearSearchResults: jest.fn(),
  addSearchHistory: jest.fn(),
  clearSearchHistory: jest.fn(),
  addToLibrary: jest.fn(),
  removeFromLibrary: jest.fn(),
  updatePaper: jest.fn(),
  getPaper: jest.fn(),
  refreshLibrary: jest.fn(),
  createCollection: jest.fn(),
  updateCollection: jest.fn(),
  deleteCollection: jest.fn(),
  addToCollection: jest.fn(),
  removeFromCollection: jest.fn(),
  refreshCollections: jest.fn(),
  downloadPdf: jest.fn(),
  getPdfPath: jest.fn(),
  deletePdf: jest.fn(),
  addAnnotation: jest.fn(),
  updateAnnotation: jest.fn(),
  deleteAnnotation: jest.fn(),
  getAnnotations: jest.fn(),
  getCitations: jest.fn(),
  getReferences: jest.fn(),
  importPapers: jest.fn(),
  exportPapers: jest.fn(),
  getProviders: jest.fn(),
  setProviderApiKey: jest.fn(),
  setProviderEnabled: jest.fn(),
  testProvider: jest.fn(),
  refreshStatistics: jest.fn(),
  updateSettings: jest.fn(),
  setActiveTab: jest.fn(),
  setSelectedPaper: jest.fn(),
  setSelectedCollection: jest.fn(),
  setViewMode: jest.fn(),
  setSort: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
  reset: jest.fn(),
  addTag: jest.fn(),
  removeTag: jest.fn(),
  batchUpdateStatus: jest.fn(),
  batchAddToCollection: jest.fn(),
  batchRemoveFromLibrary: jest.fn(),
  togglePaperSelection: jest.fn(),
  selectAllPapers: jest.fn(),
  clearPaperSelection: jest.fn(),
  saveAnalysisResult: jest.fn(),
  getAnalysisHistory: jest.fn(),
  clearAnalysisHistory: jest.fn(),
};

const mockA2UI = {
  processMessages: jest.fn(),
  surfaces: {},
  clearSurface: jest.fn(),
  clearAllSurfaces: jest.fn(),
};

describe('useAcademicSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademicStore.mockReturnValue(mockStoreState as never);
    mockUseA2UI.mockReturnValue(mockA2UI as never);
    mockUseSettingsStore.mockImplementation((selector: unknown) => {
      if (typeof selector === 'function') {
        return (selector as (state: { searchEnabled: boolean }) => boolean)({ searchEnabled: true });
      }
      return { searchEnabled: true };
    });
  });

  describe('State exposure', () => {
    it('should expose search state from store', () => {
      const { result } = renderHook(() => useAcademicSearch());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.searchError).toBeNull();
      expect(result.current.totalResults).toBe(0);
    });

    it('should expose search history', () => {
      mockUseAcademicStore.mockReturnValue({
        ...mockStoreState,
        search: { ...mockStoreState.search, searchHistory: ['query1', 'query2'] },
      } as never);

      const { result } = renderHook(() => useAcademicSearch());

      expect(result.current.searchHistory).toEqual(['query1', 'query2']);
    });

    it('should expose lastSearchResult as null initially', () => {
      const { result } = renderHook(() => useAcademicSearch());

      expect(result.current.lastSearchResult).toBeNull();
    });
  });

  describe('Enhanced search', () => {
    it('should call executeAcademicSearch with correct params', async () => {
      const mockResult = { success: true, papers: [], totalResults: 0, searchTime: 100 };
      (searchTool.executeAcademicSearch as jest.Mock).mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useAcademicSearch());

      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchPapers('machine learning');
      });

      expect(searchTool.executeAcademicSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'machine learning',
          providers: ['arxiv', 'semantic-scholar'],
          maxResults: 10,
          openAccessOnly: false,
          sortBy: 'relevance',
        })
      );
      expect(searchResult).toEqual(mockResult);
      expect(result.current.lastSearchResult).toEqual(mockResult);
    });

    it('should use custom providers', async () => {
      const mockResult = { success: true, papers: [], totalResults: 0, searchTime: 50 };
      (searchTool.executeAcademicSearch as jest.Mock).mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() =>
        useAcademicSearch({ defaultProviders: ['arxiv', 'core'] })
      );

      await act(async () => {
        await result.current.searchPapers('test');
      });

      expect(searchTool.executeAcademicSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: ['arxiv', 'core'],
        })
      );
    });
  });

  describe('Legacy search actions', () => {
    it('should call store search', async () => {
      const { result } = renderHook(() => useAcademicSearch());

      await act(async () => {
        await result.current.search('deep learning');
      });

      expect(mockStoreState.setSearchQuery).toHaveBeenCalledWith('deep learning');
      expect(mockStoreState.searchPapers).toHaveBeenCalledWith('deep learning');
    });

    it('should delegate setSearchQuery to store', () => {
      const { result } = renderHook(() => useAcademicSearch());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(mockStoreState.setSearchQuery).toHaveBeenCalledWith('test query');
    });

    it('should delegate setSearchFilter to store', () => {
      const { result } = renderHook(() => useAcademicSearch());

      act(() => {
        result.current.setSearchFilter({ yearFrom: 2020 });
      });

      expect(mockStoreState.setSearchFilter).toHaveBeenCalledWith({ yearFrom: 2020 });
    });

    it('should delegate clearSearch to store', () => {
      const { result } = renderHook(() => useAcademicSearch());

      act(() => {
        result.current.clearSearch();
      });

      expect(mockStoreState.clearSearchResults).toHaveBeenCalled();
    });

    it('should delegate searchWithProvider to store', async () => {
      const { result } = renderHook(() => useAcademicSearch());

      await act(async () => {
        await result.current.searchWithProvider('arxiv', 'test');
      });

      expect(mockStoreState.searchWithProvider).toHaveBeenCalledWith('arxiv', 'test');
    });
  });

  describe('Search history', () => {
    it('should delegate addSearchHistory to store', () => {
      const { result } = renderHook(() => useAcademicSearch());

      act(() => {
        result.current.addSearchHistory('new query');
      });

      expect(mockStoreState.addSearchHistory).toHaveBeenCalledWith('new query');
    });

    it('should delegate clearSearchHistory to store', () => {
      const { result } = renderHook(() => useAcademicSearch());

      act(() => {
        result.current.clearSearchHistory();
      });

      expect(mockStoreState.clearSearchHistory).toHaveBeenCalled();
    });
  });

  describe('A2UI integration', () => {
    it('should create search results UI when enabled', () => {
      (academicTemplates.createSearchResultsSurface as jest.Mock).mockReturnValue({
        surfaceId: 'surface-1',
        messages: [{ type: 'test' }],
      });

      const { result } = renderHook(() => useAcademicSearch({ enableA2UI: true }));

      let surfaceId;
      act(() => {
        surfaceId = result.current.createSearchResultsUI([], 'test query');
      });

      expect(surfaceId).toBe('surface-1');
      expect(mockA2UI.processMessages).toHaveBeenCalled();
    });

    it('should return null when A2UI is disabled', () => {
      const { result } = renderHook(() => useAcademicSearch({ enableA2UI: false }));

      let surfaceId;
      act(() => {
        surfaceId = result.current.createSearchResultsUI([], 'test query');
      });

      expect(surfaceId).toBeNull();
      expect(mockA2UI.processMessages).not.toHaveBeenCalled();
    });

    it('should create paper card UI', () => {
      (academicTemplates.createPaperCardSurface as jest.Mock).mockReturnValue({
        surfaceId: 'card-1',
        messages: [{ type: 'card' }],
      });

      const mockPaper = { id: '1', title: 'Test', authors: [], year: 2023 };
      const { result } = renderHook(() => useAcademicSearch({ enableA2UI: true }));

      let surfaceId;
      act(() => {
        surfaceId = result.current.createPaperCardUI(mockPaper as never);
      });

      expect(surfaceId).toBe('card-1');
    });
  });
});
