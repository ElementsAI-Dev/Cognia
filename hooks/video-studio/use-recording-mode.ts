/**
 * useRecordingMode - Hook for recording mode state and handlers
 *
 * Extracts recording-specific logic from the video studio page:
 * - Video playback state (play/pause, seek, volume)
 * - Trim and export workflows
 * - Recording history filtering
 * - Keyboard shortcuts
 * - Tauri event listeners for video processing progress
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { loggers } from '@/lib/logger';
import { useScreenRecordingStore } from '@/stores/media';
import { useScreenRecording } from '@/hooks/native/use-screen-recording';
import {
  formatFileSize,
  type RecordingHistoryEntry,
  type VideoProcessingProgress,
} from '@/lib/native/screen-recording';
import {
  trimVideo,
  trimVideoWithProgress,
  convertVideo,
  convertVideoWithProgress,
  cancelVideoProcessing,
  generateOutputFilename,
  type VideoTrimOptions,
  type VideoConvertOptions,
} from '@/lib/native/video-processing';
import { isTauri } from '@/lib/native/utils';
import type { ExportState } from '@/types/video-studio/types';

export interface UseRecordingModeOptions {
  tEditor: (key: string, values?: Record<string, unknown>) => string;
}

export interface UseRecordingModeReturn {
  // Screen recording
  history: RecordingHistoryEntry[];
  filteredHistory: RecordingHistoryEntry[];
  isInitialized: boolean;
  isRecording: boolean;
  isPaused: boolean;
  isCountdown: boolean;
  isRecordingProcessing: boolean;
  recordingDuration: number;
  isRecordingAvailable: boolean;
  monitors: { index: number; name?: string; is_primary?: boolean }[];
  selectedMonitor: number | null;
  setSelectedMonitor: (index: number) => void;
  startFullscreen: (monitor: number) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  refreshHistory: () => void;
  formatRecordingDuration: (ms: number) => string;
  recordingError: string | null;
  clearError: () => void;

  // Video playback
  selectedRecording: RecordingHistoryEntry | null;
  isPlaying: boolean;
  currentTime: number;
  videoDuration: number;
  volume: number;
  isMuted: boolean;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Controls
  togglePlay: () => void;
  handleSeek: (time: number) => void;
  handleVolumeChange: (newVolume: number) => void;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  setVideoDuration: React.Dispatch<React.SetStateAction<number>>;

  // Recording selection
  handleSelectRecording: (entry: RecordingHistoryEntry) => void;

  // Search
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;

  // Trim & Export
  showTrimDialog: boolean;
  setShowTrimDialog: React.Dispatch<React.SetStateAction<boolean>>;
  trimRange: { start: number; end: number };
  trimStartTime: number;
  trimEndTime: number;
  exportFormat: 'mp4' | 'webm' | 'gif';
  setExportFormat: React.Dispatch<React.SetStateAction<'mp4' | 'webm' | 'gif'>>;
  exportState: ExportState;
  isLoading: boolean;
  handleTrimConfirm: (inPoint: number, outPoint: number) => Promise<void>;
  handleExportRecording: () => Promise<void>;
  handleCancelExport: () => Promise<void>;

  // Delete
  showDeleteDialog: boolean;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteClick: (id: string) => void;
  confirmDelete: () => Promise<void>;

  // Utilities
  formatFileSize: typeof formatFileSize;
}

export function useRecordingMode({ tEditor }: UseRecordingModeOptions): UseRecordingModeReturn {
  // Screen recording store
  const { history, isInitialized, initialize, refreshHistory, deleteFromHistory } =
    useScreenRecordingStore();

  const {
    isRecording,
    isPaused,
    isCountdown,
    isProcessing: isRecordingProcessing,
    duration: recordingDuration,
    isAvailable: isRecordingAvailable,
    startFullscreen,
    pause: pauseRecording,
    resume: resumeRecording,
    stop: stopRecording,
    cancel: cancelRecording,
    monitors,
    selectedMonitor,
    setSelectedMonitor,
    formatDuration: formatRecordingDuration,
    error: recordingError,
    clearError,
  } = useScreenRecording({
    autoInitialize: true,
    onRecordingStop: () => {
      refreshHistory();
    },
  });

  // Video state
  const [selectedRecording, setSelectedRecording] = useState<RecordingHistoryEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [trimRange, setTrimRange] = useState({ start: 0, end: 100 });
  const [showTrimDialog, setShowTrimDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm' | 'gif'>('mp4');
  const exportQuality = 80;
  const [exportState, setExportState] = useState<ExportState>({ isExporting: false, progress: 0, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoProcessingUnlistenRef = useRef<UnlistenFn[]>([]);
  const exportResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getProcessingMessage = useCallback(
    (operation: string) => {
      if (operation === 'trim') return tEditor('trimming');
      if (operation === 'convert') return tEditor('converting');
      if (operation === 'thumbnail') return tEditor('processing');
      return tEditor('processing');
    },
    [tEditor]
  );

  const scheduleExportReset = useCallback(() => {
    if (exportResetTimeoutRef.current) {
      clearTimeout(exportResetTimeoutRef.current);
    }
    exportResetTimeoutRef.current = setTimeout(() => {
      setExportState({ isExporting: false, progress: 0, message: '' });
    }, 2000);
  }, []);

  // Tauri event listeners for video processing
  useEffect(() => {
    if (!isTauri()) return;

    const setup = async () => {
      try {
        const unlistenStarted = await listen<VideoProcessingProgress>(
          'video-processing-started',
          (event) => {
            if (event.payload.operation !== 'trim' && event.payload.operation !== 'convert') return;
            if (exportResetTimeoutRef.current) {
              clearTimeout(exportResetTimeoutRef.current);
            }
            setExportState({
              isExporting: true,
              progress: 0,
              message: getProcessingMessage(event.payload.operation),
            });
          }
        );

        const unlistenProgress = await listen<VideoProcessingProgress>(
          'video-processing-progress',
          (event) => {
            if (event.payload.operation !== 'trim' && event.payload.operation !== 'convert') return;
            setExportState(() => {
              const progress = Math.round((event.payload.progress ?? 0) * 100);
              const eta = event.payload.etaSeconds;
              const speed = event.payload.speed;

              const detailsParts = [
                speed ? `${speed}` : null,
                typeof eta === 'number' && eta > 0 ? `${Math.round(eta)}s` : null,
              ].filter(Boolean);

              return {
                isExporting: true,
                progress,
                message:
                  detailsParts.length > 0
                    ? `${getProcessingMessage(event.payload.operation)} (${detailsParts.join(' · ')})`
                    : getProcessingMessage(event.payload.operation),
              };
            });
          }
        );

        const unlistenCompleted = await listen<{ operation: string; outputPath: string }>(
          'video-processing-completed',
          (event) => {
            if (event.payload.operation !== 'trim' && event.payload.operation !== 'convert') return;
            setExportState({ isExporting: false, progress: 100, message: tEditor('complete') });
            scheduleExportReset();
          }
        );

        const unlistenError = await listen<VideoProcessingProgress>(
          'video-processing-error',
          (event) => {
            if (event.payload.operation !== 'trim' && event.payload.operation !== 'convert') return;
            setExportState({
              isExporting: false,
              progress: 0,
              message: event.payload.error ?? tEditor('exportFailed'),
            });
            scheduleExportReset();
          }
        );

        const unlistenCancelled = await listen<VideoProcessingProgress>(
          'video-processing-cancelled',
          () => {
            setExportState({
              isExporting: false,
              progress: 0,
              message: tEditor('cancelled'),
            });
            scheduleExportReset();
          }
        );

        videoProcessingUnlistenRef.current = [
          unlistenStarted,
          unlistenProgress,
          unlistenCompleted,
          unlistenError,
          unlistenCancelled,
        ];
      } catch (err) {
        loggers.media.error('Failed to setup video processing listeners', err);
      }
    };

    void setup();

    return () => {
      videoProcessingUnlistenRef.current.forEach((unlistenFn) => unlistenFn());
      videoProcessingUnlistenRef.current = [];
      if (exportResetTimeoutRef.current) {
        clearTimeout(exportResetTimeoutRef.current);
      }
    };
  }, [getProcessingMessage, scheduleExportReset, tEditor]);

  // Initialize recording on mount
  useEffect(() => {
    if (isTauri() && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Filtered recording history
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(
      (entry) =>
        entry.mode.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        new Date(entry.timestamp).toLocaleDateString().includes(query)
    );
  }, [history, searchQuery]);

  // Select first video on load if none selected
  useEffect(() => {
    if (!selectedRecording && filteredHistory.length > 0) {
      setSelectedRecording(filteredHistory[0]);
    }
  }, [filteredHistory, selectedRecording]);

  // Playback controls
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSeek = useCallback(
    (time: number) => {
      if (!videoRef.current || !videoDuration) return;
      videoRef.current.currentTime = time;
      setCurrentTime(time * 1000);
    },
    [videoDuration]
  );

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  // Recording selection
  const handleSelectRecording = useCallback((entry: RecordingHistoryEntry) => {
    setSelectedRecording(entry);
    setCurrentTime(0);
    setIsPlaying(false);
    setTrimRange({ start: 0, end: 100 });
  }, []);

  // Delete recording
  const handleDeleteClick = useCallback((id: string) => {
    setVideoToDelete(id);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!videoToDelete) return;
    setIsLoading(true);
    try {
      await deleteFromHistory(videoToDelete);
      if (selectedRecording?.id === videoToDelete) {
        setSelectedRecording(null);
      }
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setVideoToDelete(null);
    }
  }, [videoToDelete, deleteFromHistory, selectedRecording]);

  // Trim handler
  const handleTrimConfirm = useCallback(
    async (inPoint: number, outPoint: number) => {
      if (!selectedRecording?.file_path || !videoDuration) return;

      setExportState({ isExporting: true, progress: 0, message: tEditor('trimming') });

      try {
        const outputPath = generateOutputFilename(
          selectedRecording.file_path,
          exportFormat,
          '_trimmed'
        );
        const options: VideoTrimOptions = {
          inputPath: selectedRecording.file_path,
          outputPath,
          startTime: inPoint,
          endTime: outPoint,
          format: exportFormat,
          quality: exportQuality,
          gifFps: exportFormat === 'gif' ? 10 : undefined,
        };

        const result = isTauri() ? await trimVideoWithProgress(options) : await trimVideo(options);

        if (result.success) {
          if (!isTauri()) {
            setExportState({ isExporting: false, progress: 100, message: tEditor('complete') });
            scheduleExportReset();
          }
          await refreshHistory();

          if (isTauri()) {
            const { open } = await import('@tauri-apps/plugin-shell');
            const folderPath = result.outputPath.substring(
              0,
              Math.max(result.outputPath.lastIndexOf('/'), result.outputPath.lastIndexOf('\\'))
            );
            await open(folderPath);
          }
        } else {
          throw new Error(result.error || tEditor('trimFailed'));
        }
      } catch (err) {
        loggers.media.error('Trim failed', err);
        setExportState({
          isExporting: false,
          progress: 0,
          message: err instanceof Error ? err.message : tEditor('trimFailed'),
        });
      } finally {
        setShowTrimDialog(false);
        if (!isTauri()) {
          scheduleExportReset();
        }
      }
    },
    [
      selectedRecording,
      videoDuration,
      exportFormat,
      exportQuality,
      refreshHistory,
      scheduleExportReset,
      tEditor,
    ]
  );

  // Export recording
  const handleExportRecording = useCallback(async () => {
    if (!selectedRecording?.file_path) return;

    setIsLoading(true);
    setExportState({ isExporting: true, progress: 0, message: tEditor('exporting') });

    try {
      const hasTrimChanges = trimRange.start > 0 || trimRange.end < 100;
      const inputExtension = selectedRecording.file_path
        .substring(selectedRecording.file_path.lastIndexOf('.') + 1)
        .toLowerCase();
      const needsConversion = inputExtension !== exportFormat;

      if (hasTrimChanges) {
        const startTime = (trimRange.start / 100) * (videoDuration / 1000);
        const endTime = (trimRange.end / 100) * (videoDuration / 1000);
        const outputPath = generateOutputFilename(
          selectedRecording.file_path,
          exportFormat,
          '_export'
        );

        const options: VideoTrimOptions = {
          inputPath: selectedRecording.file_path,
          outputPath,
          startTime,
          endTime,
          format: exportFormat,
          quality: exportQuality,
          gifFps: exportFormat === 'gif' ? 10 : undefined,
        };

        const result = isTauri() ? await trimVideoWithProgress(options) : await trimVideo(options);

        if (!result.success) throw new Error(result.error || tEditor('exportFailed'));
        if (!isTauri()) {
          setExportState({ isExporting: false, progress: 100, message: tEditor('complete') });
          scheduleExportReset();
        }
        await refreshHistory();

        if (isTauri()) {
          const { open } = await import('@tauri-apps/plugin-shell');
          const folderPath = result.outputPath.substring(
            0,
            Math.max(result.outputPath.lastIndexOf('/'), result.outputPath.lastIndexOf('\\'))
          );
          await open(folderPath);
        }
      } else if (needsConversion) {
        const outputPath = generateOutputFilename(
          selectedRecording.file_path,
          exportFormat,
          '_converted'
        );
        const options: VideoConvertOptions = {
          inputPath: selectedRecording.file_path,
          outputPath,
          format: exportFormat,
          quality: exportQuality,
          gifFps: exportFormat === 'gif' ? 10 : undefined,
        };

        const result = isTauri()
          ? await convertVideoWithProgress(options)
          : await convertVideo(options);

        if (!result.success) throw new Error(result.error || tEditor('exportFailed'));
        if (!isTauri()) {
          setExportState({ isExporting: false, progress: 100, message: tEditor('complete') });
          scheduleExportReset();
        }
        await refreshHistory();

        if (isTauri()) {
          const { open } = await import('@tauri-apps/plugin-shell');
          const folderPath = result.outputPath.substring(
            0,
            Math.max(result.outputPath.lastIndexOf('/'), result.outputPath.lastIndexOf('\\'))
          );
          await open(folderPath);
        }
      } else {
        if (isTauri()) {
          const { open } = await import('@tauri-apps/plugin-shell');
          const folderPath = selectedRecording.file_path.substring(
            0,
            Math.max(
              selectedRecording.file_path.lastIndexOf('/'),
              selectedRecording.file_path.lastIndexOf('\\')
            )
          );
          await open(folderPath);
        }
        setExportState({ isExporting: false, progress: 100, message: tEditor('complete') });
        scheduleExportReset();
      }
    } catch (err) {
      loggers.media.error('Export failed', err);
      setExportState({
        isExporting: false,
        progress: 0,
        message: err instanceof Error ? err.message : tEditor('exportFailed'),
      });
    } finally {
      setIsLoading(false);
      if (!isTauri()) {
        scheduleExportReset();
      }
    }
  }, [
    selectedRecording,
    trimRange,
    videoDuration,
    exportFormat,
    exportQuality,
    refreshHistory,
    scheduleExportReset,
    tEditor,
  ]);

  // Cancel export
  const handleCancelExport = useCallback(async () => {
    if (!isTauri()) return;

    try {
      const cancelled = await cancelVideoProcessing();
      if (cancelled) {
        setExportState({
          isExporting: false,
          progress: 0,
          message: tEditor('cancelled'),
        });
        scheduleExportReset();
      }
    } catch (err) {
      loggers.media.error('Failed to cancel export', err);
    }
  }, [scheduleExportReset, tEditor]);

  // Trim time calculations
  const trimStartTime = (trimRange.start / 100) * videoDuration;
  const trimEndTime = (trimRange.end / 100) * videoDuration;

  return {
    // Screen recording
    history,
    filteredHistory,
    isInitialized,
    isRecording,
    isPaused,
    isCountdown,
    isRecordingProcessing,
    recordingDuration,
    isRecordingAvailable,
    monitors,
    selectedMonitor,
    setSelectedMonitor,
    startFullscreen,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    refreshHistory,
    formatRecordingDuration,
    recordingError,
    clearError,

    // Video playback
    selectedRecording,
    isPlaying,
    currentTime,
    videoDuration,
    volume,
    isMuted,
    zoomLevel,
    setZoomLevel,
    videoRef,

    // Controls
    togglePlay,
    handleSeek,
    handleVolumeChange,
    setIsMuted,
    setIsPlaying,
    setCurrentTime,
    setVideoDuration,

    // Recording selection
    handleSelectRecording,

    // Search
    searchQuery,
    setSearchQuery,

    // Trim & Export
    showTrimDialog,
    setShowTrimDialog,
    trimRange,
    trimStartTime,
    trimEndTime,
    exportFormat,
    setExportFormat,
    exportState,
    isLoading,
    handleTrimConfirm,
    handleExportRecording,
    handleCancelExport,

    // Delete
    showDeleteDialog,
    setShowDeleteDialog,
    handleDeleteClick,
    confirmDelete,

    // Utilities
    formatFileSize,
  };
}
