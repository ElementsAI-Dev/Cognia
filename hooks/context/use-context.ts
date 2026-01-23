/**
 * Context Hook
 *
 * Provides access to context awareness functionality.
 * Uses types from lib/native/context.ts for consistency.
 */

import { useState, useEffect, useCallback } from 'react';
import { isTauri } from '@/lib/native/utils';
import * as contextApi from '@/lib/native/context';
import type { FullContext } from '@/lib/native/context';
import { useContextStore } from '@/stores/context';

// Re-export types for backward compatibility
export type {
  FullContext,
  WindowInfo,
  AppContext,
  FileContext,
  BrowserContext,
  EditorContext,
  UiElement,
  AppType,
  FileType,
  PageType,
  TabInfo,
  UiElementType,
  TextBlock,
  ScreenContent,
} from '@/lib/native/context';

export function useContext() {
  const store = useContextStore();
  const [localContext, setLocalContext] = useState<FullContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!isTauri()) return null;

    setIsLoading(true);
    setError(null);
    try {
      const result = await contextApi.getFullContext();
      setLocalContext(result);
      store.setContext(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      store.setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
      store.setIsLoading(false);
    }
  }, [store]);

  const getWindowInfo = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getWindowInfo();
    } catch (err) {
      console.error('Failed to get window info:', err);
      return null;
    }
  }, []);

  const getAppContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getAppContext();
    } catch (err) {
      console.error('Failed to get app context:', err);
      return null;
    }
  }, []);

  const getFileContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getFileContext();
    } catch (err) {
      console.error('Failed to get file context:', err);
      return null;
    }
  }, []);

  const getBrowserContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getBrowserContext();
    } catch (err) {
      console.error('Failed to get browser context:', err);
      return null;
    }
  }, []);

  const getEditorContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getEditorContext();
    } catch (err) {
      console.error('Failed to get editor context:', err);
      return null;
    }
  }, []);

  const getAllWindows = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await contextApi.getAllWindows();
    } catch (err) {
      console.error('Failed to get all windows:', err);
      return [];
    }
  }, []);

  const findWindowsByTitle = useCallback(async (pattern: string) => {
    if (!isTauri()) return [];

    try {
      return await contextApi.findWindowsByTitle(pattern);
    } catch (err) {
      console.error('Failed to find windows by title:', err);
      return [];
    }
  }, []);

  const findWindowsByProcess = useCallback(async (processName: string) => {
    if (!isTauri()) return [];

    try {
      return await contextApi.findWindowsByProcess(processName);
    } catch (err) {
      console.error('Failed to find windows by process:', err);
      return [];
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await contextApi.clearCache();
      store.clearContext();
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  }, [store]);

  const updateCacheDuration = useCallback(async (ms: number) => {
    if (!isTauri()) return;

    try {
      await contextApi.setCacheDuration(ms);
      store.setCacheDurationMs(ms);
    } catch (err) {
      console.error('Failed to set cache duration:', err);
    }
  }, [store]);

  const fetchCacheDuration = useCallback(async () => {
    if (!isTauri()) return 500;

    try {
      return await contextApi.getCacheDuration();
    } catch (err) {
      console.error('Failed to get cache duration:', err);
      return 500;
    }
  }, []);

  const analyzeUi = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      const elements = await contextApi.analyzeUiAutomation();
      store.setUiElements(elements);
      return elements;
    } catch (err) {
      console.error('Failed to analyze UI:', err);
      return [];
    }
  }, [store]);

  const getTextAtPosition = useCallback(async (x: number, y: number) => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getTextAt(x, y);
    } catch (err) {
      console.error('Failed to get text at position:', err);
      return null;
    }
  }, []);

  const getElementAtPosition = useCallback(async (x: number, y: number) => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getElementAt(x, y);
    } catch (err) {
      console.error('Failed to get element at position:', err);
      return null;
    }
  }, []);

  // Auto-refresh context periodically
  useEffect(() => {
    if (!store.autoRefreshEnabled) return;

    fetchContext();

    const interval = setInterval(() => {
      fetchContext();
    }, store.refreshIntervalMs);

    return () => clearInterval(interval);
  }, [fetchContext, store.autoRefreshEnabled, store.refreshIntervalMs]);

  return {
    context: localContext,
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
    // New functions
    updateCacheDuration,
    fetchCacheDuration,
    analyzeUi,
    getTextAtPosition,
    getElementAtPosition,
    // Store access
    store,
  };
}
