/**
 * useProcessManager - Hook for process management functionality
 */

import { useCallback, useEffect, useRef } from 'react';
import { useProcessStore, type TrackedProcess } from '@/stores/agent/process-store';
import {
  processService,
  isProcessManagementAvailable,
  type ProcessInfo,
  type ProcessFilter,
  type ProcessManagerConfig,
  type StartProcessRequest,
  type StartProcessResult,
} from '@/lib/native/process';

export interface UseProcessManagerReturn {
  // State
  processes: ProcessInfo[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  isAvailable: boolean;

  // Configuration
  config: ProcessManagerConfig;
  configLoading: boolean;

  // Tracked processes
  trackedPids: number[];
  getTrackedByAgent: (agentId: string) => TrackedProcess[];

  // Actions
  refresh: (filter?: ProcessFilter) => Promise<void>;
  search: (query: string) => Promise<void>;
  getTopMemory: (limit?: number) => Promise<void>;
  terminate: (pid: number, force?: boolean) => Promise<boolean>;
  startProcess: (request: StartProcessRequest) => Promise<StartProcessResult | null>;
  trackProcess: (process: TrackedProcess) => void;
  untrackProcess: (pid: number) => void;

  // Configuration management
  refreshConfig: () => Promise<void>;
  updateConfig: (config: ProcessManagerConfig) => Promise<boolean>;
  isProgramAllowed: (program: string) => Promise<boolean>;

  // Settings
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
}

export function useProcessManager(): UseProcessManagerReturn {
  const store = useProcessStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAvailable = isProcessManagementAvailable();

  // Refresh process list
  const refresh = useCallback(
    async (filter?: ProcessFilter) => {
      if (!isAvailable) return;

      store.setLoading(true);
      try {
        const processes = await processService.list(filter);
        store.setProcesses(processes);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to list processes');
      }
    },
    [isAvailable, store]
  );

  // Search processes
  const search = useCallback(
    async (query: string) => {
      if (!isAvailable) return;

      store.setLoading(true);
      try {
        const processes = await processService.search(query, 50);
        store.setProcesses(processes);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to search processes');
      }
    },
    [isAvailable, store]
  );

  // Get top memory processes
  const getTopMemory = useCallback(
    async (limit: number = 20) => {
      if (!isAvailable) return;

      store.setLoading(true);
      try {
        const processes = await processService.topMemory(limit);
        store.setProcesses(processes);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to get top memory processes');
      }
    },
    [isAvailable, store]
  );

  // Terminate a process
  const terminate = useCallback(
    async (pid: number, force: boolean = false): Promise<boolean> => {
      if (!isAvailable) return false;

      try {
        const result = await processService.terminate({ pid, force });
        if (result.success) {
          // Remove from tracked if present
          store.untrackProcess(pid);
          // Refresh list
          await refresh();
        }
        return result.success;
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to terminate process');
        return false;
      }
    },
    [isAvailable, store, refresh]
  );

  // Get tracked processes by agent
  const getTrackedByAgent = useCallback(
    (agentId: string): TrackedProcess[] => {
      return Array.from(store.trackedProcesses.values()).filter((p) => p.agentId === agentId);
    },
    [store.trackedProcesses]
  );

  // Start a new process
  const startProcess = useCallback(
    async (request: StartProcessRequest): Promise<StartProcessResult | null> => {
      if (!isAvailable) return null;

      try {
        const result = await processService.start(request);
        if (result.success && result.pid) {
          // Track the process
          store.trackProcess({
            pid: result.pid,
            program: request.program,
            startedAt: new Date(),
          });
        }
        return result;
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to start process');
        return null;
      }
    },
    [isAvailable, store]
  );

  // Refresh configuration from backend
  const refreshConfig = useCallback(async () => {
    if (!isAvailable) return;

    store.setConfigLoading(true);
    try {
      const config = await processService.getConfig();
      store.setConfig(config);
    } catch (err) {
      store.setError(err instanceof Error ? err.message : 'Failed to get config');
      store.setConfigLoading(false);
    }
  }, [isAvailable, store]);

  // Update configuration
  const updateConfig = useCallback(
    async (config: ProcessManagerConfig): Promise<boolean> => {
      if (!isAvailable) return false;

      store.setConfigLoading(true);
      try {
        await processService.updateConfig(config);
        store.setConfig(config);
        return true;
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Failed to update config');
        store.setConfigLoading(false);
        return false;
      }
    },
    [isAvailable, store]
  );

  // Check if program is allowed
  const isProgramAllowed = useCallback(
    async (program: string): Promise<boolean> => {
      if (!isAvailable) return false;
      try {
        return await processService.isProgramAllowed(program);
      } catch {
        return false;
      }
    },
    [isAvailable]
  );

  // Auto-refresh effect
  useEffect(() => {
    if (!isAvailable || !store.autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    refresh();

    // Set up interval
    intervalRef.current = setInterval(() => {
      refresh();
    }, store.autoRefreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAvailable, store.autoRefresh, store.autoRefreshInterval, refresh]);

  return {
    processes: store.processes,
    isLoading: store.isLoading,
    error: store.error,
    lastRefresh: store.lastRefresh,
    isAvailable,
    config: store.config,
    configLoading: store.configLoading,
    trackedPids: Array.from(store.trackedProcesses.keys()),
    getTrackedByAgent,
    refresh,
    search,
    getTopMemory,
    terminate,
    startProcess,
    trackProcess: store.trackProcess,
    untrackProcess: store.untrackProcess,
    refreshConfig,
    updateConfig,
    isProgramAllowed,
    autoRefresh: store.autoRefresh,
    setAutoRefresh: store.setAutoRefresh,
  };
}

export default useProcessManager;
