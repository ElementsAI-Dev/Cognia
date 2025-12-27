/**
 * Screenshot Hook
 *
 * Provides access to screenshot capture and history functionality.
 */

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';

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

export function useScreenshot() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<ScreenshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureFullscreen = useCallback(async (monitorIndex?: number) => {
    if (!isTauri()) return null;
    
    setIsCapturing(true);
    setError(null);
    try {
      const result = await invoke<ScreenshotResult>('screenshot_capture_fullscreen_with_history', { monitorIndex });
      setLastScreenshot(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

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
      const result = await invoke<ScreenshotResult>('screenshot_capture_region_with_history', { x, y, width, height });
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
      const region = await invoke<{ x: number; y: number; width: number; height: number }>('screenshot_start_region_selection');
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
      console.error('OCR failed:', err);
      return '';
    }
  }, []);

  const extractTextWindows = useCallback(async (imageBase64: string) => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<WinOcrResult>('screenshot_ocr_windows', { imageBase64 });
    } catch (err) {
      console.error('Windows OCR failed:', err);
      return null;
    }
  }, []);

  const getMonitors = useCallback(async () => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<MonitorInfo[]>('screenshot_get_monitors');
    } catch (err) {
      console.error('Failed to get monitors:', err);
      return [];
    }
  }, []);

  const saveToFile = useCallback(async (imageBase64: string, path: string) => {
    if (!isTauri()) return '';
    
    try {
      return await invoke<string>('screenshot_save', { imageBase64, path });
    } catch (err) {
      console.error('Failed to save screenshot:', err);
      return '';
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
  };
}

export function useScreenshotHistory() {
  const [history, setHistory] = useState<ScreenshotHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = useCallback(async (count?: number) => {
    if (!isTauri()) return;
    
    setIsLoading(true);
    try {
      const result = await invoke<ScreenshotHistoryEntry[]>('screenshot_get_history', { count });
      setHistory(result);
    } catch (err) {
      console.error('Failed to fetch screenshot history:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchHistory = useCallback(async (query: string) => {
    if (!isTauri()) return [];
    
    try {
      return await invoke<ScreenshotHistoryEntry[]>('screenshot_search_history', { query });
    } catch (err) {
      console.error('Failed to search screenshot history:', err);
      return [];
    }
  }, []);

  const getById = useCallback(async (id: string) => {
    if (!isTauri()) return null;
    
    try {
      return await invoke<ScreenshotHistoryEntry | null>('screenshot_get_by_id', { id });
    } catch (err) {
      console.error('Failed to get screenshot:', err);
      return null;
    }
  }, []);

  const pinScreenshot = useCallback(async (id: string) => {
    if (!isTauri()) return false;
    
    try {
      const result = await invoke<boolean>('screenshot_pin', { id });
      if (result) await fetchHistory();
      return result;
    } catch (err) {
      console.error('Failed to pin screenshot:', err);
      return false;
    }
  }, [fetchHistory]);

  const unpinScreenshot = useCallback(async (id: string) => {
    if (!isTauri()) return false;
    
    try {
      const result = await invoke<boolean>('screenshot_unpin', { id });
      if (result) await fetchHistory();
      return result;
    } catch (err) {
      console.error('Failed to unpin screenshot:', err);
      return false;
    }
  }, [fetchHistory]);

  const deleteScreenshot = useCallback(async (id: string) => {
    if (!isTauri()) return false;
    
    try {
      const result = await invoke<boolean>('screenshot_delete', { id });
      if (result) await fetchHistory();
      return result;
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
      return false;
    }
  }, [fetchHistory]);

  const clearHistory = useCallback(async () => {
    if (!isTauri()) return;
    
    try {
      await invoke('screenshot_clear_history');
      setHistory([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, []);

  return {
    history,
    isLoading,
    fetchHistory,
    searchHistory,
    getById,
    pinScreenshot,
    unpinScreenshot,
    deleteScreenshot,
    clearHistory,
  };
}
