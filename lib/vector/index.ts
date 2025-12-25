/**
 * Vector module exports
 * 
 * Supported Embedding Providers:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large)
 * - Google (text-embedding-004)
 * - Cohere (embed-english-v3.0, embed-multilingual-v3.0)
 * - Mistral (mistral-embed)
 * 
 * Supported Vector Databases:
 * - ChromaDB (embedded and server modes)
 * - Pinecone (serverless)
 * - Qdrant (local and cloud)
 */

// Embedding utilities
export * from './embedding';

// ChromaDB client (prefixed exports to avoid conflicts)
export {
  type ChromaMode,
  type ChromaConfig,
  type DocumentChunk,
  type SearchResult as ChromaSearchResult,
  type CollectionInfo as ChromaCollectionInfo,
  getChromaClient,
  resetChromaClient,
  getOrCreateCollection,
  deleteCollection as deleteChromaCollection,
  listCollections as listChromaCollections,
  addDocuments as addChromaDocuments,
  updateDocuments as updateChromaDocuments,
  deleteDocuments as deleteChromaDocuments,
  queryCollection,
  getDocuments as getChromaDocuments,
  getCollectionCount,
  peekCollection,
} from './chroma-client';

// Pinecone client
export {
  type PineconeConfig,
  type PineconeDocument,
  type PineconeSearchResult,
  type PineconeIndexInfo,
  getPineconeClient,
  resetPineconeClient,
  getPineconeIndex,
  listPineconeIndexes,
  createPineconeIndex,
  deletePineconeIndex,
  upsertDocuments as upsertPineconeDocuments,
  queryPinecone,
  deleteDocuments as deletePineconeDocuments,
  deleteAllDocuments as deleteAllPineconeDocuments,
  fetchDocuments as fetchPineconeDocuments,
  getIndexStats,
} from './pinecone-client';

// Qdrant client
export {
  type QdrantConfig,
  type QdrantDocument,
  type QdrantSearchResult,
  type QdrantCollectionInfo,
  getQdrantClient,
  resetQdrantClient,
  createQdrantCollection,
  deleteQdrantCollection,
  listQdrantCollections,
  collectionExists as qdrantCollectionExists,
  upsertQdrantDocuments,
  queryQdrant,
  deleteQdrantDocuments,
  deleteQdrantByFilter,
  getQdrantDocuments,
  getQdrantCollectionInfo,
  scrollQdrantCollection,
} from './qdrant-client';

// Unified vector store interface
export {
  type VectorStoreProvider,
  type VectorDocument,
  type VectorSearchResult,
  type VectorStoreConfig,
  type VectorCollectionInfo,
  type SearchOptions,
  type PayloadFilter,
  type CollectionExport,
  type CollectionImport,
  type IVectorStore,
  NativeVectorStore,
  ChromaVectorStore,
  PineconeVectorStore,
  QdrantVectorStore,
  createVectorStore,
  getSupportedVectorStoreProviders,
} from './store';
