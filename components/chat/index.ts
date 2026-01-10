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

// Main components
export { ChatContainer } from './chat-container';
export { ChatHeader } from './chat-header';
export { ChatInput } from './chat-input';
export { WelcomeState } from './welcome-state';
export { ChatDesignerPanel } from './chat-designer-panel';
export { CarriedContextBanner } from './carried-context-banner';

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
  PromptOptimizerDialog,
  VideoGenerationDialog,
  ModeSwitchConfirmDialog,
} from './dialogs';

// Prompt Optimization (advanced)
export { PromptOptimizationHub } from './dialogs/prompt-optimization';

// Selectors
export {
  BranchSelector,
  BranchButton,
  SessionEnvSelector,
  TemplateSelector,
} from './selectors';

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
export { TextPart, ReasoningPart, ToolPart, SourcesPart, A2UIPart, LearningToolPart, isLearningTool, LEARNING_TOOL_NAMES } from './message-parts';

// Workflow components
export { WorkflowPickerDialog } from './workflow-picker-dialog';
export { WorkflowResultCard, type WorkflowResultData, type WorkflowExecutionStatus } from './workflow-result-card';

// UI Enhancement components
export { QuickReplyBar } from './quick-reply-bar';
export { MessageSwipeActions, type SwipeAction } from './message-swipe-actions';
export { useKeyboardShortcuts, getShortcutsByCategory, formatShortcut, type KeyboardShortcut } from './keyboard-shortcuts-handler';
export { CopyButton } from './copy-button';
export { RoutingIndicator } from './routing-indicator';
export { ModeSwitchSuggestion } from './mode-switch-suggestion';
