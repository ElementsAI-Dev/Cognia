'use client';

/**
 * Git Diff Viewer - Shows visual diff for file changes
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Maximize2,
  X,
  Columns2,
  AlignJustify,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyMedia, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import type { GitDiffInfo, GitFileStatus } from '@/types/system/git';

type DiffViewMode = 'unified' | 'split';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface SplitRow {
  left: DiffLine | null;
  right: DiffLine | null;
}

interface GitDiffViewerProps {
  diffs: GitDiffInfo[];
  fileStatus?: GitFileStatus[];
  onStageFile?: (path: string) => void;
  onUnstageFile?: (path: string) => void;
  onDiscardFile?: (path: string) => void;
  className?: string;
}

export function GitDiffViewer({
  diffs,
  fileStatus = [],
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  className,
}: GitDiffViewerProps) {
  const t = useTranslations('git.diff');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [fullscreenDiff, setFullscreenDiff] = useState<GitDiffInfo | null>(null);
  const [viewMode, setViewMode] = useState<DiffViewMode>('unified');

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(diffs.map((d) => d.path)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const copyPath = useCallback(async (path: string) => {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  }, []);

  const parseDiffContent = (content: string): DiffLine[] => {
    if (!content) return [];

    const lines = content.split('\n');
    const result: DiffLine[] = [];
    let oldLine = 0;
    let newLine = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse hunk header
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        result.push({ type: 'header', content: line });
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        result.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLine++,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        result.push({
          type: 'remove',
          content: line.slice(1),
          oldLineNumber: oldLine++,
        });
      } else if (
        !line.startsWith('diff ') &&
        !line.startsWith('index ') &&
        !line.startsWith('---') &&
        !line.startsWith('+++')
      ) {
        result.push({
          type: 'context',
          content: line.startsWith(' ') ? line.slice(1) : line,
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }

    return result;
  };

  const getFileStatus = (path: string): GitFileStatus | undefined => {
    return fileStatus.find((f) => f.path === path);
  };

  const buildSplitRows = (lines: DiffLine[]): SplitRow[] => {
    const rows: SplitRow[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.type === 'header') {
        rows.push({ left: line, right: line });
        i++;
      } else if (line.type === 'context') {
        rows.push({ left: line, right: line });
        i++;
      } else if (line.type === 'remove') {
        // Collect consecutive removes
        const removes: DiffLine[] = [];
        while (i < lines.length && lines[i].type === 'remove') {
          removes.push(lines[i]);
          i++;
        }
        // Collect consecutive adds
        const adds: DiffLine[] = [];
        while (i < lines.length && lines[i].type === 'add') {
          adds.push(lines[i]);
          i++;
        }
        // Pair them up
        const maxLen = Math.max(removes.length, adds.length);
        for (let j = 0; j < maxLen; j++) {
          rows.push({
            left: j < removes.length ? removes[j] : null,
            right: j < adds.length ? adds[j] : null,
          });
        }
      } else if (line.type === 'add') {
        rows.push({ left: null, right: line });
        i++;
      } else {
        i++;
      }
    }
    return rows;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-600 border-green-600';
      case 'deleted':
        return 'text-red-600 border-red-600';
      case 'modified':
        return 'text-yellow-600 border-yellow-600';
      case 'renamed':
        return 'text-blue-600 border-blue-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (diffs.length === 0) {
    return (
      <Empty className={className}>
        <EmptyMedia>
          <FileText className="h-12 w-12 opacity-50" />
        </EmptyMedia>
        <EmptyDescription>{t('noChanges')}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Actions Bar */}
      <div className="flex items-center justify-between px-2">
        <span className="text-sm text-muted-foreground">
          {t('filesChanged', { count: diffs.length })}
        </span>
        <div className="flex gap-1">
          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
              className="h-7 px-2 rounded-r-none"
              onClick={() => setViewMode('unified')}
              title={t('unifiedView')}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'split' ? 'secondary' : 'ghost'}
              className="h-7 px-2 rounded-l-none"
              onClick={() => setViewMode('split')}
              title={t('splitView')}
            >
              <Columns2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={expandAll}>
                  {t('expandAll')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('expandAllTooltip')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={collapseAll}>
                  {t('collapseAll')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('collapseAllTooltip')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Diff List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 pr-4">
          {diffs.map((diff) => {
            const status = getFileStatus(diff.path);
            const isExpanded = expandedFiles.has(diff.path);

            return (
              <Collapsible
                key={diff.path}
                open={isExpanded}
                onOpenChange={() => toggleFile(diff.path)}
              >
                <div className="rounded-md border bg-card">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-2 p-2 hover:bg-muted/50">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-left text-sm truncate">{diff.path}</span>
                      {status && (
                        <Badge
                          variant="outline"
                          className={cn('text-xs', getStatusColor(status.status))}
                        >
                          {status.status.charAt(0).toUpperCase()}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-green-600">+{diff.additions}</span>
                        <span className="text-red-600">-{diff.deletions}</span>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t">
                      {/* File Actions */}
                      <div className="flex items-center gap-1 p-1 bg-muted/30 border-b">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyPath(diff.path);
                          }}
                        >
                          {copiedPath === diff.path ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          {t('copyPath')}
                        </Button>
                        {diff.content && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullscreenDiff(diff);
                            }}
                          >
                            <Maximize2 className="h-3 w-3 mr-1" />
                            {t('fullscreen')}
                          </Button>
                        )}
                        {status && !status.staged && onStageFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-green-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStageFile(diff.path);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('stage')}
                          </Button>
                        )}
                        {status && status.staged && onUnstageFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-yellow-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnstageFile(diff.path);
                            }}
                          >
                            <Minus className="h-3 w-3 mr-1" />
                            {t('unstage')}
                          </Button>
                        )}
                        {onDiscardFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDiscardFile(diff.path);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            {t('discard')}
                          </Button>
                        )}
                      </div>

                      {/* Change bar */}
                      {diff.additions + diff.deletions > 0 && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-muted/20 border-b">
                          <div className="flex h-2 flex-1 rounded-full overflow-hidden bg-muted">
                            <div
                              className="bg-green-500 h-full"
                              style={{ width: `${(diff.additions / (diff.additions + diff.deletions)) * 100}%` }}
                            />
                            <div
                              className="bg-red-500 h-full"
                              style={{ width: `${(diff.deletions / (diff.additions + diff.deletions)) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            +{diff.additions} -{diff.deletions}
                          </span>
                        </div>
                      )}

                      {/* Diff Content */}
                      {diff.content ? (
                        viewMode === 'split' ? (
                          /* Split (side-by-side) view */
                          <div className="font-mono text-xs overflow-x-auto">
                            {buildSplitRows(parseDiffContent(diff.content)).map((row, idx) => {
                              if (row.left?.type === 'header') {
                                return (
                                  <div key={idx} className="flex bg-blue-500/10 text-blue-600">
                                    <span className="flex-1 px-2 whitespace-pre border-r">{row.left.content}</span>
                                    <span className="flex-1 px-2 whitespace-pre">{row.right?.content}</span>
                                  </div>
                                );
                              }
                              return (
                                <div key={idx} className="flex">
                                  {/* Left (old) */}
                                  <div className={cn(
                                    'flex flex-1 border-r min-w-0',
                                    row.left?.type === 'remove' && 'bg-red-500/10',
                                  )}>
                                    <span className="w-10 px-1 text-right text-muted-foreground select-none border-r shrink-0">
                                      {row.left?.oldLineNumber || ''}
                                    </span>
                                    <span className={cn(
                                      'flex-1 px-2 whitespace-pre truncate',
                                      row.left?.type === 'remove' && 'text-red-700 dark:text-red-400',
                                    )}>
                                      {row.left ? row.left.content : ''}
                                    </span>
                                  </div>
                                  {/* Right (new) */}
                                  <div className={cn(
                                    'flex flex-1 min-w-0',
                                    row.right?.type === 'add' && 'bg-green-500/10',
                                  )}>
                                    <span className="w-10 px-1 text-right text-muted-foreground select-none border-r shrink-0">
                                      {row.right?.newLineNumber || ''}
                                    </span>
                                    <span className={cn(
                                      'flex-1 px-2 whitespace-pre truncate',
                                      row.right?.type === 'add' && 'text-green-700 dark:text-green-400',
                                    )}>
                                      {row.right ? row.right.content : ''}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Unified view (original) */
                          <div className="font-mono text-xs overflow-x-auto">
                            {parseDiffContent(diff.content).map((line, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  'flex',
                                  line.type === 'add' && 'bg-green-500/10',
                                  line.type === 'remove' && 'bg-red-500/10',
                                  line.type === 'header' && 'bg-blue-500/10 text-blue-600'
                                )}
                              >
                                {line.type !== 'header' && (
                                  <>
                                    <span className="w-10 px-1 text-right text-muted-foreground select-none border-r">
                                      {line.oldLineNumber || ''}
                                    </span>
                                    <span className="w-10 px-1 text-right text-muted-foreground select-none border-r">
                                      {line.newLineNumber || ''}
                                    </span>
                                  </>
                                )}
                                <span
                                  className={cn(
                                    'flex-1 px-2 whitespace-pre',
                                    line.type === 'add' && 'text-green-700 dark:text-green-400',
                                    line.type === 'remove' && 'text-red-700 dark:text-red-400'
                                  )}
                                >
                                  {line.type === 'add' && '+'}
                                  {line.type === 'remove' && '-'}
                                  {line.type === 'context' && ' '}
                                  {line.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {t('binaryOrEmpty')}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Fullscreen Dialog */}
      <Dialog open={!!fullscreenDiff} onOpenChange={() => setFullscreenDiff(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {fullscreenDiff?.path}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            {fullscreenDiff?.content && (
              <div className="font-mono text-xs">
                {parseDiffContent(fullscreenDiff.content).map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex',
                      line.type === 'add' && 'bg-green-500/10',
                      line.type === 'remove' && 'bg-red-500/10',
                      line.type === 'header' && 'bg-blue-500/10 text-blue-600'
                    )}
                  >
                    {line.type !== 'header' && (
                      <>
                        <span className="w-12 px-2 text-right text-muted-foreground select-none border-r">
                          {line.oldLineNumber || ''}
                        </span>
                        <span className="w-12 px-2 text-right text-muted-foreground select-none border-r">
                          {line.newLineNumber || ''}
                        </span>
                      </>
                    )}
                    <span
                      className={cn(
                        'flex-1 px-2 whitespace-pre',
                        line.type === 'add' && 'text-green-700 dark:text-green-400',
                        line.type === 'remove' && 'text-red-700 dark:text-red-400'
                      )}
                    >
                      {line.type === 'add' && '+'}
                      {line.type === 'remove' && '-'}
                      {line.type === 'context' && ' '}
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GitDiffViewer;
