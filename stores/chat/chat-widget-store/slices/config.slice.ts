import type { StoreApi } from 'zustand';
import { DEFAULT_CONFIG } from '../initial-state';
import type { ChatWidgetActions, ChatWidgetStore } from '../types';

type ChatWidgetStoreSet = StoreApi<ChatWidgetStore>['setState'];
type ConfigSlice = Pick<ChatWidgetActions, 'updateConfig' | 'resetConfig'>;

export const createConfigSlice = (set: ChatWidgetStoreSet): ConfigSlice => ({
  updateConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  resetConfig: () =>
    set({
      config: DEFAULT_CONFIG,
    }),
});
