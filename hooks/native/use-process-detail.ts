/**
 * useProcessDetail - Hook for fetching and polling a single process's details
 *
 * Provides real-time process information with configurable polling interval.
 * Integrates with the existing processService and process store.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  processService,
  isProcessManagementAvailable,
  type ProcessInfo,
} from '@/lib/native/process';

export interface UseProcessDetailOptions {
  /** Process ID to monitor */
  pid: number | null;
  /** Polling interval in ms (default: 2000) */
  pollInterval?: number;
  /** Whether to enable polling (default: true) */
  enablePolling?: boolean;
}

export interface UseProcessDetailReturn {
  /** Current process info */
  process: ProcessInfo | null;
  /** Whether the process data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether the process was found */
  isFound: boolean;
  /** Whether the platform supports process management */
  isAvailable: boolean;
  /** Last time the data was refreshed */
  lastRefresh: Date | null;
  /** Manually refresh the process data */
  refresh: () => Promise<void>;
  /** Child processes of this process */
  children: ProcessInfo[];
  /** Whether children are loading */
  childrenLoading: boolean;
  /** Refresh children list */
  refreshChildren: () => Promise<void>;
}

export function useProcessDetail({
  pid,
  pollInterval = 2000,
  enablePolling = true,
}: UseProcessDetailOptions): UseProcessDetailReturn {
  const [process, setProcess] = useState<ProcessInfo | null>(null);
  const [children, setChildren] = useState<ProcessInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAvailable = isProcessManagementAvailable();

  const fetchProcess = useCallback(async () => {
    if (!isAvailable || pid === null) return;

    setIsLoading(true);
    try {
      const result = await processService.get(pid);
      setProcess(result);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch process');
      setProcess(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, pid]);

  const fetchChildren = useCallback(async () => {
    if (!isAvailable || pid === null) return;

    setChildrenLoading(true);
    try {
      const allProcesses = await processService.list({
        parentPid: pid,
        limit: 100,
      });
      setChildren(allProcesses);
    } catch {
      setChildren([]);
    } finally {
      setChildrenLoading(false);
    }
  }, [isAvailable, pid]);

  // Initial fetch
  useEffect(() => {
    if (pid !== null) {
      fetchProcess();
      fetchChildren();
    } else {
      setProcess(null);
      setChildren([]);
      setError(null);
    }
  }, [pid, fetchProcess, fetchChildren]);

  // Polling
  useEffect(() => {
    if (!isAvailable || !enablePolling || pid === null) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchProcess();
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAvailable, enablePolling, pollInterval, pid, fetchProcess]);

  return {
    process,
    isLoading,
    error,
    isFound: process !== null,
    isAvailable,
    lastRefresh,
    refresh: fetchProcess,
    children,
    childrenLoading,
    refreshChildren: fetchChildren,
  };
}

export default useProcessDetail;
