/**
 * Enhanced RAG Module
 * 
 * Combines all advanced RAG components:
 * - Hybrid search (BM25 + Vector)
 * - Reranking
 * - Contextual retrieval
 * - Query expansion
 */

// Hybrid Search
export {
  type BM25Config,
  type HybridSearchConfig,
  type SearchDocument,
  type HybridSearchResult,
  BM25Index,
  HybridSearchEngine,
  reciprocalRankFusion,
  normalizeScores,
  deduplicateResults,
  createHybridSearchEngine,
} from './hybrid-search';

// Reranking
export {
  type RerankDocument,
  type RerankResult,
  type RerankConfig,
  rerankWithLLM,
  rerankWithCohere,
  rerankWithHeuristics,
  rerankWithMMR,
  rerank,
  filterByRelevance,
  boostByMetadata,
  boostByRecency,
} from './reranker';

// Contextual Retrieval
export {
  type ContextualChunk,
  type ContextGenerationConfig,
  type ContextCache,
  createContextCache,
  generateChunkContext,
  generateDocumentSummary,
  addContextToChunks,
  addLightweightContext,
  extractKeyEntities,
  enrichChunkWithEntities,
  PROMPT_TEMPLATES,
} from './contextual-retrieval';

// Query Expansion
export {
  type QueryExpansionConfig,
  type ExpandedQuery,
  generateQueryVariants,
  generateHypotheticalAnswer,
  rewriteQuery,
  extractKeywords,
  generateSynonyms,
  expandWithSynonyms,
  expandQuery,
  decomposeQuery,
  generateStepBackQuery,
  mergeQueryResults,
} from './query-expansion';

// RAG Pipeline
export {
  type RAGPipelineConfig,
  type RAGPipelineContext,
  type IndexingOptions,
  RAGPipeline,
  createRAGPipeline,
} from './rag-pipeline';
