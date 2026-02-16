/**
 * Chat components index
 *
 * Main components:
 * - ChatContainer: Main chat interface with message rendering
 * - ChatInput: Input field with attachments, voice, and MCP tool mentions
 * - ChatHeader: Header with mode/model selectors and actions
 * - WelcomeState: Welcome screen with mode selection and templates
 *
 * Dialogs (./dialogs/):
 * - PresetManagerDialog, ExportDialog, AISettingsDialog, etc.
 *
 * Selectors (./selectors/):
 * - BranchSelector, TemplateSelector, SessionEnvSelector
 *
 * Popovers (./popovers/):
 * - MentionPopover, RecentFilesPopover, TextSelectionPopover
 *
 * Message (./message/):
 * - ErrorMessage, MessageReactions, PendingMessagesQueue, QuotedContent
 *
 * Utils (./utils/):
 * - CodeExecutor, ToolResultDisplay, ConversationSearch, MarkdownRenderer
 */

// Main components (from core/)
export { ChatContainer, ChatHeader, ChatDesignerPanel, VirtualizedChatMessageList, type VirtualizedChatMessageListProps } from './core';
export { ChatInput } from './chat-input';

// Welcome components
export { WelcomeState, WelcomeA2UIDemo } from './welcome';

// UI Enhancement components (from ui/)
export {
  CarriedContextBanner,
  CopyButton,
  QuickReplyBar,
  MessageSwipeActions,
  type SwipeAction,
  RoutingIndicator,
  RoutingBadge,
  ModeSwitchSuggestion,
  InlineModeSuggestion,
} from './ui';
export {
  useKeyboardShortcuts,
  getShortcutsByCategory,
  formatShortcut,
  type KeyboardShortcut,
} from './ui';

// Dialogs
export {
  AISettingsDialog,
  type AISettings,
  BatchCopyDialog,
  ChatSummaryDialog,
  ContextSettingsDialog,
  ExportDialog,
  ImageGenerationDialog,
  ModelPickerDialog,
  PresetManagerDialog,
  VideoGenerationDialog,
  ModeSwitchConfirmDialog,
} from './dialogs';

// Prompt Optimization (re-exported from @/components/prompt)
export { PromptOptimizerDialog, PromptOptimizationHub } from '@/components/prompt';

// Selectors
export { BranchSelector, BranchButton, SessionEnvSelector, TemplateSelector } from './selectors';

// Popovers
export {
  MentionPopover,
  MentionBadge,
  MentionChip,
  RecentFilesPopover,
  TextSelectionPopover,
  ToolHistoryPanel,
} from './popovers';

// Message components
export {
  ErrorMessage,
  MessageReactions,
  PendingMessagesQueue,
  type PendingMessage,
  QuotedContent,
  ChatMessageItem,
  type ChatMessageItemProps,
} from './message';

// Utility components
export {
  CodeExecutor,
  ToolResultDisplay,
  ToolMentionInline,
  ToolExecutionStatus,
  ConversationSearch,
  MarkdownRenderer,
  AutoSummaryPrompt,
  SessionStats,
} from './utils';

// Message parts (for rendering different message content types)
export {
  TextPart,
  ReasoningPart,
  ToolPart,
  SourcesPart,
  A2UIPart,
  LearningToolPart,
  isLearningTool,
  LEARNING_TOOL_NAMES,
  MessagePartsRenderer,
  type MessagePartsRendererProps,
} from './message-parts';

// Workflow components (from workflow/)
export {
  WorkflowPickerDialog,
  WorkflowResultCard,
  type WorkflowResultData,
  type WorkflowExecutionStatus,
} from './workflow';

// Goal components (from goal/)
export { ChatGoalBanner, ChatGoalDialog } from './goal';
