import type { ExternalAgentState } from './types';

export const initialState: ExternalAgentState = {
  agents: {},
  connectionStatus: {},
  activeAgentId: null,
  delegationRules: [],
  enabled: true,
  defaultPermissionMode: 'default',
  autoConnectOnStartup: false,
  showConnectionNotifications: true,
  // Runtime state
  runningAgents: {},
  runningAgentIds: [],
  terminals: {},
  terminalIds: [],
  isLoading: false,
  lastError: null,
};
