/**
 * Canvas components - Code editing and artifact management
 *
 * Public API: Only CanvasPanel and CanvasErrorBoundary are consumed externally.
 * Internal components (VersionHistoryPanel, CodeExecutionPanel, etc.) are
 * imported via relative paths within canvas-panel.tsx.
 */

export { CanvasPanel } from './canvas-panel';
export { CanvasErrorBoundary } from './canvas-error-boundary';
export { VersionHistoryPanel } from './version-history-panel';
export { VersionDiffView } from './version-diff-view';
export { CodeExecutionPanel } from './code-execution-panel';
export { CanvasDocumentTabs } from './canvas-document-tabs';
export { CanvasDocumentList } from './canvas-document-list';
export { SuggestionItem } from './suggestion-item';
export { RenameDialog } from './rename-dialog';
export { CollaborationPanel } from './collaboration-panel';
export { CommentPanel } from './comment-panel';
export { KeybindingSettings } from './keybinding-settings';
