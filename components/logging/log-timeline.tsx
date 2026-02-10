'use client';

/**
 * LogTimeline
 *
 * Compact horizontal bar showing log density over time,
 * color-coded by severity. Clickable regions to filter by time range.
 */

import { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StructuredLogEntry } from '@/lib/logger';

export interface LogTimelineProps {
  logs: StructuredLogEntry[];
  className?: string;
  /** Number of time buckets to divide the timeline into */
  bucketCount?: number;
  /** Callback when a time range is clicked */
  onTimeRangeClick?: (start: Date, end: Date) => void;
}

interface TimelineBucket {
  start: Date;
  end: Date;
  total: number;
  error: number;
  warn: number;
  info: number;
  other: number;
}

function getBucketColor(bucket: TimelineBucket): string {
  if (bucket.total === 0) return 'bg-muted/30';
  if (bucket.error > 0) return 'bg-red-500';
  if (bucket.warn > 0) return 'bg-yellow-500';
  if (bucket.info > 0) return 'bg-green-500';
  return 'bg-blue-500';
}

function getBucketOpacity(bucket: TimelineBucket, maxCount: number): number {
  if (bucket.total === 0 || maxCount === 0) return 0.15;
  return Math.max(0.2, Math.min(1, bucket.total / maxCount));
}

export function LogTimeline({
  logs,
  className,
  bucketCount = 60,
  onTimeRangeClick,
}: LogTimelineProps) {
  const t = useTranslations('logging');

  const buckets = useMemo((): TimelineBucket[] => {
    if (logs.length === 0) return [];

    let minTs = Infinity;
    let maxTs = -Infinity;
    for (const log of logs) {
      const ts = new Date(log.timestamp).getTime();
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    }
    const range = Math.max(maxTs - minTs, 1000); // At least 1 second
    const bucketMs = range / bucketCount;

    const result: TimelineBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
      start: new Date(minTs + i * bucketMs),
      end: new Date(minTs + (i + 1) * bucketMs),
      total: 0,
      error: 0,
      warn: 0,
      info: 0,
      other: 0,
    }));

    for (const log of logs) {
      const ts = new Date(log.timestamp).getTime();
      const idx = Math.min(Math.floor((ts - minTs) / bucketMs), bucketCount - 1);

      result[idx].total++;
      if (log.level === 'error' || log.level === 'fatal') {
        result[idx].error++;
      } else if (log.level === 'warn') {
        result[idx].warn++;
      } else if (log.level === 'info') {
        result[idx].info++;
      } else {
        result[idx].other++;
      }
    }

    return result;
  }, [logs, bucketCount]);

  const maxCount = useMemo(() => {
    let max = 1;
    for (const b of buckets) {
      if (b.total > max) max = b.total;
    }
    return max;
  }, [buckets]);

  const handleBucketClick = useCallback(
    (bucket: TimelineBucket) => {
      onTimeRangeClick?.(bucket.start, bucket.end);
    },
    [onTimeRangeClick]
  );

  if (logs.length === 0) return null;

  const firstTime = buckets[0]?.start;
  const lastTime = buckets[buckets.length - 1]?.end;

  return (
    <div className={cn('px-3 py-2 border-b bg-muted/10', className)}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground font-medium">
          {t('timeline.title')}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-green-500" />
            <span className="text-[10px] text-muted-foreground">{t('levels.info')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-yellow-500" />
            <span className="text-[10px] text-muted-foreground">{t('levels.warn')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-sm bg-red-500" />
            <span className="text-[10px] text-muted-foreground">{t('levels.error')}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-px h-6 rounded overflow-hidden">
        {buckets.map((bucket, i) => {
          const color = getBucketColor(bucket);
          const opacity = getBucketOpacity(bucket, maxCount);

          return (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'flex-1 min-w-0 transition-all hover:ring-1 hover:ring-primary/50',
                    color,
                    onTimeRangeClick && 'cursor-pointer'
                  )}
                  style={{ opacity }}
                  onClick={() => handleBucketClick(bucket)}
                  aria-label={`${bucket.total} logs`}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-0.5">
                  <p className="font-medium">
                    {bucket.start.toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                  <p>
                    {t('timeline.total')}: {bucket.total}
                  </p>
                  {bucket.error > 0 && (
                    <p className="text-red-400">
                      {t('timeline.errors')}: {bucket.error}
                    </p>
                  )}
                  {bucket.warn > 0 && (
                    <p className="text-yellow-400">
                      {t('timeline.warnings')}: {bucket.warn}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Time labels */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-muted-foreground">
          {firstTime?.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {lastTime?.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

export default LogTimeline;
