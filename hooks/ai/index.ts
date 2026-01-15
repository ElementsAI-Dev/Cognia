/**
 * AI provider and model related hooks
 * 
 * Note: Agent-specific hooks have been moved to @/hooks/agent
 * Note: Skills-related hooks have been moved to @/hooks/skills
 */

export {
  useAIRegistry,
  useReasoningModel,
  useModelAliases,
  type UseAIRegistryOptions,
  type UseAIRegistryReturn,
} from './use-ai-registry';
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
  usePromptOptimizer,
  type UsePromptOptimizerOptions,
  type UsePromptOptimizerReturn,
} from './use-prompt-optimizer';
export { useProviderManager } from './use-provider-manager';
export { useChatObservability } from './use-chat-observability';
export { useAgentObservability } from './use-agent-observability';
