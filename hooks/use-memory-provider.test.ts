/**
 * Tests for useMemoryProvider hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMemoryProvider } from './use-memory-provider';
import { useMemoryStore } from '@/stores';

// Mock stores - use requireActual pattern
jest.mock('@/stores', () => {
  const actual = jest.requireActual('@/stores');
  return {
    ...actual,
    useSettingsStore: jest.fn((selector) => {
      const state = {
        providerSettings: {
          openai: { enabled: true, apiKey: 'test-key' },
        },
      };
      return selector ? selector(state) : state;
    }),
    useMcpStore: jest.fn((selector) => {
      const state = {
        callTool: jest.fn(),
        servers: [],
      };
      return selector ? selector(state) : state;
    }),
  };
});

// Mock memory module
jest.mock('@/lib/ai/memory', () => ({
  Mem0Provider: jest.fn(),
  createMem0Provider: jest.fn(),
  extractMemoryCandidates: jest.fn(() => []),
  applyDecisions: jest.fn(() => ({ added: 0, updated: 0, deleted: 0, skipped: 0 })),
  runMemoryPipeline: jest.fn(() => Promise.resolve({ candidates: [], decisions: [] })),
}));

const defaultSettings = {
  enabled: true,
  autoInfer: true,
  maxMemories: 100,
  injectInSystemPrompt: true,
  enableSemanticSearch: false,
  semanticSearchThreshold: 0.7,
  autoDecay: false,
  decayDays: 30,
  autoCleanup: false,
  cleanupDays: 60,
  defaultScope: 'global' as const,
  conflictDetection: true,
  conflictThreshold: 0.7,
  provider: 'local' as const,
  enablePipeline: true,
  pipelineRecentMessages: 5,
  enableRollingSummary: false,
};

describe('useMemoryProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useMemoryStore.setState({
      memories: [],
      settings: { ...defaultSettings },
    });
  });

  describe('initialization', () => {
    it('should initialize with local provider by default', () => {
      const { result } = renderHook(() => useMemoryProvider());

      expect(result.current.provider).toBe('local');
      expect(result.current.isReady).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should use forceProvider option when provided', () => {
      const { result } = renderHook(() =>
        useMemoryProvider({ forceProvider: 'local' })
      );

      expect(result.current.provider).toBe('local');
    });

    it('should report not ready for mem0 without API key', () => {
      useMemoryStore.setState({
        settings: { ...defaultSettings, provider: 'mem0' },
      });
      
      const { result } = renderHook(() => useMemoryProvider());

      expect(result.current.provider).toBe('mem0');
      expect(result.current.isReady).toBe(false);
    });

    it('should be ready for mem0 with API key and user ID', () => {
      useMemoryStore.setState({
        settings: { 
          ...defaultSettings, 
          provider: 'mem0',
          mem0ApiKey: 'm0-test-key',
          mem0UserId: 'test-user',
        },
      });
      
      const { result } = renderHook(() => useMemoryProvider());

      expect(result.current.provider).toBe('mem0');
      expect(result.current.isReady).toBe(true);
    });
  });

  describe('addMemory', () => {
    it('should add memory using local provider', async () => {
      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.addMemory({
          type: 'preference',
          content: 'I prefer dark mode',
        });
      });

      const state = useMemoryStore.getState();
      expect(state.memories).toHaveLength(1);
      expect(state.memories[0].content).toBe('I prefer dark mode');
      expect(state.memories[0].type).toBe('preference');
    });

    it('should include sessionId when provided', async () => {
      const { result } = renderHook(() =>
        useMemoryProvider({ sessionId: 'test-session' })
      );

      await act(async () => {
        await result.current.addMemory({
          type: 'fact',
          content: 'My name is John',
        });
      });

      const state = useMemoryStore.getState();
      expect(state.memories[0].sessionId).toBe('test-session');
    });

    it('should add memory with all options', async () => {
      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.addMemory({
          type: 'instruction',
          content: 'Always use TypeScript',
          source: 'explicit',
          tags: ['code', 'typescript'],
          priority: 8,
          pinned: true,
        });
      });

      const state = useMemoryStore.getState();
      expect(state.memories[0].type).toBe('instruction');
      expect(state.memories[0].tags).toContain('typescript');
      expect(state.memories[0].priority).toBe(8);
      expect(state.memories[0].pinned).toBe(true);
    });
  });

  describe('getMemory', () => {
    it('should get a specific memory by ID', async () => {
      const memory = useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'Test memory',
      });

      const { result } = renderHook(() => useMemoryProvider());

      let fetchedMemory: unknown = null;
      await act(async () => {
        fetchedMemory = await result.current.getMemory(memory.id);
      });

      expect(fetchedMemory).not.toBeNull();
      expect((fetchedMemory as { content: string })?.content).toBe('Test memory');
    });

    it('should return null for non-existent memory', async () => {
      const { result } = renderHook(() => useMemoryProvider());

      let fetchedMemory;
      await act(async () => {
        fetchedMemory = await result.current.getMemory('non-existent-id');
      });

      expect(fetchedMemory).toBeNull();
    });
  });

  describe('getMemories', () => {
    it('should return all memories for local provider', async () => {
      useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'Test memory 1',
      });
      useMemoryStore.getState().createMemory({
        type: 'fact',
        content: 'Test memory 2',
      });

      const { result } = renderHook(() => useMemoryProvider());

      let memories: unknown[] = [];
      await act(async () => {
        memories = await result.current.getMemories();
      });

      expect(memories).toHaveLength(2);
    });

    it('should filter by sessionId when provided', async () => {
      useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'Global memory',
        scope: 'global',
      });
      
      useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'Session memory',
        sessionId: 'other-session',
      });

      const { result } = renderHook(() =>
        useMemoryProvider({ sessionId: 'test-session' })
      );

      let memories: unknown[] = [];
      await act(async () => {
        memories = await result.current.getMemories();
      });

      expect(memories).toHaveLength(1);
    });
  });

  describe('updateMemory', () => {
    it('should update an existing memory', async () => {
      const memory = useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'Original content',
      });

      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.updateMemory(memory.id, {
          content: 'Updated content',
        });
      });

      const state = useMemoryStore.getState();
      expect(state.memories[0].content).toBe('Updated content');
    });

    it('should update multiple fields', async () => {
      const memory = useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'Original',
      });

      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.updateMemory(memory.id, {
          content: 'Updated',
          tags: ['new-tag'],
          priority: 9,
        });
      });

      const state = useMemoryStore.getState();
      expect(state.memories[0].content).toBe('Updated');
      expect(state.memories[0].tags).toContain('new-tag');
      expect(state.memories[0].priority).toBe(9);
    });
  });

  describe('deleteMemory', () => {
    it('should delete an existing memory', async () => {
      const memory = useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'To be deleted',
      });

      const { result } = renderHook(() => useMemoryProvider());

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMemory(memory.id);
      });

      expect(deleted).toBe(true);
      const state = useMemoryStore.getState();
      expect(state.memories).toHaveLength(0);
    });
  });

  describe('searchMemories', () => {
    it('should search memories by content', async () => {
      useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'I prefer dark mode',
      });
      useMemoryStore.getState().createMemory({
        type: 'preference',
        content: 'I like light theme',
      });

      const { result } = renderHook(() => useMemoryProvider());

      let results: unknown[] = [];
      await act(async () => {
        results = await result.current.searchMemories('dark mode');
      });

      expect(results).toHaveLength(1);
    });

    it('should limit search results', async () => {
      for (let i = 0; i < 10; i++) {
        useMemoryStore.getState().createMemory({
          type: 'preference',
          content: `Test preference ${i}`,
        });
      }

      const { result } = renderHook(() => useMemoryProvider());

      let results: unknown[] = [];
      await act(async () => {
        results = await result.current.searchMemories('preference', 3);
      });

      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('pipeline operations', () => {
    it('should extract candidates from messages', () => {
      const { result } = renderHook(() => useMemoryProvider());

      const candidates = result.current.extractCandidates([
        { role: 'user', content: 'I prefer dark mode' },
      ]);

      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should run pipeline and return results', async () => {
      const { result } = renderHook(() => useMemoryProvider());

      let pipelineResult;
      await act(async () => {
        pipelineResult = await result.current.runPipeline([
          { role: 'user', content: 'I prefer dark mode' },
        ]);
      });

      expect(pipelineResult).toHaveProperty('candidates');
      expect(pipelineResult).toHaveProperty('decisions');
      expect(pipelineResult).toHaveProperty('applied');
    });

    it('should skip pipeline when disabled', async () => {
      useMemoryStore.setState({
        settings: { ...defaultSettings, enablePipeline: false },
      });
      
      const { result } = renderHook(() => useMemoryProvider());

      let pipelineResult: { applied: { added: number; updated: number; deleted: number; skipped: number } } | undefined;
      await act(async () => {
        pipelineResult = await result.current.runPipeline([
          { role: 'user', content: 'Test message' },
        ]);
      });

      expect(pipelineResult?.applied).toEqual({
        added: 0,
        updated: 0,
        deleted: 0,
        skipped: 0,
      });
    });

    it('should handle multiple messages in pipeline', async () => {
      const { result } = renderHook(() => useMemoryProvider());

      let pipelineResult;
      await act(async () => {
        pipelineResult = await result.current.runPipeline([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'I prefer dark mode' },
        ]);
      });

      expect(pipelineResult).toHaveProperty('candidates');
    });
  });

  describe('sync operations', () => {
    it('should have null lastSyncTime initially', () => {
      const { result } = renderHook(() => useMemoryProvider());

      expect(result.current.lastSyncTime).toBeNull();
    });

    it('should not sync for local provider', async () => {
      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.sync();
      });

      // Local provider doesn't actually sync
      expect(result.current.lastSyncTime).toBeNull();
    });
  });

  describe('settings', () => {
    it('should expose current settings', () => {
      const { result } = renderHook(() => useMemoryProvider());

      expect(result.current.settings.provider).toBe('local');
      expect(result.current.settings.enablePipeline).toBe(true);
      expect(result.current.settings.maxMemories).toBe(100);
    });

    it('should allow updating settings', () => {
      const { result } = renderHook(() => useMemoryProvider());

      act(() => {
        result.current.updateSettings({ enablePipeline: false });
      });

      const state = useMemoryStore.getState();
      expect(state.settings.enablePipeline).toBe(false);
    });

    it('should update multiple settings at once', () => {
      const { result } = renderHook(() => useMemoryProvider());

      act(() => {
        result.current.updateSettings({
          enablePipeline: false,
          maxMemories: 200,
          conflictThreshold: 0.8,
        });
      });

      const state = useMemoryStore.getState();
      expect(state.settings.enablePipeline).toBe(false);
      expect(state.settings.maxMemories).toBe(200);
      expect(state.settings.conflictThreshold).toBe(0.8);
    });
  });
});
