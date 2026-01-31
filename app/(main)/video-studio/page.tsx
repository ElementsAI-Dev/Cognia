'use client';

/**
 * Video Studio Page - Unified video editing and generation interface
 *
 * Merged from video-editor and video-studio pages
 *
 * Features:
 * - Recording Mode: Screen recording, editing, trimming, export
 * - AI Generation Mode: Text/Image to video generation
 * - Unified video preview with reusable components
 * - Video gallery with history (recordings + AI generations)
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  Video as VideoIcon,
  Download,
  Loader2,
  Clock,
  Star,
  AlertCircle,
  Film,
  Monitor,
  Scissors,
  HardDrive,
  Circle,
  Disc,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useSettingsStore, useMediaStore } from '@/stores';
import { useScreenRecordingStore } from '@/stores/media';
import { useScreenRecording } from '@/hooks/native/use-screen-recording';
import {
  formatDuration,
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
import {
  generateVideo,
  checkVideoGenerationStatus,
  downloadVideoAsBlob,
  saveVideoToFile,
  getAvailableVideoModelsForUI,
} from '@/lib/ai/media/video-generation';
import {
  estimateVideoCost,
  type VideoProvider,
  type VideoModel,
  type VideoResolution,
  type VideoAspectRatio,
  type VideoDuration,
  type VideoStyle,
} from '@/types/media/video';
import {
  VideoPreview,
  PlaybackControls,
  ZoomControls,
  VideoTrimmer,
  VideoStudioHeader,
  RecordingSidebar,
  AIGenerationSidebar,
  VideoJobCard,
  VideoDetailsPanel,
  VideoPreviewDialog,
  DeleteConfirmDialog,
  VideoEditorPanel,
  DURATION_OPTIONS,
  type StudioMode,
  type VideoJob,
} from '@/components/video-studio';

export default function VideoStudioPage() {
  const t = useTranslations('videoStudio');
  const tEditor = useTranslations('videoEditor');
  const tGen = useTranslations('videoGeneration');
  const searchParams = useSearchParams();

  // Get initial mode from URL query parameter
  const modeParam = searchParams.get('mode');
  const initialMode: StudioMode = modeParam === 'recording' ? 'recording' : modeParam === 'editor' ? 'editor' : 'ai-generation';

  // Studio Mode State
  const [studioMode, setStudioMode] = useState<StudioMode>(initialMode);
  const [showSidebar, setShowSidebar] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Recording Mode State
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

  // Recording video state
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
  const [exportQuality, _setExportQuality] = useState(80);
  const [exportState, setExportState] = useState({ isExporting: false, progress: 0, message: '' });
  const [searchQuery, setSearchQuery] = useState('');

  // AI Generation Mode State
  const [activeTab, setActiveTab] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoJob | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoJob | null>(null);
  const [showMoreTemplates, setShowMoreTemplates] = useState(false);

  // AI Generation Settings
  const [provider, setProvider] = useState<VideoProvider>('google-veo');
  const [model, setModel] = useState<VideoModel>('veo-3.1');
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [duration, setDuration] = useState<VideoDuration>('10s');
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [fps, setFps] = useState(24);
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(false);
  const [audioPrompt, setAudioPrompt] = useState('');
  const [seed, setSeed] = useState<number | undefined>(undefined);

  // Image-to-video state
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [_referenceImageFile, setReferenceImageFile] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoProcessingUnlistenRef = useRef<UnlistenFn[]>([]);
  const exportResetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stores
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const mediaStore = useMediaStore();

  // Get API key based on provider
  const getApiKey = useCallback(() => {
    if (provider === 'google-veo') {
      return providerSettings.google?.apiKey || '';
    } else if (provider === 'openai-sora') {
      return providerSettings.openai?.apiKey || '';
    }
    return '';
  }, [provider, providerSettings]);

  // Available models
  const availableModels = useMemo(() => getAvailableVideoModelsForUI(), []);

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
        console.error('Failed to setup video processing listeners:', err);
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

  // Get models for current provider
  const providerModels = useMemo(() => {
    return availableModels.filter((m) => m.provider === provider);
  }, [availableModels, provider]);

  // Update model when provider changes
  useEffect(() => {
    const firstModel = providerModels[0];
    if (firstModel && !providerModels.some((m) => m.id === model)) {
      setModel(firstModel.id as VideoModel);
    }
  }, [provider, providerModels, model]);

  // Poll for job status
  const pollJobStatus = useCallback(
    async (job: VideoJob) => {
      const apiKey = getApiKey();
      if (!apiKey || !job.jobId) return;

      try {
        const result = await checkVideoGenerationStatus(apiKey, job.jobId, job.provider);

        setVideoJobs((prev) =>
          prev.map((j) => {
            if (j.id !== job.id) return j;
            return {
              ...j,
              status: result.status,
              progress: result.progress || j.progress,
              videoUrl: result.video?.url || j.videoUrl,
              videoBase64: result.video?.base64 || j.videoBase64,
              thumbnailUrl: result.video?.thumbnailUrl || j.thumbnailUrl,
              error: result.error,
            };
          })
        );

        // Save to media store if completed
        if (result.status === 'completed' && result.video) {
          mediaStore.addVideo({
            jobId: job.jobId,
            url: result.video.url,
            base64: result.video.base64,
            thumbnailUrl: result.video.thumbnailUrl,
            prompt: job.prompt,
            model: job.model,
            provider: job.provider,
            resolution: job.settings.resolution,
            aspectRatio: job.settings.aspectRatio,
            duration: job.settings.duration,
            style: job.settings.style,
            fps: job.settings.fps,
            status: 'completed',
            progress: 100,
            width: result.video.width,
            height: result.video.height,
            durationSeconds: result.video.durationSeconds,
          });
        }

        return result.status;
      } catch (err) {
        console.error('Poll error:', err);
        return 'failed';
      }
    },
    [getApiKey, mediaStore]
  );

  // Start polling for active jobs
  useEffect(() => {
    const activeJobs = videoJobs.filter((j) => j.status === 'pending' || j.status === 'processing');

    if (activeJobs.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    pollingRef.current = setInterval(async () => {
      for (const job of activeJobs) {
        const status = await pollJobStatus(job);
        if (status === 'completed' || status === 'failed') {
          // Job finished, will be removed from active list on next render
        }
      }
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [videoJobs, pollJobStatus]);

  // Generate video
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      setError(
        provider === 'google-veo' ? 'Google API key is required' : 'OpenAI API key is required'
      );
      return;
    }

    setIsGenerating(true);
    setError(null);

    const jobId = `job-${Date.now()}`;
    const newJob: VideoJob = {
      id: jobId,
      prompt: prompt.trim(),
      provider,
      model,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      settings: { resolution, aspectRatio, duration, style, fps },
    };

    setVideoJobs((prev) => [newJob, ...prev]);

    try {
      const result = await generateVideo(apiKey, {
        prompt: prompt.trim(),
        provider,
        model,
        resolution,
        aspectRatio,
        duration,
        style,
        negativePrompt: negativePrompt || undefined,
        fps,
        enhancePrompt,
        includeAudio,
        audioPrompt: includeAudio ? audioPrompt : undefined,
        seed,
        referenceImageBase64: referenceImage || undefined,
      });

      setVideoJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j;
          return {
            ...j,
            jobId: result.jobId,
            status: result.status,
            progress: result.progress || 0,
            videoUrl: result.video?.url,
            videoBase64: result.video?.base64,
            thumbnailUrl: result.video?.thumbnailUrl,
            error: result.error,
          };
        })
      );

      if (result.status === 'completed' && result.video) {
        mediaStore.addVideo({
          jobId: result.jobId,
          url: result.video.url,
          base64: result.video.base64,
          thumbnailUrl: result.video.thumbnailUrl,
          prompt: prompt.trim(),
          model,
          provider,
          resolution,
          aspectRatio,
          duration,
          style,
          fps,
          status: 'completed',
          progress: 100,
          width: result.video.width,
          height: result.video.height,
          durationSeconds: result.video.durationSeconds,
        });
      }

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Video generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate video';
      setError(errorMessage);
      setVideoJobs((prev) =>
        prev.map((j) => {
          if (j.id !== jobId) return j;
          return { ...j, status: 'failed', error: errorMessage };
        })
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    negativePrompt,
    provider,
    model,
    resolution,
    aspectRatio,
    duration,
    style,
    fps,
    enhancePrompt,
    includeAudio,
    audioPrompt,
    seed,
    referenceImage,
    getApiKey,
    mediaStore,
  ]);

  // Download video
  const handleDownload = useCallback(async (job: VideoJob) => {
    try {
      if (job.videoUrl) {
        const blob = await downloadVideoAsBlob(job.videoUrl);
        const filename = `video-${job.id}.mp4`;
        saveVideoToFile(blob, filename);
      } else if (job.videoBase64) {
        const byteCharacters = atob(job.videoBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/mp4' });
        const filename = `video-${job.id}.mp4`;
        saveVideoToFile(blob, filename);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  }, []);

  // Delete job
  const handleDeleteJob = useCallback(
    (jobId: string) => {
      setVideoJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (selectedVideo?.id === jobId) {
        setSelectedVideo(null);
      }
    },
    [selectedVideo]
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback((jobId: string) => {
    setVideoJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, isFavorite: !j.isFavorite } : j))
    );
  }, []);

  // Handle image upload for image-to-video
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReferenceImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      // Remove data URL prefix
      const base64Data = base64.split(',')[1];
      setReferenceImage(base64Data);
    };
    reader.readAsDataURL(file);
  }, []);

  // Clear reference image
  const handleClearReferenceImage = useCallback(() => {
    setReferenceImage(null);
    setReferenceImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Apply template (used by AIGenerationSidebar internally)
  const _handleApplyTemplate = useCallback((templatePrompt: string) => {
    setPrompt(templatePrompt);
  }, []);

  // Filtered videos
  const displayedVideos = useMemo(() => {
    if (filterFavorites) {
      return videoJobs.filter((j) => j.isFavorite);
    }
    return videoJobs;
  }, [videoJobs, filterFavorites]);

  // Format timestamp
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    const durationSeconds = DURATION_OPTIONS.find((d) => d.value === duration)?.seconds || 10;
    return estimateVideoCost(provider, model, durationSeconds);
  }, [provider, model, duration]);

  // Recording Mode Handlers

  // Initialize recording on mount
  useEffect(() => {
    if (isTauri() && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Filtered recording history based on search
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
    if (studioMode === 'recording' && !selectedRecording && filteredHistory.length > 0) {
      setSelectedRecording(filteredHistory[0]);
    }
  }, [filteredHistory, selectedRecording, studioMode]);

  // Playback controls for recording (defined before keyboard shortcuts that use them)
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

  // Keyboard shortcuts for video playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when in recording mode with a selected recording
      if (studioMode !== 'recording' || !selectedRecording) return;

      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) {
            const newTime = Math.max(0, currentTime / 1000 - 5);
            handleSeek(newTime);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) {
            const newTime = Math.min(videoDuration / 1000, currentTime / 1000 + 5);
            handleSeek(newTime);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted(!isMuted);
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoomLevel((prev) => Math.min(3, prev + 0.25));
          break;
        case '-':
          e.preventDefault();
          setZoomLevel((prev) => Math.max(0.5, prev - 0.25));
          break;
        case '0':
          e.preventDefault();
          setZoomLevel(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    studioMode,
    selectedRecording,
    togglePlay,
    currentTime,
    videoDuration,
    handleSeek,
    handleVolumeChange,
    volume,
    isMuted,
  ]);

  // Video event handlers for recording preview
  const _handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime * 1000);
    }
  }, []);

  const _handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration * 1000);
      setTrimRange({ start: 0, end: 100 });
    }
  }, []);

  const _handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, []);

  const _toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

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
        console.error('Trim failed:', err);
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
      console.error('Export failed:', err);
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

  // Cancel export handler
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
      console.error('Failed to cancel export:', err);
    }
  }, [scheduleExportReset, tEditor]);

  // Format time for recording display
  const _formatVideoTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }, []);

  // Progress calculation for recording
  const _progressPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const trimStartTime = (trimRange.start / 100) * videoDuration;
  const trimEndTime = (trimRange.end / 100) * videoDuration;
  const _trimmedDuration = trimEndTime - trimStartTime;

  // Get current preview source
  const _getCurrentPreviewSrc = useCallback(() => {
    if (studioMode === 'recording' && selectedRecording?.file_path) {
      return `file://${selectedRecording.file_path}`;
    }
    if (studioMode === 'ai-generation' && selectedVideo) {
      return (
        selectedVideo.videoUrl ||
        (selectedVideo.videoBase64 ? `data:video/mp4;base64,${selectedVideo.videoBase64}` : '')
      );
    }
    return '';
  }, [studioMode, selectedRecording, selectedVideo]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <VideoStudioHeader
        studioMode={studioMode}
        onStudioModeChange={setStudioMode}
        showSidebar={showSidebar}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        isRecordingAvailable={isRecordingAvailable}
        isRecording={isRecording}
        isPaused={isPaused}
        isCountdown={isCountdown}
        isProcessing={isRecordingProcessing}
        recordingDuration={recordingDuration}
        monitors={monitors}
        selectedMonitor={selectedMonitor}
        onSelectMonitor={setSelectedMonitor}
        onStartRecording={() => startFullscreen(selectedMonitor ?? 0)}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
        onStopRecording={stopRecording}
        onCancelRecording={cancelRecording}
        onRefreshHistory={refreshHistory}
        formatRecordingDuration={formatRecordingDuration}
        t={t}
        tEditor={tEditor}
        tGen={tGen}
      />

      {/* Recording Error Alert */}
      {studioMode === 'recording' && recordingError && (
        <Alert variant="destructive" className="mx-4 mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{recordingError}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-64 sm:w-80 border-r flex flex-col shrink-0 min-h-0 overflow-hidden">
            {/* Mode selector for mobile */}
            <div className="sm:hidden p-2 border-b">
              <Select value={studioMode} onValueChange={(v) => setStudioMode(v as StudioMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recording">
                    <span className="flex items-center gap-2">
                      <Disc className="h-4 w-4" />
                      Recording
                    </span>
                  </SelectItem>
                  <SelectItem value="ai-generation">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Generation
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recording Mode Sidebar */}
            {studioMode === 'recording' && (
              <RecordingSidebar
                history={filteredHistory}
                selectedRecording={selectedRecording}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectRecording={handleSelectRecording}
                onDeleteClick={handleDeleteClick}
                onCloseSidebar={() => setShowSidebar(false)}
                t={tEditor}
              />
            )}

            {/* AI Generation Mode Sidebar */}
            {studioMode === 'ai-generation' && (
              <AIGenerationSidebar
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
                prompt={prompt}
                onPromptChange={setPrompt}
                negativePrompt={negativePrompt}
                onNegativePromptChange={setNegativePrompt}
                referenceImage={referenceImage}
                onImageUpload={handleImageUpload}
                onClearImage={handleClearReferenceImage}
                showSettings={showSettings}
                onShowSettingsChange={setShowSettings}
                showMoreTemplates={showMoreTemplates}
                onShowMoreTemplatesChange={setShowMoreTemplates}
                provider={provider}
                onProviderChange={setProvider}
                model={model}
                onModelChange={setModel}
                providerModels={providerModels}
                resolution={resolution}
                onResolutionChange={setResolution}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                duration={duration}
                onDurationChange={setDuration}
                style={style}
                onStyleChange={setStyle}
                fps={fps}
                onFpsChange={setFps}
                enhancePrompt={enhancePrompt}
                onEnhancePromptChange={setEnhancePrompt}
                includeAudio={includeAudio}
                onIncludeAudioChange={setIncludeAudio}
                audioPrompt={audioPrompt}
                onAudioPromptChange={setAudioPrompt}
                seed={seed}
                onSeedChange={setSeed}
                isGenerating={isGenerating}
                error={error}
                estimatedCost={estimatedCost}
                onGenerate={handleGenerate}
              />
            )}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Recording Mode Content */}
          {studioMode === 'recording' && (
            <>
              {selectedRecording ? (
                <>
                  {/* Video Preview using VideoPreview component */}
                  <div className="flex-1 relative bg-black">
                    <VideoPreview
                      src={`file://${selectedRecording.file_path}`}
                      currentTime={currentTime / 1000}
                      isPlaying={isPlaying}
                      volume={volume}
                      muted={isMuted}
                      onTimeUpdate={(time: number) => setCurrentTime(time * 1000)}
                      onDurationChange={(dur: number) => setVideoDuration(dur * 1000)}
                      onPlayingChange={setIsPlaying}
                      onVolumeChange={setVolume}
                      onMutedChange={setIsMuted}
                      className="w-full h-full"
                    />

                    {/* Zoom Controls */}
                    <div className="absolute top-4 right-4">
                      <ZoomControls
                        zoom={zoomLevel}
                        minZoom={0.5}
                        maxZoom={3}
                        step={0.25}
                        onZoomChange={setZoomLevel}
                        compact
                      />
                    </div>

                    {/* Video info overlay */}
                    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                      <p className="text-white text-sm font-medium">
                        {selectedRecording.width}×{selectedRecording.height} •{' '}
                        {selectedRecording.mode}
                      </p>
                    </div>
                  </div>

                  {/* Playback Controls & Trim */}
                  <div className="border-t bg-background p-4 space-y-4">
                    <PlaybackControls
                      isPlaying={isPlaying}
                      currentTime={currentTime / 1000}
                      duration={videoDuration / 1000}
                      volume={volume}
                      muted={isMuted}
                      showVolumeControl
                      showSkipControls
                      onPlayPause={togglePlay}
                      onSeek={handleSeek}
                      onVolumeChange={handleVolumeChange}
                      onMutedChange={setIsMuted}
                    />

                    {/* Trim & Export Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Monitor className="h-4 w-4" />
                          {selectedRecording.width}×{selectedRecording.height}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(selectedRecording.duration_ms)}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-4 w-4" />
                          {formatFileSize(selectedRecording.file_size)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setShowTrimDialog(true)}>
                          <Scissors className="h-4 w-4 mr-2" />
                          {tEditor('trim') || 'Trim'}
                        </Button>

                        <Select
                          value={exportFormat}
                          onValueChange={(v) => setExportFormat(v as typeof exportFormat)}
                        >
                          <SelectTrigger className="w-24 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp4">MP4</SelectItem>
                            <SelectItem value="webm">WebM</SelectItem>
                            <SelectItem value="gif">GIF</SelectItem>
                          </SelectContent>
                        </Select>

                        {(exportState.isExporting || exportState.message) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Progress value={exportState.progress} className="w-16 h-1.5" />
                            <span>{exportState.progress}%</span>
                            {exportState.message && (
                              <span className="max-w-40 truncate">{exportState.message}</span>
                            )}
                            {exportState.isExporting && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelExport}
                                className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-3 w-3 mr-1" />
                                {tEditor('cancel') || 'Cancel'}
                              </Button>
                            )}
                          </div>
                        )}

                        <Button
                          onClick={handleExportRecording}
                          disabled={isLoading || exportState.isExporting}
                        >
                          {isLoading || exportState.isExporting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {tEditor('export') || 'Export'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center max-w-md px-4">
                    <Film className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    {filteredHistory.length === 0 ? (
                      <>
                        <h2 className="text-lg font-medium mb-2">
                          {tEditor('noRecordings') || 'No recordings yet'}
                        </h2>
                        <p className="text-sm mb-4">
                          {tEditor('startRecordingHint') ||
                            'Start a new screen recording to get started'}
                        </p>
                        {isRecordingAvailable && (
                          <Button
                            onClick={() => startFullscreen(selectedMonitor ?? 0)}
                            className="bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Circle className="h-4 w-4 mr-2 fill-current" />
                            {tEditor('startRecording') || 'Start Recording'}
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <h2 className="text-lg font-medium mb-2">
                          {tEditor('noVideoSelected') || 'No video selected'}
                        </h2>
                        <p className="text-sm">
                          {tEditor('selectFromSidebar') || 'Select a recording from the sidebar'}
                        </p>
                      </>
                    )}

                    {/* Keyboard shortcuts hint */}
                    <div className="mt-6 pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground/70 mb-2">
                        {tEditor('keyboardShortcuts') || 'Keyboard Shortcuts'}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
                        <span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd>{' '}
                          Play/Pause
                        </span>
                        <span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←/→</kbd> Skip
                          5s
                        </span>
                        <span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑/↓</kbd>{' '}
                          Volume
                        </span>
                        <span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">M</kbd> Mute
                        </span>
                        <span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">+/-</kbd> Zoom
                        </span>
                        <span>
                          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">0</kbd> Reset
                          Zoom
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* AI Generation Mode Content */}
          {studioMode === 'ai-generation' && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant={filterFavorites ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFilterFavorites(!filterFavorites)}
                  >
                    <Star className={cn('h-4 w-4', filterFavorites && 'fill-current')} />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {displayedVideos.length} video{displayedVideos.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Video Grid */}
              <ScrollArea className="flex-1 p-4">
                {displayedVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <VideoIcon className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">{tGen('noVideos') || 'No videos yet'}</p>
                    <p className="text-sm">
                      {tGen('generateFirst') || 'Generate your first video to get started'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayedVideos.map((job) => (
                      <VideoJobCard
                        key={job.id}
                        job={job}
                        isSelected={selectedVideo?.id === job.id}
                        onSelect={setSelectedVideo}
                        onPreview={setPreviewVideo}
                        onDownload={handleDownload}
                        onToggleFavorite={handleToggleFavorite}
                        formatTime={formatTime}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}

          {/* Editor Mode Content */}
          {studioMode === 'editor' && (
            <VideoEditorPanel
              initialVideoUrl={selectedRecording?.file_path ? `file://${selectedRecording.file_path}` : undefined}
              onExport={(blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `edited-video-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex-1"
            />
          )}
        </main>

        {/* Selected Video Details (AI Generation mode only) */}
        {studioMode === 'ai-generation' && selectedVideo && (
          <VideoDetailsPanel
            ref={videoRef}
            video={selectedVideo}
            onDownload={handleDownload}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeleteJob}
            onRegenerate={(video) => {
              setPrompt(video.prompt);
              setProvider(video.provider);
              setModel(video.model);
              setResolution(video.settings.resolution);
              setAspectRatio(video.settings.aspectRatio);
              setDuration(video.settings.duration);
              setStyle(video.settings.style);
            }}
          />
        )}
      </div>

      {/* Preview Dialog */}
      <VideoPreviewDialog
        video={previewVideo}
        open={!!previewVideo}
        onOpenChange={() => setPreviewVideo(null)}
        title={tGen('videoPreview') || 'Video Preview'}
      />

      {/* Trim Dialog */}
      <Dialog open={showTrimDialog} onOpenChange={setShowTrimDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tEditor('trimVideo') || 'Trim Video'}</DialogTitle>
            <DialogDescription>
              {tEditor('trimDescription') || 'Adjust the start and end points to trim your video'}
            </DialogDescription>
          </DialogHeader>
          {selectedRecording && (
            <VideoTrimmer
              sourceUrl={`file://${selectedRecording.file_path}`}
              duration={videoDuration / 1000}
              inPoint={trimStartTime / 1000}
              outPoint={trimEndTime / 1000}
              onInPointChange={(time: number) => {
                setTrimRange((prev) => ({
                  ...prev,
                  start: (time / (videoDuration / 1000)) * 100,
                }));
              }}
              onOutPointChange={(time: number) => {
                setTrimRange((prev) => ({
                  ...prev,
                  end: (time / (videoDuration / 1000)) * 100,
                }));
              }}
              onConfirm={handleTrimConfirm}
              onCancel={() => setShowTrimDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        isLoading={isLoading}
        title={tEditor('deleteRecording') || 'Delete Recording'}
        description={
          tEditor('deleteConfirmation') ||
          'Are you sure you want to delete this recording? This action cannot be undone.'
        }
        cancelText={tEditor('cancel') || 'Cancel'}
        deleteText={tEditor('delete') || 'Delete'}
      />
    </div>
  );
}
