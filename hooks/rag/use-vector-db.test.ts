import { renderHook, act } from '@testing-library/react';
import { useVectorDB } from './use-vector-db';
import type { VectorSearchResult, SearchResponse, ScrollResponse } from '@/lib/vector';

const mockCreateCollection = jest.fn();
const mockAddDocuments = jest.fn();
const mockSearchDocuments = jest.fn();
const mockSearchDocumentsWithTotal = jest.fn();
const mockScrollDocuments = jest.fn();
const mockDeleteCollection = jest.fn();
const mockDeleteAllDocuments = jest.fn();
const mockRenameCollection = jest.fn();
const mockTruncateCollection = jest.fn();
const mockExportCollection = jest.fn();
const mockImportCollection = jest.fn();
const mockListCollections = jest.fn();
const mockGetCollectionInfo = jest.fn();
const mockGetStats = jest.fn();

jest.mock('@/lib/vector', () => ({
  createVectorStore: jest.fn(() => ({
    provider: 'native',
    createCollection: mockCreateCollection,
    deleteCollection: mockDeleteCollection,
    deleteAllDocuments: mockDeleteAllDocuments,
    renameCollection: mockRenameCollection,
    truncateCollection: mockTruncateCollection,
    exportCollection: mockExportCollection,
    importCollection: mockImportCollection,
    addDocuments: mockAddDocuments,
    deleteDocuments: jest.fn(),
    listCollections: mockListCollections,
    searchDocuments: mockSearchDocuments,
    searchDocumentsWithTotal: mockSearchDocumentsWithTotal,
    scrollDocuments: mockScrollDocuments,
    getCollectionInfo: mockGetCollectionInfo,
    getStats: mockGetStats,
  })),
}));

jest.mock('@/stores', () => {
  return {
    useVectorStore: jest.fn(() => ({
      settings: {
        provider: 'native',
        mode: 'embedded',
        serverUrl: 'http://localhost:8000',
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        chunkSize: 1000,
        chunkOverlap: 200,
        autoEmbed: true,
      },
      getEmbeddingConfig: () => ({
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      }),
      addCollection: jest.fn(),
      addDocuments: jest.fn(),
      clearDocuments: jest.fn(),
      collections: [],
    })),
    useSettingsStore: jest.fn(
      (selector: (s: { providerSettings: { openai: { apiKey: string } } }) => unknown) =>
        selector({
          providerSettings: {
            openai: { apiKey: 'test-key' },
          },
        })
    ),
  };
});

describe('useVectorDB (native provider)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates collection with basic options', async () => {
    mockCreateCollection.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.createCollection('c1');
    });

    expect(mockCreateCollection).toHaveBeenCalledWith('c1', {
      description: undefined,
      embeddingModel: 'text-embedding-3-small',
      embeddingProvider: 'openai',
    });
    // Mock store methods are called via the hook's internal logic
    // We can't easily assert on them due to the mocking structure
  });

  it('creates collection with full options', async () => {
    mockCreateCollection.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.createCollection('c1', {
        description: 'Test collection',
        embeddingModel: 'custom-model',
        embeddingProvider: 'custom-provider',
      });
    });

    expect(mockCreateCollection).toHaveBeenCalledWith('c1', {
      description: 'Test collection',
      embeddingModel: 'custom-model',
      embeddingProvider: 'custom-provider',
    });
    // Mock store methods are called via the hook's internal logic
  });

  it('adds documents and routes via vector store', async () => {
    mockAddDocuments.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.addDocument('hello', { type: 'doc' });
    });

    expect(mockAddDocuments).toHaveBeenCalled();
  });

  it('searches with options (threshold/filter/topK)', async () => {
    mockSearchDocuments.mockResolvedValueOnce([
      { id: '1', content: 'x', score: 0.9, metadata: { type: 'doc' } },
    ]);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let res: VectorSearchResult[] = [];
    await act(async () => {
      res = await result.current.searchWithOptions('q', { topK: 3, threshold: 0.5, filter: { type: 'doc' } });
    });

    expect(mockSearchDocuments).toHaveBeenCalledWith('c1', 'q', {
      topK: 3,
      threshold: 0.5,
      filter: { type: 'doc' },
    });
    expect(res[0].metadata).toEqual({ type: 'doc' });
  });

  it('searches with filters using searchWithFilters method', async () => {
    mockSearchDocuments.mockResolvedValueOnce([
      { id: '1', content: 'filtered result', score: 0.95, metadata: { category: 'science' } },
    ]);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    const filters = [
      { key: 'category', value: 'science', operation: 'equals' as const },
      { key: 'score', value: 90, operation: 'greater_than' as const },
    ];
    
    let res: VectorSearchResult[] = [];
    await act(async () => {
      res = await result.current.searchWithFilters('search query', filters, { topK: 5, threshold: 0.8 });
    });

    expect(mockSearchDocuments).toHaveBeenCalledWith('c1', 'search query', {
      topK: 5,
      threshold: 0.8,
      filters,
    });
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('1');
  });

  it('renames collection', async () => {
    mockRenameCollection.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.renameCollection('old-name', 'new-name');
    });

    expect(mockRenameCollection).toHaveBeenCalledWith('old-name', 'new-name');
  });

  it('truncates collection', async () => {
    mockTruncateCollection.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.truncateCollection('test-collection');
    });

    expect(mockTruncateCollection).toHaveBeenCalledWith('test-collection');
  });

  it('exports collection', async () => {
    const mockExportData = {
      meta: {
        name: 'test-collection',
        documentCount: 2,
        dimension: 1536,
      },
      points: [
        { id: 'point1', vector: [0.1, 0.2, 0.3], payload: { content: 'test' } },
      ],
    };
    mockExportCollection.mockResolvedValueOnce(mockExportData);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let exportResult;
    await act(async () => {
      exportResult = await result.current.exportCollection('test-collection');
    });

    expect(mockExportCollection).toHaveBeenCalledWith('test-collection');
    expect(exportResult).toEqual(mockExportData);
  });

  it('imports collection', async () => {
    const mockImportData = {
      meta: {
        name: 'imported-collection',
        documentCount: 1,
        dimension: 768,
      },
      points: [
        { id: 'imported1', vector: [0.7, 0.8], payload: { imported: true } },
      ],
    };
    mockImportCollection.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.importCollection(mockImportData, true);
    });

    expect(mockImportCollection).toHaveBeenCalledWith(mockImportData, true);
  });

  it('lists collections with enhanced info', async () => {
    const mockCollections = [
      {
        name: 'collection1',
        documentCount: 5,
        dimension: 1536,
        createdAt: 1640995200,
        updatedAt: 1640995300,
        description: 'Test collection 1',
        embeddingModel: 'model1',
        embeddingProvider: 'provider1',
      },
      {
        name: 'collection2',
        documentCount: 3,
        dimension: 768,
        createdAt: 1640995400,
        updatedAt: 1640995500,
      },
    ];
    mockListCollections.mockResolvedValueOnce(mockCollections);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let collections;
    await act(async () => {
      collections = await result.current.listAllCollections();
    });

    expect(mockListCollections).toHaveBeenCalled();
    expect(collections).toEqual(mockCollections);
  });

  it('gets collection info', async () => {
    const mockInfo = {
      name: 'test-collection',
      documentCount: 10,
      dimension: 1536,
      createdAt: 1640995200,
      updatedAt: 1640995300,
      description: 'Test collection',
      embeddingModel: 'test-model',
      embeddingProvider: 'test-provider',
    };
    mockGetCollectionInfo.mockResolvedValueOnce(mockInfo);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let info;
    await act(async () => {
      info = await result.current.getCollectionInfo('test-collection');
    });

    expect(mockGetCollectionInfo).toHaveBeenCalledWith('test-collection');
    expect(info).toEqual(mockInfo);
  });

  it('handles search with advanced options (offset/limit)', async () => {
    mockSearchDocuments.mockResolvedValueOnce([
      { id: 'doc2', content: 'second result', score: 0.85, metadata: {} },
      { id: 'doc3', content: 'third result', score: 0.80, metadata: {} },
    ]);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let res: VectorSearchResult[] = [];
    await act(async () => {
      res = await result.current.searchWithOptions('query', {
        topK: 10,
        threshold: 0.7,
        offset: 1,
        limit: 2,
      });
    });

    expect(mockSearchDocuments).toHaveBeenCalledWith('c1', 'query', {
      topK: 10,
      threshold: 0.7,
      offset: 1,
      limit: 2,
    });
    expect(res).toHaveLength(2);
  });

  it('handles errors gracefully', async () => {
    mockCreateCollection.mockRejectedValueOnce(new Error('Collection creation failed'));

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    
    await act(async () => {
      await expect(result.current.createCollection('failing-collection'))
        .rejects.toThrow('Collection creation failed');
    });

    expect(result.current.error).toBe('Collection creation failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles vector store not available error', async () => {
    // Mock the createCollection to simulate vector store unavailable error
    mockCreateCollection.mockRejectedValueOnce(new Error('Vector store not available'));

    const { result } = renderHook(() => useVectorDB({ collectionName: 'test', autoInitialize: false }));

    await act(async () => {
      await expect(result.current.createCollection('test'))
        .rejects.toThrow('Vector store not available');
    });
  });

  it('removes all documents from collection', async () => {
    mockDeleteAllDocuments.mockResolvedValueOnce(5);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let count: number = 0;
    await act(async () => {
      count = await result.current.removeAllDocuments();
    });

    expect(mockDeleteAllDocuments).toHaveBeenCalledWith('c1');
    expect(count).toBe(5);
  });

  it('gets vector store stats', async () => {
    const mockStats = {
      collectionCount: 3,
      totalPoints: 150,
      storagePath: '/path/to/storage',
      storageSizeBytes: 1024000,
    };
    mockGetStats.mockResolvedValueOnce(mockStats);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let stats;
    await act(async () => {
      stats = await result.current.getStats();
    });

    expect(mockGetStats).toHaveBeenCalled();
    expect(stats).toEqual(mockStats);
  });

  it('searches with total count', async () => {
    const mockResponse: SearchResponse = {
      results: [
        { id: 'doc1', content: 'first result', score: 0.95, metadata: {} },
        { id: 'doc2', content: 'second result', score: 0.90, metadata: {} },
      ],
      total: 10,
      offset: 0,
      limit: 2,
    };
    mockSearchDocumentsWithTotal.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let response: SearchResponse | undefined;
    await act(async () => {
      response = await result.current.searchWithTotal('query', { topK: 10, offset: 0, limit: 2 });
    });

    expect(mockSearchDocumentsWithTotal).toHaveBeenCalledWith('c1', 'query', {
      topK: 10,
      offset: 0,
      limit: 2,
    });
    expect(response?.results).toHaveLength(2);
    expect(response?.total).toBe(10);
  });

  it('scrolls documents with pagination', async () => {
    const mockResponse: ScrollResponse = {
      documents: [
        { id: 'doc1', content: 'first doc', metadata: {} },
        { id: 'doc2', content: 'second doc', metadata: {} },
      ],
      total: 100,
      offset: 0,
      limit: 2,
      hasMore: true,
    };
    mockScrollDocuments.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let response: ScrollResponse | undefined;
    await act(async () => {
      response = await result.current.scrollDocuments({ offset: 0, limit: 2 });
    });

    expect(mockScrollDocuments).toHaveBeenCalledWith('c1', { offset: 0, limit: 2 });
    expect(response?.documents).toHaveLength(2);
    expect(response?.total).toBe(100);
    expect(response?.hasMore).toBe(true);
  });

  it('scrolls documents with filters', async () => {
    const mockResponse: ScrollResponse = {
      documents: [
        { id: 'filtered1', content: 'filtered doc', metadata: { category: 'science' } },
      ],
      total: 5,
      offset: 0,
      limit: 10,
      hasMore: false,
    };
    mockScrollDocuments.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    const filters = [{ key: 'category', value: 'science', operation: 'equals' as const }];
    
    let response: ScrollResponse | undefined;
    await act(async () => {
      response = await result.current.scrollDocuments({ 
        offset: 0, 
        limit: 10, 
        filters,
        filterMode: 'and',
      });
    });

    expect(mockScrollDocuments).toHaveBeenCalledWith('c1', { 
      offset: 0, 
      limit: 10, 
      filters,
      filterMode: 'and',
    });
    expect(response?.documents).toHaveLength(1);
    expect(response?.hasMore).toBe(false);
  });

  it('handles removeAllDocuments when store does not support it', async () => {
    // Simulate unsupported method by throwing error
    mockDeleteAllDocuments.mockImplementationOnce(() => {
      throw new Error('Vector store does not support deleteAllDocuments');
    });

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    
    await act(async () => {
      await expect(result.current.removeAllDocuments())
        .rejects.toThrow('Vector store does not support deleteAllDocuments');
    });

    expect(result.current.error).toBe('Vector store does not support deleteAllDocuments');
  });

  it('returns null for stats when store does not support it', async () => {
    mockGetStats.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    let stats;
    await act(async () => {
      stats = await result.current.getStats();
    });

    expect(stats).toBeNull();
  });
});
