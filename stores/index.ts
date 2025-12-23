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
