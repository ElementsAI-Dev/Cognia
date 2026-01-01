/**
 * Memory Reranker - Re-score and reorder retrieved memories
 * 
 * Implements multiple reranking strategies:
 * - LLM-based relevance scoring
 * - Criteria-based ranking (Mem0-style)
 * - Cross-encoder scoring
 * - Diversity-aware reranking
 * 
 * References:
 * - Mem0: Criteria Retrieval with custom scoring
 * - Cohere Rerank API patterns
 * - RAG reranking best practices
 */

import type { Memory } from '@/types';
import type { ScoredMemory } from './hybrid-retriever';

export interface RelevanceCriteria {
  name: string;
  description: string;
  weight: number;
}

export interface RerankerConfig {
  provider: 'llm' | 'rule-based' | 'hybrid';
  criteria?: RelevanceCriteria[];
  temperature?: number;
  maxTokens?: number;
  diversityPenalty?: number;
  llmScorer?: LLMScorer;
}

export interface LLMScorer {
  score: (query: string, documents: string[], criteria?: RelevanceCriteria[]) => Promise<number[]>;
}

export interface RerankedMemory extends ScoredMemory {
  originalRank: number;
  rerankScore: number;
  criteriaScores?: Record<string, number>;
}

export const DEFAULT_RERANKER_CONFIG: RerankerConfig = {
  provider: 'rule-based',
  temperature: 0,
  diversityPenalty: 0.1,
  criteria: [
    {
      name: 'relevance',
      description: 'How directly relevant is the memory to the query',
      weight: 0.4,
    },
    {
      name: 'recency',
      description: 'How recently the memory was used or created',
      weight: 0.2,
    },
    {
      name: 'specificity',
      description: 'How specific and actionable is the information',
      weight: 0.2,
    },
    {
      name: 'reliability',
      description: 'How reliable is the source (explicit vs inferred)',
      weight: 0.2,
    },
  ],
};

export class MemoryReranker {
  private config: RerankerConfig;

  constructor(config: Partial<RerankerConfig> = {}) {
    this.config = { ...DEFAULT_RERANKER_CONFIG, ...config };
  }

  updateConfig(updates: Partial<RerankerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  async rerank(
    query: string,
    memories: ScoredMemory[],
    options: { limit?: number; minScore?: number } = {}
  ): Promise<RerankedMemory[]> {
    const { limit = memories.length, minScore = 0 } = options;

    if (memories.length === 0) return [];

    let rerankedMemories: RerankedMemory[];

    switch (this.config.provider) {
      case 'llm':
        rerankedMemories = await this.rerankWithLLM(query, memories);
        break;
      case 'hybrid':
        rerankedMemories = await this.rerankHybrid(query, memories);
        break;
      case 'rule-based':
      default:
        rerankedMemories = this.rerankWithRules(query, memories);
        break;
    }

    // Apply diversity penalty to reduce redundancy
    if (this.config.diversityPenalty && this.config.diversityPenalty > 0) {
      rerankedMemories = this.applyDiversityPenalty(rerankedMemories);
    }

    return rerankedMemories
      .filter(m => m.rerankScore >= minScore)
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, limit);
  }

  private rerankWithRules(query: string, memories: ScoredMemory[]): RerankedMemory[] {
    const queryTerms = this.tokenize(query);
    const criteria = this.config.criteria || DEFAULT_RERANKER_CONFIG.criteria!;

    return memories.map((mem, index) => {
      const criteriaScores: Record<string, number> = {};
      let totalScore = 0;

      for (const criterion of criteria) {
        const score = this.scoreCriterion(criterion, mem.memory, query, queryTerms);
        criteriaScores[criterion.name] = score;
        totalScore += score * criterion.weight;
      }

      // Combine with original retrieval score
      const combinedScore = totalScore * 0.6 + mem.score * 0.4;

      return {
        ...mem,
        originalRank: index,
        rerankScore: combinedScore,
        criteriaScores,
      };
    });
  }

  private async rerankWithLLM(query: string, memories: ScoredMemory[]): Promise<RerankedMemory[]> {
    if (!this.config.llmScorer) {
      console.warn('LLM scorer not configured, falling back to rule-based');
      return this.rerankWithRules(query, memories);
    }

    try {
      const documents = memories.map(m => m.memory.content);
      const scores = await this.config.llmScorer.score(query, documents, this.config.criteria);

      return memories.map((mem, index) => ({
        ...mem,
        originalRank: index,
        rerankScore: scores[index] ?? mem.score,
      }));
    } catch (error) {
      console.warn('LLM reranking failed, falling back to rule-based:', error);
      return this.rerankWithRules(query, memories);
    }
  }

  private async rerankHybrid(query: string, memories: ScoredMemory[]): Promise<RerankedMemory[]> {
    // Get rule-based scores
    const ruleBasedResults = this.rerankWithRules(query, memories);

    // If LLM scorer available, combine scores
    if (this.config.llmScorer) {
      try {
        const documents = memories.map(m => m.memory.content);
        const llmScores = await this.config.llmScorer.score(query, documents, this.config.criteria);

        return ruleBasedResults.map((result, index) => ({
          ...result,
          rerankScore: result.rerankScore * 0.5 + (llmScores[index] ?? 0) * 0.5,
        }));
      } catch (error) {
        console.warn('LLM scoring failed in hybrid mode:', error);
      }
    }

    return ruleBasedResults;
  }

  private scoreCriterion(
    criterion: RelevanceCriteria,
    memory: Memory,
    query: string,
    queryTerms: string[]
  ): number {
    switch (criterion.name.toLowerCase()) {
      case 'relevance':
        return this.scoreRelevance(memory, query, queryTerms);
      case 'recency':
        return this.scoreRecency(memory);
      case 'specificity':
        return this.scoreSpecificity(memory);
      case 'reliability':
        return this.scoreReliability(memory);
      default:
        return this.scoreGeneric(criterion, memory, query);
    }
  }

  private scoreRelevance(memory: Memory, query: string, queryTerms: string[]): number {
    const memoryTerms = this.tokenize(memory.content);
    const memoryTermSet = new Set(memoryTerms);

    // Term overlap
    const overlap = queryTerms.filter(t => memoryTermSet.has(t));
    const overlapScore = overlap.length / Math.max(queryTerms.length, 1);

    // Exact phrase match bonus
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();
    const phraseBonus = contentLower.includes(queryLower) ? 0.3 : 0;

    // Type relevance bonus
    const typeBonus = this.getTypeRelevanceBonus(memory.type, query);

    return Math.min(1, overlapScore * 0.5 + phraseBonus + typeBonus);
  }

  private scoreRecency(memory: Memory): number {
    const lastUsedAt = memory.lastUsedAt instanceof Date ? memory.lastUsedAt : new Date(memory.lastUsedAt);
    const daysAgo = (Date.now() - lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysAgo <= 1) return 1;
    if (daysAgo <= 7) return 0.8;
    if (daysAgo <= 30) return 0.5;
    if (daysAgo <= 90) return 0.3;
    return 0.1;
  }

  private scoreSpecificity(memory: Memory): number {
    const content = memory.content;

    // Longer, more detailed content is more specific
    const lengthScore = Math.min(1, content.length / 200);

    // Having tags indicates more specific organization
    const tagBonus = (memory.tags?.length || 0) > 0 ? 0.2 : 0;

    // Having a category is more specific
    const categoryBonus = memory.category ? 0.1 : 0;

    // Instructions and facts are typically more specific
    const typeBonus = ['instruction', 'fact'].includes(memory.type) ? 0.2 : 0;

    return Math.min(1, lengthScore * 0.5 + tagBonus + categoryBonus + typeBonus);
  }

  private scoreReliability(memory: Memory): number {
    // Explicit memories are most reliable
    if (memory.source === 'explicit') return 1;
    
    // AI-suggested memories have been validated
    if (memory.source === 'ai-suggested') return 0.8;
    
    // Inferred memories are less reliable
    if (memory.source === 'inferred') return 0.6;

    // Pinned memories have user validation
    if (memory.pinned) return 0.9;

    // High use count indicates reliability
    const useCountBonus = Math.min(0.3, memory.useCount * 0.05);

    return 0.5 + useCountBonus;
  }

  private scoreGeneric(criterion: RelevanceCriteria, memory: Memory, query: string): number {
    // For custom criteria, use keyword matching against criterion description
    const criterionKeywords = this.tokenize(criterion.description);
    const memoryTerms = new Set(this.tokenize(memory.content));
    const queryTerms = new Set(this.tokenize(query));

    // Check if memory content relates to criterion
    const contentMatch = criterionKeywords.filter(k => memoryTerms.has(k)).length / Math.max(criterionKeywords.length, 1);

    // Check if query relates to criterion
    const queryMatch = criterionKeywords.filter(k => queryTerms.has(k)).length / Math.max(criterionKeywords.length, 1);

    return contentMatch * 0.7 + queryMatch * 0.3;
  }

  private getTypeRelevanceBonus(memoryType: string, query: string): number {
    const queryLower = query.toLowerCase();

    const typeKeywords: Record<string, string[]> = {
      preference: ['prefer', 'like', 'want', 'favorite', 'enjoy', 'hate', 'avoid'],
      fact: ['who', 'what', 'where', 'name', 'work', 'live', 'email', 'phone'],
      instruction: ['how', 'always', 'never', 'remember', 'make sure', 'when'],
      context: ['project', 'task', 'working on', 'building', 'goal', 'objective'],
    };

    const keywords = typeKeywords[memoryType] || [];
    const hasMatch = keywords.some(k => queryLower.includes(k));

    return hasMatch ? 0.2 : 0;
  }

  private applyDiversityPenalty(memories: RerankedMemory[]): RerankedMemory[] {
    if (memories.length <= 1) return memories;

    const penalty = this.config.diversityPenalty || 0.1;
    const selected: RerankedMemory[] = [];
    const remaining = [...memories];

    // Greedy selection with diversity penalty
    while (remaining.length > 0 && selected.length < memories.length) {
      // First item is always selected as-is
      if (selected.length === 0) {
        selected.push(remaining.shift()!);
        continue;
      }

      // Apply diversity penalty based on similarity to already selected
      for (const mem of remaining) {
        let maxSimilarity = 0;
        for (const sel of selected) {
          const similarity = this.calculateTextSimilarity(mem.memory.content, sel.memory.content);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
        mem.rerankScore = mem.rerankScore * (1 - maxSimilarity * penalty);
      }

      // Re-sort and select best
      remaining.sort((a, b) => b.rerankScore - a.rerankScore);
      selected.push(remaining.shift()!);
    }

    return selected;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const terms1 = new Set(this.tokenize(text1));
    const terms2 = new Set(this.tokenize(text2));

    const intersection = [...terms1].filter(t => terms2.has(t));
    const union = new Set([...terms1, ...terms2]);

    return intersection.length / Math.max(union.size, 1);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9]/g, ''))
      .filter(w => w.length > 2);
  }

  createLLMScorerPrompt(query: string, documents: string[], criteria?: RelevanceCriteria[]): string {
    const criteriaText = criteria
      ? criteria.map(c => `- ${c.name} (weight: ${c.weight}): ${c.description}`).join('\n')
      : 'General relevance to the query';

    return `Score each document's relevance to the query on a scale of 0-1.

Query: "${query}"

Scoring Criteria:
${criteriaText}

Documents to score:
${documents.map((d, i) => `[${i}] ${d}`).join('\n\n')}

Return ONLY a JSON array of scores, one for each document, e.g., [0.8, 0.3, 0.9]
Be consistent and use temperature 0 for reproducible scoring.`;
  }
}

export function createMemoryReranker(config?: Partial<RerankerConfig>): MemoryReranker {
  return new MemoryReranker(config);
}

export default MemoryReranker;
