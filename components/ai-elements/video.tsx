'use client';

/**
 * Video Component - Display and control AI-generated videos
 * 
 * Features:
 * - Video playback with custom controls
 * - Progress indicator for generating videos
 * - Download functionality
 * - Fullscreen support
 * - Thumbnail display
 * - Playback speed control
 * - Picture-in-Picture support
 * - Volume slider
 * - Loop toggle
 * - Keyboard shortcuts
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn, formatVideoTime } from '@/lib/utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PictureInPicture2,
  Repeat,
  Gauge,
  SkipBack,
  SkipForward,
  Camera,
  Images,
  X,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { GeneratedVideo, VideoStatus } from '@/types/video';
import { downloadVideoAsBlob, saveVideoToFile, base64ToVideoDataUrl } from '@/lib/ai/video-generation';

// Playback speed options
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Screenshot history item
export interface ScreenshotItem {
  id: string;
  dataUrl: string;
  timestamp: number;
  createdAt: number;
}

export interface VideoProps {
  video?: GeneratedVideo;
  status?: VideoStatus;
  progress?: number;
  jobId?: string;
  prompt?: string;
  error?: string;
  className?: string;
  onRetry?: () => void;
  onRefreshStatus?: () => void;
  showControls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  enableKeyboardShortcuts?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onScreenshot?: (dataUrl: string, timestamp: number) => void;
  showScreenshotPanel?: boolean;
  onScreenshotPanelToggle?: (show: boolean) => void;
  maxScreenshots?: number;
}

export function Video({
  video,
  status = 'completed',
  progress = 0,
  jobId,
  prompt,
  error,
  className,
  onRetry,
  onRefreshStatus,
  showControls = true,
  autoPlay = false,
  loop: initialLoop = false,
  muted = false,
  enableKeyboardShortcuts = true,
  onTimeUpdate: onTimeUpdateCallback,
  onScreenshot: onScreenshotCallback,
  showScreenshotPanel: externalShowPanel,
  onScreenshotPanelToggle,
  maxScreenshots = 20,
}: VideoProps) {
  const t = useTranslations('video');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(initialLoop);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [showScreenshotFlash, setShowScreenshotFlash] = useState(false);
  const [internalShowPanel, setInternalShowPanel] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Use external or internal panel state
  const showPanel = externalShowPanel !== undefined ? externalShowPanel : internalShowPanel;
  const setShowPanel = onScreenshotPanelToggle || setInternalShowPanel;

  const videoSrc = video?.url || (video?.base64 ? base64ToVideoDataUrl(video.base64) : undefined);

  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleMuteToggle = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    if (!newMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  }, [isMuted, volume]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    if (!videoRef.current) return;
    const vol = newVolume[0];
    setVolume(vol);
    videoRef.current.volume = vol;
    setIsMuted(vol === 0);
  }, []);

  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handlePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  }, []);

  const handlePlaybackSpeedChange = useCallback((speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  }, []);

  const handleLoopToggle = useCallback(() => {
    if (!videoRef.current) return;
    const newLoop = !isLooping;
    videoRef.current.loop = newLoop;
    setIsLooping(newLoop);
  }, [isLooping]);

  const handleSeek = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    videoRef.current.currentTime = newTime;
  }, [duration]);

  const handleScreenshot = useCallback(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    
    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    const timestamp = video.currentTime;
    
    // Create screenshot item
    const screenshotItem: ScreenshotItem = {
      id: `ss-${Date.now()}`,
      dataUrl,
      timestamp,
      createdAt: Date.now(),
    };
    
    // Add to history (limit to maxScreenshots)
    setScreenshots(prev => [screenshotItem, ...prev].slice(0, maxScreenshots));
    
    // Show flash effect
    setShowScreenshotFlash(true);
    setTimeout(() => setShowScreenshotFlash(false), 200);
    
    // Callback if provided
    onScreenshotCallback?.(dataUrl, timestamp);
  }, [onScreenshotCallback, maxScreenshots]);

  // Download a specific screenshot
  const handleDownloadScreenshot = useCallback((item: ScreenshotItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = `screenshot-${formatVideoTime(item.timestamp).replace(':', '-')}-${item.id}.png`;
    link.click();
  }, []);

  // Delete a screenshot from history
  const handleDeleteScreenshot = useCallback((id: string) => {
    setScreenshots(prev => prev.filter(s => s.id !== id));
  }, []);

  // Clear all screenshots
  const handleClearScreenshots = useCallback(() => {
    setScreenshots([]);
  }, []);

  // Jump to screenshot timestamp
  const handleJumpToScreenshot = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!video) return;

    try {
      if (video.url) {
        const blob = await downloadVideoAsBlob(video.url);
        const filename = `video-${video.id || Date.now()}.mp4`;
        saveVideoToFile(blob, filename);
      } else if (video.base64) {
        const byteCharacters = atob(video.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: video.mimeType || 'video/mp4' });
        const filename = `video-${video.id || Date.now()}.mp4`;
        saveVideoToFile(blob, filename);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  }, [video]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdateCallback?.(time, duration);
  }, [duration, onTimeUpdateCallback]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    setIsLoading(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(t('failedToLoad'));
    setIsLoading(false);
  }, [t]);


  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  useEffect(() => {
    setIsMuted(muted);
  }, [muted]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle PiP events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePiPEnter = () => setIsPiPActive(true);
    const handlePiPLeave = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handlePiPEnter);
    video.addEventListener('leavepictureinpicture', handlePiPLeave);

    return () => {
      video.removeEventListener('enterpictureinpicture', handlePiPEnter);
      video.removeEventListener('leavepictureinpicture', handlePiPLeave);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is on the video container or video element
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'm':
          e.preventDefault();
          handleMuteToggle();
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          handlePictureInPicture();
          break;
        case 's':
          e.preventDefault();
          handleScreenshot();
          break;
        case 'l':
          e.preventDefault();
          handleLoopToggle();
          break;
        case 'arrowleft':
          e.preventDefault();
          handleSeek(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          handleSeek(5);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange([Math.min(volume + 0.1, 1)]);
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange([Math.max(volume - 0.1, 0)]);
          break;
        case ',':
          e.preventDefault();
          const prevSpeed = PLAYBACK_SPEEDS[Math.max(0, PLAYBACK_SPEEDS.indexOf(playbackSpeed) - 1)];
          handlePlaybackSpeedChange(prevSpeed);
          break;
        case '.':
          e.preventDefault();
          const nextSpeed = PLAYBACK_SPEEDS[Math.min(PLAYBACK_SPEEDS.length - 1, PLAYBACK_SPEEDS.indexOf(playbackSpeed) + 1)];
          handlePlaybackSpeedChange(nextSpeed);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          if (videoRef.current && duration) {
            const percent = parseInt(e.key) / 10;
            videoRef.current.currentTime = duration * percent;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, handlePlayPause, handleMuteToggle, handleFullscreen, handlePictureInPicture, handleLoopToggle, handleSeek, handleVolumeChange, volume, playbackSpeed, handlePlaybackSpeedChange, duration, handleScreenshot]);

  // Get volume icon based on level
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Render loading/processing state
  if (status === 'pending' || status === 'processing') {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-6',
          className
        )}
        style={{ aspectRatio: '16/9', minHeight: 200 }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium mb-2">
          {status === 'pending' ? t('preparing') : t('generating')}
        </p>
        {progress > 0 && (
          <div className="w-full max-w-xs">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center mt-1">
              {t('progressComplete', { progress })}
            </p>
          </div>
        )}
        {jobId && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('jobId')}: {jobId}
          </p>
        )}
        {prompt && (
          <p className="text-xs text-muted-foreground mt-2 max-w-md text-center line-clamp-2">
            &quot;{prompt}&quot;
          </p>
        )}
        {onRefreshStatus && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={onRefreshStatus}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('checkStatus')}
          </Button>
        )}
      </div>
    );
  }

  // Render error state
  if (status === 'failed' || error || videoError) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-6',
          className
        )}
        style={{ aspectRatio: '16/9', minHeight: 200 }}
      >
        <AlertCircle className="h-8 w-8 text-destructive mb-4" />
        <p className="text-sm font-medium text-destructive mb-2">
          {t('generationFailed')}
        </p>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          {error || videoError || t('unknownError')}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('tryAgain')}
          </Button>
        )}
      </div>
    );
  }

  // Render completed video
  if (!videoSrc) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border bg-muted/30 p-6',
          className
        )}
        style={{ aspectRatio: '16/9', minHeight: 200 }}
      >
        <CheckCircle2 className="h-8 w-8 text-green-500 mb-4" />
        <p className="text-sm font-medium mb-2">{t('generatedSuccessfully')}</p>
        <p className="text-xs text-muted-foreground">
          {t('urlNotAvailable')}
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn('relative rounded-lg overflow-hidden group', isFullscreen && 'bg-black', className)}
      tabIndex={0}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={video?.thumbnailUrl || (video?.thumbnailBase64 ? `data:image/jpeg;base64,${video.thumbnailBase64}` : undefined)}
        autoPlay={autoPlay}
        loop={isLooping}
        muted={isMuted}
        playsInline
        className={cn('w-full h-auto', isFullscreen && 'h-full object-contain')}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleVideoError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => !isLooping && setIsPlaying(false)}
      />

      {/* Hidden canvas for screenshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Screenshot flash effect */}
      {showScreenshotFlash && (
        <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" />
      )}

      {/* Screenshot History Panel */}
      {showPanel && screenshots.length > 0 && (
        <div className="absolute top-0 right-0 bottom-0 w-48 bg-black/90 border-l border-white/20 flex flex-col z-10">
          <div className="flex items-center justify-between p-2 border-b border-white/20">
            <span className="text-xs text-white font-medium">Screenshots ({screenshots.length})</span>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
                      onClick={handleClearScreenshots}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20"
                onClick={() => setShowPanel(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {screenshots.map((item) => (
              <div
                key={item.id}
                className="group relative rounded overflow-hidden cursor-pointer"
                onClick={() => handleJumpToScreenshot(item.timestamp)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.dataUrl}
                  alt={`Screenshot at ${formatVideoTime(item.timestamp)}`}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadScreenshot(item);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.dataUrl, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open in new tab</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-white hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScreenshot(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                  <span className="text-[10px] text-white">{formatVideoTime(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Controls overlay */}
      {showControls && !isLoading && (
        <div className={cn(
          'absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity',
          isFullscreen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          {/* Progress bar */}
          <div className="px-3">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Number(e.target.value);
                }
              }}
              className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              {/* Skip backward */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => handleSeek(-10)}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>-10s (←)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Play/Pause */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={handlePlayPause}
                    >
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPlaying ? t('pause') : t('play')} (K)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Skip forward */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => handleSeek(10)}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>+10s (→)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Volume control with slider */}
              <Popover open={showVolumeSlider} onOpenChange={setShowVolumeSlider}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleMuteToggle}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                  >
                    <VolumeIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  className="w-10 p-2 bg-black/80 border-white/20"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <Slider
                    orientation="vertical"
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="h-24"
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs text-white ml-2">
                {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Loop toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-8 w-8 text-white hover:bg-white/20',
                        isLooping && 'bg-white/20'
                      )}
                      onClick={handleLoopToggle}
                    >
                      <Repeat className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isLooping ? 'Disable loop' : 'Enable loop'} (L)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Playback speed */}
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                        >
                          <Gauge className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{playbackSpeed}x (,/.)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end" className="bg-black/90 border-white/20">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => handlePlaybackSpeedChange(speed)}
                      className={cn(
                        'text-white hover:bg-white/20',
                        playbackSpeed === speed && 'bg-white/20'
                      )}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {video && (
                <Badge variant="secondary" className="text-xs mx-1">
                  {video.width}x{video.height}
                </Badge>
              )}

              {/* Screenshot */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={handleScreenshot}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Screenshot (S)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Screenshot panel toggle */}
              {screenshots.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8 text-white hover:bg-white/20',
                          showPanel && 'bg-white/20'
                        )}
                        onClick={() => setShowPanel(!showPanel)}
                      >
                        <Images className="h-4 w-4" />
                        <span className="absolute -top-1 -right-1 bg-primary text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center">
                          {screenshots.length}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Screenshots ({screenshots.length})</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Download */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={handleDownload}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('download')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Picture-in-Picture */}
              {'pictureInPictureEnabled' in document && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8 text-white hover:bg-white/20',
                          isPiPActive && 'bg-white/20'
                        )}
                        onClick={handlePictureInPicture}
                      >
                        <PictureInPicture2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isPiPActive ? 'Exit PiP' : 'Picture-in-Picture'} (P)</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Fullscreen */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={handleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isFullscreen ? 'Exit fullscreen' : t('fullscreen')} (F)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}

      {/* Revised prompt tooltip */}
      {video?.revisedPrompt && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-xs cursor-help">
                  {t('aiEnhanced')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="text-xs">{video.revisedPrompt}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

/**
 * VideoGrid - Display multiple videos in a grid layout
 */
export interface VideoGridProps {
  videos: Array<{
    video?: GeneratedVideo;
    status?: VideoStatus;
    progress?: number;
    jobId?: string;
    prompt?: string;
    error?: string;
  }>;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  onRetry?: (index: number) => void;
  onRefreshStatus?: (index: number) => void;
}

export function VideoGrid({
  videos,
  columns = 2,
  className,
  onRetry,
  onRefreshStatus,
}: VideoGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {videos.map((item, index) => (
        <Video
          key={item.jobId || index}
          video={item.video}
          status={item.status}
          progress={item.progress}
          jobId={item.jobId}
          prompt={item.prompt}
          error={item.error}
          onRetry={onRetry ? () => onRetry(index) : undefined}
          onRefreshStatus={onRefreshStatus ? () => onRefreshStatus(index) : undefined}
        />
      ))}
    </div>
  );
}

export default Video;
