'use client';

/**
 * Checkpoint Panel — displays agent trace checkpoints with diff preview and rollback.
 * Inspired by Cursor's checkpoint/rollback system.
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  History,
  Undo2,
  Trash2,
  ChevronDown,
  ChevronRight,
  FileCode,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useCheckpoints } from '@/hooks/agent-trace';
import type { DBCheckpoint } from '@/lib/db/schema';
import type { FileDiff, DiffHunk } from '@/lib/agent-trace/checkpoint-manager';
import { cn } from '@/lib/utils';

interface CheckpointPanelProps {
  sessionId?: string;
  className?: string;
  onRestore?: (checkpoint: DBCheckpoint) => void;
}

export function CheckpointPanel({ sessionId, className, onRestore }: CheckpointPanelProps) {
  const t = useTranslations('settings');

  const {
    checkpoints,
    summary,
    isLoading,
    refresh,
    getDiff,
    remove,
    clearSession,
  } = useCheckpoints({ sessionId });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<Record<string, FileDiff | null>>({});
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null);

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(id);

      if (!diffData[id]) {
        setLoadingDiff(id);
        const diff = await getDiff(id);
        setDiffData((prev) => ({ ...prev, [id]: diff }));
        setLoadingDiff(null);
      }
    },
    [expandedId, diffData, getDiff]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      await remove(id);
      setDiffData((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (expandedId === id) setExpandedId(null);
    },
    [remove, expandedId]
  );

  // Group checkpoints by file path
  const groupedCheckpoints = useMemo(() => {
    const groups = new Map<string, DBCheckpoint[]>();
    for (const cp of checkpoints) {
      const existing = groups.get(cp.filePath) ?? [];
      existing.push(cp);
      groups.set(cp.filePath, existing);
    }
    return groups;
  }, [checkpoints]);

  if (!sessionId) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8 text-sm text-muted-foreground">
          {t('agentTrace.checkpoints.noSession') || 'Select a session to view checkpoints'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">
              {t('agentTrace.checkpoints.title') || 'Checkpoints'}
            </CardTitle>
            {checkpoints.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {checkpoints.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => void refresh()}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('agentTrace.checkpoints.refresh') || 'Refresh'}</TooltipContent>
            </Tooltip>
            {checkpoints.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('agentTrace.checkpoints.clearConfirmTitle') || 'Clear all checkpoints?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('agentTrace.checkpoints.clearConfirmDescription') ||
                        'This will permanently delete all checkpoints for this session. This action cannot be undone.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('agentTrace.checkpoints.cancel') || 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void clearSession()}>
                      {t('agentTrace.checkpoints.clearAll') || 'Clear All'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {summary && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              {summary.filesAffected.length} {t('agentTrace.checkpoints.files') || 'files'}
            </span>
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <Plus className="h-3 w-3" />
              {summary.totalAdditions}
            </span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <Minus className="h-3 w-3" />
              {summary.totalDeletions}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {checkpoints.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {isLoading
              ? t('agentTrace.checkpoints.loading') || 'Loading...'
              : t('agentTrace.checkpoints.empty') || 'No checkpoints yet'}
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="divide-y">
              {Array.from(groupedCheckpoints.entries()).map(([filePath, cps]) => (
                <FileCheckpointGroup
                  key={filePath}
                  filePath={filePath}
                  checkpoints={cps}
                  expandedId={expandedId}
                  diffData={diffData}
                  loadingDiff={loadingDiff}
                  onToggle={toggleExpand}
                  onRemove={handleRemove}
                  onRestore={onRestore}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// --- Sub-components ---

interface FileCheckpointGroupProps {
  filePath: string;
  checkpoints: DBCheckpoint[];
  expandedId: string | null;
  diffData: Record<string, FileDiff | null>;
  loadingDiff: string | null;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onRestore?: (checkpoint: DBCheckpoint) => void;
}

function FileCheckpointGroup({
  filePath,
  checkpoints,
  expandedId,
  diffData,
  loadingDiff,
  onToggle,
  onRemove,
  onRestore,
}: FileCheckpointGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  const displayPath = useMemo(() => {
    const parts = filePath.split(/[/\\]/);
    return parts.length > 2 ? `.../${parts.slice(-2).join('/')}` : filePath;
  }, [filePath]);

  return (
    <div>
      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0" />
        )}
        <FileCode className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="font-medium truncate text-left">{displayPath}</span>
        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
          {checkpoints.length}
        </Badge>
      </button>

      {!collapsed &&
        checkpoints.map((cp) => (
          <CheckpointItem
            key={cp.id}
            checkpoint={cp}
            isExpanded={expandedId === cp.id}
            diff={diffData[cp.id]}
            isLoadingDiff={loadingDiff === cp.id}
            onToggle={() => onToggle(cp.id)}
            onRemove={() => onRemove(cp.id)}
            onRestore={onRestore ? () => onRestore(cp) : undefined}
          />
        ))}
    </div>
  );
}

interface CheckpointItemProps {
  checkpoint: DBCheckpoint;
  isExpanded: boolean;
  diff: FileDiff | null | undefined;
  isLoadingDiff: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onRestore?: () => void;
}

function CheckpointItem({
  checkpoint,
  isExpanded,
  diff,
  isLoadingDiff,
  onToggle,
  onRemove,
  onRestore,
}: CheckpointItemProps) {
  const timeStr = new Date(checkpoint.timestamp).toLocaleTimeString();

  return (
    <div className="pl-6">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/30 transition-colors',
          isExpanded && 'bg-muted/40'
        )}
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <span className="text-muted-foreground">{timeStr}</span>
        {checkpoint.modelId && (
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {checkpoint.modelId.split('/').pop()}
          </Badge>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {onRestore && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                >
                  <Undo2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Restore</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  void onRemove();
                }}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-2">
          {isLoadingDiff ? (
            <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Loading diff...
            </div>
          ) : diff ? (
            <DiffView diff={diff} />
          ) : (
            <div className="p-2 text-xs text-muted-foreground">No diff available</div>
          )}
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  diff: FileDiff;
}

function DiffView({ diff }: DiffViewProps) {
  if (!diff.hasChanges) {
    return <div className="p-2 text-xs text-muted-foreground">No changes</div>;
  }

  return (
    <div className="border rounded-md overflow-hidden text-xs font-mono">
      <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 border-b">
        <span className="text-green-600 dark:text-green-400">+{diff.additions}</span>
        <span className="text-red-600 dark:text-red-400">-{diff.deletions}</span>
      </div>
      <ScrollArea className="max-h-[300px]">
        {diff.hunks.map((hunk, i) => (
          <HunkView key={i} hunk={hunk} />
        ))}
      </ScrollArea>
    </div>
  );
}

function HunkView({ hunk }: { hunk: DiffHunk }) {
  return (
    <div>
      <div className="px-2 py-0.5 text-[10px] text-muted-foreground bg-blue-50 dark:bg-blue-950/30">
        @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
      </div>
      {hunk.lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'px-2 leading-5 whitespace-pre-wrap break-all',
            line.type === 'add' && 'bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300',
            line.type === 'remove' && 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300',
            line.type === 'context' && 'text-muted-foreground'
          )}
        >
          <span className="inline-block w-4 text-right mr-2 text-[10px] opacity-50 select-none">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          {line.content}
        </div>
      ))}
    </div>
  );
}

