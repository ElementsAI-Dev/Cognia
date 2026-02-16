import type { StoreApi } from 'zustand';
import { initialState } from '../initial-state';
import type { ClipboardContextStore } from '../types';

type ClipboardStoreSet = StoreApi<ClipboardContextStore>['setState'];
type ClipboardStoreGet = StoreApi<ClipboardContextStore>['getState'];

type UtilitiesSlice = Pick<ClipboardContextStore, 'clearError' | 'reset'>;

export const createUtilitiesSlice = (
  set: ClipboardStoreSet,
  get: ClipboardStoreGet
): UtilitiesSlice => ({
  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    get().stopMonitoring();
    set(initialState);
  },
});

