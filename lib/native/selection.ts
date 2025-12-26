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
