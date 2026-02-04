/**
 * Plugin Vector API Implementation
 * 
 * Provides vector/RAG capabilities to plugins.
 */

import { useVectorStore } from '@/stores';
import { useSettingsStore } from '@/stores';
import {
  createVectorStore,
  type IVectorStore,
  type VectorDocument as LibVectorDocument,
} from '@/lib/vector';
import { generateEmbedding, generateEmbeddings, getEmbeddingApiKey } from '@/lib/vector/embedding';
import { createPluginSystemLogger } from '../core/logger';
import type {
  PluginVectorAPI,
  VectorDocument,
  VectorSearchOptions,
  VectorSearchResult,
  CollectionOptions,
  CollectionStats,
} from '@/types/plugin/plugin-extended';
import { nanoid } from 'nanoid';

/**
 * Create the Vector API for a plugin
 */
export function createVectorAPI(pluginId: string): PluginVectorAPI {
  const logger = createPluginSystemLogger(pluginId);
  let store: IVectorStore | null = null;

  const getStore = async (): Promise<IVectorStore> => {
    if (store) return store;

    const settings = useSettingsStore.getState();
    const vectorSettings = useVectorStore.getState().settings;
    const embeddingApiKey =
      getEmbeddingApiKey(
        vectorSettings.embeddingProvider || 'openai',
        settings.providerSettings || {}
      ) || '';

    store = createVectorStore({
      provider: vectorSettings.provider || 'native',
      embeddingConfig: {
        provider: vectorSettings.embeddingProvider || 'openai',
        model: vectorSettings.embeddingModel || 'text-embedding-3-small',
        dimensions: 1536,
      },
      embeddingApiKey,
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
    });

    return store;
  };

  const getEmbeddingConfig = () => {
    const vectorSettings = useVectorStore.getState().settings;
    return {
      provider: vectorSettings.embeddingProvider || 'openai',
      model: vectorSettings.embeddingModel || 'text-embedding-3-small',
      dimensions: 1536,
    };
  };

  const getApiKey = () => {
    const settings = useSettingsStore.getState();
    return settings.providerSettings?.openai?.apiKey;
  };

  // Prefix collection names with plugin ID to avoid conflicts
  const prefixCollection = (name: string) => `plugin_${pluginId}_${name}`;

  return {
    createCollection: async (name: string, _options?: CollectionOptions) => {
      const vs = await getStore();
      const prefixedName = prefixCollection(name);
      await vs.createCollection(prefixedName);
      logger.info(`Created collection: ${name}`);
      return prefixedName;
    },

    deleteCollection: async (name: string) => {
      const vs = await getStore();
      const prefixedName = prefixCollection(name);
      await vs.deleteCollection(prefixedName);
      logger.info(`Deleted collection: ${name}`);
    },

    listCollections: async () => {
      const vs = await getStore();
      if (vs.listCollections) {
        const all = await vs.listCollections();
        // Filter to only this plugin's collections
        const prefix = `plugin_${pluginId}_`;
        return all
          .filter(c => c.name.startsWith(prefix))
          .map(c => c.name.slice(prefix.length));
      }
      return [];
    },

    getCollectionInfo: async (name: string): Promise<CollectionStats> => {
      // Collection stats - simplified implementation
      return {
        name,
        documentCount: 0,
        dimensions: 1536,
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
    },

    addDocuments: async (collection: string, docs: VectorDocument[]) => {
      const vs = await getStore();
      const prefixedCollection = prefixCollection(collection);

      const libDocs: LibVectorDocument[] = docs.map(doc => ({
        id: doc.id || nanoid(),
        content: doc.content,
        metadata: doc.metadata as Record<string, unknown>,
        embedding: doc.embedding,
      }));

      await vs.addDocuments(prefixedCollection, libDocs);
      logger.info(`Added ${docs.length} documents to ${collection}`);
      
      return libDocs.map(d => d.id);
    },

    updateDocuments: async (collection: string, docs: VectorDocument[]) => {
      const vs = await getStore();
      const prefixedCollection = prefixCollection(collection);

      const libDocs: LibVectorDocument[] = docs.map(doc => ({
        id: doc.id || nanoid(),
        content: doc.content,
        metadata: doc.metadata as Record<string, unknown>,
        embedding: doc.embedding,
      }));

      if (vs.updateDocuments) {
        await vs.updateDocuments(prefixedCollection, libDocs);
      } else {
        // Fallback: delete and re-add
        const ids = libDocs.map(d => d.id);
        await vs.deleteDocuments(prefixedCollection, ids);
        await vs.addDocuments(prefixedCollection, libDocs);
      }

      logger.info(`Updated ${docs.length} documents in ${collection}`);
    },

    deleteDocuments: async (collection: string, ids: string[]) => {
      const vs = await getStore();
      const prefixedCollection = prefixCollection(collection);
      await vs.deleteDocuments(prefixedCollection, ids);
      logger.info(`Deleted ${ids.length} documents from ${collection}`);
    },

    search: async (collection: string, query: string, options?: VectorSearchOptions): Promise<VectorSearchResult[]> => {
      const vs = await getStore();
      const prefixedCollection = prefixCollection(collection);

      const results = await vs.searchDocuments(prefixedCollection, query, {
        topK: options?.topK || 5,
        threshold: options?.threshold,
      });

      return results.map(r => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata as Record<string, unknown>,
        score: r.score,
      }));
    },

    searchByEmbedding: async (_collection: string, _embedding: number[], _options?: VectorSearchOptions): Promise<VectorSearchResult[]> => {
      // searchByEmbedding requires additional implementation in the vector store
      logger.warn('searchByEmbedding not yet supported');
      return [];
    },

    embed: async (text: string): Promise<number[]> => {
      const config = getEmbeddingConfig();
      const apiKey = getApiKey();
      const result = await generateEmbedding(text, config, apiKey || '');
      return result.embedding;
    },

    embedBatch: async (texts: string[]): Promise<number[][]> => {
      const config = getEmbeddingConfig();
      const apiKey = getApiKey();
      const result = await generateEmbeddings(texts, config, apiKey || '');
      return result.embeddings;
    },

    getDocumentCount: async (_collection: string): Promise<number> => {
      // Document count - would require collection-specific stats
      return 0;
    },

    clearCollection: async (collection: string) => {
      const vs = await getStore();
      const prefixedCollection = prefixCollection(collection);
      
      if (vs.deleteAllDocuments) {
        await vs.deleteAllDocuments(prefixedCollection);
      }

      logger.info(`Cleared collection: ${collection}`);
    },
  };
}
