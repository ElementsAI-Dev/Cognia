'use client';

/**
 * VideoSubtitleTrack - Component for displaying and editing subtitle cues in the timeline
 * 
 * Features:
 * - Visual subtitle cue display on timeline
 * - Drag and drop cue repositioning
 * - Inline cue editing
 * - Cue splitting and merging
 * - Time synchronization with playhead
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Type,
  Scissors,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  Merge,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import type { SubtitleCue } from '@/types/media/subtitle';

export interface VideoSubtitleTrackProps {
  trackId: string;
  trackName: string;
  language: string;
  cues: SubtitleCue[];
  currentTime: number;
  duration: number;
  zoom: number;
  pixelsPerSecond: number;
  isVisible: boolean;
  isLocked: boolean;
  selectedCueIds: string[];
  onCueSelect: (cueIds: string[]) => void;
  onCueUpdate: (cueId: string, updates: Partial<SubtitleCue>) => void;
  onCueDelete: (cueId: string) => void;
  onCueSplit: (cueId: string, atTime: number) => void;
  onCueMerge: (cueIds: string[]) => void;
  onCueDuplicate: (cueId: string) => void;
  onTimeChange: (time: number) => void;
  className?: string;
}

const TRACK_HEIGHT = 40;

export function VideoSubtitleTrack({
  trackId: _trackId,
  trackName,
  language,
  cues,
  currentTime,
  duration,
  zoom,
  pixelsPerSecond,
  isVisible,
  isLocked,
  selectedCueIds,
  onCueSelect,
  onCueUpdate,
  onCueDelete,
  onCueSplit,
  onCueMerge,
  onCueDuplicate,
  onTimeChange,
  className,
}: VideoSubtitleTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [editingCueId, setEditingCueId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragCueId, setDragCueId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);

  // Calculate timeline width
  const timelineWidth = useMemo(() => {
    return duration * pixelsPerSecond * zoom;
  }, [duration, pixelsPerSecond, zoom]);

  // Convert time to pixels
  const timeToPixels = useCallback((timeMs: number) => {
    return (timeMs / 1000) * pixelsPerSecond * zoom;
  }, [pixelsPerSecond, zoom]);

  // Convert pixels to time
  const pixelsToTime = useCallback((pixels: number) => {
    return (pixels / (pixelsPerSecond * zoom)) * 1000;
  }, [pixelsPerSecond, zoom]);

  // Get current cue
  const currentCue = useMemo(() => {
    return cues.find(
      cue => cue.startTime <= currentTime && cue.endTime >= currentTime
    );
  }, [cues, currentTime]);

  // Handle cue click
  const handleCueClick = useCallback((e: React.MouseEvent, cueId: string) => {
    if (isLocked) return;
    
    if (e.shiftKey) {
      // Multi-select
      if (selectedCueIds.includes(cueId)) {
        onCueSelect(selectedCueIds.filter(id => id !== cueId));
      } else {
        onCueSelect([...selectedCueIds, cueId]);
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      if (selectedCueIds.includes(cueId)) {
        onCueSelect(selectedCueIds.filter(id => id !== cueId));
      } else {
        onCueSelect([...selectedCueIds, cueId]);
      }
    } else {
      onCueSelect([cueId]);
    }
  }, [isLocked, selectedCueIds, onCueSelect]);

  // Handle cue double click (edit)
  const handleCueDoubleClick = useCallback((cueId: string) => {
    if (isLocked) return;
    
    const cue = cues.find(c => c.id === cueId);
    if (cue) {
      setEditingCueId(cueId);
      setEditText(cue.text);
    }
  }, [isLocked, cues]);

  // Handle edit confirm
  const handleEditConfirm = useCallback(() => {
    if (editingCueId && editText.trim()) {
      onCueUpdate(editingCueId, { text: editText.trim() });
    }
    setEditingCueId(null);
    setEditText('');
  }, [editingCueId, editText, onCueUpdate]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingCueId(null);
    setEditText('');
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent, cueId: string) => {
    if (isLocked) return;
    
    const cue = cues.find(c => c.id === cueId);
    if (!cue) return;
    
    setIsDragging(true);
    setDragCueId(cueId);
    setDragStartX(e.clientX);
    setDragStartTime(cue.startTime);
    
    e.preventDefault();
  }, [isLocked, cues]);

  // Handle drag
  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragCueId) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaTime = pixelsToTime(deltaX);
    const newStartTime = Math.max(0, dragStartTime + deltaTime);
    
    const cue = cues.find(c => c.id === dragCueId);
    if (cue) {
      const cueDuration = cue.endTime - cue.startTime;
      onCueUpdate(dragCueId, {
        startTime: newStartTime,
        endTime: newStartTime + cueDuration,
      });
    }
  }, [isDragging, dragCueId, dragStartX, dragStartTime, cues, pixelsToTime, onCueUpdate]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragCueId(null);
  }, []);

  // Handle track click (seek to time)
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelsToTime(x);
    
    onTimeChange(time);
  }, [pixelsToTime, onTimeChange]);

  // Format time for display
  const formatTime = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const remainingMs = ms % 1000;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}.${Math.floor(remainingMs / 10).toString().padStart(2, '0')}`;
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'relative flex',
        isLocked && 'opacity-50 pointer-events-none',
        className
      )}
      style={{ height: TRACK_HEIGHT }}
    >
      {/* Track header */}
      <div className="w-[150px] flex-shrink-0 flex items-center gap-2 px-2 bg-muted/50 border-r">
        <Type className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{trackName}</div>
          <div className="text-xs text-muted-foreground">{language}</div>
        </div>
      </div>

      {/* Track content */}
      <div
        ref={trackRef}
        className="flex-1 relative overflow-hidden bg-background"
        style={{ width: timelineWidth }}
        onClick={handleTrackClick}
        onMouseMove={isDragging ? handleDrag : undefined}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Cues */}
        {cues.map(cue => {
          const left = timeToPixels(cue.startTime);
          const width = timeToPixels(cue.endTime - cue.startTime);
          const isSelected = selectedCueIds.includes(cue.id);
          const isEditing = editingCueId === cue.id;
          const isCurrent = currentCue?.id === cue.id;

          return (
            <ContextMenu key={cue.id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    'absolute top-1 bottom-1 rounded cursor-pointer transition-all',
                    'border border-primary/30 bg-primary/20',
                    isSelected && 'ring-2 ring-primary border-primary',
                    isCurrent && 'bg-primary/40',
                    isDragging && dragCueId === cue.id && 'opacity-70'
                  )}
                  style={{
                    left: `${left}px`,
                    width: `${Math.max(width, 20)}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCueClick(e, cue.id);
                  }}
                  onDoubleClick={() => handleCueDoubleClick(cue.id)}
                  onMouseDown={(e) => handleDragStart(e, cue.id)}
                >
                  {isEditing ? (
                    <div className="flex items-center h-full px-1 gap-1">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="h-6 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditConfirm();
                          if (e.key === 'Escape') handleEditCancel();
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditConfirm();
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCancel();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-full px-1 flex items-center overflow-hidden">
                          <span className="text-xs truncate">
                            {cue.text}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-[300px]">
                          <div className="text-xs text-muted-foreground mb-1">
                            {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
                          </div>
                          <div className="text-sm">{cue.text}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </ContextMenuTrigger>

              <ContextMenuContent>
                <ContextMenuItem onClick={() => handleCueDoubleClick(cue.id)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Text
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCueDuplicate(cue.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onCueSplit(cue.id, currentTime)}>
                  <Scissors className="h-4 w-4 mr-2" />
                  Split at Playhead
                </ContextMenuItem>
                {selectedCueIds.length > 1 && (
                  <ContextMenuItem onClick={() => onCueMerge(selectedCueIds)}>
                    <Merge className="h-4 w-4 mr-2" />
                    Merge Selected
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => {
                    onCueUpdate(cue.id, { startTime: cue.startTime - 100 });
                  }}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Shift Earlier (-100ms)
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    onCueUpdate(cue.id, { startTime: cue.startTime + 100 });
                  }}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Shift Later (+100ms)
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-destructive"
                  onClick={() => onCueDelete(cue.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}

        {/* Playhead indicator */}
        <div
          className="absolute top-0 bottom-0 w-px bg-primary pointer-events-none z-10"
          style={{ left: `${timeToPixels(currentTime)}px` }}
        />
      </div>
    </div>
  );
}
