/**
 * Context Native API
 *
 * Provides TypeScript bindings for the Tauri context commands.
 */

import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

export interface WindowInfo {
  handle: number;
  title: string;
  class_name: string;
  process_id: number;
  process_name: string;
  exe_path?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_minimized: boolean;
  is_maximized: boolean;
  is_focused: boolean;
  is_visible: boolean;
}

export type AppType =
  | "Browser"
  | "CodeEditor"
  | "Terminal"
  | "DocumentEditor"
  | "Spreadsheet"
  | "Presentation"
  | "Email"
  | "Chat"
  | "FileManager"
  | "MediaPlayer"
  | "ImageEditor"
  | "PdfViewer"
  | "NoteTaking"
  | "Database"
  | "ApiClient"
  | "VersionControl"
  | "SystemSettings"
  | "Game"
  | "Unknown";

export interface AppContext {
  app_type: AppType;
  app_name: string;
  version?: string;
  supports_text_input: boolean;
  supports_rich_text: boolean;
  is_dev_tool: boolean;
  suggested_actions: string[];
  metadata: Record<string, string>;
}

export type FileType =
  | "SourceCode"
  | "Markup"
  | "Config"
  | "Data"
  | "Document"
  | "Image"
  | "Video"
  | "Audio"
  | "Archive"
  | "Executable"
  | "Unknown";

export interface FileContext {
  path?: string;
  name?: string;
  extension?: string;
  language?: string;
  is_modified: boolean;
  project_root?: string;
  git_branch?: string;
  file_type: FileType;
}

export type PageType =
  | "SearchResults"
  | "Documentation"
  | "CodeRepository"
  | "SocialMedia"
  | "VideoStreaming"
  | "NewsArticle"
  | "WebEmail"
  | "Ecommerce"
  | "Chat"
  | "CloudStorage"
  | "AiInterface"
  | "DevTools"
  | "General"
  | "BrowserInternal";

export interface TabInfo {
  is_new_tab: boolean;
  is_settings: boolean;
  is_dev_tools: boolean;
  is_extension: boolean;
}

export interface BrowserContext {
  browser: string;
  url?: string;
  page_title?: string;
  domain?: string;
  is_secure?: boolean;
  tab_info?: TabInfo;
  page_type: PageType;
  suggested_actions: string[];
}

export interface EditorContext {
  editor_name: string;
  file_path?: string;
  file_name?: string;
  file_extension?: string;
  language?: string;
  project_name?: string;
  is_modified: boolean;
  git_branch?: string;
  line_number?: number;
  column_number?: number;
  metadata: Record<string, string>;
}

export interface FullContext {
  window?: WindowInfo;
  app?: AppContext;
  file?: FileContext;
  browser?: BrowserContext;
  editor?: EditorContext;
  timestamp: number;
}

// ============== Screen Content Types ==============

export type UiElementType =
  | "Button"
  | "TextInput"
  | "Checkbox"
  | "RadioButton"
  | "Dropdown"
  | "Link"
  | "Menu"
  | "MenuItem"
  | "Tab"
  | "Window"
  | "Dialog"
  | "Tooltip"
  | "Icon"
  | "Image"
  | "Text"
  | "Unknown";

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  language?: string;
}

export interface UiElement {
  element_type: UiElementType;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_interactive: boolean;
}

export interface ScreenContent {
  text: string;
  text_blocks: TextBlock[];
  ui_elements: UiElement[];
  width: number;
  height: number;
  timestamp: number;
  confidence: number;
}

// ============== Context Functions ==============

/**
 * Get full context information
 */
export async function getFullContext(): Promise<FullContext> {
  return invoke("context_get_full");
}

/**
 * Get active window information
 */
export async function getWindowInfo(): Promise<WindowInfo> {
  return invoke("context_get_window");
}

/**
 * Get application context
 */
export async function getAppContext(): Promise<AppContext> {
  return invoke("context_get_app");
}

/**
 * Get file context
 */
export async function getFileContext(): Promise<FileContext> {
  return invoke("context_get_file");
}

/**
 * Get browser context
 */
export async function getBrowserContext(): Promise<BrowserContext> {
  return invoke("context_get_browser");
}

/**
 * Get suggested actions for the current browser page
 * Returns actions like "Summarize page", "Explain code", etc. based on page type
 */
export async function getBrowserSuggestedActions(): Promise<string[]> {
  return invoke("context_get_browser_suggested_actions");
}

/**
 * Get editor context
 */
export async function getEditorContext(): Promise<EditorContext> {
  return invoke("context_get_editor");
}

/**
 * Check if the current context is a code editor
 * Returns true if a programming language is detected or if a file with extension is open
 */
export async function isCodeEditor(): Promise<boolean> {
  return invoke("context_is_code_editor");
}

/**
 * Get all visible windows
 */
export async function getAllWindows(): Promise<WindowInfo[]> {
  return invoke("context_get_all_windows");
}

/**
 * Find windows by title pattern
 */
export async function findWindowsByTitle(pattern: string): Promise<WindowInfo[]> {
  return invoke("context_find_windows_by_title", { pattern });
}

/**
 * Find windows by process name
 */
export async function findWindowsByProcess(
  processName: string
): Promise<WindowInfo[]> {
  return invoke("context_find_windows_by_process", { processName });
}

/**
 * Clear context cache
 */
export async function clearCache(): Promise<void> {
  return invoke("context_clear_cache");
}

/**
 * Set cache duration in milliseconds
 */
export async function setCacheDuration(ms: number): Promise<void> {
  return invoke("context_set_cache_duration", { ms });
}

/**
 * Get current cache duration in milliseconds
 */
export async function getCacheDuration(): Promise<number> {
  return invoke("context_get_cache_duration");
}

/**
 * Analyze UI using Windows UI Automation
 */
export async function analyzeUiAutomation(): Promise<UiElement[]> {
  return invoke("context_analyze_ui_automation");
}

/**
 * Get text at specific screen coordinates
 */
export async function getTextAt(x: number, y: number): Promise<string | null> {
  return invoke("context_get_text_at", { x, y });
}

/**
 * Get UI element at specific screen coordinates
 */
export async function getElementAt(x: number, y: number): Promise<UiElement | null> {
  return invoke("context_get_element_at", { x, y });
}
