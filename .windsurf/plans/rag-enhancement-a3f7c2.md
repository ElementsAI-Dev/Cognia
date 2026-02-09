# RAG Processing Enhancement Plan

## Executive Summary

After thorough analysis of the existing RAG codebase (~15 files, ~7000+ lines) and research into 2025-2026 advanced RAG best practices (Agentic RAG, Corrective RAG, Self-RAG, GraphRAG, parent-child chunking, context distillation), this plan identifies **20 specific gaps/issues** and proposes **5 priority phases** of improvements.

The existing implementation has a strong foundation with hybrid search, query expansion, reranking, contextual retrieval, adaptive reranking, dynamic context management, persistent storage, and citation formatting. However, critical integration gaps and missing advanced patterns prevent this powerful pipeline from being fully utilized.

---

## Current Architecture Overview

### Files Analyzed
| File | Purpose | Lines |
|------|---------|-------|
| `lib/ai/rag/rag-pipeline.ts` | Unified RAG pipeline orchestrator | 871 |
| `lib/ai/rag/rag.ts` | Simple RAG (ChromaDB-based) | 494 |
| `lib/ai/rag/hybrid-search.ts` | BM25 + Vector + RRF fusion | 525 |
| `lib/ai/rag/query-expansion.ts` | HyDE, variants, synonyms, decomposition | 433 |
| `lib/ai/rag/reranker.ts` | LLM/Cohere/heuristic/MMR reranking | 465 |
| `lib/ai/rag/contextual-retrieval.ts` | LLM/lightweight context generation | 456 |
| `lib/ai/rag/adaptive-reranker.ts` | Feedback-based learning reranker | 459 |
| `lib/ai/rag/context-manager.ts` | Dynamic context window management | 445 |
| `lib/ai/rag/embedding-batcher.ts` | Batch embedding with parallelism | 445 |
| `lib/ai/rag/persistent-storage.ts` | IndexedDB-based storage | 466 |
| `lib/ai/rag/collection-manager.ts` | Collection CRUD & lifecycle | 490 |
| `lib/ai/rag/citation-formatter.ts` | Multi-style citation formatting | ~400 |
| `lib/ai/rag/rag-tools.ts` | AI SDK tool integration | 262 |
| `lib/ai/tools/rag-search.ts` | Standalone RAG search tool | 97 |
| `lib/document/knowledge-rag.ts` | Project knowledge integration | 585 |
| `lib/document/document-processor.ts` | Multi-format document processing | 662 |
| `hooks/rag/use-rag.ts` | Simple RAG hook | 455 |
| `hooks/rag/use-rag-pipeline.ts` | Advanced RAG pipeline hook | 546 |
| `stores/data/vector-store.ts` | Vector settings & collection state | 351 |
| `hooks/context/use-project-context.ts` | Project knowledge context hook | 162 |

---

## Identified Gaps & Issues

### P0 — Critical Integration Gaps

#### 1. Chat Integration Bypasses Advanced Pipeline
- **Location**: `lib/ai/generation/use-ai-chat.ts:364`
- **Issue**: Chat uses `retrieveContext` from `rag.ts` (simple ChromaDB), completely bypassing the advanced `RAGPipeline` with all its features (hybrid search, reranking, query expansion, contextual retrieval).
- **Impact**: All advanced RAG features are unused in the primary user-facing flow.
- **Fix**: Replace simple `retrieveContext` call with `RAGPipeline.retrieve()`, using user's vector store settings to enable/disable advanced features.

#### 2. Duplicate RAG Tool Implementations
- **Location**: `lib/ai/rag/rag-tools.ts` vs `lib/ai/tools/rag-search.ts`
- **Issue**: Two separate tool implementations exist — `rag-tools.ts` uses `RAGPipeline` (advanced), `rag-search.ts` uses simple `retrieveContext`. The agent system may use either.
- **Fix**: Consolidate into one implementation that always uses the advanced pipeline, with the simple path as a fallback.

#### 3. Knowledge-RAG Disconnected from Pipeline
- **Location**: `lib/document/knowledge-rag.ts`
- **Issue**: Project knowledge search uses keyword-only search and heuristics, not the advanced pipeline. Project knowledge files don't benefit from hybrid search, reranking, or contextual retrieval.
- **Fix**: Add a `searchKnowledgeBaseAdvanced()` function that uses `RAGPipeline` when available, falling back to keyword search.

#### 4. `saveToStorage` is a No-Op
- **Location**: `lib/ai/rag/collection-manager.ts:144-147`
- **Issue**: The `saveToStorage()` method body is empty — collection config changes are never persisted.
- **Fix**: Implement actual persistence of collection configs to IndexedDB via `PersistentRAGStorage`.

### P1 — Missing Advanced RAG Patterns

#### 5. No Corrective RAG (CRAG)
- **Issue**: No relevance grading of retrieved documents before use. The pipeline trusts all retrieved chunks equally without verification. No fallback mechanism when retrieval fails or returns low-quality results.
- **Best Practice**: Grade retrieved documents for relevance. If below threshold, trigger web search or alternative retrieval. Filter out irrelevant chunks before LLM generation.
- **Implementation**: Add `RetrievalGrader` module that scores chunk relevance using LLM or heuristics, with configurable fallback strategies (web search via agent tools, query reformulation, or graceful degradation).

#### 6. No Self-Reflective RAG
- **Issue**: No self-evaluation loop where the model checks if its answer is grounded in the retrieved context. No hallucination detection or answer quality verification.
- **Best Practice**: After generation, have LLM evaluate whether the answer is supported by retrieved evidence. If not, re-retrieve or flag low-confidence answers.
- **Implementation**: Add `AnswerGroundingChecker` that verifies generated answers against retrieved context, returning a confidence score and list of unsupported claims.

#### 7. No Iterative/Multi-Hop Retrieval
- **Issue**: Pipeline is linear — retrieve once, generate once. Complex queries requiring information from multiple documents or requiring reasoning chains are poorly served.
- **Best Practice**: Agentic RAG with iterative retrieval — retrieve, analyze, decide if more context is needed, retrieve again with refined queries.
- **Implementation**: Add `IterativeRetriever` that wraps the pipeline with a loop: retrieve → check sufficiency → refine query → retrieve again (max N iterations).

### P2 — Missing Features & Incomplete Implementations

#### 8. No Parent-Child Chunking
- **Issue**: All chunking produces flat, independent chunks. No hierarchical structure where child chunks can reference parent chunks for broader context.
- **Best Practice**: Create small chunks for precise matching but return parent chunks (or surrounding context) for better LLM comprehension.
- **Implementation**: Add `parentId` field to chunk metadata during indexing. On retrieval, if a child chunk matches, also fetch its parent chunk and include both in context. Modify `rag-pipeline.ts` indexing to support `parentChunkSize` config.

#### 9. No Incremental/Delta Indexing
- **Issue**: Re-indexing a document reprocesses everything. No content hashing or change detection to skip unchanged chunks.
- **Implementation**: Add content fingerprinting (hash) to `StoredDocument`. On re-index, compare hashes and only re-embed changed chunks. Store fingerprints in `PersistentRAGStorage`.

#### 10. No Document Deduplication
- **Issue**: Indexing the same document twice creates duplicate chunks with no detection.
- **Implementation**: Add `documentFingerprint` to collection metadata. Before indexing, check if document with same fingerprint already exists. Offer `upsert` mode that replaces existing.

#### 11. CJK Language Support Gaps
- **Locations**: `query-expansion.ts:162-190` (English-only stop words), `hybrid-search.ts:68-73` (whitespace-only tokenizer), `context-manager.ts:124-143` (English-only complexity analysis)
- **Issue**: BM25 tokenizer splits on whitespace only — CJK text has no word boundaries. Stop words are English-only. Query complexity analysis uses English regex patterns.
- **Implementation**: 
  - Add CJK-aware tokenizer (character n-gram or jieba-like segmentation for Chinese)
  - Add CJK stop words
  - Add CJK query complexity heuristics (character count, punctuation patterns)

#### 12. Outdated Model Context Limits
- **Location**: `context-manager.ts:418-444`
- **Issue**: `getModelContextLimits()` is missing many newer models (Claude 3.5/4, GPT-4.1, GPT-4o-mini, Gemini 2.x, DeepSeek, Qwen, etc.).
- **Fix**: Update the model limits map with current models and add a more flexible matching strategy.

#### 13. Query Cache Not Persisted
- **Issue**: `RAGQueryCache` is memory-only, lost on page reload. Frequent queries re-compute unnecessarily.
- **Implementation**: Add optional IndexedDB persistence for query cache with TTL-based eviction.

### P3 — Quality & Evaluation

#### 14. No RAG Evaluation Metrics
- **Issue**: No way to measure RAG quality. No RAGAS-like metrics (faithfulness, answer relevance, context precision, context recall).
- **Implementation**: Add `RAGEvaluator` module with:
  - **Context Precision**: Are retrieved chunks actually relevant?
  - **Context Recall**: Did we miss relevant chunks?
  - **Faithfulness**: Is the answer grounded in context?
  - **Answer Relevance**: Does the answer address the query?
  - Use LLM-as-judge or heuristic scoring.

#### 15. No RAG Guardrails
- **Issue**: No input validation for queries (prompt injection via RAG), no output validation for hallucination markers.
- **Implementation**: Add query sanitization, max query length enforcement, and output confidence scoring.

#### 16. Missing Metadata Enrichment During Indexing
- **Issue**: Limited metadata extraction during indexing. Could extract titles, headings structure, key entities, dates for better filtering and context.
- **Implementation**: Enhance `rag-pipeline.ts` indexing to extract and store structured metadata (heading hierarchy, named entities, date mentions, code language) from document content.

### P4 — Performance & DX

#### 17. EmbeddingBatcher Not Used in Pipeline
- **Location**: `rag-pipeline.ts` imports concept but doesn't use `EmbeddingBatcher` class
- **Issue**: Pipeline generates embeddings one-by-one during indexing instead of batching.
- **Fix**: Integrate `EmbeddingBatcher` into `rag-pipeline.ts` indexing flow.

#### 18. No Streaming RAG Context
- **Issue**: RAG retrieval blocks until complete. For large collections, this can cause noticeable latency before chat response begins.
- **Implementation**: Add streaming support so retrieval results are yielded as they become available, allowing the LLM to start generating while retrieval continues.

#### 19. Late Interaction Config Exists But No Implementation
- **Location**: `use-rag-pipeline.ts:45,52,125,129` — `enableLateInteraction`, `lateInteractionWeight`
- **Issue**: Configuration options exist in the hook for late interaction search, but no actual implementation exists.
- **Fix**: Either implement ColBERT-style late interaction or remove the dead config options.

#### 20. Embedding Cache Missing
- **Issue**: Same text embedded multiple times gets re-computed. No local embedding cache.
- **Implementation**: Add in-memory LRU cache for embeddings keyed by content hash. Optionally persist to IndexedDB.

---

## Implementation Phases

### Phase 1: Critical Integration Fixes (P0) — Est. 4-6 hours
**Goal**: Make the advanced RAG pipeline actually used in production flows.

1. **Fix chat integration** (`use-ai-chat.ts`): Replace simple `retrieveContext` with `RAGPipeline.retrieve()`. Use vector store settings to determine which features are enabled.
2. **Consolidate RAG tools**: Make `rag-search.ts` delegate to `rag-tools.ts` pipeline, or unify into single implementation.
3. **Connect knowledge-RAG to pipeline**: Add `searchKnowledgeBaseAdvanced()` that uses `RAGPipeline` for vector search + hybrid search.
4. **Implement `saveToStorage()`**: Persist collection configs to IndexedDB.

### Phase 2: Agentic RAG Patterns (P1) — Est. 6-8 hours
**Goal**: Add intelligent retrieval behaviors that improve answer quality.

5. **Corrective RAG**: Add `lib/ai/rag/retrieval-grader.ts` with relevance grading and fallback strategies.
6. **Answer Grounding Check**: Add `lib/ai/rag/answer-grounding.ts` for post-generation verification.
7. **Iterative Retrieval**: Add multi-hop support to `rag-pipeline.ts` retrieve method.

### Phase 3: Missing Features (P2) — Est. 8-10 hours
**Goal**: Complete incomplete implementations and add missing core features.

8. **Parent-child chunking**: Modify chunking and retrieval to support hierarchical chunks.
9. **Incremental indexing**: Add content fingerprinting and delta detection.
10. **Document deduplication**: Add fingerprint-based duplicate detection.
11. **CJK support**: Add CJK tokenizer, stop words, and complexity analysis.
12. **Update model limits**: Refresh `getModelContextLimits()` with current models.
13. **Persist query cache**: Add IndexedDB backend for `RAGQueryCache`.

### Phase 4: Quality & Evaluation (P3) — Est. 4-6 hours
**Goal**: Add measurement and safety capabilities.

14. **RAG Evaluator**: Add evaluation metrics module.
15. **RAG Guardrails**: Add input/output validation.
16. **Metadata enrichment**: Enhance indexing with structured metadata extraction.

### Phase 5: Performance & Cleanup (P4) — Est. 4-6 hours
**Goal**: Optimize performance and clean up dead code.

17. **Integrate EmbeddingBatcher**: Use batching in pipeline indexing.
18. **Streaming RAG**: Add async generator support for retrieval.
19. **Late interaction**: Implement or remove dead config.
20. **Embedding cache**: Add LRU cache for embeddings.

---

## Files to Create/Modify

### New Files
- `lib/ai/rag/retrieval-grader.ts` — Corrective RAG relevance grading
- `lib/ai/rag/answer-grounding.ts` — Self-reflective answer verification
- `lib/ai/rag/rag-evaluator.ts` — RAG quality metrics
- `lib/ai/rag/rag-guardrails.ts` — Input/output validation
- `lib/ai/rag/cjk-tokenizer.ts` — CJK-aware tokenization
- `lib/ai/rag/embedding-cache.ts` — LRU embedding cache

### Modified Files
- `lib/ai/generation/use-ai-chat.ts` — Use RAGPipeline instead of simple retrieveContext
- `lib/ai/rag/rag-pipeline.ts` — Add iterative retrieval, parent-child chunking, embedding batching, incremental indexing, metadata enrichment
- `lib/ai/rag/collection-manager.ts` — Implement saveToStorage
- `lib/ai/rag/context-manager.ts` — Update model limits, add CJK complexity analysis
- `lib/ai/rag/hybrid-search.ts` — Add CJK tokenizer support
- `lib/ai/rag/query-expansion.ts` — Add CJK stop words
- `lib/ai/rag/persistent-storage.ts` — Add document fingerprinting, query cache persistence
- `lib/ai/rag/index.ts` — Export new modules
- `lib/ai/tools/rag-search.ts` — Delegate to pipeline-based implementation
- `lib/document/knowledge-rag.ts` — Add advanced search integration
- `hooks/rag/use-rag-pipeline.ts` — Expose new features (grading, evaluation, guardrails)
- `stores/data/vector-store.ts` — Add settings for new features (CRAG, self-RAG)

---

## Non-Goals (Avoiding Redundant Work)
- **No new vector DB clients** — ChromaDB, Pinecone, Qdrant clients already exist
- **No new embedding providers** — Existing multi-provider support is sufficient
- **No new chunking strategies from scratch** — Existing sentence/semantic/recursive chunking covers basics; only add parent-child on top
- **No GraphRAG** — Would require significant infrastructure (graph DB); can be a future enhancement
- **No fine-tuning embedding models** — Out of scope for application-level improvements

---

## Success Criteria
1. Chat RAG context uses advanced pipeline features (hybrid search, reranking) ✓
2. Corrective RAG filters out irrelevant chunks before LLM generation ✓
3. CJK queries return quality results comparable to English queries ✓
4. Re-indexing unchanged documents is a no-op (incremental indexing) ✓
5. RAG quality metrics available for monitoring ✓
6. No duplicate tool implementations ✓
7. Collection manager properly persists configuration ✓
