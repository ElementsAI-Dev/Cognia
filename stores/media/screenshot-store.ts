/**
 * Screenshot Store
 *
 * Zustand store for managing screenshot state and history with persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/lib/native/utils';

// ============== Types ==============

export interface ScreenshotConfig {
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  includeCursor: boolean;
  copyToClipboard: boolean;
  showNotification: boolean;
  autoSave: boolean;
  saveDirectory?: string;
}

export interface ScreenshotHistoryEntry {
  id: string;
  timestamp: number;
  thumbnailBase64?: string;
  filePath?: string;
  width: number;
  height: number;
  mode: 'fullscreen' | 'window' | 'region';
  windowTitle?: string;
  ocrText?: string;
  label?: string;
  tags: string[];
  isPinned: boolean;
}

export interface ScreenshotMetadata {
  width: number;
  height: number;
  mode: string;
  timestamp: number;
  windowTitle?: string;
  monitorIndex?: number;
}

export interface ScreenshotResult {
  imageBase64: string;
  metadata: ScreenshotMetadata;
}

export interface MonitorInfo {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isPrimary: boolean;
  scaleFactor: number;
}

// ============== State ==============

interface ScreenshotState {
  // Current capture state
  isCapturing: boolean;
  lastScreenshot: ScreenshotResult | null;

  // History
  history: ScreenshotHistoryEntry[];
  pinnedCount: number;

  // Configuration
  config: ScreenshotConfig;

  // System info
  monitors: MonitorInfo[];
  selectedMonitor: number | null;
  ocrAvailable: boolean;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface ScreenshotActions {
  // Initialization
  initialize: () => Promise<void>;

  // Capture
  captureFullscreen: (monitorIndex?: number) => Promise<ScreenshotResult | null>;
  captureWindow: () => Promise<ScreenshotResult | null>;
  captureRegion: (
    x: number,
    y: number,
    width: number,
    height: number
  ) => Promise<ScreenshotResult | null>;
  captureWindowByHwnd: (hwnd: number) => Promise<ScreenshotResult | null>;

  // History management
  refreshHistory: (count?: number) => Promise<void>;
  searchHistory: (query: string) => Promise<ScreenshotHistoryEntry[]>;
  pinScreenshot: (id: string) => Promise<void>;
  unpinScreenshot: (id: string) => Promise<void>;
  deleteScreenshot: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  setLabel: (id: string, label: string) => Promise<void>;

  // OCR
  extractText: (imageBase64: string) => Promise<string>;

  // Configuration
  updateConfig: (config: Partial<ScreenshotConfig>) => Promise<void>;
  resetConfig: () => void;

  // System
  refreshMonitors: () => Promise<void>;
  setSelectedMonitor: (index: number | null) => void;

  // Utilities
  clearError: () => void;
  clearLastScreenshot: () => void;
}

type ScreenshotStore = ScreenshotState & ScreenshotActions;

// ============== Default Values ==============

const defaultConfig: ScreenshotConfig = {
  format: 'png',
  quality: 95,
  includeCursor: false,
  copyToClipboard: true,
  showNotification: true,
  autoSave: false,
};

const initialState: ScreenshotState = {
  isCapturing: false,
  lastScreenshot: null,
  history: [],
  pinnedCount: 0,
  config: defaultConfig,
  monitors: [],
  selectedMonitor: null,
  ocrAvailable: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// ============== Helper Functions ==============

function transformHistoryEntry(entry: {
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
}): ScreenshotHistoryEntry {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    thumbnailBase64: entry.thumbnail_base64,
    filePath: entry.file_path,
    width: entry.width,
    height: entry.height,
    mode: entry.mode as 'fullscreen' | 'window' | 'region',
    windowTitle: entry.window_title,
    ocrText: entry.ocr_text,
    label: entry.label,
    tags: entry.tags,
    isPinned: entry.is_pinned,
  };
}

function transformMonitorInfo(monitor: {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_primary: boolean;
  scale_factor: number;
}): MonitorInfo {
  return {
    index: monitor.index,
    name: monitor.name,
    x: monitor.x,
    y: monitor.y,
    width: monitor.width,
    height: monitor.height,
    isPrimary: monitor.is_primary,
    scaleFactor: monitor.scale_factor,
  };
}

function transformScreenshotResult(result: {
  image_base64: string;
  metadata: {
    width: number;
    height: number;
    mode: string;
    timestamp: number;
    window_title?: string;
    monitor_index?: number;
  };
}): ScreenshotResult {
  return {
    imageBase64: result.image_base64,
    metadata: {
      width: result.metadata.width,
      height: result.metadata.height,
      mode: result.metadata.mode,
      timestamp: result.metadata.timestamp,
      windowTitle: result.metadata.window_title,
      monitorIndex: result.metadata.monitor_index,
    },
  };
}

// ============== Store ==============

export const useScreenshotStore = create<ScreenshotStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initialize: async () => {
        if (!isTauri()) {
          set({ isInitialized: true });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const [monitors, ocrAvailable] = await Promise.all([
            invoke<
              Array<{
                index: number;
                name: string;
                x: number;
                y: number;
                width: number;
                height: number;
                is_primary: boolean;
                scale_factor: number;
              }>
            >('screenshot_get_monitors'),
            invoke<boolean>('screenshot_ocr_is_available').catch(() => false),
          ]);

          const transformedMonitors = monitors.map(transformMonitorInfo);
          const primaryMonitor = transformedMonitors.find((m) => m.isPrimary);

          set({
            monitors: transformedMonitors,
            selectedMonitor: primaryMonitor?.index ?? 0,
            ocrAvailable,
            isInitialized: true,
            isLoading: false,
          });

          // Load initial history
          await get().refreshHistory(50);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize',
            isInitialized: true,
            isLoading: false,
          });
        }
      },

      captureFullscreen: async (monitorIndex) => {
        if (!isTauri()) return null;

        set({ isCapturing: true, error: null });
        try {
          const result = await invoke<{
            image_base64: string;
            metadata: {
              width: number;
              height: number;
              mode: string;
              timestamp: number;
              window_title?: string;
              monitor_index?: number;
            };
          }>('screenshot_capture_fullscreen_with_history', { monitorIndex });

          const transformed = transformScreenshotResult(result);
          set({ lastScreenshot: transformed, isCapturing: false });

          // Refresh history to include the new screenshot
          await get().refreshHistory(50);

          return transformed;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Capture failed',
            isCapturing: false,
          });
          return null;
        }
      },

      captureWindow: async () => {
        if (!isTauri()) return null;

        set({ isCapturing: true, error: null });
        try {
          const result = await invoke<{
            image_base64: string;
            metadata: {
              width: number;
              height: number;
              mode: string;
              timestamp: number;
              window_title?: string;
              monitor_index?: number;
            };
          }>('screenshot_capture_window_with_history');

          const transformed = transformScreenshotResult(result);
          set({ lastScreenshot: transformed, isCapturing: false });

          await get().refreshHistory(50);

          return transformed;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Capture failed',
            isCapturing: false,
          });
          return null;
        }
      },

      captureRegion: async (x, y, width, height) => {
        if (!isTauri()) return null;

        set({ isCapturing: true, error: null });
        try {
          const result = await invoke<{
            image_base64: string;
            metadata: {
              width: number;
              height: number;
              mode: string;
              timestamp: number;
              window_title?: string;
              monitor_index?: number;
            };
          }>('screenshot_capture_region_with_history', { x, y, width, height });

          const transformed = transformScreenshotResult(result);
          set({ lastScreenshot: transformed, isCapturing: false });

          await get().refreshHistory(50);

          return transformed;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Capture failed',
            isCapturing: false,
          });
          return null;
        }
      },

      captureWindowByHwnd: async (hwnd) => {
        if (!isTauri()) return null;

        set({ isCapturing: true, error: null });
        try {
          const result = await invoke<{
            image_base64: string;
            metadata: {
              width: number;
              height: number;
              mode: string;
              timestamp: number;
              window_title?: string;
              monitor_index?: number;
            };
          }>('screenshot_capture_window_by_hwnd_with_history', { hwnd });

          const transformed = transformScreenshotResult(result);
          set({ lastScreenshot: transformed, isCapturing: false });

          await get().refreshHistory(50);

          return transformed;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Capture failed',
            isCapturing: false,
          });
          return null;
        }
      },

      refreshHistory: async (count = 50) => {
        if (!isTauri()) return;

        try {
          const history = await invoke<
            Array<{
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
            }>
          >('screenshot_get_history', { count });

          const transformedHistory = history.map(transformHistoryEntry);
          const pinnedCount = transformedHistory.filter((e) => e.isPinned).length;

          set({ history: transformedHistory, pinnedCount });
        } catch (error) {
          console.error('Failed to refresh history:', error);
        }
      },

      searchHistory: async (query) => {
        if (!isTauri()) return [];

        try {
          const results = await invoke<
            Array<{
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
            }>
          >('screenshot_search_history', { query });

          return results.map(transformHistoryEntry);
        } catch (error) {
          console.error('Failed to search history:', error);
          return [];
        }
      },

      pinScreenshot: async (id) => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_pin', { id });
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to pin' });
        }
      },

      unpinScreenshot: async (id) => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_unpin', { id });
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to unpin' });
        }
      },

      deleteScreenshot: async (id) => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_delete', { id });
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete' });
        }
      },

      clearHistory: async () => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_clear_history');
          set({ history: [], pinnedCount: 0 });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to clear history' });
        }
      },

      addTag: async (id, tag) => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_add_tag', { id, tag });
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to add tag' });
        }
      },

      removeTag: async (id, tag) => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_remove_tag', { id, tag });
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to remove tag' });
        }
      },

      setLabel: async (id, label) => {
        if (!isTauri()) return;

        try {
          await invoke('screenshot_set_label', { id, label });
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to set label' });
        }
      },

      extractText: async (imageBase64) => {
        if (!isTauri()) return '';

        try {
          return await invoke<string>('screenshot_ocr', { imageBase64 });
        } catch (error) {
          console.error('OCR failed:', error);
          return '';
        }
      },

      updateConfig: async (partialConfig) => {
        const newConfig = { ...get().config, ...partialConfig };
        set({ config: newConfig });

        if (isTauri()) {
          try {
            await invoke('screenshot_update_config', {
              config: {
                format: newConfig.format,
                quality: newConfig.quality,
                include_cursor: newConfig.includeCursor,
                copy_to_clipboard: newConfig.copyToClipboard,
                show_notification: newConfig.showNotification,
                auto_save: newConfig.autoSave,
                save_directory: newConfig.saveDirectory,
              },
            });
          } catch (error) {
            console.error('Failed to update config:', error);
          }
        }
      },

      resetConfig: () => {
        set({ config: defaultConfig });
      },

      refreshMonitors: async () => {
        if (!isTauri()) return;

        try {
          const monitors = await invoke<
            Array<{
              index: number;
              name: string;
              x: number;
              y: number;
              width: number;
              height: number;
              is_primary: boolean;
              scale_factor: number;
            }>
          >('screenshot_get_monitors');

          set({ monitors: monitors.map(transformMonitorInfo) });
        } catch (error) {
          console.error('Failed to refresh monitors:', error);
        }
      },

      setSelectedMonitor: (index) => set({ selectedMonitor: index }),
      clearError: () => set({ error: null }),
      clearLastScreenshot: () => set({ lastScreenshot: null }),
    }),
    {
      name: 'screenshot-store',
      partialize: (state) => ({
        config: state.config,
        selectedMonitor: state.selectedMonitor,
      }),
    }
  )
);

// ============== Selectors ==============

export const selectHistory = (state: ScreenshotStore) => state.history;
export const selectPinnedScreenshots = (state: ScreenshotStore) =>
  state.history.filter((e) => e.isPinned);
export const selectRecentScreenshots = (state: ScreenshotStore, count = 10) =>
  state.history.slice(0, count);
export const selectScreenshotById = (id: string) => (state: ScreenshotStore) =>
  state.history.find((e) => e.id === id);
