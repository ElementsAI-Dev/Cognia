/**
 * React hook for managing agent trace checkpoints.
 * Provides checkpoint listing, diff generation, rollback, and cleanup.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DBCheckpoint } from '@/lib/db/schema';
import {
  getSessionCheckpoints,
  getSessionCheckpointSummary,
  generateDiff,
  deleteCheckpoint,
  deleteSessionCheckpoints,
  deleteAllCheckpoints,
  countCheckpoints,
  type FileDiff,
  type SessionCheckpointSummary,
} from '@/lib/agent-trace/checkpoint-manager';

export interface UseCheckpointsOptions {
  sessionId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseCheckpointsReturn {
  checkpoints: DBCheckpoint[];
  summary: SessionCheckpointSummary | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getDiff: (checkpointId: string) => Promise<FileDiff | null>;
  remove: (checkpointId: string) => Promise<void>;
  clearSession: () => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useCheckpoints(options: UseCheckpointsOptions = {}): UseCheckpointsReturn {
  const { sessionId, autoRefresh = false, refreshInterval = 10000 } = options;

  const [checkpoints, setCheckpoints] = useState<DBCheckpoint[]>([]);
  const [summary, setSummary] = useState<SessionCheckpointSummary | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const total = await countCheckpoints();
      if (!mountedRef.current) return;
      setTotalCount(total);

      if (sessionId) {
        const [cps, sum] = await Promise.all([
          getSessionCheckpoints(sessionId),
          getSessionCheckpointSummary(sessionId),
        ]);
        if (!mountedRef.current) return;
        setCheckpoints(cps);
        setSummary(sum);
      } else {
        setCheckpoints([]);
        setSummary(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load checkpoints');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [sessionId]);

  // Initial load and session change
  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !sessionId) return;
    const interval = setInterval(() => {
      void refresh();
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, sessionId, refreshInterval, refresh]);

  const getDiff = useCallback(async (checkpointId: string): Promise<FileDiff | null> => {
    try {
      return await generateDiff(checkpointId);
    } catch {
      return null;
    }
  }, []);

  const remove = useCallback(
    async (checkpointId: string) => {
      await deleteCheckpoint(checkpointId);
      await refresh();
    },
    [refresh]
  );

  const clearSession = useCallback(async () => {
    if (!sessionId) return;
    await deleteSessionCheckpoints(sessionId);
    await refresh();
  }, [sessionId, refresh]);

  const clearAll = useCallback(async () => {
    await deleteAllCheckpoints();
    await refresh();
  }, [refresh]);

  return {
    checkpoints,
    summary,
    totalCount,
    isLoading,
    error,
    refresh,
    getDiff,
    remove,
    clearSession,
    clearAll,
  };
}
