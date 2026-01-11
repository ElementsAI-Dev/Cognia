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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GitDiffInfo, GitFileStatus } from '@/types/system/git';

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
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
      } else if (!line.startsWith('diff ') && !line.startsWith('index ') && 
                 !line.startsWith('---') && !line.startsWith('+++')) {
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
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noChanges')}</p>
      </div>
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
          <Button size="sm" variant="ghost" onClick={expandAll}>
            {t('expandAll')}
          </Button>
          <Button size="sm" variant="ghost" onClick={collapseAll}>
            {t('collapseAll')}
          </Button>
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
                      <span className="flex-1 text-left text-sm truncate">
                        {diff.path}
                      </span>
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

                      {/* Diff Content */}
                      {diff.content ? (
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
