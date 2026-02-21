'use client';

/**
 * useRAG - Hook for Retrieval Augmented Generation
 * Provides easy access to RAG functionality
 */

import { useCallback, useState } from 'react';
import { useVectorStore, useSettingsStore } from '@/stores';
import {
  RAGPipeline,
  createRAGPipeline,
  type RAGPipelineConfig,
  type RAGPipelineContext,
  createRAGTools,
  type RAGToolsConfig,
  createRAGRuntimeConfigFromVectorSettings,
  createRAGRuntime,
} from '@/lib/ai/rag/index';
import {
  chunkDocument,
  type ChunkingOptions,
  type ChunkingResult,
} from '@/lib/ai/embedding/chunking';
import { getPluginEventHooks } from '@/lib/plugin';
import { resolveEmbeddingApiKey } from '@/lib/vector/embedding';
import type { RAGDocument, RAGContext, IndexingResult } from '@/types/document/rag';

export interface UseRAGOptions {
  collectionName?: string;
  topK?: number;
  similarityThreshold?: number;
  maxContextLength?: number;
  chunkingStrategy?: 'fixed' | 'sentence' | 'paragraph';
  chunkSize?: number;
  chunkOverlap?: number;

  // Advanced RAG features
  enableHybridSearch?: boolean;
  enableReranking?: boolean;
  enableQueryExpansion?: boolean;
  enableSparseSearch?: boolean;
  enableLateInteraction?: boolean;
  vectorWeight?: number;
  keywordWeight?: number;
  sparseWeight?: number;
  lateInteractionWeight?: number;
}

export interface UseRAGReturn {
  // State
  isLoading: boolean;
  error: string | null;
  lastContext: RAGContext | null;

  // Indexing
  indexSingleDocument: (doc: RAGDocument) => Promise<IndexingResult>;
  indexMultipleDocuments: (docs: RAGDocument[]) => Promise<IndexingResult[]>;
  indexText: (id: string, text: string, title?: string) => Promise<IndexingResult>;

  // Retrieval
  retrieve: (query: string) => Promise<RAGContext>;
  retrieveWithOptions: (query: string, options: Partial<UseRAGOptions>) => Promise<RAGContext>;

  // Prompt generation
  generatePrompt: (query: string, systemPrompt?: string) => Promise<string>;
  generatePromptWithContext: (query: string, context: RAGContext, systemPrompt?: string) => string;

  // Chunking utilities
  chunkText: (text: string, options?: Partial<ChunkingOptions>) => ChunkingResult;
  estimateChunks: (textLength: number) => number;

  // Simple RAG handle (legacy API name)
  createSimpleRAG: () => RAGPipeline;

  // Advanced RAG pipeline
  createAdvancedPipeline: () => RAGPipeline;
  advancedRetrieve: (query: string) => Promise<RAGPipelineContext>;

  // RAG tools for AI SDK integration
  createTools: () => ReturnType<typeof createRAGTools>;
}

export function useRAG(options: UseRAGOptions = {}): UseRAGReturn {
  const {
    collectionName = 'rag-default',
    topK = 5,
    similarityThreshold = 0.5,
    maxContextLength = 4000,
    chunkingStrategy = 'sentence',
    chunkSize = 1000,
    chunkOverlap = 200,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContext, setLastContext] = useState<RAGContext | null>(null);

  const vectorSettings = useVectorStore((state) => state.settings);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get API key
  const getApiKey = useCallback((): string => {
    return resolveEmbeddingApiKey(
      vectorSettings.embeddingProvider,
      providerSettings as Record<string, { apiKey?: string }>
    );
  }, [vectorSettings.embeddingProvider, providerSettings]);

  const buildPipelineConfig = useCallback(
    (overrides?: Partial<UseRAGOptions>): RAGPipelineConfig => {
      const opts = { ...options, ...overrides };
      const runtimeConfig = createRAGRuntimeConfigFromVectorSettings(
        {
          ...vectorSettings,
          ragTopK: opts.topK || topK,
          ragSimilarityThreshold: opts.similarityThreshold || similarityThreshold,
          ragMaxContextLength: opts.maxContextLength || maxContextLength,
          enableHybridSearch: opts.enableHybridSearch ?? options.enableHybridSearch ?? false,
          enableQueryExpansion: opts.enableQueryExpansion ?? options.enableQueryExpansion ?? false,
          enableReranking: opts.enableReranking ?? options.enableReranking ?? false,
          vectorWeight: opts.vectorWeight ?? options.vectorWeight ?? 0.7,
          keywordWeight: opts.keywordWeight ?? options.keywordWeight ?? 0.3,
        },
        getApiKey()
      );

      return {
        embeddingConfig: runtimeConfig.vectorStore.embeddingConfig,
        embeddingApiKey: runtimeConfig.vectorStore.embeddingApiKey,
        vectorStoreConfig: runtimeConfig.vectorStore,
        hybridSearch: {
          enabled: opts.enableHybridSearch ?? true,
          vectorWeight: opts.vectorWeight ?? 0.5,
          keywordWeight: opts.keywordWeight ?? 0.5,
          sparseWeight: opts.sparseWeight ?? 0.3,
          lateInteractionWeight: opts.lateInteractionWeight ?? 0.2,
          enableSparseSearch: opts.enableSparseSearch ?? false,
          enableLateInteraction: opts.enableLateInteraction ?? false,
        },
        reranking: {
          enabled: opts.enableReranking ?? true,
          useLLM: false,
        },
        queryExpansion: {
          enabled: opts.enableQueryExpansion ?? false,
          maxVariants: 3,
        },
        contextualRetrieval: {
          enabled: false,
        },
        topK: opts.topK || topK,
        similarityThreshold: opts.similarityThreshold || similarityThreshold,
        maxContextLength: opts.maxContextLength || maxContextLength,
        chunkingOptions: {
          strategy: opts.chunkingStrategy || chunkingStrategy,
          chunkSize: opts.chunkSize || chunkSize,
          chunkOverlap: opts.chunkOverlap || chunkOverlap,
        },
      };
    },
    [
      chunkOverlap,
      chunkSize,
      chunkingStrategy,
      getApiKey,
      maxContextLength,
      options,
      similarityThreshold,
      topK,
      vectorSettings,
    ]
  );

  const mapToLegacyContext = useCallback((context: RAGPipelineContext): RAGContext => {
    return {
      query: context.query,
      formattedContext: context.formattedContext,
      totalTokensEstimate: context.totalTokensEstimate,
      documents: context.documents.map((doc) => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata as Record<string, string | number | boolean> | undefined,
        similarity: doc.rerankScore,
        distance: 1 - doc.rerankScore,
      })),
    };
  }, []);

  const createPrompt = useCallback(
    (query: string, context: RAGContext, systemPrompt?: string): string => {
      const base = systemPrompt || 'You are a helpful assistant.';
      if (!context.formattedContext) {
        return `${base}\n\nUser: ${query}`;
      }
      return `${base}

Use the following context to answer the user's question.

## Context
${context.formattedContext}

## User Question
${query}`;
    },
    []
  );

  // Index single document
  const indexSingleDocument = useCallback(
    async (doc: RAGDocument): Promise<IndexingResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const pipeline = createRAGPipeline(buildPipelineConfig());
        const result = await pipeline.indexDocument(doc.content, {
          collectionName,
          documentId: doc.id,
          documentTitle: doc.title,
          metadata: doc.metadata,
        });
        if (!result.success) {
          setError(result.error || 'Indexing failed');
        }
        return {
          documentId: doc.id,
          chunksCreated: result.chunksCreated,
          success: result.success,
          error: result.error,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Indexing failed';
        setError(message);
        return { documentId: doc.id, chunksCreated: 0, success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [buildPipelineConfig, collectionName]
  );

  // Index multiple documents
  const indexMultipleDocuments = useCallback(
    async (docs: RAGDocument[]): Promise<IndexingResult[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const pipeline = createRAGPipeline(buildPipelineConfig());
        const results: IndexingResult[] = [];
        for (const doc of docs) {
          const result = await pipeline.indexDocument(doc.content, {
            collectionName,
            documentId: doc.id,
            documentTitle: doc.title,
            metadata: doc.metadata,
          });
          results.push({
            documentId: doc.id,
            chunksCreated: result.chunksCreated,
            success: result.success,
            error: result.error,
          });
        }
        const failures = results.filter((item) => !item.success);
        if (failures.length > 0) {
          setError(`${failures.length} documents failed to index`);
        }
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Batch indexing failed';
        setError(message);
        return docs.map((doc) => ({
          documentId: doc.id,
          chunksCreated: 0,
          success: false,
          error: message,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [buildPipelineConfig, collectionName]
  );

  // Index plain text
  const indexText = useCallback(
    async (id: string, text: string, title?: string): Promise<IndexingResult> => {
      return indexSingleDocument({
        id,
        content: text,
        title,
      });
    },
    [indexSingleDocument]
  );

  // Retrieve context
  const retrieve = useCallback(
    async (query: string): Promise<RAGContext> => {
      setIsLoading(true);
      setError(null);
      try {
        const pipeline = createRAGPipeline(buildPipelineConfig());
        const pipelineContext = await pipeline.retrieve(collectionName, query);
        const context = mapToLegacyContext(pipelineContext);
        setLastContext(context);
        if (pipelineContext.documents?.length) {
          getPluginEventHooks().dispatchRAGContextRetrieved('', pipelineContext.documents.map((d) => ({
            id: d.id,
            content: d.content,
            score: d.rerankScore,
          })));
        }
        return context;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Retrieval failed';
        setError(message);
        const emptyContext: RAGContext = {
          documents: [],
          query,
          formattedContext: '',
          totalTokensEstimate: 0,
        };
        setLastContext(emptyContext);
        return emptyContext;
      } finally {
        setIsLoading(false);
      }
    },
    [buildPipelineConfig, collectionName, mapToLegacyContext]
  );

  // Retrieve with custom options
  const retrieveWithOptions = useCallback(
    async (query: string, overrides: Partial<UseRAGOptions>): Promise<RAGContext> => {
      setIsLoading(true);
      setError(null);
      try {
        const pipeline = createRAGPipeline(buildPipelineConfig(overrides));
        const pipelineContext = await pipeline.retrieve(collectionName, query);
        const context = mapToLegacyContext(pipelineContext);
        setLastContext(context);
        if (pipelineContext.documents?.length) {
          getPluginEventHooks().dispatchRAGContextRetrieved('', pipelineContext.documents.map((d) => ({
            id: d.id,
            content: d.content,
            score: d.rerankScore,
          })));
        }
        return context;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Retrieval failed';
        setError(message);
        const emptyContext: RAGContext = {
          documents: [],
          query,
          formattedContext: '',
          totalTokensEstimate: 0,
        };
        return emptyContext;
      } finally {
        setIsLoading(false);
      }
    },
    [buildPipelineConfig, collectionName, mapToLegacyContext]
  );

  // Generate RAG-enhanced prompt
  const generatePrompt = useCallback(
    async (query: string, systemPrompt?: string): Promise<string> => {
      const context = await retrieve(query);
      return createPrompt(query, context, systemPrompt);
    },
    [createPrompt, retrieve]
  );

  // Generate prompt with existing context
  const generatePromptWithContext = useCallback(
    (query: string, context: RAGContext, systemPrompt?: string): string => {
      return createPrompt(query, context, systemPrompt);
    },
    [createPrompt]
  );

  // Chunk text utility
  const chunkText = useCallback(
    (text: string, chunkOptions?: Partial<ChunkingOptions>): ChunkingResult => {
      return chunkDocument(text, {
        strategy: chunkingStrategy,
        chunkSize,
        chunkOverlap,
        ...chunkOptions,
      });
    },
    [chunkingStrategy, chunkSize, chunkOverlap]
  );

  // Estimate chunks
  const estimateChunks = useCallback(
    (textLength: number): number => {
      if (textLength <= chunkSize) return 1;
      const effectiveChunkSize = chunkSize - chunkOverlap;
      return Math.ceil((textLength - chunkOverlap) / effectiveChunkSize);
    },
    [chunkSize, chunkOverlap]
  );

  // Create simple RAG handle (legacy API name)
  const createSimpleRAG = useCallback((): RAGPipeline => {
    const runtimeConfig = createRAGRuntimeConfigFromVectorSettings(
      {
        ...vectorSettings,
        ragTopK: topK,
        ragSimilarityThreshold: similarityThreshold,
        ragMaxContextLength: maxContextLength,
      },
      getApiKey()
    );
    return createRAGRuntime(runtimeConfig).getPipeline();
  }, [getApiKey, maxContextLength, similarityThreshold, topK, vectorSettings]);

  // Create advanced RAG pipeline with hybrid search, reranking, etc.
  const createAdvancedPipeline = useCallback((): RAGPipeline => {
    return createRAGPipeline(buildPipelineConfig());
  }, [
    buildPipelineConfig,
  ]);

  // Create RAG tools for use with AI SDK streamText/generateText
  const createTools = useCallback(
    (toolsConfig?: Partial<RAGToolsConfig>) => {
      const pipeline = createAdvancedPipeline();
      return createRAGTools({
        pipeline,
        collectionName,
        topK,
        similarityThreshold,
        ...toolsConfig,
      });
    },
    [createAdvancedPipeline, collectionName, topK, similarityThreshold]
  );

  // Advanced retrieve with hybrid search and reranking
  const advancedRetrieve = useCallback(
    async (query: string): Promise<RAGPipelineContext> => {
      setIsLoading(true);
      setError(null);
      try {
        const pipeline = createAdvancedPipeline();
        const context = await pipeline.retrieve(collectionName, query);
        return context;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Advanced retrieval failed';
        setError(message);
        return {
          documents: [],
          query,
          formattedContext: '',
          totalTokensEstimate: 0,
          searchMetadata: {
            hybridSearchUsed: false,
            queryExpansionUsed: false,
            rerankingUsed: false,
            originalResultCount: 0,
            finalResultCount: 0,
          },
        };
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, createAdvancedPipeline]
  );

  return {
    isLoading,
    error,
    lastContext,
    indexSingleDocument,
    indexMultipleDocuments,
    indexText,
    retrieve,
    retrieveWithOptions,
    generatePrompt,
    generatePromptWithContext,
    chunkText,
    estimateChunks,
    createSimpleRAG,
    createAdvancedPipeline,
    advancedRetrieve,
    // New: RAG tools for AI SDK integration
    createTools,
  };
}

export default useRAG;
