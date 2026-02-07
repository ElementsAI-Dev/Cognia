'use client';

/**
 * SandboxStatistics - Dashboard component for sandbox execution statistics
 * Displays overall stats, per-language breakdown, and daily execution counts
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSandboxStats } from '@/hooks/sandbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Code,
  RefreshCw,
  TrendingUp,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGE_INFO } from '@/types/system/sandbox';

export interface SandboxStatisticsProps {
  className?: string;
}

export function SandboxStatistics({ className }: SandboxStatisticsProps) {
  const t = useTranslations('sandbox');
  const { stats, languageStats, dailyCounts, loading, refresh } = useSandboxStats(30);

  const successRate = useMemo(() => {
    if (!stats || stats.total_executions === 0) return 0;
    return Math.round((stats.successful_executions / stats.total_executions) * 100);
  }, [stats]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const maxDailyCount = useMemo(() => {
    if (!dailyCounts.length) return 1;
    return Math.max(...dailyCounts.map((d) => d.count), 1);
  }, [dailyCounts]);

  if (loading) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_executions === 0) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle className="text-lg">Statistics</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <Empty className="py-8 border-0">
            <EmptyMedia variant="icon">
              <BarChart3 className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No execution data yet</EmptyTitle>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle className="text-lg">Statistics</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
        <CardDescription>
          {stats.total_executions} total executions
          {stats.most_used_language && (
            <> · Most used: <Badge variant="outline" className="ml-1">{stats.most_used_language}</Badge></>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="px-6 pb-6 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('success')}
                </div>
                <div className="text-2xl font-bold">{successRate}%</div>
                <Progress value={successRate} className="h-1 mt-2" />
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Zap className="h-3.5 w-3.5" />
                  Total
                </div>
                <div className="text-2xl font-bold">{stats.total_executions}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">{stats.successful_executions}</span>
                  {' / '}
                  <span className="text-red-500">{stats.failed_executions}</span>
                  {' / '}
                  <span className="text-yellow-500">{stats.timeout_executions}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Timer className="h-3.5 w-3.5" />
                  {t('average')}
                </div>
                <div className="text-2xl font-bold">{formatTime(stats.avg_execution_time_ms)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Total: {formatTime(stats.total_execution_time_ms)}
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Code className="h-3.5 w-3.5" />
                  Snippets
                </div>
                <div className="text-2xl font-bold">{stats.total_snippets}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.total_sessions} sessions
                </div>
              </div>
            </div>

            {/* Daily Activity Chart */}
            {dailyCounts.length > 0 && (
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-sm font-medium mb-3">Daily Activity (Last 30 days)</div>
                <div className="flex items-end gap-0.5 h-16">
                  {dailyCounts.map((day) => {
                    const height = Math.max((day.count / maxDailyCount) * 100, 4);
                    return (
                      <div
                        key={day.date}
                        className="flex-1 group relative"
                        title={`${day.date}: ${day.count} ${t('times')}`}
                      >
                        <div
                          className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {dailyCounts[0]?.date?.slice(5) || ''}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {dailyCounts[dailyCounts.length - 1]?.date?.slice(5) || ''}
                  </span>
                </div>
              </div>
            )}

            {/* Per-Language Breakdown */}
            {languageStats.length > 0 && (
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-sm font-medium mb-3">Language Breakdown</div>
                <div className="space-y-2">
                  {languageStats
                    .sort((a, b) => b.total_executions - a.total_executions)
                    .map((lang) => {
                      const info = LANGUAGE_INFO[lang.language] || {
                        name: lang.language,
                        icon: '📄',
                        color: '#666',
                      };
                      const langSuccessRate =
                        lang.total_executions > 0
                          ? Math.round(
                              (lang.successful_executions / lang.total_executions) * 100
                            )
                          : 0;
                      const pct =
                        stats.total_executions > 0
                          ? Math.round(
                              (lang.total_executions / stats.total_executions) * 100
                            )
                          : 0;

                      return (
                        <div key={lang.language} className="flex items-center gap-3">
                          <span className="text-lg w-6 text-center shrink-0">{info.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-sm font-medium">{info.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {lang.total_executions} {t('times')} ({pct}%)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={langSuccessRate}
                                className="h-1.5 flex-1"
                              />
                              <div className="flex items-center gap-1 text-xs shrink-0">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>{lang.successful_executions}</span>
                                <XCircle className="h-3 w-3 text-red-500 ml-1" />
                                <span>{lang.failed_executions}</span>
                                {lang.timeout_executions > 0 && (
                                  <>
                                    <Clock className="h-3 w-3 text-yellow-500 ml-1" />
                                    <span>{lang.timeout_executions}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {t('average')}: {formatTime(lang.avg_execution_time_ms)}
                              {lang.last_used && (
                                <> · Last: {new Date(lang.last_used).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default SandboxStatistics;
