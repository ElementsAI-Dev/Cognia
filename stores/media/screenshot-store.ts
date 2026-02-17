/**
 * Screenshot Store
 *
 * Zustand store for managing screenshot state and history with persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isTauri } from '@/lib/native/utils';
import { loggers } from '@/lib/logger';
import * as screenshotApi from '@/lib/native/screenshot';
import {
  generateScreenshotFilename,
  getScreenshotPath,
} from '@/lib/native/screen-recording';
import type {
  ScreenshotResult as NativeScreenshotResult,
  ScreenshotHistoryEntry as NativeHistoryEntry,
  MonitorInfo as NativeMonitorInfo,
  SnapConfig as NativeSnapConfig,
  WindowInfo as NativeWindowInfo,
  WinOcrResult as NativeWinOcrResult,
  DetailedOcrResult as NativeDetailedOcrResult,
} from '@/lib/native/screenshot';

const log = loggers.store;

// ============== Types ==============

export interface ScreenshotConfig {
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  includeCursor: boolean;
  delayMs: number;
  copyToClipboard: boolean;
  showNotification: boolean;
  ocrLanguage: string;
  autoSave: boolean;
  filenameTemplate: string;
  saveDirectory?: string;
  openEditorAfterCapture: boolean;
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
  filePath?: string;
}

export interface ScreenshotResult {
  imageBase64: string;
  metadata: ScreenshotMetadata;
}

export interface ExternalCapturePayload {
  image_base64?: string;
  imageBase64?: string;
  metadata?: Record<string, unknown>;
  source?: string;
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
  ocrLanguages: string[];
  currentOcrLanguage: string;

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
  extractTextWindows: (imageBase64: string) => Promise<NativeWinOcrResult | null>;
  extractTextWithLanguage: (imageBase64: string, language?: string) => Promise<NativeWinOcrResult | null>;
  getOcrLanguages: () => Promise<string[]>;
  setOcrLanguage: (language: string) => Promise<void>;

  // Configuration
  updateConfig: (config: Partial<ScreenshotConfig>) => Promise<void>;
  resetConfig: () => void;
  ingestExternalCapture: (payload: ExternalCapturePayload) => Promise<void>;

  // Snap
  getSnapConfig: () => Promise<NativeSnapConfig | null>;
  setSnapConfig: (config: NativeSnapConfig) => Promise<void>;

  // Window detection
  getWindows: () => Promise<NativeWindowInfo[]>;
  getWindowsWithThumbnails: (thumbnailSize?: number) => Promise<NativeWindowInfo[]>;

  // File operations
  saveToFile: (imageBase64: string, path: string) => Promise<string>;
  openScreenshotFolder: (filePath: string) => Promise<void>;
  generateFilename: (mode: string, format: string, customName?: string) => Promise<string | null>;
  getFilePath: (filename: string) => Promise<string | null>;

  // System
  refreshMonitors: () => Promise<void>;
  setSelectedMonitor: (index: number | null) => void;

  // Advanced history
  getScreenshotById: (id: string) => Promise<ScreenshotHistoryEntry | null>;
  searchHistoryByLabel: (label: string) => Promise<ScreenshotHistoryEntry[]>;
  getAllHistory: () => Promise<ScreenshotHistoryEntry[]>;
  getPinnedHistory: () => Promise<ScreenshotHistoryEntry[]>;
  getHistoryStats: () => Promise<{ count: number; isEmpty: boolean } | null>;
  batchDeleteScreenshots: (ids: string[]) => Promise<void>;

  // Advanced OCR
  extractTextDetailed: (imageBase64: string) => Promise<NativeDetailedOcrResult | null>;

  // Color picker
  getPixelColor: (x: number, y: number) => Promise<string | null>;

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
  delayMs: 0,
  copyToClipboard: true,
  showNotification: true,
  ocrLanguage: 'eng',
  autoSave: false,
  filenameTemplate: 'screenshot_{timestamp}',
  openEditorAfterCapture: false,
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
  ocrLanguages: [],
  currentOcrLanguage: 'eng',
  isLoading: false,
  isInitialized: false,
  error: null,
};

// ============== Helper Functions ==============

function transformHistoryEntry(entry: NativeHistoryEntry): ScreenshotHistoryEntry {
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

function transformMonitorInfo(monitor: NativeMonitorInfo): MonitorInfo {
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

function transformScreenshotResult(result: NativeScreenshotResult): ScreenshotResult {
  return {
    imageBase64: result.image_base64,
    metadata: {
      width: result.metadata.width,
      height: result.metadata.height,
      mode: result.metadata.mode,
      timestamp: result.metadata.timestamp,
      windowTitle: result.metadata.window_title,
      monitorIndex: result.metadata.monitor_index,
      filePath: result.metadata.file_path,
    },
  };
}

function mergeConfig(config?: Partial<ScreenshotConfig>): ScreenshotConfig {
  return { ...defaultConfig, ...config };
}

function fromNativeConfig(
  nativeConfig: screenshotApi.ScreenshotConfig,
  openEditorAfterCapture: boolean
): ScreenshotConfig {
  const format: ScreenshotConfig['format'] =
    nativeConfig.format === 'jpg' || nativeConfig.format === 'jpeg'
      ? 'jpg'
      : nativeConfig.format === 'webp'
        ? 'webp'
        : 'png';
  return mergeConfig({
    format,
    quality: nativeConfig.quality,
    includeCursor: nativeConfig.include_cursor,
    delayMs: nativeConfig.delay_ms ?? 0,
    copyToClipboard: nativeConfig.copy_to_clipboard,
    showNotification: nativeConfig.show_notification,
    ocrLanguage: nativeConfig.ocr_language ?? 'eng',
    autoSave: nativeConfig.auto_save,
    filenameTemplate: nativeConfig.filename_template || defaultConfig.filenameTemplate,
    saveDirectory: nativeConfig.save_directory || undefined,
    openEditorAfterCapture,
  });
}

function toNativeConfig(config: ScreenshotConfig): screenshotApi.ScreenshotConfig {
  return {
    save_directory: config.saveDirectory,
    format: config.format,
    quality: config.quality,
    include_cursor: config.includeCursor,
    delay_ms: config.delayMs,
    copy_to_clipboard: config.copyToClipboard,
    show_notification: config.showNotification,
    ocr_language: config.ocrLanguage,
    auto_save: config.autoSave,
    filename_template: config.filenameTemplate,
  };
}

function toScreenshotMetadata(raw: Record<string, unknown>): ScreenshotMetadata {
  const monitorIndexRaw = raw.monitor_index ?? raw.monitorIndex;
  return {
    width: Number(raw.width ?? 0),
    height: Number(raw.height ?? 0),
    mode: String(raw.mode ?? 'unknown'),
    timestamp: Number(raw.timestamp ?? Date.now()),
    windowTitle: (raw.window_title ?? raw.windowTitle) as string | undefined,
    monitorIndex:
      monitorIndexRaw === undefined || monitorIndexRaw === null
        ? undefined
        : Number(monitorIndexRaw),
    filePath: (raw.file_path ?? raw.filePath) as string | undefined,
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
          const currentConfig = mergeConfig(get().config);
          const [monitors, ocrAvailable, nativeConfig] = await Promise.all([
            screenshotApi.getMonitors(),
            screenshotApi.isOcrAvailable().catch(() => false),
            screenshotApi.getConfig().catch(() => null),
          ]);

          const transformedMonitors = monitors.map(transformMonitorInfo);
          const primaryMonitor = transformedMonitors.find((m) => m.isPrimary);
          const syncedConfig = nativeConfig
            ? fromNativeConfig(nativeConfig, currentConfig.openEditorAfterCapture)
            : currentConfig;

          set({
            monitors: transformedMonitors,
            selectedMonitor: primaryMonitor?.index ?? 0,
            ocrAvailable,
            currentOcrLanguage: syncedConfig.ocrLanguage,
            config: syncedConfig,
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
          const result = await screenshotApi.captureFullscreenWithHistory(monitorIndex);

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
          const result = await screenshotApi.captureWindowWithHistory();

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
          const result = await screenshotApi.captureRegionWithHistory(x, y, width, height);

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
          const result = await screenshotApi.captureWindowByHwndWithHistory(hwnd);

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
          const history = await screenshotApi.getHistory(count);

          const transformedHistory = history.map(transformHistoryEntry);
          const pinnedCount = transformedHistory.filter((e) => e.isPinned).length;

          set({ history: transformedHistory, pinnedCount });
        } catch (error) {
          log.error('Failed to refresh history', error as Error);
        }
      },

      searchHistory: async (query) => {
        if (!isTauri()) return [];

        try {
          const results = await screenshotApi.searchHistory(query);

          return results.map(transformHistoryEntry);
        } catch (error) {
          log.error('Failed to search history', error as Error);
          return [];
        }
      },

      pinScreenshot: async (id) => {
        if (!isTauri()) return;

        const prev = get().history;
        // Optimistic update
        set({
          history: prev.map((e) => (e.id === id ? { ...e, isPinned: true } : e)),
          pinnedCount: prev.filter((e) => e.isPinned).length + 1,
        });
        try {
          await screenshotApi.pinScreenshot(id);
        } catch (error) {
          set({ history: prev, pinnedCount: prev.filter((e) => e.isPinned).length, error: error instanceof Error ? error.message : 'Failed to pin' });
        }
      },

      unpinScreenshot: async (id) => {
        if (!isTauri()) return;

        const prev = get().history;
        set({
          history: prev.map((e) => (e.id === id ? { ...e, isPinned: false } : e)),
          pinnedCount: Math.max(0, prev.filter((e) => e.isPinned).length - 1),
        });
        try {
          await screenshotApi.unpinScreenshot(id);
        } catch (error) {
          set({ history: prev, pinnedCount: prev.filter((e) => e.isPinned).length, error: error instanceof Error ? error.message : 'Failed to unpin' });
        }
      },

      deleteScreenshot: async (id) => {
        if (!isTauri()) return;

        const prev = get().history;
        const filtered = prev.filter((e) => e.id !== id);
        set({
          history: filtered,
          pinnedCount: filtered.filter((e) => e.isPinned).length,
        });
        try {
          await screenshotApi.deleteScreenshot(id);
        } catch (error) {
          set({ history: prev, pinnedCount: prev.filter((e) => e.isPinned).length, error: error instanceof Error ? error.message : 'Failed to delete' });
        }
      },

      clearHistory: async () => {
        if (!isTauri()) return;

        try {
          await screenshotApi.clearHistory();
          set({ history: [], pinnedCount: 0 });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to clear history' });
        }
      },

      addTag: async (id, tag) => {
        if (!isTauri()) return;

        const prev = get().history;
        set({ history: prev.map((e) => (e.id === id ? { ...e, tags: [...e.tags, tag] } : e)) });
        try {
          await screenshotApi.addTag(id, tag);
        } catch (error) {
          set({ history: prev, error: error instanceof Error ? error.message : 'Failed to add tag' });
        }
      },

      removeTag: async (id, tag) => {
        if (!isTauri()) return;

        const prev = get().history;
        set({ history: prev.map((e) => (e.id === id ? { ...e, tags: e.tags.filter((t) => t !== tag) } : e)) });
        try {
          await screenshotApi.removeTag(id, tag);
        } catch (error) {
          set({ history: prev, error: error instanceof Error ? error.message : 'Failed to remove tag' });
        }
      },

      setLabel: async (id, label) => {
        if (!isTauri()) return;

        const prev = get().history;
        set({ history: prev.map((e) => (e.id === id ? { ...e, label } : e)) });
        try {
          await screenshotApi.setLabel(id, label);
        } catch (error) {
          set({ history: prev, error: error instanceof Error ? error.message : 'Failed to set label' });
        }
      },

      extractText: async (imageBase64) => {
        if (!isTauri()) return '';

        try {
          return await screenshotApi.extractText(imageBase64);
        } catch (error) {
          log.error('OCR failed', error as Error);
          return '';
        }
      },

      updateConfig: async (partialConfig) => {
        const newConfig = mergeConfig({ ...get().config, ...partialConfig });
        set({ config: newConfig });

        if (isTauri()) {
          try {
            await screenshotApi.updateConfig(toNativeConfig(newConfig));
            set({ currentOcrLanguage: newConfig.ocrLanguage });
          } catch (error) {
            log.error('Failed to update config', error as Error);
          }
        }
      },

      resetConfig: () => {
        set({ config: defaultConfig });
      },

      ingestExternalCapture: async (payload) => {
        const imageBase64 = payload?.image_base64 ?? payload?.imageBase64;
        if (!imageBase64 || !payload?.metadata) {
          return;
        }

        const metadata = toScreenshotMetadata(payload.metadata);
        set({
          lastScreenshot: {
            imageBase64,
            metadata,
          },
          error: null,
        });

        if (isTauri()) {
          await get().refreshHistory(50);
        }
      },

      refreshMonitors: async () => {
        if (!isTauri()) return;

        try {
          const monitors = await screenshotApi.getMonitors();

          set({ monitors: monitors.map(transformMonitorInfo) });
        } catch (error) {
          log.error('Failed to refresh monitors', error as Error);
        }
      },

      extractTextWindows: async (imageBase64) => {
        if (!isTauri()) return null;
        try {
          return await screenshotApi.extractTextWindows(imageBase64);
        } catch (error) {
          log.error('Windows OCR failed', error as Error);
          return null;
        }
      },

      extractTextWithLanguage: async (imageBase64, language) => {
        if (!isTauri()) return null;
        try {
          return await screenshotApi.extractTextWithLanguage(imageBase64, language);
        } catch (error) {
          log.error('OCR with language failed', error as Error);
          return null;
        }
      },

      getOcrLanguages: async () => {
        if (!isTauri()) return [];
        try {
          const languages = await screenshotApi.getOcrLanguages();
          set({ ocrLanguages: languages });
          return languages;
        } catch (error) {
          log.error('Failed to get OCR languages', error as Error);
          return [];
        }
      },

      setOcrLanguage: async (language) => {
        if (!isTauri()) return;
        try {
          await screenshotApi.setOcrLanguage(language);
          set({ currentOcrLanguage: language });
        } catch (error) {
          log.error('Failed to set OCR language', error as Error);
        }
      },

      getSnapConfig: async () => {
        if (!isTauri()) return null;
        try {
          return await screenshotApi.getSnapConfig();
        } catch (error) {
          log.error('Failed to get snap config', error as Error);
          return null;
        }
      },

      setSnapConfig: async (config) => {
        if (!isTauri()) return;
        try {
          await screenshotApi.setSnapConfig(config);
        } catch (error) {
          log.error('Failed to set snap config', error as Error);
        }
      },

      getWindows: async () => {
        if (!isTauri()) return [];
        try {
          return await screenshotApi.getWindows();
        } catch (error) {
          log.error('Failed to get windows', error as Error);
          return [];
        }
      },

      getWindowsWithThumbnails: async (thumbnailSize) => {
        if (!isTauri()) return [];
        try {
          return await screenshotApi.getWindowsWithThumbnails(thumbnailSize);
        } catch (error) {
          log.error('Failed to get windows with thumbnails', error as Error);
          return [];
        }
      },

      saveToFile: async (imageBase64, path) => {
        if (!isTauri()) return '';
        try {
          return await screenshotApi.saveToFile(imageBase64, path);
        } catch (error) {
          log.error('Failed to save screenshot', error as Error);
          return '';
        }
      },

      openScreenshotFolder: async (filePath) => {
        if (!isTauri()) return;
        try {
          const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
          await revealItemInDir(filePath);
        } catch (error) {
          log.error('Failed to open folder', error as Error);
          set({ error: error instanceof Error ? error.message : 'Failed to open folder' });
        }
      },

      generateFilename: async (mode, format, customName) => {
        if (!isTauri()) return null;
        try {
          return await generateScreenshotFilename(mode, format, customName);
        } catch (error) {
          log.warn('Failed to generate screenshot filename', { error: String(error) });
          return null;
        }
      },

      getFilePath: async (filename) => {
        if (!isTauri()) return null;
        try {
          return await getScreenshotPath(filename);
        } catch (error) {
          log.warn('Failed to get screenshot path', { error: String(error) });
          return null;
        }
      },

      getScreenshotById: async (id) => {
        if (!isTauri()) return null;
        try {
          const entry = await screenshotApi.getScreenshotById(id);
          return entry ? transformHistoryEntry(entry) : null;
        } catch (error) {
          log.error('Failed to get screenshot by id', error as Error);
          return null;
        }
      },

      searchHistoryByLabel: async (label) => {
        if (!isTauri()) return [];
        try {
          const results = await screenshotApi.searchHistoryByLabel(label);
          return results.map(transformHistoryEntry);
        } catch (error) {
          log.error('Failed to search by label', error as Error);
          return [];
        }
      },

      getAllHistory: async () => {
        if (!isTauri()) return [];
        try {
          const history = await screenshotApi.getAllHistory();
          return history.map(transformHistoryEntry);
        } catch (error) {
          log.error('Failed to get all history', error as Error);
          return [];
        }
      },

      getPinnedHistory: async () => {
        if (!isTauri()) return [];
        try {
          const history = await screenshotApi.getPinnedHistory();
          return history.map(transformHistoryEntry);
        } catch (error) {
          log.error('Failed to get pinned history', error as Error);
          return [];
        }
      },

      getHistoryStats: async () => {
        if (!isTauri()) return null;
        try {
          const [count, isEmpty] = await screenshotApi.getHistoryStats();
          return { count, isEmpty };
        } catch (error) {
          log.error('Failed to get history stats', error as Error);
          return null;
        }
      },

      batchDeleteScreenshots: async (ids) => {
        if (!isTauri()) return;
        try {
          await Promise.all(ids.map((id) => screenshotApi.deleteScreenshot(id)));
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to batch delete' });
        }
      },

      extractTextDetailed: async (imageBase64) => {
        if (!isTauri()) return null;
        try {
          return await screenshotApi.extractTextDetailed(imageBase64);
        } catch (error) {
          log.error('Detailed OCR failed', error as Error);
          return null;
        }
      },

      getPixelColor: async (x, y) => {
        if (!isTauri()) return null;
        try {
          return await screenshotApi.getPixelColor(x, y);
        } catch (error) {
          log.error('Failed to get pixel color', error as Error);
          return null;
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
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<ScreenshotStore>) || {};
        return {
          ...currentState,
          ...persisted,
          config: mergeConfig(persisted.config as Partial<ScreenshotConfig> | undefined),
        };
      },
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
