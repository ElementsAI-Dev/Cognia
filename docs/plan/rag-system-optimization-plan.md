# RAG System Optimization Plan

## Document Information

- **Created**: 2025-01-25
- **Status**: Draft
- **Priority**: High
- **Target**: lib/ai/rag/, hooks/rag/, stores/data/vector-store.ts

## Executive Summary

This document provides a comprehensive optimization plan for the RAG (Retrieval Augmented Generation) system in Cognia. The current implementation includes basic RAG with ChromaDB integration, an advanced RAG Pipeline with hybrid search, contextual retrieval, query expansion, and reranking capabilities. This plan identifies areas for improvement and provides actionable steps to enhance performance, accuracy, and user experience.

## Current System Architecture

### Core Components

1. **Basic RAG** (`lib/ai/rag/rag.ts`)
   - Document indexing with chunking strategies
   - ChromaDB vector store integration
   - Context retrieval with similarity thresholds
   - In-memory SimpleRAG for simple use cases

2. **Advanced RAG Pipeline** (`lib/ai/rag/rag-pipeline.ts`)
   - Hybrid search (BM25 + Vector)
   - Contextual retrieval (LLM-based and lightweight)
   - Query expansion with variants
   - Reranking (LLM-based and heuristic)
   - Result deduplication

3. **Hybrid Search Engine** (`lib/ai/rag/hybrid-search.ts`)
   - BM25 keyword search
   - Vector similarity search
   - Reciprocal Rank Fusion (RRF)
   - Score normalization and deduplication

4. **Supporting Modules**
   - `contextual-retrieval.ts`: Context generation for chunks
   - `query-expansion.ts`: Query expansion with LLM
   - `reranker.ts`: Relevance-based reranking
   - `rag-tools.ts`: AI SDK integration tools

5. **React Hooks** (`hooks/rag/`)
   - `use-rag.ts`: Main RAG functionality hook
   - `use-rag-pipeline.ts`: Advanced pipeline hook
   - `use-vector-db.ts`: Vector database management
   - `use-memory.ts`: Memory integration

### Current Capabilities

| Feature | Status | Implementation |
|---------|--------|----------------|
| Vector Search | ✅ Complete | ChromaDB with embeddings |
| Hybrid Search | ✅ Complete | BM25 + Vector with RRF |
| Query Expansion | ✅ Complete | LLM-based variants |
| Contextual Retrieval | ✅ Complete | LLM and lightweight modes |
| Reranking | ✅ Complete | LLM and heuristic |
| Batch Indexing | ✅ Complete | With progress tracking |
| Multiple Chunking Strategies | ✅ Complete | 8 strategies |
| Persistent Storage | ✅ Complete | ChromaDB |
| In-Memory Mode | ✅ Complete | SimpleRAG class |

## Analysis and Findings

### Strengths

1. **Comprehensive Feature Set**: The system includes advanced RAG techniques typically found in enterprise solutions
2. **Modular Architecture**: Clean separation of concerns with reusable components
3. **Multiple Retrieval Modes**: Hybrid search combining semantic and keyword approaches
4. **Flexible Configuration**: Extensive configuration options for different use cases
5. **Good Test Coverage**: Most modules have corresponding test files

### Areas for Improvement

#### 1. Performance Optimization

**Current Issues:**
- No query result caching for frequently asked questions
- Embedding generation is not batched efficiently
- Large document collections slow down retrieval
- No streaming support for large result sets

**Impact:** High - Affects user experience with slow responses

**Proposed Solutions:**
- Implement LRU cache for query results
- Add embedding batch optimization
- Implement result streaming
- Add collection-level indexing optimizations

#### 2. Relevance and Accuracy

**Current Issues:**
- Reranking uses generic heuristics
- No user feedback loop for relevance
- Limited context window management
- No multi-hop reasoning support

**Impact:** High - Affects answer quality

**Proposed Solutions:**
- Implement learning-based reranking
- Add relevance feedback mechanism
- Implement dynamic context window sizing
- Add multi-hop query decomposition

#### 3. Scalability

**Current Issues:**
- In-memory storage doesn't persist across sessions
- No collection management APIs
- Limited support for large-scale document updates
- No sharding or partitioning strategy

**Impact:** Medium - Limits deployment to larger knowledge bases

**Proposed Solutions:**
- Implement persistent storage for RAGPipeline
- Add collection management operations
- Implement incremental index updates
- Add document versioning support

#### 4. User Experience

**Current Issues:**
- Limited visibility into search process
- No source attribution display
- Minimal error handling for edge cases
- No progress indication for long operations

**Impact:** Medium - Affects user trust and debugging

**Proposed Solutions:**
- Add search metadata visualization
- Implement source citation formatting
- Improve error messages and recovery
- Add progress callbacks for all async operations

#### 5. Integration and Extensibility

**Current Issues:**
- Limited integration with memory system
- No support for multi-modal RAG (images, tables)
- Minimal plugin architecture
- Tight coupling between components

**Impact:** Medium - Limits future feature additions

**Proposed Solutions:**
- Integrate with memory system for persistent context
- Add multi-modal chunking support
- Implement plugin system for custom retrievers
- Decouple components with dependency injection

## Detailed Implementation Plan

### Phase 1: Performance Optimization (Priority: High)

#### 1.1 Query Result Caching

**File:** `lib/ai/rag/cache.ts` (new)

**Implementation:**
```typescript
export interface RAGCacheConfig {
  maxSize: number;
  ttl: number;
  enabled: boolean;
}

export class RAGQueryCache {
  private cache: LRUCache<string, RAGPipelineContext>;

  async get(query: string, collectionName: string): Promise<RAGPipelineContext | null>;
  async set(query: string, collectionName: string, result: RAGPipelineContext): Promise<void>;
  invalidateCollection(collectionName: string): void;
}
```

**Integration Points:**
- Modify `RAGPipeline.retrieve()` to check cache first
- Add cache invalidation on document updates
- Store cache in IndexedDB for persistence

**Testing:**
- Cache hit/miss ratio
- Performance improvement metrics
- Cache consistency on updates

#### 1.2 Embedding Batch Optimization

**File:** `lib/ai/rag/embedding-batcher.ts` (new)

**Implementation:**
```typescript
export class EmbeddingBatcher {
  private queue: Array<{text: string; resolve: (embedding: number[]) => void}> = [];
  private batchSize: number;
  private flushInterval: number;

  async generateEmbeddings(texts: string[]): Promise<number[][]>;
  private flush(): Promise<void>;
}
```

**Integration Points:**
- Replace direct embedding calls in `RAGPipeline`
- Add to `indexDocument()` for batch processing
- Configurable batch size and timeout

**Testing:**
- Throughput improvement
- Latency reduction
- Memory usage

#### 1.3 Streaming Results

**File:** `lib/ai/rag/streaming-retriever.ts` (new)

**Implementation:**
```typescript
export async function* streamRetrieval(
  query: string,
  config: RAGConfig
): AsyncGenerator<RAGPipelineContext, RAGPipelineContext, unknown> {
  // Emit partial results as they become available
}
```

**Integration Points:**
- Add to `use-rag.ts` hook
- Support in agent tools
- UI components for streaming display

**Testing:**
- Time to first result
- User perception improvement
- Resource usage

### Phase 2: Relevance and Accuracy (Priority: High)

#### 2.1 Learning-Based Reranking

**File:** `lib/ai/rag/adaptive-reranker.ts` (new)

**Implementation:**
```typescript
export class AdaptiveReranker {
  private feedbackHistory: Map<string, RelevanceFeedback[]> = new Map();

  async rerankWithLearning(
    query: string,
    results: RerankResult[],
    feedback?: RelevanceFeedback[]
  ): Promise<RerankResult[]>;

  recordFeedback(query: string, resultId: string, relevance: number): void;
}
```

**Integration Points:**
- Replace heuristic reranking in `RAGPipeline`
- Add feedback collection in UI
- Persist feedback in localStorage

**Testing:**
- Relevance improvement metrics
- A/B testing against baseline
- Feedback loop effectiveness

#### 2.2 Dynamic Context Window

**File:** `lib/ai/rag/context-manager.ts` (new)

**Implementation:**
```typescript
export class DynamicContextManager {
  calculateOptimalContextLength(
    query: string,
    results: SearchResult[],
    maxTokens: number
  ): number;

  selectOptimalChunks(
    results: SearchResult[],
    targetLength: number
  ): SearchResult[];
}
```

**Integration Points:**
- Integrate into `formatContext()` in `rag.ts`
- Add to `RAGPipeline` context building
- User preference for context size

**Testing:**
- Answer quality with dynamic sizing
- Token usage optimization
- User satisfaction

#### 2.3 Multi-Hop Query Decomposition

**File:** `lib/ai/rag/multi-hop.ts` (new)

**Implementation:**
```typescript
export interface DecomposedQuery {
  hops: Array<{
    query: string;
    dependencies: string[];
  }>;
  finalQuery: string;
}

export async function decomposeMultiHopQuery(
  query: string,
  model: LanguageModel
): Promise<DecomposedQuery>;

export async function executeMultiHopRetrieval(
  decomposition: DecomposedQuery,
  pipeline: RAGPipeline
): Promise<RAGPipelineContext>;
```

**Integration Points:**
- Add as optional mode in `RAGPipeline`
- Detect multi-hop queries automatically
- UI indication of multi-hop processing

**Testing:**
- Complex query accuracy
- Intermediate result quality
- Processing time

### Phase 3: Scalability Improvements (Priority: Medium)

#### 3.1 Persistent RAGPipeline Storage

**File:** `lib/ai/rag/persistent-storage.ts` (new)

**Implementation:**
```typescript
export class PersistentRAGStorage {
  async saveCollection(
    collectionName: string,
    documents: IndexedDocument[]
  ): Promise<void>;

  async loadCollection(
    collectionName: string
  ): Promise<IndexedDocument[]>;

  async listCollections(): Promise<string[]>;
}
```

**Integration Points:**
- Replace in-memory Map in `RAGPipeline`
- Use IndexedDB for browser storage
- Add export/import functionality

**Testing:**
- Cross-session persistence
- Storage size limits
- Performance with large collections

#### 3.2 Collection Management API

**File:** `lib/ai/rag/collection-manager.ts` (new)

**Implementation:**
```typescript
export class RAGCollectionManager {
  createCollection(name: string, config: CollectionConfig): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  updateCollection(name: string, updates: Partial<CollectionConfig>): Promise<void>;
  getCollectionStats(name: string): Promise<CollectionStats>;
  listCollections(): Promise<CollectionInfo[]>;
}
```

**Integration Points:**
- Add to `use-vector-db.ts` hook
- UI for collection management
- Settings integration

**Testing:**
- CRUD operations
- Configuration persistence
- Error handling

#### 3.3 Incremental Index Updates

**File:** `lib/ai/rag/incremental-indexer.ts` (new)

**Implementation:**
```typescript
export class IncrementalIndexer {
  async updateDocument(
    collectionName: string,
    documentId: string,
    newContent: string
  ): Promise<IndexResult>;

  async deleteDocument(
    collectionName: string,
    documentId: string
  ): Promise<void>;

  private getChangedChunks(old: string, new: string): ChunkDiff[];
}
```

**Integration Points:**
- Modify `indexDocument()` to support updates
- Add to `RAGPipeline` methods
- Optimize to only re-index changed chunks

**Testing:**
- Update correctness
- Performance vs full reindex
- Memory efficiency

### Phase 4: User Experience Enhancements (Priority: Medium)

#### 4.1 Search Metadata Visualization

**File:** `components/rag/search-metadata.tsx` (new)

**Implementation:**
```typescript
interface SearchMetadataDisplayProps {
  metadata: RAGPipelineContext['searchMetadata'];
  queryTime: number;
  resultCount: number;
}

export function SearchMetadataDisplay(props: SearchMetadataDisplayProps) {
  // Display search process, techniques used, timing
}
```

**Integration Points:**
- Add to chat interface for RAG responses
- Include in agent tool results
- Debug mode for detailed info

**Testing:**
- User comprehension
- Performance impact
- Visual clarity

#### 4.2 Source Citation Formatting

**File:** `lib/ai/rag/citation-formatter.ts` (new)

**Implementation:**
```typescript
export interface CitationFormat {
  style: 'harvard' | 'apa' | 'mla' | 'chicago';
  includeMetadata: string[];
}

export function formatCitations(
  results: SearchResult[],
  format: CitationFormat
): string;
```

**Integration Points:**
- Add to `formatContext()` in `rag.ts`
- User preference for citation style
- Display in formatted responses

**Testing:**
- Format correctness
- Readability
- User preference

#### 4.3 Progress Callbacks

**File:** `hooks/rag/use-rag-progress.ts` (new)

**Implementation:**
```typescript
export interface RAGProgress {
  stage: 'chunking' | 'embedding' | 'searching' | 'reranking';
  current: number;
  total: number;
  message: string;
}

export function useRAGWithProgress() {
  const [progress, setProgress] = useState<RAGProgress | null>(null);

  const indexWithProgress = async (document: RAGDocument) => {
    // Update progress at each stage
  };

  return { progress, indexWithProgress };
}
```

**Integration Points:**
- Add to all long-running operations
- UI progress indicators
- Cancel operation support

**Testing:**
- Progress accuracy
- User feedback
- Cancellation handling

### Phase 5: Integration and Extensibility (Priority: Medium)

#### 5.1 Memory System Integration

**File:** `lib/ai/rag/memory-integration.ts` (new)

**Implementation:**
```typescript
export class RAGMemoryBridge {
  constructor(
    private ragPipeline: RAGPipeline,
    private memoryProvider: MemoryProvider
  ) {}

  async retrieveWithMemory(
    query: string,
    collectionName: string
  ): Promise<UnifiedContext>;

  async indexToMemory(
    document: RAGDocument
  ): Promise<void>;
}
```

**Integration Points:**
- Combine RAG and memory results
- Unified context building
- Shared indexing pipeline

**Testing:**
- Result quality improvement
- Performance impact
- Memory usage

#### 5.2 Multi-Modal RAG Support

**File:** `lib/ai/rag/multimodal-chunking.ts` (new)

**Implementation:**
```typescript
export interface MultiModalChunk extends DocumentChunk {
  type: 'text' | 'image' | 'table' | 'code';
  mediaData?: {
    type: string;
    data: string; // base64 or URL
    caption?: string;
  };
}

export function chunkMultiModal(
  content: string,
  options: MultiModalChunkingOptions
): ChunkResult<MultiModalChunk>;
```

**Integration Points:**
- Extend chunking strategies
- Image embedding support
- Table extraction and chunking

**Testing:**
- Multi-modal accuracy
- Performance with media
- Storage requirements

#### 5.3 Plugin System

**File:** `lib/ai/rag/plugin-system.ts` (new)

**Implementation:**
```typescript
export interface RAGPlugin {
  name: string;
  version: string;

  beforeIndex?(document: RAGDocument): Promise<RAGDocument>;
  afterIndex?(result: IndexResult): Promise<IndexResult>;
  beforeSearch?(query: string): Promise<string>;
  afterSearch?(results: SearchResult[]): Promise<SearchResult[]>;
}

export class RAGPluginManager {
  registerPlugin(plugin: RAGPlugin): void;
  unregisterPlugin(name: string): void;
  executeHook(hook: keyof RAGPlugin, ...args: unknown[]): Promise<unknown>;
}
```

**Integration Points:**
- Add to `RAGPipeline` constructor
- Plugin registry in settings
- Dynamic plugin loading

**Testing:**
- Plugin isolation
- Performance impact
- Error handling

## Implementation Timeline

### Sprint 1 (Week 1-2): Performance Foundation
- Query result caching (1.1)
- Embedding batch optimization (1.2)
- Performance benchmarking

### Sprint 2 (Week 3-4): Accuracy Improvements
- Learning-based reranking (2.1)
- Dynamic context window (2.2)
- Relevance testing framework

### Sprint 3 (Week 5-6): Scalability Phase 1
- Persistent storage (3.1)
- Collection management (3.2)
- Storage testing

### Sprint 4 (Week 7-8): User Experience
- Metadata visualization (4.1)
- Source citations (4.2)
- Progress callbacks (4.3)

### Sprint 5 (Week 9-10): Advanced Features
- Multi-hop queries (2.3)
- Incremental updates (3.3)
- Memory integration (5.1)

### Sprint 6 (Week 11-12): Extensibility
- Multi-modal support (5.2)
- Plugin system (5.3)
- Documentation and examples

## Success Metrics

### Performance Metrics
- **Query Latency**: < 500ms for cached results, < 2s for uncached
- **Indexing Throughput**: > 100 documents/minute
- **Cache Hit Rate**: > 40% for repeated queries
- **Memory Usage**: < 500MB for 10,000 document collection

### Quality Metrics
- **Relevance Score**: > 0.8 on test set
- **Citation Accuracy**: > 95% correct source attribution
- **User Satisfaction**: > 4.0/5.0 rating
- **Multi-Hop Accuracy**: > 75% on complex queries

### Reliability Metrics
- **Error Rate**: < 1% on valid inputs
- **Uptime**: > 99.5% for RAG operations
- **Data Consistency**: 100% across sessions
- **Recovery Success**: > 95% from failures

## Testing Strategy

### Unit Testing
- All new modules with > 80% coverage
- Mock external dependencies (ChromaDB, embeddings)
- Property-based testing for core algorithms

### Integration Testing
- End-to-end RAG pipeline tests
- Memory system integration tests
- Vector database compatibility tests

### Performance Testing
- Load testing with various collection sizes
- Stress testing for concurrent queries
- Memory profiling for large documents

### Quality Testing
- Relevance evaluation on standard datasets
- A/B testing for algorithm improvements
- User acceptance testing

### Compatibility Testing
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Vector database testing (ChromaDB, Pinecone, Qdrant)
- Provider testing (OpenAI, Google, Anthropic embeddings)

## Risk Assessment

### High Risk Items
1. **Breaking Changes to API**
   - **Mitigation**: Version APIs, maintain backward compatibility
   - **Impact**: Medium

2. **Performance Regression**
   - **Mitigation**: Comprehensive benchmarking, gradual rollout
   - **Impact**: High

3. **Storage Size Growth**
   - **Mitigation**: Implement cleanup policies, compression
   - **Impact**: Medium

### Medium Risk Items
1. **Complexity Increase**
   - **Mitigation**: Documentation, examples, clear abstractions
   - **Impact**: Medium

2. **Third-Party Dependencies**
   - **Mitigation**: Feature detection, graceful degradation
   - **Impact**: Low

### Low Risk Items
1. **User Adoption**
   - **Mitigation**: Gradual feature rollout, UI improvements
   - **Impact**: Low

## Dependencies

### Internal Dependencies
- `lib/ai/embedding/` - Chunking and embeddings
- `lib/vector/` - Vector database clients
- `stores/data/vector-store.ts` - Settings and state
- `lib/ai/memory/` - Memory integration

### External Dependencies
- `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/anthropic` - Embedding providers
- `chromadb` - Vector database
- `zod` - Schema validation
- `zustand` - State management

## Documentation Requirements

### Developer Documentation
- API documentation for all new modules
- Integration guide for custom retrievers
- Performance tuning guide
- Troubleshooting guide

### User Documentation
- RAG configuration guide
- Collection management guide
- Best practices for knowledge base setup
- FAQ for common issues

### Examples
- Basic usage examples
- Advanced configuration examples
- Integration examples (with agents, memory)
- Performance optimization examples

## Open Questions

1. **Storage Strategy**: Should we use IndexedDB or a remote backend for persistent RAGPipeline storage?
2. **Caching Scope**: What should be the default TTL for query cache?
3. **Multi-Modal Priority**: Which media types should be prioritized (images, tables, code)?
4. **Plugin Distribution**: How should custom plugins be distributed and loaded?
5. **Migration Path**: How to migrate existing collections to new formats?

## Next Steps

1. **Review and Approval**: Get stakeholder feedback on this plan
2. **Prioritization**: Confirm sprint priorities and timeline
3. **Resource Allocation**: Assign developers to tasks
4. **Setup**: Create development branches, issue tracking
5. **Begin Sprint 1**: Start with performance optimization

## Appendix

### A. Current File Inventory

| File | Lines | Purpose | Priority for Changes |
|------|-------|---------|---------------------|
| `lib/ai/rag/rag.ts` | 491 | Basic RAG implementation | High - caching, persistence |
| `lib/ai/rag/rag-pipeline.ts` | 616 | Advanced RAG pipeline | High - streaming, optimization |
| `lib/ai/rag/hybrid-search.ts` | 496 | Hybrid search engine | Medium - performance tuning |
| `lib/ai/rag/contextual-retrieval.ts` | ~400 | Context generation | Low - already optimized |
| `lib/ai/rag/query-expansion.ts` | ~300 | Query expansion | Low - minor improvements |
| `lib/ai/rag/reranker.ts` | ~350 | Result reranking | High - learning-based |
| `lib/ai/rag/rag-tools.ts` | ~250 | AI SDK integration | Medium - add progress callbacks |
| `hooks/rag/use-rag.ts` | 443 | Main RAG hook | High - add streaming, progress |
| `hooks/rag/use-rag-pipeline.ts` | ~300 | Pipeline hook | Medium - add new features |
| `stores/data/vector-store.ts` | ~200 | Settings store | Medium - add collection management |

### B. Related Documents

- `llmdoc/architecture/ai-system.md` - AI system architecture
- `llmdoc/architecture/agent-system-overview.md` - Agent integration
- `llmdoc/guides/ai-integration-guide.md` - AI integration guide

### C. References

- [LangChain RAG Documentation](https://python.langchain.com/docs/use_cases/question_answering/)
- [LlamaIndex RAG Patterns](https://docs.llamaindex.ai/en/stable/optimizing/basic_retrieval/rooted_qa.html)
- [RAG at ArXiv](https://arxiv.org/abs/2312.10997) - Academic research on RAG

---

**Document Version**: 1.0
**Last Updated**: 2025-01-25
**Author**: AI Planning Agent
**Reviewers**: Pending
**Status**: Draft - Pending Review
