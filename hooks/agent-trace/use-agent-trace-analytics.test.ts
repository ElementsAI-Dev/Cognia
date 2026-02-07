/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAgentTraceAnalytics } from './use-agent-trace-analytics';

// Mock the repository
const mockGetSessionSummary = jest.fn();
const mockGetStats = jest.fn();

jest.mock('@/lib/db/repositories/agent-trace-repository', () => ({
  agentTraceRepository: {
    getSessionSummary: (...args: unknown[]) => mockGetSessionSummary(...args),
    getStats: (...args: unknown[]) => mockGetStats(...args),
  },
}));

const mockSessionSummary = {
  sessionId: 'session-1',
  traceCount: 10,
  firstTimestamp: '2024-01-15T10:00:00.000Z',
  lastTimestamp: '2024-01-15T10:05:00.000Z',
  durationMs: 300000,
  totalSteps: 3,
  eventTypeCounts: { step_start: 3, step_finish: 3, tool_call_result: 4 },
  toolCallCount: 4,
  toolSuccessCount: 3,
  toolFailureCount: 1,
  toolSuccessRate: 0.75,
  uniqueToolNames: ['file_write', 'code_edit'],
  uniqueFilePaths: ['/src/test.ts', '/src/utils.ts'],
  tokenUsage: { promptTokens: 1500, completionTokens: 500, totalTokens: 2000 },
  totalLatencyMs: 4000,
  avgLatencyMs: 1000,
  models: ['gpt-4'],
  contributors: ['ai'],
};

const mockStats = {
  totalTraces: 50,
  eventTypeCounts: { step_start: 15, tool_call_result: 20, response: 15 },
  sessionCount: 5,
  oldestTimestamp: '2024-01-10T00:00:00.000Z',
  newestTimestamp: '2024-01-15T10:05:00.000Z',
  totalTokens: 25000,
  storageEstimateBytes: 102400,
};

describe('useAgentTraceAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSessionSummary.mockResolvedValue(mockSessionSummary);
    mockGetStats.mockResolvedValue(mockStats);
  });

  describe('initialization', () => {
    it('auto-loads stats on mount when autoLoad is true', async () => {
      renderHook(() => useAgentTraceAnalytics({ autoLoad: true }));
      await waitFor(() => {
        expect(mockGetStats).toHaveBeenCalled();
      });
    });

    it('does not auto-load when autoLoad is false', () => {
      renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(mockGetStats).not.toHaveBeenCalled();
    });

    it('auto-loads session summary when sessionId is provided', async () => {
      renderHook(() => useAgentTraceAnalytics({ sessionId: 'session-1' }));
      await waitFor(() => {
        expect(mockGetSessionSummary).toHaveBeenCalledWith('session-1');
      });
    });

    it('returns initial null state', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.sessionSummary).toBeNull();
      expect(result.current.stats).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('loadSessionSummary', () => {
    it('loads session summary for given session ID', async () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));

      await act(async () => {
        await result.current.loadSessionSummary('session-1');
      });

      expect(mockGetSessionSummary).toHaveBeenCalledWith('session-1');
      expect(result.current.sessionSummary).toEqual(mockSessionSummary);
    });

    it('returns the summary from the call', async () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));

      let returnValue: unknown;
      await act(async () => {
        returnValue = await result.current.loadSessionSummary('session-1');
      });

      expect(returnValue).toEqual(mockSessionSummary);
    });

    it('handles errors gracefully', async () => {
      mockGetSessionSummary.mockRejectedValue(new Error('DB error'));
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));

      await act(async () => {
        await result.current.loadSessionSummary('session-1');
      });

      expect(result.current.error).toBe('DB error');
      expect(result.current.sessionSummary).toBeNull();
    });
  });

  describe('loadStats', () => {
    it('loads global stats', async () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));

      await act(async () => {
        await result.current.loadStats();
      });

      expect(mockGetStats).toHaveBeenCalled();
      expect(result.current.stats).toEqual(mockStats);
    });

    it('handles errors gracefully', async () => {
      mockGetStats.mockRejectedValue(new Error('Stats error'));
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));

      await act(async () => {
        await result.current.loadStats();
      });

      expect(result.current.error).toBe('Stats error');
    });
  });

  describe('formatTokens', () => {
    it('formats small numbers as-is', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatTokens(500)).toBe('500');
    });

    it('formats thousands with K suffix', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatTokens(2500)).toBe('2.5K');
    });

    it('formats millions with M suffix', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatTokens(1500000)).toBe('1.5M');
    });
  });

  describe('formatDuration', () => {
    it('formats milliseconds', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatDuration(500)).toBe('500ms');
    });

    it('formats seconds', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatDuration(2500)).toBe('2.5s');
    });

    it('formats minutes and seconds', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatDuration(125000)).toBe('2m 5s');
    });

    it('formats hours and minutes', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatDuration(3_700_000)).toBe('1h 1m');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatBytes(500)).toBe('500 B');
    });

    it('formats kilobytes', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatBytes(2048)).toBe('2.0 KB');
    });

    it('formats megabytes', () => {
      const { result } = renderHook(() => useAgentTraceAnalytics({ autoLoad: false }));
      expect(result.current.formatBytes(1_048_576)).toBe('1.0 MB');
    });
  });

  describe('refresh', () => {
    it('refreshes both stats and session summary', async () => {
      const { result } = renderHook(() =>
        useAgentTraceAnalytics({ sessionId: 'session-1', autoLoad: false })
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetStats).toHaveBeenCalled();
      expect(mockGetSessionSummary).toHaveBeenCalledWith('session-1');
    });

    it('only refreshes stats when no sessionId', async () => {
      const { result } = renderHook(() =>
        useAgentTraceAnalytics({ autoLoad: false })
      );

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetStats).toHaveBeenCalled();
      expect(mockGetSessionSummary).not.toHaveBeenCalled();
    });
  });
});
