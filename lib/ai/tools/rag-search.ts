/**
 * RAG Search Tool - Search knowledge base using vector similarity
 */

import { z } from 'zod';
import { retrieveContext, type RAGConfig } from '@/lib/ai/rag';

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
  error?: string;
}

/**
 * Execute RAG search
 */
export async function executeRAGSearch(
  input: RAGSearchInput,
  config: RAGConfig
): Promise<RAGSearchResult> {
  try {
    const context = await retrieveContext(input.collectionName, input.query, {
      ...config,
      topK: input.topK,
      similarityThreshold: input.threshold,
    });

    if (context.documents.length === 0) {
      return {
        success: true,
        query: input.query,
        results: [],
        context: '',
        totalResults: 0,
      };
    }

    return {
      success: true,
      query: input.query,
      results: context.documents.map((doc) => ({
        content: doc.content,
        similarity: doc.similarity,
        metadata: doc.metadata,
      })),
      context: context.formattedContext,
      totalResults: context.documents.length,
    };
  } catch (error) {
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
    'Search the knowledge base for relevant information using semantic similarity. Use this when you need to find information from uploaded documents or project knowledge.',
  parameters: ragSearchInputSchema,
  execute: executeRAGSearch,
  requiresApproval: false,
  category: 'search' as const,
};
