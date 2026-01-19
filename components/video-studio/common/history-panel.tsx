'use client';

/**
 * HistoryPanel - Undo/redo history management
 * 
 * Features:
 * - Visual history list
 * - Jump to any history state
 * - Action descriptions
 * - Timestamps
 * - Clear history option
 */

import { useCallback } from 'react';
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
import {
  History,
  Undo,
  Redo,
  Trash2,
  Check,
  Circle,
  Scissors,
  Move,
  Plus,
  Minus,
  Palette,
  Type,
  Volume2,
  Layers,
  Clock,
} from 'lucide-react';

export type HistoryActionType =
  | 'add'
  | 'delete'
  | 'move'
  | 'trim'
  | 'split'
  | 'effect'
  | 'transition'
  | 'audio'
  | 'text'
  | 'layer'
  | 'transform'
  | 'other';

export interface HistoryEntry {
  id: string;
  action: HistoryActionType;
  description: string;
  timestamp: number;
  canUndo: boolean;
}

export interface HistoryPanelProps {
  entries: HistoryEntry[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo: (index: number) => void;
  onClearHistory: () => void;
  className?: string;
}

const ACTION_ICONS: Record<HistoryActionType, typeof History> = {
  add: Plus,
  delete: Minus,
  move: Move,
  trim: Scissors,
  split: Scissors,
  effect: Palette,
  transition: Layers,
  audio: Volume2,
  text: Type,
  layer: Layers,
  transform: Move,
  other: Circle,
};

const ACTION_COLORS: Record<HistoryActionType, string> = {
  add: 'text-green-500',
  delete: 'text-red-500',
  move: 'text-blue-500',
  trim: 'text-orange-500',
  split: 'text-orange-500',
  effect: 'text-purple-500',
  transition: 'text-pink-500',
  audio: 'text-cyan-500',
  text: 'text-yellow-500',
  layer: 'text-indigo-500',
  transform: 'text-blue-500',
  other: 'text-muted-foreground',
};

export function HistoryPanel({
  entries,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpTo,
  onClearHistory,
  className,
}: HistoryPanelProps) {
  const formatTime = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  const formatRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return formatTime(timestamp);
  }, [formatTime]);

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          History
        </h3>
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
                <Undo className="h-4 w-4" />
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
                <Redo className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
          
          {entries.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all undo/redo history. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearHistory}>Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* History list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No history yet</p>
              <p className="text-xs mt-1">Your actions will appear here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Initial state marker */}
              <div
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                  currentIndex === -1 ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
                )}
                onClick={() => onJumpTo(-1)}
              >
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Circle className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Initial State</p>
                  <p className="text-xs text-muted-foreground">Project start</p>
                </div>
                {currentIndex === -1 && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>

              {/* History entries */}
              {entries.map((entry, index) => {
                const Icon = ACTION_ICONS[entry.action];
                const colorClass = ACTION_COLORS[entry.action];
                const isCurrent = index === currentIndex;
                const isUndone = index > currentIndex;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                      isCurrent ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
                      isUndone && 'opacity-50'
                    )}
                    onClick={() => onJumpTo(index)}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                        isCurrent ? 'bg-primary/20' : 'bg-muted'
                      )}
                    >
                      <Icon className={cn('h-3 w-3', colorClass)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{entry.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(entry.timestamp)}</span>
                      </div>
                    </div>
                    {isCurrent && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>{entries.length} actions</span>
        <span>
          {currentIndex + 1} / {entries.length}
        </span>
      </div>
    </div>
  );
}

export default HistoryPanel;
