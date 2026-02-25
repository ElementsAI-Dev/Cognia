'use client';

/**
 * Git Commit Detail Panel - Rich commit inspector sidebar
 *
 * Provides:
 * - Full commit metadata (hash, author, date, message, body)
 * - Parent commit navigation
 * - Action buttons (cherry-pick, revert, checkout, copy SHA)
 * - File changes list with additions/deletions
 * - Inline diff expansion per file
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Copy,
  Check,
  GitCommit,
  User,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  CherryIcon,
  RotateCcw,
  GitBranchPlus,
  Plus,
  Minus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { parseDiffContent } from '@/lib/git/diff-parser';
import type { GitCommitDetail, GitDiffInfo } from '@/types/system/git';
import type { DiffLine } from '@/types/git';

export interface GitCommitDetailPanelProps {
  commitDetail: GitCommitDetail | null;
  isLoading?: boolean;
  onClose: () => void;
  onNavigateToParent?: (parentHash: string) => void;
  onCherryPick?: (hash: string) => void;
  onRevert?: (hash: string) => void;
  onCheckout?: (hash: string) => void;
  className?: string;
}

export function GitCommitDetailPanel({
  commitDetail,
  isLoading,
  onClose,
  onNavigateToParent,
  onCherryPick,
  onRevert,
  onCheckout,
  className,
}: GitCommitDetailPanelProps) {
  const t = useTranslations('git');
  const [copiedHash, setCopiedHash] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const copyHash = useCallback(() => {
    if (!commitDetail) return;
    navigator.clipboard.writeText(commitDetail.commit.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  }, [commitDetail]);

  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Parse diff content once, split by file
  const fileDiffs = parseDiffByFile(commitDetail?.diffContent);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center border-l bg-card', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!commitDetail) {
    return (
      <div className={cn('flex items-center justify-center border-l bg-card p-6', className)}>
        <div className="text-center text-muted-foreground">
          <GitCommit className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('commitDetail.noDetail')}</p>
        </div>
      </div>
    );
  }

  const { commit, fileChanges, parents, totalAdditions, totalDeletions } = commitDetail;

  return (
    <div className={cn('flex flex-col border-l bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <GitCommit className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm truncate">
            {t('commitDetail.title')}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Commit message */}
          <div>
            <h3 className="font-semibold text-base leading-snug">
              {commit.message}
            </h3>
            {commit.messageBody && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {commit.messageBody}
              </p>
            )}
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-2 text-sm">
            {/* Hash */}
            <div className="flex items-center gap-2">
              <GitCommit className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{t('commitDetail.hash')}:</span>
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {commit.shortHash}
              </code>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={copyHash}
              >
                {copiedHash ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {/* Author */}
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{t('commitDetail.author')}:</span>
              <span className="font-medium">{commit.author}</span>
              <span className="text-muted-foreground text-xs">
                &lt;{commit.authorEmail}&gt;
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{t('commitDetail.date')}:</span>
              <span>{new Date(commit.date).toLocaleString()}</span>
            </div>

            {/* Parents */}
            {parents.length > 0 && (
              <div className="flex items-start gap-2">
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{t('commitDetail.parents')}:</span>
                <div className="flex flex-wrap gap-1">
                  {parents.map((parentHash) => (
                    <button
                      key={parentHash}
                      className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
                      onClick={() => onNavigateToParent?.(parentHash)}
                    >
                      {parentHash.slice(0, 7)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-wrap gap-1.5">
              {onCherryPick && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onCherryPick(commit.hash)}
                    >
                      <CherryIcon className="h-3 w-3 mr-1" />
                      {t('commitDetail.cherryPick')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('commitDetail.cherryPickTooltip')}</TooltipContent>
                </Tooltip>
              )}
              {onRevert && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onRevert(commit.hash)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t('commitDetail.revert')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('commitDetail.revertTooltip')}</TooltipContent>
                </Tooltip>
              )}
              {onCheckout && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onCheckout(commit.hash)}
                    >
                      <GitBranchPlus className="h-3 w-3 mr-1" />
                      {t('commitDetail.checkout')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('commitDetail.checkoutTooltip')}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          <Separator />

          {/* File changes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                {t('commitDetail.fileChanges')}
              </h4>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <Plus className="h-3 w-3" />
                  {totalAdditions}
                </span>
                <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5">
                  <Minus className="h-3 w-3" />
                  {totalDeletions}
                </span>
              </div>
            </div>

            <div className="space-y-0.5">
              {fileChanges.map((file) => (
                <FileChangeEntry
                  key={file.path}
                  file={file}
                  isExpanded={expandedFiles.has(file.path)}
                  onToggle={() => toggleFile(file.path)}
                  diffLines={fileDiffs.get(file.path)}
                />
              ))}
            </div>

            {fileChanges.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                {t('commitDetail.noFileChanges')}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ==================== File Change Entry ====================

interface FileChangeEntryProps {
  file: GitDiffInfo;
  isExpanded: boolean;
  onToggle: () => void;
  diffLines?: DiffLine[];
}

function FileChangeEntry({ file, isExpanded, onToggle, diffLines }: FileChangeEntryProps) {
  const t = useTranslations('git');
  const maxBar = Math.max(file.additions + file.deletions, 1);
  const addWidth = Math.round((file.additions / maxBar) * 100);
  const delWidth = 100 - addWidth;

  return (
    <div className="rounded-md border border-border/50">
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent/50 transition-colors"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}

        <span className="truncate font-mono text-left flex-1">{file.path}</span>

        {/* Mini add/del bar */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-green-600 dark:text-green-400 w-8 text-right">
            +{file.additions}
          </span>
          <span className="text-red-600 dark:text-red-400 w-8 text-right">
            -{file.deletions}
          </span>
          <div className="w-16 h-1.5 rounded-full overflow-hidden bg-muted flex">
            <div
              className="h-full bg-green-500"
              style={{ width: `${addWidth}%` }}
            />
            <div
              className="h-full bg-red-500"
              style={{ width: `${delWidth}%` }}
            />
          </div>
        </div>
      </button>

      {/* Inline diff */}
      {isExpanded && diffLines && diffLines.length > 0 && (
        <div className="border-t border-border/50 bg-muted/30 overflow-x-auto">
          <div className="font-mono text-[11px] leading-relaxed">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'px-2 whitespace-pre',
                  line.type === 'add' && 'bg-green-500/10 text-green-700 dark:text-green-300',
                  line.type === 'remove' && 'bg-red-500/10 text-red-700 dark:text-red-300',
                  line.type === 'header' && 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold'
                )}
              >
                {line.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (!diffLines || diffLines.length === 0) && (
        <div className="border-t border-border/50 p-2 text-xs text-muted-foreground text-center">
          {t('commitDetail.noDiffContent')}
        </div>
      )}
    </div>
  );
}

// ==================== Helpers ====================

/**
 * Split a combined diff string into per-file DiffLine arrays.
 * Each file section starts with "diff --git a/... b/..."
 */
function parseDiffByFile(diffContent?: string): Map<string, DiffLine[]> {
  const result = new Map<string, DiffLine[]>();
  if (!diffContent) return result;

  const sections = diffContent.split(/^(?=diff --git )/m);
  for (const section of sections) {
    if (!section.trim()) continue;
    // Extract file path from "diff --git a/path b/path"
    const match = section.match(/^diff --git a\/.+ b\/(.+)/);
    if (match) {
      const path = match[1];
      result.set(path, parseDiffContent(section));
    }
  }

  return result;
}
