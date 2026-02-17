/**
 * Screenshot Hook
 *
 * Thin proxy over useScreenshotStore for a single source of truth.
 * State (isCapturing, lastScreenshot, error, history) is delegated to the store.
 * Pure API wrappers are kept for methods that don't affect store state.
 */

import { useCallback } from 'react';
import * as screenshotApi from '@/lib/native/screenshot';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';
import { useScreenshotStore } from '@/stores/media';

const log = loggers.native;

// Re-export store types (camelCase) for consumers
export type {
  ScreenshotMetadata,
  ScreenshotResult,
  ScreenshotHistoryEntry,
  ScreenshotConfig,
} from '@/stores/media/screenshot-store';

export type { ScreenshotMonitorInfo as MonitorInfo } from '@/stores/media';

// Re-export native-only types that have no store equivalent
export type {
  WinOcrResult,
  WindowInfo,
  Annotation,
  AnnotatedScreenshotResult,
  SelectionValidationResult,
  SnapConfig,
  DetailedOcrResult,
  SelectionSnapResult,
  ElementInfo,
} from '@/lib/native/screenshot';

import type {
  Annotation,
  SelectionSnapResult,
  ElementInfo,
} from '@/lib/native/screenshot';

export function useScreenshot() {
  const store = useScreenshotStore();

  // --- Pure API wrappers for methods not in the store ---

  const startRegionSelection = useCallback(async () => {
    if (!isTauri()) return null;
    try {
      return await screenshotApi.startRegionSelection();
    } catch (err) {
      log.error('Failed to start region selection', err as Error);
      return null;
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

  const getMonitors = useCallback(async () => {
    if (!isTauri()) return [];
    try {
      return await screenshotApi.getMonitors();
    } catch (err) {
      log.error('Failed to get monitors', err as Error);
      return [];
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

  const getCurrentOcrLanguage = useCallback(async () => {
    if (!isTauri()) return 'eng';
    try {
      return await screenshotApi.getCurrentOcrLanguage();
    } catch (err) {
      log.error('Failed to get current OCR language', err as Error);
      return 'eng';
    }
  }, []);

  const calculateSelectionSnap = useCallback(
    async (selectionX: number, selectionY: number, selectionWidth: number, selectionHeight: number): Promise<SelectionSnapResult | null> => {
      if (!isTauri()) return null;
      try {
        return await screenshotApi.calculateSelectionSnap(selectionX, selectionY, selectionWidth, selectionHeight);
      } catch (err) {
        log.error('Failed to calculate selection snap', err as Error);
        return null;
      }
    },
    []
  );

  const getWindowAtPoint = useCallback(async (x: number, y: number) => {
    if (!isTauri()) return null;
    try {
      return await screenshotApi.getWindowAtPoint(x, y);
    } catch (err) {
      log.error('Failed to get window at point', err as Error);
      return null;
    }
  }, []);

  const getChildElements = useCallback(async (hwnd: number, maxDepth?: number): Promise<ElementInfo[]> => {
    if (!isTauri()) return [];
    try {
      return await screenshotApi.getChildElements(hwnd, maxDepth);
    } catch (err) {
      log.error('Failed to get child elements', err as Error);
      return [];
    }
  }, []);

  const isOcrLanguageAvailable = useCallback(async (language: string) => {
    if (!isTauri()) return false;
    try {
      return await screenshotApi.isOcrLanguageAvailable(language);
    } catch (err) {
      log.error('Failed to check OCR language', err as Error);
      return false;
    }
  }, []);

  return {
    // State from store (single source of truth)
    isCapturing: store.isCapturing,
    lastScreenshot: store.lastScreenshot,
    error: store.error,

    // Methods delegated to store
    captureFullscreen: store.captureFullscreen,
    captureWindow: store.captureWindow,
    captureRegion: store.captureRegion,
    captureWindowByHwnd: store.captureWindowByHwnd,
    extractText: store.extractText,
    extractTextWindows: store.extractTextWindows,
    extractTextDetailed: store.extractTextDetailed,
    getWindows: store.getWindows,
    getWindowsWithThumbnails: store.getWindowsWithThumbnails,
    saveToFile: store.saveToFile,
    setOcrLanguage: store.setOcrLanguage,
    getPixelColor: store.getPixelColor,
    getSnapConfig: store.getSnapConfig,
    setSnapConfig: store.setSnapConfig,
    updateConfig: store.updateConfig,
    openEditorAfterCapture: store.config.openEditorAfterCapture,
    setOpenEditorAfterCapture: (enabled: boolean) =>
      store.updateConfig({ openEditorAfterCapture: enabled }),
    ingestExternalCapture: store.ingestExternalCapture,

    // Pure API wrappers (no store state involved)
    startRegionSelection,
    applyAnnotations,
    validateSelection,
    getMonitors,
    calculateSnap,
    getCurrentOcrLanguage,
    calculateSelectionSnap,
    getWindowAtPoint,
    getChildElements,
    isOcrLanguageAvailable,
  };
}

export function useScreenshotHistory() {
  const store = useScreenshotStore();

  const clearAllHistory = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await screenshotApi.clearAllHistory();
      await useScreenshotStore.getState().refreshHistory();
    } catch (err) {
      log.error('Failed to clear all history', err as Error);
    }
  }, []);

  return {
    // State from store (single source of truth)
    history: store.history,
    isLoading: store.isLoading,

    // Methods delegated to store
    fetchHistory: store.refreshHistory,
    fetchAllHistory: store.getAllHistory,
    fetchPinnedHistory: store.getPinnedHistory,
    searchHistory: store.searchHistory,
    searchHistoryByLabel: store.searchHistoryByLabel,
    getById: store.getScreenshotById,
    pinScreenshot: store.pinScreenshot,
    unpinScreenshot: store.unpinScreenshot,
    deleteScreenshot: store.deleteScreenshot,
    clearHistory: store.clearHistory,
    getHistoryStats: store.getHistoryStats,

    // Methods not in store
    clearAllHistory,
  };
}
