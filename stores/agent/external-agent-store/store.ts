import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialState } from './initial-state';
import { createExternalAgentActionsSlice } from './slices/actions.slice';
import type { ExternalAgentStore } from './types';

export const useExternalAgentStore = create<ExternalAgentStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createExternalAgentActionsSlice(set, get),
    }),
    {
      name: 'cognia-external-agents',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        agents: state.agents,
        delegationRules: state.delegationRules,
        activeAgentId: state.activeAgentId,
        enabled: state.enabled,
        defaultPermissionMode: state.defaultPermissionMode,
        autoConnectOnStartup: state.autoConnectOnStartup,
        showConnectionNotifications: state.showConnectionNotifications,
      }),
    }
  )
);

export default useExternalAgentStore;
