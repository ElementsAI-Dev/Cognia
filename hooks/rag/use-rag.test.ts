import { act, renderHook } from '@testing-library/react';
import { useRAG } from './use-rag';

const mockIndexDocument = jest.fn();
const mockRetrieve = jest.fn();

jest.mock('@/lib/ai/rag/index', () => ({
  createRAGPipeline: jest.fn(() => ({
    indexDocument: mockIndexDocument,
    retrieve: mockRetrieve,
  })),
  createRAGRuntime: jest.fn(() => ({
    getPipeline: () => ({
      indexDocument: mockIndexDocument,
      retrieve: mockRetrieve,
    }),
  })),
  createRAGRuntimeConfigFromVectorSettings: jest.fn((_settings, _apiKey) => ({
    vectorStore: {
      provider: 'chroma',
      embeddingConfig: { provider: 'openai', model: 'text-embedding-3-small' },
      embeddingApiKey: 'test-key',
      native: {},
    },
  })),
  createRAGTools: jest.fn(() => ({})),
}));

jest.mock('@/stores', () => ({
  useVectorStore: jest.fn((selector) =>
    selector({
      settings: {
        provider: 'chroma',
        mode: 'embedded',
        serverUrl: 'http://localhost:8000',
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
        chunkSize: 1000,
        chunkOverlap: 200,
      },
    })
  ),
  useSettingsStore: jest.fn((selector) =>
    selector({
      providerSettings: {
        openai: { apiKey: 'test-key' },
        google: { apiKey: '' },
      },
    })
  ),
}));

describe('useRAG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIndexDocument.mockResolvedValue({
      success: true,
      chunksCreated: 2,
    });
    mockRetrieve.mockResolvedValue({
      query: 'test',
      documents: [],
      formattedContext: '',
      totalTokensEstimate: 0,
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
        originalResultCount: 0,
        finalResultCount: 0,
      },
    });
  });

  it('exposes expected api surface', () => {
    const { result } = renderHook(() => useRAG());
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.indexSingleDocument).toBe('function');
    expect(typeof result.current.retrieve).toBe('function');
    expect(typeof result.current.createAdvancedPipeline).toBe('function');
  });

  it('indexes a single document through unified pipeline', async () => {
    const { result } = renderHook(() => useRAG({ collectionName: 'test' }));

    await act(async () => {
      await result.current.indexSingleDocument({
        id: 'doc-1',
        content: 'hello',
      });
    });

    expect(mockIndexDocument).toHaveBeenCalledWith(
      'hello',
      expect.objectContaining({
        collectionName: 'test',
        documentId: 'doc-1',
      })
    );
  });

  it('retrieves and maps pipeline context', async () => {
    mockRetrieve.mockResolvedValueOnce({
      query: 'q',
      documents: [
        { id: 'c1', content: 'ctx', rerankScore: 0.8, metadata: { source: 's' } },
      ],
      formattedContext: 'ctx',
      totalTokensEstimate: 10,
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
        originalResultCount: 1,
        finalResultCount: 1,
      },
    });

    const { result } = renderHook(() => useRAG({ collectionName: 'kb' }));

    await act(async () => {
      const context = await result.current.retrieve('q');
      expect(context.documents).toHaveLength(1);
      expect(context.documents[0]?.similarity).toBe(0.8);
    });
  });
});
