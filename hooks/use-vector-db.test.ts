import { renderHook, act } from '@testing-library/react';
import { useVectorDB } from './use-vector-db';
import type { VectorSearchResult } from '@/lib/vector';

const mockCreateCollection = jest.fn();
const mockAddDocuments = jest.fn();
const mockSearchDocuments = jest.fn();
const mockDeleteCollection = jest.fn();
const mockRenameCollection = jest.fn();
const mockTruncateCollection = jest.fn();
const mockExportCollection = jest.fn();
const mockImportCollection = jest.fn();
const mockListCollections = jest.fn();
const mockGetCollectionInfo = jest.fn();

jest.mock('@/lib/vector', () => {
  const actual = jest.requireActual('@/lib/vector');
  return {
    ...actual,
    createVectorStore: jest.fn(() => ({
      provider: 'native',
      createCollection: mockCreateCollection,
      deleteCollection: mockDeleteCollection,
      renameCollection: mockRenameCollection,
      truncateCollection: mockTruncateCollection,
      exportCollection: mockExportCollection,
      importCollection: mockImportCollection,
      addDocuments: mockAddDocuments,
      deleteDocuments: jest.fn(),
      listCollections: mockListCollections,
      searchDocuments: mockSearchDocuments,
      getCollectionInfo: mockGetCollectionInfo,
    })),
  };
});

const mockAddCollection = jest.fn();
const mockAddDocs = jest.fn();
const mockClearDocs = jest.fn();

jest.mock('@/stores', () => {
  const vectorState = {
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
    addCollection: mockAddCollection,
    addDocuments: mockAddDocs,
    clearDocuments: mockClearDocs,
    collections: [],
  };

  return {
    useVectorStore: jest.fn(() => vectorState),
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
    expect(mockAddCollection).toHaveBeenCalledWith(
      expect.objectContaining({ 
        name: 'c1',
        description: undefined,
        embeddingModel: 'text-embedding-3-small',
        embeddingProvider: 'openai',
      })
    );
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
    expect(mockAddCollection).toHaveBeenCalledWith(
      expect.objectContaining({ 
        name: 'c1',
        description: 'Test collection',
        embeddingModel: 'custom-model',
        embeddingProvider: 'custom-provider',
      })
    );
  });

  it('adds documents and routes via vector store', async () => {
    mockAddDocuments.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    await act(async () => {
      await result.current.addDocument('hello', { type: 'doc' });
    });

    expect(mockAddDocuments).toHaveBeenCalled();
    expect(mockAddDocs).toHaveBeenCalledWith('c1', [
      expect.objectContaining({ content: 'hello', metadata: { type: 'doc' } }),
    ]);
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

    expect(result.current.error).toBe('Failed to create collection');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles vector store not available error', async () => {
    // Mock scenario where vector store creation fails
    const vectorModule = await import('@/lib/vector');
    const mockCreateVectorStore = vectorModule.createVectorStore as jest.MockedFunction<typeof vectorModule.createVectorStore>;
    mockCreateVectorStore.mockImplementationOnce(() => {
      throw new Error('Failed to create vector store');
    });

    const { result } = renderHook(() => useVectorDB({ collectionName: 'c1', autoInitialize: false }));
    
    await act(async () => {
      await expect(result.current.createCollection('test'))
        .rejects.toThrow('Vector store not available');
    });

    expect(result.current.error).toBe('Failed to create vector store');
  });
});
