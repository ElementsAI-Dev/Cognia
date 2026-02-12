/**
 * Unit tests for useAcademicLibrary hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAcademicLibrary } from './use-academic-library';
import { useAcademicStore } from '@/stores/academic';
import type { Paper, LibraryPaper } from '@/types/academic';

// Mock dependencies
jest.mock('@/stores/academic', () => ({
  useAcademicStore: jest.fn(),
}));

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockUseAcademicStore = useAcademicStore as jest.MockedFunction<typeof useAcademicStore>;

const createMockPaper = (id: string): Paper => ({
  id,
  providerId: 'arxiv',
  externalId: `arxiv-${id}`,
  title: `Test Paper ${id}`,
  abstract: 'Test abstract',
  authors: [{ name: 'Test Author' }],
  year: 2023,
  urls: [],
  metadata: {},
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

const createMockStore = (overrides = {}) => ({
  search: { query: '', filter: {}, results: [], totalResults: 0, isSearching: false, searchError: null, lastSearchTime: 0, searchHistory: [] },
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
  addToLibrary: jest.fn().mockResolvedValue(createMockLibraryPaper('new')),
  removeFromLibrary: jest.fn().mockResolvedValue(undefined),
  updatePaper: jest.fn().mockResolvedValue(undefined),
  getPaper: jest.fn(),
  refreshLibrary: jest.fn().mockResolvedValue(undefined),
  createCollection: jest.fn().mockResolvedValue({ id: 'col-1', name: 'Test', paperIds: [], createdAt: new Date(), updatedAt: new Date() }),
  updateCollection: jest.fn(),
  deleteCollection: jest.fn().mockResolvedValue(undefined),
  addToCollection: jest.fn().mockResolvedValue(undefined),
  removeFromCollection: jest.fn().mockResolvedValue(undefined),
  refreshCollections: jest.fn().mockResolvedValue(undefined),
  downloadPdf: jest.fn().mockResolvedValue('/path/to/pdf'),
  getPdfPath: jest.fn(),
  deletePdf: jest.fn(),
  addAnnotation: jest.fn(),
  updateAnnotation: jest.fn(),
  deleteAnnotation: jest.fn(),
  getAnnotations: jest.fn(),
  getCitations: jest.fn(),
  getReferences: jest.fn(),
  importPapers: jest.fn().mockResolvedValue({ imported: 3, skipped: 0, errors: [] }),
  exportPapers: jest.fn().mockResolvedValue({ data: '@article{...}', count: 1 }),
  getProviders: jest.fn(),
  setProviderApiKey: jest.fn(),
  setProviderEnabled: jest.fn(),
  testProvider: jest.fn(),
  refreshStatistics: jest.fn().mockResolvedValue(undefined),
  updateSettings: jest.fn(),
  setActiveTab: jest.fn(),
  setSelectedPaper: jest.fn(),
  setSelectedCollection: jest.fn(),
  setViewMode: jest.fn(),
  setSort: jest.fn(),
  setError: jest.fn(),
  clearError: jest.fn(),
  reset: jest.fn(),
  addTag: jest.fn().mockResolvedValue(undefined),
  removeTag: jest.fn().mockResolvedValue(undefined),
  batchUpdateStatus: jest.fn().mockResolvedValue(undefined),
  batchAddToCollection: jest.fn().mockResolvedValue(undefined),
  batchRemoveFromLibrary: jest.fn().mockResolvedValue(undefined),
  togglePaperSelection: jest.fn(),
  selectAllPapers: jest.fn(),
  clearPaperSelection: jest.fn(),
  saveAnalysisResult: jest.fn(),
  getAnalysisHistory: jest.fn().mockReturnValue([]),
  clearAnalysisHistory: jest.fn(),
  ...overrides,
});

describe('useAcademicLibrary', () => {
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore = createMockStore();
    mockUseAcademicStore.mockReturnValue(mockStore as never);
  });

  describe('Computed state', () => {
    it('should compute libraryPapers array from store object', () => {
      const papers = { '1': createMockLibraryPaper('1'), '2': createMockLibraryPaper('2') };
      mockStore = createMockStore({ library: { ...mockStore.library, papers } });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      expect(result.current.libraryPapers.length).toBe(2);
    });

    it('should compute collections array from store object', () => {
      const collections = {
        '1': { id: '1', name: 'Research', paperIds: [], createdAt: new Date(), updatedAt: new Date() },
      };
      mockStore = createMockStore({ library: { ...mockStore.library, collections } });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      expect(result.current.collections.length).toBe(1);
    });

    it('should return null for selectedPaper when none selected', () => {
      const { result } = renderHook(() => useAcademicLibrary());
      expect(result.current.selectedPaper).toBeNull();
    });

    it('should return selected paper when selectedPaperId is set', () => {
      const paper = createMockLibraryPaper('1');
      mockStore = createMockStore({
        library: { ...mockStore.library, papers: { '1': paper }, selectedPaperId: '1' },
      });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      expect(result.current.selectedPaper).toBeDefined();
      expect(result.current.selectedPaper?.id).toBe('1');
    });

    it('should expose viewMode from store', () => {
      const { result } = renderHook(() => useAcademicLibrary());
      expect(result.current.viewMode).toBe('list');
    });
  });

  describe('Library CRUD', () => {
    it('should add paper to library', async () => {
      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.addToLibrary(paper);
      });

      expect(mockStore.addToLibrary).toHaveBeenCalledWith(paper, undefined);
    });

    it('should add paper with collection', async () => {
      const paper = createMockPaper('1');
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.addToLibrary(paper, 'col-1');
      });

      expect(mockStore.addToLibrary).toHaveBeenCalledWith(paper, 'col-1');
    });

    it('should remove paper from library', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.removeFromLibrary('paper-1');
      });

      expect(mockStore.removeFromLibrary).toHaveBeenCalledWith('paper-1');
    });

    it('should update paper status', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.updatePaperStatus('paper-1', 'reading');
      });

      expect(mockStore.updatePaper).toHaveBeenCalledWith('paper-1', { readingStatus: 'reading' });
    });

    it('should update paper rating', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.updatePaperRating('paper-1', 4);
      });

      expect(mockStore.updatePaper).toHaveBeenCalledWith('paper-1', { userRating: 4 });
    });

    it('should add paper note', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.addPaperNote('paper-1', 'Great findings');
      });

      expect(mockStore.updatePaper).toHaveBeenCalledWith('paper-1', { userNotes: 'Great findings' });
    });
  });

  describe('Collection actions', () => {
    it('should create collection', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.createCollection('Research', 'My papers', '#ff0000');
      });

      expect(mockStore.createCollection).toHaveBeenCalledWith('Research', 'My papers', '#ff0000');
    });

    it('should delete collection', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.deleteCollection('col-1');
      });

      expect(mockStore.deleteCollection).toHaveBeenCalledWith('col-1');
    });

    it('should add to collection', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.addToCollection('paper-1', 'col-1');
      });

      expect(mockStore.addToCollection).toHaveBeenCalledWith('paper-1', 'col-1');
    });

    it('should remove from collection', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.removeFromCollection('paper-1', 'col-1');
      });

      expect(mockStore.removeFromCollection).toHaveBeenCalledWith('paper-1', 'col-1');
    });
  });

  describe('PDF actions', () => {
    it('should download PDF', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      let path;
      await act(async () => {
        path = await result.current.downloadPdf('paper-1', 'https://example.com/paper.pdf');
      });

      expect(mockStore.downloadPdf).toHaveBeenCalledWith('paper-1', 'https://example.com/paper.pdf');
      expect(path).toBe('/path/to/pdf');
    });

    it('should check hasPdf', () => {
      const paper = { ...createMockLibraryPaper('1'), hasCachedPdf: true };
      mockStore = createMockStore({
        library: { ...mockStore.library, papers: { '1': paper } },
      });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      expect(result.current.hasPdf('1')).toBe(true);
      expect(result.current.hasPdf('non-existent')).toBe(false);
    });
  });

  describe('UI actions', () => {
    it('should select paper', () => {
      const { result } = renderHook(() => useAcademicLibrary());

      act(() => {
        result.current.selectPaper('paper-1');
      });

      expect(mockStore.setSelectedPaper).toHaveBeenCalledWith('paper-1');
    });

    it('should select collection', () => {
      const { result } = renderHook(() => useAcademicLibrary());

      act(() => {
        result.current.selectCollection('col-1');
      });

      expect(mockStore.setSelectedCollection).toHaveBeenCalledWith('col-1');
    });
  });

  describe('Import/Export', () => {
    it('should import BibTeX', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      let count;
      await act(async () => {
        count = await result.current.importBibtex('@article{test}');
      });

      expect(mockStore.importPapers).toHaveBeenCalledWith('@article{test}', 'bibtex');
      expect(count).toBe(3);
    });

    it('should export BibTeX', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      let data;
      await act(async () => {
        data = await result.current.exportBibtex(['paper-1']);
      });

      expect(mockStore.exportPapers).toHaveBeenCalledWith(['paper-1'], undefined, 'bibtex');
      expect(data).toBe('@article{...}');
    });
  });

  describe('Tag actions', () => {
    it('should add tag', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.addTag('paper-1', 'important');
      });

      expect(mockStore.addTag).toHaveBeenCalledWith('paper-1', 'important');
    });

    it('should remove tag', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.removeTag('paper-1', 'obsolete');
      });

      expect(mockStore.removeTag).toHaveBeenCalledWith('paper-1', 'obsolete');
    });
  });

  describe('Batch actions', () => {
    it('should batch update status', async () => {
      mockStore = createMockStore({
        library: { ...mockStore.library, selectedPaperIds: ['p1', 'p2'] },
      });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.batchUpdateStatus('completed');
      });

      expect(mockStore.batchUpdateStatus).toHaveBeenCalledWith(['p1', 'p2'], 'completed');
    });

    it('should not batch update when no papers selected', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.batchUpdateStatus('completed');
      });

      expect(mockStore.batchUpdateStatus).not.toHaveBeenCalled();
    });

    it('should batch add to collection', async () => {
      mockStore = createMockStore({
        library: { ...mockStore.library, selectedPaperIds: ['p1'] },
      });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.batchAddToCollection('col-1');
      });

      expect(mockStore.batchAddToCollection).toHaveBeenCalledWith(['p1'], 'col-1');
    });

    it('should batch remove', async () => {
      mockStore = createMockStore({
        library: { ...mockStore.library, selectedPaperIds: ['p1', 'p2'] },
      });
      mockUseAcademicStore.mockReturnValue(mockStore as never);

      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.batchRemove();
      });

      expect(mockStore.batchRemoveFromLibrary).toHaveBeenCalledWith(['p1', 'p2']);
    });
  });

  describe('Refresh', () => {
    it('should refresh library, collections, and statistics', async () => {
      const { result } = renderHook(() => useAcademicLibrary());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockStore.refreshLibrary).toHaveBeenCalled();
      expect(mockStore.refreshCollections).toHaveBeenCalled();
      expect(mockStore.refreshStatistics).toHaveBeenCalled();
    });
  });
});
