import type { ProcessStoreState } from './types';

// Selectors
export const selectProcesses = (state: ProcessStoreState) => state.processes;
export const selectIsLoading = (state: ProcessStoreState) => state.isLoading;
export const selectTrackedPids = (state: ProcessStoreState) =>
  Array.from(state.trackedProcesses.keys());
export const selectTrackedByAgent = (agentId: string) => (state: ProcessStoreState) =>
  Array.from(state.trackedProcesses.values()).filter((p) => p.agentId === agentId);
