'use client';

/**
 * VersionDiffView - displays diff between two versions of a canvas document
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { computeDiff as computeDiffRaw, computeDiffStats } from '@/lib/artifacts';
import type { CanvasDiffLine } from '@/types/canvas/panel';

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
  const t = useTranslations('canvas');
  const [copied, setCopied] = useState(false);

  const diff: CanvasDiffLine[] = useMemo(() => {
    const rawDiff = computeDiffRaw(oldContent, newContent);
    return rawDiff.map((line) => ({
      type: line.type,
      content: line.content,
      lineNumber: { old: line.oldLineNum, new: line.newLineNum },
    }));
  }, [oldContent, newContent]);

  const truncated = false; // Large input guard is handled inside computeDiff

  const stats = useMemo(() => computeDiffStats(computeDiffRaw(oldContent, newContent)), [oldContent, newContent]);

  const diffText = useMemo(() => {
    return diff
      .map((line) => {
        const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
        return `${prefix} ${line.content}`;
      })
      .join('\n');
  }, [diff]);

  const handleCopyDiff = async () => {
    try {
      await navigator.clipboard.writeText(diffText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      loggers.ui.error('Failed to copy diff:', err);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header with labels and stats */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          {oldLabel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('from')}:</span>
              <Badge variant="outline" className="text-xs">
                {oldLabel}
              </Badge>
            </div>
          )}
          {newLabel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('to')}:</span>
              <Badge variant="outline" className="text-xs">
                {newLabel}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-600 dark:text-green-400">+{stats.added}</span>
          <span className="text-red-600 dark:text-red-400">-{stats.removed}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyDiff}>
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('copyDiff')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Truncation warning (large input guard handled inside computeDiff) */}
      {truncated && (
        <div className="px-4 py-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-b">
          Diff simplified for very large inputs.
        </div>
      )}

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
                <span className="w-6 sm:w-8 text-right pr-1">{line.lineNumber.old || ''}</span>
                <span className="w-6 sm:w-8 text-right pr-1">{line.lineNumber.new || ''}</span>
              </div>
              {/* Change indicator */}
              <span
                className={cn(
                  'w-4 shrink-0 text-center select-none',
                  line.type === 'added' && 'text-green-600 dark:text-green-400',
                  line.type === 'removed' && 'text-red-600 dark:text-red-400'
                )}
              >
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

