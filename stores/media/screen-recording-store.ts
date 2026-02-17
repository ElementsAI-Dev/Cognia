/**
 * Screen Recording Store
 *
 * Zustand store for managing screen recording state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { loggers } from '@/lib/logger';

const log = loggers.store;
import type {
  RecordingStatus,
  RecordingConfig,
  RecordingMetadata,
  RecordingHistoryEntry,
  MonitorInfo,
  AudioDevices,
  RecordingRegion,
  StorageStats,
  StorageConfig,
  CleanupResult,
  FFmpegInfo,
  HardwareAcceleration,
  FFmpegInstallGuide,
} from '@/lib/native/screen-recording';
import {
  getRecordingStatus,
  getRecordingDuration,
  startFullscreenRecording,
  startWindowRecording,
  startRegionRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  cancelRecording,
  getRecordingConfig,
  updateRecordingConfig,
  getRecordingMonitors,
  checkFFmpeg,
  getAudioDevices,
  getRecordingHistory,
  deleteRecording,
  clearRecordingHistory,
  getDefaultRecordingConfig,
  pinRecording,
  unpinRecording,
  getRecordingById,
  searchRecordingsByTag,
  addRecordingTag,
  removeRecordingTag,
  getRecordingStats,
  getStorageStats,
  getStorageConfig,
  updateStorageConfig,
  isStorageExceeded,
  getStorageUsagePercent,
  cleanupStorage,
  getFFmpegInfo,
  checkHardwareAcceleration,
  checkFFmpegVersion,
  getFFmpegInstallGuide,
  generateRecordingFilename,
  getRecordingPath,
} from '@/lib/native/screen-recording';
import type { RecordingStats } from '@/lib/native/screen-recording';
import { parseRecordingError } from '@/lib/native/recording-errors';
import { isTauri } from '@/lib/native/utils';

export type RecordingMode = 'fullscreen' | 'window' | 'region';

interface ScreenRecordingState {
  // Recording state
  status: RecordingStatus;
  recordingId: string | null;
  duration: number;

  // Configuration
  config: RecordingConfig;

  // System info
  monitors: MonitorInfo[];
  audioDevices: AudioDevices;
  ffmpegAvailable: boolean;
  ffmpegInfo: FFmpegInfo | null;
  ffmpegVersionOk: boolean;
  hardwareAcceleration: HardwareAcceleration | null;
  ffmpegInstallGuide: FFmpegInstallGuide | null;

  // History
  history: RecordingHistoryEntry[];

  // Storage
  storageStats: StorageStats | null;
  storageConfig: StorageConfig | null;
  storageUsagePercent: number;
  isStorageExceeded: boolean;

  // UI state
  showRecordingIndicator: boolean;
  selectedMonitor: number | null;
  selectedMode: RecordingMode;
  regionSelection: RecordingRegion | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Event listener cleanup functions
  _eventListeners: UnlistenFn[];
  _durationTimer: ReturnType<typeof setInterval> | null;
  // Client-side duration tracking
  _recordingStartedAt: number | null;
  _totalPausedMs: number;
  _pauseStartedAt: number | null;
}

interface ScreenRecordingActions {
  // Initialization
  initialize: () => Promise<void>;
  cleanup: () => void;

  // Event listeners
  setupEventListeners: () => Promise<void>;

  // Recording control
  startRecording: (
    mode: RecordingMode,
    options?: {
      monitorIndex?: number;
      windowTitle?: string;
      region?: RecordingRegion;
    }
  ) => Promise<string | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<RecordingMetadata | null>;
  cancel: () => Promise<void>;

  // Status updates
  updateStatus: () => Promise<void>;
  updateDuration: () => Promise<void>;

  // Configuration
  updateConfig: (config: Partial<RecordingConfig>) => Promise<void>;
  resetConfig: () => void;

  // System
  refreshMonitors: () => Promise<void>;
  refreshAudioDevices: () => Promise<void>;
  checkFfmpeg: () => Promise<boolean>;
  refreshFFmpegInfo: () => Promise<void>;
  refreshHardwareAcceleration: () => Promise<void>;
  refreshFFmpegInstallGuide: () => Promise<void>;

  // Filename generation
  generateFilename: (mode: string, format: string, customName?: string) => Promise<string | null>;
  getFilePath: (filename: string) => Promise<string | null>;

  // History
  refreshHistory: () => Promise<void>;
  deleteFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  pinRecording: (id: string) => Promise<boolean>;
  unpinRecording: (id: string) => Promise<boolean>;
  getRecordingById: (id: string) => Promise<RecordingHistoryEntry | null>;
  searchByTag: (tag: string) => Promise<RecordingHistoryEntry[]>;
  addTag: (id: string, tag: string) => Promise<boolean>;
  removeTag: (id: string, tag: string) => Promise<boolean>;
  getStats: () => Promise<RecordingStats | null>;
  openRecordingFolder: (filePath: string) => Promise<void>;

  // Storage
  refreshStorageStats: () => Promise<void>;
  refreshStorageConfig: () => Promise<void>;
  updateStorageConfig: (config: StorageConfig) => Promise<void>;
  runStorageCleanup: () => Promise<CleanupResult | null>;

  // UI
  setSelectedMonitor: (index: number | null) => void;
  setSelectedMode: (mode: RecordingMode) => void;
  setRegionSelection: (region: RecordingRegion | null) => void;
  setShowIndicator: (show: boolean) => void;
  clearError: () => void;
}

type ScreenRecordingStore = ScreenRecordingState & ScreenRecordingActions;

const initialState: ScreenRecordingState = {
  status: 'Idle',
  recordingId: null,
  duration: 0,
  config: getDefaultRecordingConfig(),
  monitors: [],
  audioDevices: { system_audio_available: false, microphones: [] },
  ffmpegAvailable: false,
  ffmpegInfo: null,
  ffmpegVersionOk: false,
  hardwareAcceleration: null,
  ffmpegInstallGuide: null,
  history: [],
  storageStats: null,
  storageConfig: null,
  storageUsagePercent: 0,
  isStorageExceeded: false,
  showRecordingIndicator: true,
  selectedMonitor: null,
  selectedMode: 'fullscreen',
  regionSelection: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  _eventListeners: [],
  _durationTimer: null,
  _recordingStartedAt: null,
  _totalPausedMs: 0,
  _pauseStartedAt: null,
};

export const useScreenRecordingStore = create<ScreenRecordingStore>()(
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
          const [
            status,
            config,
            monitors,
            audioDevices,
            ffmpegAvailable,
            history,
            storageStatsResult,
            storageConfigResult,
            storageUsagePercentResult,
            isStorageExceededResult,
          ] = await Promise.all([
            getRecordingStatus(),
            getRecordingConfig(),
            getRecordingMonitors(),
            getAudioDevices(),
            checkFFmpeg(),
            getRecordingHistory(50),
            getStorageStats().catch(() => null),
            getStorageConfig().catch(() => null),
            getStorageUsagePercent().catch(() => 0),
            isStorageExceeded().catch(() => false),
          ]);

          set({
            status,
            config,
            monitors,
            audioDevices,
            ffmpegAvailable,
            history,
            storageStats: storageStatsResult,
            storageConfig: storageConfigResult,
            storageUsagePercent: storageUsagePercentResult,
            isStorageExceeded: isStorageExceededResult,
            selectedMonitor: monitors.find((m) => m.is_primary)?.index ?? 0,
            isInitialized: true,
            isLoading: false,
          });

          // Fetch FFmpeg details in background when available
          if (ffmpegAvailable) {
            Promise.all([
              get().refreshFFmpegInfo(),
              get().refreshHardwareAcceleration(),
            ]).catch(() => {});
          } else {
            get().refreshFFmpegInstallGuide().catch(() => {});
          }

          // Setup event listeners for real-time updates
          await get().setupEventListeners();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize',
            isInitialized: true,
            isLoading: false,
          });
        }
      },

      cleanup: () => {
        // Cleanup duration timer
        const timer = get()._durationTimer;
        if (timer) clearInterval(timer);
        // Cleanup all event listeners
        const listeners = get()._eventListeners;
        listeners.forEach((unlisten) => unlisten());
        set({ _eventListeners: [], _durationTimer: null });
      },

      setupEventListeners: async () => {
        if (!isTauri()) return;

        const listeners: UnlistenFn[] = [];

        try {
          // Client-side duration calculation (no IPC polling)
          const startDurationTimer = () => {
            const existing = get()._durationTimer;
            if (existing) clearInterval(existing);
            const timer = setInterval(() => {
              const state = get();
              if (state._recordingStartedAt && state.status === 'Recording') {
                const now = performance.now();
                const elapsed = now - state._recordingStartedAt - state._totalPausedMs;
                set({ duration: Math.max(0, Math.round(elapsed)) });
              }
            }, 200);
            set({ _durationTimer: timer });
          };

          const stopDurationTimer = () => {
            const timer = get()._durationTimer;
            if (timer) {
              clearInterval(timer);
              set({ _durationTimer: null });
            }
          };

          // Listen for recording status changes
          const unlistenStatus = await listen<{
            status: RecordingStatus;
            recording_id: string | null;
            duration_ms: number;
          }>('recording-status-changed', (event) => {
            const newStatus = event.payload.status;
            const prevStatus = get().status;

            const updates: Partial<ScreenRecordingState> = {
              status: newStatus,
              recordingId: event.payload.recording_id,
              duration: event.payload.duration_ms,
            };

            if (newStatus === 'Recording' && prevStatus !== 'Recording') {
              if (prevStatus === 'Paused') {
                // Resuming: accumulate paused duration
                const pauseStart = get()._pauseStartedAt;
                if (pauseStart) {
                  updates._totalPausedMs = get()._totalPausedMs + (performance.now() - pauseStart);
                }
                updates._pauseStartedAt = null;
              } else {
                // Fresh start: calibrate with backend duration
                updates._recordingStartedAt = performance.now() - event.payload.duration_ms;
                updates._totalPausedMs = 0;
                updates._pauseStartedAt = null;
              }
              startDurationTimer();
            } else if (newStatus === 'Paused') {
              updates._pauseStartedAt = performance.now();
            } else if (newStatus === 'Idle') {
              stopDurationTimer();
              updates._recordingStartedAt = null;
              updates._totalPausedMs = 0;
              updates._pauseStartedAt = null;
            }

            set(updates);
          });
          listeners.push(unlistenStatus);

          // Listen for countdown events
          const unlistenCountdown = await listen<number>('recording-countdown', (event) => {
            // Countdown tick - can be used for UI feedback
            log.debug(`Recording: Countdown: ${event.payload}`);
          });
          listeners.push(unlistenCountdown);

          // Listen for recording completed
          const unlistenCompleted = await listen<RecordingMetadata>(
            'recording-completed',
            (event) => {
              log.debug(`Recording: Completed: ${event.payload.id}`);
              set({
                status: 'Idle',
                recordingId: null,
                duration: 0,
              });
              // Refresh history to include new recording
              get().refreshHistory();
            }
          );
          listeners.push(unlistenCompleted);

          // Listen for recording cancelled
          const unlistenCancelled = await listen<void>('recording-cancelled', () => {
            set({
              status: 'Idle',
              recordingId: null,
              duration: 0,
            });
          });
          listeners.push(unlistenCancelled);

          // Listen for recording errors
          const unlistenError = await listen<unknown>(
            'recording-error',
            (event) => {
              const parsed = parseRecordingError(event.payload);
              set({
                error: parsed.message,
                status: 'Idle',
                recordingId: null,
              });
            }
          );
          listeners.push(unlistenError);

          set({ _eventListeners: listeners });
        } catch (error) {
          log.error('Recording: Failed to setup event listeners', error as Error);
        }
      },

      startRecording: async (mode, options = {}) => {
        if (!isTauri()) return null;

        const { ffmpegAvailable } = get();
        if (!ffmpegAvailable) {
          set({ error: 'FFmpeg is not available. Please install FFmpeg to use screen recording.' });
          return null;
        }

        set({ isLoading: true, error: null });
        try {
          let recordingId: string;

          switch (mode) {
            case 'fullscreen':
              recordingId = await startFullscreenRecording(options.monitorIndex);
              break;
            case 'window':
              recordingId = await startWindowRecording(options.windowTitle);
              break;
            case 'region':
              if (!options.region) {
                throw new Error('Region is required for region recording');
              }
              recordingId = await startRegionRecording(options.region);
              break;
          }

          set({
            recordingId,
            selectedMode: mode,
            isLoading: false,
          });

          // Status will be updated via events automatically
          return recordingId;
        } catch (error) {
          const parsed = parseRecordingError(error);
          set({
            error: parsed.message,
            isLoading: false,
          });
          return null;
        }
      },

      pause: async () => {
        if (!isTauri()) return;
        try {
          await pauseRecording();
          await get().updateStatus();
        } catch (error) {
          const parsed = parseRecordingError(error);
          set({ error: parsed.message });
        }
      },

      resume: async () => {
        if (!isTauri()) return;
        try {
          await resumeRecording();
          await get().updateStatus();
        } catch (error) {
          const parsed = parseRecordingError(error);
          set({ error: parsed.message });
        }
      },

      stop: async () => {
        if (!isTauri()) return null;

        set({ isLoading: true });
        try {
          const metadata = await stopRecording();
          await get().refreshHistory();
          set({
            recordingId: null,
            duration: 0,
            isLoading: false,
          });
          await get().updateStatus();

          return metadata;
        } catch (error) {
          const parsed = parseRecordingError(error);
          set({
            error: parsed.message,
            isLoading: false,
          });
          return null;
        }
      },

      cancel: async () => {
        if (!isTauri()) return;
        try {
          await cancelRecording();
          set({
            recordingId: null,
            duration: 0,
          });
          await get().updateStatus();
        } catch (error) {
          const parsed = parseRecordingError(error);
          set({ error: parsed.message });
        }
      },

      updateStatus: async () => {
        if (!isTauri()) return;
        try {
          const status = await getRecordingStatus();
          set({ status });
        } catch {
          // Ignore errors during status polling
        }
      },

      updateDuration: async () => {
        if (!isTauri()) return;
        try {
          const duration = await getRecordingDuration();
          set({ duration });
        } catch {
          // Ignore errors
        }
      },

      updateConfig: async (partialConfig) => {
        if (!isTauri()) return;
        const newConfig = { ...get().config, ...partialConfig };
        try {
          await updateRecordingConfig(newConfig);
          set({ config: newConfig });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update config' });
        }
      },

      resetConfig: () => {
        set({ config: getDefaultRecordingConfig() });
      },

      refreshMonitors: async () => {
        if (!isTauri()) return;
        try {
          const monitors = await getRecordingMonitors();
          set({ monitors });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get monitors' });
        }
      },

      refreshAudioDevices: async () => {
        if (!isTauri()) return;
        try {
          const audioDevices = await getAudioDevices();
          set({ audioDevices });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get audio devices' });
        }
      },

      checkFfmpeg: async () => {
        if (!isTauri()) return false;
        try {
          const available = await checkFFmpeg();
          set({ ffmpegAvailable: available });
          if (available) {
            const versionOk = await checkFFmpegVersion().catch(() => false);
            set({ ffmpegVersionOk: versionOk });
          }
          return available;
        } catch {
          set({ ffmpegAvailable: false });
          return false;
        }
      },

      refreshFFmpegInfo: async () => {
        if (!isTauri()) return;
        try {
          const info = await getFFmpegInfo();
          set({ ffmpegInfo: info });
        } catch (error) {
          log.warn('Failed to get FFmpeg info', { error: String(error) });
        }
      },

      refreshHardwareAcceleration: async () => {
        if (!isTauri()) return;
        try {
          const hwAccel = await checkHardwareAcceleration();
          set({ hardwareAcceleration: hwAccel });
        } catch (error) {
          log.warn('Failed to check hardware acceleration', { error: String(error) });
        }
      },

      refreshFFmpegInstallGuide: async () => {
        if (!isTauri()) return;
        try {
          const guide = await getFFmpegInstallGuide();
          set({ ffmpegInstallGuide: guide });
        } catch (error) {
          log.warn('Failed to get FFmpeg install guide', { error: String(error) });
        }
      },

      generateFilename: async (mode, format, customName) => {
        if (!isTauri()) return null;
        try {
          return await generateRecordingFilename(mode, format, customName);
        } catch (error) {
          log.warn('Failed to generate filename', { error: String(error) });
          return null;
        }
      },

      getFilePath: async (filename) => {
        if (!isTauri()) return null;
        try {
          return await getRecordingPath(filename);
        } catch (error) {
          log.warn('Failed to get file path', { error: String(error) });
          return null;
        }
      },

      refreshHistory: async () => {
        if (!isTauri()) return;
        try {
          const history = await getRecordingHistory(50);
          set({ history });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get history' });
        }
      },

      deleteFromHistory: async (id) => {
        if (!isTauri()) return;
        try {
          await deleteRecording(id);
          await get().refreshHistory();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete' });
        }
      },

      clearHistory: async () => {
        if (!isTauri()) return;
        try {
          await clearRecordingHistory();
          set({ history: [] });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to clear history' });
        }
      },

      pinRecording: async (id) => {
        if (!isTauri()) return false;
        try {
          const result = await pinRecording(id);
          if (result) await get().refreshHistory();
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to pin recording' });
          return false;
        }
      },

      unpinRecording: async (id) => {
        if (!isTauri()) return false;
        try {
          const result = await unpinRecording(id);
          if (result) await get().refreshHistory();
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to unpin recording' });
          return false;
        }
      },

      getRecordingById: async (id) => {
        if (!isTauri()) return null;
        try {
          return await getRecordingById(id);
        } catch {
          return null;
        }
      },

      searchByTag: async (tag) => {
        if (!isTauri()) return [];
        try {
          return await searchRecordingsByTag(tag);
        } catch {
          return [];
        }
      },

      addTag: async (id, tag) => {
        if (!isTauri()) return false;
        try {
          const result = await addRecordingTag(id, tag);
          if (result) await get().refreshHistory();
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to add tag' });
          return false;
        }
      },

      removeTag: async (id, tag) => {
        if (!isTauri()) return false;
        try {
          const result = await removeRecordingTag(id, tag);
          if (result) await get().refreshHistory();
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to remove tag' });
          return false;
        }
      },

      getStats: async () => {
        if (!isTauri()) return null;
        try {
          return await getRecordingStats();
        } catch {
          return null;
        }
      },

      openRecordingFolder: async (filePath) => {
        if (!isTauri()) return;
        try {
          const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
          await revealItemInDir(filePath);
        } catch (error) {
          log.error('Failed to open folder', error as Error);
          set({ error: error instanceof Error ? error.message : 'Failed to open folder' });
        }
      },

      // Storage actions
      refreshStorageStats: async () => {
        if (!isTauri()) return;
        try {
          const [stats, usagePercent, exceeded] = await Promise.all([
            getStorageStats(),
            getStorageUsagePercent(),
            isStorageExceeded(),
          ]);
          set({
            storageStats: stats,
            storageUsagePercent: usagePercent,
            isStorageExceeded: exceeded,
          });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get storage stats' });
        }
      },

      refreshStorageConfig: async () => {
        if (!isTauri()) return;
        try {
          const config = await getStorageConfig();
          set({ storageConfig: config });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to get storage config' });
        }
      },

      updateStorageConfig: async (config) => {
        if (!isTauri()) return;
        try {
          await updateStorageConfig(config);
          set({ storageConfig: config });
          // Refresh stats after config change
          await get().refreshStorageStats();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update storage config',
          });
        }
      },

      runStorageCleanup: async () => {
        if (!isTauri()) return null;
        try {
          const result = await cleanupStorage();
          // Refresh stats and history after cleanup
          await Promise.all([get().refreshStorageStats(), get().refreshHistory()]);
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to run cleanup' });
          return null;
        }
      },

      setSelectedMonitor: (index) => set({ selectedMonitor: index }),
      setSelectedMode: (mode) => set({ selectedMode: mode }),
      setRegionSelection: (region) => set({ regionSelection: region }),
      setShowIndicator: (show) => set({ showRecordingIndicator: show }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'screen-recording-store',
      partialize: (state) => ({
        config: state.config,
        selectedMonitor: state.selectedMonitor,
        selectedMode: state.selectedMode,
        showRecordingIndicator: state.showRecordingIndicator,
      }),
    }
  )
);

// Helper hooks
export const useIsRecording = () => {
  const status = useScreenRecordingStore((state) => state.status);
  return status === 'Recording' || status === 'Paused' || status === 'Countdown';
};

export const useRecordingStatus = () => {
  return useScreenRecordingStore((state) => state.status);
};
