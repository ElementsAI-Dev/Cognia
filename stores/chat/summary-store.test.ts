/**
 * Tests for summary-store
 */

// Unmock the summary store so we test the real implementation
jest.unmock('./summary-store');
jest.unmock('@/stores/chat/summary-store');

import { act, renderHook } from '@testing-library/react';
import { useSummaryStore } from './summary-store';

// Mock the database
jest.mock('@/lib/db/schema', () => ({
  db: {
    summaries: {
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      add: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('useSummaryStore', () => {
  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear();
    // Reset the store before each test
    act(() => {
      useSummaryStore.getState().reset();
      // Also ensure autoSummaryConfig is reset to defaults
      useSummaryStore.setState({
        autoSummaryConfig: {
          enabled: true,
          minMessages: 20,
          minTokens: 5000,
          autoOnSessionEnd: false,
          defaultFormat: 'bullets',
          defaultStyle: 'concise',
        },
      });
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.summaries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.autoSummaryConfig.enabled).toBe(true);
    });
  });

  describe('autoSummaryConfig', () => {
    it('should have default auto-summary configuration', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      expect(result.current.autoSummaryConfig).toEqual({
        enabled: true,
        minMessages: 20,
        minTokens: 5000,
        autoOnSessionEnd: false,
        defaultFormat: 'bullets',
        defaultStyle: 'concise',
      });
    });

    it('should update auto-summary configuration', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      act(() => {
        result.current.updateAutoSummaryConfig({ minMessages: 30 });
      });
      
      expect(result.current.autoSummaryConfig.minMessages).toBe(30);
      expect(result.current.autoSummaryConfig.enabled).toBe(true);
    });

    it('should disable auto-summary', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      act(() => {
        result.current.updateAutoSummaryConfig({ enabled: false });
      });
      
      expect(result.current.autoSummaryConfig.enabled).toBe(false);
    });
  });

  describe('shouldSuggestSummary', () => {
    it('should return false when auto-summary is disabled', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      act(() => {
        result.current.updateAutoSummaryConfig({ enabled: false });
      });
      
      expect(result.current.shouldSuggestSummary(100, 10000)).toBe(false);
    });

    it('should return true when message count exceeds threshold', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      expect(result.current.shouldSuggestSummary(25, 1000)).toBe(true);
    });

    it('should return true when token count exceeds threshold', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      expect(result.current.shouldSuggestSummary(5, 6000)).toBe(true);
    });

    it('should return false when neither threshold is exceeded', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      expect(result.current.shouldSuggestSummary(10, 2000)).toBe(false);
    });
  });

  describe('setCurrentSession', () => {
    it('should set current session ID', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      act(() => {
        result.current.setCurrentSession('session-123');
      });
      
      expect(result.current.currentSessionId).toBe('session-123');
    });

    it('should clear summaries when setting null session', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      act(() => {
        result.current.setCurrentSession(null);
      });
      
      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.summaries).toEqual([]);
    });
  });

  describe('getSummaryStats', () => {
    it('should return zero stats for session with no summaries', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      const stats = result.current.getSummaryStats('non-existent-session');
      
      expect(stats.totalSummaries).toBe(0);
      expect(stats.totalMessagesSummarized).toBe(0);
      expect(stats.avgCompressionRatio).toBe(0);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      // Set an error first (simulated)
      act(() => {
        useSummaryStore.setState({ error: 'Test error' });
      });
      
      expect(result.current.error).toBe('Test error');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useSummaryStore());
      
      act(() => {
        result.current.setCurrentSession('session-123');
        useSummaryStore.setState({ error: 'Test error', isLoading: true });
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.summaries).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
