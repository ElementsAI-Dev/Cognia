/**
 * Tests for useMemoryProvider hook
 */

import { renderHook, act } from '@testing-library/react';

// Mock stores completely before import
type MockMemory = { id: string; content: string; type?: string };

type MockMemorySettings = {
  enabled: boolean;
  autoInfer: boolean;
  maxMemories: number;
  injectInSystemPrompt: boolean;
  enableSemanticSearch: boolean;
  semanticSearchThreshold: number;
  autoDecay: boolean;
  decayDays: number;
  autoCleanup: boolean;
  cleanupDays: number;
  defaultScope: 'global';
  conflictDetection: boolean;
  conflictThreshold: number;
  provider: 'local';
  enablePipeline: boolean;
  pipelineRecentMessages: number;
  enableRollingSummary: boolean;
};

type MockMemoryStoreState = {
  memories: MockMemory[];
  settings: MockMemorySettings;
  addMemory: (memory: { id?: string; content: string; type?: string }) => string;
  createMemory: (input: { content: string; type?: string }) => string;
  getMemory: (id: string) => MockMemory | null;
  updateMemory: (id: string, updates: Record<string, unknown>) => void;
  deleteMemory: (id: string) => boolean;
  searchMemories: (query: string) => MockMemory[];
  clearMemories: () => void;
  updateSettings: (partial: Record<string, unknown>) => void;
};

const createMockMemoryStoreState = (): MockMemoryStoreState => {
  const state: MockMemoryStoreState = {
    memories: [],
    settings: {
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
      defaultScope: 'global',
      conflictDetection: true,
      conflictThreshold: 0.7,
      provider: 'local',
      enablePipeline: true,
      pipelineRecentMessages: 5,
      enableRollingSummary: false,
    },
    addMemory: () => '',
    createMemory: () => '',
    getMemory: () => null,
    updateMemory: () => {},
    deleteMemory: () => false,
    searchMemories: () => [],
    clearMemories: () => {},
    updateSettings: () => {},
  };

  state.addMemory = jest.fn((memory: { id?: string; content: string; type?: string }) => {
    const id = memory.id || `memory-${Date.now()}`;
    state.memories.push({ ...memory, id });
    return id;
  });

  state.createMemory = jest.fn((input: { content: string; type?: string }) => {
    const id = `memory-${Date.now()}-${Math.random()}`;
    state.memories.push({ id, ...input });
    return id;
  });

  state.getMemory = jest.fn((id: string) => {
    return state.memories.find((m: MockMemory) => m.id === id) || null;
  });

  state.updateMemory = jest.fn((id: string, updates: Record<string, unknown>) => {
    const memory = state.memories.find((m: MockMemory) => m.id === id);
    if (memory) {
      Object.assign(memory, updates);
    }
  });

  state.deleteMemory = jest.fn((id: string) => {
    const index = state.memories.findIndex((m: MockMemory) => m.id === id);
    if (index !== -1) {
      state.memories.splice(index, 1);
      return true;
    }
    return false;
  });

  state.searchMemories = jest.fn((query: string) => {
    return state.memories.filter((m: MockMemory) => m.content.includes(query));
  });

  state.clearMemories = jest.fn(() => {
    state.memories = [];
  });

  state.updateSettings = jest.fn((partial: Record<string, unknown>) => {
    Object.assign(state.settings, partial);
  });

  return state;
};

let mockMemoryStoreState: MockMemoryStoreState = createMockMemoryStoreState();

// Reset function for beforeEach
const resetMockMemoryStoreState = () => {
  mockMemoryStoreState = createMockMemoryStoreState();
};

jest.mock('@/stores', () => ({
  useMemoryStore: Object.assign(
    jest.fn((selector) => {
      if (typeof selector === 'function') {
        return selector(mockMemoryStoreState);
      }
      return mockMemoryStoreState;
    }),
    {
      getState: () => mockMemoryStoreState,
      setState: jest.fn((partial) => {
        const update = typeof partial === 'function' ? partial(mockMemoryStoreState) : partial;
        Object.assign(mockMemoryStoreState, update);
        if (update.settings) {
          Object.assign(mockMemoryStoreState.settings, update.settings);
        }
      }),
      subscribe: jest.fn(() => () => {}),
    }
  ),
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
}));

import { useMemoryProvider } from './use-memory-provider';
import { useMemoryStore } from '@/stores';

// Mock memory module
jest.mock('@/lib/ai/memory', () => ({
  Mem0Provider: jest.fn(),
  createMem0Provider: jest.fn(),
  extractMemoryCandidates: jest.fn(() => []),
  applyDecisions: jest.fn(() => ({ added: 0, updated: 0, deleted: 0, skipped: 0 })),
  runMemoryPipeline: jest.fn(() => Promise.resolve({ candidates: [], decisions: [] })),
  MemoryActivator: jest.fn(),
  createMemoryActivator: jest.fn(() => ({
    init: jest.fn(() => Promise.resolve()),
    activateMemories: jest.fn(() => Promise.resolve([])),
    updateDecay: jest.fn(),
    cleanup: jest.fn(),
  })),
  HybridRetriever: jest.fn(),
  createHybridRetriever: jest.fn(() => ({
    search: jest.fn(() => Promise.resolve([])),
    addMemory: jest.fn(() => Promise.resolve()),
    removeMemory: jest.fn(() => Promise.resolve()),
    cleanup: jest.fn(),
  })),
  WorkingMemory: jest.fn(),
  createWorkingMemory: jest.fn(() => ({
    add: jest.fn(),
    get: jest.fn(() => null),
    getAll: jest.fn(() => []),
    remove: jest.fn(),
    clear: jest.fn(),
    prune: jest.fn(),
  })),
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
    resetMockMemoryStoreState();
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
      const { result } = renderHook(() => useMemoryProvider({ forceProvider: 'local' }));

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
      const { result } = renderHook(() => useMemoryProvider({ sessionId: 'test-session' }));

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
      // Add memory directly to mock state
      const memoryId = 'test-memory-id';
      mockMemoryStoreState.memories.push({
        id: memoryId,
        type: 'preference',
        content: 'Test memory',
      });

      const { result } = renderHook(() => useMemoryProvider());

      let fetchedMemory: unknown = null;
      await act(async () => {
        fetchedMemory = await result.current.getMemory(memoryId);
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

      const { result } = renderHook(() => useMemoryProvider({ sessionId: 'test-session' }));

      let memories: unknown[] = [];
      await act(async () => {
        memories = await result.current.getMemories();
      });

      expect(memories).toHaveLength(1);
    });
  });

  describe('updateMemory', () => {
    it('should update an existing memory', async () => {
      // Add a memory directly to the store
      const memoryId = 'test-memory-update';
      mockMemoryStoreState.memories.push({
        id: memoryId,
        type: 'preference',
        content: 'Original content',
      });

      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.updateMemory(memoryId, {
          content: 'Updated content',
        });
      });

      expect(mockMemoryStoreState.updateMemory).toHaveBeenCalledWith(memoryId, {
        content: 'Updated content',
      });
    });

    it('should update multiple fields', async () => {
      // Add a memory directly to the store
      const memoryId = 'test-memory-1';
      mockMemoryStoreState.memories.push({
        id: memoryId,
        type: 'preference',
        content: 'Original',
      });

      const { result } = renderHook(() => useMemoryProvider());

      await act(async () => {
        await result.current.updateMemory(memoryId, {
          content: 'Updated',
          tags: ['new-tag'],
          priority: 9,
        });
      });

      // Verify updateMemory was called on the store
      expect(mockMemoryStoreState.updateMemory).toHaveBeenCalledWith(
        memoryId,
        expect.objectContaining({
          content: 'Updated',
        })
      );
    });
  });

  describe('deleteMemory', () => {
    it('should delete an existing memory', async () => {
      // Add a memory directly to the store
      const memoryId = 'test-memory-to-delete';
      mockMemoryStoreState.memories.push({
        id: memoryId,
        type: 'preference',
        content: 'To be deleted',
      });

      const { result } = renderHook(() => useMemoryProvider());

      let deleted;
      await act(async () => {
        deleted = await result.current.deleteMemory(memoryId);
      });

      expect(deleted).toBe(true);
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

      let pipelineResult:
        | { applied: { added: number; updated: number; deleted: number; skipped: number } }
        | undefined;
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
