'use client';

/**
 * TaskDetails - Display detailed information about a scheduled task
 * Redesigned with hero section, visual metrics, and timeline execution history
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Settings,
  Bell,
  History,
  Timer,
  Repeat,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ScheduledTask, TaskExecution, TaskExecutionStatus } from '@/types/scheduler';
import { describeCronExpression, getNextCronTimes, matchesCronExpression } from '@/lib/scheduler/cron-parser';

interface TaskDetailsProps {
  task: ScheduledTask;
  executions: TaskExecution[];
  onPause: () => void;
  onResume: () => void;
  onRunNow: () => void;
  onDelete: () => void;
  onEdit: () => void;
  isLoading?: boolean;
  onCancelPluginExecution?: (executionId: string) => boolean;
  isPluginExecutionActive?: (executionId: string) => boolean;
}

const executionStatusConfig: Record<TaskExecutionStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-500/10 text-gray-500', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Running', color: 'bg-blue-500/10 text-blue-500', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: 'Failed', color: 'bg-red-500/10 text-red-500', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-yellow-500/10 text-yellow-500', icon: <AlertCircle className="h-3 w-3" /> },
  skipped: { label: 'Skipped', color: 'bg-orange-500/10 text-orange-500', icon: <AlertCircle className="h-3 w-3" /> },
};

export function TaskDetails({
  task,
  executions,
  onPause,
  onResume,
  onRunNow,
  onDelete,
  onEdit,
  isLoading,
  onCancelPluginExecution,
  isPluginExecutionActive,
}: TaskDetailsProps) {
  const t = useTranslations('scheduler');

  const triggerDescription = useMemo(() => {
    switch (task.trigger.type) {
      case 'cron':
        return task.trigger.cronExpression 
          ? describeCronExpression(task.trigger.cronExpression)
          : 'Invalid cron expression';
      case 'interval':
        const minutes = (task.trigger.intervalMs || 0) / 60000;
        return `Every ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      case 'once':
        return task.trigger.runAt 
          ? `Once at ${task.trigger.runAt.toLocaleString()}`
          : 'One-time (no date set)';
      case 'event':
        return `On event: ${task.trigger.eventType || 'Not configured'}`;
      default:
        return 'Unknown trigger type';
    }
  }, [task.trigger]);

  const successRate = useMemo(() => {
    const total = task.successCount + task.failureCount;
    if (total === 0) return null;
    return Math.round((task.successCount / total) * 100);
  }, [task.successCount, task.failureCount]);

  const nextRunTimes = useMemo(() => {
    if (task.trigger.type === 'cron' && task.trigger.cronExpression) {
      return getNextCronTimes(task.trigger.cronExpression, 5, new Date());
    }
    return [];
  }, [task.trigger]);

  const isCurrentlyMatching = useMemo(() => {
    if (task.trigger.type === 'cron' && task.trigger.cronExpression) {
      return matchesCronExpression(task.trigger.cronExpression, new Date());
    }
    return false;
  }, [task.trigger]);

  const formatDuration = (ms: number | undefined): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Hero Header */}
      <div className="border-b bg-gradient-to-b from-background to-muted/5 px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold sm:text-lg">{task.name}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 capitalize',
                  task.status === 'active' && 'border-green-500/30 bg-green-500/10 text-green-500',
                  task.status === 'paused' && 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
                  task.status === 'disabled' && 'border-gray-400/30 bg-gray-400/10 text-gray-400',
                  task.status === 'expired' && 'border-red-500/30 bg-red-500/10 text-red-500'
                )}
              >
                {task.status}
              </Badge>
            </div>
            {task.description && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1.5">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="font-semibold tabular-nums">{task.runCount}</span>
            <span className="text-muted-foreground">{t('totalRuns') || 'runs'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-green-500/5 px-2.5 py-1.5">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span className="font-semibold tabular-nums text-green-500">{task.successCount}</span>
          </div>
          {task.failureCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-red-500/5 px-2.5 py-1.5">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="font-semibold tabular-nums text-red-500">{task.failureCount}</span>
            </div>
          )}
          {successRate !== null && (
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    successRate >= 90 ? 'bg-green-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${successRate}%` }}
                />
              </div>
              <span className="tabular-nums font-medium">{successRate}%</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={onRunNow} disabled={isLoading}>
                  <Play className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">{t('runNow') || 'Run'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('runNow') || 'Run Now'}</TooltipContent>
            </Tooltip>
            {task.status === 'active' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={onPause}>
                    <Pause className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{t('pause') || 'Pause'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('pause') || 'Pause'}</TooltipContent>
              </Tooltip>
            ) : task.status === 'paused' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={onResume}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{t('resume') || 'Resume'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('resume') || 'Resume'}</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={onEdit}>
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">{t('edit') || 'Edit'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('edit') || 'Edit'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive ml-auto" onClick={onDelete}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('delete') || 'Delete'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto border-b px-4 sm:px-6">
          <TabsList className="h-9 w-full justify-start bg-transparent p-0 sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 pb-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Calendar className="h-3.5 w-3.5" />
              {t('overview') || 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 pb-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <History className="h-3.5 w-3.5" />
              {t('executions') || 'Executions'}
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 rounded-none border-b-2 border-transparent px-3 pb-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
              <Settings className="h-3.5 w-3.5" />
              {t('config') || 'Config'}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-auto">
          <div className="space-y-4 p-4 sm:p-6">
            {/* Schedule Section */}
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4 text-blue-500" />
                {t('schedule') || 'Schedule'}
              </h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('triggerType') || 'Trigger'}</span>
                  <Badge variant="secondary" className="capitalize text-xs">{task.trigger.type}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('pattern') || 'Pattern'}</span>
                  <span className="max-w-[200px] truncate text-right font-medium">{triggerDescription}</span>
                </div>
                {task.trigger.timezone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('timezone') || 'Timezone'}</span>
                    <span className="font-medium">{task.trigger.timezone}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('nextRun') || 'Next Run'}</span>
                  <span className="font-medium">{task.nextRunAt ? task.nextRunAt.toLocaleString() : 'Not scheduled'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('lastRun') || 'Last Run'}</span>
                  <span className="font-medium">{task.lastRunAt ? task.lastRunAt.toLocaleString() : 'Never'}</span>
                </div>
                {isCurrentlyMatching && (
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-green-500/10 px-2.5 py-1.5 text-xs text-green-600 dark:text-green-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    {t('cronMatchingNow') || 'Cron matches current time'}
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Runs Timeline */}
            {nextRunTimes.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card/80 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Timer className="h-4 w-4 text-violet-500" />
                  {t('upcomingRuns') || 'Upcoming Runs'}
                </h3>
                <div className="space-y-0">
                  {nextRunTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-3 py-1.5">
                      <div className="flex flex-col items-center">
                        <div className={cn('h-2 w-2 rounded-full', index === 0 ? 'bg-violet-500' : 'bg-muted-foreground/30')} />
                        {index < nextRunTimes.length - 1 && <div className="h-5 w-px bg-muted-foreground/20" />}
                      </div>
                      <div className="flex flex-1 items-center justify-between text-sm">
                        <span className="font-mono text-xs">{time.toLocaleString()}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Error */}
            {task.lastError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <h4 className="text-sm font-medium text-destructive">{t('lastError') || 'Last Error'}</h4>
                    <p className="mt-1 font-mono text-xs text-destructive/80">{task.lastError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 sm:p-6">
              {executions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                    <History className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('noExecutions') || 'No executions yet'}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {executions.map((execution) => {
                    const status = executionStatusConfig[execution.status];
                    return (
                      <div
                        key={execution.id}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30"
                      >
                        {/* Status icon */}
                        <div className="mt-0.5 shrink-0">{status.icon}</div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-xs font-medium', status.color.split(' ').find(c => c.startsWith('text-')))}>{status.label}</span>
                            {execution.retryAttempt > 0 && (
                              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                Retry #{execution.retryAttempt}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {execution.startedAt.toLocaleString()}
                          </div>
                          {execution.error && (
                            <div className="mt-1.5 rounded-md bg-destructive/5 px-2 py-1.5 font-mono text-[11px] text-destructive">
                              {execution.error}
                            </div>
                          )}
                        </div>

                        {/* Duration + Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          {execution.status === 'running' && isPluginExecutionActive?.(execution.id) && onCancelPluginExecution && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                              onClick={() => onCancelPluginExecution(execution.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          <span className="tabular-nums text-xs text-muted-foreground">
                            {formatDuration(execution.duration)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="config" className="flex-1 overflow-auto">
          <div className="space-y-4 p-4 sm:p-6">
            {/* Execution Config */}
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Repeat className="h-4 w-4 text-blue-500" />
                {t('executionConfig') || 'Execution Config'}
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timeout</span>
                  <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs">{task.config.timeout}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max Retries</span>
                  <span className="font-medium">{task.config.maxRetries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Retry Delay</span>
                  <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-xs">{task.config.retryDelay}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Allow Concurrent</span>
                  <span className={cn('font-medium', task.config.allowConcurrent ? 'text-green-500' : 'text-muted-foreground')}>
                    {task.config.allowConcurrent ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Config */}
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4 text-amber-500" />
                {t('notificationConfig') || 'Notifications'}
              </h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'On Start', value: task.notification.onStart },
                  { label: 'On Complete', value: task.notification.onComplete },
                  { label: 'On Error', value: task.notification.onError },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <div className={cn('h-4 w-4 rounded-full flex items-center justify-center', item.value ? 'bg-green-500/10' : 'bg-muted')}>
                      {item.value ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-muted-foreground/40" />}
                    </div>
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Channels</span>
                  <div className="flex gap-1">
                    {(task.notification.channels ?? []).map((ch) => (
                      <Badge key={ch} variant="secondary" className="text-[10px] capitalize">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Payload */}
            <div className="rounded-xl border border-border/50 bg-card/80 p-4">
              <h3 className="mb-1 text-sm font-semibold">{t('payload') || 'Payload'}</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                {t('payloadDescription') || 'Data passed to the task executor'}
              </p>
              <pre className="overflow-auto rounded-lg bg-muted/50 p-3 font-mono text-xs max-h-40">
                {JSON.stringify(task.payload, null, 2)}
              </pre>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TaskDetails;
