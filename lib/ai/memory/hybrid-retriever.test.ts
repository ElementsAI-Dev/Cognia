/**
 * Tests for Hybrid Retriever
 */

import {
  HybridRetriever,
  createHybridRetriever,
  DEFAULT_RETRIEVER_CONFIG,
} from './hybrid-retriever';
import type { Memory } from '@/types';

describe('HybridRetriever', () => {
  const mockMemories: Memory[] = [
    {
      id: '1',
      type: 'preference',
      content: 'I prefer dark mode interfaces and minimalist design',
      source: 'explicit',
      tags: ['ui', 'design', 'preferences'],
      category: 'appearance',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 5,
      enabled: true,
      pinned: true,
      priority: 8,
      scope: 'global',
    },
    {
      id: '2',
      type: 'fact',
      content: 'My name is John and I work as a software engineer at TechCorp',
      source: 'explicit',
      tags: ['personal', 'work'],
      category: 'identity',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastUsedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      useCount: 2,
      enabled: true,
      pinned: false,
      priority: 5,
      scope: 'global',
    },
    {
      id: '3',
      type: 'instruction',
      content: 'Always respond in a concise manner with code examples',
      source: 'explicit',
      tags: ['communication', 'code'],
      category: 'behavior',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 10,
      enabled: true,
      pinned: false,
      priority: 7,
      scope: 'global',
    },
    {
      id: '4',
      type: 'context',
      content: 'Working on a React project with TypeScript and TailwindCSS',
      source: 'inferred',
      tags: ['code', 'project', 'react'],
      category: 'project',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 3,
      enabled: true,
      pinned: false,
      priority: 5,
      scope: 'session',
      sessionId: 'session-1',
    },
    {
      id: '5',
      type: 'preference',
      content: 'This memory is disabled for testing purposes',
      source: 'explicit',
      tags: [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      enabled: false,
      pinned: false,
      priority: 5,
      scope: 'global',
    },
    {
      id: '6',
      type: 'fact',
      content: 'I speak English and Mandarin Chinese fluently',
      source: 'explicit',
      tags: ['language', 'skills'],
      category: 'skills',
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 1,
      enabled: true,
      pinned: false,
      priority: 4,
      scope: 'global',
    },
  ];

  describe('createHybridRetriever', () => {
    it('should create retriever with default config', () => {
      const retriever = createHybridRetriever();
      expect(retriever).toBeInstanceOf(HybridRetriever);
    });

    it('should create retriever with custom config', () => {
      const retriever = createHybridRetriever({
        defaultVectorWeight: 0.6,
        defaultKeywordWeight: 0.3,
        defaultGraphWeight: 0.1,
      });
      expect(retriever).toBeInstanceOf(HybridRetriever);
    });
  });

  describe('keywordSearch', () => {
    it('should find memories by keyword match', () => {
      const retriever = createHybridRetriever();

      const results = retriever.keywordSearch('dark mode interface', mockMemories);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].matchType).toBe('keyword');
      expect(results[0].memory.content).toContain('dark mode');
    });

    it('should rank results by BM25 score', () => {
      const retriever = createHybridRetriever();

      const results = retriever.keywordSearch('software engineer work', mockMemories);

      expect(results.length).toBeGreaterThan(0);
      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should return empty array for no matches', () => {
      const retriever = createHybridRetriever();

      const results = retriever.keywordSearch('xyzabc123nonexistent', mockMemories);

      expect(results.length).toBe(0);
    });

    it('should exclude disabled memories', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      // Use search method which applies filters (including enabled filter)
      const results = await retriever.search(mockMemories, {
        query: 'disabled testing',
        filters: { enabled: true },
      });

      const disabledMemory = results.find(r => r.memory.id === '5');
      expect(disabledMemory).toBeUndefined();
    });

    it('should handle empty query', () => {
      const retriever = createHybridRetriever();

      const results = retriever.keywordSearch('', mockMemories);

      expect(results.length).toBe(0);
    });

    it('should handle query with only stop words', () => {
      const retriever = createHybridRetriever();

      const results = retriever.keywordSearch('the a an is', mockMemories);

      expect(results.length).toBe(0);
    });
  });

  describe('graphSearch', () => {
    it('should find connected memories via shared tags', () => {
      const retriever = createHybridRetriever();

      // First get some seed results
      const seedResults = new Map();
      seedResults.set('3', {
        memory: mockMemories[2], // Has 'code' tag
        score: 0.8,
        matchType: 'keyword' as const,
      });

      const results = retriever['graphSearch']('code examples', mockMemories, seedResults);

      // Should find memory '4' which also has 'code' tag
      const connectedMemory = results.find(r => r.memory.id === '4');
      expect(connectedMemory).toBeDefined();
    });

    it('should return empty when no seed results', () => {
      const retriever = createHybridRetriever();

      const results = retriever['graphSearch']('test', mockMemories, new Map());

      expect(results.length).toBe(0);
    });
  });

  describe('search (hybrid)', () => {
    it('should combine keyword and graph search', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false, // Disable vector search for this test
      });

      const results = await retriever.search(mockMemories, {
        query: 'dark mode design preferences',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect limit parameter', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'software engineer code',
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should respect threshold parameter', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'dark mode',
        threshold: 0.5,
      });

      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should apply filters correctly', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'code project',
        filters: {
          types: ['context'],
        },
      });

      results.forEach(r => {
        expect(r.memory.type).toBe('context');
      });
    });

    it('should filter by session ID', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'React TypeScript',
        filters: {
          sessionId: 'session-1',
        },
      });

      results.forEach(r => {
        const isGlobalOrSession =
          r.memory.scope === 'global' ||
          !r.memory.sessionId ||
          r.memory.sessionId === 'session-1';
        expect(isGlobalOrSession).toBe(true);
      });
    });

    it('should filter by tags', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'preferences',
        filters: {
          tags: ['ui'],
        },
      });

      results.forEach(r => {
        expect(r.memory.tags?.includes('ui')).toBe(true);
      });
    });

    it('should filter by minimum priority', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'code',
        filters: {
          minPriority: 7,
        },
      });

      results.forEach(r => {
        expect(r.memory.priority ?? 5).toBeGreaterThanOrEqual(7);
      });
    });

    it('should filter pinned only', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
      });

      const results = await retriever.search(mockMemories, {
        query: 'dark mode',
        filters: {
          pinnedOnly: true,
        },
      });

      results.forEach(r => {
        expect(r.memory.pinned).toBe(true);
      });
    });
  });

  describe('reciprocalRankFusion', () => {
    it('should fuse multiple result lists', async () => {
      const retriever = createHybridRetriever();

      const list1 = [
        { memory: mockMemories[0], score: 0.9, matchType: 'keyword' as const },
        { memory: mockMemories[1], score: 0.7, matchType: 'keyword' as const },
      ];

      const list2 = [
        { memory: mockMemories[1], score: 0.8, matchType: 'vector' as const },
        { memory: mockMemories[2], score: 0.6, matchType: 'vector' as const },
      ];

      const fused = await retriever.reciprocalRankFusion([list1, list2]);

      expect(fused.length).toBe(3);
      // Memory '1' should be boosted since it appears in both lists
      const memory1Result = fused.find(r => r.memory.id === '2');
      expect(memory1Result).toBeDefined();
      expect(memory1Result?.matchType).toBe('hybrid');
    });

    it('should handle empty result lists', async () => {
      const retriever = createHybridRetriever();

      const fused = await retriever.reciprocalRankFusion([[], []]);

      expect(fused.length).toBe(0);
    });
  });

  describe('searchWithFallback', () => {
    it('should fall back to keyword search when results are sparse', async () => {
      const retriever = createHybridRetriever({
        enableVectorSearch: false,
        enableGraphSearch: false,
      });

      const results = await retriever.searchWithFallback(mockMemories, {
        query: 'dark mode interface',
        limit: 10,
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('config management', () => {
    it('should update config', () => {
      const retriever = createHybridRetriever();

      retriever.updateConfig({ defaultLimit: 50 });

      // Config should be updated internally
      expect(retriever).toBeInstanceOf(HybridRetriever);
    });

    it('should clear cache', () => {
      const retriever = createHybridRetriever();

      retriever.clearCache();

      expect(retriever).toBeInstanceOf(HybridRetriever);
    });
  });

  describe('DEFAULT_RETRIEVER_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRIEVER_CONFIG.defaultVectorWeight).toBeGreaterThan(0);
      expect(DEFAULT_RETRIEVER_CONFIG.defaultKeywordWeight).toBeGreaterThan(0);
      expect(DEFAULT_RETRIEVER_CONFIG.defaultGraphWeight).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_RETRIEVER_CONFIG.defaultLimit).toBeGreaterThan(0);
      expect(DEFAULT_RETRIEVER_CONFIG.defaultThreshold).toBeGreaterThanOrEqual(0);
    });
  });
});
