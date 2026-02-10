'use client';

/**
 * ExecutionStatisticsPanel - Display workflow execution statistics
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useWorkflowEditorStore } from '@/stores/workflow';
import {
  formatExecutionDuration,
  formatExecutionStatus,
  getStatusColor,
  calculateExecutionStats,
} from '@/lib/workflow-editor';
import {
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Trash2,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function ExecutionStatisticsPanel() {
  const t = useTranslations('executionStatistics');
  const {
    currentWorkflow,
    getWorkflowStatistics,
    clearWorkflowExecutionRecords,
  } = useWorkflowEditorStore();

  const statistics = useMemo(() => {
    return getWorkflowStatistics();
  }, [getWorkflowStatistics]);

  // Calculate per-execution stats for the current execution state
  const { executionState } = useWorkflowEditorStore();
  const currentExecStats = useMemo(() => {
    if (!executionState) return null;
    return calculateExecutionStats(executionState);
  }, [executionState]);

  const formatDuration = formatExecutionDuration;

  const formatDate = (date: Date | undefined) => {
    if (!date) return t('never');
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return t('unknown');
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title={t('title')}>
          <BarChart3 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>
            {t('description')}
          </SheetDescription>
        </SheetHeader>

        {!statistics || statistics.totalExecutions === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">{t('noDataYet')}</p>
            <p className="text-xs mt-1">{t('runToSeeStats')}</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Success Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('successRate')}</span>
                <span className="text-2xl font-bold text-green-500">
                  {statistics.successRate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={statistics.successRate} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{statistics.successfulExecutions} {t('successful')}</span>
                <span>{statistics.failedExecutions} {t('failed')}</span>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  {t('totalRuns')}
                </div>
                <div className="text-xl font-bold">
                  {statistics.totalExecutions}
                </div>
              </div>

              <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {t('avgDuration')}
                </div>
                <div className="text-xl font-bold">
                  {formatDuration(statistics.averageDuration)}
                </div>
              </div>

              <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {t('minDuration')}
                </div>
                <div className="text-lg font-medium">
                  {formatDuration(statistics.minDuration)}
                </div>
              </div>

              <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 rotate-180" />
                  {t('maxDuration')}
                </div>
                <div className="text-lg font-medium">
                  {formatDuration(statistics.maxDuration)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Execution Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('executionBreakdown')}</h4>
              <div className="flex gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {statistics.successfulExecutions} {t('success')}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {statistics.failedExecutions} {t('failed')}
                </Badge>
                {statistics.cancelledExecutions > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {statistics.cancelledExecutions} {t('cancelled')}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Recent Executions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t('recentExecutions')}</h4>
                <span className="text-xs text-muted-foreground">
                  {t('last')}: {formatDate(statistics.lastExecutedAt)}
                </span>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pr-4">
                  {statistics.executionHistory.slice(0, 10).map((record) => {
                    const statusLabel = formatExecutionStatus(record.status as 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled');
                    const statusColor = getStatusColor(record.status as 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled');
                    return (
                      <div
                        key={record.id}
                        className="flex items-center gap-3 p-2 rounded-md border text-sm"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: statusColor }}
                          title={statusLabel}
                        />
                        {record.status === 'completed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        ) : record.status === 'failed' ? (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(record.startedAt)}
                            </span>
                            <span className="text-xs font-mono">
                              {formatDuration(record.duration)}
                            </span>
                          </div>
                          {record.errorMessage && (
                            <div className="text-xs text-red-500 truncate mt-0.5">
                              {record.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Current Execution Stats */}
            {currentExecStats && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">{t('currentRunStats') || 'Current Run Stats'}</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Duration</span>
                      <div className="font-mono font-medium">{formatDuration(currentExecStats.duration)}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded">
                      <span className="text-muted-foreground">Avg Step</span>
                      <div className="font-mono font-medium">{formatDuration(currentExecStats.averageStepDuration)}</div>
                    </div>
                    {currentExecStats.fastestStep && (
                      <div className="p-2 bg-green-500/10 rounded">
                        <span className="text-muted-foreground">Fastest</span>
                        <div className="font-mono text-green-600">
                          {currentExecStats.fastestStep.nodeId.slice(0, 12)}… ({formatDuration(currentExecStats.fastestStep.duration)})
                        </div>
                      </div>
                    )}
                    {currentExecStats.slowestStep && (
                      <div className="p-2 bg-orange-500/10 rounded">
                        <span className="text-muted-foreground">Slowest</span>
                        <div className="font-mono text-orange-600">
                          {currentExecStats.slowestStep.nodeId.slice(0, 12)}… ({formatDuration(currentExecStats.slowestStep.duration)})
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearWorkflowExecutionRecords(currentWorkflow?.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('clearHistory')}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default ExecutionStatisticsPanel;
