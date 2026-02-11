'use client';

/**
 * StatsOverview - Modern statistics cards for scheduler dashboard
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Activity,
  Pause,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskStatistics, ScheduledTask, TaskExecution } from '@/types/scheduler';
import { formatDuration, formatRelativeTime } from '@/lib/scheduler/format-utils';

interface StatsOverviewProps {
  statistics: TaskStatistics | null;
  activeTasks: ScheduledTask[];
  pausedTasks: ScheduledTask[];
  upcomingTasks: ScheduledTask[];
  recentExecutions: TaskExecution[];
  schedulerStatus: string;
  onSelectTask: (taskId: string) => void;
}

export function StatsOverview({
  statistics,
  activeTasks,
  pausedTasks,
  upcomingTasks,
  recentExecutions,
  schedulerStatus: _schedulerStatus,
  onSelectTask,
}: StatsOverviewProps) {
  const t = useTranslations('scheduler');

  const successRate = useMemo(() => {
    if (!statistics) return 0;
    const total = statistics.successfulExecutions + statistics.failedExecutions;
    if (total === 0) return 0;
    return Math.round((statistics.successfulExecutions / total) * 100);
  }, [statistics]);

  if (!statistics) return null;

  return (
    <div className="space-y-4">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Tasks */}
        <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('totalTasks') || 'Total Tasks'}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{statistics.totalTasks}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <Card className="relative overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/[0.02] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('activeTasks') || 'Active'}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-green-500">{activeTasks.length}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paused Tasks */}
        <Card className="relative overflow-hidden border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-yellow-500/[0.02] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('pausedTasks') || 'Paused'}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-yellow-500">{pausedTasks.length}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
                <Pause className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executions */}
        <Card className="relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/[0.02] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('totalExecutions') || 'Executions'}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-blue-500">{statistics.totalExecutions}</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="relative col-span-2 overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('successRate') || 'Success Rate'}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  <span className={cn(successRate >= 90 ? 'text-green-500' : successRate >= 70 ? 'text-yellow-500' : 'text-red-500')}>
                    {successRate}%
                  </span>
                </p>
              </div>
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                {/* Ring progress indicator */}
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" strokeWidth="3"
                    strokeDasharray={`${successRate * 0.942} 100`}
                    strokeLinecap="round"
                    className={cn(
                      successRate >= 90 ? 'stroke-green-500' : successRate >= 70 ? 'stroke-yellow-500' : 'stroke-red-500'
                    )}
                  />
                </svg>
                <TrendingUp className="absolute h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle className="h-3 w-3" /> {statistics.successfulExecutions}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" /> {statistics.failedExecutions}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & Recent Row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-blue-500" />
                {t('upcomingTasks') || 'Upcoming Tasks'}
              </h3>
              {upcomingTasks.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{upcomingTasks.length}</Badge>
              )}
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">{t('noUpcomingTasks') || 'No upcoming tasks'}</p>
            ) : (
              <div className="space-y-1">
                {upcomingTasks.slice(0, 5).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      task.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{task.name}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                      {formatRelativeTime(task.nextRunAt)}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-green-500" />
                {t('recentExecutions') || 'Recent Executions'}
              </h3>
              {recentExecutions.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{recentExecutions.length}</Badge>
              )}
            </div>
            {recentExecutions.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">{t('noRecentExecutions') || 'No recent executions'}</p>
            ) : (
              <div className="space-y-1">
                {recentExecutions.slice(0, 5).map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2"
                  >
                    <div className="shrink-0">
                      {exec.status === 'completed' ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : exec.status === 'failed' ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : exec.status === 'running' ? (
                        <Activity className="h-3.5 w-3.5 animate-pulse text-blue-500" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-yellow-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{exec.taskName}</p>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {formatDuration(exec.duration)}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground/70">
                      {exec.startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StatsOverview;
