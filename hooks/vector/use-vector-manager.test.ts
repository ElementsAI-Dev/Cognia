import { renderHook, act } from '@testing-library/react';
import { useVectorManager } from './use-vector-manager';

// Mock toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    return key;
  },
}));

// Mock useVectorDB
const mockCreateCollection = jest.fn();
const mockDeleteCollection = jest.fn();
const mockClearCollection = jest.fn();
const mockListAllCollections = jest.fn();
const mockAddDocument = jest.fn();
const mockSearchWithTotal = jest.fn();
const mockPeek = jest.fn();
const mockGetStats = jest.fn();
const mockGetCollectionInfo = jest.fn();
const mockRenameCollection = jest.fn();
const mockTruncateCollection = jest.fn();
const mockExportCollection = jest.fn();
const mockImportCollection = jest.fn();
const mockRemoveAllDocuments = jest.fn();

jest.mock('@/hooks/rag', () => ({
  useVectorDB: jest.fn(() => ({
    isLoading: false,
    error: null,
    isInitialized: true,
    createCollection: mockCreateCollection,
    deleteCollection: mockDeleteCollection,
    clearCollection: mockClearCollection,
    listAllCollections: mockListAllCollections,
    addDocument: mockAddDocument,
    searchWithTotal: mockSearchWithTotal,
    peek: mockPeek,
    getStats: mockGetStats,
    getCollectionInfo: mockGetCollectionInfo,
    renameCollection: mockRenameCollection,
    truncateCollection: mockTruncateCollection,
    exportCollection: mockExportCollection,
    importCollection: mockImportCollection,
    removeAllDocuments: mockRemoveAllDocuments,
  })),
}));

// Mock useVectorStore
jest.mock('@/stores', () => ({
  useVectorStore: (selector: (state: unknown) => unknown) => {
    const state = {
      settings: {
        provider: 'native',
        chunkSize: 1000,
        chunkOverlap: 200,
      },
    };
    return selector(state);
  },
}));

const mockCollections = [
  { name: 'collection1', documentCount: 5, dimension: 1536 },
  { name: 'collection2', documentCount: 3, dimension: 768 },
];

describe('useVectorManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAllCollections.mockResolvedValue(mockCollections);
    mockSearchWithTotal.mockResolvedValue({ results: [], total: 0 });
    mockPeek.mockResolvedValue([]);
    mockGetStats.mockResolvedValue(null);
    mockGetCollectionInfo.mockResolvedValue(null);
  });

  describe('initial state', () => {
    it('returns correct default values', () => {
      const { result } = renderHook(() => useVectorManager());

      expect(result.current.collectionName).toBe('default');
      expect(result.current.activeTab).toBe('collections');
      expect(result.current.topK).toBe(5);
      expect(result.current.threshold).toBe(0);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.showMetadataSummary).toBe(true);
      expect(result.current.results).toEqual([]);
      expect(result.current.filterError).toBeNull();
      expect(result.current.confirmAction).toBeNull();
    });

    it('loads collections on mount', async () => {
      renderHook(() => useVectorManager());

      await act(async () => {
        // Wait for useEffect to fire
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(mockListAllCollections).toHaveBeenCalled();
    });
  });

  describe('collection handlers', () => {
    it('handleCreate creates a collection and refreshes list', async () => {
      mockCreateCollection.mockResolvedValue(undefined);
      const updatedCollections = [...mockCollections, { name: 'new-col', documentCount: 0, dimension: 1536 }];
      mockListAllCollections.mockResolvedValue(updatedCollections);

      const { result } = renderHook(() => useVectorManager());

      // Set new collection name
      act(() => {
        result.current.setNewCollection('new-col');
      });

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCreateCollection).toHaveBeenCalledWith('new-col');
      expect(result.current.collectionName).toBe('new-col');
      expect(result.current.newCollection).toBe('');
    });

    it('handleCreate does nothing with empty name', async () => {
      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleCreate();
      });

      expect(mockCreateCollection).not.toHaveBeenCalled();
    });

    it('handleRefresh loads collections, stats, and collection info', async () => {
      const mockStats = { collectionCount: 2, totalPoints: 100, storageSizeBytes: 2048 };
      const mockInfo = { name: 'default', documentCount: 10, dimension: 1536 };
      mockGetStats.mockResolvedValue(mockStats);
      mockGetCollectionInfo.mockResolvedValue(mockInfo);

      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(mockListAllCollections).toHaveBeenCalled();
      expect(mockGetStats).toHaveBeenCalled();
      expect(mockGetCollectionInfo).toHaveBeenCalledWith('default');
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.selectedCollectionInfo).toEqual(mockInfo);
    });

    it('handleRefresh handles stats error gracefully', async () => {
      mockGetStats.mockRejectedValue(new Error('Stats unavailable'));
      mockGetCollectionInfo.mockResolvedValue(null);

      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleRefresh();
      });

      // Should not throw
      expect(result.current.stats).toBeNull();
    });

    it('handleRename renames collection and shows toast', async () => {
      mockRenameCollection.mockResolvedValue(undefined);
      mockListAllCollections.mockResolvedValue(mockCollections);

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setRenameNewName('renamed-col');
      });

      await act(async () => {
        await result.current.handleRename();
      });

      expect(mockRenameCollection).toHaveBeenCalledWith('default', 'renamed-col');
      expect(mockToastSuccess).toHaveBeenCalledWith('renameSuccess');
      expect(result.current.showRenameDialog).toBe(false);
      expect(result.current.renameNewName).toBe('');
      expect(result.current.collectionName).toBe('renamed-col');
    });

    it('handleRename shows error toast on failure', async () => {
      mockRenameCollection.mockRejectedValue(new Error('Rename failed'));

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setRenameNewName('fail-rename');
      });

      await act(async () => {
        await result.current.handleRename();
      });

      expect(mockToastError).toHaveBeenCalledWith('Rename failed');
    });

    it('handleRename does nothing with empty name', async () => {
      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleRename();
      });

      expect(mockRenameCollection).not.toHaveBeenCalled();
    });

    it('handleExport calls exportCollection and shows toast', async () => {
      const mockData = { meta: { name: 'test' }, points: [] };
      mockExportCollection.mockResolvedValue(mockData);

      // Mock URL APIs without breaking document.createElement
      const originalCreateObjectURL = global.URL.createObjectURL;
      const originalRevokeObjectURL = global.URL.revokeObjectURL;
      global.URL.createObjectURL = jest.fn(() => 'blob:test');
      global.URL.revokeObjectURL = jest.fn();

      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleExport();
      });

      expect(mockExportCollection).toHaveBeenCalledWith('default');
      expect(mockToastSuccess).toHaveBeenCalledWith('exportSuccess');

      // Restore
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('handleExport shows error toast on failure', async () => {
      mockExportCollection.mockRejectedValue(new Error('Export error'));

      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleExport();
      });

      expect(mockToastError).toHaveBeenCalledWith('Export error');
    });

    it('handleTruncate truncates and shows toast', async () => {
      mockTruncateCollection.mockResolvedValue(undefined);

      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        // Simulate via handleConfirmAction
        result.current.setConfirmAction('truncate');
      });
      await act(async () => {
        await result.current.handleConfirmAction();
      });

      expect(mockTruncateCollection).toHaveBeenCalledWith('default');
      expect(mockToastSuccess).toHaveBeenCalledWith('truncateSuccess');
    });

    it('handleDeleteAllDocs removes all docs and shows toast', async () => {
      mockRemoveAllDocuments.mockResolvedValue(42);

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setConfirmAction('deleteAllDocs');
      });
      await act(async () => {
        await result.current.handleConfirmAction();
      });

      expect(mockRemoveAllDocuments).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  describe('document handlers', () => {
    it('handleAddDocument adds document with content only', async () => {
      mockAddDocument.mockResolvedValue('doc-1');

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setNewDocContent('Hello world');
      });

      await act(async () => {
        await result.current.handleAddDocument();
      });

      expect(mockAddDocument).toHaveBeenCalledWith('Hello world', undefined);
      expect(result.current.newDocContent).toBe('');
    });

    it('handleAddDocument adds document with valid metadata', async () => {
      mockAddDocument.mockResolvedValue('doc-2');

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setNewDocContent('Content');
        result.current.setNewDocMeta('{"type":"note"}');
      });

      await act(async () => {
        await result.current.handleAddDocument();
      });

      expect(mockAddDocument).toHaveBeenCalledWith('Content', { type: 'note' });
      expect(result.current.newDocMeta).toBe('');
    });

    it('handleAddDocument sets error for invalid JSON metadata', async () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setNewDocContent('Content');
        result.current.setNewDocMeta('{invalid}');
      });

      await act(async () => {
        await result.current.handleAddDocument();
      });

      expect(mockAddDocument).not.toHaveBeenCalled();
      expect(result.current.filterError).toBe('Invalid document metadata JSON');
    });

    it('handleAddDocument sets error for array metadata', async () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setNewDocContent('Content');
        result.current.setNewDocMeta('[1,2,3]');
      });

      await act(async () => {
        await result.current.handleAddDocument();
      });

      expect(mockAddDocument).not.toHaveBeenCalled();
      expect(result.current.filterError).toBe('Document metadata must be JSON object');
    });

    it('handleAddDocument does nothing with empty content', async () => {
      const { result } = renderHook(() => useVectorManager());

      await act(async () => {
        await result.current.handleAddDocument();
      });

      expect(mockAddDocument).not.toHaveBeenCalled();
    });

    it('handleAddDocumentsFromModal adds multiple docs and closes modal', async () => {
      mockAddDocument.mockResolvedValue('doc-id');

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setShowAddDocModal(true);
      });

      const docs = [
        { content: 'doc1', metadata: { type: 'a' } },
        { content: 'doc2', metadata: { type: 'b' } },
      ];

      await act(async () => {
        await result.current.handleAddDocumentsFromModal(docs);
      });

      expect(mockAddDocument).toHaveBeenCalledTimes(2);
      expect(result.current.showAddDocModal).toBe(false);
    });
  });

  describe('search handlers', () => {
    it('handleSearchWithPagination searches and sets results', async () => {
      const mockResults = [
        { id: '1', content: 'result1', score: 0.95 },
        { id: '2', content: 'result2', score: 0.85 },
      ];
      mockSearchWithTotal.mockResolvedValue({ results: mockResults, total: 2 });

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test query');
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(1);
      });

      expect(mockSearchWithTotal).toHaveBeenCalledWith('test query', {
        topK: 5,
        threshold: undefined,
        filter: undefined,
        offset: 0,
        limit: 10,
      });
      expect(result.current.results).toHaveLength(2);
      expect(result.current.totalResults).toBe(2);
      expect(result.current.currentPage).toBe(1);
    });

    it('handleSearchWithPagination handles page 2', async () => {
      mockSearchWithTotal.mockResolvedValue({ results: [], total: 15 });

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(2);
      });

      expect(mockSearchWithTotal).toHaveBeenCalledWith('test', expect.objectContaining({
        offset: 10,
        limit: 10,
      }));
      expect(result.current.currentPage).toBe(2);
    });

    it('handleSearchWithPagination sets error for invalid filter JSON', async () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test');
        result.current.setFilterJson('{bad json}');
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(1);
      });

      expect(mockSearchWithTotal).not.toHaveBeenCalled();
      expect(result.current.filterError).toBe('Invalid JSON');
    });

    it('handleSearchWithPagination sets error for array filter', async () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test');
        result.current.setFilterJson('[1,2]');
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(1);
      });

      expect(mockSearchWithTotal).not.toHaveBeenCalled();
      expect(result.current.filterError).toBe('Filter must be a JSON object');
    });

    it('handleSearchWithPagination shows error toast on search failure', async () => {
      mockSearchWithTotal.mockRejectedValue(new Error('Search failed'));

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(1);
      });

      expect(mockToastError).toHaveBeenCalledWith('Search failed');
    });

    it('handleSearchWithPagination sorts results by score desc by default', async () => {
      const mockResults = [
        { id: '1', content: 'low', score: 0.5 },
        { id: '2', content: 'high', score: 0.9 },
      ];
      mockSearchWithTotal.mockResolvedValue({ results: mockResults, total: 2 });

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test');
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(1);
      });

      // Default sort is score desc
      expect(result.current.results[0].score).toBe(0.9);
      expect(result.current.results[1].score).toBe(0.5);
    });

    it('handleSearchWithPagination applies threshold when > 0', async () => {
      mockSearchWithTotal.mockResolvedValue({ results: [], total: 0 });

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setQuery('test');
        result.current.setThreshold(0.5);
      });

      await act(async () => {
        await result.current.handleSearchWithPagination(1);
      });

      expect(mockSearchWithTotal).toHaveBeenCalledWith('test', expect.objectContaining({
        threshold: 0.5,
      }));
    });

    it('handlePeek calls vector.peek with topK', async () => {
      const peekResults = [{ id: '1', content: 'peek', score: 1.0 }];
      mockPeek.mockResolvedValue(peekResults);

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setTopK(3);
      });

      await act(async () => {
        await result.current.handlePeek();
      });

      expect(mockPeek).toHaveBeenCalledWith(3);
      expect(result.current.results).toEqual(peekResults);
    });

    it('totalPages computes correctly', () => {
      const { result } = renderHook(() => useVectorManager());

      // No results
      expect(result.current.totalPages).toBe(0);
    });
  });

  describe('confirm action handler', () => {
    it('handleConfirmAction dispatches delete', async () => {
      mockDeleteCollection.mockResolvedValue(undefined);

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setConfirmAction('delete');
      });

      await act(async () => {
        await result.current.handleConfirmAction();
      });

      expect(mockDeleteCollection).toHaveBeenCalled();
      expect(result.current.confirmAction).toBeNull();
    });

    it('handleConfirmAction dispatches clear', async () => {
      mockClearCollection.mockResolvedValue(undefined);

      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setConfirmAction('clear');
      });

      await act(async () => {
        await result.current.handleConfirmAction();
      });

      expect(mockClearCollection).toHaveBeenCalled();
      expect(result.current.confirmAction).toBeNull();
    });

    it('confirmLabels has all required keys', () => {
      const { result } = renderHook(() => useVectorManager());

      expect(result.current.confirmLabels.delete).toBeDefined();
      expect(result.current.confirmLabels.clear).toBeDefined();
      expect(result.current.confirmLabels.truncate).toBeDefined();
      expect(result.current.confirmLabels.deleteAllDocs).toBeDefined();
    });
  });

  describe('UI state setters', () => {
    it('setActiveTab changes tab', () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setActiveTab('search');
      });

      expect(result.current.activeTab).toBe('search');
    });

    it('setShowAddDocModal toggles modal', () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setShowAddDocModal(true);
      });

      expect(result.current.showAddDocModal).toBe(true);
    });

    it('setExpanded toggles expanded state', () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setExpanded({ 'doc-1': true });
      });

      expect(result.current.expanded).toEqual({ 'doc-1': true });
    });

    it('setShowMetadataSummary toggles summary', () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setShowMetadataSummary(false);
      });

      expect(result.current.showMetadataSummary).toBe(false);
    });

    it('setPageSize updates page size', () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.pageSize).toBe(25);
    });

    it('setSortField and setSortOrder update sort state', () => {
      const { result } = renderHook(() => useVectorManager());

      act(() => {
        result.current.setSortField('id');
        result.current.setSortOrder('asc');
      });

      expect(result.current.sortField).toBe('id');
      expect(result.current.sortOrder).toBe('asc');
    });
  });

  describe('settings', () => {
    it('exposes settings from store', () => {
      const { result } = renderHook(() => useVectorManager());

      expect(result.current.settings).toEqual({
        provider: 'native',
        chunkSize: 1000,
        chunkOverlap: 200,
      });
    });
  });
});
