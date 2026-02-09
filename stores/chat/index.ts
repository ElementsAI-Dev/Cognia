/**
 * Chat stores index
 */

export { useChatStore } from './chat-store';

export {
  useSessionStore,
  selectSessions,
  selectActiveSessionId,
  selectModeHistory,
  MODE_CONFIGS,
  type ModeConfig,
  type ModeHistoryEntry,
} from './session-store';

export {
  useQuoteStore,
  selectQuotedTexts,
  selectHasQuotes,
  selectQuoteCount,
  selectCanAddMore,
  selectIsSelectionMode,
  selectSelectedIds,
  selectSelectedCount,
  type QuotedText,
  type ExportFormat,
} from './quote-store';

export { useSummaryStore } from './summary-store';

export { useCompressionHistoryStore } from './compression-history-store';

export {
  useChatWidgetStore,
  selectChatWidgetMessages,
  selectChatWidgetConfig,
  selectChatWidgetIsVisible,
  selectChatWidgetIsLoading,
  type ChatWidgetMessage,
  type ChatWidgetConfig,
  type MessageFeedback,
} from './chat-widget-store';

export {
  useParallelContextStore,
  selectSessionContext,
  selectContextCount,
  DEFAULT_CONTEXT_ISOLATION_CONFIG,
  type IsolatedSessionContext,
  type WorkingMemoryItem,
  type ToolResultCache,
  type ContextIsolationConfig,
} from './parallel-context-store';
