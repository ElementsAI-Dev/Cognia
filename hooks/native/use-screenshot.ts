/**
 * Screenshot Hook
 *
 * Provides access to screenshot capture and history functionality.
 */

import { useState, useCallback } from 'react';
import * as screenshotApi from '@/lib/native/screenshot';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;

// Re-export types from the native API for consumers
export type {
  ScreenshotMetadata,
  ScreenshotResult,
  ScreenshotHistoryEntry,
  MonitorInfo,
  WinOcrResult,
  WindowInfo,
  Annotation,
  AnnotatedScreenshotResult,
  SelectionValidationResult,
  SnapConfig,
} from '@/lib/native/screenshot';

import type {
  ScreenshotResult,
  ScreenshotHistoryEntry,
  Annotation,
  SnapConfig,
} from '@/lib/native/screenshot';

export function useScreenshot() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<ScreenshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureFullscreen = useCallback(async (monitorIndex?: number) => {
    if (!isTauri()) return null;

    setIsCapturing(true);
    setError(null);
    try {
      const result = await screenshotApi.captureFullscreenWithHistory(monitorIndex);
      setLastScreenshot(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const applyAnnotations = useCallback(async (imageBase64: string, annotations: Annotation[]) => {
    if (!isTauri()) return null;

    try {
      return await screenshotApi.applyAnnotations(imageBase64, annotations);
    } catch (err) {
      log.error('Failed to apply annotations', err as Error);
      return null;
    }
  }, []);

  const validateSelection = useCallback(
    async (startX: number, startY: number, currentX: number, currentY: number) => {
      if (!isTauri()) return null;

      try {
        return await screenshotApi.validateSelection(startX, startY, currentX, currentY);
      } catch (err) {
        log.error('Failed to validate selection', err as Error);
        return null;
      }
    },
    []
  );

  const captureWindow = useCallback(async () => {
    if (!isTauri()) return null;

    setIsCapturing(true);
    setError(null);
    try {
      const result = await screenshotApi.captureWindowWithHistory();
      setLastScreenshot(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const captureRegion = useCallback(async (x: number, y: number, width: number, height: number) => {
    if (!isTauri()) return null;

    setIsCapturing(true);
    setError(null);
    try {
      const result = await screenshotApi.captureRegionWithHistory(x, y, width, height);
      setLastScreenshot(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const startRegionSelection = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await screenshotApi.startRegionSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const extractText = useCallback(async (imageBase64: string) => {
    if (!isTauri()) return '';

    try {
      return await screenshotApi.extractText(imageBase64);
    } catch (err) {
      log.error('OCR failed', err as Error);
      return '';
    }
  }, []);

  const extractTextWindows = useCallback(async (imageBase64: string) => {
    if (!isTauri()) return null;

    try {
      return await screenshotApi.extractTextWindows(imageBase64);
    } catch (err) {
      log.error('Windows OCR failed', err as Error);
      return null;
    }
  }, []);

  const getMonitors = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await screenshotApi.getMonitors();
    } catch (err) {
      log.error('Failed to get monitors', err as Error);
      return [];
    }
  }, []);

  const saveToFile = useCallback(async (imageBase64: string, path: string) => {
    if (!isTauri()) return '';

    try {
      return await screenshotApi.saveToFile(imageBase64, path);
    } catch (err) {
      log.error('Failed to save screenshot', err as Error);
      return '';
    }
  }, []);

  const getWindows = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await screenshotApi.getWindows();
    } catch (err) {
      log.error('Failed to get windows', err as Error);
      return [];
    }
  }, []);

  const getWindowsWithThumbnails = useCallback(async (thumbnailSize?: number) => {
    if (!isTauri()) return [];

    try {
      return await screenshotApi.getWindowsWithThumbnails(thumbnailSize);
    } catch (err) {
      log.error('Failed to get windows with thumbnails', err as Error);
      return [];
    }
  }, []);

  const captureWindowByHwnd = useCallback(async (hwnd: number) => {
    if (!isTauri()) return null;

    setIsCapturing(true);
    setError(null);
    try {
      const result = await screenshotApi.captureWindowByHwndWithHistory(hwnd);
      setLastScreenshot(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const calculateSnap = useCallback(
    async (
      windowHwnd: number,
      proposedX: number,
      proposedY: number,
      windowWidth: number,
      windowHeight: number
    ) => {
      if (!isTauri()) return null;

      try {
        return await screenshotApi.calculateSnap(windowHwnd, proposedX, proposedY, windowWidth, windowHeight);
      } catch (err) {
        log.error('Failed to calculate snap', err as Error);
        return null;
      }
    },
    []
  );

  const getSnapConfig = useCallback(async () => {
    if (!isTauri()) return null;

    try {
      return await screenshotApi.getSnapConfig();
    } catch (err) {
      log.error('Failed to get snap config', err as Error);
      return null;
    }
  }, []);

  const setSnapConfig = useCallback(async (config: SnapConfig) => {
    if (!isTauri()) return false;
    try {
      await screenshotApi.setSnapConfig(config);
      return true;
    } catch (err) {
      log.error('Failed to set snap config', err as Error);
      return false;
    }
  }, []);

  const setOcrLanguage = useCallback(async (language: string) => {
    if (!isTauri()) return false;
    try {
      await screenshotApi.setOcrLanguage(language);
      return true;
    } catch (err) {
      log.error('Failed to set OCR language', err as Error);
      return false;
    }
  }, []);

  return {
    isCapturing,
    lastScreenshot,
    error,
    captureFullscreen,
    captureWindow,
    captureRegion,
    startRegionSelection,
    extractText,
    extractTextWindows,
    getMonitors,
    saveToFile,
    applyAnnotations,
    validateSelection,
    getWindows,
    getWindowsWithThumbnails,
    captureWindowByHwnd,
    calculateSnap,
    getSnapConfig,
    setSnapConfig,
    setOcrLanguage,
  };
}

export function useScreenshotHistory() {
  const [history, setHistory] = useState<ScreenshotHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /* ---------- History helpers ---------- */
  const fetchHistory = useCallback(async (count?: number) => {
    if (!isTauri()) return;

    setIsLoading(true);
    try {
      const result = await screenshotApi.getHistory(count);
      setHistory(result);
    } catch (err) {
      log.error('Failed to fetch screenshot history', err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllHistory = useCallback(async () => {
    if (!isTauri()) return [] as ScreenshotHistoryEntry[];
    try {
      return await screenshotApi.getAllHistory();
    } catch (err) {
      log.error('Failed to fetch all history', err as Error);
      return [];
    }
  }, []);

  const fetchPinnedHistory = useCallback(async () => {
    if (!isTauri()) return [] as ScreenshotHistoryEntry[];
    try {
      return await screenshotApi.getPinnedHistory();
    } catch (err) {
      log.error('Failed to fetch pinned history', err as Error);
      return [];
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];

    try {
      return await screenshotApi.searchHistory(query);
    } catch (err) {
      log.error('Failed to search screenshot history', err as Error);
      return [];
    }
  }, []);

  const getById = useCallback(async (id: string) => {
    if (!isTauri()) return null;

    try {
      return await screenshotApi.getScreenshotById(id);
    } catch (err) {
      log.error('Failed to get screenshot', err as Error);
      return null;
    }
  }, []);

  const pinScreenshot = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await screenshotApi.pinScreenshot(id);
        if (result) await fetchHistory();
        return result;
      } catch (err) {
        log.error('Failed to pin screenshot', err as Error);
        return false;
      }
    },
    [fetchHistory]
  );

  const searchHistoryByLabel = useCallback(async (label: string) => {
    if (!isTauri()) return [] as ScreenshotHistoryEntry[];
    try {
      return await screenshotApi.searchHistoryByLabel(label);
    } catch (err) {
      log.error('Failed to search history by label', err as Error);
      return [];
    }
  }, []);

  const unpinScreenshot = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await screenshotApi.unpinScreenshot(id);
        if (result) await fetchHistory();
        return result;
      } catch (err) {
        log.error('Failed to unpin screenshot', err as Error);
        return false;
      }
    },
    [fetchHistory]
  );

  const deleteScreenshot = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await screenshotApi.deleteScreenshot(id);
        if (result) await fetchHistory();
        return result;
      } catch (err) {
        log.error('Failed to delete screenshot', err as Error);
        return false;
      }
    },
    [fetchHistory]
  );

  const clearHistory = useCallback(async () => {
    if (!isTauri()) return;

    try {
      await screenshotApi.clearHistory();
      setHistory([]);
    } catch (err) {
      log.error('Failed to clear history', err as Error);
    }
  }, []);

  const clearAllHistory = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await screenshotApi.clearAllHistory();
      setHistory([]);
    } catch (err) {
      log.error('Failed to clear all history', err as Error);
    }
  }, []);

  const getHistoryStats = useCallback(async () => {
    if (!isTauri()) return null;
    try {
      return await screenshotApi.getHistoryStats();
    } catch (err) {
      log.error('Failed to get history stats', err as Error);
      return null;
    }
  }, []);

  return {
    history,
    isLoading,
    fetchHistory,
    fetchAllHistory,
    fetchPinnedHistory,
    searchHistory,
    searchHistoryByLabel,
    getById,
    pinScreenshot,
    unpinScreenshot,
    deleteScreenshot,
    clearHistory,
    clearAllHistory,
    getHistoryStats,
  };
}
