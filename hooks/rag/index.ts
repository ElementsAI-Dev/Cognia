/**
 * RAG/Vector/Memory related hooks
 */

export { useRAG, type UseRAGOptions, type UseRAGReturn } from './use-rag';
export {
  useRAGPipeline,
  type UseRAGPipelineOptions,
  type UseRAGPipelineReturn,
  type IndexingResult as RAGIndexingResult,
} from './use-rag-pipeline';
export { useVectorDB, type UseVectorDBOptions, type UseVectorDBReturn } from './use-vector-db';
export {
  useMemory,
  type MemorySearchOptions,
  type MemorySearchResult,
  type MemoryConflict,
  type BatchOperationResult,
  type MemoryRelevanceContext,
  type RelevantMemory,
  type UseMemoryOptions,
} from './use-memory';
export {
  useMemoryProvider,
  type UseMemoryProviderOptions,
  type UseMemoryProviderReturn,
  type PipelineResult,
} from './use-memory-provider';

// Progress tracking
export {
  useRAGProgress,
  formatElapsedTime,
  formatRemainingTime,
  getStageInfo,
  type RAGProgressStage,
  type RAGProgress,
  type RAGOperationStats,
  type UseRAGProgressOptions,
  type UseRAGProgressReturn,
} from './use-rag-progress';
