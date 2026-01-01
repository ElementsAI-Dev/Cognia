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

// Find Relevant Content API
export {
  type DocumentWithEmbedding,
  type RelevantContent,
  type FindRelevantOptions,
  findRelevantContent,
  findRelevantContentWithEmbedding,
  batchFindRelevantContent,
  findMostRelevant,
  hasRelevantContent,
  groupBySimilarity,
} from './find-relevant';

// RAG Tools for AI SDK Integration
export {
  type RAGToolsConfig,
  createRAGTools,
  createSimpleRetrievalTool,
  createKnowledgeBaseManagementTools,
  combineTools,
} from './rag-tools';

// Core RAG Service
export * from './rag';
