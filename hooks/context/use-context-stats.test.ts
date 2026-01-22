/**
 * Tests for use-context-stats.ts
 * React hook for monitoring context file usage
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useContextStats } from './use-context-stats';
import * as contextModule from '@/lib/context';

// Mock context module
jest.mock('@/lib/context', () => ({
  getContextStats: jest.fn(),
  gcContextFiles: jest.fn(),
  clearAllContextFiles: jest.fn(),
}));

const mockedContext = contextModule as jest.Mocked<typeof contextModule>;

// Mock stats data
const mockStats = {
  filesByCategory: {
    'tool-output': 5,
    history: 3,
    mcp: 10,
    skills: 2,
    terminal: 1,
    temp: 0,
  },
  totalSizeBytes: 1024 * 50, // 50 KB
  estimatedTotalTokens: 12500,
  oldestFile: new Date('2024-01-01'),
  lastAccessed: new Date('2024-01-15'),
};

describe('useContextStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockedContext.getContextStats.mockResolvedValue(mockStats);
    mockedContext.gcContextFiles.mockResolvedValue({
      filesRemoved: 3,
      bytesFreed: 1024,
    });
    mockedContext.clearAllContextFiles.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with null stats', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.stats).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should refresh on mount when enabled', async () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: true }));

      await waitFor(() => {
        expect(result.current.stats).not.toBeNull();
      });

      expect(mockedContext.getContextStats).toHaveBeenCalled();
      expect(result.current.stats?.filesByCategory['tool-output']).toBe(5);
    });

    it('should not refresh on mount when disabled', () => {
      renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(mockedContext.getContextStats).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should refresh stats manually', async () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockedContext.getContextStats).toHaveBeenCalled();
      expect(result.current.stats).not.toBeNull();
    });

    it('should set loading state during refresh', async () => {
      let resolveStats: () => void;
      mockedContext.getContextStats.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStats = () => resolve(mockStats);
          })
      );

      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      act(() => {
        result.current.refresh();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveStats!();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle refresh error', async () => {
      mockedContext.getContextStats.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe('Failed');
      expect(result.current.stats).toBeNull();
    });
  });

  describe('auto-refresh interval', () => {
    it('should auto-refresh at specified interval', async () => {
      renderHook(() => useContextStats({ refreshOnMount: true, refreshIntervalMs: 5000 }));

      // Initial call on mount
      await waitFor(() => {
        expect(mockedContext.getContextStats).toHaveBeenCalledTimes(1);
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockedContext.getContextStats).toHaveBeenCalledTimes(2);
      });

      // Advance again
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockedContext.getContextStats).toHaveBeenCalledTimes(3);
      });
    });

    it('should not auto-refresh when interval is 0', async () => {
      const { result } = renderHook(() =>
        useContextStats({ refreshOnMount: true, refreshIntervalMs: 0 })
      );

      await waitFor(() => {
        expect(result.current.stats).not.toBeNull();
      });

      // Only initial call
      expect(mockedContext.getContextStats).toHaveBeenCalledTimes(1);

      // Advance timer - should not trigger more calls
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockedContext.getContextStats).toHaveBeenCalledTimes(1);
    });

    it('should cleanup interval on unmount', async () => {
      const { unmount } = renderHook(() =>
        useContextStats({ refreshOnMount: true, refreshIntervalMs: 5000 })
      );

      await waitFor(() => {
        expect(mockedContext.getContextStats).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Advance timer after unmount
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not have been called again
      expect(mockedContext.getContextStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('runGC', () => {
    it('should run garbage collection', async () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      let deleted: number = 0;
      await act(async () => {
        deleted = await result.current.runGC(24 * 60 * 60 * 1000);
      });

      expect(deleted).toBe(3);
      expect(mockedContext.gcContextFiles).toHaveBeenCalledWith({
        maxAge: 24 * 60 * 60 * 1000,
      });
    });

    it('should refresh stats after GC', async () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      await act(async () => {
        await result.current.runGC();
      });

      expect(mockedContext.getContextStats).toHaveBeenCalled();
    });

    it('should handle GC error', async () => {
      mockedContext.gcContextFiles.mockRejectedValue(new Error('GC failed'));

      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      let deleted: number = 0;
      await act(async () => {
        deleted = await result.current.runGC();
      });

      expect(deleted).toBe(0);
      expect(result.current.error).toBe('GC failed');
    });
  });

  describe('clearAll', () => {
    it('should clear all context files', async () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      await act(async () => {
        await result.current.clearAll();
      });

      expect(mockedContext.clearAllContextFiles).toHaveBeenCalled();
    });

    it('should refresh stats after clear', async () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      await act(async () => {
        await result.current.clearAll();
      });

      expect(mockedContext.getContextStats).toHaveBeenCalled();
    });

    it('should handle clear error', async () => {
      mockedContext.clearAllContextFiles.mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      await act(async () => {
        await result.current.clearAll();
      });

      expect(result.current.error).toBe('Clear failed');
    });
  });

  describe('formatSize', () => {
    it('should format bytes', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.formatSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.formatSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.formatSize(1024 * 1024 * 2.5)).toBe('2.50 MB');
    });
  });

  describe('formatTokens', () => {
    it('should format small numbers', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.formatTokens(500)).toBe('500');
    });

    it('should format thousands', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.formatTokens(2500)).toBe('2.5K');
    });

    it('should format millions', () => {
      const { result } = renderHook(() => useContextStats({ refreshOnMount: false }));

      expect(result.current.formatTokens(1500000)).toBe('1.50M');
    });
  });
});
