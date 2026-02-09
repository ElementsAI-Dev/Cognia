'use client';

/**
 * TaskDetails - Display detailed information about a scheduled task
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
      {/* Header */}
      <div className="p-3 sm:p-4 border-b">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold truncate">{task.name}</h2>
            {task.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              task.status === 'active' && 'bg-green-500/10 text-green-500',
              task.status === 'paused' && 'bg-yellow-500/10 text-yellow-500',
              task.status === 'disabled' && 'bg-gray-500/10 text-gray-500',
              task.status === 'expired' && 'bg-red-500/10 text-red-500'
            )}
          >
            {task.status}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRunNow}
            disabled={isLoading}
            className="h-8 sm:h-9"
          >
            <Play className="h-4 w-4" />
            <span className="hidden xs:inline ml-1">{t('runNow') || 'Run Now'}</span>
          </Button>
          {task.status === 'active' ? (
            <Button variant="outline" size="sm" onClick={onPause} className="h-8 sm:h-9">
              <Pause className="h-4 w-4" />
              <span className="hidden xs:inline ml-1">{t('pause') || 'Pause'}</span>
            </Button>
          ) : task.status === 'paused' ? (
            <Button variant="outline" size="sm" onClick={onResume} className="h-8 sm:h-9">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden xs:inline ml-1">{t('resume') || 'Resume'}</span>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onEdit} className="h-8 sm:h-9">
            <Settings className="h-4 w-4" />
            <span className="hidden xs:inline ml-1">{t('edit') || 'Edit'}</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 sm:h-9 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden xs:inline ml-1">{t('delete') || 'Delete'}</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto mx-3 sm:mx-4 mt-2">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('overview') || 'Overview'}</span>
              <span className="xs:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="executions" className="gap-1 text-xs sm:text-sm">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('executions') || 'Executions'}</span>
              <span className="xs:hidden">Runs</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1 text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('config') || 'Config'}</span>
              <span className="xs:hidden">Conf</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-auto">
          {/* Schedule Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('schedule') || 'Schedule'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('triggerType') || 'Trigger'}</span>
                <span className="font-medium capitalize">{task.trigger.type}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('pattern') || 'Pattern'}</span>
                <span className="font-medium">{triggerDescription}</span>
              </div>
              {task.trigger.timezone && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('timezone') || 'Timezone'}</span>
                  <span className="font-medium">{task.trigger.timezone}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('nextRun') || 'Next Run'}</span>
                <span className="font-medium">
                  {task.nextRunAt ? task.nextRunAt.toLocaleString() : 'Not scheduled'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('lastRun') || 'Last Run'}</span>
                <span className="font-medium">
                  {task.lastRunAt ? task.lastRunAt.toLocaleString() : 'Never'}
                </span>
              </div>
              {isCurrentlyMatching && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-500/10 rounded-md px-2 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  {t('cronMatchingNow') || 'Cron expression matches current time'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Runs Preview */}
          {nextRunTimes.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('upcomingRuns') || 'Upcoming Runs'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {nextRunTimes.map((time, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">#{index + 1}</span>
                      <span className="font-mono text-xs">{time.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('statistics') || 'Statistics'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center p-2 sm:p-3 rounded-lg bg-muted/30">
                  <div className="text-xl sm:text-2xl font-bold">{task.runCount}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t('totalRuns') || 'Total'}</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-lg bg-green-500/10">
                  <div className="text-xl sm:text-2xl font-bold text-green-500">{task.successCount}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t('successful') || 'Success'}</div>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-lg bg-red-500/10">
                  <div className="text-xl sm:text-2xl font-bold text-red-500">{task.failureCount}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t('failed') || 'Failed'}</div>
                </div>
              </div>
              {successRate !== null && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('successRate') || 'Success Rate'}</span>
                    <span className="font-medium">{successRate}%</span>
                  </div>
                  <Progress value={successRate} className="h-2 [&>div]:bg-green-500" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Error */}
          {task.lastError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('lastError') || 'Last Error'}</AlertTitle>
              <AlertDescription className="font-mono text-xs">
                {task.lastError}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="executions" className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {executions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('noExecutions') || 'No executions yet'}
                </div>
              ) : (
                executions.map((execution) => {
                  const status = executionStatusConfig[execution.status];
                  return (
                    <Card key={execution.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={status.color}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                            {execution.retryAttempt > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Retry #{execution.retryAttempt}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {execution.status === 'running' && isPluginExecutionActive?.(execution.id) && onCancelPluginExecution && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => onCancelPluginExecution(execution.id)}
                              >
                                Cancel
                              </Button>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(execution.duration)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {execution.startedAt.toLocaleString()}
                        </div>
                        {execution.error && (
                          <div className="mt-2 text-xs text-destructive font-mono bg-destructive/10 p-2 rounded">
                            {execution.error}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="config" className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-auto">
          {/* Execution Config */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('executionConfig') || 'Execution Config'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeout</span>
                <span className="font-mono">{task.config.timeout}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Retries</span>
                <span>{task.config.maxRetries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Retry Delay</span>
                <span className="font-mono">{task.config.retryDelay}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Allow Concurrent</span>
                <span>{task.config.allowConcurrent ? 'Yes' : 'No'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notification Config */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('notificationConfig') || 'Notifications'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">On Start</span>
                <span>{task.notification.onStart ? '✓' : '✗'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On Complete</span>
                <span>{task.notification.onComplete ? '✓' : '✗'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">On Error</span>
                <span>{task.notification.onError ? '✓' : '✗'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channels</span>
                <div className="flex gap-1">
                  {(task.notification.channels ?? []).map((ch) => (
                    <Badge key={ch} variant="outline" className="text-xs">
                      {ch}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payload */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('payload') || 'Payload'}</CardTitle>
              <CardDescription className="text-xs">
                {t('payloadDescription') || 'Data passed to the task executor'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(task.payload, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TaskDetails;
