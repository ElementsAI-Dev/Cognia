import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialState } from './initial-state';
import { createSubAgentActionsSlice } from './slices/actions.slice';
import type { SubAgentState } from './types';
export const useSubAgentStore = create<SubAgentState>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createSubAgentActionsSlice(set, get),
    }),
    {
      name: 'cognia-sub-agents',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist templates and metrics, not running sub-agents
        templates: state.templates,
        metrics: state.metrics,
      }),
    }
  )
);
export default useSubAgentStore;
