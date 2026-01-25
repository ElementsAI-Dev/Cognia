/**
 * Unit tests for Academic Store
 */

import { act, renderHook } from '@testing-library/react';
import { useAcademicStore } from './academic-store';
import type { Paper, LibraryPaper, PaperCollection } from '@/types/learning/academic';

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

// Mock paper data
const createMockPaper = (id: string, overrides: Partial<Paper> = {}): Paper => ({
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
  ...overrides,
});

const createMockLibraryPaper = (
  id: string,
  overrides: Partial<LibraryPaper> = {}
): LibraryPaper => ({
  ...createMockPaper(id),
  libraryId: `lib-${id}`,
  addedAt: new Date(),
  readingStatus: 'unread',
  priority: 'medium',
  ...overrides,
});

const createMockCollection = (
  id: string,
  overrides: Partial<PaperCollection> = {}
): PaperCollection => ({
  id,
  name: `Collection ${id}`,
  paperIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('useAcademicStore', () => {
  beforeEach(() => {
    // Reset store state
    const { result } = renderHook(() => useAcademicStore());
    act(() => {
      result.current.reset();
    });
    mockInvoke.mockClear();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAcademicStore());

      expect(result.current.search.query).toBe('');
      expect(result.current.search.results).toEqual([]);
      expect(result.current.search.isSearching).toBe(false);
      expect(result.current.library.papers).toEqual({});
      expect(result.current.library.collections).toEqual({});
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.activeTab).toBe('search');
    });

    it('should have valid default settings', () => {
      const { result } = renderHook(() => useAcademicStore());

      expect(result.current.settings).toBeDefined();
      expect(result.current.settings.defaultSearchLimit).toBeGreaterThan(0);
      expect(result.current.settings.defaultProviders).toBeInstanceOf(Array);
    });
  });

  describe('Search Actions', () => {
    it('should set search query', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setSearchQuery('machine learning');
      });

      expect(result.current.search.query).toBe('machine learning');
    });

    it('should set search filter', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setSearchFilter({
          yearFrom: 2020,
          yearTo: 2024,
          openAccessOnly: true,
        });
      });

      expect(result.current.search.filter.yearFrom).toBe(2020);
      expect(result.current.search.filter.yearTo).toBe(2024);
      expect(result.current.search.filter.openAccessOnly).toBe(true);
    });

    it('should search papers successfully', async () => {
      const mockResults = {
        papers: [createMockPaper('1'), createMockPaper('2')],
        totalResults: 2,
        searchTime: 100,
      };
      mockInvoke.mockResolvedValueOnce(mockResults);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.searchPapers('test query');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_search', expect.any(Object));
      expect(result.current.search.results.length).toBe(2);
      expect(result.current.search.totalResults).toBe(2);
      expect(result.current.search.isSearching).toBe(false);
    });

    it('should handle search error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Search failed'));

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.searchPapers('test query');
      });

      expect(result.current.search.isSearching).toBe(false);
      expect(result.current.search.searchError).toBe('Search failed');
    });

    it('should clear search results', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        result.current.clearSearchResults();
      });

      expect(result.current.search.results).toEqual([]);
      expect(result.current.search.totalResults).toBe(0);
      expect(result.current.search.query).toBe('test'); // Query should be preserved
    });
  });

  describe('Library Actions', () => {
    it('should add paper to library', async () => {
      const paper = createMockPaper('1');
      const libraryPaper = createMockLibraryPaper('1');
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToLibrary(paper);
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_add_to_library', expect.any(Object));
      expect(result.current.library.papers['1']).toBeDefined();
    });

    it('should remove paper from library', async () => {
      // First add a paper
      const libraryPaper = createMockLibraryPaper('1');
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToLibrary(createMockPaper('1'));
      });

      // Then remove it
      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.removeFromLibrary('1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_remove_from_library', { paperId: '1' });
      expect(result.current.library.papers['1']).toBeUndefined();
    });

    it('should update paper in library', async () => {
      const libraryPaper = createMockLibraryPaper('1');
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToLibrary(createMockPaper('1'));
      });

      const updatedPaper = { ...libraryPaper, readingStatus: 'reading' as const };
      mockInvoke.mockResolvedValueOnce(updatedPaper);

      await act(async () => {
        await result.current.updatePaper('1', { readingStatus: 'reading' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_update_paper', expect.any(Object));
    });

    it('should refresh library', async () => {
      const papers = [createMockLibraryPaper('1'), createMockLibraryPaper('2')];
      mockInvoke.mockResolvedValueOnce(papers);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.refreshLibrary();
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_get_library_papers', expect.any(Object));
      expect(Object.keys(result.current.library.papers).length).toBe(2);
    });
  });

  describe('Collection Actions', () => {
    it('should create collection', async () => {
      const collection = createMockCollection('1', { name: 'My Research' });
      mockInvoke.mockResolvedValueOnce(collection);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.createCollection('My Research', 'Description');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_create_collection', expect.any(Object));
      expect(result.current.library.collections['1']).toBeDefined();
    });

    it('should delete collection', async () => {
      const collection = createMockCollection('1');
      mockInvoke.mockResolvedValueOnce(collection);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.createCollection('Test', 'Test');
      });

      mockInvoke.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.deleteCollection('1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_delete_collection', { collectionId: '1' });
      expect(result.current.library.collections['1']).toBeUndefined();
    });

    it('should add paper to collection', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToCollection('paper-1', 'collection-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_add_paper_to_collection', {
        paperId: 'paper-1',
        collectionId: 'collection-1',
      });
    });

    it('should remove paper from collection', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.removeFromCollection('paper-1', 'collection-1');
      });

      // Check that the correct command was called
      expect(mockInvoke).toHaveBeenCalledWith(
        'academic_remove_paper_from_collection',
        expect.objectContaining({
          paperId: 'paper-1',
          collectionId: 'collection-1',
        })
      );
    });
  });

  describe('UI Actions', () => {
    it('should set active tab', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setActiveTab('library');
      });

      expect(result.current.activeTab).toBe('library');
    });

    it('should set selected paper', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setSelectedPaper('paper-1');
      });

      expect(result.current.library.selectedPaperId).toBe('paper-1');
    });

    it('should set view mode', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(result.current.library.viewMode).toBe('grid');
    });

    it('should set sort options', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setSort('year', 'asc');
      });

      expect(result.current.library.sortBy).toBe('year');
      expect(result.current.library.sortOrder).toBe('asc');
    });

    it('should set and clear error', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Settings Actions', () => {
    it('should update settings', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.updateSettings({
          defaultSearchLimit: 50,
          autoDownloadPdf: true,
        });
      });

      expect(result.current.settings.defaultSearchLimit).toBe(50);
      expect(result.current.settings.autoDownloadPdf).toBe(true);
    });
  });

  describe('Tag Actions', () => {
    it('should add tag to paper', async () => {
      const libraryPaper = createMockLibraryPaper('1', { tags: ['existing'] });
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      // Add paper to library first
      await act(async () => {
        await result.current.addToLibrary(createMockPaper('1'));
      });

      // Mock update response
      const updatedPaper = { ...libraryPaper, tags: ['existing', 'new-tag'] };
      mockInvoke.mockResolvedValueOnce(updatedPaper);

      await act(async () => {
        await result.current.addTag('1', 'new-tag');
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'academic_update_paper',
        expect.objectContaining({
          paperId: '1',
        })
      );
    });

    it('should not add duplicate tag', async () => {
      const libraryPaper = createMockLibraryPaper('1', { tags: ['existing'] });
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToLibrary(createMockPaper('1'));
      });

      const invokeCallCount = mockInvoke.mock.calls.length;

      await act(async () => {
        await result.current.addTag('1', 'existing');
      });

      // Should not call update if tag already exists
      expect(mockInvoke.mock.calls.length).toBe(invokeCallCount);
    });

    it('should remove tag from paper', async () => {
      const libraryPaper = createMockLibraryPaper('1', { tags: ['tag1', 'tag2'] });
      mockInvoke.mockResolvedValueOnce(libraryPaper);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.addToLibrary(createMockPaper('1'));
      });

      const updatedPaper = { ...libraryPaper, tags: ['tag1'] };
      mockInvoke.mockResolvedValueOnce(updatedPaper);

      await act(async () => {
        await result.current.removeTag('1', 'tag2');
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'academic_update_paper',
        expect.objectContaining({
          paperId: '1',
        })
      );
    });
  });

  describe('Batch Actions', () => {
    it('should toggle paper selection', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.togglePaperSelection('paper-1');
      });

      expect(result.current.library.selectedPaperIds).toContain('paper-1');

      act(() => {
        result.current.togglePaperSelection('paper-1');
      });

      expect(result.current.library.selectedPaperIds).not.toContain('paper-1');
    });

    it('should select all papers', async () => {
      const papers = [createMockLibraryPaper('1'), createMockLibraryPaper('2')];
      mockInvoke.mockResolvedValueOnce(papers);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.refreshLibrary();
      });

      act(() => {
        result.current.selectAllPapers();
      });

      expect(result.current.library.selectedPaperIds.length).toBe(2);
      expect(result.current.library.selectedPaperIds).toContain('1');
      expect(result.current.library.selectedPaperIds).toContain('2');
    });

    it('should clear paper selection', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.togglePaperSelection('paper-1');
        result.current.togglePaperSelection('paper-2');
      });

      expect(result.current.library.selectedPaperIds.length).toBe(2);

      act(() => {
        result.current.clearPaperSelection();
      });

      expect(result.current.library.selectedPaperIds.length).toBe(0);
    });

    it('should batch update status', async () => {
      const paper1 = createMockLibraryPaper('1');
      const paper2 = createMockLibraryPaper('2');
      mockInvoke.mockResolvedValueOnce([paper1, paper2]);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.refreshLibrary();
      });

      mockInvoke.mockResolvedValueOnce({ ...paper1, readingStatus: 'completed' });
      mockInvoke.mockResolvedValueOnce({ ...paper2, readingStatus: 'completed' });

      await act(async () => {
        await result.current.batchUpdateStatus(['1', '2'], 'completed');
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'academic_update_paper',
        expect.objectContaining({
          paperId: '1',
        })
      );
      expect(mockInvoke).toHaveBeenCalledWith(
        'academic_update_paper',
        expect.objectContaining({
          paperId: '2',
        })
      );
    });

    it('should batch add to collection', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce([]);
      mockInvoke.mockResolvedValueOnce([]);
      mockInvoke.mockResolvedValueOnce(undefined);
      mockInvoke.mockResolvedValueOnce([]);
      mockInvoke.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAcademicStore());

      await act(async () => {
        await result.current.batchAddToCollection(['paper-1', 'paper-2'], 'collection-1');
      });

      expect(mockInvoke).toHaveBeenCalledWith('academic_add_paper_to_collection', {
        paperId: 'paper-1',
        collectionId: 'collection-1',
      });
      expect(mockInvoke).toHaveBeenCalledWith('academic_add_paper_to_collection', {
        paperId: 'paper-2',
        collectionId: 'collection-1',
      });
    });
  });

  describe('Search History Actions', () => {
    it('should add search history', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.addSearchHistory('machine learning');
      });

      expect(result.current.search.searchHistory).toContain('machine learning');
    });

    it('should not add duplicate search history', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.addSearchHistory('machine learning');
        result.current.addSearchHistory('machine learning');
      });

      expect(
        result.current.search.searchHistory.filter((q) => q === 'machine learning').length
      ).toBe(1);
    });

    it('should move duplicate to top of history', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.addSearchHistory('first');
        result.current.addSearchHistory('second');
        result.current.addSearchHistory('first');
      });

      expect(result.current.search.searchHistory[0]).toBe('first');
      expect(result.current.search.searchHistory[1]).toBe('second');
    });

    it('should clear search history', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.addSearchHistory('test1');
        result.current.addSearchHistory('test2');
      });

      act(() => {
        result.current.clearSearchHistory();
      });

      expect(result.current.search.searchHistory.length).toBe(0);
    });

    it('should limit search history to 20 items', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        for (let i = 0; i < 25; i++) {
          result.current.addSearchHistory(`query-${i}`);
        }
      });

      expect(result.current.search.searchHistory.length).toBe(20);
    });
  });

  describe('Analysis History Actions', () => {
    it('should save analysis result', () => {
      const { result } = renderHook(() => useAcademicStore());

      const analysisResult = {
        paperId: 'paper-1',
        analysisType: 'summary' as const,
        content: 'This is a summary',
        createdAt: new Date(),
      };

      act(() => {
        result.current.saveAnalysisResult('paper-1', analysisResult);
      });

      expect(result.current.library.analysisHistory['paper-1']).toBeDefined();
      expect(result.current.library.analysisHistory['paper-1'].length).toBe(1);
      expect(result.current.library.analysisHistory['paper-1'][0].content).toBe(
        'This is a summary'
      );
    });

    it('should get analysis history', () => {
      const { result } = renderHook(() => useAcademicStore());

      const analysisResult = {
        paperId: 'paper-1',
        analysisType: 'summary' as const,
        content: 'This is a summary',
        createdAt: new Date(),
      };

      act(() => {
        result.current.saveAnalysisResult('paper-1', analysisResult);
      });

      const history = result.current.getAnalysisHistory('paper-1');

      expect(history.length).toBe(1);
      expect(history[0].content).toBe('This is a summary');
    });

    it('should return empty array for non-existent paper history', () => {
      const { result } = renderHook(() => useAcademicStore());

      const history = result.current.getAnalysisHistory('non-existent');

      expect(history).toEqual([]);
    });

    it('should limit analysis history to 10 items per paper', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.saveAnalysisResult('paper-1', {
            paperId: 'paper-1',
            analysisType: 'summary',
            content: `Summary ${i}`,
            createdAt: new Date(),
          });
        }
      });

      const history = result.current.getAnalysisHistory('paper-1');
      expect(history.length).toBe(10);
    });

    it('should clear analysis history', () => {
      const { result } = renderHook(() => useAcademicStore());

      act(() => {
        result.current.saveAnalysisResult('paper-1', {
          paperId: 'paper-1',
          analysisType: 'summary',
          content: 'Summary',
          createdAt: new Date(),
        });
      });

      act(() => {
        result.current.clearAnalysisHistory('paper-1');
      });

      const history = result.current.getAnalysisHistory('paper-1');
      expect(history).toEqual([]);
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', async () => {
      const { result } = renderHook(() => useAcademicStore());

      // Modify state
      act(() => {
        result.current.setSearchQuery('test');
        result.current.setActiveTab('library');
        result.current.setError('Test error');
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.search.query).toBe('');
      expect(result.current.activeTab).toBe('search');
      expect(result.current.error).toBeNull();
    });
  });
});
