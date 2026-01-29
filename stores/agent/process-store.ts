/**
 * Process Management Store - State management for process monitoring and control
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProcessInfo } from '@/lib/native/process';

export interface TrackedProcess {
  pid: number;
  agentId?: string;
  agentName?: string;
  startedAt: Date;
  program: string;
}

export interface ProcessStoreState {
  // Process list
  processes: ProcessInfo[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;

  // Tracked processes (started by agents)
  trackedProcesses: Map<number, TrackedProcess>;

  // Settings
  autoRefresh: boolean;
  autoRefreshInterval: number; // ms

  // Actions
  setProcesses: (processes: ProcessInfo[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  trackProcess: (process: TrackedProcess) => void;
  untrackProcess: (pid: number) => void;
  clearTracked: () => void;
  setAutoRefresh: (enabled: boolean) => void;
  setAutoRefreshInterval: (interval: number) => void;
  reset: () => void;
}

const initialState = {
  processes: [] as ProcessInfo[],
  isLoading: false,
  error: null as string | null,
  lastRefresh: null as Date | null,
  trackedProcesses: new Map<number, TrackedProcess>(),
  autoRefresh: true,
  autoRefreshInterval: 5000,
};

export const useProcessStore = create<ProcessStoreState>()(
  persist(
    (set) => ({
      ...initialState,

      setProcesses: (processes) =>
        set({
          processes,
          lastRefresh: new Date(),
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      trackProcess: (process) =>
        set((state) => {
          const newTracked = new Map(state.trackedProcesses);
          newTracked.set(process.pid, process);
          return { trackedProcesses: newTracked };
        }),

      untrackProcess: (pid) =>
        set((state) => {
          const newTracked = new Map(state.trackedProcesses);
          newTracked.delete(pid);
          return { trackedProcesses: newTracked };
        }),

      clearTracked: () => set({ trackedProcesses: new Map() }),

      setAutoRefresh: (autoRefresh) => set({ autoRefresh }),

      setAutoRefreshInterval: (autoRefreshInterval) => set({ autoRefreshInterval }),

      reset: () => set(initialState),
    }),
    {
      name: 'cognia-process-store',
      partialize: (state) => ({
        autoRefresh: state.autoRefresh,
        autoRefreshInterval: state.autoRefreshInterval,
        // Convert Map to array for persistence
        trackedProcesses: Array.from(state.trackedProcesses.entries()),
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<ProcessStoreState> & {
          trackedProcesses?: [number, TrackedProcess][];
        };
        return {
          ...current,
          ...persistedState,
          // Convert array back to Map
          trackedProcesses: persistedState.trackedProcesses
            ? new Map(persistedState.trackedProcesses)
            : new Map(),
        };
      },
    }
  )
);

// Selectors
export const selectProcesses = (state: ProcessStoreState) => state.processes;
export const selectIsLoading = (state: ProcessStoreState) => state.isLoading;
export const selectTrackedPids = (state: ProcessStoreState) =>
  Array.from(state.trackedProcesses.keys());
export const selectTrackedByAgent = (agentId: string) => (state: ProcessStoreState) =>
  Array.from(state.trackedProcesses.values()).filter((p) => p.agentId === agentId);
