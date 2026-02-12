/**
 * useMcpActiveCalls - Hook for managing active MCP tool call state
 * Extracted from mcp-active-calls.tsx component
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useMcpStore, type ActiveToolCall } from '@/stores';
import { getElapsedTime } from '@/lib/mcp/format-utils';

export interface UseMcpActiveCallsOptions {
  autoRefreshMs?: number;
}

export interface UseMcpActiveCallsReturn {
  calls: ActiveToolCall[];
  hasCompleted: boolean;
  hasRunning: boolean;
  handleCancel: (call: ActiveToolCall) => Promise<void>;
  clearCompleted: () => void;
  getCallElapsedTime: (call: ActiveToolCall) => string;
}

export function useMcpActiveCalls({
  autoRefreshMs = 1000,
}: UseMcpActiveCallsOptions = {}): UseMcpActiveCallsReturn {
  const activeToolCalls = useMcpStore((state) => state.activeToolCalls);
  const cancelRequest = useMcpStore((state) => state.cancelRequest);
  const clearCompletedToolCalls = useMcpStore((state) => state.clearCompletedToolCalls);

  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const calls = useMemo(() => {
    const arr = Array.from(activeToolCalls.values());
    arr.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return arr;
  }, [activeToolCalls]);

  const hasCompleted = useMemo(
    () => calls.some((c) => c.status === 'completed' || c.status === 'error' || c.status === 'timeout'),
    [calls]
  );

  const hasRunning = useMemo(
    () => calls.some((c) => c.status === 'running' || c.status === 'pending'),
    [calls]
  );

  useEffect(() => {
    if (hasRunning && autoRefreshMs > 0) {
      intervalRef.current = setInterval(() => setTick((t) => t + 1), autoRefreshMs);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasRunning, autoRefreshMs]);

  const handleCancel = useCallback(
    async (call: ActiveToolCall) => {
      try {
        await cancelRequest(call.serverId, call.id, 'Cancelled by user');
      } catch {
        // cancel may fail silently
      }
    },
    [cancelRequest]
  );

  const getCallElapsedTime = useCallback((call: ActiveToolCall): string => {
    return getElapsedTime(call.startedAt, call.completedAt);
  }, []);

  return {
    calls,
    hasCompleted,
    hasRunning,
    handleCancel,
    clearCompleted: clearCompletedToolCalls,
    getCallElapsedTime,
  };
}
