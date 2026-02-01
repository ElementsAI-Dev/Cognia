/**
 * Memory Activator - Context-aware memory activation system
 * 
 * Implements multiple activation strategies based on latest research:
 * - Semantic activation (embedding similarity)
 * - Associative activation (link graph traversal)
 * - Temporal activation (time-based relevance)
 * - Intent-based activation (user intent matching)
 * - Hybrid activation (combining all strategies)
 * 
 * References:
 * - A-Mem: Agentic Memory for LLM Agents (Zettelkasten-inspired)
 * - GAM: General Agentic Memory (JIT compilation principle)
 * - Mem0: Memory retrieval with criteria-based ranking
 */

import type { Memory, MemoryType } from '@/types';
import { generateEmbedding, cosineSimilarity, type EmbeddingConfig } from '../embedding';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export type ActivationReasonType =
  | 'semantic_match'
  | 'keyword_match'
  | 'tag_match'
  | 'temporal_relevance'
  | 'associative_link'
  | 'pinned'
  | 'high_priority'
  | 'recent_usage'
  | 'intent_match'
  | 'emotional_match';

export interface ActivationReason {
  type: ActivationReasonType;
  description: string;
  contribution: number;
  details?: Record<string, unknown>;
}

export type RelevanceType = 'direct' | 'associative' | 'temporal' | 'semantic' | 'contextual';

export interface ActivatedMemory {
  memory: Memory;
  activationScore: number;
  activationReasons: ActivationReason[];
  relevanceType: RelevanceType;
  embedding?: number[];
}

export interface MemoryActivationContext {
  currentMessage: string;
  recentMessages?: Array<{ role: string; content: string }>;
  sessionId?: string;
  userIntent?: string;
  emotionalTone?: string;
  timeContext?: Date;
  priorityTags?: string[];
  focusTypes?: MemoryType[];
  limit?: number;
  threshold?: number;
}

export interface TimeRange {
  start?: Date;
  end?: Date;
  relativeDays?: number;
}

export interface MemoryActivatorConfig {
  semanticWeight: number;
  keywordWeight: number;
  temporalWeight: number;
  priorityWeight: number;
  recencyWeight: number;
  minThreshold: number;
  enableSemantic: boolean;
  temporalDecayDays: number;
  embeddingConfig?: EmbeddingConfig;
}

export const DEFAULT_ACTIVATOR_CONFIG: MemoryActivatorConfig = {
  semanticWeight: 0.4,
  keywordWeight: 0.2,
  temporalWeight: 0.1,
  priorityWeight: 0.15,
  recencyWeight: 0.15,
  minThreshold: 0.1,
  enableSemantic: true,
  temporalDecayDays: 30,
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
  'because', 'until', 'while', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'him', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'this', 'that',
]);

export class MemoryActivator {
  private config: MemoryActivatorConfig;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(config: Partial<MemoryActivatorConfig> = {}) {
    this.config = { ...DEFAULT_ACTIVATOR_CONFIG, ...config };
  }

  updateConfig(updates: Partial<MemoryActivatorConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }

  async activate(
    memories: Memory[],
    context: MemoryActivationContext
  ): Promise<ActivatedMemory[]> {
    const {
      sessionId,
      focusTypes,
      limit = 20,
      threshold = this.config.minThreshold,
    } = context;

    let filteredMemories = memories.filter(m => m.enabled);

    if (sessionId) {
      filteredMemories = filteredMemories.filter(
        m => !m.sessionId || m.sessionId === sessionId || m.scope === 'global'
      );
    }

    if (focusTypes && focusTypes.length > 0) {
      filteredMemories = filteredMemories.filter(m => focusTypes.includes(m.type));
    }

    const scoredMemories: ActivatedMemory[] = [];

    for (const memory of filteredMemories) {
      const result = await this.scoreMemory(memory, context);
      if (result.activationScore >= threshold) {
        scoredMemories.push(result);
      }
    }

    return scoredMemories
      .sort((a, b) => b.activationScore - a.activationScore)
      .slice(0, limit);
  }

  private async scoreMemory(
    memory: Memory,
    context: MemoryActivationContext
  ): Promise<ActivatedMemory> {
    const reasons: ActivationReason[] = [];
    let totalScore = 0;
    let relevanceType: RelevanceType = 'contextual';

    // Pinned memories
    if (memory.pinned) {
      const contribution = this.config.priorityWeight;
      reasons.push({
        type: 'pinned',
        description: 'Memory is pinned',
        contribution,
      });
      totalScore += contribution;
      relevanceType = 'direct';
    }

    // Priority scoring
    const priority = memory.priority ?? 5;
    if (priority > 5) {
      const contribution = ((priority - 5) / 5) * this.config.priorityWeight * 0.5;
      reasons.push({
        type: 'high_priority',
        description: `High priority (${priority}/10)`,
        contribution,
      });
      totalScore += contribution;
    }

    // Keyword matching
    const keywordScore = this.calculateKeywordMatch(memory.content, context.currentMessage);
    if (keywordScore > 0) {
      const contribution = keywordScore * this.config.keywordWeight;
      reasons.push({
        type: 'keyword_match',
        description: `Keyword overlap (${(keywordScore * 100).toFixed(0)}%)`,
        contribution,
        details: { score: keywordScore },
      });
      totalScore += contribution;
      if (keywordScore > 0.5) {
        relevanceType = 'direct';
      }
    }

    // Tag matching
    if (context.priorityTags && context.priorityTags.length > 0 && memory.tags) {
      const matchingTags = context.priorityTags.filter(t => memory.tags?.includes(t));
      if (matchingTags.length > 0) {
        const contribution = (matchingTags.length / context.priorityTags.length) * 0.2;
        reasons.push({
          type: 'tag_match',
          description: `Matching tags: ${matchingTags.join(', ')}`,
          contribution,
          details: { matchingTags },
        });
        totalScore += contribution;
      }
    }

    // Recency scoring
    const recencyScore = this.calculateRecencyScore(memory);
    if (recencyScore > 0) {
      const contribution = recencyScore * this.config.recencyWeight;
      reasons.push({
        type: 'recent_usage',
        description: `Recently used (${this.getDaysAgo(memory.lastUsedAt)} days ago)`,
        contribution,
        details: { daysAgo: this.getDaysAgo(memory.lastUsedAt) },
      });
      totalScore += contribution;
    }

    // Semantic similarity
    if (this.config.enableSemantic && this.config.embeddingConfig) {
      try {
        const semanticScore = await this.calculateSemanticSimilarity(
          memory,
          context.currentMessage
        );
        if (semanticScore > 0.3) {
          const contribution = semanticScore * this.config.semanticWeight;
          reasons.push({
            type: 'semantic_match',
            description: `Semantic similarity (${(semanticScore * 100).toFixed(0)}%)`,
            contribution,
            details: { score: semanticScore },
          });
          totalScore += contribution;
          if (semanticScore > 0.7) {
            relevanceType = 'semantic';
          }
        }
      } catch (error) {
        log.warn('Semantic scoring failed', { error: String(error) });
      }
    }

    // Intent matching
    if (context.userIntent) {
      const intentScore = this.calculateIntentMatch(memory, context.userIntent);
      if (intentScore > 0) {
        const contribution = intentScore * 0.1;
        reasons.push({
          type: 'intent_match',
          description: `Matches user intent: ${context.userIntent}`,
          contribution,
        });
        totalScore += contribution;
      }
    }

    const normalizedScore = Math.min(1, totalScore);

    return {
      memory,
      activationScore: normalizedScore,
      activationReasons: reasons,
      relevanceType,
    };
  }

  private calculateKeywordMatch(memoryContent: string, query: string): number {
    const extractWords = (text: string): Set<string> => {
      return new Set(
        text
          .toLowerCase()
          .split(/\s+/)
          .map(w => w.replace(/[^a-z0-9]/g, ''))
          .filter(w => w.length > 2 && !STOP_WORDS.has(w))
      );
    };

    const memoryWords = extractWords(memoryContent);
    const queryWords = extractWords(query);

    if (queryWords.size === 0) return 0;

    const intersection = [...queryWords].filter(w => memoryWords.has(w));
    const queryCoverage = intersection.length / queryWords.size;
    const memoryCoverage = intersection.length / Math.max(memoryWords.size, 1);

    return queryCoverage * 0.7 + memoryCoverage * 0.3;
  }

  private calculateRecencyScore(memory: Memory): number {
    const daysAgo = this.getDaysAgo(memory.lastUsedAt);
    if (daysAgo <= 0) return 1;
    if (daysAgo >= this.config.temporalDecayDays) return 0.1;
    return Math.exp(-daysAgo / this.config.temporalDecayDays);
  }

  private getDaysAgo(date: Date | string): number {
    const d = date instanceof Date ? date : new Date(date);
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  private async calculateSemanticSimilarity(
    memory: Memory,
    query: string
  ): Promise<number> {
    if (!this.config.embeddingConfig) return 0;

    const queryEmbedding = await this.getEmbedding(query, 'query');
    let memoryEmbedding: number[];
    
    if (memory.embedding) {
      memoryEmbedding = memory.embedding;
    } else {
      memoryEmbedding = await this.getEmbedding(memory.content, memory.id);
    }

    return cosineSimilarity(queryEmbedding, memoryEmbedding);
  }

  private async getEmbedding(text: string, cacheKey: string): Promise<number[]> {
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    if (!this.config.embeddingConfig) {
      throw new Error('Embedding config not provided');
    }

    const result = await generateEmbedding(text, this.config.embeddingConfig);
    this.embeddingCache.set(cacheKey, result.embedding);
    return result.embedding;
  }

  private calculateIntentMatch(memory: Memory, intent: string): number {
    const intentMemoryMap: Record<string, MemoryType[]> = {
      question: ['fact', 'context'],
      request: ['instruction', 'preference'],
      statement: ['fact', 'context'],
      command: ['instruction'],
      preference: ['preference'],
    };

    const relevantTypes = intentMemoryMap[intent.toLowerCase()] || [];
    return relevantTypes.includes(memory.type) ? 0.5 : 0;
  }

  async semanticActivation(
    query: string,
    memories: Memory[],
    options: { limit?: number; threshold?: number } = {}
  ): Promise<ActivatedMemory[]> {
    const { limit = 10, threshold = 0.3 } = options;

    if (!this.config.embeddingConfig) {
      log.warn('Semantic activation requires embedding config');
      return [];
    }

    const results: ActivatedMemory[] = [];

    for (const memory of memories.filter(m => m.enabled)) {
      try {
        const score = await this.calculateSemanticSimilarity(memory, query);
        if (score >= threshold) {
          results.push({
            memory,
            activationScore: score,
            activationReasons: [{
              type: 'semantic_match',
              description: `Semantic similarity: ${(score * 100).toFixed(0)}%`,
              contribution: score,
            }],
            relevanceType: 'semantic',
          });
        }
      } catch (error) {
        log.warn('Failed to compute semantic similarity', { error: String(error) });
      }
    }

    return results.sort((a, b) => b.activationScore - a.activationScore).slice(0, limit);
  }

  temporalActivation(
    memories: Memory[],
    timeRange: TimeRange,
    options: { limit?: number } = {}
  ): ActivatedMemory[] {
    const { limit = 20 } = options;
    const now = new Date();

    let start: Date | undefined;
    let end: Date | undefined;

    if (timeRange.relativeDays) {
      start = new Date(now.getTime() + timeRange.relativeDays * 24 * 60 * 60 * 1000);
      end = now;
    } else {
      start = timeRange.start;
      end = timeRange.end;
    }

    const results: ActivatedMemory[] = [];

    for (const memory of memories.filter(m => m.enabled)) {
      const createdAt = memory.createdAt instanceof Date ? memory.createdAt : new Date(memory.createdAt);
      const lastUsedAt = memory.lastUsedAt instanceof Date ? memory.lastUsedAt : new Date(memory.lastUsedAt);
      const relevantDate = lastUsedAt > createdAt ? lastUsedAt : createdAt;

      let inRange = true;
      if (start && relevantDate < start) inRange = false;
      if (end && relevantDate > end) inRange = false;

      if (inRange) {
        const recencyScore = this.calculateRecencyScore(memory);
        results.push({
          memory,
          activationScore: recencyScore,
          activationReasons: [{
            type: 'temporal_relevance',
            description: `Within time range (${this.getDaysAgo(relevantDate)} days ago)`,
            contribution: recencyScore,
          }],
          relevanceType: 'temporal',
        });
      }
    }

    return results.sort((a, b) => b.activationScore - a.activationScore).slice(0, limit);
  }

  keywordActivation(
    query: string,
    memories: Memory[],
    options: { limit?: number; threshold?: number } = {}
  ): ActivatedMemory[] {
    const { limit = 20, threshold = 0.1 } = options;
    const results: ActivatedMemory[] = [];

    for (const memory of memories.filter(m => m.enabled)) {
      const score = this.calculateKeywordMatch(memory.content, query);
      if (score >= threshold) {
        results.push({
          memory,
          activationScore: score,
          activationReasons: [{
            type: 'keyword_match',
            description: `Keyword match: ${(score * 100).toFixed(0)}%`,
            contribution: score,
          }],
          relevanceType: 'direct',
        });
      }
    }

    return results.sort((a, b) => b.activationScore - a.activationScore).slice(0, limit);
  }

  async hybridActivation(
    context: MemoryActivationContext,
    memories: Memory[],
    weights?: { semantic?: number; keyword?: number; temporal?: number }
  ): Promise<ActivatedMemory[]> {
    const { limit = 20 } = context;
    const w = {
      semantic: weights?.semantic ?? 0.5,
      keyword: weights?.keyword ?? 0.3,
      temporal: weights?.temporal ?? 0.2,
    };

    const resultMap = new Map<string, ActivatedMemory>();

    // Keyword activation
    const keywordResults = this.keywordActivation(context.currentMessage, memories, { limit: limit * 2 });
    for (const result of keywordResults) {
      const existing = resultMap.get(result.memory.id);
      if (existing) {
        existing.activationScore += result.activationScore * w.keyword;
        existing.activationReasons.push(...result.activationReasons);
      } else {
        result.activationScore *= w.keyword;
        resultMap.set(result.memory.id, result);
      }
    }

    // Semantic activation
    if (this.config.enableSemantic && this.config.embeddingConfig) {
      const semanticResults = await this.semanticActivation(
        context.currentMessage,
        memories,
        { limit: limit * 2 }
      );
      for (const result of semanticResults) {
        const existing = resultMap.get(result.memory.id);
        if (existing) {
          existing.activationScore += result.activationScore * w.semantic;
          existing.activationReasons.push(...result.activationReasons);
          if (result.activationScore > 0.7) {
            existing.relevanceType = 'semantic';
          }
        } else {
          result.activationScore *= w.semantic;
          resultMap.set(result.memory.id, result);
        }
      }
    }

    // Temporal activation
    const temporalResults = this.temporalActivation(memories, { relativeDays: -7 }, { limit: limit * 2 });
    for (const result of temporalResults) {
      const existing = resultMap.get(result.memory.id);
      if (existing) {
        existing.activationScore += result.activationScore * w.temporal;
        existing.activationReasons.push(...result.activationReasons);
      } else {
        result.activationScore *= w.temporal;
        resultMap.set(result.memory.id, result);
      }
    }

    return Array.from(resultMap.values())
      .sort((a, b) => b.activationScore - a.activationScore)
      .slice(0, limit);
  }
}

export function createMemoryActivator(
  config?: Partial<MemoryActivatorConfig>
): MemoryActivator {
  return new MemoryActivator(config);
}

export default MemoryActivator;
