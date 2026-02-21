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

import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { useVectorStore, useSettingsStore } from '@/stores';
import {
  RAGPipeline,
  createRAGPipeline,
  type RAGPipelineConfig,
  type RAGPipelineContext,
} from '@/lib/ai/rag/index';
import {
  chunkDocument,
  chunkDocumentSmart,
  chunkDocumentRecursive,
  type ChunkingResult,
} from '@/lib/ai/embedding/chunking';
import {
  RAGCollectionManager,
  getGlobalCollectionManager,
  type CollectionInfo,
} from '@/lib/ai/rag/collection-manager';
import { useRAGProgress, type RAGProgress, type RAGOperationStats } from './use-rag-progress';
import { resolveEmbeddingApiKey } from '@/lib/vector/embedding';

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
  enableSparseSearch?: boolean;
  enableLateInteraction?: boolean;

  // Weights
  vectorWeight?: number;
  keywordWeight?: number;
  sparseWeight?: number;
  lateInteractionWeight?: number;
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

  // Progress tracking
  progress: RAGProgress;
  progressStats: RAGOperationStats;
  isProgressActive: boolean;

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

  // Collection management (persistent)
  clearCollection: () => Promise<void>;
  getCollectionStats: () => Promise<{ documentCount: number; exists: boolean }>;
  listCollections: () => Promise<CollectionInfo[]>;
  deleteCollection: (name: string) => Promise<void>;

  // Feedback for adaptive reranking
  recordFeedback: (query: string, resultId: string, relevance: number, action?: 'click' | 'use' | 'dismiss' | 'explicit') => void;

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
    enableSparseSearch = false,
    enableLateInteraction = false,
    vectorWeight = 0.5,
    keywordWeight = 0.5,
    sparseWeight = 0.3,
    lateInteractionWeight = 0.2,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastContext, setLastContext] = useState<RAGPipelineContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Progress tracking
  const ragProgress = useRAGProgress();

  const vectorSettings = useVectorStore((state) => state.settings);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Collection manager reference for persistent collection management
  const collectionManagerRef = useRef<RAGCollectionManager | null>(null);

  // Initialize collection manager on mount
  useEffect(() => {
    let mounted = true;
    const initCollectionManager = async () => {
      try {
        const manager = await getGlobalCollectionManager();
        if (mounted) {
          collectionManagerRef.current = manager;
        }
      } catch {
        // Collection manager init failed silently - non-critical for basic functionality
      }
    };
    initCollectionManager();
    return () => { mounted = false; };
  }, []);

  // Get API key
  const getApiKey = useCallback((): string => {
    return resolveEmbeddingApiKey(
      vectorSettings.embeddingProvider,
      providerSettings as Record<string, { apiKey?: string }>
    );
  }, [vectorSettings.embeddingProvider, providerSettings]);

  // Build pipeline config
  const pipelineConfig = useMemo(
    (): RAGPipelineConfig => ({
      embeddingConfig: {
        provider: vectorSettings.embeddingProvider,
        model: vectorSettings.embeddingModel,
      },
      embeddingApiKey: getApiKey(),
      vectorStoreConfig: {
        provider: vectorSettings.provider,
        embeddingConfig: {
          provider: vectorSettings.embeddingProvider,
          model: vectorSettings.embeddingModel,
        },
        embeddingApiKey: getApiKey(),
        chromaMode: vectorSettings.mode,
        chromaServerUrl: vectorSettings.serverUrl,
        pineconeApiKey: vectorSettings.pineconeApiKey,
        pineconeIndexName: vectorSettings.pineconeIndexName,
        pineconeNamespace: vectorSettings.pineconeNamespace,
        weaviateUrl: vectorSettings.weaviateUrl,
        weaviateApiKey: vectorSettings.weaviateApiKey,
        qdrantUrl: vectorSettings.qdrantUrl,
        qdrantApiKey: vectorSettings.qdrantApiKey,
        milvusAddress: vectorSettings.milvusAddress,
        milvusToken: vectorSettings.milvusToken,
        native: {},
      },
      hybridSearch: {
        enabled: enableHybridSearch,
        vectorWeight,
        keywordWeight,
        sparseWeight,
        lateInteractionWeight,
        enableSparseSearch,
        enableLateInteraction,
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
      adaptiveReranking: {
        enabled: vectorSettings.enableReranking,
        feedbackWeight: 0.3,
      },
      citations: {
        enabled: vectorSettings.enableCitations,
        style: vectorSettings.citationStyle,
      },
    }),
    [
      vectorSettings,
      getApiKey,
      enableHybridSearch,
      enableQueryExpansion,
      enableReranking,
      enableContextualRetrieval,
      enableSparseSearch,
      enableLateInteraction,
      vectorWeight,
      keywordWeight,
      sparseWeight,
      lateInteractionWeight,
      topK,
      similarityThreshold,
      maxContextLength,
    ]
  );

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
  const indexDocument = useCallback(
    async (
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
        ragProgress.start(1, `Indexing document: ${opts.documentId}`);

        const progressCallback = ragProgress.createProgressCallback();
        const result = await pipeline.indexDocument(content, {
          collectionName,
          documentId: opts.documentId,
          documentTitle: opts.documentTitle,
          metadata: opts.metadata,
          useContextualRetrieval: enableContextualRetrieval,
          onProgress: progressCallback,
        });

        if (result.success) {
          ragProgress.complete({ totalChunks: result.chunksCreated, successCount: 1 });
        } else {
          ragProgress.error(new Error(result.error || 'Indexing failed'));
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
        ragProgress.error(err instanceof Error ? err : new Error(message));
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
    },
    [collectionName, enableContextualRetrieval, getPipeline, ragProgress]
  );

  // Index multiple documents
  const indexDocuments = useCallback(
    async (
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

        const failures = results.filter((r) => !r.success);
        if (failures.length > 0) {
          setError(`${failures.length} documents failed to index`);
        }

        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Batch indexing failed';
        setError(message);
        return documents.map((doc) => ({
          documentId: doc.id,
          chunksCreated: 0,
          success: false,
          error: message,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [indexDocument]
  );

  // Retrieve context
  const retrieve = useCallback(
    async (query: string): Promise<RAGPipelineContext> => {
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
    },
    [collectionName, getPipeline]
  );

  // Clear collection
  const clearCollection = useCallback(async () => {
    const pipeline = getPipeline();
    await pipeline.clearCollection(collectionName);
    // Also clear in persistent storage
    if (collectionManagerRef.current) {
      collectionManagerRef.current.deleteCollection(collectionName).catch(() => {});
    }
  }, [collectionName, getPipeline]);

  // Get collection stats
  const getCollectionStats = useCallback(async () => {
    const pipeline = getPipeline();
    return pipeline.getCollectionStats(collectionName);
  }, [collectionName, getPipeline]);

  // List all collections (from persistent storage)
  const listCollections = useCallback(async (): Promise<CollectionInfo[]> => {
    if (collectionManagerRef.current) {
      return collectionManagerRef.current.listCollections();
    }
    return [];
  }, []);

  // Delete a collection (from persistent storage)
  const deleteCollection = useCallback(async (name: string): Promise<void> => {
    const pipeline = getPipeline();
    await pipeline.clearCollection(name);
    if (collectionManagerRef.current) {
      await collectionManagerRef.current.deleteCollection(name);
    }
  }, [getPipeline]);

  // Record feedback for adaptive reranking
  const recordFeedback = useCallback(
    (query: string, resultId: string, relevance: number, action: 'click' | 'use' | 'dismiss' | 'explicit' = 'explicit') => {
      const pipeline = getPipeline();
      pipeline.recordFeedback(query, resultId, relevance, action);
    },
    [getPipeline]
  );

  // Chunking utilities
  const chunkText = useCallback(
    (text: string): ChunkingResult => {
      return chunkDocument(text, {
        strategy: 'sentence',
        chunkSize: vectorSettings.chunkSize,
        chunkOverlap: vectorSettings.chunkOverlap,
      });
    },
    [vectorSettings.chunkSize, vectorSettings.chunkOverlap]
  );

  const chunkTextSmart = useCallback(
    (text: string): ChunkingResult => {
      return chunkDocumentSmart(text, {
        chunkSize: vectorSettings.chunkSize,
        chunkOverlap: vectorSettings.chunkOverlap,
      });
    },
    [vectorSettings.chunkSize, vectorSettings.chunkOverlap]
  );

  const chunkTextRecursive = useCallback(
    (text: string): ChunkingResult => {
      return chunkDocumentRecursive(text, {
        maxChunkSize: vectorSettings.chunkSize,
        overlap: vectorSettings.chunkOverlap,
      });
    },
    [vectorSettings.chunkSize, vectorSettings.chunkOverlap]
  );

  // Update configuration
  const updateConfig = useCallback(
    (config: Partial<UseRAGPipelineOptions>) => {
      const pipeline = getPipeline();
      const hasHybridUpdate =
        config.enableHybridSearch !== undefined ||
        config.vectorWeight !== undefined ||
        config.keywordWeight !== undefined ||
        config.sparseWeight !== undefined ||
        config.lateInteractionWeight !== undefined ||
        config.enableSparseSearch !== undefined ||
        config.enableLateInteraction !== undefined;
      pipeline.updateConfig({
        hybridSearch:
          hasHybridUpdate
            ? {
                enabled: config.enableHybridSearch,
                vectorWeight: config.vectorWeight,
                keywordWeight: config.keywordWeight,
                sparseWeight: config.sparseWeight,
                lateInteractionWeight: config.lateInteractionWeight,
                enableSparseSearch: config.enableSparseSearch,
                enableLateInteraction: config.enableLateInteraction,
              }
            : undefined,
        queryExpansion:
          config.enableQueryExpansion !== undefined
            ? {
                enabled: config.enableQueryExpansion,
              }
            : undefined,
        reranking:
          config.enableReranking !== undefined
            ? {
                enabled: config.enableReranking,
              }
            : undefined,
        contextualRetrieval:
          config.enableContextualRetrieval !== undefined
            ? {
                enabled: config.enableContextualRetrieval,
              }
            : undefined,
        topK: config.topK,
        similarityThreshold: config.similarityThreshold,
        maxContextLength: config.maxContextLength,
      });
    },
    [getPipeline]
  );

  return {
    isLoading,
    error,
    lastContext,
    isInitialized,
    progress: ragProgress.progress,
    progressStats: ragProgress.stats,
    isProgressActive: ragProgress.isActive,
    indexDocument,
    indexDocuments,
    retrieve,
    clearCollection,
    getCollectionStats,
    listCollections,
    deleteCollection,
    recordFeedback,
    chunkText,
    chunkTextSmart,
    chunkTextRecursive,
    updateConfig,
  };
}

export default useRAGPipeline;
