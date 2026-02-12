'use client';

/**
 * useVectorDB - Hook for vector database operations
 * Provides easy access to ChromaDB functionality
 */

import { useCallback, useMemo, useState } from 'react';
import { useVectorStore } from '@/stores';
import { useSettingsStore } from '@/stores';
import { useDocumentStore } from '@/stores';
import { getPluginEventHooks } from '@/lib/plugin';
import {
  createVectorStore,
  type IVectorStore,
  type SearchOptions,
  type SearchResponse,
  type ScrollOptions,
  type ScrollResponse,
  type VectorDocument,
  type VectorSearchResult,
  type VectorStoreConfig,
  type VectorCollectionInfo,
  type VectorStats,
  type PayloadFilter,
  type CollectionExport,
  type CollectionImport,
} from '@/lib/vector';
import {
  generateEmbedding,
  generateEmbeddings,
  type EmbeddingModelConfig,
  type EmbeddingProvider,
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
  createCollection: (
    name: string,
    options?: { description?: string; embeddingModel?: string; embeddingProvider?: string }
  ) => Promise<void>;
  deleteCollection: (name: string) => Promise<void>;
  renameCollection: (oldName: string, newName: string) => Promise<void>;
  truncateCollection: (name: string) => Promise<void>;
  exportCollection: (name: string) => Promise<CollectionExport>;
  importCollection: (data: CollectionImport, overwrite?: boolean) => Promise<void>;
  listAllCollections: () => Promise<VectorCollectionInfo[]>;
  getCollectionInfo: (name: string) => Promise<VectorCollectionInfo>;
  getStats: () => Promise<VectorStats | null>;

  // Document operations
  addDocument: (
    content: string,
    metadata?: Record<string, string | number | boolean>
  ) => Promise<string>;
  addDocumentBatch: (
    documents: { content: string; metadata?: Record<string, string | number | boolean> }[]
  ) => Promise<string[]>;
  removeDocuments: (ids: string[]) => Promise<void>;
  removeAllDocuments: () => Promise<number>;

  // Search
  search: (query: string, topK?: number) => Promise<VectorSearchResult[]>;
  searchWithThreshold: (
    query: string,
    threshold: number,
    topK?: number
  ) => Promise<VectorSearchResult[]>;
  searchWithOptions: (query: string, options?: SearchOptions) => Promise<VectorSearchResult[]>;
  searchWithTotal: (query: string, options?: SearchOptions) => Promise<SearchResponse>;
  searchWithFilters: (
    query: string,
    filters: PayloadFilter[],
    options?: Omit<SearchOptions, 'filters'>
  ) => Promise<VectorSearchResult[]>;
  scrollDocuments: (options?: ScrollOptions) => Promise<ScrollResponse>;
  peek: (topK?: number) => Promise<VectorSearchResult[]>;

  // Embedding
  embed: (text: string) => Promise<number[]>;
  embedBatch: (texts: string[]) => Promise<number[][]>;

  // Utils
  getDocumentCount: () => Promise<number>;
  clearCollection: () => Promise<void>;

  // Document indexing status
  markAsIndexed: (id: string, collectionId: string) => void;
  markAsNotIndexed: (id: string) => void;
}

export function useVectorDB(options: UseVectorDBOptions = {}): UseVectorDBReturn {
  const { collectionName = 'default', autoInitialize = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const vectorStore = useVectorStore();
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const markAsIndexed = useDocumentStore((s) => s.markAsIndexed);
  const markAsNotIndexed = useDocumentStore((s) => s.markAsNotIndexed);
  const embeddingProvider = vectorStore.settings.embeddingProvider;

  // Get API key for embeddings
  const getApiKey = useCallback((): string => {
    return providerSettings[embeddingProvider]?.apiKey || '';
  }, [embeddingProvider, providerSettings]);

  // Get embedding config
  const getEmbeddingConfig = useCallback((): EmbeddingModelConfig => {
    return vectorStore.getEmbeddingConfig();
  }, [vectorStore]);

  // Build vector store config
  const getVectorStoreConfig = useCallback((): VectorStoreConfig => {
    const settings = vectorStore.settings;
    return {
      provider: settings.provider,
      embeddingConfig: getEmbeddingConfig(),
      embeddingApiKey: getApiKey(),
      chromaMode: settings.mode,
      chromaServerUrl: settings.serverUrl,
      pineconeApiKey: settings.pineconeApiKey,
      pineconeIndexName: settings.pineconeIndexName,
      pineconeNamespace: settings.pineconeNamespace,
      weaviateUrl: settings.weaviateUrl,
      weaviateApiKey: settings.weaviateApiKey,
      qdrantUrl: settings.qdrantUrl,
      qdrantApiKey: settings.qdrantApiKey,
      milvusAddress: settings.milvusAddress,
      milvusToken: settings.milvusToken,
      native: {},
    };
  }, [vectorStore.settings, getEmbeddingConfig, getApiKey]);

  const store: IVectorStore | null = useMemo(() => {
    try {
      return createVectorStore(getVectorStoreConfig());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vector store');
      return null;
    }
  }, [getVectorStoreConfig]);

  // Create collection
  const createCollection = useCallback(
    async (
      name: string,
      options?: { description?: string; embeddingModel?: string; embeddingProvider?: string }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        await store.createCollection(name, {
          description: options?.description,
          embeddingModel: options?.embeddingModel || getEmbeddingConfig().model,
          embeddingProvider: options?.embeddingProvider || getEmbeddingConfig().provider,
        });
        vectorStore.addCollection({
          name,
          description: options?.description,
          embeddingModel: options?.embeddingModel || getEmbeddingConfig().model,
          embeddingProvider: (options?.embeddingProvider ||
            getEmbeddingConfig().provider) as EmbeddingProvider,
        });
        setIsInitialized(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create collection');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getEmbeddingConfig, store, vectorStore]
  );

  // Delete collection
  const deleteCollectionFn = useCallback(
    async (name: string) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        await store.deleteCollection(name);
        const collection = vectorStore.collections.find((c) => c.name === name);
        if (collection) {
          vectorStore.deleteCollection(collection.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete collection');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store, vectorStore]
  );

  // Rename collection
  const renameCollection = useCallback(
    async (oldName: string, newName: string) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store || !store.renameCollection)
          throw new Error('Vector store does not support renaming');
        await store.renameCollection(oldName, newName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rename collection');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  // Truncate collection
  const truncateCollection = useCallback(
    async (name: string) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store || !store.truncateCollection)
          throw new Error('Vector store does not support truncating');
        await store.truncateCollection(name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to truncate collection');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  // Export collection
  const exportCollection = useCallback(
    async (name: string): Promise<CollectionExport> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store || !store.exportCollection)
          throw new Error('Vector store does not support exporting');
        return await store.exportCollection(name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export collection');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  // Import collection
  const importCollection = useCallback(
    async (data: CollectionImport, overwrite?: boolean) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store || !store.importCollection)
          throw new Error('Vector store does not support importing');
        await store.importCollection(data, overwrite);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import collection');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  // Get collection info
  const getCollectionInfo = useCallback(
    async (name: string): Promise<VectorCollectionInfo> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        return await store.getCollectionInfo(name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get collection info');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  // List all collections
  const listAllCollections = useCallback(async (): Promise<VectorCollectionInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!store) throw new Error('Vector store not available');
      return await store.listCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list collections');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Add single document
  const addDocument = useCallback(
    async (
      content: string,
      metadata?: Record<string, string | number | boolean>
    ): Promise<string> => {
      setIsLoading(true);
      setError(null);
      try {
        const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const doc: VectorDocument = {
          id: docId,
          content,
          metadata,
        };

        if (!store) throw new Error('Vector store not available');
        await store.createCollection(collectionName);
        await store.addDocuments(collectionName, [doc]);

        vectorStore.addDocuments(collectionName, [
          {
            content,
            metadata,
          },
        ]);

        getPluginEventHooks().dispatchDocumentsIndexed(collectionName, 1);

        // Mark document as indexed in document store
        markAsIndexed(docId, collectionName);

        return docId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add document');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store, vectorStore, markAsIndexed]
  );

  // Add batch of documents
  const addDocumentBatch = useCallback(
    async (
      documents: { content: string; metadata?: Record<string, string | number | boolean> }[]
    ): Promise<string[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const docs: VectorDocument[] = documents.map((doc, index) => ({
          id: `doc-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
          content: doc.content,
          metadata: doc.metadata,
        }));

        if (!store) throw new Error('Vector store not available');
        await store.createCollection(collectionName);
        await store.addDocuments(collectionName, docs);

        vectorStore.addDocuments(
          collectionName,
          documents.map((d) => ({
            content: d.content,
            metadata: d.metadata,
          }))
        );

        getPluginEventHooks().dispatchDocumentsIndexed(collectionName, docs.length);

        // Mark all documents as indexed in document store
        for (const doc of docs) {
          markAsIndexed(doc.id, collectionName);
        }

        return docs.map((d) => d.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add documents');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store, vectorStore, markAsIndexed]
  );

  // Remove documents
  const removeDocuments = useCallback(
    async (ids: string[]) => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        await store.deleteDocuments(collectionName, ids);
        // Mark documents as not indexed in document store
        for (const id of ids) {
          markAsNotIndexed(id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove documents');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store, markAsNotIndexed]
  );

  // Search
  const search = useCallback(
    async (query: string, topK: number = 5): Promise<VectorSearchResult[]> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        await store.createCollection(collectionName);
        const opts: SearchOptions = { topK };
        const results = await store.searchDocuments(collectionName, query, opts);
        getPluginEventHooks().dispatchVectorSearch(collectionName, query, results.length);
        return results;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store]
  );

  const searchWithOptions = useCallback(
    async (query: string, options: SearchOptions = {}): Promise<VectorSearchResult[]> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        await store.createCollection(collectionName);
        return await store.searchDocuments(collectionName, query, options);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store]
  );

  // Search with threshold
  const searchWithThreshold = useCallback(
    async (query: string, threshold: number, topK: number = 10): Promise<VectorSearchResult[]> => {
      const results = await search(query, topK);
      return results.filter((r) => r.score >= threshold);
    },
    [search]
  );

  // Search with filters
  const searchWithFilters = useCallback(
    async (
      query: string,
      filters: PayloadFilter[],
      options: Omit<SearchOptions, 'filters'> = {}
    ): Promise<VectorSearchResult[]> => {
      const combinedOptions: SearchOptions = { ...options, filters };
      return searchWithOptions(query, combinedOptions);
    },
    [searchWithOptions]
  );

  const peek = useCallback(
    async (topK: number = 10): Promise<VectorSearchResult[]> => {
      return searchWithOptions('', { topK });
    },
    [searchWithOptions]
  );

  // Embed single text
  const embed = useCallback(
    async (text: string): Promise<number[]> => {
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
    },
    [getEmbeddingConfig, getApiKey]
  );

  // Embed batch
  const embedBatch = useCallback(
    async (texts: string[]): Promise<number[][]> => {
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
    },
    [getEmbeddingConfig, getApiKey]
  );

  // Get document count
  const getDocumentCount = useCallback(async (): Promise<number> => {
    try {
      if (!store) throw new Error('Vector store not available');
      const info = await store.getCollectionInfo(collectionName);
      return info.documentCount;
    } catch {
      return 0;
    }
  }, [collectionName, store]);

  // Clear collection
  const clearCollection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!store) throw new Error('Vector store not available');
      await store.deleteCollection(collectionName);
      await store.createCollection(collectionName);
      const collection = vectorStore.collections.find((c) => c.name === collectionName);
      if (collection) {
        vectorStore.clearDocuments(collection.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear collection');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, store, vectorStore]);

  // Remove all documents (keeps collection)
  const removeAllDocuments = useCallback(async (): Promise<number> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!store) throw new Error('Vector store not available');
      if (!store.deleteAllDocuments) {
        throw new Error('Vector store does not support deleteAllDocuments');
      }
      const count = await store.deleteAllDocuments(collectionName);
      const collection = vectorStore.collections.find((c) => c.name === collectionName);
      if (collection) {
        vectorStore.clearDocuments(collection.id);
      }
      return count;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove all documents');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [collectionName, store, vectorStore]);

  // Get stats
  const getStats = useCallback(async (): Promise<VectorStats | null> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!store) throw new Error('Vector store not available');
      if (!store.getStats) {
        return null;
      }
      return await store.getStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get stats');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  // Search with total count
  const searchWithTotal = useCallback(
    async (query: string, options: SearchOptions = {}): Promise<SearchResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        await store.createCollection(collectionName);
        if (!store.searchDocumentsWithTotal) {
          // Fallback: use regular search
          const results = await store.searchDocuments(collectionName, query, options);
          return {
            results,
            total: results.length,
            offset: options.offset || 0,
            limit: options.limit || options.topK || 5,
          };
        }
        return await store.searchDocumentsWithTotal(collectionName, query, options);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store]
  );

  // Scroll documents
  const scrollDocuments = useCallback(
    async (options: ScrollOptions = {}): Promise<ScrollResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        if (!store) throw new Error('Vector store not available');
        if (!store.scrollDocuments) {
          throw new Error('Vector store does not support scrollDocuments');
        }
        return await store.scrollDocuments(collectionName, options);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scroll failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [collectionName, store]
  );

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
    renameCollection,
    truncateCollection,
    exportCollection,
    importCollection,
    listAllCollections,
    getCollectionInfo,
    getStats,
    addDocument,
    addDocumentBatch,
    removeDocuments,
    removeAllDocuments,
    search,
    searchWithThreshold,
    searchWithOptions,
    searchWithTotal,
    searchWithFilters,
    scrollDocuments,
    peek,
    embed,
    embedBatch,
    getDocumentCount,
    clearCollection,

    // Document indexing status
    markAsIndexed,
    markAsNotIndexed,
  };
}
