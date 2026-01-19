'use client';

/**
 * VideoTimeline - Visual timeline component for video editing
 * Features:
 * - Multi-track timeline view
 * - Drag and drop clips
 * - Playhead with scrubbing
 * - Zoom and pan controls
 * - Time ruler with markers
 * - Clip selection and editing
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Magnet,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Scissors,
  Copy,
  GripVertical,
} from 'lucide-react';
import type { VideoTrack, VideoClip } from '@/hooks/video-studio/use-video-editor';

export interface VideoTimelineProps {
  tracks: VideoTrack[];
  currentTime: number;
  duration: number;
  zoom: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  snapEnabled?: boolean;
  pixelsPerSecond?: number;
  onTimeChange: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSeekStart: () => void;
  onSeekEnd: () => void;
  onZoomChange: (zoom: number) => void;
  onClipSelect: (clipIds: string[]) => void;
  onClipMove: (clipId: string, trackId: string, newStartTime: number) => void;
  onClipTrim: (clipId: string, newStart: number, newEnd: number) => void;
  onClipSplit: (clipId: string, atTime: number) => void;
  onClipDelete: (clipId: string) => void;
  onClipDuplicate: (clipId: string) => void;
  onTrackSelect: (trackId: string | null) => void;
  onTrackAdd: (type: VideoTrack['type']) => void;
  onTrackDelete?: (trackId: string) => void;
  onTrackMute: (trackId: string, muted: boolean) => void;
  onTrackLock: (trackId: string, locked: boolean) => void;
  onTrackVisible: (trackId: string, visible: boolean) => void;
  onSnapToggle?: () => void;
  className?: string;
}

const TRACK_HEIGHT = 60;
const RULER_HEIGHT = 30;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

export function VideoTimeline({
  tracks,
  currentTime,
  duration,
  zoom,
  isPlaying,
  selectedClipIds,
  selectedTrackId,
  snapEnabled = true,
  pixelsPerSecond = 100,
  onTimeChange,
  onPlay,
  onPause,
  onSeekStart,
  onSeekEnd,
  onZoomChange,
  onClipSelect,
  onClipMove,
  onClipTrim,
  onClipSplit,
  onClipDelete,
  onClipDuplicate,
  onTrackSelect,
  onTrackAdd,
  onTrackDelete: _onTrackDelete,
  onTrackMute,
  onTrackLock,
  onTrackVisible,
  onSnapToggle,
  className,
}: VideoTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'playhead' | 'clip' | 'trim-start' | 'trim-end' | null>(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  const effectivePixelsPerSecond = pixelsPerSecond * zoom;
  const timelineWidth = duration * effectivePixelsPerSecond;

  // Convert time to pixels
  const timeToPixels = useCallback(
    (time: number) => time * effectivePixelsPerSecond,
    [effectivePixelsPerSecond]
  );

  // Convert pixels to time
  const pixelsToTime = useCallback(
    (pixels: number) => pixels / effectivePixelsPerSecond,
    [effectivePixelsPerSecond]
  );

  // Format time for display
  const formatTime = useCallback((time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const frames = Math.floor((time % 1) * 30);

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  }, []);

  // Generate ruler marks
  const generateRulerMarks = useCallback(() => {
    const marks: Array<{ time: number; label: string; major: boolean }> = [];
    
    // Determine interval based on zoom level
    let interval = 1; // seconds
    if (zoom < 0.3) interval = 10;
    else if (zoom < 0.5) interval = 5;
    else if (zoom < 1) interval = 2;
    else if (zoom > 3) interval = 0.5;
    else if (zoom > 5) interval = 0.25;

    for (let t = 0; t <= duration; t += interval) {
      const isMajor = t % (interval * 5) === 0 || t === 0;
      marks.push({
        time: t,
        label: isMajor ? formatTime(t) : '',
        major: isMajor,
      });
    }

    return marks;
  }, [duration, zoom, formatTime]);

  // Handle ruler click for seeking
  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const time = pixelsToTime(x);
      onTimeChange(Math.max(0, Math.min(duration, time)));
    },
    [pixelsToTime, duration, onTimeChange]
  );

  // Handle playhead drag start
  const handlePlayheadDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setDragType('playhead');
      setDragStartX(e.clientX);
      setDragStartTime(currentTime);
      onSeekStart();
    },
    [currentTime, onSeekStart]
  );

  // Handle clip drag start
  const handleClipDragStart = useCallback(
    (e: React.MouseEvent, clip: VideoClip) => {
      e.stopPropagation();
      setIsDragging(true);
      setDragType('clip');
      setDragClipId(clip.id);
      setDragStartX(e.clientX);
      setDragStartTime(clip.startTime);
      onClipSelect([clip.id]);
    },
    [onClipSelect]
  );

  // Handle trim handle drag start
  const handleTrimDragStart = useCallback(
    (e: React.MouseEvent, clip: VideoClip, type: 'trim-start' | 'trim-end') => {
      e.stopPropagation();
      setIsDragging(true);
      setDragType(type);
      setDragClipId(clip.id);
      setDragStartX(e.clientX);
      setDragStartTime(type === 'trim-start' ? clip.sourceStartTime : clip.sourceEndTime);
    },
    []
  );

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = pixelsToTime(deltaX);

      if (dragType === 'playhead') {
        const newTime = Math.max(0, Math.min(duration, dragStartTime + deltaTime));
        onTimeChange(newTime);
      } else if (dragType === 'clip' && dragClipId) {
        const newStartTime = Math.max(0, dragStartTime + deltaTime);
        // Find the track containing this clip
        for (const track of tracks) {
          const clip = track.clips.find((c) => c.id === dragClipId);
          if (clip) {
            onClipMove(dragClipId, track.id, newStartTime);
            break;
          }
        }
      } else if ((dragType === 'trim-start' || dragType === 'trim-end') && dragClipId) {
        // Handle trimming
        for (const track of tracks) {
          const clip = track.clips.find((c) => c.id === dragClipId);
          if (clip) {
            if (dragType === 'trim-start') {
              const newStart = Math.max(0, dragStartTime + deltaTime);
              onClipTrim(dragClipId, newStart, clip.sourceEndTime);
            } else {
              const newEnd = Math.max(clip.sourceStartTime + 0.1, dragStartTime + deltaTime);
              onClipTrim(dragClipId, clip.sourceStartTime, newEnd);
            }
            break;
          }
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
      setDragClipId(null);
      if (dragType === 'playhead') {
        onSeekEnd();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    dragType,
    dragClipId,
    dragStartX,
    dragStartTime,
    duration,
    tracks,
    pixelsToTime,
    onTimeChange,
    onClipMove,
    onClipTrim,
    onSeekEnd,
  ]);

  // Handle clip click
  const handleClipClick = useCallback(
    (e: React.MouseEvent, clip: VideoClip) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        if (selectedClipIds.includes(clip.id)) {
          onClipSelect(selectedClipIds.filter((id) => id !== clip.id));
        } else {
          onClipSelect([...selectedClipIds, clip.id]);
        }
      } else {
        onClipSelect([clip.id]);
      }
    },
    [selectedClipIds, onClipSelect]
  );

  // Handle track click
  const handleTrackClick = useCallback(
    (trackId: string) => {
      onTrackSelect(trackId);
      onClipSelect([]);
    },
    [onTrackSelect, onClipSelect]
  );

  // Handle split at playhead
  const handleSplitAtPlayhead = useCallback(() => {
    if (selectedClipIds.length === 1) {
      onClipSplit(selectedClipIds[0], currentTime);
    }
  }, [selectedClipIds, currentTime, onClipSplit]);

  const rulerMarks = generateRulerMarks();

  return (
    <div className={cn('flex flex-col bg-background border rounded-lg', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-1">
          {/* Playback controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSeekStart}>
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to start</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={isPlaying ? onPause : onPlay}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSeekEnd}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to end</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Time display */}
          <div className="text-sm font-mono px-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Edit tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSplitAtPlayhead}
                disabled={selectedClipIds.length !== 1}
              >
                <Scissors className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Split at playhead</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => selectedClipIds.forEach(onClipDuplicate)}
                disabled={selectedClipIds.length === 0}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => selectedClipIds.forEach(onClipDelete)}
                disabled={selectedClipIds.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Snap toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={snapEnabled ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={onSnapToggle}
              >
                <Magnet className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Snap {snapEnabled ? 'On' : 'Off'}</TooltipContent>
          </Tooltip>

          {/* Zoom controls */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom / 1.25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom * 1.25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onZoomChange(1)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit to view</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Timeline content */}
      <ResizablePanelGroup direction="horizontal" className="flex flex-1 overflow-hidden">
        {/* Track headers */}
        <ResizablePanel defaultSize={20} minSize={10} maxSize={30}>
          <div className="h-full border-r bg-muted/30 overflow-hidden">
            {/* Ruler header */}
            <div
              className="flex items-center justify-between px-2 border-b bg-muted/50"
              style={{ height: RULER_HEIGHT }}
            >
              <span className="text-xs font-medium">Tracks</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onTrackAdd('video')}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Track headers */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  'flex items-center gap-2 px-2 border-b cursor-pointer transition-colors',
                  selectedTrackId === track.id ? 'bg-muted' : 'hover:bg-muted/50'
                )}
                style={{ height: track.height || TRACK_HEIGHT }}
                onClick={() => handleTrackClick(track.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium truncate block">{track.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackVisible(track.id, !track.visible);
                    }}
                  >
                    {track.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackMute(track.id, !track.muted);
                    }}
                  >
                    {track.muted ? (
                      <VolumeX className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Volume2 className="h-3 w-3" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackLock(track.id, !track.locked);
                    }}
                  >
                    {track.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Timeline area */}
        <ResizablePanel defaultSize={80}>
          <ScrollArea className="h-full">
          <div
            ref={timelineRef}
            className="relative"
            style={{ width: Math.max(timelineWidth, '100%' as unknown as number) }}
          >
            {/* Time ruler */}
            <div
              ref={rulerRef}
              className="sticky top-0 z-10 bg-muted/80 border-b cursor-pointer"
              style={{ height: RULER_HEIGHT }}
              onClick={handleRulerClick}
            >
              {rulerMarks.map((mark, i) => (
                <div
                  key={i}
                  className="absolute top-0"
                  style={{ left: timeToPixels(mark.time) }}
                >
                  <div
                    className={cn(
                      'border-l',
                      mark.major ? 'h-4 border-foreground/50' : 'h-2 border-foreground/20'
                    )}
                  />
                  {mark.label && (
                    <span className="absolute top-4 text-xs text-muted-foreground -translate-x-1/2">
                      {mark.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  'relative border-b',
                  !track.visible && 'opacity-50',
                  selectedTrackId === track.id && 'bg-muted/30'
                )}
                style={{ height: track.height || TRACK_HEIGHT }}
              >
                {/* Clips */}
                {track.clips.map((clip) => {
                  const isSelected = selectedClipIds.includes(clip.id);
                  const clipLeft = timeToPixels(clip.startTime);
                  const clipWidth = timeToPixels(clip.duration);

                  return (
                    <div
                      key={clip.id}
                      className={cn(
                        'absolute top-1 bottom-1 rounded cursor-pointer transition-all group',
                        isSelected
                          ? 'ring-2 ring-primary bg-primary/20'
                          : 'bg-muted hover:bg-muted/80',
                        clip.locked && 'opacity-60 cursor-not-allowed'
                      )}
                      style={{
                        left: clipLeft,
                        width: clipWidth,
                      }}
                      onClick={(e) => handleClipClick(e, clip)}
                      onMouseDown={(e) => !clip.locked && handleClipDragStart(e, clip)}
                    >
                      {/* Trim handles */}
                      {isSelected && !clip.locked && (
                        <>
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/50 rounded-l opacity-0 group-hover:opacity-100"
                            onMouseDown={(e) => handleTrimDragStart(e, clip, 'trim-start')}
                          />
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/50 rounded-r opacity-0 group-hover:opacity-100"
                            onMouseDown={(e) => handleTrimDragStart(e, clip, 'trim-end')}
                          />
                        </>
                      )}

                      {/* Clip content */}
                      <div className="px-2 py-1 h-full flex flex-col justify-between overflow-hidden">
                        <span className="text-xs font-medium truncate">{clip.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(clip.duration)}
                        </span>
                      </div>

                      {/* Thumbnail preview (placeholder) */}
                      {clip.sourceThumbnail && (
                        <div
                          className="absolute inset-0 opacity-30"
                          style={{
                            backgroundImage: `url(${clip.sourceThumbnail})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 cursor-ew-resize"
              style={{ left: timeToPixels(currentTime) }}
              onMouseDown={handlePlayheadDragStart}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

export default VideoTimeline;
