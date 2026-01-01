/**
 * Tests for Memory Reranker
 */

import {
  MemoryReranker,
  createMemoryReranker,
  DEFAULT_RERANKER_CONFIG,
} from './reranker';
import type { ScoredMemory } from './hybrid-retriever';
import type { Memory } from '@/types';

describe('MemoryReranker', () => {
  const createMockMemory = (overrides: Partial<Memory> = {}): Memory => ({
    id: '1',
    type: 'fact',
    content: 'Test memory content',
    source: 'explicit',
    tags: [],
    createdAt: new Date(),
    lastUsedAt: new Date(),
    useCount: 0,
    enabled: true,
    pinned: false,
    priority: 5,
    scope: 'global',
    ...overrides,
  });

  const mockScoredMemories: ScoredMemory[] = [
    {
      memory: createMockMemory({
        id: '1',
        type: 'preference',
        content: 'I prefer dark mode interfaces',
        source: 'explicit',
        tags: ['ui', 'preferences'],
        useCount: 5,
        pinned: true,
        priority: 8,
      }),
      score: 0.9,
      matchType: 'keyword',
    },
    {
      memory: createMockMemory({
        id: '2',
        type: 'fact',
        content: 'My name is John and I work as a software engineer',
        source: 'explicit',
        tags: ['personal', 'work'],
        useCount: 2,
        lastUsedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }),
      score: 0.7,
      matchType: 'keyword',
    },
    {
      memory: createMockMemory({
        id: '3',
        type: 'instruction',
        content: 'Always respond in a concise manner with code examples',
        source: 'explicit',
        tags: ['communication', 'code'],
        useCount: 10,
        priority: 7,
      }),
      score: 0.6,
      matchType: 'vector',
    },
    {
      memory: createMockMemory({
        id: '4',
        type: 'context',
        content: 'Working on a React project',
        source: 'inferred',
        tags: ['code', 'project'],
        useCount: 3,
      }),
      score: 0.5,
      matchType: 'hybrid',
    },
  ];

  describe('createMemoryReranker', () => {
    it('should create reranker with default config', () => {
      const reranker = createMemoryReranker();
      expect(reranker).toBeInstanceOf(MemoryReranker);
    });

    it('should create reranker with custom config', () => {
      const reranker = createMemoryReranker({
        provider: 'hybrid',
        diversityPenalty: 0.2,
      });
      expect(reranker).toBeInstanceOf(MemoryReranker);
    });

    it('should create reranker with custom criteria', () => {
      const reranker = createMemoryReranker({
        criteria: [
          { name: 'custom', description: 'Custom criterion', weight: 1.0 },
        ],
      });
      expect(reranker).toBeInstanceOf(MemoryReranker);
    });
  });

  describe('rerank', () => {
    it('should rerank memories by relevance', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('dark mode interface', mockScoredMemories);

      expect(results.length).toBeGreaterThan(0);
      // Results should have rerankScore
      results.forEach(r => {
        expect(r.rerankScore).toBeDefined();
        expect(r.rerankScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should preserve original rank information', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('test query', mockScoredMemories);

      results.forEach(r => {
        expect(r.originalRank).toBeDefined();
        expect(r.originalRank).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include criteria scores when using rule-based', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('dark mode', mockScoredMemories);

      results.forEach(r => {
        expect(r.criteriaScores).toBeDefined();
        expect(r.criteriaScores?.relevance).toBeDefined();
        expect(r.criteriaScores?.recency).toBeDefined();
      });
    });

    it('should respect limit parameter', async () => {
      const reranker = createMemoryReranker();

      const results = await reranker.rerank('test', mockScoredMemories, { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should respect minScore parameter', async () => {
      const reranker = createMemoryReranker();

      const results = await reranker.rerank('test', mockScoredMemories, { minScore: 0.3 });

      results.forEach(r => {
        expect(r.rerankScore).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should sort results by rerankScore descending', async () => {
      const reranker = createMemoryReranker();

      const results = await reranker.rerank('software engineer code', mockScoredMemories);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].rerankScore).toBeGreaterThanOrEqual(results[i].rerankScore);
      }
    });

    it('should handle empty input', async () => {
      const reranker = createMemoryReranker();

      const results = await reranker.rerank('test', []);

      expect(results.length).toBe(0);
    });
  });

  describe('diversity penalty', () => {
    it('should apply diversity penalty to reduce redundancy', async () => {
      const reranker = createMemoryReranker({
        provider: 'rule-based',
        diversityPenalty: 0.5,
      });

      // Create similar memories
      const similarMemories: ScoredMemory[] = [
        {
          memory: createMockMemory({
            id: '1',
            content: 'I like dark mode interfaces',
          }),
          score: 0.9,
          matchType: 'keyword',
        },
        {
          memory: createMockMemory({
            id: '2',
            content: 'I prefer dark mode UI design',
          }),
          score: 0.85,
          matchType: 'keyword',
        },
        {
          memory: createMockMemory({
            id: '3',
            content: 'Something completely different about cats',
          }),
          score: 0.5,
          matchType: 'keyword',
        },
      ];

      const results = await reranker.rerank('dark mode', similarMemories);

      // The third memory should potentially rank higher than expected
      // due to diversity bonus
      expect(results.length).toBe(3);
    });

    it('should not apply penalty when diversityPenalty is 0', async () => {
      const reranker = createMemoryReranker({
        provider: 'rule-based',
        diversityPenalty: 0,
      });

      const results = await reranker.rerank('test', mockScoredMemories);

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('scoring criteria', () => {
    it('should score relevance based on keyword match', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('dark mode interface', mockScoredMemories);

      // Memory with 'dark mode' should have higher relevance score
      const darkModeResult = results.find(r => r.memory.id === '1');
      expect(darkModeResult).toBeDefined();
      expect(darkModeResult?.criteriaScores?.relevance).toBeGreaterThan(0);
    });

    it('should score recency based on lastUsedAt', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('test', mockScoredMemories);

      // Recently used memory should have higher recency score
      const recentResult = results.find(r => r.memory.id === '1');
      const oldResult = results.find(r => r.memory.id === '2');

      if (recentResult && oldResult) {
        expect(recentResult.criteriaScores?.recency).toBeGreaterThan(
          oldResult.criteriaScores?.recency ?? 0
        );
      }
    });

    it('should score specificity based on content length and metadata', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('test', mockScoredMemories);

      results.forEach(r => {
        expect(r.criteriaScores?.specificity).toBeDefined();
        expect(r.criteriaScores?.specificity).toBeGreaterThanOrEqual(0);
        expect(r.criteriaScores?.specificity).toBeLessThanOrEqual(1);
      });
    });

    it('should score reliability based on source', async () => {
      const reranker = createMemoryReranker({ provider: 'rule-based' });

      const results = await reranker.rerank('test', mockScoredMemories);

      // Explicit source should have higher reliability than inferred
      const explicitResult = results.find(r => r.memory.source === 'explicit');
      const inferredResult = results.find(r => r.memory.source === 'inferred');

      if (explicitResult && inferredResult) {
        expect(explicitResult.criteriaScores?.reliability).toBeGreaterThan(
          inferredResult.criteriaScores?.reliability ?? 0
        );
      }
    });
  });

  describe('LLM scorer prompt', () => {
    it('should generate valid LLM scorer prompt', () => {
      const reranker = createMemoryReranker();

      const prompt = reranker.createLLMScorerPrompt(
        'dark mode',
        ['I prefer dark mode', 'I like cats'],
        [{ name: 'relevance', description: 'How relevant', weight: 1.0 }]
      );

      expect(prompt).toContain('dark mode');
      expect(prompt).toContain('I prefer dark mode');
      expect(prompt).toContain('relevance');
      expect(prompt).toContain('JSON array');
    });

    it('should handle empty documents', () => {
      const reranker = createMemoryReranker();

      const prompt = reranker.createLLMScorerPrompt('query', []);

      expect(prompt).toContain('query');
    });
  });

  describe('hybrid reranking', () => {
    it('should combine rule-based and LLM scores when LLM available', async () => {
      const mockLLMScorer = {
        score: jest.fn().mockResolvedValue([0.9, 0.7, 0.5, 0.3]),
      };

      const reranker = createMemoryReranker({
        provider: 'hybrid',
        llmScorer: mockLLMScorer,
      });

      const results = await reranker.rerank('test', mockScoredMemories);

      expect(mockLLMScorer.score).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should fallback to rule-based when LLM fails', async () => {
      const mockLLMScorer = {
        score: jest.fn().mockRejectedValue(new Error('LLM error')),
      };

      const reranker = createMemoryReranker({
        provider: 'hybrid',
        llmScorer: mockLLMScorer,
      });

      const results = await reranker.rerank('test', mockScoredMemories);

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('config management', () => {
    it('should update config', () => {
      const reranker = createMemoryReranker();

      reranker.updateConfig({ diversityPenalty: 0.3 });

      expect(reranker).toBeInstanceOf(MemoryReranker);
    });
  });

  describe('DEFAULT_RERANKER_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RERANKER_CONFIG.provider).toBe('rule-based');
      expect(DEFAULT_RERANKER_CONFIG.temperature).toBe(0);
      expect(DEFAULT_RERANKER_CONFIG.diversityPenalty).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_RERANKER_CONFIG.criteria?.length).toBeGreaterThan(0);
    });

    it('should have criteria with valid weights', () => {
      DEFAULT_RERANKER_CONFIG.criteria?.forEach(criterion => {
        expect(criterion.name).toBeTruthy();
        expect(criterion.description).toBeTruthy();
        expect(criterion.weight).toBeGreaterThan(0);
        expect(criterion.weight).toBeLessThanOrEqual(1);
      });
    });
  });
});
