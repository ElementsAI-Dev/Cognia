import type { StoreApi } from 'zustand';
import type { SummaryStore, SummaryStoreActions } from '../types';

type SummaryStoreSet = StoreApi<SummaryStore>['setState'];
type SummaryStoreGet = StoreApi<SummaryStore>['getState'];
type ConfigSlice = Pick<SummaryStoreActions, 'updateAutoSummaryConfig' | 'shouldSuggestSummary'>;

export const createConfigSlice = (set: SummaryStoreSet, get: SummaryStoreGet): ConfigSlice => ({
  updateAutoSummaryConfig: (config) => {
    set((state) => ({
      autoSummaryConfig: { ...state.autoSummaryConfig, ...config },
    }));
  },

  shouldSuggestSummary: (messageCount, tokenCount) => {
    const { autoSummaryConfig } = get();
    if (!autoSummaryConfig.enabled) return false;
    return messageCount >= autoSummaryConfig.minMessages || tokenCount >= autoSummaryConfig.minTokens;
  },
});
