/**
 * Selection Toolbar Native API
 * 
 * Provides TypeScript bindings for the Tauri selection toolbar commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, emit, type UnlistenFn } from "@tauri-apps/api/event";

const SELECTION_TOOLBAR_THEME_KEY = 'selection:toolbar-theme';

export interface SelectionPayload {
  text: string;
  x: number;
  y: number;
  timestamp?: number;
}

export interface SelectionConfig {
  enabled: boolean;
  trigger_mode: string;
  min_text_length: number;
  max_text_length: number;
  delay_ms: number;
  target_language: string;
  excluded_apps: string[];
}

/**
 * Start the selection detection service
 */
export async function startSelectionService(): Promise<void> {
  return invoke("selection_start");
}

/**
 * Stop the selection detection service
 */
export async function stopSelectionService(): Promise<void> {
  return invoke("selection_stop");
}

/**
 * Get selected text from the focused application
 */
export async function getSelectedText(): Promise<string | null> {
  return invoke("selection_get_text");
}

/**
 * Show the selection toolbar at the specified position
 */
export async function showToolbar(
  x: number,
  y: number,
  text: string
): Promise<void> {
  return invoke("selection_show_toolbar", { x, y, text });
}

/**
 * Hide the selection toolbar
 */
export async function hideToolbar(): Promise<void> {
  return invoke("selection_hide_toolbar");
}

/**
 * Check if the toolbar is currently visible
 */
export async function isToolbarVisible(): Promise<boolean> {
  return invoke("selection_is_toolbar_visible");
}

/**
 * Get the current selected text in the toolbar
 */
export async function getToolbarText(): Promise<string | null> {
  return invoke("selection_get_toolbar_text");
}

/**
 * Update selection configuration
 */
export async function updateConfig(config: SelectionConfig): Promise<void> {
  return invoke("selection_update_config", { config });
}

/**
 * Get current selection configuration
 */
export async function getConfig(): Promise<SelectionConfig> {
  return invoke("selection_get_config");
}

/**
 * Trigger selection detection manually
 */
export async function triggerSelection(): Promise<SelectionPayload | null> {
  return invoke("selection_trigger");
}

/**
 * Listen for selection detected events
 */
export async function onSelectionDetected(
  callback: (payload: SelectionPayload) => void
): Promise<UnlistenFn> {
  return listen<SelectionPayload>("selection-detected", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for toolbar show events
 */
export async function onToolbarShow(
  callback: (payload: SelectionPayload) => void
): Promise<UnlistenFn> {
  return listen<SelectionPayload>("selection-toolbar-show", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for toolbar hide events
 */
export async function onToolbarHide(callback: () => void): Promise<UnlistenFn> {
  return listen("selection-toolbar-hide", () => {
    callback();
  });
}

/**
 * Listen for send to chat events
 */
export async function onSendToChat(
  callback: (payload: { text: string }) => void
): Promise<UnlistenFn> {
  return listen<{ text: string }>("selection-send-to-chat", (event) => {
    callback(event.payload);
  });
}

/**
 * Emit send to chat event
 */
export async function sendToChat(text: string): Promise<void> {
  return emit("selection-send-to-chat", { text });
}

// ============== Enhanced Selection Types ==============

export interface SelectionHistoryEntry {
  text: string;
  timestamp: number;
  app_name?: string;
  window_title?: string;
  process_name?: string;
  position: [number, number];
  context_before?: string;
  context_after?: string;
  is_manual: boolean;
  tags: string[];
  text_type?: string;
  language?: string;
}

export interface SelectionHistoryStats {
  total_selections: number;
  by_app: Record<string, number>;
  by_type: Record<string, number>;
  avg_text_length: number;
  common_words: [string, number][];
  earliest_timestamp?: number;
  latest_timestamp?: number;
}

export interface ClipboardEntry {
  id: string;
  content_type: "Text" | "Html" | "Image" | "Files" | "Unknown";
  text?: string;
  html?: string;
  image_base64?: string;
  files?: string[];
  timestamp: number;
  source_app?: string;
  source_window?: string;
  is_pinned: boolean;
  label?: string;
  preview: string;
}

export type SelectionMode =
  | "word"
  | "line"
  | "sentence"
  | "paragraph"
  | "code_block"
  | "function"
  | "bracket"
  | "quote"
  | "url"
  | "email"
  | "file_path";

export interface SelectionExpansion {
  original_start: number;
  original_end: number;
  expanded_start: number;
  expanded_end: number;
  expanded_text: string;
  mode: SelectionMode;
  confidence: number;
}

// ============== Selection History Functions ==============

/**
 * Get selection history
 */
export async function getHistory(count?: number): Promise<SelectionHistoryEntry[]> {
  return invoke("selection_get_history", { count });
}

/**
 * Search selection history
 */
export async function searchHistory(query: string): Promise<SelectionHistoryEntry[]> {
  return invoke("selection_search_history", { query });
}

/**
 * Search selection history by application
 */
export async function searchHistoryByApp(
  appName: string
): Promise<SelectionHistoryEntry[]> {
  return invoke("selection_search_history_by_app", { appName });
}

/**
 * Search selection history by text type
 */
export async function searchHistoryByType(
  textType: string
): Promise<SelectionHistoryEntry[]> {
  return invoke("selection_search_history_by_type", { textType });
}

/**
 * Get selection history statistics
 */
export async function getHistoryStats(): Promise<SelectionHistoryStats> {
  return invoke("selection_get_history_stats");
}

/**
 * Clear selection history
 */
export async function clearHistory(): Promise<void> {
  return invoke("selection_clear_history");
}

/**
 * Export selection history to JSON
 */
export async function exportHistory(): Promise<string> {
  return invoke("selection_export_history");
}

/**
 * Import selection history from JSON
 */
export async function importHistory(json: string): Promise<number> {
  return invoke("selection_import_history", { json });
}

// ============== Clipboard History Functions ==============

/**
 * Get clipboard history
 */
export async function getClipboardHistory(count?: number): Promise<ClipboardEntry[]> {
  return invoke("clipboard_get_history", { count });
}

/**
 * Search clipboard history
 */
export async function searchClipboardHistory(
  query: string
): Promise<ClipboardEntry[]> {
  return invoke("clipboard_search_history", { query });
}

/**
 * Get pinned clipboard entries
 */
export async function getClipboardPinned(): Promise<ClipboardEntry[]> {
  return invoke("clipboard_get_pinned");
}

/**
 * Pin a clipboard entry
 */
export async function pinClipboardEntry(id: string): Promise<boolean> {
  return invoke("clipboard_pin_entry", { id });
}

/**
 * Unpin a clipboard entry
 */
export async function unpinClipboardEntry(id: string): Promise<boolean> {
  return invoke("clipboard_unpin_entry", { id });
}

/**
 * Delete a clipboard entry
 */
export async function deleteClipboardEntry(id: string): Promise<boolean> {
  return invoke("clipboard_delete_entry", { id });
}

/**
 * Clear unpinned clipboard history
 */
export async function clearClipboardUnpinned(): Promise<void> {
  return invoke("clipboard_clear_unpinned");
}

/**
 * Clear all clipboard history
 */
export async function clearClipboardAll(): Promise<void> {
  return invoke("clipboard_clear_all");
}

/**
 * Copy clipboard entry back to clipboard
 */
export async function copyClipboardEntry(id: string): Promise<void> {
  return invoke("clipboard_copy_entry", { id });
}

/**
 * Check and update clipboard history
 */
export async function checkClipboardUpdate(): Promise<boolean> {
  return invoke("clipboard_check_update");
}

// ============== Smart Selection Functions ==============

/**
 * Smart expand selection based on mode
 */
export async function smartExpand(
  text: string,
  cursorPos: number,
  mode: SelectionMode,
  isCode?: boolean,
  language?: string
): Promise<SelectionExpansion> {
  return invoke("selection_smart_expand", {
    text,
    cursorPos,
    mode,
    isCode,
    language,
  });
}

/**
 * Auto-detect best expansion mode and expand
 */
export async function autoExpand(
  text: string,
  cursorPos: number,
  isCode?: boolean,
  language?: string
): Promise<SelectionExpansion> {
  return invoke("selection_auto_expand", {
    text,
    cursorPos,
    isCode,
    language,
  });
}

/**
 * Get available selection modes
 */
export async function getSelectionModes(): Promise<string[]> {
  return invoke("selection_get_modes");
}

// ============== Detection State Functions ==============

/**
 * Get time since last successful detection in milliseconds
 */
export async function getTimeSinceLastDetection(): Promise<number | null> {
  return invoke("selection_time_since_last_detection");
}

/**
 * Get the last detected text
 */
export async function getLastText(): Promise<string | null> {
  return invoke("selection_get_last_text");
}

/**
 * Clear the last detected text
 */
export async function clearLastText(): Promise<void> {
  return invoke("selection_clear_last_text");
}

export interface Selection {
  text: string;
  text_before?: string;
  text_after?: string;
  is_code: boolean;
  language?: string;
  is_url: boolean;
  is_email: boolean;
  has_numbers: boolean;
  word_count: number;
  char_count: number;
  line_count: number;
  text_type: string;
  source_app?: {
    name: string;
    process: string;
    window_title: string;
    app_type: string;
  };
}

/**
 * Get last analyzed selection with full context
 */
export async function getLastSelection(): Promise<Selection | null> {
  return invoke("selection_get_last_selection");
}

// ============== Missing API Bindings ==============

/**
 * Save selection configuration to file
 */
export async function saveConfig(): Promise<void> {
  return invoke("selection_save_config");
}

/**
 * Get current selection status (comprehensive state query)
 */
export async function getSelectionStatus(): Promise<SelectionStatus> {
  return invoke("selection_get_status");
}

export interface SelectionStatus {
  is_running: boolean;
  toolbar_visible: boolean;
  toolbar_position: [number, number] | null;
  selected_text: string | null;
  last_selection_timestamp: number | null;
  config: SelectionConfig;
}

/**
 * Set selection toolbar enabled state
 */
export async function setSelectionEnabled(enabled: boolean): Promise<void> {
  return invoke("selection_set_enabled", { enabled });
}

/**
 * Check if selection toolbar is enabled
 */
export async function isSelectionEnabled(): Promise<boolean> {
  return invoke("selection_is_enabled");
}

/**
 * Restart the selection detection service
 */
export async function restartSelectionService(): Promise<void> {
  return invoke("selection_restart");
}

/**
 * Set toolbar hover state (called from frontend when mouse enters/leaves toolbar)
 */
export async function setToolbarHovered(hovered: boolean): Promise<void> {
  return invoke("selection_set_toolbar_hovered", { hovered });
}

/**
 * Get current toolbar state (selection text and position if visible)
 */
export async function getToolbarState(): Promise<{
  text: string;
  x: number;
  y: number;
  textLength: number;
} | null> {
  return invoke("selection_get_toolbar_state");
}

/**
 * Set auto-hide timeout for toolbar (0 to disable)
 */
export async function setAutoHideTimeout(timeoutMs: number): Promise<void> {
  return invoke("selection_set_auto_hide_timeout", { timeoutMs });
}

/**
 * Get detection statistics
 */
export async function getDetectionStats(): Promise<{
  attempts: number;
  successes: number;
  successRate: number;
}> {
  return invoke("selection_get_detection_stats");
}

/**
 * Get enhanced selection analysis
 */
export async function getEnhancedSelection(
  text: string,
  appName?: string,
  processName?: string,
  windowTitle?: string
): Promise<Selection> {
  return invoke("selection_get_enhanced", {
    text,
    appName,
    processName,
    windowTitle,
  });
}

/**
 * Analyze current selection with enhanced detection
 */
export async function analyzeCurrentSelection(): Promise<Selection | null> {
  return invoke("selection_analyze_current");
}

/**
 * Expand selection to word at cursor position
 */
export async function expandToWord(
  text: string,
  cursorPos: number
): Promise<[number, number, string]> {
  return invoke("selection_expand_to_word", { text, cursorPos });
}

/**
 * Expand selection to sentence
 */
export async function expandToSentence(
  text: string,
  cursorPos: number
): Promise<[number, number, string]> {
  return invoke("selection_expand_to_sentence", { text, cursorPos });
}

/**
 * Expand selection to line
 */
export async function expandToLine(
  text: string,
  cursorPos: number
): Promise<[number, number, string]> {
  return invoke("selection_expand_to_line", { text, cursorPos });
}

/**
 * Expand selection to paragraph
 */
export async function expandToParagraph(
  text: string,
  cursorPos: number
): Promise<[number, number, string]> {
  return invoke("selection_expand_to_paragraph", { text, cursorPos });
}

/**
 * Search selection history by time range
 */
export async function searchHistoryByTime(
  start: number,
  end: number
): Promise<SelectionHistoryEntry[]> {
  return invoke("selection_search_history_by_time", { start, end });
}

/**
 * Release all stuck modifier keys (Ctrl, Alt, Shift, Win)
 */
export async function releaseStuckKeys(): Promise<void> {
  return invoke("selection_release_stuck_keys");
}

/**
 * Detect text type (code, url, email, etc.)
 */
export async function detectTextType(text: string): Promise<string> {
  return invoke("selection_detect_text_type", { text });
}

/**
 * Replace current selected text in the source application
 */
export async function replaceSelectedText(text: string): Promise<void> {
  return invoke("selection_replace_text", { text });
}

/**
 * Get toolbar configuration as JSON
 */
export async function getToolbarConfig(): Promise<Record<string, unknown>> {
  return invoke("selection_get_toolbar_config");
}

/**
 * Update toolbar theme
 */
export async function setToolbarTheme(
  theme: "auto" | "light" | "dark" | "glass"
): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SELECTION_TOOLBAR_THEME_KEY, theme);
    }
  } catch {
    // ignore persistence errors
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('selection-toolbar-theme-changed', {
        detail: { theme },
      })
    );
  }
}

/**
 * Get selection statistics summary
 */
export async function getStatsSummary(): Promise<{
  detection: {
    attempts: number;
    successes: number;
    successRate: number;
  };
  history: {
    totalSelections: number;
    byApp: Record<string, number>;
    byType: Record<string, number>;
    averageLength: number;
  };
}> {
  return invoke("selection_get_stats_summary");
}

// ============== Clipboard Context Analysis Functions ==============

export interface ClipboardAnalysis {
  category: string;
  secondary_categories: string[];
  language: string | null;
  confidence: number;
  entities: ExtractedEntity[];
  suggested_actions: SuggestedAction[];
  stats: ContentStats;
  is_sensitive: boolean;
  formatting: FormattingHints;
}

export interface ExtractedEntity {
  entity_type: string;
  value: string;
  start: number;
  end: number;
}

export interface SuggestedAction {
  action_id: string;
  label: string;
  description: string;
  icon: string;
  priority: number;
}

export interface ContentStats {
  char_count: number;
  word_count: number;
  line_count: number;
  has_unicode: boolean;
  has_emoji: boolean;
  has_whitespace_only_lines: boolean;
}

export interface FormattingHints {
  syntax_highlight: boolean;
  language_hint: string | null;
  preserve_whitespace: boolean;
  is_multiline: boolean;
  max_preview_lines: number;
}

/**
 * Analyze clipboard content and return detailed analysis
 */
export async function analyzeClipboardContent(
  content: string
): Promise<ClipboardAnalysis> {
  return invoke("clipboard_analyze_content", { content });
}

/**
 * Get current clipboard content with analysis
 */
export async function getCurrentClipboardWithAnalysis(): Promise<
  [string, ClipboardAnalysis] | null
> {
  return invoke("clipboard_get_current_with_analysis");
}

/**
 * Transform clipboard content based on action
 */
export async function transformClipboardContent(
  content: string,
  action: string
): Promise<string> {
  return invoke("clipboard_transform_content", { content, action });
}

/**
 * Write text to clipboard
 */
export async function writeClipboardText(text: string): Promise<void> {
  return invoke("clipboard_write_text", { text });
}

/**
 * Read text from clipboard
 */
export async function readClipboardText(): Promise<string> {
  return invoke("clipboard_read_text");
}

/**
 * Write HTML to clipboard
 */
export async function writeClipboardHtml(
  html: string,
  altText?: string
): Promise<void> {
  return invoke("clipboard_write_html", { html, altText });
}

/**
 * Clear clipboard
 */
export async function clearClipboard(): Promise<void> {
  return invoke("clipboard_clear");
}

/**
 * Get suggested actions for clipboard content
 */
export async function getClipboardSuggestedActions(
  content: string
): Promise<SuggestedAction[]> {
  return invoke("clipboard_get_suggested_actions", { content });
}

/**
 * Extract entities from clipboard content
 */
export async function extractClipboardEntities(
  content: string
): Promise<ExtractedEntity[]> {
  return invoke("clipboard_extract_entities", { content });
}

/**
 * Check if clipboard content is sensitive
 */
export async function checkClipboardSensitive(
  content: string
): Promise<boolean> {
  return invoke("clipboard_check_sensitive", { content });
}

/**
 * Get clipboard content statistics
 */
export async function getClipboardContentStats(
  content: string
): Promise<ContentStats> {
  return invoke("clipboard_get_stats", { content });
}

/**
 * Detect content category
 */
export async function detectClipboardCategory(
  content: string
): Promise<[string, string[], number]> {
  return invoke("clipboard_detect_category", { content });
}

/**
 * Detect programming language in code content
 */
export async function detectClipboardLanguage(
  content: string
): Promise<string | null> {
  return invoke("clipboard_detect_language", { content });
}

// ============== Selection Event Listeners ==============

/**
 * Listen for AI chunk events during streaming
 */
export async function onSelectionAIChunk(
  callback: (payload: { chunk: string }) => void
): Promise<UnlistenFn> {
  return listen<{ chunk: string }>("selection-ai-chunk", (event) => {
    callback(event.payload);
  });
}

/**
 * Listen for quick action events (explain, etc.)
 */
export async function onQuickAction(
  callback: (payload: { text: string; action: string }) => void
): Promise<UnlistenFn> {
  return listen<{ text: string; action: string }>(
    "selection-quick-action",
    (event) => {
      callback(event.payload);
    }
  );
}

/**
 * Listen for quick translate events
 */
export async function onQuickTranslate(
  callback: (payload: { text: string; action: string }) => void
): Promise<UnlistenFn> {
  return listen<{ text: string; action: string }>(
    "selection-quick-translate",
    (event) => {
      callback(event.payload);
    }
  );
}
