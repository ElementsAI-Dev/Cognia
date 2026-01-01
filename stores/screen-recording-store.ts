/**
 * Screen Recording Store
 *
 * Zustand store for managing screen recording state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  RecordingStatus,
  RecordingConfig,
  RecordingMetadata,
  RecordingHistoryEntry,
  MonitorInfo,
  AudioDevices,
  RecordingRegion,
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
} from '@/lib/native/screen-recording';
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
  
  // History
  history: RecordingHistoryEntry[];
  
  // UI state
  showRecordingIndicator: boolean;
  selectedMonitor: number | null;
  selectedMode: RecordingMode;
  regionSelection: RecordingRegion | null;
  
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface ScreenRecordingActions {
  // Initialization
  initialize: () => Promise<void>;
  
  // Recording control
  startRecording: (mode: RecordingMode, options?: {
    monitorIndex?: number;
    windowTitle?: string;
    region?: RecordingRegion;
  }) => Promise<string | null>;
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
  
  // History
  refreshHistory: () => Promise<void>;
  deleteFromHistory: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  
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
  history: [],
  showRecordingIndicator: true,
  selectedMonitor: null,
  selectedMode: 'fullscreen',
  regionSelection: null,
  isLoading: false,
  isInitialized: false,
  error: null,
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
          const [status, config, monitors, audioDevices, ffmpegAvailable, history] = await Promise.all([
            getRecordingStatus(),
            getRecordingConfig(),
            getRecordingMonitors(),
            getAudioDevices(),
            checkFFmpeg(),
            getRecordingHistory(50),
          ]);

          set({
            status,
            config,
            monitors,
            audioDevices,
            ffmpegAvailable,
            history,
            selectedMonitor: monitors.find(m => m.is_primary)?.index ?? 0,
            isInitialized: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to initialize',
            isInitialized: true,
            isLoading: false,
          });
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

          // Start polling for status updates
          get().updateStatus();

          return recordingId;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to start recording',
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
          set({ error: error instanceof Error ? error.message : 'Failed to pause' });
        }
      },

      resume: async () => {
        if (!isTauri()) return;
        try {
          await resumeRecording();
          await get().updateStatus();
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to resume' });
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
          set({
            error: error instanceof Error ? error.message : 'Failed to stop',
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
          set({ error: error instanceof Error ? error.message : 'Failed to cancel' });
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
          return available;
        } catch {
          set({ ffmpegAvailable: false });
          return false;
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
