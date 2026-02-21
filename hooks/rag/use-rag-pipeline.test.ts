/**
 * Tests for useRAGPipeline hook
 */

import { renderHook, act } from '@testing-library/react';
import { useRAGPipeline } from './use-rag-pipeline';

// Mock stores
jest.mock('@/stores', () => ({
  useVectorStore: jest.fn((selector) => {
    const state = {
      collections: {},
      settings: {
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
      },
      createCollection: jest.fn(),
      deleteCollection: jest.fn(),
      addDocuments: jest.fn(),
      search: jest.fn(() => Promise.resolve([])),
    };
    return selector(state);
  }),
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key' },
      },
    };
    return selector(state);
  }),
}));

// Mock RAG pipeline
const mockRetrieve = jest.fn();
const mockIndex = jest.fn();

jest.mock('@/lib/ai/rag/index', () => ({
  RAGPipeline: jest.fn(),
  createRAGPipeline: jest.fn(() => ({
    retrieve: mockRetrieve,
    index: mockIndex,
    clear: jest.fn(),
    clearCollection: jest.fn(),
    getStats: jest.fn(() => ({ documentCount: 0, exists: true })),
    getCollectionStats: jest.fn(() => ({ documentCount: 0, exists: true })),
    updateConfig: jest.fn(),
  })),
}));

// Mock chunking
jest.mock('@/lib/ai/embedding/chunking', () => ({
  chunkDocument: jest.fn((text) => ({
    chunks: [{ text, startIndex: 0, endIndex: text.length }],
    totalChunks: 1,
  })),
  chunkDocumentSmart: jest.fn((text) => ({
    chunks: [{ text, startIndex: 0, endIndex: text.length }],
    totalChunks: 1,
  })),
  chunkDocumentRecursive: jest.fn((text) => ({
    chunks: [{ text, startIndex: 0, endIndex: text.length }],
    totalChunks: 1,
  })),
}));

jest.mock('@/lib/vector/embedding', () => ({
  resolveEmbeddingApiKey: jest.fn(() => 'test-key'),
}));

describe('useRAGPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRetrieve.mockResolvedValue({
      query: 'test',
      results: [],
      context: '',
      totalTokens: 0,
    });
    mockIndex.mockResolvedValue({ success: true });
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useRAGPipeline());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastContext).toBeNull();
    });

    it('should provide indexing functions', () => {
      const { result } = renderHook(() => useRAGPipeline());

      expect(typeof result.current.indexDocument).toBe('function');
      expect(typeof result.current.indexDocuments).toBe('function');
    });

    it('should provide retrieval function', () => {
      const { result } = renderHook(() => useRAGPipeline());

      expect(typeof result.current.retrieve).toBe('function');
    });

    it('should provide collection management functions', () => {
      const { result } = renderHook(() => useRAGPipeline());

      expect(typeof result.current.clearCollection).toBe('function');
      expect(typeof result.current.getCollectionStats).toBe('function');
    });

    it('should provide chunking utilities', () => {
      const { result } = renderHook(() => useRAGPipeline());

      expect(typeof result.current.chunkText).toBe('function');
      expect(typeof result.current.chunkTextSmart).toBe('function');
      expect(typeof result.current.chunkTextRecursive).toBe('function');
    });
  });

  describe('indexDocument', () => {
    it('should index a single document', async () => {
      const { result } = renderHook(() => useRAGPipeline());

      let indexResult: { documentId: string; chunksCreated: number; success: boolean } | undefined;
      await act(async () => {
        indexResult = await result.current.indexDocument('Test content', {
          documentId: 'doc-1',
          documentTitle: 'Test Document',
        });
      });

      expect(indexResult).toBeDefined();
      expect(indexResult?.documentId).toBe('doc-1');
    });

    it('should handle indexing with metadata', async () => {
      const { result } = renderHook(() => useRAGPipeline());

      let indexResult: { documentId: string; chunksCreated: number; success: boolean } | undefined;
      await act(async () => {
        indexResult = await result.current.indexDocument('Content with metadata', {
          documentId: 'doc-2',
          metadata: { source: 'test', category: 'example' },
        });
      });

      expect(indexResult?.documentId).toBe('doc-2');
    });
  });

  describe('indexDocuments', () => {
    it('should index multiple documents', async () => {
      const { result } = renderHook(() => useRAGPipeline());

      const documents = [
        { id: 'doc-1', content: 'First document', title: 'Doc 1' },
        { id: 'doc-2', content: 'Second document', title: 'Doc 2' },
      ];

      let results;
      await act(async () => {
        results = await result.current.indexDocuments(documents);
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('retrieve', () => {
    it('should retrieve relevant documents', async () => {
      mockRetrieve.mockResolvedValue({
        query: 'test query',
        results: [{ id: 'doc-1', content: 'Relevant content', score: 0.9 }],
        context: 'Relevant content',
        totalTokens: 100,
      });

      const { result } = renderHook(() => useRAGPipeline());

      await act(async () => {
        const context = await result.current.retrieve('test query');
        expect(context).toBeDefined();
      });
    });

    it('should update lastContext after retrieval', async () => {
      mockRetrieve.mockResolvedValue({
        query: 'query',
        results: [],
        context: '',
        totalTokens: 0,
      });

      const { result } = renderHook(() => useRAGPipeline());

      await act(async () => {
        await result.current.retrieve('query');
      });

      expect(result.current.lastContext).toBeDefined();
    });
  });

  describe('collection management', () => {
    it('should get collection stats', async () => {
      const { result } = renderHook(() => useRAGPipeline());

      let stats: Awaited<ReturnType<typeof result.current.getCollectionStats>>;
      await act(async () => {
        stats = await result.current.getCollectionStats();
      });

      expect(stats!).toBeDefined();
      expect(stats!.exists).toBeDefined();
    });

    it('should clear collection', async () => {
      const { result } = renderHook(() => useRAGPipeline());

      await act(async () => {
        await result.current.clearCollection();
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('chunking utilities', () => {
    it('should chunk text', () => {
      const { result } = renderHook(() => useRAGPipeline());

      const chunked = result.current.chunkText('This is some text to chunk');

      expect(chunked.chunks).toBeDefined();
      expect(chunked.totalChunks).toBeGreaterThan(0);
    });

    it('should chunk text with smart chunking', () => {
      const { result } = renderHook(() => useRAGPipeline());

      const chunked = result.current.chunkTextSmart('Smart chunking text');

      expect(chunked.chunks).toBeDefined();
    });

    it('should chunk text recursively', () => {
      const { result } = renderHook(() => useRAGPipeline());

      const chunked = result.current.chunkTextRecursive('Recursive chunking text');

      expect(chunked.chunks).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should accept custom options', () => {
      const { result } = renderHook(() =>
        useRAGPipeline({
          collectionName: 'custom-collection',
          topK: 10,
          similarityThreshold: 0.7,
          enableHybridSearch: true,
          enableReranking: true,
        })
      );

      expect(result.current).toBeDefined();
    });

    it('should update config', () => {
      const { result } = renderHook(() => useRAGPipeline());

      act(() => {
        result.current.updateConfig({ topK: 20 });
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
