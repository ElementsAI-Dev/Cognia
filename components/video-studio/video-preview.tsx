'use client';

/**
 * VideoPreview - Video playback preview component
 * Features:
 * - Video playback with controls
 * - Fullscreen support
 * - Frame-by-frame navigation
 * - Playback speed control
 * - Volume control
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
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
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface VideoPreviewProps {
  src: string;
  poster?: string;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  volume?: number;
  muted?: boolean;
  playbackSpeed?: number;
  loop?: boolean;
  showControls?: boolean;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (muted: boolean) => void;
  onEnded?: () => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const FRAME_DURATION = 1 / 30; // Assuming 30fps

export function VideoPreview({
  src,
  poster,
  currentTime: externalCurrentTime,
  isPlaying: externalIsPlaying,
  volume: externalVolume = 1,
  muted: externalMuted = false,
  playbackSpeed = 1,
  loop = false,
  showControls = true,
  onTimeUpdate,
  onDurationChange,
  onPlayingChange,
  onVolumeChange,
  onMutedChange,
  onEnded,
  className,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalDuration, setInternalDuration] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalVolume, setInternalVolume] = useState(externalVolume);
  const [internalMuted, setInternalMuted] = useState(externalMuted);
  const [internalPlaybackSpeed, setInternalPlaybackSpeed] = useState(playbackSpeed);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Use external values if provided, otherwise use internal state
  const currentTime = externalCurrentTime ?? internalCurrentTime;
  const isPlaying = externalIsPlaying ?? internalIsPlaying;
  const volume = externalVolume ?? internalVolume;
  const muted = externalMuted ?? internalMuted;

  // Format time as MM:SS
  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  // Sync external time with video
  useEffect(() => {
    if (videoRef.current && externalCurrentTime !== undefined) {
      if (Math.abs(videoRef.current.currentTime - externalCurrentTime) > 0.1) {
        videoRef.current.currentTime = externalCurrentTime;
      }
    }
  }, [externalCurrentTime]);

  // Sync external playing state
  useEffect(() => {
    if (videoRef.current && externalIsPlaying !== undefined) {
      if (externalIsPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!externalIsPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [externalIsPlaying]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = internalPlaybackSpeed;
    }
  }, [internalPlaybackSpeed]);

  // Sync volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Handle video events
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setInternalCurrentTime(time);
      onTimeUpdate?.(time);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setInternalDuration(duration);
      onDurationChange?.(duration);
    }
  }, [onDurationChange]);

  const handlePlay = useCallback(() => {
    setInternalIsPlaying(true);
    onPlayingChange?.(true);
  }, [onPlayingChange]);

  const handlePause = useCallback(() => {
    setInternalIsPlaying(false);
    onPlayingChange?.(false);
  }, [onPlayingChange]);

  const handleEnded = useCallback(() => {
    setInternalIsPlaying(false);
    onPlayingChange?.(false);
    onEnded?.();
  }, [onPlayingChange, onEnded]);

  // Playback controls
  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, internalDuration));
    }
  }, [internalDuration]);

  const seekToStart = useCallback(() => seek(0), [seek]);
  const seekToEnd = useCallback(() => seek(internalDuration), [seek, internalDuration]);

  const stepForward = useCallback(() => {
    seek(currentTime + FRAME_DURATION);
  }, [currentTime, seek]);

  const stepBackward = useCallback(() => {
    seek(currentTime - FRAME_DURATION);
  }, [currentTime, seek]);

  const handleSeek = useCallback(
    (value: number[]) => {
      seek(value[0]);
    },
    [seek]
  );

  // Volume controls
  const toggleMute = useCallback(() => {
    const newMuted = !muted;
    setInternalMuted(newMuted);
    onMutedChange?.(newMuted);
  }, [muted, onMutedChange]);

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0];
      setInternalVolume(newVolume);
      setInternalMuted(newVolume === 0);
      onVolumeChange?.(newVolume);
      onMutedChange?.(newVolume === 0);
    },
    [onVolumeChange, onMutedChange]
  );

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayback();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(currentTime + 5);
          break;
        case ',':
          e.preventDefault();
          stepBackward();
          break;
        case '.':
          e.preventDefault();
          stepForward();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Home':
          e.preventDefault();
          seekToStart();
          break;
        case 'End':
          e.preventDefault();
          seekToEnd();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayback,
    seek,
    currentTime,
    stepBackward,
    stepForward,
    toggleMute,
    toggleFullscreen,
    seekToStart,
    seekToEnd,
  ]);

  const _progress = internalDuration > 0 ? (currentTime / internalDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        isFullscreen && 'rounded-none',
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop={loop}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onClick={togglePlayback}
      />

      {/* Play/pause overlay */}
      {!isPlaying && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
          onClick={togglePlayback}
          aria-label="Play video"
        >
          <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="h-10 w-10 text-white ml-1" />
          </div>
        </button>
      )}

      {/* Controls */}
      {showControls && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 sm:p-4 transition-opacity',
            isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Progress bar */}
          <div className="mb-2 sm:mb-3">
            <Slider
              value={[currentTime]}
              max={internalDuration || 100}
              step={0.01}
              onValueChange={handleSeek}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* Play/Pause */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                    onClick={togglePlayback}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPlaying ? 'Pause (K)' : 'Play (K)'}</TooltipContent>
              </Tooltip>

              {/* Skip backward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                    onClick={() => seek(currentTime - 10)}
                    aria-label="Skip back 10 seconds"
                  >
                    <SkipBack className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>-10 seconds</TooltipContent>
              </Tooltip>

              {/* Frame backward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                    onClick={stepBackward}
                    aria-label="Previous frame"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous frame (,)</TooltipContent>
              </Tooltip>

              {/* Frame forward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                    onClick={stepForward}
                    aria-label="Next frame"
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next frame (.)</TooltipContent>
              </Tooltip>

              {/* Skip forward */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                    onClick={() => seek(currentTime + 10)}
                    aria-label="Skip forward 10 seconds"
                  >
                    <SkipForward className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>+10 seconds</TooltipContent>
              </Tooltip>

              {/* Volume */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                        onClick={toggleMute}
                        aria-label={muted ? 'Unmute' : 'Mute'}
                      >
                        {muted || volume === 0 ? (
                          <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{muted ? 'Unmute (M)' : 'Mute (M)'}</TooltipContent>
                </Tooltip>
                <PopoverContent align="center" side="top" className="bg-black/90">
                  <Slider
                    orientation="vertical"
                    value={[muted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="h-20"
                  />
                </PopoverContent>
              </Popover>

              {/* Time display */}
              <span className="text-white text-xs sm:text-sm font-mono ml-1 sm:ml-2">
                {formatTime(currentTime)} / {formatTime(internalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Playback speed */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 sm:h-8 text-white hover:bg-white/20"
                  >
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                    <span className="text-xs sm:text-sm">{internalPlaybackSpeed}x</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => setInternalPlaybackSpeed(speed)}
                      className={cn(
                        internalPlaybackSpeed === speed && 'bg-muted'
                      )}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fullscreen */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <Maximize className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPreview;
