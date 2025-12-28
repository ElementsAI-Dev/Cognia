'use client';

/**
 * useRAGPipeline - Hook for RAG Pipeline with advanced features
 * 
 * Features:
 * - Hybrid search (BM25 + Vector)
 * - Query expansion
 * - Reranking
 * - Contextual retrieval
 */

import { useCallback, useState, useRef, useMemo } from 'react';
import { useVectorStore, useSettingsStore } from '@/stores';
import {
  RAGPipeline,
  createRAGPipeline,
  type RAGPipelineConfig,
  type RAGPipelineContext,
} from '@/lib/ai/rag/index';
import { chunkDocument, chunkDocumentSmart, chunkDocumentRecursive, type ChunkingResult } from '@/lib/ai/chunking';

export interface UseRAGPipelineOptions {
  collectionName?: string;
  topK?: number;
  similarityThreshold?: number;
  maxContextLength?: number;
  
  // Advanced features
  enableHybridSearch?: boolean;
  enableQueryExpansion?: boolean;
  enableReranking?: boolean;
  enableContextualRetrieval?: boolean;
  
  // Weights
  vectorWeight?: number;
  keywordWeight?: number;
}

export interface IndexingResult {
  documentId: string;
  chunksCreated: number;
  success: boolean;
  error?: string;
}

export interface UseRAGPipelineReturn {
  // State
  isLoading: boolean;
  error: string | null;
  lastContext: RAGPipelineContext | null;
  isInitialized: boolean;

  // Indexing
  indexDocument: (
    content: string,
    options: {
      documentId: string;
      documentTitle?: string;
      metadata?: Record<string, unknown>;
    }
  ) => Promise<IndexingResult>;
  
  indexDocuments: (
    documents: Array<{
      id: string;
      content: string;
      title?: string;
      metadata?: Record<string, unknown>;
    }>
  ) => Promise<IndexingResult[]>;

  // Retrieval
  retrieve: (query: string) => Promise<RAGPipelineContext>;
  
  // Collection management
  clearCollection: () => void;
  getCollectionStats: () => { documentCount: number; exists: boolean };
  
  // Chunking utilities
  chunkText: (text: string) => ChunkingResult;
  chunkTextSmart: (text: string) => ChunkingResult;
  chunkTextRecursive: (text: string) => ChunkingResult;
  
  // Configuration
  updateConfig: (config: Partial<UseRAGPipelineOptions>) => void;
}

export function useRAGPipeline(options: UseRAGPipelineOptions = {}): UseRAGPipelineReturn {
  const {
    collectionName = 'rag-default',
    topK = 5,
    similarityThreshold = 0.5,
    maxContextLength = 4000,
    enableHybridSearch = true,
    enableQueryExpansion = false,
    enableReranking = true,
    enableContextualRetrieval = false,
    vectorWeight = 0.5,
    keywordWeight = 0.5,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContext, setLastContext] = useState<RAGPipelineContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
    if (provider === 'cohere') {
      return providerSettings.cohere?.apiKey || '';
    }
    if (provider === 'mistral') {
      return providerSettings.mistral?.apiKey || '';
    }
    return providerSettings.openai?.apiKey || '';
  }, [vectorSettings.embeddingProvider, providerSettings]);

  // Build pipeline config
  const pipelineConfig = useMemo((): RAGPipelineConfig => ({
    embeddingConfig: {
      provider: vectorSettings.embeddingProvider,
      model: vectorSettings.embeddingModel,
    },
    embeddingApiKey: getApiKey(),
    hybridSearch: {
      enabled: enableHybridSearch,
      vectorWeight,
      keywordWeight,
    },
    queryExpansion: {
      enabled: enableQueryExpansion,
      maxVariants: 3,
    },
    reranking: {
      enabled: enableReranking,
      useLLM: false,
    },
    contextualRetrieval: {
      enabled: enableContextualRetrieval,
      useLLM: false,
    },
    topK,
    similarityThreshold,
    maxContextLength,
    chunkingOptions: {
      strategy: 'sentence',
      chunkSize: vectorSettings.chunkSize,
      chunkOverlap: vectorSettings.chunkOverlap,
    },
  }), [
    vectorSettings,
    getApiKey,
    enableHybridSearch,
    enableQueryExpansion,
    enableReranking,
    enableContextualRetrieval,
    vectorWeight,
    keywordWeight,
    topK,
    similarityThreshold,
    maxContextLength,
  ]);

  // Pipeline instance
  const pipelineRef = useRef<RAGPipeline | null>(null);

  const getPipeline = useCallback(() => {
    if (!pipelineRef.current) {
      pipelineRef.current = createRAGPipeline(pipelineConfig);
      setIsInitialized(true);
    }
    return pipelineRef.current;
  }, [pipelineConfig]);

  // Index a single document
  const indexDocument = useCallback(async (
    content: string,
    opts: {
      documentId: string;
      documentTitle?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<IndexingResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const pipeline = getPipeline();
      const result = await pipeline.indexDocument(content, {
        collectionName,
        documentId: opts.documentId,
        documentTitle: opts.documentTitle,
        metadata: opts.metadata,
        useContextualRetrieval: enableContextualRetrieval,
      });

      if (!result.success) {
        setError(result.error || 'Indexing failed');
      }

      return {
        documentId: opts.documentId,
        chunksCreated: result.chunksCreated,
        success: result.success,
        error: result.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Indexing failed';
      setError(message);
      return {
        documentId: opts.documentId,
        chunksCreated: 0,
        success: false,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, enableContextualRetrieval, getPipeline]);

  // Index multiple documents
  const indexDocuments = useCallback(async (
    documents: Array<{
      id: string;
      content: string;
      title?: string;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<IndexingResult[]> => {
    setIsLoading(true);
    setError(null);

    const results: IndexingResult[] = [];

    try {
      for (const doc of documents) {
        const result = await indexDocument(doc.content, {
          documentId: doc.id,
          documentTitle: doc.title,
          metadata: doc.metadata,
        });
        results.push(result);
      }

      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        setError(`${failures.length} documents failed to index`);
      }

      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch indexing failed';
      setError(message);
      return documents.map(doc => ({
        documentId: doc.id,
        chunksCreated: 0,
        success: false,
        error: message,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [indexDocument]);

  // Retrieve context
  const retrieve = useCallback(async (query: string): Promise<RAGPipelineContext> => {
    setIsLoading(true);
    setError(null);

    try {
      const pipeline = getPipeline();
      const context = await pipeline.retrieve(collectionName, query);
      setLastContext(context);
      return context;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Retrieval failed';
      setError(message);
      const emptyContext: RAGPipelineContext = {
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
      setLastContext(emptyContext);
      return emptyContext;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, getPipeline]);

  // Clear collection
  const clearCollection = useCallback(() => {
    const pipeline = getPipeline();
    pipeline.clearCollection(collectionName);
  }, [collectionName, getPipeline]);

  // Get collection stats
  const getCollectionStats = useCallback(() => {
    const pipeline = getPipeline();
    return pipeline.getCollectionStats(collectionName);
  }, [collectionName, getPipeline]);

  // Chunking utilities
  const chunkText = useCallback((text: string): ChunkingResult => {
    return chunkDocument(text, {
      strategy: 'sentence',
      chunkSize: vectorSettings.chunkSize,
      chunkOverlap: vectorSettings.chunkOverlap,
    });
  }, [vectorSettings.chunkSize, vectorSettings.chunkOverlap]);

  const chunkTextSmart = useCallback((text: string): ChunkingResult => {
    return chunkDocumentSmart(text, {
      chunkSize: vectorSettings.chunkSize,
      chunkOverlap: vectorSettings.chunkOverlap,
    });
  }, [vectorSettings.chunkSize, vectorSettings.chunkOverlap]);

  const chunkTextRecursive = useCallback((text: string): ChunkingResult => {
    return chunkDocumentRecursive(text, {
      maxChunkSize: vectorSettings.chunkSize,
      overlap: vectorSettings.chunkOverlap,
    });
  }, [vectorSettings.chunkSize, vectorSettings.chunkOverlap]);

  // Update configuration
  const updateConfig = useCallback((config: Partial<UseRAGPipelineOptions>) => {
    const pipeline = getPipeline();
    pipeline.updateConfig({
      hybridSearch: config.enableHybridSearch !== undefined ? {
        enabled: config.enableHybridSearch,
        vectorWeight: config.vectorWeight,
        keywordWeight: config.keywordWeight,
      } : undefined,
      queryExpansion: config.enableQueryExpansion !== undefined ? {
        enabled: config.enableQueryExpansion,
      } : undefined,
      reranking: config.enableReranking !== undefined ? {
        enabled: config.enableReranking,
      } : undefined,
      contextualRetrieval: config.enableContextualRetrieval !== undefined ? {
        enabled: config.enableContextualRetrieval,
      } : undefined,
      topK: config.topK,
      similarityThreshold: config.similarityThreshold,
      maxContextLength: config.maxContextLength,
    });
  }, [getPipeline]);

  return {
    isLoading,
    error,
    lastContext,
    isInitialized,
    indexDocument,
    indexDocuments,
    retrieve,
    clearCollection,
    getCollectionStats,
    chunkText,
    chunkTextSmart,
    chunkTextRecursive,
    updateConfig,
  };
}

export default useRAGPipeline;
