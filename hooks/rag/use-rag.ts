'use client';

/**
 * useRAG - Hook for Retrieval Augmented Generation
 * Provides easy access to RAG functionality
 */

import { useCallback, useState } from 'react';
import { useVectorStore, useSettingsStore } from '@/stores';
import {
  indexDocument,
  indexDocuments,
  retrieveContext,
  createRAGPrompt,
  SimpleRAG,
  type RAGDocument,
  type RAGConfig,
  type RAGContext,
  type IndexingResult,
} from '@/lib/ai/rag';
import {
  RAGPipeline,
  createRAGPipeline,
  type RAGPipelineConfig,
  type RAGPipelineContext,
  createRAGTools,
  type RAGToolsConfig,
} from '@/lib/ai/rag/index';
import {
  chunkDocument,
  type ChunkingOptions,
  type ChunkingResult,
} from '@/lib/ai/embedding/chunking';

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

  // Simple RAG (in-memory)
  createSimpleRAG: () => SimpleRAG;

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
    const provider = vectorSettings.embeddingProvider;
    if (provider === 'openai') {
      return providerSettings.openai?.apiKey || '';
    }
    if (provider === 'google') {
      return providerSettings.google?.apiKey || '';
    }
    return providerSettings.openai?.apiKey || '';
  }, [vectorSettings.embeddingProvider, providerSettings]);

  // Build RAG config
  const buildRAGConfig = useCallback(
    (overrides?: Partial<UseRAGOptions>): RAGConfig => {
      const opts = { ...options, ...overrides };
      return {
        chromaConfig: {
          mode: vectorSettings.mode,
          serverUrl: vectorSettings.serverUrl,
          embeddingConfig: {
            provider: vectorSettings.embeddingProvider,
            model: vectorSettings.embeddingModel,
          },
          apiKey: getApiKey(),
        },
        chunkingOptions: {
          strategy: opts.chunkingStrategy || chunkingStrategy,
          chunkSize: opts.chunkSize || chunkSize,
          chunkOverlap: opts.chunkOverlap || chunkOverlap,
        },
        topK: opts.topK || topK,
        similarityThreshold: opts.similarityThreshold || similarityThreshold,
        maxContextLength: opts.maxContextLength || maxContextLength,
      };
    },
    [
      options,
      vectorSettings,
      getApiKey,
      chunkingStrategy,
      chunkSize,
      chunkOverlap,
      topK,
      similarityThreshold,
      maxContextLength,
    ]
  );

  // Index single document
  const indexSingleDocument = useCallback(
    async (doc: RAGDocument): Promise<IndexingResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildRAGConfig();
        const result = await indexDocument(collectionName, doc, config);
        if (!result.success) {
          setError(result.error || 'Indexing failed');
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Indexing failed';
        setError(message);
        return { documentId: doc.id, chunksCreated: 0, success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, buildRAGConfig]
  );

  // Index multiple documents
  const indexMultipleDocuments = useCallback(
    async (docs: RAGDocument[]): Promise<IndexingResult[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildRAGConfig();
        const results = await indexDocuments(collectionName, docs, config);
        const failures = results.filter((r) => !r.success);
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
    [collectionName, buildRAGConfig]
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
        const config = buildRAGConfig();
        const context = await retrieveContext(collectionName, query, config);
        setLastContext(context);
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
    [collectionName, buildRAGConfig]
  );

  // Retrieve with custom options
  const retrieveWithOptions = useCallback(
    async (query: string, overrides: Partial<UseRAGOptions>): Promise<RAGContext> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildRAGConfig(overrides);
        const context = await retrieveContext(collectionName, query, config);
        setLastContext(context);
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
    [collectionName, buildRAGConfig]
  );

  // Generate RAG-enhanced prompt
  const generatePrompt = useCallback(
    async (query: string, systemPrompt?: string): Promise<string> => {
      const context = await retrieve(query);
      return createRAGPrompt(query, context, systemPrompt);
    },
    [retrieve]
  );

  // Generate prompt with existing context
  const generatePromptWithContext = useCallback(
    (query: string, context: RAGContext, systemPrompt?: string): string => {
      return createRAGPrompt(query, context, systemPrompt);
    },
    []
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

  // Create simple in-memory RAG
  const createSimpleRAG = useCallback((): SimpleRAG => {
    return new SimpleRAG(
      {
        provider: vectorSettings.embeddingProvider,
        model: vectorSettings.embeddingModel,
      },
      getApiKey()
    );
  }, [vectorSettings.embeddingProvider, vectorSettings.embeddingModel, getApiKey]);

  // Create advanced RAG pipeline with hybrid search, reranking, etc.
  const createAdvancedPipeline = useCallback((): RAGPipeline => {
    const pipelineConfig: RAGPipelineConfig = {
      embeddingConfig: {
        provider: vectorSettings.embeddingProvider,
        model: vectorSettings.embeddingModel,
      },
      embeddingApiKey: getApiKey(),
      hybridSearch: {
        enabled: options.enableHybridSearch ?? true,
        vectorWeight: options.vectorWeight ?? 0.5,
        keywordWeight: options.keywordWeight ?? 0.5,
        sparseWeight: options.sparseWeight ?? 0.3,
        lateInteractionWeight: options.lateInteractionWeight ?? 0.2,
        enableSparseSearch: options.enableSparseSearch ?? false,
        enableLateInteraction: options.enableLateInteraction ?? false,
      },
      reranking: {
        enabled: options.enableReranking ?? true,
        useLLM: false,
      },
      queryExpansion: {
        enabled: options.enableQueryExpansion ?? false,
        maxVariants: 3,
      },
      contextualRetrieval: {
        enabled: false,
      },
      topK,
      similarityThreshold,
      maxContextLength,
      chunkingOptions: {
        strategy: chunkingStrategy,
        chunkSize,
        chunkOverlap,
      },
    };
    return createRAGPipeline(pipelineConfig);
  }, [
    vectorSettings.embeddingProvider,
    vectorSettings.embeddingModel,
    getApiKey,
    options.enableHybridSearch,
    options.enableReranking,
    options.enableQueryExpansion,
    options.enableSparseSearch,
    options.enableLateInteraction,
    options.vectorWeight,
    options.keywordWeight,
    options.sparseWeight,
    options.lateInteractionWeight,
    topK,
    similarityThreshold,
    maxContextLength,
    chunkingStrategy,
    chunkSize,
    chunkOverlap,
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
