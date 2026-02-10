/**
 * Tests for useLogStream hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLogStream, useLogModules } from './use-log-stream';

// Mock instance must be created INSIDE the factory to avoid jest.mock hoisting issues.
// jest.mock is hoisted above all variable declarations, so external vars are undefined
// when the factory executes.
jest.mock('@/lib/logger', () => {
  const instance = {
    getLogs: jest.fn().mockResolvedValue([]),
    clear: jest.fn(),
    getStats: jest.fn().mockResolvedValue({ total: 0, byLevel: {}, byModule: {} }),
  };

  const onLogsUpdated = jest.fn(() => jest.fn());

  const MockTransport = jest.fn(() => instance);
  Object.defineProperty(MockTransport, 'onLogsUpdated', {
    value: onLogsUpdated,
    writable: true,
  });

  return {
    IndexedDBTransport: MockTransport,
    __mockInstance: instance,
    __mockOnLogsUpdated: onLogsUpdated,
  };
});

// Access mock internals via jest.requireMock (safe after jest.mock is set up)
const { __mockInstance: mockInstance, __mockOnLogsUpdated: mockOnLogsUpdated } =
  jest.requireMock<Record<string, unknown>>('@/lib/logger') as {
    __mockInstance: { getLogs: jest.Mock; clear: jest.Mock; getStats: jest.Mock };
    __mockOnLogsUpdated: jest.Mock;
  };

describe('useLogStream', () => {
  beforeEach(() => {
    // Re-assign mock functions to avoid clearAllMocks disrupting singleton
    mockInstance.getLogs = jest.fn().mockResolvedValue([]);
    mockInstance.clear = jest.fn();
    mockInstance.getStats = jest.fn().mockResolvedValue({ total: 0, byLevel: {}, byModule: {} });
    mockOnLogsUpdated.mockClear();
  });

  describe('initialization', () => {
    it('should return initial state', async () => {
      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.logs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.groupedLogs).toBeInstanceOf(Map);
    });

    it('should accept options', async () => {
      const options = {
        autoRefresh: false,
        refreshInterval: 5000,
        maxLogs: 500,
        level: 'error' as const,
        module: 'test-module',
      };

      renderHook(() => useLogStream(options));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockInstance.getLogs).toHaveBeenCalledWith({
        limit: 500,
        level: 'error',
        module: 'test-module',
      });
    });
  });

  describe('fetchLogs', () => {
    it('should fetch logs from IndexedDB', async () => {
      const testLogs = [
        { id: '1', level: 'info', message: 'Test log', module: 'test', timestamp: Date.now() },
      ];
      mockInstance.getLogs.mockResolvedValue(testLogs);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.logs).toEqual(testLogs);
    });

    it('should filter by trace ID', async () => {
      mockInstance.getLogs.mockResolvedValue([]);

      renderHook(() => useLogStream({ traceId: 'trace-123' }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockInstance.getLogs).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'trace-123' })
      );
    });

    it('should filter by search query', async () => {
      const testLogs = [
        { id: '1', level: 'info', message: 'Hello world', module: 'test', timestamp: Date.now() },
        { id: '2', level: 'info', message: 'Goodbye world', module: 'test', timestamp: Date.now() },
      ];
      mockInstance.getLogs.mockResolvedValue(testLogs);

      const { result } = renderHook(() => useLogStream({ searchQuery: 'hello' }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.logs).toEqual([testLogs[0]]);
    });

    it('should handle fetch error', async () => {
      mockInstance.getLogs.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toEqual(new Error('Fetch failed'));
    });
  });

  describe('refresh', () => {
    it('should refresh logs', async () => {
      mockInstance.getLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockInstance.getLogs.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockInstance.getLogs).toHaveBeenCalled();
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', async () => {
      mockInstance.clear.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.clearLogs();
      });

      expect(mockInstance.clear).toHaveBeenCalled();
      expect(result.current.logs).toEqual([]);
    });

    it('should handle clear error', async () => {
      mockInstance.clear.mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.clearLogs();
      });

      expect(result.current.error).toEqual(new Error('Clear failed'));
    });
  });

  describe('exportLogs', () => {
    it('should export logs as JSON', async () => {
      const testLogs = [
        { id: '1', level: 'info', message: 'Test', module: 'test', timestamp: Date.now() },
      ];
      mockInstance.getLogs.mockResolvedValue(testLogs);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const exported = result.current.exportLogs('json');
      expect(JSON.parse(exported)).toEqual(testLogs);
    });

    it('should export logs as text', async () => {
      const timestamp = Date.now();
      const testLogs = [
        { id: '1', level: 'info', message: 'Test message', module: 'test-mod', timestamp, traceId: 'abc12345' },
      ];
      mockInstance.getLogs.mockResolvedValue(testLogs);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const exported = result.current.exportLogs('text');
      expect(exported).toContain('INFO');
      expect(exported).toContain('test-mod');
      expect(exported).toContain('Test message');
      expect(exported).toContain('[abc12345');
    });

    it('should default to JSON format', async () => {
      mockInstance.getLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const exported = result.current.exportLogs();
      expect(exported).toBe('[]');
    });
  });

  describe('stats', () => {
    it('should calculate log statistics', async () => {
      const testLogs = [
        { id: '1', level: 'info', message: 'Test 1', module: 'module-a', timestamp: Date.now() },
        { id: '2', level: 'error', message: 'Test 2', module: 'module-a', timestamp: Date.now() },
        { id: '3', level: 'info', message: 'Test 3', module: 'module-b', timestamp: Date.now() },
      ];
      mockInstance.getLogs.mockResolvedValue(testLogs);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.stats.total).toBe(3);
      expect(result.current.stats.byLevel.info).toBe(2);
      expect(result.current.stats.byLevel.error).toBe(1);
      expect(result.current.stats.byModule['module-a']).toBe(2);
      expect(result.current.stats.byModule['module-b']).toBe(1);
    });
  });

  describe('groupedLogs', () => {
    it('should group logs by trace ID when enabled', async () => {
      const testLogs = [
        { id: '1', level: 'info', message: 'Test 1', module: 'test', timestamp: Date.now(), traceId: 'trace-1' },
        { id: '2', level: 'info', message: 'Test 2', module: 'test', timestamp: Date.now(), traceId: 'trace-1' },
        { id: '3', level: 'info', message: 'Test 3', module: 'test', timestamp: Date.now(), traceId: 'trace-2' },
      ];
      mockInstance.getLogs.mockResolvedValue(testLogs);

      const { result } = renderHook(() => useLogStream({ groupByTraceId: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.groupedLogs.size).toBe(2);
      expect(result.current.groupedLogs.get('trace-1')?.length).toBe(2);
      expect(result.current.groupedLogs.get('trace-2')?.length).toBe(1);
    });

    it('should not group logs when disabled', async () => {
      mockInstance.getLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream({ groupByTraceId: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.groupedLogs.size).toBe(0);
    });
  });

  describe('loading state', () => {
    it('should not flash loading on subsequent refreshes', async () => {
      mockInstance.getLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // After initial fetch, loading should be false
      expect(result.current.isLoading).toBe(false);

      // Manual refresh should not set loading to true
      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('BroadcastChannel integration', () => {
    it('should subscribe to log updates when autoRefresh is enabled', async () => {
      renderHook(() => useLogStream({ autoRefresh: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockOnLogsUpdated).toHaveBeenCalled();
    });

    it('should not subscribe to log updates when autoRefresh is disabled', async () => {
      renderHook(() => useLogStream({ autoRefresh: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockOnLogsUpdated).not.toHaveBeenCalled();
    });
  });
});

describe('useLogModules', () => {
  beforeEach(() => {
    mockInstance.getLogs = jest.fn().mockResolvedValue([]);
    mockInstance.clear = jest.fn();
    mockInstance.getStats = jest.fn().mockResolvedValue({
      total: 3,
      byLevel: { info: 3 },
      byModule: { 'module-a': 2, 'module-b': 1 },
    });
    mockOnLogsUpdated.mockClear();
  });

  it('should return unique module names from stats', async () => {
    const { result } = renderHook(() => useLogModules());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toEqual(['module-a', 'module-b']);
  });

  it('should return empty array on error', async () => {
    mockInstance.getStats.mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useLogModules());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toEqual([]);
  });
});
