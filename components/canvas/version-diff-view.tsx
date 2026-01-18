'use client';

/**
 * VersionDiffView - displays diff between two versions of a canvas document
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: { old?: number; new?: number };
}

interface VersionDiffViewProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
  className?: string;
}

/**
 * Simple line-by-line diff algorithm
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const diff: DiffLine[] = [];

  // LCS-based diff for better results
  const lcs = computeLCS(oldLines, newLines);
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex]) {
      if (newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
        // Line is unchanged
        diff.push({
          type: 'unchanged',
          content: oldLines[oldIndex],
          lineNumber: { old: oldIndex + 1, new: newIndex + 1 },
        });
        oldIndex++;
        newIndex++;
        lcsIndex++;
      } else {
        // Line was added in new
        diff.push({
          type: 'added',
          content: newLines[newIndex],
          lineNumber: { new: newIndex + 1 },
        });
        newIndex++;
      }
    } else if (lcsIndex < lcs.length && newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
      // Line was removed from old
      diff.push({
        type: 'removed',
        content: oldLines[oldIndex],
        lineNumber: { old: oldIndex + 1 },
      });
      oldIndex++;
    } else if (oldIndex < oldLines.length) {
      // Line was removed
      diff.push({
        type: 'removed',
        content: oldLines[oldIndex],
        lineNumber: { old: oldIndex + 1 },
      });
      oldIndex++;
    } else if (newIndex < newLines.length) {
      // Line was added
      diff.push({
        type: 'added',
        content: newLines[newIndex],
        lineNumber: { new: newIndex + 1 },
      });
      newIndex++;
    }
  }

  return diff;
}

/**
 * Compute Longest Common Subsequence of lines
 */
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

export function VersionDiffView({
  oldContent,
  newContent,
  oldLabel,
  newLabel,
  className,
}: VersionDiffViewProps) {
  const t = useTranslations('canvas');

  const diff = useMemo(() => computeDiff(oldContent, newContent), [oldContent, newContent]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    diff.forEach((line) => {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    });
    return { added, removed };
  }, [diff]);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with labels and stats */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          {oldLabel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('from')}:</span>
              <Badge variant="outline" className="text-xs">{oldLabel}</Badge>
            </div>
          )}
          {newLabel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('to')}:</span>
              <Badge variant="outline" className="text-xs">{newLabel}</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
          <span className="text-red-600 dark:text-red-400">-{stats.removed}</span>
        </div>
      </div>

      {/* Diff content */}
      <ScrollArea className="flex-1">
        <div className="font-mono text-xs sm:text-sm">
          {diff.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex px-2 py-0.5 border-l-2',
                line.type === 'added' && 'bg-green-100 dark:bg-green-950/30 border-l-green-500',
                line.type === 'removed' && 'bg-red-100 dark:bg-red-950/30 border-l-red-500',
                line.type === 'unchanged' && 'border-l-transparent'
              )}
            >
              {/* Line numbers */}
              <div className="flex shrink-0 w-12 sm:w-16 text-muted-foreground text-xs select-none">
                <span className="w-6 sm:w-8 text-right pr-1">
                  {line.lineNumber.old || ''}
                </span>
                <span className="w-6 sm:w-8 text-right pr-1">
                  {line.lineNumber.new || ''}
                </span>
              </div>
              {/* Change indicator */}
              <span className={cn(
                'w-4 shrink-0 text-center select-none',
                line.type === 'added' && 'text-green-600 dark:text-green-400',
                line.type === 'removed' && 'text-red-600 dark:text-red-400'
              )}>
                {line.type === 'added' && '+'}
                {line.type === 'removed' && '-'}
              </span>
              {/* Content */}
              <span className="flex-1 whitespace-pre-wrap break-words overflow-x-auto">
                {line.content || ' '}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default VersionDiffView;
