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
  delay_ms?: number;
  copy_to_clipboard: boolean;
  show_notification: boolean;
  ocr_language?: string;
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

export type Annotation =
  | {
      type: 'Rectangle';
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      stroke_width: number;
      filled: boolean;
    }
  | {
      type: 'Ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      color: string;
      stroke_width: number;
      filled: boolean;
    }
  | {
      type: 'Arrow';
      start_x: number;
      start_y: number;
      end_x: number;
      end_y: number;
      color: string;
      stroke_width: number;
    }
  | {
      type: 'Freehand';
      points: Array<[number, number]>;
      color: string;
      stroke_width: number;
    }
  | {
      type: 'Text';
      x: number;
      y: number;
      text: string;
      font_size: number;
      color: string;
      background?: string | null;
    }
  | {
      type: 'Blur';
      x: number;
      y: number;
      width: number;
      height: number;
      intensity: number;
    }
  | {
      type: 'Highlight';
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
    }
  | {
      type: 'Marker';
      x: number;
      y: number;
      number: number;
      color: string;
      size: number;
    };

export interface AnnotatedScreenshotResult {
  image_base64: string;
}

export interface SelectionValidationResult {
  region: CaptureRegion;
  is_valid: boolean;
}

export interface SnapConfig {
  snap_distance: number;
  snap_to_screen: boolean;
  snap_to_windows: boolean;
  snap_to_elements: boolean;
  show_guide_lines: boolean;
  magnetic_edges: boolean;
}

export interface WindowInfo {
  hwnd: number;
  title: string;
  process_name: string;
  pid: number;
  x: number;
  y: number;
  width: number;
  height: number;
  is_minimized: boolean;
  is_maximized: boolean;
  is_visible: boolean;
  thumbnail_base64?: string;
}

export interface ElementInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  element_type: string;
  name?: string;
  parent_hwnd: number;
}

export interface SnapGuide {
  orientation: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
  source: string;
}

export interface SelectionSnapResult {
  x: number;
  y: number;
  width: number;
  height: number;
  snapped: boolean;
  guides: SnapGuide[];
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

// ============== Annotation Functions ==============

/**
 * Apply annotations to screenshot image data
 */
export async function applyAnnotations(
  imageBase64: string,
  annotations: Annotation[]
): Promise<AnnotatedScreenshotResult> {
  return invoke("screenshot_apply_annotations", { imageBase64, annotations });
}

// ============== Selection Functions ==============

/**
 * Validate selection state and normalize region
 */
export async function validateSelection(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number
): Promise<SelectionValidationResult> {
  return invoke("screenshot_validate_selection", {
    startX,
    startY,
    currentX,
    currentY,
  });
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

/**
 * Set Windows OCR language used by screenshot manager
 */
export async function setOcrLanguage(language: string): Promise<void> {
  return invoke("screenshot_set_ocr_language", { language });
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
 * Search screenshot history by label
 */
export async function searchHistoryByLabel(
  label: string
): Promise<ScreenshotHistoryEntry[]> {
  return invoke("screenshot_search_history_by_label", { label });
}

/**
 * Get all screenshot history entries
 */
export async function getAllHistory(): Promise<ScreenshotHistoryEntry[]> {
  return invoke("screenshot_get_all_history");
}

/**
 * Get pinned screenshot history
 */
export async function getPinnedHistory(): Promise<ScreenshotHistoryEntry[]> {
  return invoke("screenshot_get_pinned_history");
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

/**
 * Clear all screenshot history
 */
export async function clearAllHistory(): Promise<void> {
  return invoke("screenshot_clear_all_history");
}

/**
 * Get history stats (count, is_empty)
 */
export async function getHistoryStats(): Promise<[number, boolean]> {
  return invoke("screenshot_get_history_stats");
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
 * Get snap configuration
 */
export async function getSnapConfig(): Promise<SnapConfig> {
  return invoke("screenshot_get_snap_config");
}

/**
 * Set snap configuration
 */
export async function setSnapConfig(config: SnapConfig): Promise<void> {
  return invoke("screenshot_set_snap_config", { config });
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

// ============== Window Detection Functions ==============

/**
 * Get all visible windows
 */
export async function getWindows(): Promise<WindowInfo[]> {
  return invoke("screenshot_get_windows");
}

/**
 * Get all visible windows with thumbnails
 */
export async function getWindowsWithThumbnails(
  thumbnailSize?: number
): Promise<WindowInfo[]> {
  return invoke("screenshot_get_windows_with_thumbnails", { thumbnailSize });
}

/**
 * Get the window at a specific screen point (for auto-detection during selection)
 */
export async function getWindowAtPoint(
  x: number,
  y: number
): Promise<WindowInfo | null> {
  return invoke("screenshot_get_window_at_point", { x, y });
}

/**
 * Get child elements of a window (for element-level detection)
 */
export async function getChildElements(
  hwnd: number,
  maxDepth?: number
): Promise<ElementInfo[]> {
  return invoke("screenshot_get_child_elements", { hwnd, maxDepth });
}

/**
 * Capture a specific window by its HWND
 */
export async function captureWindowByHwnd(hwnd: number): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_window_by_hwnd", { hwnd });
}

/**
 * Capture a specific window by HWND and add to history
 */
export async function captureWindowByHwndWithHistory(
  hwnd: number
): Promise<ScreenshotResult> {
  return invoke("screenshot_capture_window_by_hwnd_with_history", { hwnd });
}

// ============== Selection Snap Functions ==============

/**
 * Calculate snapped selection rectangle during region selection
 * Returns adjusted coordinates if edges are near window/screen boundaries
 */
export async function calculateSelectionSnap(
  selectionX: number,
  selectionY: number,
  selectionWidth: number,
  selectionHeight: number
): Promise<SelectionSnapResult> {
  return invoke("screenshot_calculate_selection_snap", {
    selectionX,
    selectionY,
    selectionWidth,
    selectionHeight,
  });
}

// ============== Color Picker Functions ==============

/**
 * Get pixel color at screen coordinates
 * Returns hex color string (e.g., "#FF5733") or null if failed
 */
export async function getPixelColor(x: number, y: number): Promise<string | null> {
  return invoke("screenshot_get_pixel_color", { x, y });
}
