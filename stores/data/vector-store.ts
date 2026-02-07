/**
 * Vector Store - manages vector database state and operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EmbeddingModelConfig, EmbeddingProvider } from '@/lib/vector/embedding';
import { DEFAULT_EMBEDDING_MODELS } from '@/lib/vector/embedding';

export type VectorDBMode = 'embedded' | 'server';
export type VectorDBProvider = 'chroma' | 'native' | 'pinecone' | 'qdrant' | 'milvus' | 'weaviate';

export interface VectorCollection {
  id: string;
  name: string;
  description?: string;
  documentCount: number;
  embeddingModel: string;
  embeddingProvider: EmbeddingProvider;
  createdAt: Date;
  updatedAt: Date;
}

export interface VectorDocument {
  id: string;
  collectionId: string;
  content: string;
  metadata?: Record<string, string | number | boolean>;
  chunkIndex?: number;
  sourceFile?: string;
  createdAt: Date;
}

export interface VectorSettings {
  provider: VectorDBProvider;
  mode: VectorDBMode;
  serverUrl: string;
  pineconeApiKey: string;
  pineconeIndexName: string;
  pineconeNamespace: string;
  weaviateUrl: string;
  weaviateApiKey: string;
  qdrantUrl: string;
  qdrantApiKey: string;
  milvusAddress: string;
  milvusToken: string;
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  autoEmbed: boolean;
  /** Default collection name for RAG searches when not specified */
  defaultCollectionName: string;
  setupCompleted: boolean;

  // RAG-in-Chat settings
  /** Enable automatic RAG context injection into chat system prompts */
  enableRAGInChat: boolean;
  /** Number of top results to retrieve for RAG context */
  ragTopK: number;
  /** Minimum similarity threshold for RAG results (0-1) */
  ragSimilarityThreshold: number;
  /** Maximum context length in characters for RAG injection */
  ragMaxContextLength: number;

  // Advanced RAG settings
  /** Enable hybrid search (vector + BM25 keyword) */
  enableHybridSearch: boolean;
  /** Vector search weight for hybrid search (0-1) */
  vectorWeight: number;
  /** Keyword search weight for hybrid search (0-1) */
  keywordWeight: number;
  /** Enable reranking of search results */
  enableReranking: boolean;
  /** Enable query expansion for better recall */
  enableQueryExpansion: boolean;
  /** Enable citation formatting in RAG responses */
  enableCitations: boolean;
  /** Citation style */
  citationStyle: 'simple' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee';
}

const DEFAULT_SETTINGS: VectorSettings = {
  provider: 'chroma',
  mode: 'embedded',
  serverUrl: 'http://localhost:8000',
  pineconeApiKey: '',
  pineconeIndexName: '',
  pineconeNamespace: '',
  weaviateUrl: 'http://localhost:8080',
  weaviateApiKey: '',
  qdrantUrl: 'http://localhost:6333',
  qdrantApiKey: '',
  milvusAddress: 'http://localhost:19530',
  milvusToken: '',
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small',
  chunkSize: 1000,
  chunkOverlap: 200,
  autoEmbed: true,
  defaultCollectionName: 'default',
  setupCompleted: false,

  // RAG-in-Chat defaults
  enableRAGInChat: false,
  ragTopK: 5,
  ragSimilarityThreshold: 0.3,
  ragMaxContextLength: 4000,

  // Advanced RAG defaults
  enableHybridSearch: false,
  vectorWeight: 0.7,
  keywordWeight: 0.3,
  enableReranking: false,
  enableQueryExpansion: false,
  enableCitations: false,
  citationStyle: 'simple',
};

interface VectorState {
  // State
  collections: VectorCollection[];
  documents: Record<string, VectorDocument[]>; // collectionId -> documents
  settings: VectorSettings;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Settings
  updateSettings: (settings: Partial<VectorSettings>) => void;
  getEmbeddingConfig: () => EmbeddingModelConfig;

  // Collection operations
  addCollection: (
    collection: Omit<VectorCollection, 'id' | 'createdAt' | 'updatedAt' | 'documentCount'>
  ) => VectorCollection;
  updateCollection: (id: string, updates: Partial<VectorCollection>) => void;
  deleteCollection: (id: string) => void;
  getCollection: (id: string) => VectorCollection | undefined;
  getCollectionByName: (name: string) => VectorCollection | undefined;
  getCollectionNames: () => string[];

  // Document operations
  addDocuments: (
    collectionId: string,
    docs: Omit<VectorDocument, 'id' | 'collectionId' | 'createdAt'>[]
  ) => void;
  removeDocuments: (collectionId: string, docIds: string[]) => void;
  getDocuments: (collectionId: string) => VectorDocument[];
  clearDocuments: (collectionId: string) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useVectorStore = create<VectorState>()(
  persist(
    (set, get) => ({
      collections: [],
      documents: {},
      settings: DEFAULT_SETTINGS,
      isInitialized: false,
      isLoading: false,
      error: null,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      getEmbeddingConfig: () => {
        const { settings } = get();
        return {
          provider: settings.embeddingProvider,
          model: settings.embeddingModel,
          dimensions: DEFAULT_EMBEDDING_MODELS[settings.embeddingProvider]?.dimensions,
        };
      },

      addCollection: (input) => {
        const now = new Date();
        const collection: VectorCollection = {
          id: crypto.randomUUID(),
          name: input.name,
          description: input.description,
          documentCount: 0,
          embeddingModel: input.embeddingModel,
          embeddingProvider: input.embeddingProvider,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          collections: [...state.collections, collection],
          documents: { ...state.documents, [collection.id]: [] },
        }));

        return collection;
      },

      updateCollection: (id, updates) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
          ),
        })),

      deleteCollection: (id) =>
        set((state) => {
          const { [id]: _removed, ...restDocs } = state.documents;
          return {
            collections: state.collections.filter((c) => c.id !== id),
            documents: restDocs,
          };
        }),

      getCollection: (id) => {
        return get().collections.find((c) => c.id === id);
      },

      getCollectionByName: (name) => {
        return get().collections.find((c) => c.name === name);
      },

      getCollectionNames: () => {
        return get().collections.map((c) => c.name);
      },

      addDocuments: (collectionId, docs) => {
        const now = new Date();
        const newDocs: VectorDocument[] = docs.map((doc) => ({
          ...doc,
          id: crypto.randomUUID(),
          collectionId,
          createdAt: now,
        }));

        set((state) => {
          const existingDocs = state.documents[collectionId] || [];
          const updatedDocs = [...existingDocs, ...newDocs];

          return {
            documents: {
              ...state.documents,
              [collectionId]: updatedDocs,
            },
            collections: state.collections.map((c) =>
              c.id === collectionId
                ? { ...c, documentCount: updatedDocs.length, updatedAt: now }
                : c
            ),
          };
        });
      },

      removeDocuments: (collectionId, docIds) =>
        set((state) => {
          const existingDocs = state.documents[collectionId] || [];
          const updatedDocs = existingDocs.filter((d) => !docIds.includes(d.id));

          return {
            documents: {
              ...state.documents,
              [collectionId]: updatedDocs,
            },
            collections: state.collections.map((c) =>
              c.id === collectionId
                ? { ...c, documentCount: updatedDocs.length, updatedAt: new Date() }
                : c
            ),
          };
        }),

      getDocuments: (collectionId) => {
        return get().documents[collectionId] || [];
      },

      clearDocuments: (collectionId) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [collectionId]: [],
          },
          collections: state.collections.map((c) =>
            c.id === collectionId ? { ...c, documentCount: 0, updatedAt: new Date() } : c
          ),
        })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      reset: () =>
        set({
          collections: [],
          documents: {},
          settings: DEFAULT_SETTINGS,
          isInitialized: false,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'cognia-vector',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        collections: state.collections.map((c) => ({
          ...c,
          createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
          updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
        })),
        documents: Object.fromEntries(
          Object.entries(state.documents).map(([key, docs]) => [
            key,
            docs.map((d) => ({
              ...d,
              createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
            })),
          ])
        ),
        settings: state.settings,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.collections) {
          state.collections = state.collections.map((c) => ({
            ...c,
            createdAt: new Date(c.createdAt),
            updatedAt: new Date(c.updatedAt),
          }));
        }
        if (state?.documents) {
          state.documents = Object.fromEntries(
            Object.entries(state.documents).map(([key, docs]) => [
              key,
              docs.map((d) => ({
                ...d,
                createdAt: new Date(d.createdAt),
              })),
            ])
          );
        }
      },
    }
  )
);

export default useVectorStore;
