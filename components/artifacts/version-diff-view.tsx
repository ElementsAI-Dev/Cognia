'use client';

/**
 * VersionDiffView - Inline diff view for comparing artifact versions
 * Uses a simple line-based diff algorithm (no external dependency)
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { computeDiff, computeDiffStats } from '@/lib/artifacts';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VersionDiffViewProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
  className?: string;
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

  const stats = useMemo(() => computeDiffStats(diff), [diff]);

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
