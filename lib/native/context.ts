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
  executable_path?: string;
  is_visible: boolean;
  is_minimized: boolean;
  is_maximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
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

export interface FileContext {
  file_path?: string;
  file_name?: string;
  file_extension?: string;
  directory?: string;
  is_modified: boolean;
  language?: string;
  project_root?: string;
}

export interface BrowserContext {
  browser_name: string;
  url?: string;
  domain?: string;
  page_title?: string;
  is_secure: boolean;
  tab_count?: number;
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
 * Get editor context
 */
export async function getEditorContext(): Promise<EditorContext> {
  return invoke("context_get_editor");
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
