/**
 * RAG Search Tool - Search knowledge base using advanced RAG pipeline
 * 
 * Uses the RAGPipeline with hybrid search, reranking, query expansion
 * instead of simple vector-only retrieval.
 */

import { z } from 'zod';
import { getSharedRAGRuntime, type RAGRuntimeConfig } from '@/lib/ai/rag';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export const ragSearchInputSchema = z.object({
  query: z.string().describe('The search query to find relevant information'),
  collectionName: z
    .string()
    .optional()
    .describe('The name of the knowledge base collection to search'),
  topK: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe('Maximum number of results to return'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
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
  runtimeConfig: RAGRuntimeConfig;
  defaultCollectionName?: string;
}

/**
 * Execute RAG search using the advanced RAGPipeline
 */
export async function executeRAGSearch(
  input: RAGSearchInput,
  config: RAGSearchConfig
): Promise<RAGSearchResult> {
  try {
    const runtimeConfig: RAGRuntimeConfig = {
      ...config.runtimeConfig,
      topK: input.topK ?? config.runtimeConfig.topK,
      similarityThreshold: input.threshold ?? config.runtimeConfig.similarityThreshold,
    };
    const runtime = getSharedRAGRuntime('tool:rag-search', runtimeConfig);
    const collectionName =
      input.collectionName || config.defaultCollectionName || runtimeConfig.defaultCollectionName || 'default';
    const result = await runtime.retrieve(collectionName, input.query);

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
