/**
 * Tests for useRAG hook
 */

import { renderHook, act } from '@testing-library/react';
import { useRAG } from './use-rag';
import * as ragLib from '@/lib/ai/rag';
import * as chunkingLib from '@/lib/ai/embedding/chunking';

// Mock dependencies
jest.mock('@/lib/ai/rag', () => ({
  indexDocument: jest.fn(),
  indexDocuments: jest.fn(),
  retrieveContext: jest.fn(),
  createRAGPrompt: jest.fn(),
  SimpleRAG: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    query: jest.fn(),
  })),
}));

jest.mock('@/lib/ai/embedding/chunking', () => ({
  chunkDocument: jest.fn().mockReturnValue({
    chunks: [{ text: 'chunk1', index: 0 }],
    metadata: { totalChunks: 1 },
  }),
}));

jest.mock('@/stores', () => ({
  useVectorStore: jest.fn((selector) => {
    const state = {
      settings: {
        mode: 'local',
        serverUrl: 'http://localhost:8000',
        embeddingProvider: 'openai',
        embeddingModel: 'text-embedding-3-small',
      },
    };
    return selector(state);
  }),
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-api-key' },
        google: { apiKey: 'google-key' },
      },
    };
    return selector(state);
  }),
}));

const mockIndexDocument = ragLib.indexDocument as jest.MockedFunction<typeof ragLib.indexDocument>;
const mockIndexDocuments = ragLib.indexDocuments as jest.MockedFunction<
  typeof ragLib.indexDocuments
>;
const mockRetrieveContext = ragLib.retrieveContext as jest.MockedFunction<
  typeof ragLib.retrieveContext
>;
const mockCreateRAGPrompt = ragLib.createRAGPrompt as jest.MockedFunction<
  typeof ragLib.createRAGPrompt
>;
const mockChunkDocument = chunkingLib.chunkDocument as jest.MockedFunction<
  typeof chunkingLib.chunkDocument
>;

describe('useRAG', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useRAG());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastContext).toBeNull();
    });

    it('should provide all methods', () => {
      const { result } = renderHook(() => useRAG());

      expect(typeof result.current.indexSingleDocument).toBe('function');
      expect(typeof result.current.indexMultipleDocuments).toBe('function');
      expect(typeof result.current.indexText).toBe('function');
      expect(typeof result.current.retrieve).toBe('function');
      expect(typeof result.current.retrieveWithOptions).toBe('function');
      expect(typeof result.current.generatePrompt).toBe('function');
      expect(typeof result.current.generatePromptWithContext).toBe('function');
      expect(typeof result.current.chunkText).toBe('function');
      expect(typeof result.current.estimateChunks).toBe('function');
      expect(typeof result.current.createSimpleRAG).toBe('function');
    });
  });

  describe('indexSingleDocument', () => {
    it('should index document successfully', async () => {
      const mockResult = { documentId: 'doc1', chunksCreated: 5, success: true };
      mockIndexDocument.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useRAG());

      let indexResult;
      await act(async () => {
        indexResult = await result.current.indexSingleDocument({
          id: 'doc1',
          content: 'Test content',
          title: 'Test Doc',
        });
      });

      expect(indexResult).toEqual(mockResult);
      expect(result.current.error).toBeNull();
    });

    it('should handle indexing errors', async () => {
      mockIndexDocument.mockRejectedValue(new Error('Index failed'));

      const { result } = renderHook(() => useRAG());

      const indexResult = await act(async () => {
        return await result.current.indexSingleDocument({
          id: 'doc1',
          content: 'Test',
        });
      });

      expect(indexResult.success).toBe(false);
      expect(indexResult.error).toBe('Index failed');
      expect(result.current.error).toBe('Index failed');
    });

    it('should handle indexing failure response', async () => {
      mockIndexDocument.mockResolvedValue({
        documentId: 'doc1',
        chunksCreated: 0,
        success: false,
        error: 'Validation failed',
      });

      const { result } = renderHook(() => useRAG());

      await act(async () => {
        await result.current.indexSingleDocument({ id: 'doc1', content: 'Test' });
      });

      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('indexMultipleDocuments', () => {
    it('should index multiple documents', async () => {
      const mockResults = [
        { documentId: 'doc1', chunksCreated: 3, success: true },
        { documentId: 'doc2', chunksCreated: 5, success: true },
      ];
      mockIndexDocuments.mockResolvedValue(mockResults);

      const { result } = renderHook(() => useRAG());

      let indexResults;
      await act(async () => {
        indexResults = await result.current.indexMultipleDocuments([
          { id: 'doc1', content: 'Content 1' },
          { id: 'doc2', content: 'Content 2' },
        ]);
      });

      expect(indexResults).toEqual(mockResults);
    });

    it('should report partial failures', async () => {
      mockIndexDocuments.mockResolvedValue([
        { documentId: 'doc1', chunksCreated: 3, success: true },
        { documentId: 'doc2', chunksCreated: 0, success: false, error: 'Failed' },
      ]);

      const { result } = renderHook(() => useRAG());

      await act(async () => {
        await result.current.indexMultipleDocuments([
          { id: 'doc1', content: 'Content 1' },
          { id: 'doc2', content: 'Content 2' },
        ]);
      });

      expect(result.current.error).toBe('1 documents failed to index');
    });
  });

  describe('indexText', () => {
    it('should index plain text', async () => {
      mockIndexDocument.mockResolvedValue({
        documentId: 'text1',
        chunksCreated: 2,
        success: true,
      });

      const { result } = renderHook(() => useRAG());

      await act(async () => {
        await result.current.indexText('text1', 'Plain text content', 'My Title');
      });

      expect(mockIndexDocument).toHaveBeenCalledWith(
        'rag-default',
        expect.objectContaining({
          id: 'text1',
          content: 'Plain text content',
          title: 'My Title',
        }),
        expect.anything()
      );
    });
  });

  describe('retrieve', () => {
    it('should retrieve context successfully', async () => {
      const mockContext = {
        documents: [
          { id: 'doc1', content: 'Relevant content', score: 0.9, distance: 0.1, similarity: 0.9 },
        ],
        query: 'test query',
        formattedContext: 'Formatted context',
        totalTokensEstimate: 100,
      };
      mockRetrieveContext.mockResolvedValue(mockContext);

      const { result } = renderHook(() => useRAG());

      let context;
      await act(async () => {
        context = await result.current.retrieve('test query');
      });

      expect(context).toEqual(mockContext);
      expect(result.current.lastContext).toEqual(mockContext);
    });

    it('should handle retrieval errors', async () => {
      mockRetrieveContext.mockRejectedValue(new Error('Retrieval failed'));

      const { result } = renderHook(() => useRAG());

      const context = await act(async () => {
        return await result.current.retrieve('test query');
      });

      expect(context.documents).toEqual([]);
      expect(result.current.error).toBe('Retrieval failed');
    });
  });

  describe('retrieveWithOptions', () => {
    it('should retrieve with custom options', async () => {
      mockRetrieveContext.mockResolvedValue({
        documents: [],
        query: 'test',
        formattedContext: '',
        totalTokensEstimate: 0,
      });

      const { result } = renderHook(() => useRAG());

      await act(async () => {
        await result.current.retrieveWithOptions('test', { topK: 10 });
      });

      expect(mockRetrieveContext).toHaveBeenCalled();
    });
  });

  describe('generatePrompt', () => {
    it('should generate RAG prompt', async () => {
      const mockContext = {
        documents: [],
        query: 'test',
        formattedContext: 'context',
        totalTokensEstimate: 50,
      };
      mockRetrieveContext.mockResolvedValue(mockContext);
      mockCreateRAGPrompt.mockReturnValue('Generated prompt with context');

      const { result } = renderHook(() => useRAG());

      let prompt;
      await act(async () => {
        prompt = await result.current.generatePrompt('test query', 'System prompt');
      });

      expect(prompt).toBe('Generated prompt with context');
      expect(mockCreateRAGPrompt).toHaveBeenCalledWith('test query', mockContext, 'System prompt');
    });
  });

  describe('generatePromptWithContext', () => {
    it('should generate prompt with existing context', () => {
      const mockContext = {
        documents: [],
        query: 'test',
        formattedContext: 'existing context',
        totalTokensEstimate: 30,
      };
      mockCreateRAGPrompt.mockReturnValue('Prompt with existing context');

      const { result } = renderHook(() => useRAG());

      const prompt = result.current.generatePromptWithContext('query', mockContext, 'System');

      expect(prompt).toBe('Prompt with existing context');
      expect(mockCreateRAGPrompt).toHaveBeenCalledWith('query', mockContext, 'System');
    });
  });

  describe('chunkText', () => {
    it('should chunk text', () => {
      const { result } = renderHook(() => useRAG());

      const chunked = result.current.chunkText('Some long text here');

      expect(mockChunkDocument).toHaveBeenCalledWith(
        'Some long text here',
        expect.objectContaining({
          strategy: 'sentence',
        })
      );
      expect(chunked.chunks).toBeDefined();
    });

    it('should use custom chunking options', () => {
      const { result } = renderHook(() => useRAG());

      result.current.chunkText('Text', { chunkSize: 500 });

      expect(mockChunkDocument).toHaveBeenCalledWith(
        'Text',
        expect.objectContaining({
          chunkSize: 500,
        })
      );
    });
  });

  describe('estimateChunks', () => {
    it('should estimate chunk count for short text', () => {
      const { result } = renderHook(() => useRAG({ chunkSize: 1000 }));

      const estimate = result.current.estimateChunks(500);

      expect(estimate).toBe(1);
    });

    it('should estimate chunk count for long text', () => {
      const { result } = renderHook(() =>
        useRAG({
          chunkSize: 1000,
          chunkOverlap: 200,
        })
      );

      // With chunkSize=1000 and overlap=200, effective chunk = 800
      // For 2500 chars: (2500 - 200) / 800 = 2.875 -> ceil = 3
      const estimate = result.current.estimateChunks(2500);

      expect(estimate).toBeGreaterThan(1);
    });
  });

  describe('createSimpleRAG', () => {
    it('should create SimpleRAG instance', () => {
      const { result } = renderHook(() => useRAG());

      const simpleRAG = result.current.createSimpleRAG();

      expect(ragLib.SimpleRAG).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai',
          model: 'text-embedding-3-small',
        }),
        'test-api-key'
      );
      expect(simpleRAG).toBeDefined();
    });
  });

  describe('with custom options', () => {
    it('should use custom collection name', async () => {
      mockIndexDocument.mockResolvedValue({ documentId: 'doc1', chunksCreated: 1, success: true });

      const { result } = renderHook(() => useRAG({ collectionName: 'custom-collection' }));

      await act(async () => {
        await result.current.indexSingleDocument({ id: 'doc1', content: 'Test' });
      });

      expect(mockIndexDocument).toHaveBeenCalledWith(
        'custom-collection',
        expect.anything(),
        expect.anything()
      );
    });
  });
});
