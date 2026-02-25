'use client';

/**
 * Git File History - Per-file visual commit history
 *
 * Provides:
 * - File path selector with file picker
 * - Vertical timeline with commit entries
 * - Visual additions/deletions bars per commit
 * - Rename tracking indicators
 * - Click to view commit details
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileCode,
  FolderOpen,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getFileHistory } from '@/lib/native/git/file-history';
import type { GitFileHistoryEntry } from '@/lib/native/git/file-history';
import { formatCommitDate } from '@/types/system/git';
import { open } from '@tauri-apps/plugin-dialog';

export interface GitFileHistoryProps {
  repoPath: string;
  initialFilePath?: string;
  onCommitClick?: (commitHash: string) => void;
  className?: string;
}

export function GitFileHistory({
  repoPath,
  initialFilePath = '',
  onCommitClick,
  className,
}: GitFileHistoryProps) {
  const t = useTranslations('git');
  const [filePath, setFilePath] = useState(initialFilePath);
  const [entries, setEntries] = useState<GitFileHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (path?: string) => {
      const target = path ?? filePath;
      if (!target.trim()) return;
      setIsLoading(true);
      setError(null);
      try {
        const result = await getFileHistory(repoPath, target.trim());
        if (result.success && result.data) {
          setEntries(result.data);
        } else {
          setError(result.error || 'Failed to load file history');
          setEntries([]);
        }
      } catch (err) {
        setError(String(err));
        setEntries([]);
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
        title: t('fileHistory.selectFile'),
        defaultPath: repoPath,
      });
      if (selected && typeof selected === 'string') {
        const relative = selected.startsWith(repoPath)
          ? selected.slice(repoPath.length).replace(/^[/\\]+/, '')
          : selected;
        setFilePath(relative);
        await loadHistory(relative);
      }
    } catch {
      // User cancelled
    }
  }, [repoPath, t, loadHistory]);

  // Find max additions+deletions for bar scaling
  const maxChange = Math.max(
    1,
    ...entries.map((e) => e.additions + e.deletions)
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('fileHistory.title')}</h2>
        </div>
        <div className="flex gap-2">
          <Input
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
            placeholder={t('fileHistory.filePlaceholder')}
            className="flex-1 font-mono text-sm"
          />
          <Button variant="outline" size="icon" onClick={handlePickFile}>
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => loadHistory()}
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
            {t('fileHistory.loading')}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center gap-2 p-4 m-4 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <FileCode className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">{t('fileHistory.noHistory')}</p>
            <p className="text-xs mt-1">{t('fileHistory.noHistoryHint')}</p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="p-4 space-y-1">
            {entries.map((entry, idx) => {
              const { commit, additions, deletions, oldPath } = entry;
              const total = additions + deletions;
              const addWidth = total > 0 ? Math.round((additions / maxChange) * 100) : 0;
              const delWidth = total > 0 ? Math.round((deletions / maxChange) * 100) : 0;
              const initials = commit.author
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div
                  key={`${commit.hash}-${idx}`}
                  className={cn(
                    'flex gap-3 p-3 rounded-lg border border-transparent',
                    'hover:border-border hover:bg-muted/30 cursor-pointer transition-all'
                  )}
                  onClick={() => onCommitClick?.(commit.hash)}
                >
                  {/* Timeline dot + avatar */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                    {idx < entries.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {commit.author}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatCommitDate(commit.date)}
                      </span>
                    </div>

                    <p className="text-sm truncate">{commit.message}</p>

                    {/* Rename indicator */}
                    {oldPath && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <ArrowRight className="h-3 w-3" />
                        <span>{t('fileHistory.renamedFrom')}: {oldPath}</span>
                      </div>
                    )}

                    {/* Change bar */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5 w-10">
                        <Plus className="h-3 w-3" />
                        {additions}
                      </span>
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5 w-10">
                        <Minus className="h-3 w-3" />
                        {deletions}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden flex max-w-[200px]">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${addWidth}%` }}
                        />
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${delWidth}%` }}
                        />
                      </div>
                      <code className="font-mono text-muted-foreground">
                        {commit.shortHash}
                      </code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
