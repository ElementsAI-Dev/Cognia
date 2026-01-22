/**
 * useToolHistory Hook Tests
 */

import { renderHook, act } from '@testing-library/react';

// Mock state for the store
let mockState = {
  history: [] as Array<{
    id: string;
    toolType: string;
    toolName: string;
    prompt: string;
    result: string;
    output?: string;
    errorMessage?: string;
    duration?: number;
    timestamp: Date;
    serverId?: string;
    serverName?: string;
    skillId?: string;
  }>,
  usageStats: {} as Record<
    string,
    {
      toolId: string;
      toolType: string;
      toolName: string;
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      lastUsed: Date;
      isFavorite: boolean;
      isPinned: boolean;
      serverId?: string;
      serverName?: string;
    }
  >,
  settings: {
    enabled: true,
    maxRecords: 1000,
    retentionDays: 90,
    showRecentInPopover: true,
    recentToolsCount: 5,
    enablePromptSuggestions: true,
    showUsageBadges: true,
  },
  isLoading: false,
  error: null as string | null,
};

const resetMockState = () => {
  mockState = {
    history: [],
    usageStats: {},
    settings: {
      enabled: true,
      maxRecords: 1000,
      retentionDays: 90,
      showRecentInPopover: true,
      recentToolsCount: 5,
      enablePromptSuggestions: true,
      showUsageBadges: true,
    },
    isLoading: false,
    error: null,
  };
};

// Mock the stores module - must be before any imports that use it
jest.mock('@/stores', () => {
  const mockSetState = (newState: Partial<typeof mockState>) => {
    Object.assign(mockState, newState);
  };

  return {
    useToolHistoryStore: Object.assign(
      jest.fn((selector?: (state: typeof mockState) => unknown) => {
        return selector ? selector(mockState) : mockState;
      }),
      {
        getState: () => mockState,
        setState: mockSetState,
        subscribe: jest.fn(() => jest.fn()),
      }
    ),
    createToolId: jest.fn((type: string, name: string, serverId?: string) =>
      serverId ? `${type}:${serverId}:${name}` : `${type}:${name}`
    ),
  };
});

jest.mock('@/lib/ai/tools/history-optimizer', () => ({
  getPromptSuggestions: jest.fn(() => []),
  getToolRecommendations: jest.fn(() => []),
  findSimilarSuccessfulCalls: jest.fn(() => []),
  scorePromptQuality: jest.fn(() => ({ score: 0.5, factors: {}, suggestions: [] })),
  analyzeUsagePatterns: jest.fn(() => ({
    successRateTrend: 'stable',
    coUsedTools: [],
    timePatterns: [],
  })),
}));

import { useToolHistory } from './use-tool-history';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useToolHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store state
    resetMockState();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useToolHistory());

      expect(result.current.history).toEqual([]);
      expect(result.current.usageStats).toEqual({});
      expect(result.current.isEnabled).toBe(true);
      expect(result.current.historyCount).toBe(0);
    });

    it('should accept options', () => {
      const { result } = renderHook(() => useToolHistory({ recentLimit: 3, frequentLimit: 3 }));

      expect(result.current.recentTools).toHaveLength(0);
      expect(result.current.frequentTools).toHaveLength(0);
    });
  });

  describe('recordCall', () => {
    it('should record a new MCP tool call', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'search', 'Find documents', {
          serverId: 'server1',
          serverName: 'Search Server',
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].toolType).toBe('mcp');
      expect(result.current.history[0].toolName).toBe('search');
      expect(result.current.history[0].prompt).toBe('Find documents');
    });

    it('should record a skill call', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('skill', 'code-review', 'Review this code', {
          skillId: 'skill-123',
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].toolType).toBe('skill');
    });

    it('should return the created record', () => {
      const { result } = renderHook(() => useToolHistory());

      let record: ReturnType<typeof result.current.recordCall>;
      act(() => {
        record = result.current.recordCall('mcp', 'tool1', 'Test prompt');
      });

      expect(record!.id).toBeDefined();
      expect(record!.result).toBe('pending');
    });
  });

  describe('updateCallResult', () => {
    it('should update a call to success', () => {
      const { result } = renderHook(() => useToolHistory());

      let callId: string;
      act(() => {
        const record = result.current.recordCall('mcp', 'tool1', 'Test');
        callId = record.id;
      });

      act(() => {
        result.current.updateCallResult(callId, 'success', {
          output: 'Result output',
          duration: 150,
        });
      });

      expect(result.current.history[0].result).toBe('success');
      expect(result.current.history[0].output).toBe('Result output');
      expect(result.current.history[0].duration).toBe(150);
    });

    it('should update a call to error', () => {
      const { result } = renderHook(() => useToolHistory());

      let callId: string;
      act(() => {
        const record = result.current.recordCall('mcp', 'tool1', 'Test');
        callId = record.id;
      });

      act(() => {
        result.current.updateCallResult(callId, 'error', {
          errorMessage: 'Something went wrong',
        });
      });

      expect(result.current.history[0].result).toBe('error');
      expect(result.current.history[0].errorMessage).toBe('Something went wrong');
    });
  });

  describe('favorites and pinning', () => {
    it('should toggle favorite', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1', 'server1', 'Server 1');
      });

      expect(result.current.isFavorite('mcp:server1:tool1')).toBe(true);
      expect(result.current.favorites).toHaveLength(1);

      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1', 'server1', 'Server 1');
      });

      expect(result.current.isFavorite('mcp:server1:tool1')).toBe(false);
    });

    it('should toggle pinned', () => {
      const { result } = renderHook(() => useToolHistory());

      // First create stats
      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1');
      });

      act(() => {
        result.current.togglePinned('mcp:server1:tool1');
      });

      expect(result.current.isPinned('mcp:server1:tool1')).toBe(true);
      expect(result.current.pinnedTools).toHaveLength(1);
    });
  });

  describe('computed values', () => {
    it('should compute recent tools', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'tool1', 'Test 1', { serverId: 's1' });
        result.current.recordCall('mcp', 'tool2', 'Test 2', { serverId: 's1' });
      });

      expect(result.current.recentTools).toHaveLength(2);
      // Most recent first
      expect(result.current.recentTools[0].toolName).toBe('tool2');
    });

    it('should compute frequent tools', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        // Call tool1 multiple times
        for (let i = 0; i < 5; i++) {
          result.current.recordCall('mcp', 'tool1', `Test ${i}`, { serverId: 's1' });
        }
        // Call tool2 once
        result.current.recordCall('mcp', 'tool2', 'Test', { serverId: 's1' });
      });

      expect(result.current.frequentTools).toHaveLength(2);
      expect(result.current.frequentTools[0].toolName).toBe('tool1');
      expect(result.current.frequentTools[0].totalCalls).toBe(5);
    });

    it('should get call count', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'tool1', 'Test 1', { serverId: 's1' });
        result.current.recordCall('mcp', 'tool1', 'Test 2', { serverId: 's1' });
      });

      expect(result.current.getCallCount('mcp:s1:tool1')).toBe(2);
    });

    it('should get success rate', () => {
      const { result } = renderHook(() => useToolHistory());

      let id1: string, id2: string;
      act(() => {
        const r1 = result.current.recordCall('mcp', 'tool1', 'Test 1', { serverId: 's1' });
        const r2 = result.current.recordCall('mcp', 'tool1', 'Test 2', { serverId: 's1' });
        id1 = r1.id;
        id2 = r2.id;
      });

      act(() => {
        result.current.updateCallResult(id1, 'success');
        result.current.updateCallResult(id2, 'error');
      });

      expect(result.current.getSuccessRate('mcp:s1:tool1')).toBe(0.5);
    });
  });

  describe('history management', () => {
    it('should get history with filters', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'search', 'Search query', { serverId: 's1' });
        result.current.recordCall('skill', 'review', 'Review code');
      });

      const mcpOnly = result.current.getHistory({ toolType: 'mcp' });
      expect(mcpOnly).toHaveLength(1);
      expect(mcpOnly[0].toolType).toBe('mcp');
    });

    it('should delete a record', () => {
      const { result } = renderHook(() => useToolHistory());

      let recordId: string;
      act(() => {
        const record = result.current.recordCall('mcp', 'tool1', 'Test');
        recordId = record.id;
      });

      expect(result.current.historyCount).toBe(1);

      act(() => {
        result.current.deleteRecord(recordId);
      });

      expect(result.current.historyCount).toBe(0);
    });

    it('should clear all history', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'tool1', 'Test 1');
        result.current.recordCall('mcp', 'tool2', 'Test 2');
      });

      expect(result.current.historyCount).toBe(2);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.historyCount).toBe(0);
    });
  });

  describe('optimization functions', () => {
    it('should get suggestions for a tool', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        const r = result.current.recordCall('mcp', 'search', 'Find documents about AI', {
          serverId: 's1',
        });
        result.current.updateCallResult(r.id, 'success');
      });

      const suggestions = result.current.getSuggestions('mcp:s1:search', 'find');
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should get tool recommendations', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'search', 'Find documents about machine learning', {
          serverId: 's1',
        });
      });

      const recommendations = result.current.getRecommendations('find documents');
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should score prompt quality', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        const r = result.current.recordCall('mcp', 'search', 'Search for AI documents', {
          serverId: 's1',
        });
        result.current.updateCallResult(r.id, 'success');
      });

      const score = result.current.scorePrompt('Search for ML documents', 'mcp:s1:search');
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
      expect(score.factors).toBeDefined();
      expect(score.suggestions).toBeDefined();
    });

    it('should find similar calls', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        const r = result.current.recordCall(
          'mcp',
          'search',
          'Find documents about artificial intelligence',
          {
            serverId: 's1',
          }
        );
        result.current.updateCallResult(r.id, 'success');
      });

      const similar = result.current.findSimilar('Find documents about AI');
      expect(similar).toBeDefined();
      expect(Array.isArray(similar)).toBe(true);
    });

    it('should analyze usage patterns', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.recordCall('mcp', 'search', `Query ${i}`, { serverId: 's1' });
        }
      });

      const patterns = result.current.analyzePatterns('mcp:s1:search');
      expect(patterns).toBeDefined();
      expect(patterns.successRateTrend).toBeDefined();
      expect(patterns.coUsedTools).toBeDefined();
    });
  });

  describe('helper functions', () => {
    it('should create tool ID', () => {
      const { result } = renderHook(() => useToolHistory());

      const mcpId = result.current.createId('mcp', 'search', 'server1');
      expect(mcpId).toBe('mcp:server1:search');

      const skillId = result.current.createId('skill', 'review');
      expect(skillId).toBe('skill:review');
    });

    it('should get stats for a tool', () => {
      const { result } = renderHook(() => useToolHistory());

      act(() => {
        result.current.recordCall('mcp', 'tool1', 'Test', { serverId: 's1' });
      });

      const stats = result.current.getStats('mcp:s1:tool1');
      expect(stats).toBeDefined();
      expect(stats?.toolName).toBe('tool1');
    });

    it('should return undefined for unknown tool stats', () => {
      const { result } = renderHook(() => useToolHistory());

      const stats = result.current.getStats('unknown:tool');
      expect(stats).toBeUndefined();
    });
  });
});
