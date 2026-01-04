/**
 * Screenshot Native API
 *
 * Provides TypeScript bindings for the Tauri screenshot commands.
 */

import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

export interface ScreenshotMetadata {
  width: number;
  height: number;
  mode: string;
  timestamp: number;
  window_title?: string;
  monitor_index?: number;
}

export interface ScreenshotResult {
  image_base64: string;
  metadata: ScreenshotMetadata;
}

export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorInfo {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_primary: boolean;
  scale_factor: number;
}

export interface ScreenshotConfig {
  save_directory?: string;
  format: string;
  quality: number;
  include_cursor: boolean;
  copy_to_clipboard: boolean;
  show_notification: boolean;
  auto_save: boolean;
  filename_template: string;
}

export interface ScreenshotHistoryEntry {
  id: string;
  timestamp: number;
  thumbnail_base64?: string;
  file_path?: string;
  width: number;
  height: number;
  mode: string;
  window_title?: string;
  ocr_text?: string;
  label?: string;
  tags: string[];
  is_pinned: boolean;
}

export interface WinOcrResult {
  text: string;
  lines: OcrLine[];
  language?: string;
  confidence: number;
}

export interface OcrLine {
  text: string;
  words: OcrWord[];
  bounds: OcrBounds;
}

export interface OcrWord {
  text: string;
  bounds: OcrBounds;
  confidence: number;
}

export interface OcrBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============== Basic Capture Functions ==============

/**
 * Capture full screen screenshot
 */
export async function captureFullscreen(
  monitorIndex?: number
): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_fullscreen", { monitorIndex });
}

/**
 * Capture active window screenshot
 */
export async function captureWindow(): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_window");
}

/**
 * Capture a specific region
 */
export async function captureRegion(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_region", { x, y, width, height });
}

/**
 * Start interactive region selection
 */
export async function startRegionSelection(): Promise<CaptureRegion> {
  return invoke("screenshot_start_region_selection");
}

// ============== Capture with History ==============

/**
 * Capture fullscreen and add to history
 */
export async function captureFullscreenWithHistory(
  monitorIndex?: number
): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_fullscreen_with_history", { monitorIndex });
}

/**
 * Capture window and add to history
 */
export async function captureWindowWithHistory(): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_window_with_history");
}

/**
 * Capture region and add to history
 */
export async function captureRegionWithHistory(
  x: number,
  y: number,
  width: number,
  height: number
): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_region_with_history", { x, y, width, height });
}

// ============== OCR Functions ==============

/**
 * Extract text from screenshot using basic OCR
 */
export async function extractText(imageBase64: string): Promise<string> {
  return invoke("screenshot_ocr", { imageBase64 });
}

/**
 * Extract text using Windows OCR (more accurate)
 */
export async function extractTextWindows(
  imageBase64: string
): Promise<WinOcrResult> {
  return invoke("screenshot_ocr_windows", { imageBase64 });
}

/**
 * Extract text using Windows OCR with specified language
 */
export async function extractTextWithLanguage(
  imageBase64: string,
  language?: string
): Promise<WinOcrResult> {
  return invoke("screenshot_ocr_with_language", { imageBase64, language });
}

/**
 * Get available OCR languages installed on the system
 */
export async function getOcrLanguages(): Promise<string[]> {
  return invoke("screenshot_get_ocr_languages");
}

/**
 * Check if OCR is available on this system
 */
export async function isOcrAvailable(): Promise<boolean> {
  return invoke("screenshot_ocr_is_available");
}

/**
 * Check if a specific OCR language is available
 */
export async function isOcrLanguageAvailable(language: string): Promise<boolean> {
  return invoke("screenshot_ocr_is_language_available", { language });
}

// ============== History Functions ==============

/**
 * Get screenshot history
 */
export async function getHistory(count?: number): Promise<ScreenshotHistoryEntry[]> {
  return invoke("screenshot_get_history", { count });
}

/**
 * Search screenshot history by OCR text
 */
export async function searchHistory(query: string): Promise<ScreenshotHistoryEntry[]> {
  return invoke("screenshot_search_history", { query });
}

/**
 * Get screenshot by ID
 */
export async function getScreenshotById(
  id: string
): Promise<ScreenshotHistoryEntry | null> {
  return invoke("screenshot_get_by_id", { id });
}

/**
 * Pin a screenshot
 */
export async function pinScreenshot(id: string): Promise<boolean> {
  return invoke("screenshot_pin", { id });
}

/**
 * Unpin a screenshot
 */
export async function unpinScreenshot(id: string): Promise<boolean> {
  return invoke("screenshot_unpin", { id });
}

/**
 * Delete a screenshot from history
 */
export async function deleteScreenshot(id: string): Promise<boolean> {
  return invoke("screenshot_delete", { id });
}

/**
 * Clear screenshot history
 */
export async function clearHistory(): Promise<void> {
  return invoke("screenshot_clear_history");
}

// ============== Configuration ==============

/**
 * Get screenshot configuration
 */
export async function getConfig(): Promise<ScreenshotConfig> {
  return invoke("screenshot_get_config");
}

/**
 * Update screenshot configuration
 */
export async function updateConfig(config: ScreenshotConfig): Promise<void> {
  return invoke("screenshot_update_config", { config });
}

/**
 * Get available monitors
 */
export async function getMonitors(): Promise<MonitorInfo[]> {
  return invoke("screenshot_get_monitors");
}

/**
 * Save screenshot to file
 */
export async function saveToFile(
  imageBase64: string,
  path: string
): Promise<string> {
  return invoke("screenshot_save", { imageBase64, path });
}
