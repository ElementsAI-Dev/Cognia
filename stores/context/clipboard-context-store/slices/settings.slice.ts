import type { StoreApi } from 'zustand';
import type { ClipboardContextStore } from '../types';

type ClipboardStoreSet = StoreApi<ClipboardContextStore>['setState'];
type ClipboardStoreGet = StoreApi<ClipboardContextStore>['getState'];

type SettingsSlice = Pick<ClipboardContextStore, 'setAutoAnalyze' | 'setMonitoringInterval'>;

export const createSettingsSlice = (
  set: ClipboardStoreSet,
  get: ClipboardStoreGet
): SettingsSlice => ({
  setAutoAnalyze: (enabled) => {
    set({ autoAnalyze: enabled });
  },

  setMonitoringInterval: (interval) => {
    set({ monitoringInterval: interval });
    // Restart monitoring with new interval if currently monitoring
    if (get().isMonitoring) {
      get().stopMonitoring();
      get().startMonitoring();
    }
  },
});

