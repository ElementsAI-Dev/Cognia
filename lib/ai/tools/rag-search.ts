/**
 * RAG Search Tool - Search knowledge base using advanced RAG pipeline
 * 
 * Uses the RAGPipeline with hybrid search, reranking, query expansion
 * instead of simple vector-only retrieval.
 */

import { z } from 'zod';
import { createRAGPipeline, type RAGPipelineConfig } from '@/lib/ai/rag';
import type { EmbeddingProvider } from '@/lib/vector/embedding';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export const ragSearchInputSchema = z.object({
  query: z.string().describe('The search query to find relevant information'),
  collectionName: z.string().describe('The name of the knowledge base collection to search'),
  topK: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .default(5)
    .describe('Maximum number of results to return'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum similarity threshold (0-1)'),
});

export type RAGSearchInput = z.infer<typeof ragSearchInputSchema>;

export interface RAGSearchResult {
  success: boolean;
  query?: string;
  results?: Array<{
    content: string;
    similarity: number;
    metadata?: Record<string, unknown>;
  }>;
  context?: string;
  totalResults?: number;
  searchMetadata?: {
    hybridSearchUsed: boolean;
    queryExpansionUsed: boolean;
    rerankingUsed: boolean;
  };
  error?: string;
}

export interface RAGSearchConfig {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  embeddingApiKey: string;
  enableHybridSearch?: boolean;
  enableReranking?: boolean;
  enableQueryExpansion?: boolean;
  enableCitations?: boolean;
}

/**
 * Execute RAG search using the advanced RAGPipeline
 */
export async function executeRAGSearch(
  input: RAGSearchInput,
  config: RAGSearchConfig
): Promise<RAGSearchResult> {
  try {
    const pipelineConfig: RAGPipelineConfig = {
      embeddingConfig: {
        provider: config.embeddingProvider,
        model: config.embeddingModel,
      },
      embeddingApiKey: config.embeddingApiKey,
      hybridSearch: {
        enabled: config.enableHybridSearch ?? false,
      },
      reranking: {
        enabled: config.enableReranking ?? false,
      },
      queryExpansion: {
        enabled: config.enableQueryExpansion ?? false,
      },
      topK: input.topK,
      similarityThreshold: input.threshold,
      citations: {
        enabled: config.enableCitations ?? false,
      },
    };

    const pipeline = createRAGPipeline(pipelineConfig);
    const result = await pipeline.retrieve(input.collectionName, input.query);

    if (result.documents.length === 0) {
      return {
        success: true,
        query: input.query,
        results: [],
        context: '',
        totalResults: 0,
        searchMetadata: result.searchMetadata,
      };
    }

    return {
      success: true,
      query: input.query,
      results: result.documents.map((doc) => ({
        content: doc.content,
        similarity: doc.rerankScore,
        metadata: doc.metadata,
      })),
      context: result.formattedContext,
      totalResults: result.documents.length,
      searchMetadata: result.searchMetadata,
    };
  } catch (error) {
    log.error('RAG search tool failed', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'RAG search failed',
    };
  }
}

/**
 * RAG search tool definition
 */
export const ragSearchTool = {
  name: 'rag_search',
  description:
    'Search the knowledge base for relevant information using advanced hybrid search with semantic similarity, keyword matching, and reranking. Use this when you need to find information from uploaded documents or project knowledge.',
  parameters: ragSearchInputSchema,
  execute: executeRAGSearch,
  requiresApproval: false,
  category: 'search' as const,
};
