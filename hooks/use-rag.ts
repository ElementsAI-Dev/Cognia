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
import { chunkDocument, type ChunkingOptions, type ChunkingResult } from '@/lib/ai/chunking';

export interface UseRAGOptions {
  collectionName?: string;
  topK?: number;
  similarityThreshold?: number;
  maxContextLength?: number;
  chunkingStrategy?: 'fixed' | 'sentence' | 'paragraph';
  chunkSize?: number;
  chunkOverlap?: number;
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
  const buildRAGConfig = useCallback((overrides?: Partial<UseRAGOptions>): RAGConfig => {
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
  }, [
    options,
    vectorSettings,
    getApiKey,
    chunkingStrategy,
    chunkSize,
    chunkOverlap,
    topK,
    similarityThreshold,
    maxContextLength,
  ]);

  // Index single document
  const indexSingleDocument = useCallback(async (doc: RAGDocument): Promise<IndexingResult> => {
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
  }, [collectionName, buildRAGConfig]);

  // Index multiple documents
  const indexMultipleDocuments = useCallback(async (docs: RAGDocument[]): Promise<IndexingResult[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const config = buildRAGConfig();
      const results = await indexDocuments(collectionName, docs, config);
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        setError(`${failures.length} documents failed to index`);
      }
      return results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch indexing failed';
      setError(message);
      return docs.map(doc => ({
        documentId: doc.id,
        chunksCreated: 0,
        success: false,
        error: message,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, buildRAGConfig]);

  // Index plain text
  const indexText = useCallback(async (
    id: string,
    text: string,
    title?: string
  ): Promise<IndexingResult> => {
    return indexSingleDocument({
      id,
      content: text,
      title,
    });
  }, [indexSingleDocument]);

  // Retrieve context
  const retrieve = useCallback(async (query: string): Promise<RAGContext> => {
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
  }, [collectionName, buildRAGConfig]);

  // Retrieve with custom options
  const retrieveWithOptions = useCallback(async (
    query: string,
    overrides: Partial<UseRAGOptions>
  ): Promise<RAGContext> => {
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
  }, [collectionName, buildRAGConfig]);

  // Generate RAG-enhanced prompt
  const generatePrompt = useCallback(async (
    query: string,
    systemPrompt?: string
  ): Promise<string> => {
    const context = await retrieve(query);
    return createRAGPrompt(query, context, systemPrompt);
  }, [retrieve]);

  // Generate prompt with existing context
  const generatePromptWithContext = useCallback((
    query: string,
    context: RAGContext,
    systemPrompt?: string
  ): string => {
    return createRAGPrompt(query, context, systemPrompt);
  }, []);

  // Chunk text utility
  const chunkText = useCallback((
    text: string,
    chunkOptions?: Partial<ChunkingOptions>
  ): ChunkingResult => {
    return chunkDocument(text, {
      strategy: chunkingStrategy,
      chunkSize,
      chunkOverlap,
      ...chunkOptions,
    });
  }, [chunkingStrategy, chunkSize, chunkOverlap]);

  // Estimate chunks
  const estimateChunks = useCallback((textLength: number): number => {
    if (textLength <= chunkSize) return 1;
    const effectiveChunkSize = chunkSize - chunkOverlap;
    return Math.ceil((textLength - chunkOverlap) / effectiveChunkSize);
  }, [chunkSize, chunkOverlap]);

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
  };
}

export default useRAG;
