/**
 * Tests for useMcpActiveCalls hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpActiveCalls } from './use-mcp-active-calls';
import type { ActiveToolCall } from '@/stores';

// Mock format-utils
jest.mock('@/lib/mcp/format-utils', () => ({
  getElapsedTime: jest.fn((start: Date, end?: Date) => {
    const elapsed = (end || new Date()).getTime() - start.getTime();
    if (elapsed < 1000) return `${elapsed}ms`;
    return `${(elapsed / 1000).toFixed(1)}s`;
  }),
}));

// Mock the MCP store with selector support
const mockStoreState: Record<string, unknown> = {};
jest.mock('@/stores', () => ({
  useMcpStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  }),
}));

describe('useMcpActiveCalls', () => {
  const mockCancelRequest = jest.fn();
  const mockClearCompletedToolCalls = jest.fn();

  const createCall = (overrides: Partial<ActiveToolCall> = {}): ActiveToolCall => ({
    id: 'call-1',
    serverId: 'server-1',
    toolName: 'test-tool',
    status: 'running',
    startedAt: new Date('2024-01-01T00:00:00Z'),
    args: {},
    ...overrides,
  });

  const setMockStore = (overrides: Record<string, unknown> = {}) => {
    Object.assign(mockStoreState, {
      activeToolCalls: new Map<string, ActiveToolCall>(),
      cancelRequest: mockCancelRequest,
      clearCompletedToolCalls: mockClearCompletedToolCalls,
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset store state
    for (const key of Object.keys(mockStoreState)) delete mockStoreState[key];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return empty calls array when no active calls', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpActiveCalls());

      expect(result.current.calls).toEqual([]);
      expect(result.current.hasCompleted).toBe(false);
      expect(result.current.hasRunning).toBe(false);
      expect(typeof result.current.handleCancel).toBe('function');
      expect(typeof result.current.clearCompleted).toBe('function');
      expect(typeof result.current.getCallElapsedTime).toBe('function');
    });
  });

  describe('calls sorting', () => {
    it('should sort calls by startedAt descending (newest first)', () => {
      const call1 = createCall({ id: 'call-1', startedAt: new Date('2024-01-01T00:00:00Z') });
      const call2 = createCall({ id: 'call-2', startedAt: new Date('2024-01-01T01:00:00Z') });
      const call3 = createCall({ id: 'call-3', startedAt: new Date('2024-01-01T00:30:00Z') });
      const callsMap = new Map([
        ['call-1', call1],
        ['call-2', call2],
        ['call-3', call3],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());

      expect(result.current.calls[0].id).toBe('call-2');
      expect(result.current.calls[1].id).toBe('call-3');
      expect(result.current.calls[2].id).toBe('call-1');
    });
  });

  describe('hasCompleted', () => {
    it('should be true when a call has completed status', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'completed' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasCompleted).toBe(true);
    });

    it('should be true when a call has error status', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'error' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasCompleted).toBe(true);
    });

    it('should be true when a call has timeout status', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'timeout' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasCompleted).toBe(true);
    });

    it('should be false when only running calls', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'running' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasCompleted).toBe(false);
    });
  });

  describe('hasRunning', () => {
    it('should be true when a call is running', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'running' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasRunning).toBe(true);
    });

    it('should be true when a call is pending', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'pending' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasRunning).toBe(true);
    });

    it('should be false when all calls completed', () => {
      const callsMap = new Map([
        ['call-1', createCall({ id: 'call-1', status: 'completed' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { result } = renderHook(() => useMcpActiveCalls());
      expect(result.current.hasRunning).toBe(false);
    });
  });

  describe('handleCancel', () => {
    it('should call cancelRequest with correct args', async () => {
      mockCancelRequest.mockResolvedValue(undefined);
      setMockStore();
      const call = createCall({ id: 'call-1', serverId: 'srv-1' });

      const { result } = renderHook(() => useMcpActiveCalls());

      await act(async () => {
        await result.current.handleCancel(call);
      });

      expect(mockCancelRequest).toHaveBeenCalledWith('srv-1', 'call-1', 'Cancelled by user');
    });

    it('should not throw when cancelRequest fails', async () => {
      mockCancelRequest.mockRejectedValue(new Error('cancel failed'));
      setMockStore();
      const call = createCall();

      const { result } = renderHook(() => useMcpActiveCalls());

      await expect(
        act(async () => {
          await result.current.handleCancel(call);
        })
      ).resolves.not.toThrow();
    });
  });

  describe('clearCompleted', () => {
    it('should delegate to store clearCompletedToolCalls', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpActiveCalls());

      act(() => {
        result.current.clearCompleted();
      });

      expect(mockClearCompletedToolCalls).toHaveBeenCalled();
    });
  });

  describe('getCallElapsedTime', () => {
    it('should return formatted elapsed time', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpActiveCalls());
      const call = createCall({
        startedAt: new Date('2024-01-01T00:00:00.000Z'),
        completedAt: new Date('2024-01-01T00:00:00.500Z'),
      });

      const elapsed = result.current.getCallElapsedTime(call);
      expect(elapsed).toBe('500ms');
    });
  });

  describe('auto-refresh', () => {
    it('should set up interval when hasRunning is true', () => {
      const callsMap = new Map([
        ['call-1', createCall({ status: 'running' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      renderHook(() => useMcpActiveCalls({ autoRefreshMs: 500 }));

      expect(jest.getTimerCount()).toBe(1);
    });

    it('should not set up interval when no running calls', () => {
      const callsMap = new Map([
        ['call-1', createCall({ status: 'completed' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      renderHook(() => useMcpActiveCalls({ autoRefreshMs: 500 }));

      expect(jest.getTimerCount()).toBe(0);
    });

    it('should clean up interval on unmount', () => {
      const callsMap = new Map([
        ['call-1', createCall({ status: 'running' })],
      ]);
      setMockStore({ activeToolCalls: callsMap });

      const { unmount } = renderHook(() => useMcpActiveCalls({ autoRefreshMs: 500 }));

      expect(jest.getTimerCount()).toBe(1);

      unmount();

      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
