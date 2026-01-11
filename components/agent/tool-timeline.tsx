'use client';

/**
 * ToolTimeline - Visual timeline of tool executions
 * Enhanced with checkpoint markers, queue display, and inline result preview
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Bookmark,
  ListTodo,
  Eye,
  EyeOff,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/chat/copy-button';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from '@/components/ai-elements/checkpoint';
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
} from '@/components/ai-elements/queue';
import type { ToolState } from '@/types/core/message';
import type { McpServerStatus } from '@/types/mcp';
import { A2UIToolOutput, hasA2UIToolOutput } from '@/components/a2ui';
import { MCPServerBadge } from '@/components/mcp';

// Component-specific ToolExecution with timeline-specific fields
export interface ToolExecution {
  id: string;
  toolName: string;
  state: ToolState;
  args?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  checkpointLabel?: string;
  isCheckpoint?: boolean;
  /** MCP server ID (if this is an MCP tool call) */
  serverId?: string;
  /** MCP server display name */
  serverName?: string;
  /** MCP server status */
  serverStatus?: McpServerStatus;
}

export interface PendingTool {
  id: string;
  toolName: string;
  estimatedDuration?: number;
  position: number;
}

interface ToolTimelineProps {
  executions: ToolExecution[];
  pendingTools?: PendingTool[];
  onCheckpointRestore?: (executionId: string) => void;
  onCancelPending?: (toolId: string) => void;
  showStatistics?: boolean;
  /** Group executions by MCP server */
  groupByServer?: boolean;
  className?: string;
}

const stateConfig: Record<ToolState, { icon: React.ElementType; color: string; label: string }> = {
  'input-streaming': {
    icon: Loader2,
    color: 'text-blue-500',
    label: 'Preparing',
  },
  'input-available': {
    icon: Loader2,
    color: 'text-blue-500',
    label: 'Running',
  },
  'approval-requested': {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Awaiting Approval',
  },
  'approval-responded': {
    icon: Clock,
    color: 'text-blue-500',
    label: 'Approved',
  },
  'output-available': {
    icon: CheckCircle,
    color: 'text-green-500',
    label: 'Completed',
  },
  'output-error': {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Error',
  },
  'output-denied': {
    icon: XCircle,
    color: 'text-orange-500',
    label: 'Denied',
  },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatToolName(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ToolTimeline({ 
  executions, 
  pendingTools = [],
  onCheckpointRestore,
  onCancelPending,
  showStatistics = true,
  groupByServer: _groupByServer = false,
  className 
}: ToolTimelineProps) {
  const t = useTranslations('agent');
  // Note: groupByServer and tMcp reserved for future server grouping feature
  void _groupByServer;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  
  // Calculate statistics
  const statistics = useMemo(() => {
    const totalDuration = executions.reduce((acc, exec) => {
      if (exec.endTime && exec.startTime) {
        return acc + (exec.endTime.getTime() - exec.startTime.getTime());
      }
      return acc;
    }, 0);
    
    const completedCount = executions.filter((e) => e.state === 'output-available').length;
    const failedCount = executions.filter((e) => e.state === 'output-error' || e.state === 'output-denied').length;
    const runningCount = executions.filter((e) => e.state === 'input-streaming' || e.state === 'input-available').length;
    const checkpointCount = executions.filter((e) => e.isCheckpoint).length;
    
    const avgDuration = completedCount > 0 
      ? Math.round(totalDuration / completedCount) 
      : 0;
    
    return {
      totalDuration,
      completedCount,
      failedCount,
      runningCount,
      checkpointCount,
      avgDuration,
      successRate: executions.length > 0 
        ? Math.round((completedCount / executions.length) * 100) 
        : 0,
    };
  }, [executions]);
  
  const hasRunningTool = statistics.runningCount > 0;
  
  // Toggle result preview
  const toggleResultPreview = (id: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (executions.length === 0 && pendingTools.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'space-y-4 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-md p-4 shadow-lg',
      'animate-in fade-in-0 slide-in-from-right-4 duration-300',
      hasRunningTool && 'border-blue-500/30 shadow-blue-500/10',
      className
    )}>
      {/* Header - clickable to collapse/expand */}
      <button 
        className="flex w-full items-center justify-between text-sm hover:opacity-80 transition-opacity"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {hasRunningTool ? (
            <Zap className="h-4 w-4 text-blue-500 animate-pulse" />
          ) : (
            <div className={cn(
              "h-2 w-2 rounded-full",
              statistics.failedCount > 0 ? "bg-red-500" : "bg-green-500"
            )} />
          )}
          <span className="font-semibold">{t('toolExecutions')}</span>
          {hasRunningTool && (
            <span className="text-xs text-blue-500 animate-pulse">{t('running')}...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            {statistics.completedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" /> {statistics.completedCount}
              </span>
            )}
            {statistics.failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-500 ml-1">
                <XCircle className="h-3 w-3" /> {statistics.failedCount}
              </span>
            )}
            {statistics.checkpointCount > 0 && (
              <span className="flex items-center gap-1 text-purple-500 ml-1">
                <Bookmark className="h-3 w-3" /> {statistics.checkpointCount}
              </span>
            )}
            <span className="ml-1">{formatDuration(statistics.totalDuration)}</span>
          </div>
          <span className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {/* Statistics bar */}
      {showStatistics && !isCollapsed && executions.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-2 py-2 bg-muted/30 rounded-lg">
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>{statistics.successRate}%</span>
            </TooltipTrigger>
            <TooltipContent>{t('successRate')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(statistics.avgDuration)}</span>
            </TooltipTrigger>
            <TooltipContent>{t('avgDuration')}</TooltipContent>
          </Tooltip>
          {pendingTools.length > 0 && (
            <Tooltip>
              <TooltipTrigger className="flex items-center gap-1">
                <ListTodo className="h-3 w-3" />
                <span>{pendingTools.length} {t('pending')}</span>
              </TooltipTrigger>
              <TooltipContent>{t('pendingTools')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Pending tools queue */}
      {!isCollapsed && pendingTools.length > 0 && (
        <Queue className="mt-2">
          <QueueSection defaultOpen={showQueue} onOpenChange={setShowQueue}>
            <QueueSectionTrigger>
              <QueueSectionLabel 
                count={pendingTools.length} 
                label={t('pendingTools')}
                icon={<ListTodo className="h-4 w-4" />}
              />
            </QueueSectionTrigger>
            <QueueSectionContent>
              <QueueList>
                {pendingTools.map((tool) => (
                  <QueueItem key={tool.id} className="group">
                    <div className="flex items-center gap-2 flex-1">
                      <QueueItemIndicator />
                      <QueueItemContent>
                        {formatToolName(tool.toolName)}
                        {tool.estimatedDuration && (
                          <span className="text-muted-foreground ml-1">
                            (~{formatDuration(tool.estimatedDuration)})
                          </span>
                        )}
                      </QueueItemContent>
                    </div>
                    {onCancelPending && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onCancelPending(tool.id)}
                      >
                        <XCircle className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </QueueItem>
                ))}
              </QueueList>
            </QueueSectionContent>
          </QueueSection>
        </Queue>
      )}

      {/* Timeline - collapsible */}
      {!isCollapsed && (
      <div className="relative space-y-0">
        {executions.map((execution, index) => {
          const config = stateConfig[execution.state];
          const Icon = config.icon;
          const duration = execution.endTime && execution.startTime
            ? execution.endTime.getTime() - execution.startTime.getTime()
            : null;
          const isLast = index === executions.length - 1;
          const isRunning =
            execution.state === 'input-streaming' ||
            execution.state === 'input-available';
          const isExpanded = expandedResults.has(execution.id);
          const hasResult = execution.result !== undefined;

          return (
            <div key={execution.id}>
              {/* Checkpoint marker */}
              {execution.isCheckpoint && (
                <Checkpoint className="my-2">
                  <CheckpointIcon>
                    <Bookmark className="h-4 w-4 text-purple-500" />
                  </CheckpointIcon>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-medium px-2">
                    {execution.checkpointLabel || t('checkpoint')}
                  </span>
                  {onCheckpointRestore && (
                    <CheckpointTrigger
                      tooltip={t('restoreFromCheckpoint')}
                      onClick={() => onCheckpointRestore(execution.id)}
                    >
                      {t('restore')}
                    </CheckpointTrigger>
                  )}
                </Checkpoint>
              )}
              
              <div 
                className="relative flex gap-4 animate-in fade-in-0 slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300',
                      execution.state === 'output-available'
                        ? 'border-green-300 bg-green-50 dark:bg-green-950/50 dark:border-green-700'
                        : execution.state === 'output-error' ||
                            execution.state === 'output-denied'
                          ? 'border-red-300 bg-red-50 dark:bg-red-950/50 dark:border-red-700'
                          : 'border-blue-300 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-700'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4',
                        config.color,
                        isRunning && 'animate-spin'
                      )}
                    />
                  </div>
                  {!isLast && (
                    <div className="h-full w-0.5 bg-linear-to-b from-border to-transparent" />
                  )}
                </div>

                {/* Content */}
                <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {formatToolName(execution.toolName)}
                        </p>
                        {/* MCP Server badge */}
                        {execution.serverId && (
                          <MCPServerBadge
                            serverId={execution.serverId}
                            serverName={execution.serverName}
                            status={execution.serverStatus}
                            size="sm"
                            showStatus={false}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {config.label}
                        {execution.error && (
                          <span className="text-destructive block truncate"> {execution.error}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Result preview toggle */}
                      {hasResult && execution.state === 'output-available' && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleResultPreview(execution.id)}
                              >
                                {isExpanded ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isExpanded ? t('hideResult') : t('showResult')}
                            </TooltipContent>
                          </Tooltip>
                          <CopyButton
                            content={typeof execution.result === 'string'
                              ? execution.result
                              : JSON.stringify(execution.result, null, 2)}
                            iconOnly
                            tooltip={t('copyResult')}
                            className="h-6 w-6"
                          />
                        </>
                      )}
                      {duration !== null && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {formatDuration(duration)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Inline result preview - with A2UI support */}
                  {isExpanded && hasResult && (
                    <Collapsible open={isExpanded}>
                      <CollapsibleContent className="mt-2">
                        {hasA2UIToolOutput(execution.result) ? (
                          <A2UIToolOutput
                            toolId={execution.id}
                            toolName={execution.toolName}
                            output={execution.result}
                          />
                        ) : (
                          <div className="rounded-lg bg-muted/50 p-2 text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap">
                              {typeof execution.result === 'string' 
                                ? execution.result 
                                : JSON.stringify(execution.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Progress bar for completed executions */}
                  {duration !== null && statistics.totalDuration > 0 && (
                    <Progress 
                      value={Math.min((duration / statistics.totalDuration) * 100, 100)} 
                      className={cn(
                        "h-1 mt-2",
                        execution.state === 'output-available' && '[&>div]:bg-green-500',
                        (execution.state === 'output-error' || execution.state === 'output-denied') && '[&>div]:bg-red-500'
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

export default ToolTimeline;
