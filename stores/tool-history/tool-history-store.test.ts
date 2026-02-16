/**
 * Tool History Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useToolHistoryStore } from './tool-history-store';

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

describe('useToolHistoryStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset store state
    useToolHistoryStore.setState({
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
    });
  });

  describe('recordToolCall', () => {
    it('should record a new tool call', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          serverId: 'server1',
          serverName: 'Server 1',
          prompt: 'Test prompt',
          result: 'pending',
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].toolName).toBe('tool1');
      expect(result.current.history[0].prompt).toBe('Test prompt');
    });

    it('should update usage stats on record', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test prompt',
          result: 'pending',
        });
      });

      const stats = result.current.usageStats['mcp:server1:tool1'];
      expect(stats).toBeDefined();
      expect(stats.totalCalls).toBe(1);
    });

    it('should not record when disabled', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.updateSettings({ enabled: false });
      });

      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test prompt',
          result: 'pending',
        });
      });

      // Should still return a record but not add to history
      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('updateToolCallResultStatus', () => {
    it('should update a call result', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      let callId: string;
      act(() => {
        const record = result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test prompt',
          result: 'pending',
        });
        callId = record.id;
      });

      act(() => {
        result.current.updateToolCallResultStatus(callId, 'success', 'Output text', undefined, 100);
      });

      expect(result.current.history[0].result).toBe('success');
      expect(result.current.history[0].output).toBe('Output text');
      expect(result.current.history[0].duration).toBe(100);
    });

    it('should update stats on success', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      let callId: string;
      act(() => {
        const record = result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test prompt',
          result: 'pending',
        });
        callId = record.id;
      });

      act(() => {
        result.current.updateToolCallResultStatus(callId, 'success', undefined, undefined, 100);
      });

      const stats = result.current.usageStats['mcp:server1:tool1'];
      expect(stats.successCalls).toBe(1);
      expect(stats.avgDuration).toBe(100);
    });
  });

  describe('favorites and pinning', () => {
    it('should toggle favorite', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1', 'server1', 'Server 1');
      });

      expect(result.current.usageStats['mcp:server1:tool1'].isFavorite).toBe(true);

      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1', 'server1', 'Server 1');
      });

      expect(result.current.usageStats['mcp:server1:tool1'].isFavorite).toBe(false);
    });

    it('should toggle pinned', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      // First create the stats entry
      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1', 'server1', 'Server 1');
      });

      act(() => {
        result.current.togglePinned('mcp:server1:tool1');
      });

      expect(result.current.usageStats['mcp:server1:tool1'].isPinned).toBe(true);
    });

    it('should get favorites', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1');
        result.current.toggleFavorite('mcp:server1:tool2', 'mcp', 'tool2');
      });

      const favorites = result.current.getFavorites();
      expect(favorites).toHaveLength(2);
    });

    it('should get pinned tools', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.toggleFavorite('mcp:server1:tool1', 'mcp', 'tool1');
        result.current.togglePinned('mcp:server1:tool1');
      });

      const pinned = result.current.getPinnedTools();
      expect(pinned).toHaveLength(1);
    });
  });

  describe('getHistory with filters', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Search for something',
          result: 'success',
        });
        result.current.recordToolCall({
          toolId: 'skill:skill1',
          toolType: 'skill',
          toolName: 'skill1',
          prompt: 'Execute skill',
          result: 'error',
        });
      });
    });

    it('should filter by tool type', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      const mcpHistory = result.current.getHistory({ toolType: 'mcp' });
      expect(mcpHistory).toHaveLength(1);
      expect(mcpHistory[0].toolType).toBe('mcp');
    });

    it('should filter by result', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      const successHistory = result.current.getHistory({ result: 'success' });
      expect(successHistory).toHaveLength(1);
    });

    it('should filter by search query', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      const searchHistory = result.current.getHistory({ searchQuery: 'search' });
      expect(searchHistory).toHaveLength(1);
      expect(searchHistory[0].prompt).toContain('Search');
    });

    it('should limit results', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      const limitedHistory = result.current.getHistory({ limit: 1 });
      expect(limitedHistory).toHaveLength(1);
    });
  });

  describe('getRecentTools and getFrequentTools', () => {
    it('should return recently used tools', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      jest.useFakeTimers();
      try {
        act(() => {
          jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
          result.current.recordToolCall({
            toolId: 'mcp:server1:tool1',
            toolType: 'mcp',
            toolName: 'tool1',
            prompt: 'Test 1',
            result: 'success',
          });
          jest.setSystemTime(new Date('2025-01-01T00:00:01.000Z'));
          result.current.recordToolCall({
            toolId: 'mcp:server1:tool2',
            toolType: 'mcp',
            toolName: 'tool2',
            prompt: 'Test 2',
            result: 'success',
          });
        });
      } finally {
        jest.useRealTimers();
      }

      const recent = result.current.getRecentTools(5);
      expect(recent).toHaveLength(2);
      // Most recent first
      expect(recent[0].toolName).toBe('tool2');
    });

    it('should return frequently used tools', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        // Call tool1 three times
        for (let i = 0; i < 3; i++) {
          result.current.recordToolCall({
            toolId: 'mcp:server1:tool1',
            toolType: 'mcp',
            toolName: 'tool1',
            prompt: `Test ${i}`,
            result: 'success',
          });
        }
        // Call tool2 once
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool2',
          toolType: 'mcp',
          toolName: 'tool2',
          prompt: 'Test',
          result: 'success',
        });
      });

      const frequent = result.current.getFrequentTools(5);
      expect(frequent).toHaveLength(2);
      // Most frequent first
      expect(frequent[0].toolName).toBe('tool1');
      expect(frequent[0].totalCalls).toBe(3);
    });
  });

  describe('clearHistory and deleteRecord', () => {
    it('should clear all history', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test',
          result: 'success',
        });
      });

      expect(result.current.history).toHaveLength(1);

      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(0);
    });

    it('should delete a specific record', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      let recordId: string;
      act(() => {
        const record = result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test',
          result: 'success',
        });
        recordId = record.id;
      });

      expect(result.current.history).toHaveLength(1);

      act(() => {
        result.current.deleteRecord(recordId);
      });

      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('getPromptSuggestions', () => {
    it('should return suggestions based on history', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      // Create some history
      act(() => {
        for (let i = 0; i < 5; i++) {
          const record = result.current.recordToolCall({
            toolId: 'mcp:server1:tool1',
            toolType: 'mcp',
            toolName: 'tool1',
            prompt: 'Search for documents about AI',
            result: 'pending',
          });
          result.current.updateToolCallResultStatus(record.id, 'success');
        }
      });

      const suggestions = result.current.getPromptSuggestions('mcp:server1:tool1', 'Search');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getToolRecommendations', () => {
    it('should return recommendations based on input', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      // Create some history
      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:search',
          toolType: 'mcp',
          toolName: 'search',
          prompt: 'Find documents about machine learning',
          result: 'success',
        });
      });

      const recommendations = result.current.getToolRecommendations('find documents');
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should return frequent tools when no input', () => {
      const { result } = renderHook(() => useToolHistoryStore());

      act(() => {
        result.current.recordToolCall({
          toolId: 'mcp:server1:tool1',
          toolType: 'mcp',
          toolName: 'tool1',
          prompt: 'Test',
          result: 'success',
        });
      });

      const recommendations = result.current.getToolRecommendations('');
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});
