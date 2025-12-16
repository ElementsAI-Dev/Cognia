'use client';

/**
 * useVectorDB - Hook for vector database operations
 * Provides easy access to ChromaDB functionality
 */

import { useCallback, useState } from 'react';
import { useVectorStore } from '@/stores';
import { useSettingsStore } from '@/stores';
import {
  getChromaClient,
  getOrCreateCollection,
  addDocuments,
  queryCollection,
  deleteDocuments,
  listCollections,
  type ChromaConfig,
  type DocumentChunk,
  type SearchResult,
} from '@/lib/vector/chroma-client';
import {
  generateEmbedding,
  generateEmbeddings,
  type EmbeddingModelConfig,
} from '@/lib/vector/embedding';

export interface UseVectorDBOptions {
  collectionName?: string;
  autoInitialize?: boolean;
}

export interface UseVectorDBReturn {
  // State
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;

  // Collection operations
  createCollection: (name: string, description?: string) => Promise<void>;
  deleteCollection: (name: string) => Promise<void>;
  listAllCollections: () => Promise<{ name: string; count: number }[]>;

  // Document operations
  addDocument: (content: string, metadata?: Record<string, string | number | boolean>) => Promise<string>;
  addDocumentBatch: (documents: { content: string; metadata?: Record<string, string | number | boolean> }[]) => Promise<string[]>;
  removeDocuments: (ids: string[]) => Promise<void>;

  // Search
  search: (query: string, topK?: number) => Promise<SearchResult[]>;
  searchWithThreshold: (query: string, threshold: number, topK?: number) => Promise<SearchResult[]>;

  // Embedding
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;

  // Utils
  getDocumentCount: () => Promise<number>;
  clearCollection: () => Promise<void>;
}

export function useVectorDB(options: UseVectorDBOptions = {}): UseVectorDBReturn {
  const { collectionName = 'default', autoInitialize = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const vectorStore = useVectorStore();
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Get API key for embeddings
  const getApiKey = useCallback((): string => {
    const openaiKey = providerSettings.openai?.apiKey;
    const googleKey = providerSettings.google?.apiKey;
    return openaiKey || googleKey || '';
  }, [providerSettings]);

  // Get embedding config
  const getEmbeddingConfig = useCallback((): EmbeddingModelConfig => {
    return vectorStore.getEmbeddingConfig();
  }, [vectorStore]);

  // Get ChromaDB config
  const getChromaConfig = useCallback((): ChromaConfig => {
    const settings = vectorStore.settings;
    return {
      mode: settings.mode,
      serverUrl: settings.serverUrl,
      embeddingConfig: getEmbeddingConfig(),
      apiKey: getApiKey(),
    };
  }, [vectorStore.settings, getEmbeddingConfig, getApiKey]);

  // Create collection
  const createCollection = useCallback(async (name: string, description?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getChromaClient(getChromaConfig());
      await getOrCreateCollection(client, name);
      vectorStore.addCollection({
        name,
        description,
        embeddingModel: getEmbeddingConfig().model,
        embeddingProvider: getEmbeddingConfig().provider,
      });
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create collection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getChromaConfig, getEmbeddingConfig, vectorStore]);

  // Delete collection
  const deleteCollectionFn = useCallback(async (name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getChromaClient(getChromaConfig());
      await client.deleteCollection({ name });
      const collection = vectorStore.collections.find(c => c.name === name);
      if (collection) {
        vectorStore.deleteCollection(collection.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete collection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getChromaConfig, vectorStore]);

  // List all collections
  const listAllCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getChromaClient(getChromaConfig());
      return await listCollections(client);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list collections');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getChromaConfig]);

  // Add single document
  const addDocument = useCallback(async (
    content: string,
    metadata?: Record<string, string | number | boolean>
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getChromaConfig();
      const client = getChromaClient(config);
      const collection = await getOrCreateCollection(client, collectionName);

      const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const doc: DocumentChunk = {
        id: docId,
        content,
        metadata,
      };

      await addDocuments(collection, [doc], config);

      vectorStore.addDocuments(collectionName, [{
        content,
        metadata,
      }]);

      return docId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add document');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, getChromaConfig, vectorStore]);

  // Add batch of documents
  const addDocumentBatch = useCallback(async (
    documents: { content: string; metadata?: Record<string, string | number | boolean> }[]
  ): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getChromaConfig();
      const client = getChromaClient(config);
      const collection = await getOrCreateCollection(client, collectionName);

      const docs: DocumentChunk[] = documents.map((doc, index) => ({
        id: `doc-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
        content: doc.content,
        metadata: doc.metadata,
      }));

      await addDocuments(collection, docs, config);

      vectorStore.addDocuments(collectionName, documents.map(d => ({
        content: d.content,
        metadata: d.metadata,
      })));

      return docs.map(d => d.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add documents');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, getChromaConfig, vectorStore]);

  // Remove documents
  const removeDocuments = useCallback(async (ids: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getChromaConfig();
      const client = getChromaClient(config);
      const collection = await getOrCreateCollection(client, collectionName);
      await deleteDocuments(collection, ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove documents');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, getChromaConfig]);

  // Search
  const search = useCallback(async (query: string, topK: number = 5): Promise<SearchResult[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getChromaConfig();
      const client = getChromaClient(config);
      const collection = await getOrCreateCollection(client, collectionName);
      return await queryCollection(collection, query, config, { nResults: topK });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, getChromaConfig]);

  // Search with threshold
  const searchWithThreshold = useCallback(async (
    query: string,
    threshold: number,
    topK: number = 10
  ): Promise<SearchResult[]> => {
    const results = await search(query, topK);
    return results.filter(r => r.similarity >= threshold);
  }, [search]);

  // Embed single text
  const embed = useCallback(async (text: string): Promise<number[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateEmbedding(text, getEmbeddingConfig(), getApiKey());
      return result.embedding;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Embedding failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getEmbeddingConfig, getApiKey]);

  // Embed batch
  const embedBatch = useCallback(async (texts: string[]): Promise<number[][]> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateEmbeddings(texts, getEmbeddingConfig(), getApiKey());
      return result.embeddings;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch embedding failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getEmbeddingConfig, getApiKey]);

  // Get document count
  const getDocumentCount = useCallback(async (): Promise<number> => {
    try {
      const config = getChromaConfig();
      const client = getChromaClient(config);
      const collection = await getOrCreateCollection(client, collectionName);
      return await collection.count();
    } catch {
      return 0;
    }
  }, [collectionName, getChromaConfig]);

  // Clear collection
  const clearCollection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config = getChromaConfig();
      const client = getChromaClient(config);
      await client.deleteCollection({ name: collectionName });
      await getOrCreateCollection(client, collectionName);
      const collection = vectorStore.collections.find(c => c.name === collectionName);
      if (collection) {
        vectorStore.clearDocuments(collection.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear collection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, getChromaConfig, vectorStore]);

  // Auto-initialize if needed
  if (autoInitialize && !isInitialized && !isLoading && !error) {
    createCollection(collectionName).catch(() => {
      // Initialization error handled in createCollection
    });
  }

  return {
    isLoading,
    error,
    isInitialized,
    createCollection,
    deleteCollection: deleteCollectionFn,
    listAllCollections,
    addDocument,
    addDocumentBatch,
    removeDocuments,
    search,
    searchWithThreshold,
    embed,
    embedBatch,
    getDocumentCount,
    clearCollection,
  };
}

export default useVectorDB;
