import type { StoreApi } from 'zustand';
import type { ProcessStoreState } from '../types';

type ProcessStoreSet = StoreApi<ProcessStoreState>['setState'];

type TrackedSlice = Pick<ProcessStoreState, 'trackProcess' | 'untrackProcess' | 'clearTracked'>;

export const createTrackedSlice = (set: ProcessStoreSet): TrackedSlice => ({
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
});
