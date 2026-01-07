'use client';

/**
 * Video Editor Page - Basic video editing for screen recordings
 * Features:
 * - Video playback with controls
 * - Trim start/end points
 * - Recording history/gallery
 * - Export with different formats
 * - Video metadata display
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Scissors,
  Download,
  Trash2,
  Clock,
  HardDrive,
  Monitor,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Film,
  Loader2,
  RefreshCw,
  Pin,
  FolderOpen,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  X,
  Circle,
  Square,
  Disc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useScreenRecordingStore } from '@/stores/media';
import { useScreenRecording } from '@/hooks/native/use-screen-recording';
import {
  formatDuration,
  formatFileSize,
  type RecordingHistoryEntry,
} from '@/lib/native/screen-recording';
import {
  trimVideo,
  convertVideo,
  generateOutputFilename,
  type VideoTrimOptions,
  type VideoConvertOptions,
  type VideoProcessingResult as _VideoProcessingResult,
} from '@/lib/native/video-processing';
import { isTauri } from '@/lib/native/utils';

interface TrimRange {
  start: number; // percentage 0-100
  end: number;   // percentage 0-100
}

interface ExportState {
  isExporting: boolean;
  progress: number;
  message: string;
}

export default function VideoEditorPage() {
  const t = useTranslations('videoEditor');
  
  // Store
  const {
    history,
    isInitialized,
    initialize,
    refreshHistory,
    deleteFromHistory,
  } = useScreenRecordingStore();

  // Screen recording hook
  const {
    isRecording,
    isPaused,
    isCountdown,
    isProcessing,
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
      // Refresh history when recording stops to show new video
      refreshHistory();
    },
  });

  // State
  const [selectedVideo, setSelectedVideo] = useState<RecordingHistoryEntry | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [trimRange, setTrimRange] = useState<TrimRange>({ start: 0, end: 100 });
  const [isTrimming, setIsTrimming] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'mp4' | 'webm' | 'gif'>('mp4');
  const [exportQuality, setExportQuality] = useState(80);
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    message: '',
  });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Initialize on mount
  useEffect(() => {
    if (isTauri() && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Filtered history based on search
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(entry => 
      entry.mode.toLowerCase().includes(query) ||
      entry.tags.some(tag => tag.toLowerCase().includes(query)) ||
      new Date(entry.timestamp).toLocaleDateString().includes(query)
    );
  }, [history, searchQuery]);

  // Select first video on load if none selected
  useEffect(() => {
    if (!selectedVideo && filteredHistory.length > 0) {
      setSelectedVideo(filteredHistory[0]);
    }
  }, [filteredHistory, selectedVideo]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime * 1000);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration * 1000);
      setTrimRange({ start: 0, end: 100 });
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, []);

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

  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current || !duration) return;
    const newTime = (value[0] / 100) * (duration / 1000);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime * 1000);
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
  }, []);

  const skipForward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      videoRef.current.duration,
      videoRef.current.currentTime + 5
    );
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            const newVolume = Math.min(1, volume + 0.1);
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(false);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            const newVolume = Math.max(0, volume - 0.1);
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
          }
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'f':
        case 'F':
          // Toggle fullscreen
          if (videoRef.current) {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              videoRef.current.requestFullscreen();
            }
          }
          break;
        case '+':
        case '=':
          setZoomLevel(Math.min(3, zoomLevel + 0.25));
          break;
        case '-':
          setZoomLevel(Math.max(0.5, zoomLevel - 0.25));
          break;
        case '0':
          setZoomLevel(1);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skipBackward, skipForward, toggleMute, volume, zoomLevel]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newVolume = value[0] / 100;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  // Trim controls
  const handleTrimStart = useCallback((value: number[]) => {
    setTrimRange(prev => ({
      ...prev,
      start: Math.min(value[0], prev.end - 5),
    }));
  }, []);

  const handleTrimEnd = useCallback((value: number[]) => {
    setTrimRange(prev => ({
      ...prev,
      end: Math.max(value[0], prev.start + 5),
    }));
  }, []);

  const applyTrim = useCallback(async () => {
    if (!selectedVideo?.file_path || !duration) return;
    
    setIsTrimming(true);
    setExportState({ isExporting: true, progress: 10, message: t('trimming') });
    
    try {
      // Calculate actual times from trim range percentages
      const startTime = (trimRange.start / 100) * (duration / 1000);
      const endTime = (trimRange.end / 100) * (duration / 1000);
      
      // Generate output path
      const outputPath = generateOutputFilename(
        selectedVideo.file_path,
        exportFormat,
        '_trimmed'
      );
      
      const options: VideoTrimOptions = {
        inputPath: selectedVideo.file_path,
        outputPath,
        startTime,
        endTime,
        format: exportFormat,
        quality: exportQuality,
        gifFps: exportFormat === 'gif' ? 10 : undefined,
      };
      
      setExportState({ isExporting: true, progress: 30, message: t('processing') });
      
      const result = await trimVideo(options);
      
      if (result.success) {
        setExportState({ isExporting: true, progress: 100, message: t('complete') });
        
        // Refresh history to show the new trimmed video
        await refreshHistory();
        
        // Open the folder containing the exported file
        if (isTauri()) {
          const { open } = await import('@tauri-apps/plugin-shell');
          const folderPath = result.outputPath.substring(
            0,
            Math.max(result.outputPath.lastIndexOf('/'), result.outputPath.lastIndexOf('\\'))
          );
          await open(folderPath);
        }
      } else {
        throw new Error(result.error || t('trimFailed'));
      }
    } catch (error) {
      console.error('Trim failed:', error);
      setExportState({ 
        isExporting: false, 
        progress: 0, 
        message: error instanceof Error ? error.message : t('trimFailed') 
      });
    } finally {
      setIsTrimming(false);
      // Reset export state after a delay
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0, message: '' });
      }, 2000);
    }
  }, [selectedVideo, duration, trimRange, exportFormat, exportQuality, refreshHistory, t]);

  // Video selection
  const handleSelectVideo = useCallback((entry: RecordingHistoryEntry) => {
    setSelectedVideo(entry);
    setCurrentTime(0);
    setIsPlaying(false);
    setTrimRange({ start: 0, end: 100 });
  }, []);

  // Delete video
  const handleDeleteClick = useCallback((id: string) => {
    setVideoToDelete(id);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!videoToDelete) return;
    
    setIsLoading(true);
    try {
      await deleteFromHistory(videoToDelete);
      if (selectedVideo?.id === videoToDelete) {
        setSelectedVideo(null);
      }
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setVideoToDelete(null);
    }
  }, [videoToDelete, deleteFromHistory, selectedVideo]);

  // Export video
  const handleExport = useCallback(async () => {
    if (!selectedVideo?.file_path) return;
    
    setIsLoading(true);
    setExportState({ isExporting: true, progress: 10, message: t('exporting') });
    
    try {
      const hasTrimChanges = trimRange.start > 0 || trimRange.end < 100;
      
      // Determine input file extension
      const inputExtension = selectedVideo.file_path
        .substring(selectedVideo.file_path.lastIndexOf('.') + 1)
        .toLowerCase();
      const needsConversion = inputExtension !== exportFormat;
      
      if (hasTrimChanges) {
        // If there are trim changes, apply trim (which also converts format)
        const startTime = (trimRange.start / 100) * (duration / 1000);
        const endTime = (trimRange.end / 100) * (duration / 1000);
        
        const outputPath = generateOutputFilename(
          selectedVideo.file_path,
          exportFormat,
          '_export'
        );
        
        const options: VideoTrimOptions = {
          inputPath: selectedVideo.file_path,
          outputPath,
          startTime,
          endTime,
          format: exportFormat,
          quality: exportQuality,
          gifFps: exportFormat === 'gif' ? 10 : undefined,
        };
        
        setExportState({ isExporting: true, progress: 30, message: t('processing') });
        
        const result = await trimVideo(options);
        
        if (!result.success) {
          throw new Error(result.error || t('exportFailed'));
        }
        
        setExportState({ isExporting: true, progress: 90, message: t('complete') });
        
        // Refresh and open folder
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
        // Only format conversion needed
        const outputPath = generateOutputFilename(
          selectedVideo.file_path,
          exportFormat,
          '_converted'
        );
        
        const options: VideoConvertOptions = {
          inputPath: selectedVideo.file_path,
          outputPath,
          format: exportFormat,
          quality: exportQuality,
          gifFps: exportFormat === 'gif' ? 10 : undefined,
        };
        
        setExportState({ isExporting: true, progress: 30, message: t('converting') });
        
        const result = await convertVideo(options);
        
        if (!result.success) {
          throw new Error(result.error || t('exportFailed'));
        }
        
        setExportState({ isExporting: true, progress: 90, message: t('complete') });
        
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
        // No changes needed, just open the file location
        if (isTauri()) {
          const { open } = await import('@tauri-apps/plugin-shell');
          const folderPath = selectedVideo.file_path.substring(
            0,
            Math.max(selectedVideo.file_path.lastIndexOf('/'), selectedVideo.file_path.lastIndexOf('\\'))
          );
          await open(folderPath);
        }
        setExportState({ isExporting: true, progress: 100, message: t('complete') });
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportState({ 
        isExporting: false, 
        progress: 0, 
        message: error instanceof Error ? error.message : t('exportFailed') 
      });
    } finally {
      setIsLoading(false);
      // Reset export state after a delay
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0, message: '' });
      }, 2000);
    }
  }, [selectedVideo, trimRange, duration, exportFormat, exportQuality, refreshHistory, t]);

  // Format time for display
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Trim times in milliseconds
  const trimStartTime = (trimRange.start / 100) * duration;
  const trimEndTime = (trimRange.end / 100) * duration;
  const trimmedDuration = trimEndTime - trimStartTime;

  // Not available in web
  if (!isTauri()) {
    return (
      <div className="h-full flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('tauriRequired')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-2 sm:px-4 py-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="px-2 sm:px-3">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('back')}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-md bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Film className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <h1 className="font-semibold text-sm sm:text-base">{t('title')}</h1>
          </div>
        </div>

        {/* Recording Controls */}
        {isRecordingAvailable && (
          <div className="flex items-center gap-2">
            {/* Monitor Selection (when not recording) */}
            {!isRecording && monitors.length > 1 && (
              <Select 
                value={selectedMonitor?.toString() ?? '0'} 
                onValueChange={(v) => setSelectedMonitor(parseInt(v))}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <Monitor className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monitors.map((monitor) => (
                    <SelectItem key={monitor.index} value={monitor.index.toString()}>
                      {monitor.name || `Monitor ${monitor.index + 1}`}
                      {monitor.is_primary && ' ★'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Recording Status/Duration */}
            {isRecording && (
              <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
                <Disc className={cn("h-3 w-3 text-red-500", !isPaused && "animate-pulse")} />
                <span className="text-xs font-medium text-red-500">
                  {formatRecordingDuration(recordingDuration)}
                </span>
              </div>
            )}

            {isCountdown && (
              <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <Clock className="h-3 w-3 text-yellow-500 animate-pulse" />
                <span className="text-xs font-medium text-yellow-500">{t('countdown')}</span>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                <span className="text-xs font-medium text-blue-500">{t('processing')}</span>
              </div>
            )}

            {/* Start Recording */}
            {!isRecording && !isCountdown && !isProcessing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-red-500 hover:bg-red-600 text-white"
                    onClick={() => startFullscreen(selectedMonitor ?? 0)}
                  >
                    <Circle className="h-3 w-3 mr-1 fill-current" />
                    <span className="hidden sm:inline">{t('startRecording')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('startRecordingTooltip')}</TooltipContent>
              </Tooltip>
            )}

            {/* Pause/Resume (when recording) */}
            {isRecording && !isPaused && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={pauseRecording}>
                    <Pause className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{t('pause')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('pauseRecording')}</TooltipContent>
              </Tooltip>
            )}

            {isRecording && isPaused && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={resumeRecording}>
                    <Play className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">{t('resume')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('resumeRecording')}</TooltipContent>
              </Tooltip>
            )}

            {/* Stop Recording */}
            {isRecording && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={stopRecording}
                  >
                    <Square className="h-3 w-3 mr-1 fill-current" />
                    <span className="hidden sm:inline">{t('stop')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('stopRecording')}</TooltipContent>
              </Tooltip>
            )}

            {/* Cancel Recording */}
            {isRecording && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelRecording}>
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('cancelRecording')}</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshHistory()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showSidebar ? t('hideSidebar') : t('showSidebar')}</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Recording Error Alert */}
      {recordingError && (
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
        {/* Sidebar - Recording History */}
        {showSidebar && (
          <aside className="w-full sm:w-64 md:w-72 border-r flex flex-col shrink-0 absolute sm:relative inset-0 z-10 bg-background sm:bg-transparent">
            <div className="p-3 sm:p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium">{t('recordings')}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:hidden"
                  onClick={() => setShowSidebar(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Input
                placeholder={t('searchRecordings')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('noRecordings')}</p>
                  </div>
                ) : (
                  filteredHistory.map((entry) => (
                    <Card
                      key={entry.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-accent",
                        selectedVideo?.id === entry.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleSelectVideo(entry)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          <div className="w-16 h-10 bg-muted rounded flex items-center justify-center shrink-0 overflow-hidden">
                            {entry.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`data:image/png;base64,${entry.thumbnail}`}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Film className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {entry.mode}
                              </Badge>
                              {entry.is_pinned && (
                                <Pin className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDuration(entry.duration_ms)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <FolderOpen className="h-4 w-4 mr-2" />
                                {t('openFolder')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(entry.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedVideo ? (
            <>
              {/* Video player */}
              <div 
                className="flex-1 bg-black flex items-center justify-center relative overflow-hidden group"
                onClick={togglePlay}
                onDoubleClick={() => setZoomLevel(zoomLevel === 1 ? 2 : 1)}
              >
                {selectedVideo.file_path ? (
                  <>
                    <video
                      ref={videoRef}
                      src={`file://${selectedVideo.file_path}`}
                      className="max-w-full max-h-full transition-transform duration-200"
                      style={{ transform: `scale(${zoomLevel})` }}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleEnded}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    
                    {/* Play/Pause overlay on hover */}
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity",
                      isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                    )}>
                      <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        {isPlaying ? (
                          <Pause className="h-8 w-8 text-black" />
                        ) : (
                          <Play className="h-8 w-8 text-black ml-1" />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-white/50 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                    <p>{t('videoNotFound')}</p>
                  </div>
                )}
                
                {/* Zoom controls */}
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => { e.stopPropagation(); setZoomLevel(Math.max(0.5, zoomLevel - 0.25)); }}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('zoomOut') || 'Zoom Out'}</TooltipContent>
                  </Tooltip>
                  <button 
                    className="text-white text-xs w-12 text-center hover:bg-white/20 rounded py-1"
                    onClick={(e) => { e.stopPropagation(); setZoomLevel(1); }}
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => { e.stopPropagation(); setZoomLevel(Math.min(3, zoomLevel + 0.25)); }}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('zoomIn') || 'Zoom In'}</TooltipContent>
                  </Tooltip>
                </div>
                
                {/* Video info overlay */}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">
                    {selectedVideo.width}×{selectedVideo.height} • {selectedVideo.mode}
                  </p>
                </div>
              </div>

              {/* Timeline and controls */}
              <div className="border-t bg-background p-4 space-y-4">
                {/* Timeline */}
                <div ref={timelineRef} className="relative">
                  {/* Trim range indicator */}
                  <div
                    className="absolute h-2 bg-primary/20 rounded top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                      left: `${trimRange.start}%`,
                      width: `${trimRange.end - trimRange.start}%`,
                    }}
                  />
                  
                  {/* Progress slider */}
                  <Slider
                    value={[progressPercent]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="cursor-pointer"
                  />
                  
                  {/* Time markers */}
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback controls */}
                <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                  <Button variant="ghost" size="icon" onClick={skipBackward}>
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="default"
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 sm:h-6 sm:w-6" />
                    ) : (
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 ml-0.5" />
                    )}
                  </Button>
                  
                  <Button variant="ghost" size="icon" onClick={skipForward}>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  
                  {/* Volume */}
                  <div className="hidden sm:flex items-center gap-2 ml-4">
                    <Button variant="ghost" size="icon" onClick={toggleMute}>
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* Trim controls */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scissors className="h-4 w-4" />
                      {t('trimVideo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">{t('trimStart')}</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[trimRange.start]}
                            onValueChange={handleTrimStart}
                            max={100}
                            step={0.1}
                            className="flex-1"
                          />
                          <span className="text-xs font-mono w-20">
                            {formatTime(trimStartTime)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t('trimEnd')}</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[trimRange.end]}
                            onValueChange={handleTrimEnd}
                            max={100}
                            step={0.1}
                            className="flex-1"
                          />
                          <span className="text-xs font-mono w-20">
                            {formatTime(trimEndTime)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {t('trimmedDuration')}: {formatTime(trimmedDuration)}
                      </p>
                      <Button
                        size="sm"
                        onClick={applyTrim}
                        disabled={isTrimming || (trimRange.start === 0 && trimRange.end === 100)}
                      >
                        {isTrimming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {t('applyTrim')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Export controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
                    {/* Video info */}
                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Monitor className="h-4 w-4" />
                        {selectedVideo.width}×{selectedVideo.height}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(selectedVideo.duration_ms)}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        {formatFileSize(selectedVideo.file_size)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-end">
                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as typeof exportFormat)}>
                      <SelectTrigger className="w-24 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                        <SelectItem value="gif">GIF</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {exportFormat !== 'gif' && (
                      <Select 
                        value={exportQuality.toString()} 
                        onValueChange={(v) => setExportQuality(parseInt(v))}
                      >
                        <SelectTrigger className="w-28 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">{t('qualityHigh')}</SelectItem>
                          <SelectItem value="80">{t('qualityMedium')}</SelectItem>
                          <SelectItem value="50">{t('qualityLow')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    {exportState.isExporting && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${exportState.progress}%` }}
                          />
                        </div>
                        <span className="w-8">{exportState.progress}%</span>
                      </div>
                    )}
                    
                    <Button onClick={handleExport} disabled={isLoading || exportState.isExporting}>
                      {isLoading || exportState.isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {t('export')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Film className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h2 className="text-lg font-medium mb-2">{t('noVideoSelected')}</h2>
                <p className="text-sm">{t('selectFromSidebar')}</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('deleteDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
