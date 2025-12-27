/**
 * Context Hook
 *
 * Provides access to context awareness functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';

export type AppType =
  | 'Browser'
  | 'CodeEditor'
  | 'Terminal'
  | 'DocumentEditor'
  | 'Spreadsheet'
  | 'Presentation'
  | 'Email'
  | 'Chat'
  | 'FileManager'
  | 'MediaPlayer'
  | 'ImageEditor'
  | 'PdfViewer'
  | 'NoteTaking'
  | 'Database'
  | 'ApiClient'
  | 'VersionControl'
  | 'SystemSettings'
  | 'Game'
  | 'Unknown';

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

export function useContext() {
  const [context, setContext] = useState<FullContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!isTauri()) return null;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<FullContext>('context_get_full');
      setContext(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWindowInfo = useCallback(async () => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<WindowInfo>('context_get_window');
    } catch (err) {
      console.error('Failed to get window info:', err);
      return null;
    }
  }, []);

  const getAppContext = useCallback(async () => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<AppContext>('context_get_app');
    } catch (err) {
      console.error('Failed to get app context:', err);
      return null;
    }
  }, []);

  const getFileContext = useCallback(async () => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<FileContext>('context_get_file');
    } catch (err) {
      console.error('Failed to get file context:', err);
      return null;
    }
  }, []);

  const getBrowserContext = useCallback(async () => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<BrowserContext>('context_get_browser');
    } catch (err) {
      console.error('Failed to get browser context:', err);
      return null;
    }
  }, []);

  const getEditorContext = useCallback(async () => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<EditorContext>('context_get_editor');
    } catch (err) {
      console.error('Failed to get editor context:', err);
      return null;
    }
  }, []);

  const getAllWindows = useCallback(async () => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<WindowInfo[]>('context_get_all_windows');
    } catch (err) {
      console.error('Failed to get all windows:', err);
      return [];
    }
  }, []);

  const findWindowsByTitle = useCallback(async (pattern: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<WindowInfo[]>('context_find_windows_by_title', { pattern });
    } catch (err) {
      console.error('Failed to find windows by title:', err);
      return [];
    }
  }, []);

  const findWindowsByProcess = useCallback(async (processName: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<WindowInfo[]>('context_find_windows_by_process', { processName });
    } catch (err) {
      console.error('Failed to find windows by process:', err);
      return [];
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (!isTauri()) return;
    
    try {
      await invoke('context_clear_cache');
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }, []);

  // Auto-refresh context periodically
  useEffect(() => {
    fetchContext();
    
    const interval = setInterval(() => {
      fetchContext();
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [fetchContext]);

  return {
    context,
    isLoading,
    error,
    fetchContext,
    getWindowInfo,
    getAppContext,
    getFileContext,
    getBrowserContext,
    getEditorContext,
    getAllWindows,
    findWindowsByTitle,
    findWindowsByProcess,
    clearCache,
  };
}
