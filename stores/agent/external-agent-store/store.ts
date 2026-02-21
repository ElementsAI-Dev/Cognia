import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { initialState } from './initial-state';
import { createExternalAgentActionsSlice } from './slices/actions.slice';
import type { ExternalAgentStore } from './types';
import { getUnsupportedProtocolReason } from '@/lib/ai/agent/external/config-normalizer';

const EXTERNAL_AGENT_STORE_VERSION = 3;

type PersistedExternalAgentState = Partial<
  Pick<
    ExternalAgentStore,
    | 'agents'
    | 'delegationRules'
    | 'activeAgentId'
    | 'enabled'
    | 'defaultPermissionMode'
    | 'autoConnectOnStartup'
    | 'showConnectionNotifications'
    | 'chatFailurePolicy'
  >
>;

function migratePersistedAgents(
  agents: PersistedExternalAgentState['agents']
): PersistedExternalAgentState['agents'] {
  if (!agents) {
    return agents;
  }

  const migrated = { ...agents };
  for (const [agentId, agent] of Object.entries(migrated)) {
    if (!agent) {
      continue;
    }

    if (agent.protocol !== 'acp') {
      migrated[agentId] = {
        ...agent,
        metadata: {
          ...(agent.metadata ?? {}),
          unsupported: true,
          unsupportedProtocol: agent.protocol,
          unsupportedReason: getUnsupportedProtocolReason(agent.protocol),
        },
      };
    }
  }

  return migrated;
}

export const useExternalAgentStore = create<ExternalAgentStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      ...createExternalAgentActionsSlice(set, get),
    }),
    {
      name: 'cognia-external-agents',
      version: EXTERNAL_AGENT_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as PersistedExternalAgentState;
        return {
          ...state,
          agents: migratePersistedAgents(state.agents),
          chatFailurePolicy: state.chatFailurePolicy ?? 'fallback',
        } as ExternalAgentStore;
      },
      partialize: (state) => ({
        agents: state.agents,
        delegationRules: state.delegationRules,
        activeAgentId: state.activeAgentId,
        enabled: state.enabled,
        defaultPermissionMode: state.defaultPermissionMode,
        autoConnectOnStartup: state.autoConnectOnStartup,
        showConnectionNotifications: state.showConnectionNotifications,
        chatFailurePolicy: state.chatFailurePolicy,
      }),
    }
  )
);

export default useExternalAgentStore;
