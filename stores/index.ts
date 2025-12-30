/**
 * Stores index - re-export all stores
 */

export { useChatStore, selectMessages, selectIsLoading, selectIsStreaming, selectError } from './chat-store';
export { useSessionStore, selectSessions, selectActiveSessionId } from './session-store';
export {
  useSettingsStore,
  selectTheme,
  selectColorTheme,
  selectLanguage,
  selectDefaultProvider,
  selectSidebarCollapsed,
  selectSearchEnabled,
  type Theme,
  type Language,
  type CustomTheme,
  type CustomProviderSettings,
  type CodeTheme,
  type FontFamily,
  type MessageBubbleStyle,
} from './settings-store';
export { useUIStore, selectSidebarOpen, selectActiveModal, selectCommandPaletteOpen, type ModalType } from './ui-store';
export {
  useAgentStore,
  selectIsAgentRunning,
  selectCurrentStep,
  selectToolExecutions,
  selectCurrentToolId,
  selectAgentProgress,
} from './agent-store';
export { useArtifactStore } from './artifact-store';
export { useMemoryStore } from './memory-store';
export { useProjectStore, selectProjects, selectActiveProjectId } from './project-store';
export { useUsageStore } from './usage-store';
export { usePresetStore, selectPresets, selectSelectedPresetId } from './preset-store';
export { useMcpStore, installNpmPackage, installPipPackage, checkCommandExists } from './mcp-store';
export { useRecentFilesStore, selectRecentFiles } from './recent-files-store';
export { useDesignerStore } from './designer-store';
export { useTemplateStore } from './template-store';
export { useVectorStore } from './vector-store';
export { useDocumentStore } from './document-store';
export { useDesignerHistoryStore, type DesignerHistoryEntry } from './designer-history-store';
export { 
  useProjectActivityStore, 
  getActivityDescription,
  type ActivityType as ProjectActivityType,
  type ProjectActivity,
} from './project-activity-store';
export {
  useNativeStore,
  type ShortcutConfig,
  type NativeState,
  type NativeActions,
} from './native-store';
export { useQuoteStore, selectQuotedTexts, selectHasQuotes, type QuotedText } from './quote-store';
export {
  useWorkflowStore,
  selectActiveExecution,
  selectExecutionProgress,
  selectIsExecuting,
  selectActivePresentation,
} from './workflow-store';
export {
  useSkillStore,
  selectAllSkills,
  selectActiveSkills,
  selectEnabledSkills,
  selectSkillById,
  selectSkillsByCategory,
  selectIsLoading as selectSkillsLoading,
  selectError as selectSkillsError,
} from './skill-store';
export {
  useLearningStore,
  selectLearningSession,
  selectActiveLearningSes,
  selectLearningConfig,
  selectLearningProgress,
  selectCurrentPhase,
  selectSubQuestions,
  selectLearningGoals,
} from './learning-store';
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
  useBackgroundAgentStore,
  selectAgents,
  selectQueue,
  selectIsPanelOpen,
  selectSelectedAgentId,
} from './background-agent-store';
export {
  useCustomThemeStore,
  createDefaultThemeTemplate,
  type CustomSyntaxTheme,
} from './custom-theme-store';
export {
  useMediaStore,
  selectImages,
  selectVideos,
  selectRecentImages,
  selectRecentVideos,
  selectFavoriteImages,
  selectFavoriteVideos,
  selectPendingVideos,
  type GeneratedImageRecord,
  type GeneratedVideoRecord,
  type MediaStats,
  type MediaFilter,
} from './media-store';
export {
  useEnvironmentStore,
  useEnvironmentPlatform,
  useToolStatus,
  useInstallProgress,
  useIsToolInstalled,
  useEnvironmentRefreshing,
  useEnvironmentInstalling,
  type EnvironmentState,
  type EnvironmentActions,
} from './environment-store';
export {
  useProxyStore,
  useProxyConfig,
  useProxyStatus,
  useProxyMode,
  useProxyEnabled,
  useDetectedProxies,
  useProxyDetecting,
  useProxyTesting,
  getActiveProxyUrl,
  type ProxyState,
  type ProxyActions,
} from './proxy-store';
