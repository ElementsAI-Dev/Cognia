/**
 * Hooks module - exports all custom hooks
 */

export { useIsMobile } from './use-mobile';
export { useMessages } from './use-messages';
export {
  useAIRegistry,
  useReasoningModel,
  useModelAliases,
  type UseAIRegistryOptions,
  type UseAIRegistryReturn,
} from './use-ai-registry';
export { useKeyboardShortcuts, formatShortcut, type KeyboardShortcut } from './use-keyboard-shortcuts';
export { useSpeech, type UseSpeechOptions, type UseSpeechReturn, type SpeakOptions } from './use-speech';
export { useNetworkStatus, useApiHealth, type NetworkStatus } from './use-network-status';
export { useVectorDB, type UseVectorDBOptions, type UseVectorDBReturn } from './use-vector-db';
export { useRAG, type UseRAGOptions, type UseRAGReturn } from './use-rag';
export {
  useRAGPipeline,
  type UseRAGPipelineOptions,
  type UseRAGPipelineReturn,
  type IndexingResult as RAGIndexingResult,
} from './use-rag-pipeline';
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
export {
  useTokenCount,
  calculateTokenBreakdown,
  estimateTokens,
  estimateTokensFast,
  estimateTokensForClaude,
  countTokens,
  countTokensTiktoken,
  countChatMessageTokens,
  countConversationTokens,
  getEncodingForModel,
  getTokenCountMethod,
  getContextUtilization,
  formatTokenCount,
  type TokenBreakdown,
  type TokenCountOptions,
  type TokenCountMethod,
} from './use-token-count';
export {
  useResizeObserver,
  useLayoutRecalculation,
  useMonacoLayoutSync,
  usePreviewRefreshTrigger,
  type Size,
  type ResizeObserverOptions,
} from './use-resize-observer';
export {
  useDesignerDragDrop,
  type DragItemType,
  type DragData,
  type DropPosition,
  type UseDesignerDragDropReturn,
} from './use-designer-drag-drop';
export {
  useExecutionHistory,
  useSnippets,
  useSessions,
  useSandboxStats,
  useCodeExecution,
  useTagsCategories,
  type UseExecutionHistoryOptions,
  type UseExecutionHistoryReturn,
  type UseSnippetsOptions,
  type UseSnippetsReturn,
  type UseSessionsOptions,
  type UseSessionsReturn,
  type UseSandboxStatsReturn,
  type UseCodeExecutionReturn,
  type UseTagsCategoriesReturn,
} from './use-sandbox-db';
export { useSandbox } from './use-sandbox';
export {
  useScreenshot,
  useScreenshotHistory,
  type ScreenshotMetadata,
  type ScreenshotResult,
  type ScreenshotHistoryEntry,
  type MonitorInfo,
  type WinOcrResult,
} from './use-screenshot';
export {
  useContext,
  type AppType,
  type WindowInfo,
  type AppContext,
  type FileContext,
  type BrowserContext,
  type EditorContext,
  type FullContext,
} from './use-context';
export {
  useAwareness,
  useFocusTracking,
  type SystemState,
  type Suggestion,
  type AwarenessState,
  type UserActivity,
  type FocusSession,
  type AppUsageStats,
  type DailyUsageSummary,
} from './use-awareness';
export {
  useSelectionHistory,
  useClipboardHistory,
  type SelectionHistoryEntry,
  type SelectionHistoryStats,
  type ClipboardEntry,
} from './use-selection-history';
export {
  useWorkflowKeyboardShortcuts,
} from './use-workflow-keyboard-shortcuts';
export {
  useVideoGeneration,
  type UseVideoGenerationOptions,
  type UseVideoGenerationReturn,
  type VideoGenerationJob,
} from './use-video-generation';
export {
  useMemory,
  type MemorySearchOptions,
  type MemorySearchResult,
  type MemoryConflict,
  type BatchOperationResult,
  type MemoryRelevanceContext,
  type RelevantMemory,
  type UseMemoryOptions,
} from './use-memory';
export {
  useMemoryProvider,
  type UseMemoryProviderOptions,
  type UseMemoryProviderReturn,
  type PipelineResult,
} from './use-memory-provider';
export {
  useSessionEnv,
  getSessionEnvContext,
  selectSessionHasEnv,
  type SessionEnvContext,
} from './use-session-env';
export {
  useVirtualEnv,
} from './use-virtual-env';
export {
  useJupyterKernel,
  type UseJupyterKernelReturn,
} from './use-jupyter-kernel';
export {
  useGeolocation,
  useLocaleDetection,
  type UseGeolocationState,
  type UseGeolocationOptions,
  type UseGeolocationReturn,
  type UseLocaleDetectionState,
  type UseLocaleDetectionReturn,
} from './use-geolocation';
