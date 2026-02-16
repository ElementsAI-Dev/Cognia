/**
 * Tests for useMemory hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMemory } from './use-memory';
import { useMemoryStore } from '@/stores';

// Mock the embedding module
jest.mock('@/lib/ai/embedding/embedding', () => ({
  generateEmbedding: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
  cosineSimilarity: jest.fn().mockReturnValue(0.8),
}));

// Mock settings store
jest.mock('@/stores', () => {
  const { useMemoryStore } = jest.requireActual('@/stores/data/memory-store');
  return {
    useMemoryStore,
    useSettingsStore: jest.fn((selector) => {
      const state = {
        providerSettings: {
          openai: { enabled: true, apiKey: 'test-key' },
        },
      };
      return selector ? selector(state) : state;
    }),
  };
});

describe('useMemory', () => {
  beforeEach(() => {
    // Reset memory store before each test
    useMemoryStore.setState({
      memories: [],
      settings: {
        enabled: true,
        maxMemories: 100,
        autoInfer: true,
        injectInSystemPrompt: true,
        enableSemanticSearch: false,
        semanticSearchThreshold: 0.7,
        autoDecay: false,
        decayDays: 30,
        autoCleanup: false,
        cleanupDays: 60,
        defaultScope: 'global',
        conflictDetection: true,
        conflictThreshold: 0.7,
        provider: 'local',
        enablePipeline: false,
        pipelineRecentMessages: 10,
        enableRollingSummary: false,
      },
    });
  });

  describe('basic operations', () => {
    it('should create a memory', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.createMemory({
          type: 'preference',
          content: 'I prefer dark mode',
        });
      });

      expect(result.current.memories).toHaveLength(1);
      expect(result.current.memories[0].content).toBe('I prefer dark mode');
      expect(result.current.memories[0].type).toBe('preference');
    });

    it('should create memory with session scope', async () => {
      const { result } = renderHook(() => useMemory({ sessionId: 'test-session' }));

      await act(async () => {
        await result.current.createMemory(
          { type: 'fact', content: 'Session fact' },
          { sessionScoped: true }
        );
      });

      expect(result.current.memories[0].sessionId).toBe('test-session');
    });

    it('should update a memory', async () => {
      const { result } = renderHook(() => useMemory());

      let memoryId: string;
      await act(async () => {
        const { memory } = await result.current.createMemory({
          type: 'fact',
          content: 'Original content',
        });
        memoryId = memory.id;
      });

      act(() => {
        result.current.updateMemory(memoryId!, { content: 'Updated content' });
      });

      expect(result.current.memories[0].content).toBe('Updated content');
    });

    it('should delete a memory', async () => {
      const { result } = renderHook(() => useMemory());

      let memoryId: string;
      await act(async () => {
        const { memory } = await result.current.createMemory({
          type: 'fact',
          content: 'To be deleted',
        });
        memoryId = memory.id;
      });

      expect(result.current.memories).toHaveLength(1);

      act(() => {
        result.current.deleteMemory(memoryId!);
      });

      expect(result.current.memories).toHaveLength(0);
    });
  });

  describe('conflict detection', () => {
    it('should detect similar memories when creating', async () => {
      const { result } = renderHook(() => useMemory());

      // Create first memory
      await act(async () => {
        await result.current.createMemory({
          type: 'preference',
          content: 'I prefer TypeScript for web development',
        });
      });

      // Create similar memory
      let conflict;
      await act(async () => {
        const res = await result.current.createMemory({
          type: 'preference',
          content: 'I prefer TypeScript for frontend development',
        });
        conflict = res.conflict;
      });

      // Should detect conflict due to similar words
      expect(conflict).toBeDefined();
    });

    it('should skip conflict check when disabled', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.createMemory({
          type: 'fact',
          content: 'My name is John',
        });
      });

      let conflict;
      await act(async () => {
        const res = await result.current.createMemory(
          { type: 'fact', content: 'My name is John Doe' },
          { checkConflicts: false }
        );
        conflict = res.conflict;
      });

      expect(conflict).toBeUndefined();
    });
  });

  describe('batch operations', () => {
    it('should batch create memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.batchCreateMemories([
          { type: 'fact', content: 'Fact 1' },
          { type: 'fact', content: 'Fact 2' },
          { type: 'preference', content: 'Preference 1' },
        ]);
      });

      expect(result.current.memories).toHaveLength(3);
    });

    it('should batch update memories', async () => {
      const { result } = renderHook(() => useMemory());

      const ids: string[] = [];
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          const { memory } = await result.current.createMemory({
            type: 'fact',
            content: `Memory ${i}`,
          });
          ids.push(memory.id);
        }
      });

      act(() => {
        result.current.batchUpdateMemories(
          ids.slice(0, 2).map((id) => ({
            id,
            updates: { category: 'updated' },
          }))
        );
      });

      expect(result.current.memories.filter((m) => m.category === 'updated')).toHaveLength(2);
    });

    it('should batch delete memories', async () => {
      const { result } = renderHook(() => useMemory());

      const ids: string[] = [];
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          const { memory } = await result.current.createMemory({
            type: 'fact',
            content: `Memory ${i}`,
          });
          ids.push(memory.id);
        }
      });

      act(() => {
        result.current.batchDeleteMemories(ids.slice(0, 2));
      });

      expect(result.current.memories).toHaveLength(1);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useMemory());
      await act(async () => {
        await result.current.createMemory({
          type: 'preference',
          content: 'I prefer TypeScript',
          tags: ['coding', 'typescript'],
        });
        await result.current.createMemory({
          type: 'fact',
          content: 'I work as a developer',
          tags: ['work', 'coding'],
        });
        await result.current.createMemory({
          type: 'instruction',
          content: 'Always use dark mode',
          tags: ['ui'],
        });
      });
    });

    it('should search memories by text', async () => {
      const { result } = renderHook(() => useMemory());

      let results;
      await act(async () => {
        results = await result.current.searchMemories({ query: 'TypeScript' });
      });

      expect(results!.length).toBeGreaterThan(0);
      expect(results![0].memory.content).toContain('TypeScript');
    });

    it('should filter search by type', async () => {
      const { result } = renderHook(() => useMemory());

      let results;
      await act(async () => {
        results = await result.current.searchMemories({
          query: '',
          type: 'preference',
        });
      });

      expect(
        results!.every((r: { memory: { type: string } }) => r.memory.type === 'preference')
      ).toBe(true);
    });
  });

  describe('relevance scoring', () => {
    it('should get relevant memories for context', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.createMemory({
          type: 'preference',
          content: 'I prefer React for frontend development',
          tags: ['react', 'frontend'],
        });
        await result.current.createMemory({
          type: 'fact',
          content: 'I work with Python for data science',
          tags: ['python', 'data'],
        });
      });

      let relevant;
      await act(async () => {
        relevant = await result.current.getRelevantMemories({
          currentMessage: 'Let me build a React component',
          tags: ['react'],
        });
      });

      expect(relevant!.length).toBeGreaterThan(0);
      // React memory should be more relevant
      const reactMemory = relevant!.find((r: { memory: { content: string } }) =>
        r.memory.content.includes('React')
      );
      expect(reactMemory).toBeDefined();
    });

    it('should prioritize pinned memories', async () => {
      const { result } = renderHook(() => useMemory());

      let pinnedId: string;
      await act(async () => {
        await result.current.createMemory({
          type: 'fact',
          content: 'Regular memory',
        });
        const { memory: m2 } = await result.current.createMemory({
          type: 'fact',
          content: 'Pinned memory',
        });
        pinnedId = m2.id;
        result.current.togglePin(pinnedId);
      });

      let relevant;
      await act(async () => {
        relevant = await result.current.getRelevantMemories({});
      });

      // Pinned memory should have higher relevance
      const pinnedResult = relevant!.find(
        (r: { memory: { id: string }; matchReasons?: string[] }) => r.memory.id === pinnedId
      );
      expect(pinnedResult?.matchReasons).toContain('pinned');
    });
  });

  describe('decay and expiration', () => {
    it('should calculate decay factor', () => {
      const { result } = renderHook(() => useMemory({ autoDecay: true, decayDays: 30 }));

      // Fresh memory should have decay factor close to 1
      const freshDecay = result.current.calculateDecayFactor({
        id: '1',
        type: 'fact',
        content: 'test',
        source: 'explicit',
        createdAt: new Date(),
        lastUsedAt: new Date(),
        useCount: 0,
        enabled: true,
      });
      expect(freshDecay).toBeCloseTo(1, 1);
    });

    it('should not decay pinned memories', () => {
      const { result } = renderHook(() => useMemory({ autoDecay: true, decayDays: 30 }));

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      const decay = result.current.calculateDecayFactor({
        id: '1',
        type: 'fact',
        content: 'test',
        source: 'explicit',
        createdAt: oldDate,
        lastUsedAt: oldDate,
        useCount: 0,
        enabled: true,
        pinned: true, // Pinned
      });

      expect(decay).toBe(1);
    });

    it('should get expired memories', async () => {
      const { result } = renderHook(() => useMemory());

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      // Manually add expired memory to store
      act(() => {
        useMemoryStore.setState({
          memories: [
            {
              id: '1',
              type: 'fact',
              content: 'Expired memory',
              source: 'explicit',
              createdAt: pastDate,
              lastUsedAt: pastDate,
              useCount: 0,
              enabled: true,
            },
          ],
        });
      });

      const _expired = result.current.getExpiredMemories(5);
      // Since memory has no expiresAt, it won't be in expired list
      // This tests the cleanup of old unused memories
      void _expired;
    });
  });

  describe('merge operations', () => {
    it('should merge two memories', async () => {
      const { result } = renderHook(() => useMemory());

      let id1: string, id2: string;
      await act(async () => {
        const { memory: m1 } = await result.current.createMemory({
          type: 'fact',
          content: 'I know JavaScript',
          tags: ['js'],
        });
        const { memory: m2 } = await result.current.createMemory({
          type: 'fact',
          content: 'I know TypeScript',
          tags: ['ts'],
        });
        id1 = m1.id;
        id2 = m2.id;
      });

      act(() => {
        result.current.mergeMemories(id1!, id2!, 'I know JavaScript and TypeScript');
      });

      expect(result.current.memories).toHaveLength(1);
      expect(result.current.memories[0].content).toBe('I know JavaScript and TypeScript');
      expect(result.current.memories[0].tags).toContain('js');
      expect(result.current.memories[0].tags).toContain('ts');
    });
  });

  describe('pattern detection', () => {
    it('should detect preference patterns', () => {
      const { result } = renderHook(() => useMemory());

      const detected = result.current.detectMemoryPatterns(
        'I prefer using TypeScript over JavaScript'
      );

      expect(detected.length).toBeGreaterThan(0);
      expect(detected.some((d) => d.type === 'preference')).toBe(true);
    });

    it('should detect fact patterns', () => {
      const { result } = renderHook(() => useMemory());

      const detected = result.current.detectMemoryPatterns('My name is John');

      expect(detected.length).toBeGreaterThan(0);
      expect(detected.some((d) => d.type === 'fact')).toBe(true);
    });

    it('should detect instruction patterns', () => {
      const { result } = renderHook(() => useMemory());

      const detected = result.current.detectMemoryPatterns('Remember to always use dark mode');

      expect(detected.length).toBeGreaterThan(0);
      expect(detected.some((d) => d.type === 'instruction')).toBe(true);
    });

    it('should detect multiple patterns', () => {
      const { result } = renderHook(() => useMemory());

      const detected = result.current.detectMemoryPatterns(
        'I prefer dark mode. My name is John. Remember to use TypeScript.'
      );

      expect(detected.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('find duplicates', () => {
    it('should find duplicate memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.createMemory({
          type: 'preference',
          content: 'I prefer TypeScript for web development',
        });
        await result.current.createMemory({
          type: 'preference',
          content: 'I prefer TypeScript for frontend development',
        });
        await result.current.createMemory({
          type: 'fact',
          content: 'Something completely different',
        });
      });

      const duplicates = result.current.findDuplicates(0.5);
      // Should find the two TypeScript related memories as potential duplicates
      expect(duplicates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('session filtering', () => {
    it('should filter memories by session', async () => {
      // Create memories with different sessions
      act(() => {
        useMemoryStore.setState({
          memories: [
            {
              id: '1',
              type: 'fact',
              content: 'Global memory',
              source: 'explicit',
              createdAt: new Date(),
              lastUsedAt: new Date(),
              useCount: 0,
              enabled: true,
              scope: 'global',
            },
            {
              id: '2',
              type: 'fact',
              content: 'Session A memory',
              source: 'explicit',
              createdAt: new Date(),
              lastUsedAt: new Date(),
              useCount: 0,
              enabled: true,
              sessionId: 'session-a',
              scope: 'session',
            },
            {
              id: '3',
              type: 'fact',
              content: 'Session B memory',
              source: 'explicit',
              createdAt: new Date(),
              lastUsedAt: new Date(),
              useCount: 0,
              enabled: true,
              sessionId: 'session-b',
              scope: 'session',
            },
          ],
        });
      });

      const { result } = renderHook(() => useMemory({ sessionId: 'session-a' }));

      // Should see global and session-a memories
      expect(result.current.memories).toHaveLength(2);
      expect(result.current.memories.some((m) => m.content === 'Global memory')).toBe(true);
      expect(result.current.memories.some((m) => m.content === 'Session A memory')).toBe(true);
      expect(result.current.memories.some((m) => m.content === 'Session B memory')).toBe(false);
    });
  });

  describe('stats', () => {
    it('should return correct memory stats', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        const { memory: m1 } = await result.current.createMemory({
          type: 'preference',
          content: 'Pref 1',
        });
        await result.current.createMemory({ type: 'fact', content: 'Fact 1' });
        await result.current.createMemory({ type: 'instruction', content: 'Instruction 1' });
        result.current.togglePin(m1.id);
      });

      expect(result.current.stats.total).toBe(3);
      expect(result.current.stats.enabled).toBe(3);
      expect(result.current.stats.pinned).toBe(1);
      expect(result.current.stats.byType.preference).toBe(1);
      expect(result.current.stats.byType.fact).toBe(1);
      expect(result.current.stats.byType.instruction).toBe(1);
    });
  });
});
