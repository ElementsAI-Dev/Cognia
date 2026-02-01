/**
 * Screenshot Hook
 *
 * Provides access to screenshot capture and history functionality.
 */

import { useState, useCallback } from 'react';
import {
  Annotation,
  AnnotatedScreenshotResult,
  SelectionValidationResult,
  SnapConfig,
} from '@/lib/native/screenshot';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';

const log = loggers.native;

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

export interface WinOcrResult {
  text: string;
  lines: Array<{
    text: string;
    words: Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  language?: string;
  confidence: number;
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

export interface SnapResult {
  x: number | null;
  y: number | null;
  horizontal_edge: string;
  vertical_edge: string;
  snap_target: string | null;
}

export function useScreenshot() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<ScreenshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureFullscreen = useCallback(async (monitorIndex?: number) => {
    if (!isTauri()) return null;

    setIsCapturing(true);
    setError(null);
    try {
      const result = await invoke<ScreenshotResult>('screenshot_capture_fullscreen_with_history', {
        monitorIndex,
      });
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
      return await invoke<AnnotatedScreenshotResult>('screenshot_apply_annotations', {
        imageBase64,
        annotations,
      });
    } catch (err) {
      log.error('Failed to apply annotations', err as Error);
      return null;
    }
  }, []);

  const validateSelection = useCallback(
    async (startX: number, startY: number, currentX: number, currentY: number) => {
      if (!isTauri()) return null;

      try {
        return await invoke<SelectionValidationResult>('screenshot_validate_selection', {
          startX,
          startY,
          currentX,
          currentY,
        });
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
      const result = await invoke<ScreenshotResult>('screenshot_capture_window_with_history');
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
      const result = await invoke<ScreenshotResult>('screenshot_capture_region_with_history', {
        x,
        y,
        width,
        height,
      });
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
      const region = await invoke<{ x: number; y: number; width: number; height: number }>(
        'screenshot_start_region_selection'
      );
      return region;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const extractText = useCallback(async (imageBase64: string) => {
    if (!isTauri()) return '';

    try {
      return await invoke<string>('screenshot_ocr', { imageBase64 });
    } catch (err) {
      log.error('OCR failed', err as Error);
      return '';
    }
  }, []);

  const extractTextWindows = useCallback(async (imageBase64: string) => {
    if (!isTauri()) return null;

    try {
      return await invoke<WinOcrResult>('screenshot_ocr_windows', { imageBase64 });
    } catch (err) {
      log.error('Windows OCR failed', err as Error);
      return null;
    }
  }, []);

  const getMonitors = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await invoke<MonitorInfo[]>('screenshot_get_monitors');
    } catch (err) {
      log.error('Failed to get monitors', err as Error);
      return [];
    }
  }, []);

  const saveToFile = useCallback(async (imageBase64: string, path: string) => {
    if (!isTauri()) return '';

    try {
      return await invoke<string>('screenshot_save', { imageBase64, path });
    } catch (err) {
      log.error('Failed to save screenshot', err as Error);
      return '';
    }
  }, []);

  const getWindows = useCallback(async () => {
    if (!isTauri()) return [];

    try {
      return await invoke<WindowInfo[]>('screenshot_get_windows');
    } catch (err) {
      log.error('Failed to get windows', err as Error);
      return [];
    }
  }, []);

  const getWindowsWithThumbnails = useCallback(async (thumbnailSize?: number) => {
    if (!isTauri()) return [];

    try {
      return await invoke<WindowInfo[]>('screenshot_get_windows_with_thumbnails', {
        thumbnailSize,
      });
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
      const result = await invoke<ScreenshotResult>(
        'screenshot_capture_window_by_hwnd_with_history',
        { hwnd }
      );
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
        return await invoke<SnapResult>('screenshot_calculate_snap', {
          windowHwnd,
          proposedX,
          proposedY,
          windowWidth,
          windowHeight,
        });
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
      return await invoke<SnapConfig>('screenshot_get_snap_config');
    } catch (err) {
      log.error('Failed to get snap config', err as Error);
      return null;
    }
  }, []);

  const setSnapConfig = useCallback(async (config: SnapConfig) => {
    if (!isTauri()) return false;
    try {
      await invoke('screenshot_set_snap_config', { config });
      return true;
    } catch (err) {
      log.error('Failed to set snap config', err as Error);
      return false;
    }
  }, []);

  const setOcrLanguage = useCallback(async (language: string) => {
    if (!isTauri()) return false;
    try {
      await invoke('screenshot_set_ocr_language', { language });
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
      const result = await invoke<ScreenshotHistoryEntry[]>('screenshot_get_history', { count });
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
      return await invoke<ScreenshotHistoryEntry[]>('screenshot_get_all_history');
    } catch (err) {
      log.error('Failed to fetch all history', err as Error);
      return [];
    }
  }, []);

  const fetchPinnedHistory = useCallback(async () => {
    if (!isTauri()) return [] as ScreenshotHistoryEntry[];
    try {
      return await invoke<ScreenshotHistoryEntry[]>('screenshot_get_pinned_history');
    } catch (err) {
      log.error('Failed to fetch pinned history', err as Error);
      return [];
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];

    try {
      return await invoke<ScreenshotHistoryEntry[]>('screenshot_search_history', { query });
    } catch (err) {
      log.error('Failed to search screenshot history', err as Error);
      return [];
    }
  }, []);

  const getById = useCallback(async (id: string) => {
    if (!isTauri()) return null;

    try {
      return await invoke<ScreenshotHistoryEntry | null>('screenshot_get_by_id', { id });
    } catch (err) {
      log.error('Failed to get screenshot', err as Error);
      return null;
    }
  }, []);

  const pinScreenshot = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await invoke<boolean>('screenshot_pin', { id });
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
      return await invoke<ScreenshotHistoryEntry[]>('screenshot_search_history_by_label', {
        label,
      });
    } catch (err) {
      log.error('Failed to search history by label', err as Error);
      return [];
    }
  }, []);

  const unpinScreenshot = useCallback(
    async (id: string) => {
      if (!isTauri()) return false;

      try {
        const result = await invoke<boolean>('screenshot_unpin', { id });
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
        const result = await invoke<boolean>('screenshot_delete', { id });
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
      await invoke('screenshot_clear_history');
      setHistory([]);
    } catch (err) {
      log.error('Failed to clear history', err as Error);
    }
  }, []);

  const clearAllHistory = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await invoke('screenshot_clear_all_history');
      setHistory([]);
    } catch (err) {
      log.error('Failed to clear all history', err as Error);
    }
  }, []);

  const getHistoryStats = useCallback(async () => {
    if (!isTauri()) return null;
    try {
      return await invoke<[number, boolean]>('screenshot_get_history_stats');
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
