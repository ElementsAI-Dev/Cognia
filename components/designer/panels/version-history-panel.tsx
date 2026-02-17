'use client';

/**
 * VersionHistoryPanel - Shows version history for the designer
 * Allows users to view, navigate, and restore previous versions
 */

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import {
  History,
  Undo2,
  Redo2,
  RotateCcw,
  Clock,
  ChevronRight,
  FileCode,
  Sparkles,
  Move,
  Trash2,
  Copy,
  Type,
  Palette,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import type { DesignerHistoryEntry } from '@/types/designer';

// Dynamically import MonacoDiffEditor to avoid SSR issues with Monaco
const MonacoDiffEditor = dynamic(
  () => import('../editor/monaco-diff-editor').then((mod) => ({ default: mod.MonacoDiffEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-4">
        <span className="text-xs text-muted-foreground">Loading diff editor...</span>
      </div>
    ),
  }
);

interface VersionHistoryPanelProps {
  className?: string;
}

// Map action types to icons
const actionIcons: Record<string, React.ReactNode> = {
  'Code change': <FileCode className="h-3.5 w-3.5" />,
  'AI edit': <Sparkles className="h-3.5 w-3.5" />,
  'Element moved': <Move className="h-3.5 w-3.5" />,
  'Element deleted': <Trash2 className="h-3.5 w-3.5" />,
  'Element duplicated': <Copy className="h-3.5 w-3.5" />,
  'Text changed': <Type className="h-3.5 w-3.5" />,
  'Style changed': <Palette className="h-3.5 w-3.5" />,
  'Element inserted': <ChevronRight className="h-3.5 w-3.5" />,
};

function getActionIcon(action: string): React.ReactNode {
  if (actionIcons[action]) {
    return actionIcons[action];
  }
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (action.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return <History className="h-3.5 w-3.5" />;
}

function formatTimestamp(date: Date, t: ReturnType<typeof useTranslations>): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) {
    return t('justNow');
  }
  if (minutes < 60) {
    return t('minutesAgo', { count: minutes });
  }
  if (hours < 24) {
    return t('hoursAgo', { count: hours });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}


export function VersionHistoryPanel({ className }: VersionHistoryPanelProps) {
  const t = useTranslations('versionHistoryPanel');
  const history = useDesignerStore((state) => state.history);
  const historyIndex = useDesignerStore((state) => state.historyIndex);
  const undo = useDesignerStore((state) => state.undo);
  const redo = useDesignerStore((state) => state.redo);
  const restoreCodeAndParse = useDesignerStore((state) => state.restoreCodeAndParse);
  
  // Diff view state
  const [selectedDiffEntry, setSelectedDiffEntry] = useState<DesignerHistoryEntry | null>(null);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  const restoreVersion = useCallback(
    (entry: DesignerHistoryEntry, index: number) => {
      if (index === historyIndex) return;
      void restoreCodeAndParse(entry.newCode);
    },
    [historyIndex, restoreCodeAndParse]
  );

  const getDiffSummary = useCallback((entry: DesignerHistoryEntry): string => {
    const oldLines = entry.previousCode.split('\n').length;
    const newLines = entry.newCode.split('\n').length;
    const diff = newLines - oldLines;

    if (diff === 0) {
      return t('modified');
    }
    if (diff > 0) {
      return `+${diff} lines`;
    }
    return `${diff} lines`;
  }, [t]);

  const reversedHistory = useMemo(() => {
    return [...history].reverse().map((entry, reversedIndex) => ({
      entry,
      originalIndex: history.length - 1 - reversedIndex,
    }));
  }, [history]);

  if (history.length === 0) {
    return (
      <div className={cn('flex flex-col h-full min-h-0', className)}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('title')}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t('noHistory')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('noHistoryDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full min-h-0', className)}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('history')}</span>
            <span className="text-xs text-muted-foreground">
              ({history.length})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={undo}
                  disabled={!canUndo}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('undoTooltip')}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={redo}
                  disabled={!canRedo}
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('redoTooltip')}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {reversedHistory.map(({ entry, originalIndex }) => {
              const isCurrent = originalIndex === historyIndex;
              const isPast = originalIndex < historyIndex;
              const isFuture = originalIndex > historyIndex;

              const isSelected = selectedDiffEntry?.id === entry.id;

              return (
                <div key={entry.id} className="space-y-1">
                  <button
                    onClick={() => restoreVersion(entry, originalIndex)}
                    className={cn(
                      'w-full text-left rounded-md px-2 py-1.5 transition-colors group',
                      isCurrent && 'bg-primary/10 border border-primary/30',
                      isPast && 'opacity-60 hover:opacity-100 hover:bg-muted',
                      isFuture && 'opacity-40 hover:opacity-100 hover:bg-muted/50',
                      !isCurrent && 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'shrink-0',
                          isCurrent ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {getActionIcon(entry.action)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium truncate">
                            {entry.action}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">
                              {t('current')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimestamp(new Date(entry.timestamp), t)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {getDiffSummary(entry)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {/* Diff toggle button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDiffEntry(isSelected ? null : entry);
                          }}
                        >
                          {isSelected ? <X className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        {!isCurrent && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {/* Diff view — Monaco diff editor */}
                  {isSelected && (
                    <div className="ml-6 rounded-md border overflow-hidden" style={{ height: 250 }}>
                      <MonacoDiffEditor
                        originalCode={entry.previousCode}
                        modifiedCode={entry.newCode}
                        language="typescript"
                        originalLabel={t('previousVersion') || 'Previous'}
                        modifiedLabel={t('currentVersion') || 'Current'}
                        readOnly
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{t('undoHint')}</span>
            <span>{t('redoHint')}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default VersionHistoryPanel;
