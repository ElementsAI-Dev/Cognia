'use client';

/**
 * HistoryPanel - Visual undo/redo history timeline
 * Features:
 * - Timeline view of edit operations
 * - Thumbnail previews
 * - Click to restore state
 * - Clear history
 * - Branching visualization
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Undo2,
  Redo2,
  Trash2,
  Image as ImageIcon,
  Crop,
  SlidersHorizontal,
  Paintbrush,
  ZoomIn,
  Eraser,
  Sparkles,
  Type,
  Pencil,
  Clock,
} from 'lucide-react';

export type HistoryOperationType =
  | 'generate'
  | 'edit'
  | 'variation'
  | 'crop'
  | 'rotate'
  | 'flip'
  | 'adjust'
  | 'mask'
  | 'upscale'
  | 'remove-bg'
  | 'text'
  | 'draw'
  | 'filter';

export interface HistoryEntry {
  id: string;
  type: HistoryOperationType;
  description: string;
  timestamp: number;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

export interface HistoryPanelProps {
  entries: HistoryEntry[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
}

const OPERATION_ICONS: Record<HistoryOperationType, React.ReactNode> = {
  generate: <Sparkles className="h-3 w-3" />,
  edit: <Paintbrush className="h-3 w-3" />,
  variation: <ImageIcon className="h-3 w-3" />,
  crop: <Crop className="h-3 w-3" />,
  rotate: <History className="h-3 w-3" />,
  flip: <ImageIcon className="h-3 w-3" />,
  adjust: <SlidersHorizontal className="h-3 w-3" />,
  mask: <Paintbrush className="h-3 w-3" />,
  upscale: <ZoomIn className="h-3 w-3" />,
  'remove-bg': <Eraser className="h-3 w-3" />,
  text: <Type className="h-3 w-3" />,
  draw: <Pencil className="h-3 w-3" />,
  filter: <SlidersHorizontal className="h-3 w-3" />,
};

const OPERATION_LABELS: Record<HistoryOperationType, string> = {
  generate: 'Generated',
  edit: 'Edited',
  variation: 'Variation',
  crop: 'Cropped',
  rotate: 'Rotated',
  flip: 'Flipped',
  adjust: 'Adjusted',
  mask: 'Masked',
  upscale: 'Upscaled',
  'remove-bg': 'Background Removed',
  text: 'Text Added',
  draw: 'Drawing Added',
  filter: 'Filter Applied',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  } else if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function HistoryPanel({
  entries,
  currentIndex,
  onNavigate,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  className,
}: HistoryPanelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleEntryClick = useCallback(
    (index: number) => {
      if (index !== currentIndex) {
        onNavigate(index);
      }
    },
    [currentIndex, onNavigate]
  );

  return (
    <div className={cn('flex flex-col border rounded-lg', className)} role="region" aria-label="History Panel">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" aria-hidden="true" />
          <h3 className="font-medium text-sm" id="history-panel-title">History</h3>
          <span className="text-xs text-muted-foreground">
            ({entries.length} {entries.length === 1 ? 'step' : 'steps'})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRedo}
                disabled={!canRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                disabled={entries.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear History?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all history entries. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onClear}>Clear History</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="p-2">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No history yet</p>
              <p className="text-xs">Your edits will appear here</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-border" />

              {/* Entries */}
              <div className="space-y-1">
                {entries.map((entry, index) => {
                  const isCurrent = index === currentIndex;
                  const isAfterCurrent = index > currentIndex;
                  const isHovered = hoveredIndex === index;

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'relative flex items-start gap-3 p-2 rounded-md cursor-pointer transition-all',
                        isCurrent && 'bg-muted',
                        isAfterCurrent && 'opacity-50',
                        !isCurrent && !isAfterCurrent && 'hover:bg-muted/50'
                      )}
                      onClick={() => handleEntryClick(index)}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                          isCurrent
                            ? 'bg-primary text-primary-foreground'
                            : isHovered
                            ? 'bg-muted-foreground/20 text-foreground'
                            : 'bg-background border-2 border-border text-muted-foreground'
                        )}
                      >
                        {OPERATION_ICONS[entry.type]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-medium', isAfterCurrent && 'text-muted-foreground')}>
                            {OPERATION_LABELS[entry.type]}
                          </span>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {formatTime(entry.timestamp)}
                        </p>
                      </div>

                      {/* Thumbnail */}
                      {entry.thumbnail && (
                        <div className="w-10 h-10 rounded border bg-muted/50 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={entry.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer - current state info */}
      {entries.length > 0 && (
        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          Step {currentIndex + 1} of {entries.length}
          {currentIndex < entries.length - 1 && (
            <span className="ml-1">
              ({entries.length - currentIndex - 1} {entries.length - currentIndex - 1 === 1 ? 'step' : 'steps'} ahead)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;
