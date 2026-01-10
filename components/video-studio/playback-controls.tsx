'use client';

/**
 * PlaybackControls - Reusable media playback control component
 * 
 * Provides standardized controls for video/audio playback:
 * - Play/Pause toggle
 * - Skip forward/backward
 * - Progress scrubbing
 * - Volume control
 * - Playback speed
 * - Fullscreen toggle
 * 
 * Follows existing patterns from video-editor page and audio-provider
 */

import { useCallback, useState } from 'react';
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
  RotateCcw,
} from 'lucide-react';

export interface PlaybackControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume?: number;
  muted?: boolean;
  playbackSpeed?: number;
  isFullscreen?: boolean;
  showVolumeControl?: boolean;
  showSpeedControl?: boolean;
  showFullscreenControl?: boolean;
  showSkipControls?: boolean;
  showFrameControls?: boolean;
  skipAmount?: number;
  frameRate?: number;
  compact?: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMutedChange?: (muted: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  onFullscreenToggle?: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onFrameBack?: () => void;
  onFrameForward?: () => void;
  onReset?: () => void;
  className?: string;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume = 1,
  muted = false,
  playbackSpeed = 1,
  isFullscreen = false,
  showVolumeControl = true,
  showSpeedControl = true,
  showFullscreenControl = false,
  showSkipControls = true,
  showFrameControls = false,
  skipAmount = 10,
  frameRate = 30,
  compact = false,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMutedChange,
  onSpeedChange,
  onFullscreenToggle,
  onSkipBack,
  onSkipForward,
  onFrameBack,
  onFrameForward,
  onReset,
  className,
}: PlaybackControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Handle progress slider change
  const handleProgressChange = useCallback(
    (value: number[]) => {
      const time = (value[0] / 100) * duration;
      onSeek(time);
    },
    [duration, onSeek]
  );

  // Handle skip back
  const handleSkipBack = useCallback(() => {
    if (onSkipBack) {
      onSkipBack();
    } else {
      onSeek(Math.max(0, currentTime - skipAmount));
    }
  }, [onSkipBack, onSeek, currentTime, skipAmount]);

  // Handle skip forward
  const handleSkipForward = useCallback(() => {
    if (onSkipForward) {
      onSkipForward();
    } else {
      onSeek(Math.min(duration, currentTime + skipAmount));
    }
  }, [onSkipForward, onSeek, currentTime, duration, skipAmount]);

  // Handle frame navigation
  const handleFrameBack = useCallback(() => {
    if (onFrameBack) {
      onFrameBack();
    } else {
      onSeek(Math.max(0, currentTime - 1 / frameRate));
    }
  }, [onFrameBack, onSeek, currentTime, frameRate]);

  const handleFrameForward = useCallback(() => {
    if (onFrameForward) {
      onFrameForward();
    } else {
      onSeek(Math.min(duration, currentTime + 1 / frameRate));
    }
  }, [onFrameForward, onSeek, currentTime, duration, frameRate]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (value: number[]) => {
      onVolumeChange?.(value[0] / 100);
    },
    [onVolumeChange]
  );

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const buttonSize = compact ? 'sm' : 'default';
  const iconSize = compact ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[progressPercent]}
          onValueChange={handleProgressChange}
          max={100}
          step={0.1}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
          {formatTime(duration)}
        </span>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-1">
        {/* Reset button */}
        {onReset && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size={buttonSize} onClick={onReset}>
                <RotateCcw className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset</TooltipContent>
          </Tooltip>
        )}

        {/* Frame back */}
        {showFrameControls && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size={buttonSize} onClick={handleFrameBack}>
                <ChevronLeft className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous Frame</TooltipContent>
          </Tooltip>
        )}

        {/* Skip back */}
        {showSkipControls && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size={buttonSize} onClick={handleSkipBack}>
                <SkipBack className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back {skipAmount}s</TooltipContent>
          </Tooltip>
        )}

        {/* Play/Pause */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={buttonSize}
              onClick={onPlayPause}
              className={compact ? '' : 'h-10 w-10'}
            >
              {isPlaying ? (
                <Pause className={compact ? iconSize : 'h-6 w-6'} />
              ) : (
                <Play className={compact ? iconSize : 'h-6 w-6'} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
        </Tooltip>

        {/* Skip forward */}
        {showSkipControls && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size={buttonSize} onClick={handleSkipForward}>
                <SkipForward className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward {skipAmount}s</TooltipContent>
          </Tooltip>
        )}

        {/* Frame forward */}
        {showFrameControls && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size={buttonSize} onClick={handleFrameForward}>
                <ChevronRight className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next Frame</TooltipContent>
          </Tooltip>
        )}

        {/* Volume control */}
        {showVolumeControl && (
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={buttonSize}
                  onClick={() => onMutedChange?.(!muted)}
                >
                  {muted || volume === 0 ? (
                    <VolumeX className={iconSize} />
                  ) : (
                    <Volume2 className={iconSize} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{muted ? 'Unmute' : 'Mute'}</TooltipContent>
            </Tooltip>
            
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-popover border rounded-md shadow-md">
                <Slider
                  value={[muted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  orientation="vertical"
                  className="h-20"
                />
              </div>
            )}
          </div>
        )}

        {/* Speed control */}
        {showSpeedControl && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size={buttonSize}>
                    <Settings className={iconSize} />
                    <span className="ml-1 text-xs">{playbackSpeed}x</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Playback Speed</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="center">
              {PLAYBACK_SPEEDS.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onClick={() => onSpeedChange?.(speed)}
                  className={speed === playbackSpeed ? 'bg-accent' : ''}
                >
                  {speed}x
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Fullscreen */}
        {showFullscreenControl && onFullscreenToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size={buttonSize} onClick={onFullscreenToggle}>
                {isFullscreen ? (
                  <Minimize className={iconSize} />
                ) : (
                  <Maximize className={iconSize} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
