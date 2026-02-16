import type { StoreApi } from 'zustand';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isTauri } from '@/lib/native/utils';
import type { ClipboardContextStore } from '../types';

type ClipboardStoreSet = StoreApi<ClipboardContextStore>['setState'];
type ClipboardStoreGet = StoreApi<ClipboardContextStore>['getState'];

type MonitoringSlice = Pick<ClipboardContextStore, 'startMonitoring' | 'stopMonitoring'>;

let monitoringIntervalId: ReturnType<typeof setInterval> | null = null;
let eventUnlisten: UnlistenFn | null = null;

export const createMonitoringSlice = (
  set: ClipboardStoreSet,
  get: ClipboardStoreGet
): MonitoringSlice => ({
  startMonitoring: () => {
    if (get().isMonitoring) return;

    set({ isMonitoring: true });

    // Start polling interval
    monitoringIntervalId = setInterval(async () => {
      const result = await get().getCurrentWithAnalysis();
      if (result) {
        set({ lastUpdateTime: Date.now() });
      }
    }, get().monitoringInterval);

    // Listen for clipboard change events
    if (isTauri()) {
      listen('clipboard-changed', async () => {
        await get().getCurrentWithAnalysis();
        set({ lastUpdateTime: Date.now() });
      }).then((unlisten) => {
        eventUnlisten = unlisten;
      });
    }
  },

  stopMonitoring: () => {
    if (monitoringIntervalId) {
      clearInterval(monitoringIntervalId);
      monitoringIntervalId = null;
    }
    if (eventUnlisten) {
      eventUnlisten();
      eventUnlisten = null;
    }
    set({ isMonitoring: false });
  },
});

