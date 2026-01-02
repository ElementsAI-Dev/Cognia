/**
 * AI/Agent related hooks
 */

export { useAgent, useConfiguredAgent, type UseAgentOptions, type UseAgentReturn } from './use-agent';
export {
  useAIRegistry,
  useReasoningModel,
  useModelAliases,
  type UseAIRegistryOptions,
  type UseAIRegistryReturn,
} from './use-ai-registry';
export {
  useBackgroundAgent,
  type UseBackgroundAgentOptions,
  type UseBackgroundAgentReturn,
} from './use-background-agent';
export {
  useSubAgent,
  type UseSubAgentOptions,
  type UseSubAgentReturn,
} from './use-sub-agent';
export {
  useOllama,
  type UseOllamaOptions,
  type PullState,
  type UseOllamaReturn,
} from './use-ollama';
export {
  useStructuredOutput,
  type UseStructuredOutputOptions,
  type UseStructuredOutputReturn,
} from './use-structured-output';
export {
  useUnifiedTools,
  type UseUnifiedToolsOptions,
  type UseUnifiedToolsReturn,
} from './use-unified-tools';
export {
  useSkills,
  useSkillSystemPrompt,
  useAutoMatchSkills,
  useSkillTokenBudget,
  type UseSkillsOptions,
  type UseSkillsReturn,
} from './use-skills';
export { usePlanExecutor, type PlanExecutionOptions, type UsePlanExecutorReturn } from './use-plan-executor';
