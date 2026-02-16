import type { ProcessInfo, ProcessManagerConfig } from '@/lib/native/process';

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

  // Configuration (synced from backend)
  config: ProcessManagerConfig;
  configLoading: boolean;

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
  setConfig: (config: ProcessManagerConfig) => void;
  setConfigLoading: (loading: boolean) => void;
  reset: () => void;
}
