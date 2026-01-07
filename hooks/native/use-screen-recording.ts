/**
 * Screen Recording Hook
 *
 * Provides access to screen recording functionality.
 * This hook wraps the screen-recording-store for simpler component usage.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useScreenRecordingStore, useIsRecording } from '@/stores/media';
import type { RecordingRegion } from '@/lib/native/screen-recording';
import { isTauri } from '@/lib/native/utils';

export type RecordingMode = 'fullscreen' | 'window' | 'region';

export interface UseScreenRecordingOptions {
  /** Auto-initialize on mount */
  autoInitialize?: boolean;
  /** Callback when recording starts */
  onRecordingStart?: (recordingId: string) => void;
  /** Callback when recording stops */
  onRecordingStop?: (filePath?: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseScreenRecordingReturn {
  // State
  isRecording: boolean;
  isPaused: boolean;
  isCountdown: boolean;
  isProcessing: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isAvailable: boolean;
  duration: number;
  error: string | null;
  
  // Recording controls
  startFullscreen: (monitorIndex?: number) => Promise<string | null>;
  startWindow: (windowTitle?: string) => Promise<string | null>;
  startRegion: (region: RecordingRegion) => Promise<string | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<string | null>;
  cancel: () => Promise<void>;
  
  // Configuration
  monitors: MonitorInfo[];
  selectedMonitor: number | null;
  setSelectedMonitor: (index: number | null) => void;
  
  // Utilities
  clearError: () => void;
  initialize: () => Promise<void>;
  formatDuration: (ms: number) => string;
}

interface MonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  is_primary: boolean;
}

/**
 * Format duration in milliseconds to MM:SS or HH:MM:SS format
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function useScreenRecording(options: UseScreenRecordingOptions = {}): UseScreenRecordingReturn {
  const {
    autoInitialize = true,
    onRecordingStart,
    onRecordingStop,
    onError,
  } = options;

  const callbacksRef = useRef({ onRecordingStart, onRecordingStop, onError });
  
  // Update callback refs in an effect to avoid accessing refs during render
  useEffect(() => {
    callbacksRef.current = { onRecordingStart, onRecordingStop, onError };
  }, [onRecordingStart, onRecordingStop, onError]);

  const {
    status,
    duration,
    monitors,
    selectedMonitor,
    ffmpegAvailable,
    isLoading,
    isInitialized,
    error,
    initialize,
    startRecording,
    pause: storePause,
    resume: storeResume,
    stop: storeStop,
    cancel: storeCancel,
    setSelectedMonitor,
    clearError,
  } = useScreenRecordingStore();

  const isRecording = useIsRecording();
  const isPaused = status === 'Paused';
  const isCountdown = status === 'Countdown';
  const isProcessing = status === 'Processing';
  const isAvailable = isTauri() && ffmpegAvailable;

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized && isTauri()) {
      initialize();
    }
  }, [autoInitialize, isInitialized, initialize]);

  // Handle error callback
  useEffect(() => {
    if (error && callbacksRef.current.onError) {
      callbacksRef.current.onError(error);
    }
  }, [error]);

  const startFullscreen = useCallback(async (monitorIndex?: number) => {
    const recordingId = await startRecording('fullscreen', { monitorIndex });
    if (recordingId && callbacksRef.current.onRecordingStart) {
      callbacksRef.current.onRecordingStart(recordingId);
    }
    return recordingId;
  }, [startRecording]);

  const startWindow = useCallback(async (windowTitle?: string) => {
    const recordingId = await startRecording('window', { windowTitle });
    if (recordingId && callbacksRef.current.onRecordingStart) {
      callbacksRef.current.onRecordingStart(recordingId);
    }
    return recordingId;
  }, [startRecording]);

  const startRegion = useCallback(async (region: RecordingRegion) => {
    const recordingId = await startRecording('region', { region });
    if (recordingId && callbacksRef.current.onRecordingStart) {
      callbacksRef.current.onRecordingStart(recordingId);
    }
    return recordingId;
  }, [startRecording]);

  const pause = useCallback(async () => {
    await storePause();
  }, [storePause]);

  const resume = useCallback(async () => {
    await storeResume();
  }, [storeResume]);

  const stop = useCallback(async () => {
    const metadata = await storeStop();
    const filePath = metadata?.file_path;
    if (callbacksRef.current.onRecordingStop) {
      callbacksRef.current.onRecordingStop(filePath ?? undefined);
    }
    return filePath ?? null;
  }, [storeStop]);

  const cancel = useCallback(async () => {
    await storeCancel();
  }, [storeCancel]);

  return {
    // State
    isRecording,
    isPaused,
    isCountdown,
    isProcessing,
    isLoading,
    isInitialized,
    isAvailable,
    duration,
    error,
    
    // Recording controls
    startFullscreen,
    startWindow,
    startRegion,
    pause,
    resume,
    stop,
    cancel,
    
    // Configuration
    monitors,
    selectedMonitor,
    setSelectedMonitor,
    
    // Utilities
    clearError,
    initialize,
    formatDuration,
  };
}

export default useScreenRecording;
