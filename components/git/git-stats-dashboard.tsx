'use client';

/**
 * Git Stats Dashboard - Repository statistics visualization
 *
 * Displays:
 * - Contributor table (sortable)
 * - Activity heatmap (GitHub-style calendar)
 * - File type distribution bar
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Users,
  Calendar,
  FileCode,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GitRepoStats } from '@/types/system/git';

// ==================== Types ====================

type SortField = 'commits' | 'additions' | 'deletions' | 'name';
type SortDir = 'asc' | 'desc';

interface GitStatsDashboardProps {
  stats: GitRepoStats | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ==================== Heatmap Helpers ====================

function getHeatmapColor(count: number, max: number): string {
  if (count === 0) return 'var(--muted)';
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return 'hsl(150, 50%, 75%)';
  if (ratio < 0.5) return 'hsl(150, 60%, 55%)';
  if (ratio < 0.75) return 'hsl(150, 70%, 40%)';
  return 'hsl(150, 80%, 30%)';
}

function getLast52Weeks(): string[] {
  const days: string[] = [];
  const now = new Date();
  // Go back to the most recent Sunday
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  // Go back 52 weeks
  const start = new Date(startOfWeek);
  start.setDate(start.getDate() - 52 * 7);

  const current = new Date(start);
  while (current <= now) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// ==================== Component ====================

export function GitStatsDashboard({
  stats,
  onRefresh,
  isLoading,
  className,
}: GitStatsDashboardProps) {
  const t = useTranslations('git');
  const [sortField, setSortField] = useState<SortField>('commits');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showAllContributors, setShowAllContributors] = useState(false);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return field;
    });
  }, []);

  const sortedContributors = useMemo(() => {
    if (!stats) return [];
    const sorted = [...stats.contributors];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'commits':
          cmp = a.commits - b.commits;
          break;
        case 'additions':
          cmp = a.additions - b.additions;
          break;
        case 'deletions':
          cmp = a.deletions - b.deletions;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [stats, sortField, sortDir]);

  const displayContributors = showAllContributors
    ? sortedContributors
    : sortedContributors.slice(0, 10);

  // Heatmap data
  const heatmapData = useMemo(() => {
    if (!stats) return { days: [] as string[], counts: new Map<string, number>(), max: 0 };
    const days = getLast52Weeks();
    const counts = new Map<string, number>();
    stats.activity.forEach((d) => counts.set(d.date, d.commits));
    const max = Math.max(0, ...stats.activity.map((d) => d.commits));
    return { days, counts, max };
  }, [stats]);

  // File type distribution (top 10)
  const fileTypes = useMemo(() => {
    if (!stats) return [];
    const entries = Object.entries(stats.fileTypeDistribution);
    entries.sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 12);
  }, [stats]);

  const totalFiles = useMemo(
    () => fileTypes.reduce((sum, [, count]) => sum + count, 0),
    [fileTypes]
  );

  if (!stats && !isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-muted-foreground', className)}>
        <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">{t('stats.noData')}</p>
        {onRefresh && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('stats.refresh')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{t('stats.title')}</h2>
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {isLoading && !stats ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-2xl font-bold">{stats.totalCommits.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{t('stats.totalCommits')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-2xl font-bold">{stats.totalContributors}</div>
                <p className="text-xs text-muted-foreground">{t('stats.contributors')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="text-2xl font-bold">{Object.keys(stats.fileTypeDistribution).length}</div>
                <p className="text-xs text-muted-foreground">{t('stats.fileTypes')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('stats.activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-grid gap-[2px]" style={{
                  gridTemplateRows: 'repeat(7, 12px)',
                  gridAutoFlow: 'column',
                  gridAutoColumns: '12px',
                }}>
                  {heatmapData.days.map((day) => {
                    const count = heatmapData.counts.get(day) || 0;
                    return (
                      <div
                        key={day}
                        className="rounded-[2px] transition-colors"
                        style={{
                          backgroundColor: getHeatmapColor(count, heatmapData.max),
                          width: 12,
                          height: 12,
                        }}
                        title={`${day}: ${count} ${count === 1 ? 'commit' : 'commits'}`}
                      />
                    );
                  })}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span>{t('stats.less')}</span>
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <div
                    key={ratio}
                    className="w-3 h-3 rounded-[2px]"
                    style={{
                      backgroundColor: ratio === 0
                        ? 'var(--muted)'
                        : getHeatmapColor(
                            Math.ceil(ratio * Math.max(heatmapData.max, 1)),
                            heatmapData.max
                          ),
                    }}
                  />
                ))}
                <span>{t('stats.more')}</span>
              </div>
            </CardContent>
          </Card>

          {/* File Type Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                {t('stats.fileDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Stacked bar */}
              <div className="flex h-5 rounded-md overflow-hidden mb-3">
                {fileTypes.map(([ext, count], idx) => {
                  const pct = (count / totalFiles) * 100;
                  const hue = (idx * 37) % 360;
                  return (
                    <div
                      key={ext}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: `hsl(${hue}, 60%, 55%)`,
                        minWidth: pct > 0 ? 2 : 0,
                      }}
                      title={`${ext}: ${count} files (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {fileTypes.map(([ext, count], idx) => {
                  const pct = ((count / totalFiles) * 100).toFixed(1);
                  const hue = (idx * 37) % 360;
                  return (
                    <div key={ext} className="flex items-center gap-1 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: `hsl(${hue}, 60%, 55%)` }}
                      />
                      <span className="font-mono">{ext}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Contributors Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('stats.contributors')}
                <Badge variant="secondary" className="text-xs ml-1">
                  {stats.totalContributors}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[400px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium">
                        <button
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={() => handleSort('name')}
                        >
                          {t('stats.author')}
                          {sortField === 'name' && (
                            sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-foreground"
                          onClick={() => handleSort('commits')}
                        >
                          {t('stats.commits')}
                          {sortField === 'commits' && (
                            sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-foreground text-green-600 dark:text-green-400"
                          onClick={() => handleSort('additions')}
                        >
                          ++
                          {sortField === 'additions' && (
                            sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                      <th className="text-right p-2 font-medium">
                        <button
                          className="flex items-center gap-1 ml-auto hover:text-foreground text-red-600 dark:text-red-400"
                          onClick={() => handleSort('deletions')}
                        >
                          --
                          {sortField === 'deletions' && (
                            sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayContributors.map((c, idx) => (
                      <tr key={c.email || idx} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2">
                          <div className="font-medium truncate max-w-[200px]">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {c.email}
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">
                          {c.commits.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums text-green-600 dark:text-green-400">
                          +{c.additions.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums text-red-600 dark:text-red-400">
                          -{c.deletions.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              {sortedContributors.length > 10 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowAllContributors((v) => !v)}
                  >
                    {showAllContributors
                      ? t('stats.showLess')
                      : t('stats.showAll', { count: sortedContributors.length })}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
