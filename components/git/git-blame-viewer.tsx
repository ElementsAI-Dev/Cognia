'use client';

/**
 * Git Blame Viewer - Line-by-line blame annotations for a file
 *
 * Provides:
 * - File path input with file picker
 * - Per-line blame display with commit grouping
 * - Age-based coloring (recent = warm, old = cool)
 * - Hover tooltips with full commit info
 * - Click to view commit details
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileCode,
  FolderOpen,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getBlame } from '@/lib/native/git/advanced';
import type { GitBlameResult } from '@/lib/native/git/advanced';
import {
  groupBlameByCommit,
  getBlameAgeColor,
  formatBlameRelativeDate,
  assignBlameColors,
} from '@/lib/git/blame-utils';
import type { BlameBlock } from '@/lib/git/blame-utils';
import { open } from '@tauri-apps/plugin-dialog';

export interface GitBlameViewerProps {
  repoPath: string;
  initialFilePath?: string;
  onCommitClick?: (commitHash: string) => void;
  className?: string;
}

export function GitBlameViewer({
  repoPath,
  initialFilePath = '',
  onCommitClick,
  className,
}: GitBlameViewerProps) {
  const t = useTranslations('git');
  const [filePath, setFilePath] = useState(initialFilePath);
  const [blameResult, setBlameResult] = useState<GitBlameResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const blocks = useMemo<BlameBlock[]>(
    () => (blameResult ? groupBlameByCommit(blameResult.lines) : []),
    [blameResult]
  );
  const commitColors = useMemo(() => assignBlameColors(blocks), [blocks]);

  const loadBlame = useCallback(
    async (path?: string) => {
      const target = path ?? filePath;
      if (!target.trim()) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await getBlame(repoPath, target.trim());
        if (result.success && result.data) {
          setBlameResult(result.data);
        } else {
          setError(result.error || 'Failed to load blame');
          setBlameResult(null);
        }
      } catch (err) {
        setError(String(err));
        setBlameResult(null);
      } finally {
        setIsLoading(false);
      }
    },
    [repoPath, filePath]
  );

  const handlePickFile = useCallback(async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: t('blame.selectFile'),
        defaultPath: repoPath,
      });
      if (selected && typeof selected === 'string') {
        const relative = selected.startsWith(repoPath)
          ? selected.slice(repoPath.length).replace(/^[/\\]+/, '')
          : selected;
        setFilePath(relative);
        await loadBlame(relative);
      }
    } catch {
      // User cancelled
    }
  }, [repoPath, t, loadBlame]);

  const copyHash = useCallback((hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }, []);

  const lineBlockMap = useMemo(() => {
    const map = new Map<number, { block: BlameBlock; isFirst: boolean }>();
    for (const block of blocks) {
      for (let i = 0; i < block.lines.length; i++) {
        map.set(block.lines[i].lineNumber, { block, isFirst: i === 0 });
      }
    }
    return map;
  }, [blocks]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('blame.title')}</h2>
        </div>
        <div className="flex gap-2">
          <Input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadBlame()}
            placeholder={t('blame.filePlaceholder')}
            className="flex-1 font-mono text-sm"
          />
          <Button variant="outline" size="icon" onClick={handlePickFile}>
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => loadBlame()}
            disabled={!filePath.trim() || isLoading}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            {t('blame.loading')}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center gap-2 p-4 m-4 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && !blameResult && (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <FileCode className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">{t('blame.noFile')}</p>
            <p className="text-xs mt-1">{t('blame.noFileHint')}</p>
          </div>
        )}

        {!isLoading && blameResult && blameResult.lines.length > 0 && (
          <TooltipProvider delayDuration={300}>
            <div className="font-mono text-xs">
              {blameResult.lines.map((line) => {
                const entry = lineBlockMap.get(line.lineNumber);
                const isFirst = entry?.isFirst ?? false;
                const block = entry?.block;
                const bgColor = block
                  ? commitColors.get(block.commitHash)
                  : undefined;

                return (
                  <div
                    key={line.lineNumber}
                    className={cn(
                      'flex hover:bg-accent/30 transition-colors',
                      isFirst && 'border-t border-border/40'
                    )}
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Line number */}
                    <div className="w-12 shrink-0 text-right pr-2 py-0.5 text-muted-foreground select-none border-r border-border/30">
                      {line.lineNumber}
                    </div>

                    {/* Blame gutter */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'w-56 shrink-0 px-2 py-0.5 truncate cursor-pointer border-r border-border/30',
                            'hover:bg-accent/50 transition-colors'
                          )}
                          onClick={() => onCommitClick?.(line.commitHash)}
                        >
                          {isFirst ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor: getBlameAgeColor(
                                    line.authorDate
                                  ),
                                }}
                              />
                              <span className="truncate font-medium">
                                {line.authorName}
                              </span>
                              <span className="text-muted-foreground ml-auto shrink-0">
                                {formatBlameRelativeDate(line.authorDate)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">│</span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-sm space-y-1.5 text-xs"
                      >
                        <div className="font-semibold">
                          {line.commitMessage}
                        </div>
                        <div className="text-muted-foreground space-y-0.5">
                          <div>
                            {t('blame.author')}: {line.authorName} &lt;
                            {line.authorEmail}&gt;
                          </div>
                          <div>
                            {t('blame.date')}:{' '}
                            {new Date(line.authorDate).toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            {t('blame.hash')}: {line.commitHash.slice(0, 7)}
                            <button
                              className="inline-flex hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyHash(line.commitHash);
                              }}
                            >
                              {copiedHash === line.commitHash ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Code content */}
                    <div className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
                      {line.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </ScrollArea>
    </div>
  );
}
