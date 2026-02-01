/**
 * Tests for useLogStream hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLogStream, useLogModules } from './use-log-stream';

// Mock IndexedDBTransport
const mockGetLogs = jest.fn();
const mockClear = jest.fn();

jest.mock('@/lib/logger', () => ({
  IndexedDBTransport: jest.fn().mockImplementation(() => ({
    getLogs: mockGetLogs,
    clear: mockClear,
  })),
}));

describe('useLogStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLogs.mockResolvedValue([]);
  });

  describe('initialization', () => {
    it('should return initial state', async () => {
      const { result } = renderHook(() => useLogStream());

      // Wait for initial fetch to complete
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

      expect(mockGetLogs).toHaveBeenCalledWith({
        limit: 500,
        level: 'error',
        module: 'test-module',
      });
    });
  });

  describe('fetchLogs', () => {
    it('should fetch logs from IndexedDB', async () => {
      const mockLogs = [
        { id: '1', level: 'info', message: 'Test log', module: 'test', timestamp: Date.now() },
      ];
      mockGetLogs.mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.logs).toEqual(mockLogs);
    });

    it('should filter by trace ID', async () => {
      mockGetLogs.mockResolvedValue([]);

      renderHook(() => useLogStream({ traceId: 'trace-123' }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(mockGetLogs).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'trace-123' })
      );
    });

    it('should filter by search query', async () => {
      const mockLogs = [
        { id: '1', level: 'info', message: 'Hello world', module: 'test', timestamp: Date.now() },
        { id: '2', level: 'info', message: 'Goodbye world', module: 'test', timestamp: Date.now() },
      ];
      mockGetLogs.mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useLogStream({ searchQuery: 'hello' }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.logs).toEqual([mockLogs[0]]);
    });

    it('should handle fetch error', async () => {
      mockGetLogs.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.error).toEqual(new Error('Fetch failed'));
    });
  });

  describe('refresh', () => {
    it('should refresh logs', async () => {
      mockGetLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockGetLogs.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetLogs).toHaveBeenCalled();
    });
  });

  describe('clearLogs', () => {
    it('should clear all logs', async () => {
      mockClear.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.clearLogs();
      });

      expect(mockClear).toHaveBeenCalled();
      expect(result.current.logs).toEqual([]);
    });

    it('should handle clear error', async () => {
      mockClear.mockRejectedValue(new Error('Clear failed'));

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
      const mockLogs = [
        { id: '1', level: 'info', message: 'Test', module: 'test', timestamp: Date.now() },
      ];
      mockGetLogs.mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useLogStream());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      const exported = result.current.exportLogs('json');
      expect(JSON.parse(exported)).toEqual(mockLogs);
    });

    it('should export logs as text', async () => {
      const timestamp = Date.now();
      const mockLogs = [
        { id: '1', level: 'info', message: 'Test message', module: 'test-mod', timestamp, traceId: 'abc12345' },
      ];
      mockGetLogs.mockResolvedValue(mockLogs);

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
      mockGetLogs.mockResolvedValue([]);

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
      const mockLogs = [
        { id: '1', level: 'info', message: 'Test 1', module: 'module-a', timestamp: Date.now() },
        { id: '2', level: 'error', message: 'Test 2', module: 'module-a', timestamp: Date.now() },
        { id: '3', level: 'info', message: 'Test 3', module: 'module-b', timestamp: Date.now() },
      ];
      mockGetLogs.mockResolvedValue(mockLogs);

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
      const mockLogs = [
        { id: '1', level: 'info', message: 'Test 1', module: 'test', timestamp: Date.now(), traceId: 'trace-1' },
        { id: '2', level: 'info', message: 'Test 2', module: 'test', timestamp: Date.now(), traceId: 'trace-1' },
        { id: '3', level: 'info', message: 'Test 3', module: 'test', timestamp: Date.now(), traceId: 'trace-2' },
      ];
      mockGetLogs.mockResolvedValue(mockLogs);

      const { result } = renderHook(() => useLogStream({ groupByTraceId: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.groupedLogs.size).toBe(2);
      expect(result.current.groupedLogs.get('trace-1')?.length).toBe(2);
      expect(result.current.groupedLogs.get('trace-2')?.length).toBe(1);
    });

    it('should not group logs when disabled', async () => {
      mockGetLogs.mockResolvedValue([]);

      const { result } = renderHook(() => useLogStream({ groupByTraceId: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.groupedLogs.size).toBe(0);
    });
  });
});

describe('useLogModules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return unique module names', async () => {
    const mockLogs = [
      { id: '1', level: 'info', message: 'Test 1', module: 'module-b', timestamp: Date.now() },
      { id: '2', level: 'info', message: 'Test 2', module: 'module-a', timestamp: Date.now() },
      { id: '3', level: 'info', message: 'Test 3', module: 'module-b', timestamp: Date.now() },
    ];
    mockGetLogs.mockResolvedValue(mockLogs);

    const { result } = renderHook(() => useLogModules());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toEqual(['module-a', 'module-b']);
  });

  it('should return empty array on error', async () => {
    mockGetLogs.mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useLogModules());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toEqual([]);
  });
});
