/**
 * Agent execution and management hooks
 */

export {
  useAgent,
  useConfiguredAgent,
  type UseAgentOptions,
  type UseAgentReturn,
} from './use-agent';
export {
  useBackgroundAgent,
  type UseBackgroundAgentOptions,
  type UseBackgroundAgentReturn,
} from './use-background-agent';
export { useSubAgent, type UseSubAgentOptions, type UseSubAgentReturn } from './use-sub-agent';
export {
  usePlanExecutor,
  type PlanExecutionOptions,
  type UsePlanExecutorReturn,
} from './use-plan-executor';
export {
  useUnifiedTools,
  type UseUnifiedToolsOptions,
  type UseUnifiedToolsReturn,
} from './use-unified-tools';
export {
  useToolHistory,
  type UseToolHistoryOptions,
  type UseToolHistoryReturn,
} from './use-tool-history';
export {
  useAgentMode,
  type UseAgentModeOptions,
  type UseAgentModeResult,
  type UnifiedAgentMode,
} from './use-agent-mode';
export {
  useProcessManager,
  type UseProcessManagerReturn,
} from './use-process-manager';
export {
  useExternalAgent,
  useExternalAgentById,
  useConnectedExternalAgents,
  useExternalAgentConnectionStatus,
  type UseExternalAgentState,
  type UseExternalAgentActions,
  type UseExternalAgentReturn,
} from './use-external-agent';
