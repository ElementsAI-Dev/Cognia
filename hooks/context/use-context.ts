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
import { loggers } from '@/lib/logger';

const log = loggers.native;

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
  // Extract stable action references to avoid re-creating callbacks on every render
  const setStoreContext = useContextStore((s) => s.setContext);
  const setStoreError = useContextStore((s) => s.setError);
  const setStoreIsLoading = useContextStore((s) => s.setIsLoading);
  const clearStoreContext = useContextStore((s) => s.clearContext);
  const setStoreCacheDurationMs = useContextStore((s) => s.setCacheDurationMs);
  const setStoreUiElements = useContextStore((s) => s.setUiElements);
  // Read config values reactively (these are primitives, so stable across renders unless changed)
  const autoRefreshEnabled = useContextStore((s) => s.autoRefreshEnabled);
  const refreshIntervalMs = useContextStore((s) => s.refreshIntervalMs);
  // Full store reference kept for pass-through in return value
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
      setStoreContext(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStoreError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
      setStoreIsLoading(false);
    }
  }, [setStoreContext, setStoreError, setStoreIsLoading]);

  const getWindowInfo = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getWindowInfo();
    } catch (err) {
      log.error('Failed to get window info', err as Error);
      return null;
    }
  }, []);

  const getAppContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getAppContext();
    } catch (err) {
      log.error('Failed to get app context', err as Error);
      return null;
    }
  }, []);

  const getFileContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getFileContext();
    } catch (err) {
      log.error('Failed to get file context', err as Error);
      return null;
    }
  }, []);

  const getBrowserContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getBrowserContext();
    } catch (err) {
      log.error('Failed to get browser context', err as Error);
      return null;
    }
  }, []);

  const getEditorContext = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getEditorContext();
    } catch (err) {
      log.error('Failed to get editor context', err as Error);
      return null;
    }
  }, []);

  const getAllWindows = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await contextApi.getAllWindows();
    } catch (err) {
      log.error('Failed to get all windows', err as Error);
      return [];
    }
  }, []);

  const findWindowsByTitle = useCallback(async (pattern: string) => {
    if (!isTauri()) return [];

    try {
      return await contextApi.findWindowsByTitle(pattern);
    } catch (err) {
      log.error('Failed to find windows by title', err as Error);
      return [];
    }
  }, []);

  const findWindowsByProcess = useCallback(async (processName: string) => {
    if (!isTauri()) return [];

    try {
      return await contextApi.findWindowsByProcess(processName);
    } catch (err) {
      log.error('Failed to find windows by process', err as Error);
      return [];
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await contextApi.clearCache();
      clearStoreContext();
    } catch (err) {
      log.error('Failed to clear cache', err as Error);
    }
  }, [clearStoreContext]);

  const updateCacheDuration = useCallback(async (ms: number) => {
    if (!isTauri()) return;

    try {
      await contextApi.setCacheDuration(ms);
      setStoreCacheDurationMs(ms);
    } catch (err) {
      log.error('Failed to set cache duration', err as Error);
    }
  }, [setStoreCacheDurationMs]);

  const fetchCacheDuration = useCallback(async () => {
    if (!isTauri()) return 500;

    try {
      return await contextApi.getCacheDuration();
    } catch (err) {
      log.error('Failed to get cache duration', err as Error);
      return 500;
    }
  }, []);

  const analyzeUi = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      const elements = await contextApi.analyzeUiAutomation();
      setStoreUiElements(elements);
      return elements;
    } catch (err) {
      log.error('Failed to analyze UI', err as Error);
      return [];
    }
  }, [setStoreUiElements]);

  const getTextAtPosition = useCallback(async (x: number, y: number) => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getTextAt(x, y);
    } catch (err) {
      log.error('Failed to get text at position', err as Error);
      return null;
    }
  }, []);

  const getElementAtPosition = useCallback(async (x: number, y: number) => {
    if (!isTauri()) return null;

    try {
      return await contextApi.getElementAt(x, y);
    } catch (err) {
      log.error('Failed to get element at position', err as Error);
      return null;
    }
  }, []);

  // Auto-refresh context periodically
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    fetchContext();

    const interval = setInterval(() => {
      fetchContext();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [fetchContext, autoRefreshEnabled, refreshIntervalMs]);

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
