/**
 * Memory Module - Unified memory management with multiple provider support
 * 
 * Features:
 * - Local memory storage with Zustand persistence
 * - Mem0 integration via MCP or direct API
 * - Two-phase memory pipeline (extraction + update)
 * - Semantic search and conflict detection
 * - Session-scoped and global memories
 * - Context-aware memory activation (A-Mem inspired)
 * - Hybrid retrieval (vector + keyword + graph)
 * - Working memory management (MemGPT/Letta inspired)
 * - Criteria-based reranking (Mem0 style)
 */

// Provider
export { Mem0Provider, createMem0Provider } from './mem0-provider';

// Pipeline
export {
  extractMemoryCandidates,
  decideMemoryUpdates,
  applyDecisions,
  generateRollingSummary,
  runMemoryPipeline,
  type ConversationMessage,
  type ExtractionContext,
  type UpdateContext,
} from './memory-pipeline';

// Activator
export {
  MemoryActivator,
  createMemoryActivator,
  DEFAULT_ACTIVATOR_CONFIG,
  type MemoryActivatorConfig,
  type MemoryActivationContext,
  type ActivatedMemory,
  type ActivationReason,
  type ActivationReasonType,
  type RelevanceType,
  type TimeRange,
} from './memory-activator';

// Hybrid Retriever
export {
  HybridRetriever,
  createHybridRetriever,
  DEFAULT_RETRIEVER_CONFIG,
  type HybridRetrieverConfig,
  type HybridSearchOptions,
  type ScoredMemory,
  type MemoryFilters,
} from './hybrid-retriever';

// Reranker
export {
  MemoryReranker,
  createMemoryReranker,
  DEFAULT_RERANKER_CONFIG,
  type RerankerConfig,
  type RelevanceCriteria,
  type RerankedMemory,
  type LLMScorer,
} from './reranker';

// Working Memory
export {
  WorkingMemory,
  createWorkingMemory,
  DEFAULT_WORKING_MEMORY_CONFIG,
  type WorkingMemoryConfig,
  type WorkingMemoryState,
  type SessionContext,
  type MemoryPromotionCandidate,
  type MemoryDemotionCandidate,
} from './working-memory';

// LLM Extractor
export {
  LLMMemoryExtractor,
  createLLMExtractor,
  DEFAULT_LLM_EXTRACTOR_CONFIG,
  type LLMExtractorConfig,
  type ExtractedMemoryCandidate,
  type LLMFunction,
} from './llm-extractor';
