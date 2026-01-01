/**
 * Hybrid Retriever - Multi-strategy memory retrieval system
 * 
 * Combines multiple retrieval strategies:
 * - Vector search (semantic similarity)
 * - Keyword search (BM25-style)
 * - Graph traversal (link-based)
 * - Metadata filtering
 * 
 * References:
 * - Mem0: Hybrid search with reranking
 * - A-Mem: Graph-based memory networks
 * - RAG best practices: Fusion retrieval
 */

import type { Memory, MemoryType, MemoryScope } from '@/types';
import { generateEmbedding, cosineSimilarity, type EmbeddingConfig } from '../embedding';

export interface ScoredMemory {
  memory: Memory;
  score: number;
  matchType: 'vector' | 'keyword' | 'graph' | 'hybrid';
  details?: {
    vectorScore?: number;
    keywordScore?: number;
    graphScore?: number;
    rerankScore?: number;
  };
}

export interface MemoryFilters {
  types?: MemoryType[];
  scope?: MemoryScope;
  sessionId?: string;
  tags?: string[];
  category?: string;
  minPriority?: number;
  enabled?: boolean;
  pinnedOnly?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  usedAfter?: Date;
}

export interface HybridSearchOptions {
  query: string;
  vectorWeight?: number;
  keywordWeight?: number;
  graphWeight?: number;
  limit?: number;
  threshold?: number;
  filters?: MemoryFilters;
  rerank?: boolean;
  embeddingConfig?: EmbeddingConfig;
}

export interface HybridRetrieverConfig {
  defaultVectorWeight: number;
  defaultKeywordWeight: number;
  defaultGraphWeight: number;
  defaultLimit: number;
  defaultThreshold: number;
  enableVectorSearch: boolean;
  enableKeywordSearch: boolean;
  enableGraphSearch: boolean;
  embeddingConfig?: EmbeddingConfig;
}

export const DEFAULT_RETRIEVER_CONFIG: HybridRetrieverConfig = {
  defaultVectorWeight: 0.5,
  defaultKeywordWeight: 0.3,
  defaultGraphWeight: 0.2,
  defaultLimit: 20,
  defaultThreshold: 0.1,
  enableVectorSearch: true,
  enableKeywordSearch: true,
  enableGraphSearch: true,
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for', 'on',
  'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'and', 'but', 'if', 'or', 'because',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'him', 'she', 'her',
  'it', 'its', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
]);

export class HybridRetriever {
  private config: HybridRetrieverConfig;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(config: Partial<HybridRetrieverConfig> = {}) {
    this.config = { ...DEFAULT_RETRIEVER_CONFIG, ...config };
  }

  updateConfig(updates: Partial<HybridRetrieverConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }

  async search(
    memories: Memory[],
    options: HybridSearchOptions
  ): Promise<ScoredMemory[]> {
    const {
      query,
      vectorWeight = this.config.defaultVectorWeight,
      keywordWeight = this.config.defaultKeywordWeight,
      graphWeight = this.config.defaultGraphWeight,
      limit = this.config.defaultLimit,
      threshold = this.config.defaultThreshold,
      filters,
      embeddingConfig = this.config.embeddingConfig,
    } = options;

    // Apply filters first
    const filteredMemories = this.applyFilters(memories, filters);

    // Normalize weights
    const totalWeight = vectorWeight + keywordWeight + graphWeight;
    const normVectorWeight = vectorWeight / totalWeight;
    const normKeywordWeight = keywordWeight / totalWeight;
    const normGraphWeight = graphWeight / totalWeight;

    const resultMap = new Map<string, ScoredMemory>();

    // Vector search
    if (this.config.enableVectorSearch && embeddingConfig && normVectorWeight > 0) {
      const vectorResults = await this.vectorSearch(query, filteredMemories, embeddingConfig);
      for (const result of vectorResults) {
        const existing = resultMap.get(result.memory.id);
        if (existing) {
          existing.score += result.score * normVectorWeight;
          existing.details = { ...existing.details, vectorScore: result.score };
          existing.matchType = 'hybrid';
        } else {
          resultMap.set(result.memory.id, {
            memory: result.memory,
            score: result.score * normVectorWeight,
            matchType: 'vector',
            details: { vectorScore: result.score },
          });
        }
      }
    }

    // Keyword search
    if (this.config.enableKeywordSearch && normKeywordWeight > 0) {
      const keywordResults = this.keywordSearch(query, filteredMemories);
      for (const result of keywordResults) {
        const existing = resultMap.get(result.memory.id);
        if (existing) {
          existing.score += result.score * normKeywordWeight;
          existing.details = { ...existing.details, keywordScore: result.score };
          existing.matchType = 'hybrid';
        } else {
          resultMap.set(result.memory.id, {
            memory: result.memory,
            score: result.score * normKeywordWeight,
            matchType: 'keyword',
            details: { keywordScore: result.score },
          });
        }
      }
    }

    // Graph search (link-based)
    if (this.config.enableGraphSearch && normGraphWeight > 0) {
      const graphResults = this.graphSearch(query, filteredMemories, resultMap);
      for (const result of graphResults) {
        const existing = resultMap.get(result.memory.id);
        if (existing) {
          existing.score += result.score * normGraphWeight;
          existing.details = { ...existing.details, graphScore: result.score };
          existing.matchType = 'hybrid';
        } else {
          resultMap.set(result.memory.id, {
            memory: result.memory,
            score: result.score * normGraphWeight,
            matchType: 'graph',
            details: { graphScore: result.score },
          });
        }
      }
    }

    // Filter by threshold and sort
    const results = Array.from(resultMap.values())
      .filter(r => r.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  async vectorSearch(
    query: string,
    memories: Memory[],
    embeddingConfig: EmbeddingConfig
  ): Promise<ScoredMemory[]> {
    const results: ScoredMemory[] = [];

    try {
      const queryEmbedding = await this.getEmbedding(query, 'query', embeddingConfig);

      for (const memory of memories) {
        let memoryEmbedding: number[];

        if (memory.embedding) {
          memoryEmbedding = memory.embedding;
        } else {
          memoryEmbedding = await this.getEmbedding(memory.content, memory.id, embeddingConfig);
        }

        const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);

        if (similarity > 0.2) {
          results.push({
            memory,
            score: similarity,
            matchType: 'vector',
            details: { vectorScore: similarity },
          });
        }
      }
    } catch (error) {
      console.warn('Vector search failed:', error);
    }

    return results.sort((a, b) => b.score - a.score);
  }

  keywordSearch(query: string, memories: Memory[]): ScoredMemory[] {
    const results: ScoredMemory[] = [];
    const queryTerms = this.tokenize(query);

    if (queryTerms.length === 0) return results;

    // Calculate IDF for query terms
    const documentFrequency = new Map<string, number>();
    for (const memory of memories) {
      const memoryTerms = new Set(this.tokenize(memory.content));
      for (const term of queryTerms) {
        if (memoryTerms.has(term)) {
          documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
        }
      }
    }

    const totalDocs = memories.length;
    const idf = new Map<string, number>();
    for (const [term, df] of documentFrequency) {
      idf.set(term, Math.log((totalDocs + 1) / (df + 1)) + 1);
    }

    // Calculate BM25-style scores
    const k1 = 1.5;
    const b = 0.75;
    const avgDocLength = memories.reduce((sum, m) => sum + this.tokenize(m.content).length, 0) / totalDocs;

    for (const memory of memories) {
      const memoryTerms = this.tokenize(memory.content);
      const termFrequency = new Map<string, number>();

      for (const term of memoryTerms) {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      }

      let score = 0;
      const docLength = memoryTerms.length;

      for (const term of queryTerms) {
        const tf = termFrequency.get(term) || 0;
        const termIdf = idf.get(term) || 0;

        if (tf > 0) {
          const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)));
          score += termIdf * tfNorm;
        }
      }

      // Normalize score
      const maxPossibleScore = queryTerms.length * Math.max(...Array.from(idf.values()), 1);
      const normalizedScore = maxPossibleScore > 0 ? score / maxPossibleScore : 0;

      if (normalizedScore > 0.05) {
        results.push({
          memory,
          score: normalizedScore,
          matchType: 'keyword',
          details: { keywordScore: normalizedScore },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  graphSearch(
    query: string,
    memories: Memory[],
    existingResults: Map<string, ScoredMemory>
  ): ScoredMemory[] {
    const results: ScoredMemory[] = [];

    // Get top results from existing searches as seed nodes
    const seedMemories = Array.from(existingResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => r.memory);

    if (seedMemories.length === 0) return results;

    // Find memories connected via shared tags
    const tagConnections = new Map<string, Set<string>>();
    for (const memory of memories) {
      for (const tag of memory.tags || []) {
        if (!tagConnections.has(tag)) {
          tagConnections.set(tag, new Set());
        }
        tagConnections.get(tag)!.add(memory.id);
      }
    }

    // Find connected memories
    const connectedIds = new Set<string>();
    for (const seed of seedMemories) {
      for (const tag of seed.tags || []) {
        const connected = tagConnections.get(tag);
        if (connected) {
          for (const id of connected) {
            if (id !== seed.id && !existingResults.has(id)) {
              connectedIds.add(id);
            }
          }
        }
      }
    }

    // Score connected memories by connection strength
    const memoryMap = new Map(memories.map(m => [m.id, m]));

    for (const id of connectedIds) {
      const memory = memoryMap.get(id);
      if (!memory) continue;

      // Calculate connection score based on shared tags with seed memories
      let connectionScore = 0;
      const memoryTags = new Set(memory.tags || []);

      for (const seed of seedMemories) {
        const seedTags = new Set(seed.tags || []);
        const sharedTags = [...memoryTags].filter(t => seedTags.has(t));
        connectionScore += sharedTags.length / Math.max(memoryTags.size, seedTags.size, 1);
      }

      connectionScore /= seedMemories.length;

      if (connectionScore > 0.1) {
        results.push({
          memory,
          score: connectionScore,
          matchType: 'graph',
          details: { graphScore: connectionScore },
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private applyFilters(memories: Memory[], filters?: MemoryFilters): Memory[] {
    if (!filters) return memories.filter(m => m.enabled);

    return memories.filter(m => {
      if (filters.enabled !== undefined && m.enabled !== filters.enabled) return false;
      if (filters.types && filters.types.length > 0 && !filters.types.includes(m.type)) return false;
      if (filters.scope && m.scope !== filters.scope) return false;
      if (filters.sessionId && m.sessionId && m.sessionId !== filters.sessionId && m.scope !== 'global') return false;
      if (filters.tags && filters.tags.length > 0) {
        const memoryTags = m.tags || [];
        if (!filters.tags.some(t => memoryTags.includes(t))) return false;
      }
      if (filters.category && m.category !== filters.category) return false;
      if (filters.minPriority !== undefined && (m.priority ?? 5) < filters.minPriority) return false;
      if (filters.pinnedOnly && !m.pinned) return false;

      const createdAt = m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt);
      const lastUsedAt = m.lastUsedAt instanceof Date ? m.lastUsedAt : new Date(m.lastUsedAt);

      if (filters.createdAfter && createdAt < filters.createdAfter) return false;
      if (filters.createdBefore && createdAt > filters.createdBefore) return false;
      if (filters.usedAfter && lastUsedAt < filters.usedAfter) return false;

      return true;
    });
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  }

  private async getEmbedding(
    text: string,
    cacheKey: string,
    config: EmbeddingConfig
  ): Promise<number[]> {
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const result = await generateEmbedding(text, config);
    this.embeddingCache.set(cacheKey, result.embedding);
    return result.embedding;
  }

  async reciprocalRankFusion(
    results: ScoredMemory[][],
    k: number = 60
  ): Promise<ScoredMemory[]> {
    const fusedScores = new Map<string, { memory: Memory; score: number; sources: string[] }>();

    for (let listIdx = 0; listIdx < results.length; listIdx++) {
      const resultList = results[listIdx];
      for (let rank = 0; rank < resultList.length; rank++) {
        const result = resultList[rank];
        const rrfScore = 1 / (k + rank + 1);

        const existing = fusedScores.get(result.memory.id);
        if (existing) {
          existing.score += rrfScore;
          existing.sources.push(result.matchType);
        } else {
          fusedScores.set(result.memory.id, {
            memory: result.memory,
            score: rrfScore,
            sources: [result.matchType],
          });
        }
      }
    }

    return Array.from(fusedScores.values())
      .map(item => ({
        memory: item.memory,
        score: item.score,
        matchType: item.sources.length > 1 ? 'hybrid' as const : item.sources[0] as ScoredMemory['matchType'],
      }))
      .sort((a, b) => b.score - a.score);
  }

  async searchWithFallback(
    memories: Memory[],
    options: HybridSearchOptions
  ): Promise<ScoredMemory[]> {
    const { limit = this.config.defaultLimit } = options;

    // Try hybrid search first
    const results = await this.search(memories, options);

    // If not enough results, try keyword-only search with lower threshold
    if (results.length < limit / 2) {
      const keywordResults = this.keywordSearch(options.query, this.applyFilters(memories, options.filters));
      const existingIds = new Set(results.map(r => r.memory.id));
      const additionalResults = keywordResults.filter(r => !existingIds.has(r.memory.id));
      return [...results, ...additionalResults].slice(0, limit);
    }

    return results.slice(0, limit);
  }
}

export function createHybridRetriever(
  config?: Partial<HybridRetrieverConfig>
): HybridRetriever {
  return new HybridRetriever(config);
}

export default HybridRetriever;
