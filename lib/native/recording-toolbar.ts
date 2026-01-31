/**
 * Recording Toolbar Native API
 *
 * TypeScript wrapper for the recording toolbar Tauri commands.
 * Provides floating control toolbar for screen recording with
 * edge snapping and compact mode support.
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * Toolbar position preset
 */
export type ToolbarPosition =
  | "topCenter"
  | "bottomCenter"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight"
  | { custom: { x: number; y: number } };

/**
 * Edge for snapping
 */
export type SnapEdge =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

/**
 * Recording toolbar configuration
 */
export interface RecordingToolbarConfig {
  position: ToolbarPosition;
  autoDock: boolean;
  autoHide: boolean;
  autoHideDelayMs: number;
  showTimer: boolean;
  compactMode: boolean;
  opacity: number;
  rememberPosition: boolean;
}

/**
 * Recording toolbar state
 */
export interface RecordingToolbarState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  formattedDuration: string;
}

/**
 * Show the recording toolbar
 */
export async function showRecordingToolbar(): Promise<void> {
  await invoke("recording_toolbar_show");
}

/**
 * Hide the recording toolbar
 */
export async function hideRecordingToolbar(): Promise<void> {
  await invoke("recording_toolbar_hide");
}

/**
 * Check if toolbar is visible
 */
export async function isRecordingToolbarVisible(): Promise<boolean> {
  return invoke<boolean>("recording_toolbar_is_visible");
}

/**
 * Set toolbar position
 */
export async function setRecordingToolbarPosition(
  x: number,
  y: number
): Promise<void> {
  await invoke("recording_toolbar_set_position", { x, y });
}

/**
 * Get toolbar position
 */
export async function getRecordingToolbarPosition(): Promise<[number, number]> {
  return invoke<[number, number]>("recording_toolbar_get_position");
}

/**
 * Snap toolbar to edge
 */
export async function snapRecordingToolbarToEdge(edge: SnapEdge): Promise<void> {
  await invoke("recording_toolbar_snap_to_edge", { edge });
}

/**
 * Toggle compact mode
 */
export async function toggleRecordingToolbarCompact(): Promise<boolean> {
  return invoke<boolean>("recording_toolbar_toggle_compact");
}

/**
 * Get toolbar configuration
 */
export async function getRecordingToolbarConfig(): Promise<RecordingToolbarConfig> {
  return invoke<RecordingToolbarConfig>("recording_toolbar_get_config");
}

/**
 * Update toolbar configuration
 */
export async function updateRecordingToolbarConfig(
  config: RecordingToolbarConfig
): Promise<void> {
  await invoke("recording_toolbar_update_config", { config });
}

/**
 * Get toolbar state
 */
export async function getRecordingToolbarState(): Promise<RecordingToolbarState> {
  return invoke<RecordingToolbarState>("recording_toolbar_get_state");
}

/**
 * Update toolbar recording state
 */
export async function updateRecordingToolbarState(
  isRecording: boolean,
  isPaused: boolean,
  durationMs: number
): Promise<void> {
  await invoke("recording_toolbar_update_state", {
    isRecording,
    isPaused,
    durationMs,
  });
}

/**
 * Set toolbar hover state
 */
export async function setRecordingToolbarHovered(hovered: boolean): Promise<void> {
  await invoke("recording_toolbar_set_hovered", { hovered });
}

/**
 * Destroy the toolbar window
 */
export async function destroyRecordingToolbar(): Promise<void> {
  await invoke("recording_toolbar_destroy");
}

/**
 * Default toolbar configuration
 */
export const DEFAULT_RECORDING_TOOLBAR_CONFIG: RecordingToolbarConfig = {
  position: "topCenter",
  autoDock: true,
  autoHide: false,
  autoHideDelayMs: 3000,
  showTimer: true,
  compactMode: false,
  opacity: 1.0,
  rememberPosition: true,
};
