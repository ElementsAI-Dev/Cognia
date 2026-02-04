/**
 * Embeddings, chunking, and compression
 */

// Main embedding module (provider-aware embeddings)
export * from './embedding';

// Embedding utilities - only export non-conflicting items
// The core functions (embed, embedMany, cosineSimilarity) come from embedding.ts
export {
  embedBatch,
  findSimilar,
  calculateSimilarityMatrix,
  clusterBySimilarity,
  normalizeEmbedding,
  euclideanDistance,
  dotProduct,
  averageEmbeddings,
  createInMemoryEmbeddingCache,
  EMBEDDING_MODELS,
  type BatchEmbedOptions,
  type SimilarityResult,
} from './embedding-utils';

export * from './chunking';
export * from './compression';
export * from './sparse-embedding';
export * from './late-interaction';
export * from './multimodal-embedding';
export * from './quantization';
