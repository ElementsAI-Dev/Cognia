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
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
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
  const t = useTranslations('history');
  const tCommon = useTranslations('common');

  const formatTime = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, []);

  const formatRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return t('relativeTime.justNow');
    if (diff < 3600000) return t('relativeTime.minutesAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('relativeTime.hoursAgo', { count: Math.floor(diff / 3600000) });
    return formatTime(timestamp);
  }, [formatTime, t]);

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          {t('title')}
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
            <TooltipContent>{t('undoShortcut')}</TooltipContent>
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
            <TooltipContent>{t('redoShortcut')}</TooltipContent>
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
                  <AlertDialogTitle>{t('clearTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('clearDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onClearHistory}>{t('clear')}</AlertDialogAction>
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
            <Empty className="py-8 border-0">
              <EmptyMedia variant="icon">
                <History className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle className="text-sm">{t('empty')}</EmptyTitle>
              <EmptyDescription className="text-xs">{t('emptyHint')}</EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-1">
              {/* Initial state marker */}
              <Card
                className={cn(
                  'cursor-pointer transition-colors',
                  currentIndex === -1 ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted'
                )}
                onClick={() => onJumpTo(-1)}
              >
                <CardContent className="flex items-center gap-2 p-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t('initialState')}</p>
                    <p className="text-xs text-muted-foreground">{t('projectStart')}</p>
                  </div>
                  {currentIndex === -1 && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </CardContent>
              </Card>

              {/* History entries */}
              {entries.map((entry, index) => {
                const Icon = ACTION_ICONS[entry.action];
                const colorClass = ACTION_COLORS[entry.action];
                const isCurrent = index === currentIndex;
                const isUndone = index > currentIndex;

                return (
                  <Card
                    key={entry.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isCurrent ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
                      isUndone && 'opacity-50'
                    )}
                    onClick={() => onJumpTo(index)}
                  >
                    <CardContent className="flex items-center gap-2 p-2">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-2 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>{entries.length} {t('actions')}</span>
        <span>
          {currentIndex + 1} / {entries.length}
        </span>
      </div>
    </div>
  );
}

export default HistoryPanel;
