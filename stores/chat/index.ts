/**
 * Chat stores index
 */

export {
  useChatStore,
  selectMessages,
  selectIsLoading,
  selectIsStreaming,
  selectError,
} from './chat-store';

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

export {
  useChatWidgetStore,
  selectChatWidgetMessages,
  selectChatWidgetConfig,
  selectChatWidgetIsVisible,
  selectChatWidgetIsLoading,
  type ChatWidgetMessage,
  type ChatWidgetConfig,
} from './chat-widget-store';
