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
  createRAGPipeline: jest.fn(),
}));

import { createRAGPipeline } from '@/lib/ai/rag';

const mockCreateRAGPipeline = createRAGPipeline as jest.Mock;
const mockRetrieve = jest.fn();

describe('executeRAGSearch', () => {
  const mockConfig: RAGSearchConfig = {
    embeddingProvider: 'openai',
    embeddingModel: 'text-embedding-3-small',
    embeddingApiKey: 'test-key',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateRAGPipeline.mockReturnValue({
      retrieve: mockRetrieve,
    });
  });

  it('searches knowledge base successfully', async () => {
    mockRetrieve.mockResolvedValue({
      documents: [
        {
          content: 'Relevant content from knowledge base',
          rerankScore: 0.9,
          metadata: { source: 'test.txt' },
        },
      ],
      formattedContext: 'Relevant content from knowledge base',
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
      },
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
    mockRetrieve.mockResolvedValue({
      documents: [],
      formattedContext: '',
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
      },
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
    mockRetrieve.mockResolvedValue({
      documents: [],
      formattedContext: '',
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
      },
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 10,
      threshold: 0.5,
    };

    await executeRAGSearch(input, mockConfig);

    expect(mockCreateRAGPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ topK: 10 })
    );
  });

  it('passes threshold parameter', async () => {
    mockRetrieve.mockResolvedValue({
      documents: [],
      formattedContext: '',
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
      },
    });

    const input: RAGSearchInput = {
      query: 'test query',
      collectionName: 'test-collection',
      topK: 5,
      threshold: 0.7,
    };

    await executeRAGSearch(input, mockConfig);

    expect(mockCreateRAGPipeline).toHaveBeenCalledWith(
      expect.objectContaining({ similarityThreshold: 0.7 })
    );
  });

  it('includes formatted context in result', async () => {
    mockRetrieve.mockResolvedValue({
      documents: [
        { content: 'Content 1', rerankScore: 0.9, metadata: {} },
        { content: 'Content 2', rerankScore: 0.8, metadata: {} },
      ],
      formattedContext: '[Source 1]\nContent 1\n\n[Source 2]\nContent 2',
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
      },
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
    mockRetrieve.mockResolvedValue({
      documents: [
        {
          content: 'Content',
          rerankScore: 0.9,
          metadata: { source: 'file.txt', title: 'Test Document' },
        },
      ],
      formattedContext: 'Content',
      searchMetadata: {
        hybridSearchUsed: false,
        queryExpansionUsed: false,
        rerankingUsed: false,
      },
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
    mockRetrieve.mockRejectedValue(new Error('Search failed'));

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
    mockRetrieve.mockRejectedValue('Unknown error');

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
