import type { ProcessInfo } from '@/lib/native/process';
import { DEFAULT_PROCESS_CONFIG } from './constants/default-config';
import type { TrackedProcess } from './types';

export const initialState = {
  processes: [] as ProcessInfo[],
  isLoading: false,
  error: null as string | null,
  lastRefresh: null as Date | null,
  trackedProcesses: new Map<number, TrackedProcess>(),
  config: DEFAULT_PROCESS_CONFIG,
  configLoading: false,
  autoRefresh: true,
  autoRefreshInterval: 5000,
};
