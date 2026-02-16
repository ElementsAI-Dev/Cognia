import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { SelectionStore } from './types';

type PersistedSelectionStoreState = Pick<
  SelectionStore,
  'config' | 'isEnabled' | 'history' | 'feedbackGiven' | 'translationMemory'
>;

export const selectionStorePersistConfig: PersistOptions<
  SelectionStore,
  PersistedSelectionStoreState
> = {
  name: 'selection-toolbar-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    config: state.config,
    isEnabled: state.isEnabled,
    history: state.history.slice(0, 50), // Only persist recent history
    feedbackGiven: state.feedbackGiven,
    translationMemory: state.translationMemory.slice(0, 100), // Persist recent translation memory
  }),
};

