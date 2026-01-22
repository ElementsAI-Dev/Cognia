/**
 * Context/Awareness related hooks
 */

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
  useProjectContext,
  useKnowledgeSearch,
  useKnowledgeStats,
  useBuildContext,
  formatKnowledgeForDisplay,
  type ProjectContextResult,
  type UseProjectContextOptions,
} from './use-project-context';
export {
  useClipboardContext,
  CATEGORY_INFO,
  LANGUAGE_INFO,
  TRANSFORM_ACTIONS,
  type ClipboardAnalysis,
  type ContentCategory,
  type DetectedLanguage,
  type ExtractedEntity,
  type SuggestedAction,
  type ContentStats,
  type TransformAction,
  type ClipboardTemplate,
  type TransformActionInfo,
} from './use-clipboard-context';
export { useProject, type UseProjectReturn } from './use-project';
export { useAutoSync, type UseAutoSyncOptions, type UseAutoSyncReturn } from './use-auto-sync';
export {
  useContextStats,
  type ContextStats,
  type UseContextStatsOptions,
  type UseContextStatsReturn,
} from './use-context-stats';
