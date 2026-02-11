'use client';

/**
 * VersionDiffView - Inline diff view for comparing artifact versions
 * Uses a simple line-based diff algorithm (no external dependency)
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VersionDiffViewProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
  className?: string;
}

type DiffLineType = 'added' | 'removed' | 'unchanged';

interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

/**
 * Simple LCS-based line diff
 */
function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const m = oldLines.length;
  const n = newLines.length;

  // Guard: fall back to simple diff for very large inputs to prevent browser freeze
  if (m * n > 1_000_000) {
    const result: DiffLine[] = [];
    oldLines.forEach((line, i) => result.push({ type: 'removed', content: line, oldLineNum: i + 1 }));
    newLines.forEach((line, i) => result.push({ type: 'added', content: line, newLineNum: i + 1 }));
    return result;
  }

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({
        type: 'unchanged',
        content: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({
        type: 'added',
        content: newLines[j - 1],
        newLineNum: j,
      });
      j--;
    } else {
      result.unshift({
        type: 'removed',
        content: oldLines[i - 1],
        oldLineNum: i,
      });
      i--;
    }
  }

  return result;
}

export function VersionDiffView({
  oldContent,
  newContent,
  oldLabel,
  newLabel,
  className,
}: VersionDiffViewProps) {
  const t = useTranslations('artifacts');

  const diff = useMemo(
    () => computeDiff(oldContent, newContent),
    [oldContent, newContent]
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diff) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
    return { added, removed };
  }, [diff]);

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>{oldLabel || t('previousVersion')}</span>
          <span>→</span>
          <span>{newLabel || t('currentVersion')}</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          {stats.added > 0 && (
            <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
          )}
          {stats.removed > 0 && (
            <span className="text-red-600 dark:text-red-400">-{stats.removed}</span>
          )}
        </div>
      </div>

      {/* Diff lines */}
      <ScrollArea className="max-h-[400px]">
        <div className="font-mono text-xs leading-5">
          {diff.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                'flex',
                line.type === 'added' && 'bg-green-50 dark:bg-green-950/30',
                line.type === 'removed' && 'bg-red-50 dark:bg-red-950/30'
              )}
            >
              {/* Line numbers */}
              <span className="select-none w-10 text-right pr-2 text-muted-foreground/50 shrink-0 border-r">
                {line.oldLineNum ?? ''}
              </span>
              <span className="select-none w-10 text-right pr-2 text-muted-foreground/50 shrink-0 border-r">
                {line.newLineNum ?? ''}
              </span>
              {/* Indicator */}
              <span
                className={cn(
                  'select-none w-5 text-center shrink-0',
                  line.type === 'added' && 'text-green-600 dark:text-green-400',
                  line.type === 'removed' && 'text-red-600 dark:text-red-400'
                )}
              >
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              {/* Content */}
              <span className="flex-1 px-2 whitespace-pre overflow-x-auto">
                {line.content}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
