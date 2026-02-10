'use client';

/**
 * WorkflowExecutionHistoryPanel - Display workflow execution history
 * Shows past executions with status, duration, and allows re-running
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  History,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Trash2,
  RotateCcw,
  Filter,
  Calendar,
  Timer,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { workflowRepository } from '@/lib/db/repositories';
import { toast } from 'sonner';
import { useWorkflowEditorStore } from '@/stores/workflow';
import type { WorkflowExecutionHistoryRecord } from '@/types/workflow/workflow-editor';

interface WorkflowExecutionHistoryPanelProps {
  className?: string;
  workflowId?: string;
}

export function WorkflowExecutionHistoryPanel({
  className,
  workflowId,
}: WorkflowExecutionHistoryPanelProps) {
  const t = useTranslations('workflowEditor');
  const { currentWorkflow, startExecution, replayExecution } = useWorkflowEditorStore();

  const effectiveWorkflowId = workflowId || currentWorkflow?.id;

  const [executions, setExecutions] = useState<WorkflowExecutionHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [executionToDelete, setExecutionToDelete] = useState<string | null>(null);

  // Load execution history
  const loadExecutions = useCallback(async () => {
    if (!effectiveWorkflowId) return;

    setIsLoading(true);
    try {
      const data = await workflowRepository.getExecutions(effectiveWorkflowId, 100);
      setExecutions(data);
    } catch (error) {
      toast.error('Failed to load executions', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [effectiveWorkflowId]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  // Filter executions by status
  const filteredExecutions = useMemo(() => {
    if (statusFilter === 'all') return executions;
    return executions.filter((e) => e.status === statusFilter);
  }, [executions, statusFilter]);

  // Group executions by date with stable sorting
  const groupedExecutions = useMemo(() => {
    // Sort executions by startedAt descending (newest first)
    const sortedExecutions = [...filteredExecutions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    const groups: Record<string, WorkflowExecutionHistoryRecord[]> = {};
    const dateOrder: string[] = [];

    sortedExecutions.forEach((execution) => {
      const date = new Date(execution.startedAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
        dateOrder.push(date);
      }
      groups[date].push(execution);
    });

    // Return as ordered object (Map would be better but Object.entries preserves insertion order)
    const orderedGroups: Record<string, WorkflowExecutionHistoryRecord[]> = {};
    dateOrder.forEach((date) => {
      orderedGroups[date] = groups[date];
    });

    return orderedGroups;
  }, [filteredExecutions]);

  // Re-run with same input (use replayExecution for DB-persisted records)
  const handleRerun = useCallback(
    (execution: WorkflowExecutionHistoryRecord) => {
      if (execution.id) {
        replayExecution(execution.id);
      } else {
        startExecution(execution.input || {});
      }
    },
    [replayExecution, startExecution]
  );

  // Delete execution
  const handleDelete = useCallback(async () => {
    if (!executionToDelete) return;

    try {
      const deleted = await workflowRepository.deleteExecution(executionToDelete);
      if (deleted) {
        setExecutions((prev) => prev.filter((e) => e.id !== executionToDelete));
        toast.success(t('executionDeleted') || 'Execution deleted');
      } else {
        toast.error(t('executionNotFound') || 'Execution not found');
      }
    } catch (error) {
      toast.error(t('deleteExecutionFailed') || 'Failed to delete execution', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExecutionToDelete(null);
      setDeleteDialogOpen(false);
    }
  }, [executionToDelete, t]);

  // Format duration
  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'paused':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'idle':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'running':
        return 'secondary';
      case 'pending':
      case 'paused':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('executionHistory') || 'Execution History'}
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={loadExecutions}
                  disabled={isLoading}
                  aria-label={t('refresh')}
                >
                  <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('refresh')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder={t('filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="completed">{t('statusCompleted')}</SelectItem>
              <SelectItem value="failed">{t('statusFailed')}</SelectItem>
              <SelectItem value="running">{t('statusRunning')}</SelectItem>
              <SelectItem value="pending">{t('statusPending')}</SelectItem>
              <SelectItem value="paused">{t('statusPaused')}</SelectItem>
              <SelectItem value="cancelled">{t('statusCancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('noExecutions') || 'No executions yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('runWorkflowHint') || 'Run the workflow to see execution history'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedExecutions).map(([date, dateExecutions]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {date}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {dateExecutions.length}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {dateExecutions.map((execution) => (
                      <ExecutionItem
                        key={execution.id}
                        execution={execution}
                        isExpanded={expandedExecution === execution.id}
                        onToggle={() =>
                          setExpandedExecution(
                            expandedExecution === execution.id ? null : execution.id
                          )
                        }
                        onRerun={() => handleRerun(execution)}
                        onDelete={() => {
                          setExecutionToDelete(execution.id);
                          setDeleteDialogOpen(true);
                        }}
                        formatDuration={formatDuration}
                        getStatusIcon={getStatusIcon}
                        getStatusVariant={getStatusVariant}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteExecutionTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteExecutionDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelAction')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {t('deleteExecution')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ExecutionItemProps {
  execution: WorkflowExecutionHistoryRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onRerun: () => void;
  onDelete: () => void;
  formatDuration: (start: Date, end?: Date) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusVariant: (status: string) => 'default' | 'destructive' | 'secondary' | 'outline';
  t: (key: string) => string;
}

function ExecutionItem({
  execution,
  isExpanded,
  onToggle,
  onRerun,
  onDelete,
  formatDuration,
  getStatusIcon,
  getStatusVariant,
  t,
}: ExecutionItemProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div
        className={cn(
          'rounded-lg border bg-card transition-colors',
          isExpanded && 'border-primary/50'
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50">
            <div className="shrink-0">{getStatusIcon(execution.status)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {new Date(execution.startedAt).toLocaleTimeString()}
                </span>
                <Badge variant={getStatusVariant(execution.status)} className="text-xs">
                  {execution.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <Timer className="h-3 w-3" />
                <span>
                  {formatDuration(execution.startedAt, execution.completedAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t('rerunWithSameInput')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRerun();
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('rerunWithSameInput')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <div className="p-3 space-y-3">
            {/* Error message */}
            {execution.error && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-xs text-destructive font-medium">{t('error')}</p>
                <p className="text-xs text-destructive/80 mt-1">{execution.error}</p>
              </div>
            )}

            {/* Input */}
            {execution.input && Object.keys(execution.input).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('input')}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    aria-label={t('copyToClipboard')}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(execution.input, null, 2));
                      toast.success(t('copied'));
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                  {JSON.stringify(execution.input, null, 2)}
                </pre>
              </div>
            )}

            {/* Output */}
            {execution.output && Object.keys(execution.output).length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('output')}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    aria-label={t('copyToClipboard')}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(execution.output, null, 2));
                      toast.success(t('copied'));
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(execution.output, null, 2)}
                </pre>
              </div>
            )}

            {/* Logs */}
            {execution.logs && execution.logs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('logs')} ({execution.logs.length})
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    aria-label={t('copyToClipboard')}
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(execution.logs, null, 2));
                      toast.success(t('copied'));
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-muted rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                  {execution.logs.slice(-10).map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-muted-foreground shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge
                        variant={
                          log.level === 'error'
                            ? 'destructive'
                            : log.level === 'warn'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-[10px] px-1 py-0"
                      >
                        {log.level}
                      </Badge>
                      <span className="break-all">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={onRerun}
              >
                <Play className="h-3 w-3 mr-1" />
                {t('rerun')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t('deleteExecution')}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default WorkflowExecutionHistoryPanel;
