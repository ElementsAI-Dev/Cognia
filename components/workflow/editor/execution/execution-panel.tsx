'use client';

/**
 * ExecutionPanel - Real-time workflow execution visualization
 */

import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';
import {
  formatExecutionDuration,
  getExecutionSummary,
  getFailedNodes,
  estimateRemainingTime,
  filterLogsByLevel,
  getNodeStatusColor,
  canRetryExecution,
} from '@/lib/workflow-editor';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ChevronRight,
  Terminal,
  RotateCcw,
  Filter,
} from 'lucide-react';
import type { NodeExecutionStatus, ExecutionLog } from '@/types/workflow/workflow-editor';

interface ExecutionPanelProps {
  className?: string;
}

const STATUS_CONFIG: Record<NodeExecutionStatus, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
}> = {
  idle: { icon: Clock, color: 'text-muted-foreground', label: 'Idle' },
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  running: { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  skipped: { icon: ChevronRight, color: 'text-gray-400', label: 'Skipped' },
  waiting: { icon: AlertCircle, color: 'text-orange-500', label: 'Waiting' },
};

export function ExecutionPanel({ className }: ExecutionPanelProps) {
  const t = useTranslations('workflowEditor');

  const {
    currentWorkflow,
    executionState,
    pauseExecution,
    resumeExecution,
    cancelExecution,
    clearExecutionState,
    startExecution,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      currentWorkflow: state.currentWorkflow,
      executionState: state.executionState,
      pauseExecution: state.pauseExecution,
      resumeExecution: state.resumeExecution,
      cancelExecution: state.cancelExecution,
      clearExecutionState: state.clearExecutionState,
      startExecution: state.startExecution,
    }))
  );

  const handleRun = () => {
    if (currentWorkflow) {
      clearExecutionState();
      startExecution({});
    }
  };

  const [logFilter, setLogFilter] = useState<ExecutionLog['level'] | 'all'>('all');

  const executionSummary = useMemo(() => {
    if (!executionState) return null;
    return getExecutionSummary(executionState);
  }, [executionState]);

  const progress = useMemo(() => {
    if (!executionSummary) return 0;
    const { totalNodes, completedNodes, failedNodes } = executionSummary;
    if (totalNodes === 0) return 0;
    return ((completedNodes + failedNodes) / totalNodes) * 100;
  }, [executionSummary]);

  const remainingTime = useMemo(() => {
    if (!executionState) return null;
    return estimateRemainingTime(executionState);
  }, [executionState]);

  const failedNodes = useMemo(() => {
    if (!executionState) return [];
    return getFailedNodes(executionState);
  }, [executionState]);

  const isRetryable = useMemo(() => {
    if (!executionState) return false;
    return canRetryExecution(executionState);
  }, [executionState]);

  const filteredLogs = useMemo(() => {
    if (!executionState) return [];
    if (logFilter === 'all') return executionState.logs;
    return filterLogsByLevel(executionState.logs, logFilter);
  }, [executionState, logFilter]);

  const nodeSteps = useMemo(() => {
    if (!currentWorkflow || !executionState) return [];
    return currentWorkflow.nodes
      .filter((n) => n.type !== 'start' && n.type !== 'end')
      .map((node) => ({
        id: node.id,
        label: node.data.label,
        type: node.type,
        state: executionState.nodeStates[node.id],
      }));
  }, [currentWorkflow, executionState]);

  // Live elapsed time timer
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTime = executionState?.startedAt;

  useEffect(() => {
    if (!startTime || executionState?.status !== 'running') {
      return;
    }

    const updateElapsed = () => {
      setElapsedTime(Date.now() - new Date(startTime).getTime());
    };

    updateElapsed();
    // Update every 1 second for better performance (was 100ms)
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime, executionState?.status]);

  // Calculate current running node
  const currentNode = useMemo(() => {
    if (!executionState) return null;
    const runningEntry = Object.entries(executionState.nodeStates).find(
      ([, state]) => state.status === 'running'
    );
    if (!runningEntry) return null;
    const node = currentWorkflow?.nodes.find((n) => n.id === runningEntry[0]);
    return node ? { id: node.id, label: node.data.label } : null;
  }, [executionState, currentWorkflow]);

  const completedCount = executionSummary ? executionSummary.completedNodes + executionSummary.failedNodes : 0;
  const totalCount = executionSummary?.totalNodes ?? 0;


  if (!executionState) {
    return (
      <div className={cn('flex flex-col h-full bg-background border-l', className)}>
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold">{t('execution')}</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {t('noExecution')}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-background border-l', className)}>
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t('execution')}</h3>
          <Badge
            variant={
              executionState.status === 'running'
                ? 'default'
                : executionState.status === 'completed'
                ? 'secondary'
                : executionState.status === 'failed'
                ? 'destructive'
                : 'outline'
            }
          >
            {executionState.status}
          </Badge>
        </div>

        {/* Elapsed Time & Current Node */}
        {executionState.status === 'running' && (
          <div className="bg-blue-500/10 rounded-lg p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Elapsed</span>
              <span className="text-sm font-mono font-medium text-blue-500">
                {formatExecutionDuration(elapsedTime)}
              </span>
            </div>
            {remainingTime !== null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Est. remaining</span>
                <span className="text-xs font-mono text-muted-foreground">
                  ~{formatExecutionDuration(remainingTime)}
                </span>
              </div>
            )}
            {currentNode && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-xs truncate">
                  Running: <span className="font-medium">{currentNode.label}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount}/{totalCount} nodes</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {executionState.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={pauseExecution}
            >
              <Pause className="h-3 w-3 mr-1" />
              {t('pause')}
            </Button>
          )}
          {executionState.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={resumeExecution}
            >
              <Play className="h-3 w-3 mr-1" />
              {t('resume')}
            </Button>
          )}
          {(executionState.status === 'running' || executionState.status === 'paused') && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs"
              onClick={cancelExecution}
            >
              <Square className="h-3 w-3 mr-1" />
              {t('stop')}
            </Button>
          )}
          {(executionState.status === 'completed' ||
            executionState.status === 'failed' ||
            executionState.status === 'cancelled') && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={clearExecutionState}
              >
                {t('clear')}
              </Button>
              {isRetryable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleRun}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </>
          )}
        </div>

        {/* Failed Nodes Summary */}
        {failedNodes.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-destructive">
              {failedNodes.length} node(s) failed
            </h4>
            {failedNodes.map((fn) => (
              <div
                key={fn.nodeId}
                className="text-xs bg-red-500/10 rounded p-1.5 text-red-600 dark:text-red-400"
              >
                <span className="font-mono">{fn.nodeId}</span>: {fn.error}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-hidden">
        <div className="p-3 border-b">
          <h4 className="text-xs font-medium text-muted-foreground">{t('steps')}</h4>
        </div>
        <ScrollArea className="h-[calc(100%-40px)]">
          <div className="p-2 space-y-1">
            {nodeSteps.map((step) => {
              const status = step.state?.status || 'idle';
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const statusColor = getNodeStatusColor(status);

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md text-sm',
                    status === 'running' && 'bg-blue-500/10',
                    status === 'completed' && 'bg-green-500/10',
                    status === 'failed' && 'bg-red-500/10'
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: statusColor }}
                  />
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      config.color,
                      status === 'running' && 'animate-spin'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{step.label}</div>
                    {step.state?.duration && (
                      <div className="text-xs text-muted-foreground">
                        {formatExecutionDuration(step.state.duration)}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Logs */}
      <div className="h-48 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-xs font-medium text-muted-foreground">{t('logs')}</h4>
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            {(['all', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
              <Button
                key={level}
                variant={logFilter === level ? 'secondary' : 'ghost'}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => setLogFilter(level)}
              >
                {level}
              </Button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-4">
                {t('noLogs')}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-2 py-0.5',
                    log.level === 'error' && 'text-red-500',
                    log.level === 'warn' && 'text-yellow-500',
                    log.level === 'debug' && 'text-muted-foreground'
                  )}
                >
                  <span className="text-muted-foreground shrink-0">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default ExecutionPanel;
