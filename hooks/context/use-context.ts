/**
 * Context Hook
 *
 * Provides access to context awareness functionality.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isTauri } from '@/lib/native/utils';
import * as contextApi from '@/lib/native/context';
import type { FullContext, ScreenAnalyzeOptions, ScreenContent } from '@/lib/native/context';
import { useContextStore } from '@/stores/context';
import { useNativeStore } from '@/stores/system';
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
  ScreenAnalyzeOptions,
} from '@/lib/native/context';

function getWindowFingerprint(context: FullContext | null): string | null {
  const window = context?.window;
  if (!window) return null;

  return [
    window.handle,
    window.process_id,
    window.process_name,
    window.title,
    window.width,
    window.height,
  ].join('|');
}

export function useContext() {
  const setStoreContext = useContextStore((s) => s.setContext);
  const setStoreError = useContextStore((s) => s.setError);
  const setStoreIsLoading = useContextStore((s) => s.setIsLoading);
  const clearStoreContext = useContextStore((s) => s.clearContext);
  const setStoreCacheDurationMs = useContextStore((s) => s.setCacheDurationMs);
  const setStoreUiElements = useContextStore((s) => s.setUiElements);
  const setStoreScreenContent = useContextStore((s) => s.setScreenContent);
  const setStoreIsAnalyzingScreen = useContextStore((s) => s.setIsAnalyzingScreen);
  const setStoreScreenAnalysisError = useContextStore((s) => s.setScreenAnalysisError);
  const clearStoreScreenAnalysis = useContextStore((s) => s.clearScreenAnalysis);

  const autoRefreshEnabled = useContextStore((s) => s.autoRefreshEnabled);
  const refreshIntervalMs = useContextStore((s) => s.refreshIntervalMs);
  const screenContent = useContextStore((s) => s.screenContent);
  const isAnalyzingScreen = useContextStore((s) => s.isAnalyzingScreen);
  const screenAnalysisError = useContextStore((s) => s.screenAnalysisError);
  const lastScreenAnalysisAt = useContextStore((s) => s.lastScreenAnalysisAt);
  const store = useContextStore();

  const screenshotOcrEnabled = useNativeStore((s) => s.nativeToolsConfig.screenshotOcrEnabled);

  const [localContext, setLocalContext] = useState<FullContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screenAnalysisInFlightRef = useRef(false);
  const lastWindowFingerprintRef = useRef<string | null>(null);
  const lastScreenAnalysisAtRef = useRef<number | null>(null);

  useEffect(() => {
    lastScreenAnalysisAtRef.current = lastScreenAnalysisAt;
  }, [lastScreenAnalysisAt]);

  const analyzeScreen = useCallback(
    async (
      imageData: Uint8Array | number[],
      width: number,
      height: number,
      options?: ScreenAnalyzeOptions
    ): Promise<ScreenContent | null> => {
      if (!isTauri()) return null;

      setStoreIsAnalyzingScreen(true);
      setStoreScreenAnalysisError(null);
      try {
        const result = await contextApi.analyzeScreen(imageData, width, height, options);
        setStoreScreenContent(result);
        lastScreenAnalysisAtRef.current = Date.now();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStoreScreenAnalysisError(message);
        log.error('Failed to analyze screen', err as Error);
        return null;
      } finally {
        setStoreIsAnalyzingScreen(false);
      }
    },
    [setStoreIsAnalyzingScreen, setStoreScreenAnalysisError, setStoreScreenContent]
  );

  const captureAndAnalyzeScreen = useCallback(
    async (options?: ScreenAnalyzeOptions): Promise<ScreenContent | null> => {
      if (!isTauri()) return null;
      if (screenAnalysisInFlightRef.current) return null;

      screenAnalysisInFlightRef.current = true;
      setStoreIsAnalyzingScreen(true);
      setStoreScreenAnalysisError(null);

      try {
        const result = await contextApi.captureAndAnalyzeActiveWindow(options);
        setStoreScreenContent(result);
        lastScreenAnalysisAtRef.current = Date.now();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStoreScreenAnalysisError(message);
        log.error('Failed to capture and analyze active window', err as Error);
        return null;
      } finally {
        screenAnalysisInFlightRef.current = false;
        setStoreIsAnalyzingScreen(false);
      }
    },
    [setStoreIsAnalyzingScreen, setStoreScreenAnalysisError, setStoreScreenContent]
  );

  const shouldAnalyzeScreenForContext = useCallback(
    (context: FullContext | null) => {
      if (!screenshotOcrEnabled || !context?.window) return false;
      if (screenAnalysisInFlightRef.current) return false;

      const fingerprint = getWindowFingerprint(context);
      const now = Date.now();
      const changed = fingerprint !== null && fingerprint !== lastWindowFingerprintRef.current;
      const expired =
        !lastScreenAnalysisAtRef.current ||
        now - lastScreenAnalysisAtRef.current >= refreshIntervalMs;

      if (changed && fingerprint) {
        lastWindowFingerprintRef.current = fingerprint;
      }

      return changed || expired;
    },
    [refreshIntervalMs, screenshotOcrEnabled]
  );

  const fetchContext = useCallback(async () => {
    if (!isTauri()) return null;

    setIsLoading(true);
    setStoreIsLoading(true);
    setError(null);
    setStoreError(null);

    try {
      const result = await contextApi.getFullContext();
      setLocalContext(result);
      setStoreContext(result);

      if (shouldAnalyzeScreenForContext(result)) {
        void captureAndAnalyzeScreen();
      }

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
  }, [
    captureAndAnalyzeScreen,
    setStoreContext,
    setStoreError,
    setStoreIsLoading,
    shouldAnalyzeScreenForContext,
  ]);

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

  const updateCacheDuration = useCallback(
    async (ms: number) => {
      if (!isTauri()) return;

      try {
        await contextApi.setCacheDuration(ms);
        setStoreCacheDurationMs(ms);
      } catch (err) {
        log.error('Failed to set cache duration', err as Error);
      }
    },
    [setStoreCacheDurationMs]
  );

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

  const clearScreenAnalysis = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await contextApi.clearScreenCache();
      clearStoreScreenAnalysis();
      lastScreenAnalysisAtRef.current = null;
      lastWindowFingerprintRef.current = null;
    } catch (err) {
      log.error('Failed to clear screen analysis cache', err as Error);
    }
  }, [clearStoreScreenAnalysis]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    void fetchContext();
    const interval = setInterval(() => {
      void fetchContext();
    }, refreshIntervalMs);

    return () => clearInterval(interval);
  }, [fetchContext, autoRefreshEnabled, refreshIntervalMs]);

  useEffect(() => {
    if (!screenshotOcrEnabled) {
      clearStoreScreenAnalysis();
      lastScreenAnalysisAtRef.current = null;
    }
  }, [clearStoreScreenAnalysis, screenshotOcrEnabled]);

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
    updateCacheDuration,
    fetchCacheDuration,
    analyzeUi,
    getTextAtPosition,
    getElementAtPosition,
    analyzeScreen,
    captureAndAnalyzeScreen,
    clearScreenAnalysis,
    screenContent,
    isAnalyzingScreen,
    screenAnalysisError,
    lastScreenAnalysisAt,
    store,
  };
}
