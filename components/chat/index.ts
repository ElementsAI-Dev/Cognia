/**
 * Chat components index
 * 
 * Main components:
 * - ChatContainer: Main chat interface with message rendering
 * - ChatInput: Input field with attachments, voice, and MCP tool mentions
 * - ChatHeader: Header with mode/model selectors and actions
 * - WelcomeState: Welcome screen with mode selection and templates
 * 
 * Dialogs:
 * - PresetManagerDialog: Manage chat presets
 * - ExportDialog: Export conversation
 * - TemplateSelector: Browse and select chat templates
 * - ConversationSearch: Search within conversation
 * 
 * Utilities:
 * - CodeExecutor: Execute JS/TS code blocks
 * - MentionPopover: MCP tool mentions
 * - ToolResultDisplay: Display MCP tool results
 */

// Main components
export { ChatContainer } from './chat-container';
export { ChatHeader } from './chat-header';
export { ChatInput } from './chat-input';
export { WelcomeState } from './welcome-state';
export { ChatDesignerPanel } from './chat-designer-panel';

// Dialogs and selectors
export { PresetManagerDialog } from './preset-manager-dialog';
export { ExportDialog } from './export-dialog';
export { TemplateSelector } from './template-selector';
export { ConversationSearch } from './conversation-search';
export { BatchCopyDialog } from './batch-copy-dialog';
export { ModelPickerDialog } from './model-picker-dialog';
export { AISettingsDialog, type AISettings } from './ai-settings-dialog';
export { ContextSettingsDialog } from './context-settings-dialog';

// Utilities
export { RecentFilesPopover } from './recent-files-popover';
export { CodeExecutor } from './code-executor';
export { MentionPopover, MentionBadge, MentionChip } from './mention-popover';
export { ToolResultDisplay, ToolMentionInline, ToolExecutionStatus } from './tool-result-display';

// Message parts (for rendering different message content types)
export { TextPart, ReasoningPart, ToolPart, SourcesPart } from './message-parts';

// Quote/Selection components
export { TextSelectionPopover } from './text-selection-popover';
export { QuotedContent } from './quoted-content';

// Message queue
export { PendingMessagesQueue, type PendingMessage } from './pending-messages-queue';

// Reactions
export { MessageReactions } from './message-reactions';

// Summary components
export { ChatSummaryDialog } from './chat-summary-dialog';
export { AutoSummaryPrompt } from './auto-summary-prompt';
