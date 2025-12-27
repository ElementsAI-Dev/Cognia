/**
 * Selection Toolbar Native API
 * 
 * Provides TypeScript bindings for the Tauri selection toolbar commands.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, emit, type UnlistenFn } from "@tauri-apps/api/event";

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
