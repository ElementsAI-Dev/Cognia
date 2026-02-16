import type { StoreApi } from 'zustand';
import { initialState } from '../initial-state';
import type { ContextStore } from '../types';

type ContextStoreSet = StoreApi<ContextStore>['setState'];

type ResetSlice = Pick<ContextStore, 'clearContext' | 'reset'>;

export const createResetSlice = (set: ContextStoreSet): ResetSlice => ({
  clearContext: () =>
    set({
      context: null,
      window: null,
      app: null,
      file: null,
      browser: null,
      editor: null,
      uiElements: [],
      lastUpdated: null,
    }),

  reset: () => set(initialState),
});

