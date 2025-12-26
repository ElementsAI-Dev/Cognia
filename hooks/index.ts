/**
 * Hooks module - exports all custom hooks
 */

export { useIsMobile } from './use-mobile';
export { useMessages } from './use-messages';
export { useKeyboardShortcuts, formatShortcut, type KeyboardShortcut } from './use-keyboard-shortcuts';
export { useSpeech, type UseSpeechOptions, type UseSpeechReturn, type SpeakOptions } from './use-speech';
export { useNetworkStatus, useApiHealth, type NetworkStatus } from './use-network-status';
export { useVectorDB, type UseVectorDBOptions, type UseVectorDBReturn } from './use-vector-db';
export { useRAG, type UseRAGOptions, type UseRAGReturn } from './use-rag';
export { useAgent, useConfiguredAgent, type UseAgentOptions, type UseAgentReturn } from './use-agent';
export { usePlanExecutor, type PlanExecutionOptions, type UsePlanExecutorReturn } from './use-plan-executor';
export { useMention, type UseMentionOptions, type UseMentionReturn } from './use-mention';
export {
  useProjectContext,
  useKnowledgeSearch,
  useKnowledgeStats,
  useBuildContext,
  formatKnowledgeForDisplay,
  type ProjectContextResult,
  type UseProjectContextOptions,
} from './use-project-context';
export {
  useArtifactDetection,
  detectArtifactType,
  mapToArtifactLanguage,
  type DetectedArtifact,
} from './use-artifact-detection';
export {
  useStructuredOutput,
  type UseStructuredOutputOptions,
  type UseStructuredOutputReturn,
} from './use-structured-output';
export {
  useTranslate,
  type UseTranslateOptions,
  type UseTranslateReturn,
  type LanguageDetectionResult,
  SUPPORTED_LANGUAGES,
} from './use-translate';
export {
  useImageGeneration,
  type UseImageGenerationOptions,
  type UseImageGenerationReturn,
} from './use-image-generation';
export {
  useDesigner,
  type UseDesignerOptions,
  type UseDesignerReturn,
} from './use-designer';
export {
  useCopy,
  getCopyHistory,
  addToCopyHistory,
  clearCopyHistory,
  type CopyFormat,
  type UseCopyOptions,
  type UseCopyReturn,
  type CopyHistoryItem,
} from './use-copy';
export {
  useNative,
  type UseNativeOptions,
  type UseNativeReturn,
} from './use-native';
export {
  useGlobalShortcuts,
  type GlobalShortcutAction,
  type UseGlobalShortcutsOptions,
  type UseGlobalShortcutsReturn,
} from './use-global-shortcuts';
export {
  useWindow,
  type UseWindowReturn,
} from './use-window';
export {
  useNotification,
  type UseNotificationReturn,
} from './use-notification';
export {
  useWorkflow,
  type UseWorkflowOptions,
  type UseWorkflowReturn,
} from './use-workflow';
export {
  useSkills,
  useSkillSystemPrompt,
  useAutoMatchSkills,
  useSkillTokenBudget,
  type UseSkillsOptions,
  type UseSkillsReturn,
} from './use-skills';
export {
  useLearningMode,
  useLearningSystemPrompt,
  useIsLearningMode,
  type UseLearningModeReturn,
} from './use-learning-mode';
export {
  useSubAgent,
  type UseSubAgentOptions,
  type UseSubAgentReturn,
} from './use-sub-agent';
export {
  useBackgroundAgent,
  type UseBackgroundAgentOptions,
  type UseBackgroundAgentReturn,
} from './use-background-agent';
export {
  useUnifiedTools,
  type UseUnifiedToolsOptions,
  type UseUnifiedToolsReturn,
} from './use-unified-tools';
export {
  useSelectionToolbar,
} from './use-selection-toolbar';
