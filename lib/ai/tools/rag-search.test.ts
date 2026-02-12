/**
 * Tests for RAG Search Tool
 */

import {
  executeRAGSearch,
  ragSearchTool,
  ragSearchInputSchema,
  type RAGSearchInput,
  type RAGSearchResult,
} from './rag-search';
import type { RAGSearchConfig } from './rag-search';

// Mock RAG module
jest.mock('@/lib/ai/rag', () => ({
  retrieveContext: jest.fn(),
}));

import { retrieveContext } from '@/lib/ai/rag';

const mockRetrieveContext = retrieveContext as jest.Mock;

describe('executeRAGSearch', () => {
  const mockConfig: RAGSearchConfig = {
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingApiKey: 'test-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches knowledge base successfully', async () => {
    mockRetrieveContext.mockResolvedValue({
      documents: [
        {
          id: 'doc-1',
          content: 'Relevant content from knowledge base',
          similarity: 0.9,
          distance: 0.1,
          metadata: { source: 'test.txt' },
        },
      ],
      query: 'test query',
      formattedContext: 'Relevant content from knowledge base',
      totalTokensEstimate: 10,
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.5,
    };

    const result = await executeRAGSearch(input, mockConfig);

    expect(result.success).toBe(true);
    expect(result.query).toBe('test query');
    expect(result.results).toHaveLength(1);
    expect(result.totalResults).toBe(1);
  });

  it('returns empty results when no matches found', async () => {
    mockRetrieveContext.mockResolvedValue({
      documents: [],
      query: 'no results query',
      formattedContext: '',
      totalTokensEstimate: 0,
    });

    const input: RAGSearchInput = {
      query: 'no results query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.5,
    };

    const result = await executeRAGSearch(input, mockConfig);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(0);
    expect(result.totalResults).toBe(0);
    expect(result.context).toBe('');
  });

  it('passes topK parameter', async () => {
    mockRetrieveContext.mockResolvedValue({
      documents: [],
      query: 'test',
      formattedContext: '',
      totalTokensEstimate: 0,
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 10,
      threshold: 0.5,
    };

    await executeRAGSearch(input, mockConfig);

    expect(mockRetrieveContext).toHaveBeenCalledWith(
      'test-collection',
      'test query',
      expect.objectContaining({ topK: 10 })
    );
  });

  it('passes threshold parameter', async () => {
    mockRetrieveContext.mockResolvedValue({
      documents: [],
      query: 'test',
      formattedContext: '',
      totalTokensEstimate: 0,
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.7,
    };

    await executeRAGSearch(input, mockConfig);

    expect(mockRetrieveContext).toHaveBeenCalledWith(
      'test-collection',
      'test query',
      expect.objectContaining({ similarityThreshold: 0.7 })
    );
  });

  it('includes formatted context in result', async () => {
    mockRetrieveContext.mockResolvedValue({
      documents: [
        { id: '1', content: 'Content 1', similarity: 0.9, distance: 0.1, metadata: {} },
        { id: '2', content: 'Content 2', similarity: 0.8, distance: 0.2, metadata: {} },
      ],
      query: 'test',
      formattedContext: '[Source 1]\nContent 1\n\n[Source 2]\nContent 2',
      totalTokensEstimate: 20,
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.5,
    };

    const result = await executeRAGSearch(input, mockConfig);

    expect(result.context).toContain('[Source 1]');
    expect(result.context).toContain('[Source 2]');
  });

  it('includes metadata in results', async () => {
    mockRetrieveContext.mockResolvedValue({
      documents: [
        {
          id: 'doc-1',
          content: 'Content',
          similarity: 0.9,
          distance: 0.1,
          metadata: { source: 'file.txt', title: 'Test Document' },
        },
      ],
      query: 'test',
      formattedContext: 'Content',
      totalTokensEstimate: 5,
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.5,
    };

    const result = await executeRAGSearch(input, mockConfig);

    expect(result.results?.[0].metadata).toEqual({
      source: 'file.txt',
      title: 'Test Document',
    });
  });

  it('handles search errors', async () => {
    mockRetrieveContext.mockRejectedValue(new Error('Search failed'));

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.5,
    };

    const result = await executeRAGSearch(input, mockConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Search failed');
  });

  it('handles non-Error exceptions', async () => {
    mockRetrieveContext.mockRejectedValue('Unknown error');

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.5,
    };

    const result = await executeRAGSearch(input, mockConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('RAG search failed');
  });
});

describe('ragSearchInputSchema', () => {
  it('validates valid input', () => {
    const result = ragSearchInputSchema.safeParse({
      query: 'test query',
      collectionName: 'my-collection',
    });

    expect(result.success).toBe(true);
  });

  it('uses default values', () => {
    const result = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topK).toBe(5);
      expect(result.data.threshold).toBe(0.5);
    }
  });

  it('validates topK range', () => {
    const tooLow = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
      topK: 0,
    });
    expect(tooLow.success).toBe(false);

    const tooHigh = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
      topK: 25,
    });
    expect(tooHigh.success).toBe(false);

    const valid = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
      topK: 10,
    });
    expect(valid.success).toBe(true);
  });

  it('validates threshold range', () => {
    const tooLow = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
      threshold: -0.1,
    });
    expect(tooLow.success).toBe(false);

    const tooHigh = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
      threshold: 1.5,
    });
    expect(tooHigh.success).toBe(false);

    const valid = ragSearchInputSchema.safeParse({
      query: 'test',
      collectionName: 'collection',
      threshold: 0.7,
    });
    expect(valid.success).toBe(true);
  });

  it('requires query and collectionName', () => {
    const noQuery = ragSearchInputSchema.safeParse({
      collectionName: 'collection',
    });
    expect(noQuery.success).toBe(false);

    const noCollection = ragSearchInputSchema.safeParse({
      query: 'test',
    });
    expect(noCollection.success).toBe(false);
  });
});

describe('ragSearchTool', () => {
  it('has correct name', () => {
    expect(ragSearchTool.name).toBe('rag_search');
  });

  it('has description', () => {
    expect(ragSearchTool.description).toBeTruthy();
    expect(ragSearchTool.description).toContain('knowledge base');
  });

  it('uses correct schema', () => {
    expect(ragSearchTool.parameters).toBe(ragSearchInputSchema);
  });

  it('uses correct execute function', () => {
    expect(ragSearchTool.execute).toBe(executeRAGSearch);
  });

  it('does not require approval', () => {
    expect(ragSearchTool.requiresApproval).toBe(false);
  });

  it('has search category', () => {
    expect(ragSearchTool.category).toBe('search');
  });
});

describe('RAGSearchResult interface', () => {
  it('includes success status', () => {
    const result: RAGSearchResult = {
      success: true,
      query: 'test',
      results: [],
      context: '',
      totalResults: 0,
    };

    expect(result.success).toBe(true);
  });

  it('includes error on failure', () => {
    const result: RAGSearchResult = {
      success: false,
      error: 'Something went wrong',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
  });
});
