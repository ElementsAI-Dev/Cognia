/**
 * Unit tests for useAcademic hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAcademic } from './use-academic';
import { useAcademicStore } from '@/stores/academic';
import type { Paper, LibraryPaper } from '@/types/learning/academic';

// Mock the academic store
jest.mock('@/stores/academic', () => ({
  useAcademicStore: jest.fn(),
}));

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockUseAcademicStore = useAcademicStore as jest.MockedFunction<typeof useAcademicStore>;

// Mock paper data
const createMockPaper = (id: string): Paper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract for paper',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  citationCount: 50,
  urls: [],
  metadata: { doi: '10.1234/test' },
  createdAt: new Date(),
  updatedAt: new Date(),
  fetchedAt: new Date(),
});

const createMockLibraryPaper = (id: string): LibraryPaper => ({
  ...createMockPaper(id),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  hasCachedPdf: false,
});

describe('useAcademic', () => {
  const mockStoreState = {
    search: {
      query: '',
      filter: {},
      results: [],
      totalResults: 0,
      isSearching: false,
      searchError: null,
      lastSearchTime: 0,
    },
    library: {
      papers: {},
      collections: {},
      selectedPaperId: null,
      selectedCollectionId: null,
      viewMode: 'list' as const,
      sortBy: 'added_at',
      sortOrder: 'desc' as const,
    },
    settings: {
      providers: {},
      defaultProviders: ['arxiv'],
      defaultSearchLimit: 20,
      aggregateSearch: true,
      preferOpenAccess: true,
      autoDownloadPdf: false,
      defaultAnalysisDepth: 'standard' as const,
      autoAnalyzeOnAdd: false,
      preferredLanguage: 'en',
      enableGuidedLearning: true,
      learningDifficulty: 'intermediate' as const,
      enableSpacedRepetition: true,
      defaultView: 'list' as const,
      showCitationCounts: true,
      showAbstractPreview: true,
    },
    statistics: null,
    isLoading: false,
    error: null,
    activeTab: 'search' as const,
    setSearchQuery: jest.fn(),
    setSearchFilter: jest.fn(),
    searchPapers: jest.fn(),
    searchWithProvider: jest.fn(),
    clearSearchResults: jest.fn(),
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
    hasCachedPdf: jest.fn(),
    deleteCachedPdf: jest.fn(),
    addAnnotation: jest.fn(),
    updateAnnotation: jest.fn(),
    deleteAnnotation: jest.fn(),
    getAnnotations: jest.fn(),
    addNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    getNotes: jest.fn(),
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcademicStore.mockReturnValue(mockStoreState);
  });

  describe('Initialization', () => {
    it('should return hook interface', () => {
      const { result } = renderHook(() => useAcademic());

      expect(result.current).toBeDefined();
      expect(typeof result.current.search).toBe('function');
      expect(typeof result.current.addToLibrary).toBe('function');
      expect(typeof result.current.updatePaperStatus).toBe('function');
    });

    it('should expose search state', () => {
      const { result } = renderHook(() => useAcademic());

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.isSearching).toBe(false);
    });

    it('should expose library state', () => {
      const { result } = renderHook(() => useAcademic());

      expect(result.current.libraryPapers).toEqual([]);
      expect(result.current.collections).toEqual([]);
    });
  });

  describe('Search Operations', () => {
    it('should search papers', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.search('machine learning');
      });

      expect(mockStoreState.setSearchQuery).toHaveBeenCalledWith('machine learning');
      expect(mockStoreState.searchPapers).toHaveBeenCalledWith('machine learning');
    });

    it('should set search query', () => {
      const { result } = renderHook(() => useAcademic());

      act(() => {
        result.current.setSearchQuery('deep learning');
      });

      expect(mockStoreState.setSearchQuery).toHaveBeenCalledWith('deep learning');
    });

    it('should set search filters', () => {
      const { result } = renderHook(() => useAcademic());

      act(() => {
        result.current.setSearchFilter({ yearFrom: 2020 });
      });

      expect(mockStoreState.setSearchFilter).toHaveBeenCalledWith({ yearFrom: 2020 });
    });
  });

  describe('Library Operations', () => {
    it('should add paper to library', async () => {
      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.addToLibrary(paper);
      });

      expect(mockStoreState.addToLibrary).toHaveBeenCalledWith(paper, undefined);
    });

    it('should add paper to library with collection', async () => {
      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.addToLibrary(paper, 'collection-1');
      });

      expect(mockStoreState.addToLibrary).toHaveBeenCalledWith(paper, 'collection-1');
    });

    it('should remove paper from library', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.removeFromLibrary('paper-1');
      });

      expect(mockStoreState.removeFromLibrary).toHaveBeenCalledWith('paper-1');
    });

    it('should update paper status', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.updatePaperStatus('paper-1', 'reading');
      });

      expect(mockStoreState.updatePaper).toHaveBeenCalledWith('paper-1', { readingStatus: 'reading' });
    });

    it('should update paper rating', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.updatePaperRating('paper-1', 5);
      });

      expect(mockStoreState.updatePaper).toHaveBeenCalledWith('paper-1', { userRating: 5 });
    });

    it('should add paper note', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.addPaperNote('paper-1', 'Great paper!');
      });

      expect(mockStoreState.updatePaper).toHaveBeenCalledWith('paper-1', { userNotes: 'Great paper!' });
    });
  });

  describe('Collection Operations', () => {
    it('should create collection', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.createCollection('My Research', 'Description', '#3b82f6');
      });

      expect(mockStoreState.createCollection).toHaveBeenCalledWith('My Research', 'Description', '#3b82f6');
    });

    it('should add paper to collection', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.addToCollection('paper-1', 'collection-1');
      });

      expect(mockStoreState.addToCollection).toHaveBeenCalledWith('paper-1', 'collection-1');
    });

    it('should remove paper from collection', async () => {
      const { result } = renderHook(() => useAcademic());

      await act(async () => {
        await result.current.removeFromCollection('paper-1', 'collection-1');
      });

      expect(mockStoreState.removeFromCollection).toHaveBeenCalledWith('paper-1', 'collection-1');
    });
  });

  describe('PDF Operations', () => {
    it('should have downloadPdf function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.downloadPdf).toBe('function');
    });

    it('should have hasPdf function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.hasPdf).toBe('function');
    });
  });

  describe('Derived State', () => {
    it('should compute library papers array from object', () => {
      const papers = {
        '1': createMockLibraryPaper('1'),
        '2': createMockLibraryPaper('2'),
      };
      mockUseAcademicStore.mockReturnValue({
        ...mockStoreState,
        library: { ...mockStoreState.library, papers },
      });

      const { result } = renderHook(() => useAcademic());

      expect(result.current.libraryPapers.length).toBe(2);
    });

    it('should compute collections array from object', () => {
      const collections = {
        '1': { id: '1', name: 'Research', paperIds: [], createdAt: new Date(), updatedAt: new Date() },
        '2': { id: '2', name: 'To Read', paperIds: [], createdAt: new Date(), updatedAt: new Date() },
      };
      mockUseAcademicStore.mockReturnValue({
        ...mockStoreState,
        library: { ...mockStoreState.library, collections },
      });

      const { result } = renderHook(() => useAcademic());

      expect(result.current.collections.length).toBe(2);
    });
  });

  describe('Analysis Operations', () => {
    it('should have analyzePaper function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.analyzePaper).toBe('function');
    });

    it('should have startGuidedLearning function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.startGuidedLearning).toBe('function');
    });
  });

  describe('Import/Export Operations', () => {
    it('should have importBibtex function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.importBibtex).toBe('function');
    });

    it('should have exportBibtex function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.exportBibtex).toBe('function');
    });
  });

  describe('Refresh Operations', () => {
    it('should have refresh function', () => {
      const { result } = renderHook(() => useAcademic());

      expect(typeof result.current.refresh).toBe('function');
    });
  });
});
