'use client';

/**
 * VideoTrimmer - Component for trimming video clips
 * Features:
 * - Visual trim handles
 * - In/out point markers
 * - Waveform/thumbnail preview
 * - Precise time input
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';

export interface VideoTrimmerProps {
  sourceUrl: string;
  duration: number;
  inPoint: number;
  outPoint: number;
  onInPointChange: (time: number) => void;
  onOutPointChange: (time: number) => void;
  onConfirm: (inPoint: number, outPoint: number) => void;
  onCancel: () => void;
  className?: string;
}

export function VideoTrimmer({
  sourceUrl,
  duration,
  inPoint,
  outPoint,
  onInPointChange,
  onOutPointChange,
  onConfirm,
  onCancel,
  className,
}: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(inPoint);
  const [isDragging, setIsDragging] = useState<'in' | 'out' | 'playhead' | null>(null);

  // Format time as MM:SS.ms
  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  }, []);

  // Parse time from string
  const parseTime = useCallback((timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const [min, secMs] = parts;
      const [sec, ms] = secMs.split('.');
      return Number(min) * 60 + Number(sec) + (Number(ms) || 0) / 100;
    }
    return parseFloat(timeStr) || 0;
  }, []);

  // Handle video time update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Loop within trim region
      if (video.currentTime >= outPoint) {
        video.currentTime = inPoint;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [inPoint, outPoint]);

  // Sync video with currentTime
  useEffect(() => {
    if (videoRef.current && !isDragging) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime, isDragging]);

  // Play/pause
  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.currentTime = currentTime < inPoint ? inPoint : currentTime;
      video.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, inPoint]);

  // Seek to in point
  const seekToIn = useCallback(() => {
    setCurrentTime(inPoint);
    if (videoRef.current) {
      videoRef.current.currentTime = inPoint;
    }
  }, [inPoint]);

  // Seek to out point
  const seekToOut = useCallback(() => {
    setCurrentTime(outPoint);
    if (videoRef.current) {
      videoRef.current.currentTime = outPoint;
    }
  }, [outPoint]);

  // Set in point to current time
  const setInToCurrent = useCallback(() => {
    if (currentTime < outPoint - 0.1) {
      onInPointChange(currentTime);
    }
  }, [currentTime, outPoint, onInPointChange]);

  // Set out point to current time
  const setOutToCurrent = useCallback(() => {
    if (currentTime > inPoint + 0.1) {
      onOutPointChange(currentTime);
    }
  }, [currentTime, inPoint, onOutPointChange]);

  // Reset trim to full duration
  const resetTrim = useCallback(() => {
    onInPointChange(0);
    onOutPointChange(duration);
    setCurrentTime(0);
  }, [duration, onInPointChange, onOutPointChange]);

  // Handle timeline click/drag
  const handleTimelineMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = (x / rect.width) * duration;

      // Check if clicking on handles
      const inX = (inPoint / duration) * rect.width;
      const outX = (outPoint / duration) * rect.width;

      if (Math.abs(x - inX) < 10) {
        setIsDragging('in');
      } else if (Math.abs(x - outX) < 10) {
        setIsDragging('out');
      } else {
        setIsDragging('playhead');
        setCurrentTime(Math.max(0, Math.min(duration, time)));
      }
    },
    [duration, inPoint, outPoint]
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = Math.max(0, Math.min(duration, (x / rect.width) * duration));

      if (isDragging === 'in') {
        if (time < outPoint - 0.1) {
          onInPointChange(time);
        }
      } else if (isDragging === 'out') {
        if (time > inPoint + 0.1) {
          onOutPointChange(time);
        }
      } else if (isDragging === 'playhead') {
        setCurrentTime(time);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, inPoint, outPoint, onInPointChange, onOutPointChange]);

  const trimDuration = outPoint - inPoint;
  const inPercent = (inPoint / duration) * 100;
  const outPercent = (outPoint / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;

  return (
    <div className={cn('flex flex-col gap-4 p-4 bg-background rounded-lg border', className)}>
      {/* Video preview */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={sourceUrl}
          className="w-full h-full object-contain"
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Play/pause overlay */}
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          onClick={togglePlayback}
        >
          {isPlaying ? (
            <Pause className="h-16 w-16 text-white" />
          ) : (
            <Play className="h-16 w-16 text-white" />
          )}
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <div
          ref={timelineRef}
          className="relative h-12 bg-muted rounded cursor-pointer"
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Trim region highlight */}
          <div
            className="absolute top-0 bottom-0 bg-primary/20"
            style={{
              left: `${inPercent}%`,
              width: `${outPercent - inPercent}%`,
            }}
          />

          {/* Excluded regions */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/50"
            style={{ width: `${inPercent}%` }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/50"
            style={{ width: `${100 - outPercent}%` }}
          />

          {/* In point handle */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize z-10"
            style={{ left: `${inPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-green-500 rounded-sm" />
          </div>

          {/* Out point handle */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-red-500 cursor-ew-resize z-10"
            style={{ left: `${outPercent}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-sm" />
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
            style={{ left: `${currentPercent}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>

        {/* Time labels */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(0)}</span>
          <span className="font-medium text-foreground">{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={seekToIn}>
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to in point</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={togglePlayback}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={seekToOut}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to out point</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4">
          {/* In point */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-green-500">In</Label>
            <Input
              value={formatTime(inPoint)}
              onChange={(e) => {
                const time = parseTime(e.target.value);
                if (time < outPoint - 0.1) {
                  onInPointChange(time);
                }
              }}
              className="w-24 h-8 text-xs font-mono"
            />
            <Button variant="ghost" size="sm" onClick={setInToCurrent}>
              Set
            </Button>
          </div>

          {/* Out point */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-red-500">Out</Label>
            <Input
              value={formatTime(outPoint)}
              onChange={(e) => {
                const time = parseTime(e.target.value);
                if (time > inPoint + 0.1 && time <= duration) {
                  onOutPointChange(time);
                }
              }}
              className="w-24 h-8 text-xs font-mono"
            />
            <Button variant="ghost" size="sm" onClick={setOutToCurrent}>
              Set
            </Button>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <Label className="text-xs">Duration</Label>
            <span className="text-sm font-mono">{formatTime(trimDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={resetTrim}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset trim</TooltipContent>
          </Tooltip>

          <Button variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>

          <Button onClick={() => onConfirm(inPoint, outPoint)}>
            <Check className="h-4 w-4 mr-2" />
            Apply Trim
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VideoTrimmer;
