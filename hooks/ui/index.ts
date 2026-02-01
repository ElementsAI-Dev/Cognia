/**
 * UI/Interaction related hooks
 */

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
export { useMention, type UseMentionOptions, type UseMentionReturn } from './use-mention';
export {
  useSelectionHistory,
  useClipboardHistory,
  type SelectionHistoryEntry,
  type SelectionHistoryStats,
  type ClipboardEntry,
} from './use-selection-history';
export {
  useSelectionReceiver,
  type UseSelectionReceiverOptions,
  type UseSelectionReceiverReturn,
} from './use-selection-receiver';
export { useSelectionToolbar } from './use-selection-toolbar';
export { useQuoteShortcuts } from './use-quote-shortcuts';
export { useSummaryShortcuts } from './use-summary-shortcuts';
export {
  useKeyboardShortcuts,
  formatShortcut,
  type KeyboardShortcut,
} from './use-keyboard-shortcuts';
export {
  useGlobalShortcuts,
  type GlobalShortcutAction,
  type UseGlobalShortcutsOptions,
  type UseGlobalShortcutsReturn,
} from './use-global-shortcuts';
export {
  useLearningMode,
  useLearningSystemPrompt,
  useIsLearningMode,
  type UseLearningModeReturn,
} from './use-learning-mode';
export {
  useLearningTools,
  type UseLearningToolsOptions,
  type UseLearningToolsReturn,
} from './use-learning-tools';
export {
  useClipboardMonitor,
  type ClipboardContent,
  type ClipboardAnalysis as ClipboardMonitorAnalysis,
  type UseClipboardMonitorOptions,
} from './use-clipboard-monitor';
export { useMediaQuery } from './use-media-query';
export { useMermaid, type UseMermaidOptions, type UseMermaidResult } from './use-mermaid';
export { useSafeTheme, useSafeThemeLegacy } from './use-safe-theme';
