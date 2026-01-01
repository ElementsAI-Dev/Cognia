/**
 * RAG Pipeline
 * 
 * Unified RAG pipeline that combines all advanced features:
 * - Hybrid search (BM25 + Vector)
 * - Contextual retrieval
 * - Query expansion
 * - Reranking
 * - Result deduplication
 */

import type { LanguageModel } from 'ai';
import type { DocumentChunk, ChunkingOptions } from '../embedding/chunking';
import { chunkDocument } from '../embedding/chunking';
import type { EmbeddingModelConfig } from '@/lib/vector/embedding';
import { generateEmbedding, generateEmbeddings } from '@/lib/vector/embedding';
import { cosineSimilarity } from '@/lib/ai/embedding/embedding';

import {
  HybridSearchEngine,
  type HybridSearchConfig,
  type SearchDocument,
} from './hybrid-search';
import {
  rerank,
  rerankWithHeuristics,
  type RerankConfig,
  type RerankResult,
} from './reranker';
import {
  addContextToChunks,
  addLightweightContext,
  createContextCache,
  type ContextualChunk,
  type ContextGenerationConfig,
  type ContextCache,
} from './contextual-retrieval';
import {
  expandQuery,
  mergeQueryResults,
  type ExpandedQuery,
} from './query-expansion';

export interface RAGPipelineConfig {
  // Embedding configuration
  embeddingConfig: EmbeddingModelConfig;
  embeddingApiKey: string;

  // Optional LLM for advanced features
  model?: LanguageModel;

  // Hybrid search settings
  hybridSearch?: {
    enabled?: boolean;
    vectorWeight?: number;
    keywordWeight?: number;
  };

  // Contextual retrieval settings
  contextualRetrieval?: {
    enabled?: boolean;
    useLLM?: boolean;
    cacheEnabled?: boolean;
  };

  // Query expansion settings
  queryExpansion?: {
    enabled?: boolean;
    maxVariants?: number;
    useHyDE?: boolean;
  };

  // Reranking settings
  reranking?: {
    enabled?: boolean;
    useLLM?: boolean;
    cohereApiKey?: string;
  };

  // Retrieval settings
  topK?: number;
  similarityThreshold?: number;
  maxContextLength?: number;

  // Chunking settings
  chunkingOptions?: Partial<ChunkingOptions>;
}

export interface RAGPipelineContext {
  documents: RerankResult[];
  query: string;
  expandedQuery?: ExpandedQuery;
  formattedContext: string;
  totalTokensEstimate: number;
  searchMetadata: {
    hybridSearchUsed: boolean;
    queryExpansionUsed: boolean;
    rerankingUsed: boolean;
    originalResultCount: number;
    finalResultCount: number;
  };
}

export interface IndexingOptions {
  collectionName: string;
  documentId: string;
  documentTitle?: string;
  metadata?: Record<string, unknown>;
  useContextualRetrieval?: boolean;
  onProgress?: (progress: { stage: string; current: number; total: number }) => void;
}

interface IndexedDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

/**
 * RAG Pipeline - Unified retrieval pipeline with advanced features
 */
export class RAGPipeline {
  private config: Omit<Required<RAGPipelineConfig>, 'model'> & { model?: LanguageModel };
  private hybridEngine: HybridSearchEngine;
  private contextCache: ContextCache;
  private collections: Map<string, IndexedDocument[]> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(config: RAGPipelineConfig) {
    this.config = {
      embeddingConfig: config.embeddingConfig,
      embeddingApiKey: config.embeddingApiKey,
      model: config.model,
      hybridSearch: {
        enabled: config.hybridSearch?.enabled ?? true,
        vectorWeight: config.hybridSearch?.vectorWeight ?? 0.5,
        keywordWeight: config.hybridSearch?.keywordWeight ?? 0.5,
      },
      contextualRetrieval: {
        enabled: config.contextualRetrieval?.enabled ?? false,
        useLLM: config.contextualRetrieval?.useLLM ?? false,
        cacheEnabled: config.contextualRetrieval?.cacheEnabled ?? true,
      },
      queryExpansion: {
        enabled: config.queryExpansion?.enabled ?? false,
        maxVariants: config.queryExpansion?.maxVariants ?? 3,
        useHyDE: config.queryExpansion?.useHyDE ?? false,
      },
      reranking: {
        enabled: config.reranking?.enabled ?? true,
        useLLM: config.reranking?.useLLM ?? false,
        cohereApiKey: config.reranking?.cohereApiKey,
      },
      topK: config.topK ?? 5,
      similarityThreshold: config.similarityThreshold ?? 0.5,
      maxContextLength: config.maxContextLength ?? 4000,
      chunkingOptions: config.chunkingOptions ?? {
        strategy: 'sentence',
        chunkSize: 1000,
        chunkOverlap: 200,
      },
    };

    // Initialize hybrid search engine
    const hybridConfig: HybridSearchConfig = {
      vectorWeight: this.config.hybridSearch.vectorWeight,
      keywordWeight: this.config.hybridSearch.keywordWeight,
      deduplicateResults: true,
    };
    this.hybridEngine = new HybridSearchEngine(hybridConfig);

    // Initialize context cache
    this.contextCache = createContextCache(10000);
  }

  /**
   * Index a document for retrieval
   */
  async indexDocument(
    content: string,
    options: IndexingOptions
  ): Promise<{ chunksCreated: number; success: boolean; error?: string }> {
    const { collectionName, documentId, documentTitle, metadata, useContextualRetrieval, onProgress } = options;

    try {
      onProgress?.({ stage: 'chunking', current: 0, total: 1 });

      // Chunk the document
      const chunkResult = chunkDocument(
        content,
        this.config.chunkingOptions,
        documentId
      );

      if (chunkResult.chunks.length === 0) {
        return { chunksCreated: 0, success: false, error: 'No chunks created from document' };
      }

      onProgress?.({ stage: 'chunking', current: 1, total: 1 });

      // Apply contextual retrieval if enabled
      let processedChunks: (DocumentChunk | ContextualChunk)[];

      if (useContextualRetrieval && this.config.contextualRetrieval.enabled) {
        onProgress?.({ stage: 'context_generation', current: 0, total: chunkResult.chunks.length });

        if (this.config.contextualRetrieval.useLLM && this.config.model) {
          const contextConfig: ContextGenerationConfig = {
            model: this.config.model,
            onProgress: (p) => onProgress?.({ stage: 'context_generation', current: p.current, total: p.total }),
          };
          processedChunks = await addContextToChunks(
            content,
            chunkResult.chunks,
            contextConfig,
            this.config.contextualRetrieval.cacheEnabled ? this.contextCache : undefined,
            documentId
          );
        } else {
          processedChunks = addLightweightContext(content, chunkResult.chunks, {
            documentTitle,
          });
        }
      } else {
        processedChunks = chunkResult.chunks;
      }

      // Generate embeddings
      onProgress?.({ stage: 'embedding', current: 0, total: processedChunks.length });

      const textsToEmbed = processedChunks.map(chunk => 
        'contextualContent' in chunk ? (chunk as ContextualChunk).contextualContent : chunk.content
      );

      const embeddingResult = await generateEmbeddings(
        textsToEmbed,
        this.config.embeddingConfig,
        this.config.embeddingApiKey
      );

      onProgress?.({ stage: 'embedding', current: processedChunks.length, total: processedChunks.length });

      // Store in collection
      const documents: IndexedDocument[] = processedChunks.map((chunk, i) => ({
        id: chunk.id,
        content: 'contextualContent' in chunk ? (chunk as ContextualChunk).contextualContent : chunk.content,
        embedding: embeddingResult.embeddings[i],
        metadata: {
          ...metadata,
          documentId,
          documentTitle,
          chunkIndex: chunk.index,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          ...chunk.metadata,
        },
      }));

      // Get or create collection
      const existing = this.collections.get(collectionName) || [];
      this.collections.set(collectionName, [...existing, ...documents]);

      // Add to hybrid search engine
      const searchDocs: SearchDocument[] = documents.map(doc => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata as Record<string, unknown>,
      }));
      this.hybridEngine.addDocuments(searchDocs);

      // Cache embeddings
      for (const doc of documents) {
        this.embeddingCache.set(doc.id, doc.embedding);
      }

      onProgress?.({ stage: 'complete', current: 1, total: 1 });

      return { chunksCreated: documents.length, success: true };
    } catch (error) {
      return {
        chunksCreated: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Indexing failed',
      };
    }
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieve(
    collectionName: string,
    query: string
  ): Promise<RAGPipelineContext> {
    const searchMetadata = {
      hybridSearchUsed: false,
      queryExpansionUsed: false,
      rerankingUsed: false,
      originalResultCount: 0,
      finalResultCount: 0,
    };

    try {
      const collection = this.collections.get(collectionName);
      if (!collection || collection.length === 0) {
        return this.emptyContext(query, searchMetadata);
      }

      // Query expansion
      let expandedQuery: ExpandedQuery | undefined;
      let queriesToSearch = [query];

      if (this.config.queryExpansion.enabled && this.config.model) {
        expandedQuery = await expandQuery(query, {
          model: this.config.model,
          maxVariants: this.config.queryExpansion.maxVariants,
          includeHypotheticalAnswer: this.config.queryExpansion.useHyDE,
        });
        queriesToSearch = [query, ...expandedQuery.variants.slice(0, 2)];
        searchMetadata.queryExpansionUsed = true;
      }

      // Perform searches for each query variant
      const allResults: RerankResult[][] = [];

      for (const searchQuery of queriesToSearch) {
        const results = await this.searchSingle(collectionName, searchQuery, collection);
        allResults.push(results);
      }

      // Merge results from all query variants
      const flatResults = allResults.flat();
      const resultSetsForMerge = allResults.map(results => 
        results.map(r => ({ id: r.id, score: r.rerankScore }))
      );
      const mergedResultsRaw = mergeQueryResults(resultSetsForMerge, {
        dedup: true,
        maxResults: this.config.topK * 2,
        scoreAggregation: 'max',
      });

      // Map back to full results
      const resultMap = new Map(flatResults.map(r => [r.id, r]));
      let mergedResults: RerankResult[] = mergedResultsRaw
        .map(r => resultMap.get(r.id))
        .filter((r): r is RerankResult => r !== undefined);

      searchMetadata.originalResultCount = mergedResults.length;

      // Apply reranking
      if (this.config.reranking.enabled && mergedResults.length > 0) {
        const rerankConfig: RerankConfig = {
          model: this.config.reranking.useLLM ? this.config.model : undefined,
          cohereApiKey: this.config.reranking.cohereApiKey,
          topN: this.config.topK,
        };

        const rerankDocs = mergedResults.map(r => ({
          id: r.id,
          content: r.content,
          metadata: r.metadata,
          score: r.rerankScore,
        }));

        if (rerankConfig.model || rerankConfig.cohereApiKey) {
          mergedResults = await rerank(query, rerankDocs, rerankConfig);
        } else {
          mergedResults = rerankWithHeuristics(query, rerankDocs, {
            topN: this.config.topK,
          });
        }
        searchMetadata.rerankingUsed = true;
      }

      // Filter by similarity threshold
      const filteredResults = mergedResults.filter(
        r => r.rerankScore >= this.config.similarityThreshold
      );

      // Take top K
      const topResults = filteredResults.slice(0, this.config.topK);
      searchMetadata.finalResultCount = topResults.length;

      // Format context
      const formattedContext = this.formatContext(topResults);
      const totalTokensEstimate = Math.ceil(formattedContext.length / 4);

      return {
        documents: topResults,
        query,
        expandedQuery,
        formattedContext,
        totalTokensEstimate,
        searchMetadata,
      };
    } catch (error) {
      console.error('Enhanced RAG retrieval error:', error);
      return this.emptyContext(query, searchMetadata);
    }
  }

  /**
   * Perform a single search operation
   */
  private async searchSingle(
    _collectionName: string,
    query: string,
    collection: IndexedDocument[]
  ): Promise<RerankResult[]> {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(
      query,
      this.config.embeddingConfig,
      this.config.embeddingApiKey
    );

    // Perform vector search
    const vectorResults = this.vectorSearch(collection, queryEmbedding.embedding);

    // If hybrid search enabled, combine with keyword search
    if (this.config.hybridSearch.enabled) {
      const hybridResults = this.hybridEngine.hybridSearch(
        vectorResults.map(r => ({ id: r.id, score: r.score })),
        query,
        this.config.topK * 2
      );

      return hybridResults.map(r => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        originalScore: r.vectorScore,
        rerankScore: r.combinedScore,
      }));
    }

    return vectorResults.map(r => ({
      id: r.id,
      content: r.content,
      metadata: r.metadata,
      originalScore: r.score,
      rerankScore: r.score,
    }));
  }

  /**
   * Vector similarity search
   */
  private vectorSearch(
    collection: IndexedDocument[],
    queryEmbedding: number[]
  ): { id: string; content: string; metadata?: Record<string, unknown>; score: number }[] {
    const results = collection.map(doc => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        score,
      };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.topK * 2);
  }


  /**
   * Format retrieved documents into context string
   */
  private formatContext(documents: RerankResult[]): string {
    if (documents.length === 0) return '';

    const parts: string[] = [];
    let currentLength = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const header = `[Source ${i + 1}]`;
      const source = doc.metadata?.source ? ` (${doc.metadata.source})` : '';
      const title = doc.metadata?.title ? `\nTitle: ${doc.metadata.title}` : '';
      const content = `\n${doc.content}`;
      
      const section = `${header}${source}${title}${content}\n`;
      
      if (currentLength + section.length > this.config.maxContextLength) {
        const remaining = this.config.maxContextLength - currentLength;
        if (remaining > 100) {
          parts.push(section.slice(0, remaining) + '...');
        }
        break;
      }

      parts.push(section);
      currentLength += section.length;
    }

    return parts.join('\n');
  }

  /**
   * Create empty context response
   */
  private emptyContext(
    query: string,
    searchMetadata: RAGPipelineContext['searchMetadata']
  ): RAGPipelineContext {
    return {
      documents: [],
      query,
      formattedContext: '',
      totalTokensEstimate: 0,
      searchMetadata,
    };
  }

  /**
   * Delete documents from a collection
   */
  deleteDocuments(collectionName: string, documentIds: string[]): number {
    const collection = this.collections.get(collectionName);
    if (!collection) return 0;

    const idsToDelete = new Set(documentIds);
    const initialLength = collection.length;
    
    const filtered = collection.filter(doc => !idsToDelete.has(doc.id));
    this.collections.set(collectionName, filtered);

    // Remove from hybrid engine
    this.hybridEngine.removeDocuments(documentIds);

    // Remove from embedding cache
    for (const id of documentIds) {
      this.embeddingCache.delete(id);
    }

    return initialLength - filtered.length;
  }

  /**
   * Clear a collection
   */
  clearCollection(collectionName: string): void {
    const collection = this.collections.get(collectionName);
    if (collection) {
      const ids = collection.map(doc => doc.id);
      this.hybridEngine.removeDocuments(ids);
      for (const id of ids) {
        this.embeddingCache.delete(id);
      }
    }
    this.collections.delete(collectionName);
  }

  /**
   * Get collection statistics
   */
  getCollectionStats(collectionName: string): { documentCount: number; exists: boolean } {
    const collection = this.collections.get(collectionName);
    return {
      documentCount: collection?.length ?? 0,
      exists: this.collections.has(collectionName),
    };
  }

  /**
   * List all collections
   */
  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RAGPipelineConfig>): void {
    if (config.hybridSearch) {
      Object.assign(this.config.hybridSearch, config.hybridSearch);
      this.hybridEngine.updateConfig({
        vectorWeight: this.config.hybridSearch.vectorWeight,
        keywordWeight: this.config.hybridSearch.keywordWeight,
      });
    }
    if (config.contextualRetrieval) {
      Object.assign(this.config.contextualRetrieval, config.contextualRetrieval);
    }
    if (config.queryExpansion) {
      Object.assign(this.config.queryExpansion, config.queryExpansion);
    }
    if (config.reranking) {
      Object.assign(this.config.reranking, config.reranking);
    }
    if (config.topK !== undefined) {
      this.config.topK = config.topK;
    }
    if (config.similarityThreshold !== undefined) {
      this.config.similarityThreshold = config.similarityThreshold;
    }
    if (config.maxContextLength !== undefined) {
      this.config.maxContextLength = config.maxContextLength;
    }
  }
}

/**
 * Create a RAG pipeline with default configuration
 */
export function createRAGPipeline(
  config: RAGPipelineConfig
): RAGPipeline {
  return new RAGPipeline(config);
}
