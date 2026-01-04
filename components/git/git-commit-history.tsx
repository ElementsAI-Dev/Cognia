'use client';

/**
 * Git Commit History - Detailed commit history viewer
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  GitCommit,
  History,
  User,
  Calendar,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  ExternalLink,
  RotateCcw,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatCommitDate, formatCommitMessage } from '@/types/git';
import type { GitCommitInfo, GitDiffInfo } from '@/types/git';

interface GitCommitHistoryProps {
  commits: GitCommitInfo[];
  currentBranch?: string;
  isLoading?: boolean;
  onRefresh: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onViewDiff?: (commit: GitCommitInfo) => Promise<GitDiffInfo[]>;
  onCheckout?: (commitHash: string) => Promise<boolean>;
  onRevert?: (commitHash: string) => Promise<boolean>;
  className?: string;
}

export function GitCommitHistory({
  commits,
  currentBranch,
  isLoading = false,
  onRefresh,
  onLoadMore,
  onViewDiff,
  onCheckout,
  onRevert,
  className,
}: GitCommitHistoryProps) {
  const t = useTranslations('git.history');
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());
  const [selectedCommit, setSelectedCommit] = useState<GitCommitInfo | null>(null);
  const [commitDiffs, setCommitDiffs] = useState<Record<string, GitDiffInfo[]>>({});
  const [loadingDiffs, setLoadingDiffs] = useState<Set<string>>(new Set());
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadDiff = useCallback(async (commit: GitCommitInfo) => {
    if (!onViewDiff || loadingDiffs.has(commit.hash)) return;

    setLoadingDiffs((prev) => new Set(prev).add(commit.hash));
    try {
      const diffs = await onViewDiff(commit);
      setCommitDiffs((prev) => ({ ...prev, [commit.hash]: diffs }));
    } finally {
      setLoadingDiffs((prev) => {
        const next = new Set(prev);
        next.delete(commit.hash);
        return next;
      });
    }
  }, [onViewDiff, loadingDiffs]);

  const toggleCommit = useCallback(
    async (commit: GitCommitInfo) => {
      const hash = commit.hash;
      const wasExpanded = expandedCommits.has(hash);
      
      setExpandedCommits((prev) => {
        const next = new Set(prev);
        if (next.has(hash)) {
          next.delete(hash);
        } else {
          next.add(hash);
        }
        return next;
      });
      
      // Load diff if not already loaded and expanding
      if (!wasExpanded && !commitDiffs[hash] && onViewDiff) {
        loadDiff(commit);
      }
    },
    [expandedCommits, commitDiffs, onViewDiff, loadDiff]
  );

  const copyHash = useCallback(async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }, []);

  const viewCommitDetails = (commit: GitCommitInfo) => {
    setSelectedCommit(commit);
  };

  if (commits.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{t('noCommits')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="font-medium text-sm">{t('title')}</span>
          {currentBranch && (
            <Badge variant="outline" className="text-xs">
              {currentBranch}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Commit List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-1 pr-4">
          {commits.map((commit, idx) => {
            const isExpanded = expandedCommits.has(commit.hash);
            const isLoadingDiff = loadingDiffs.has(commit.hash);
            const diffs = commitDiffs[commit.hash];

            return (
              <Collapsible
                key={commit.hash}
                open={isExpanded}
                onOpenChange={() => toggleCommit(commit)}
              >
                <div className="rounded-md border bg-card">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start gap-2 p-2 hover:bg-muted/50">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center pt-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {idx < commits.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-1" />
                        )}
                      </div>

                      {/* Expand/Collapse */}
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                      )}

                      {/* Commit Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">
                          {formatCommitMessage(commit)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-mono">{commit.shortHash}</span>
                              </TooltipTrigger>
                              <TooltipContent>{commit.hash}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {commit.author}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatCommitDate(commit.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t p-2 space-y-2">
                      {/* Actions */}
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyHash(commit.hash);
                          }}
                        >
                          {copiedHash === commit.hash ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          {t('copyHash')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewCommitDetails(commit);
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {t('viewDetails')}
                        </Button>
                        {onCheckout && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCheckout(commit.hash);
                            }}
                          >
                            <GitCommit className="h-3 w-3 mr-1" />
                            {t('checkout')}
                          </Button>
                        )}
                        {onRevert && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-yellow-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRevert(commit.hash);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('revert')}
                          </Button>
                        )}
                      </div>

                      {/* Commit Body */}
                      {commit.messageBody && (
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2 whitespace-pre-wrap">
                          {commit.messageBody}
                        </div>
                      )}

                      {/* Changed Files */}
                      {isLoadingDiff ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            {t('loadingChanges')}
                          </span>
                        </div>
                      ) : diffs && diffs.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {t('filesChanged', { count: diffs.length })}
                          </p>
                          <div className="max-h-32 overflow-auto space-y-0.5">
                            {diffs.map((diff, diffIdx) => (
                              <div
                                key={diffIdx}
                                className="flex items-center gap-2 text-xs p-1 rounded hover:bg-muted/50"
                              >
                                <span className="text-green-600">+{diff.additions}</span>
                                <span className="text-red-600">-{diff.deletions}</span>
                                <span className="truncate flex-1">{diff.path}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {/* Load More */}
        {onLoadMore && (
          <div className="text-center py-4">
            <Button
              size="sm"
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t('loadMore')}
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Commit Details Dialog */}
      <Dialog open={!!selectedCommit} onOpenChange={() => setSelectedCommit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              {t('commitDetails')}
            </DialogTitle>
          </DialogHeader>
          {selectedCommit && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('hash')}</span>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {selectedCommit.hash}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyHash(selectedCommit.hash)}
                    >
                      {copiedHash === selectedCommit.hash ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('author')}</span>
                  <span className="text-sm">
                    {selectedCommit.author} &lt;{selectedCommit.authorEmail}&gt;
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('date')}</span>
                  <span className="text-sm">
                    {new Date(selectedCommit.date).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">{t('message')}</span>
                <div className="bg-muted rounded-md p-3">
                  <p className="font-medium">{selectedCommit.message}</p>
                  {selectedCommit.messageBody && (
                    <p className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {selectedCommit.messageBody}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GitCommitHistory;
