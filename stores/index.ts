/**
 * Stores index - re-export all stores from subfolders
 */

// Agent stores
export {
  useAgentStore,
  selectIsAgentRunning,
  selectCurrentStep,
  selectToolExecutions,
  selectCurrentToolId,
  selectAgentProgress,
  useBackgroundAgentStore,
  selectAgents,
  selectQueue,
  selectIsPanelOpen,
  selectSelectedAgentId,
  useSubAgentStore,
  selectSubAgents,
  selectGroups,
  selectActiveParentId,
  selectSubAgentCount,
  selectActiveSubAgentCount,
  selectCompletedSubAgentCount,
} from './agent';

// Skills stores
export {
  useSkillStore,
  selectAllSkills,
  selectActiveSkills,
  selectEnabledSkills,
  selectSkillById,
  selectSkillsByCategory,
  selectSkillsLoading,
  selectSkillsError,
} from './skills';

// Artifact stores
export { useArtifactStore } from './artifact';

// Chat stores
export {
  useChatStore,
  selectMessages,
  selectIsLoading,
  selectIsStreaming,
  selectError,
  useSessionStore,
  selectSessions,
  selectActiveSessionId,
  useQuoteStore,
  selectQuotedTexts,
  selectHasQuotes,
  useSummaryStore,
  useChatWidgetStore,
  type QuotedText,
} from './chat';

// Context stores
export {
  useClipboardContextStore,
  useCurrentClipboardContent,
  useCurrentClipboardAnalysis,
  useClipboardTemplates,
  useIsClipboardMonitoring,
  useSelectionStore,
  type ContentCategory as ClipboardContentCategory,
  type DetectedLanguage as ClipboardDetectedLanguage,
  type ExtractedEntity as ClipboardExtractedEntity,
  type SuggestedAction as ClipboardSuggestedAction,
  type ContentStats as ClipboardContentStats,
  type FormattingHints as ClipboardFormattingHints,
  type ClipboardAnalysis,
  type ClipboardTemplate,
  type TransformAction,
} from './context';

// Data stores
export { useMemoryStore, useVectorStore } from './data';

// Designer stores
export { useDesignerStore, useDesignerHistoryStore, type DesignerHistoryEntry } from './designer';

// Document stores
export { useDocumentStore } from './document';

// Learning stores
export {
  useLearningStore,
  selectLearningSession,
  selectActiveLearningSession,
  selectLearningConfig,
  selectLearningProgress,
  selectCurrentPhase,
  selectSubQuestions,
  selectLearningGoals,
} from './learning';

// MCP stores
export {
  useMcpStore,
  installNpmPackage,
  installPipPackage,
  checkCommandExists,
  useMcpMarketplaceStore,
} from './mcp';

// Prompt templates
export {
  usePromptTemplateStore,
  selectPromptTemplates,
  selectPromptTemplateCategories,
  selectPromptTemplateId,
} from './prompt/prompt-template-store';

// Prompt marketplace
export {
  usePromptMarketplaceStore,
  selectMarketplacePrompts,
  selectFeaturedPrompts,
  selectTrendingPrompts,
  selectInstalledPrompts,
  selectFavoritePrompts,
} from './prompt/prompt-marketplace-store';

// Media stores
export {
  useMediaStore,
  selectImages,
  selectVideos,
  selectRecentImages,
  selectRecentVideos,
  selectFavoriteImages,
  selectFavoriteVideos,
  selectPendingVideos,
  useImageStudioStore,
  selectStudioImages,
  selectSelectedImage,
  selectStudioFavoriteImages,
  selectFilteredImages,
  selectIsEditing,
  selectHasUnsavedChanges,
  useScreenRecordingStore,
  useIsRecording,
  useRecordingStatus,
  type GeneratedImageRecord,
  type GeneratedVideoRecord,
  type MediaStats,
  type MediaFilter,
  type EditingTool,
  type ImageAdjustments as StudioImageAdjustments,
  type CropRegion,
  type ImageTransform as StudioImageTransform,
  type MaskStroke,
  type EditorLayer,
  type StudioImage,
  type EditOperation,
  type GenerationSettings,
  type BrushSettings,
  type ExportSettings,
  type ViewState,
} from './media';

// Project stores
export {
  useProjectStore,
  selectProjects,
  selectActiveProjectId,
  useProjectActivityStore,
  getActivityDescription,
  type ActivityType as ProjectActivityType,
  type ProjectActivity,
} from './project';

// Settings stores
export {
  useSettingsStore,
  selectTheme,
  selectColorTheme,
  selectLanguage,
  selectDefaultProvider,
  selectSidebarCollapsed,
  selectSearchEnabled,
  usePresetStore,
  selectPresets,
  selectSelectedPresetId,
  useCustomThemeStore,
  createDefaultThemeTemplate,
  useSettingsProfilesStore,
  type Theme,
  type Language,
  type CustomTheme,
  type CustomThemeColors,
  type CustomProviderSettings,
  type CodeTheme,
  type FontFamily,
  type MessageBubbleStyle,
  type CustomSyntaxTheme,
  type SettingsProfile,
} from './settings';

// System stores
export {
  useUIStore,
  selectSidebarOpen,
  selectActiveModal,
  selectCommandPaletteOpen,
  useUsageStore,
  useRecentFilesStore,
  selectRecentFiles,
  useNativeStore,
  useEnvironmentStore,
  useEnvironmentPlatform,
  useToolStatus,
  useInstallProgress,
  useIsToolInstalled,
  useEnvironmentRefreshing,
  useEnvironmentInstalling,
  useProxyStore,
  useProxyConfig,
  useProxyStatus,
  useProxyMode,
  useProxyEnabled,
  useDetectedProxies,
  useProxyDetecting,
  useProxyTesting,
  getActiveProxyUrl,
  useWindowStore,
  selectWindowState,
  selectWindowPreferences,
  selectWindowSize,
  selectWindowPosition,
  selectWindowConstraints,
  selectIsMaximized,
  selectIsFullscreen,
  selectIsAlwaysOnTop,
  useVirtualEnvStore,
  type ModalType,
  type ShortcutConfig,
  type NativeState,
  type NativeActions,
  type EnvironmentState,
  type EnvironmentActions,
  type ProxyState,
  type ProxyActions,
  type CursorIcon,
  type UserAttentionType,
  type WindowSize,
  type WindowPosition,
  type WindowConstraints,
  type WindowState,
  type WindowPreferences,
} from './system';

// Tools stores
export {
  useJupyterStore,
  useActiveSession,
  useActiveKernel,
  useExecutionState,
  useJupyterSessionForChat,
  usePPTEditorStore,
  useTemplateStore,
} from './tools';

// Workflow stores
export {
  useWorkflowStore,
  selectActiveExecution,
  selectExecutionProgress,
  selectIsExecuting,
  selectActivePresentation,
  useWorkflowEditorStore,
} from './workflow';

// Git stores
export {
  useGitStore,
  selectGitStatus,
  selectIsGitInstalled,
  selectCurrentRepo,
  selectBranches,
  selectCommits,
  selectFileStatus,
  selectOperationStatus,
  selectLastError,
} from './git';

// A2UI stores
export {
  useA2UIStore,
  selectSurface,
  selectActiveSurface,
  selectSurfaceComponents,
  selectSurfaceDataModel,
  selectIsSurfaceLoading,
  selectSurfaceError,
  selectEventHistory,
  selectRecentEvents,
} from './a2ui';

// Academic stores
export { useAcademicStore } from './academic';

// Tool History stores
export {
  useToolHistoryStore,
  selectHistory as selectToolHistory,
  selectUsageStats as selectToolUsageStats,
  selectSettings as selectToolHistorySettings,
  createToolId,
} from './tool-history';

// Sandbox stores
export {
  useSandboxStore,
  selectIsExecuting as selectSandboxIsExecuting,
  selectLastResult as selectSandboxLastResult,
  selectExecutionError as selectSandboxExecutionError,
  selectSandboxConfig,
  selectAvailableRuntimes,
  selectSupportedLanguages,
  selectRecentExecutions,
  selectSnippets,
  selectCurrentSession as selectSandboxCurrentSession,
  selectSandboxStats,
  selectSelectedLanguage,
  selectEditorCode,
  type SandboxState,
  type SandboxActions,
  type SandboxExecutionState,
} from './sandbox';

// Input completion stores
export { useInputCompletionStore } from './input-completion';

// Canvas stores
export {
  useChunkedDocumentStore,
  useKeybindingStore,
  useCommentStore,
  DEFAULT_KEYBINDINGS,
  parseKeyEvent,
  formatKeybinding,
} from './canvas';

// LaTeX stores
export {
  useLatexStore,
  type LaTeXDocument,
  type LaTeXEditorSettings,
  type LaTeXState,
} from './latex';

// Arena stores
export {
  useArenaStore,
  selectBattles,
  selectActiveBattle,
  selectSettings as selectArenaSettings,
  selectModelRatings,
} from './arena';
