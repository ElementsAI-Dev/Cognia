/**
 * Agent stores index
 *
 * Note: Skills store has been moved to @/stores/skills
 */

export {
  useAgentStore,
  selectIsAgentRunning,
  selectCurrentStep,
  selectToolExecutions,
  selectCurrentToolId,
  selectAgentProgress,
} from './agent-store';

export {
  useBackgroundAgentStore,
  selectAgents,
  selectQueue,
  selectIsPanelOpen,
  selectSelectedAgentId,
} from './background-agent-store';

export {
  useSubAgentStore,
  selectSubAgents,
  selectGroups,
  selectActiveParentId,
  selectSubAgentCount,
  selectActiveSubAgentCount,
  selectCompletedSubAgentCount,
} from './sub-agent-store';

export {
  useAgentTeamStore,
  selectTeams,
  selectTeammates,
  selectTasks,
  selectMessages,
  selectActiveTeamId,
  selectSelectedTeammateId,
  selectDisplayMode as selectTeamDisplayMode,
  selectIsPanelOpen as selectTeamPanelOpen,
  selectTemplates,
  selectDefaultConfig,
  selectTeamCount,
  selectActiveTeam,
  selectActiveTeammates,
  selectActiveTeamTasks,
} from './agent-team-store';

// Sub-agent components

export {
  useCustomModeStore,
  selectCustomModes,
  selectCustomModeById,
  selectActiveCustomMode,
  selectIsGenerating,
  selectGenerationError,
  selectCustomModeCount,
  TOOL_CATEGORIES,
  ALL_AVAILABLE_TOOLS,
  AVAILABLE_MODE_ICONS,
  type CustomModeConfig,
  type CustomModeCategory,
  type CustomModeA2UITemplate,
  type ModeGenerationRequest,
  type GeneratedModeResult,
} from './custom-mode-store';

export {
  useProcessStore,
  selectProcesses,
  selectIsLoading,
  selectTrackedPids,
  selectTrackedByAgent,
  type ProcessStoreState,
  type TrackedProcess,
} from './process-store';

export {
  useExternalAgentStore,
  selectAgents as selectExternalAgents,
  selectConnectionStatus,
  selectActiveAgentId,
  selectDelegationRules,
  selectEnabled as selectExternalAgentsEnabled,
  selectDefaultPermissionMode,
  selectConnectedAgents,
  selectEnabledAgents,
  selectAgentById as selectExternalAgentById,
  selectActiveAgent as selectActiveExternalAgent,
  selectRunningAgents as selectRunningExternalAgents,
  selectActiveRunningAgents,
  selectTerminals,
  selectRunningTerminals,
  selectSessionTerminals,
  selectIsLoading as selectExternalAgentIsLoading,
  selectLastError as selectExternalAgentLastError,
  type StoredExternalAgentConfig,
  type RunningAgentInstance,
  type TerminalInstance,
  type ExternalAgentState,
  type ExternalAgentActions,
  type ExternalAgentStore,
} from './external-agent-store';
