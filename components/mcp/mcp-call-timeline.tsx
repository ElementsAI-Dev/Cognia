'use client';

/**
 * MCPCallTimeline - Timeline view for multi-step MCP tool calls
 * Shows the sequence of tool calls with their states and relationships
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Server,
  Wrench,
  Eye,
  EyeOff,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { formatDuration, formatToolName } from '@/lib/mcp/format-utils';
import { MCPServerBadge } from './mcp-server-badge';
import type { ToolState } from '@/types/core/message';
import type { MCPCallStep } from '@/types/mcp';

export { type MCPCallStep } from '@/types/mcp';

export interface MCPCallTimelineProps {
  steps: MCPCallStep[];
  title?: string;
  showStatistics?: boolean;
  groupByServer?: boolean;
  onStepClick?: (step: MCPCallStep) => void;
  className?: string;
}

const stateConfig: Record<ToolState, { icon: React.ElementType; color: string; label: string }> = {
  'input-streaming': { icon: Loader2, color: 'text-blue-500', label: 'Streaming' },
  'input-available': { icon: Loader2, color: 'text-blue-500', label: 'Running' },
  'approval-requested': {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Awaiting Approval',
  },
  'approval-responded': { icon: Clock, color: 'text-blue-500', label: 'Approved' },
  'output-available': { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  'output-error': { icon: XCircle, color: 'text-red-500', label: 'Failed' },
  'output-denied': { icon: XCircle, color: 'text-orange-500', label: 'Denied' },
};


export function MCPCallTimeline({
  steps,
  title,
  showStatistics = true,
  groupByServer = false,
  onStepClick,
  className,
}: MCPCallTimelineProps) {
  const t = useTranslations('mcp');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalDuration = steps.reduce((acc, step) => {
      if (step.endedAt && step.startedAt) {
        return acc + (step.endedAt.getTime() - step.startedAt.getTime());
      }
      return acc;
    }, 0);

    const completedCount = steps.filter((s) => s.state === 'output-available').length;
    const failedCount = steps.filter(
      (s) => s.state === 'output-error' || s.state === 'output-denied'
    ).length;
    const runningCount = steps.filter(
      (s) => s.state === 'input-streaming' || s.state === 'input-available'
    ).length;
    const pendingCount = steps.filter((s) => s.state === 'approval-requested').length;

    const uniqueServers = new Set(steps.map((s) => s.serverId)).size;

    return {
      totalDuration,
      completedCount,
      failedCount,
      runningCount,
      pendingCount,
      uniqueServers,
      successRate: steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0,
    };
  }, [steps]);

  // Group steps by server if enabled
  const groupedSteps = useMemo(() => {
    if (!groupByServer) return null;

    const groups: Record<string, MCPCallStep[]> = {};
    for (const step of steps) {
      const key = step.serverId;
      if (!groups[key]) groups[key] = [];
      groups[key].push(step);
    }
    return groups;
  }, [steps, groupByServer]);

  const hasRunning = statistics.runningCount > 0;

  const toggleStepExpanded = (id: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (steps.length === 0) {
    return (
      <Empty className={cn('border rounded-xl py-8', className)}>
        <EmptyMedia variant="icon">
          <Wrench className="h-6 w-6" />
        </EmptyMedia>
        <EmptyTitle>{t('noMcpCalls')}</EmptyTitle>
        <EmptyDescription>{t('noMcpCallsDescription')}</EmptyDescription>
      </Empty>
    );
  }

  const renderStep = (step: MCPCallStep, index: number, isLast: boolean) => {
    const config = stateConfig[step.state];
    const Icon = config.icon;
    const isRunning = step.state === 'input-streaming' || step.state === 'input-available';
    const isExpanded = expandedSteps.has(step.id);
    const hasResult = step.result !== undefined;

    const duration =
      step.endedAt && step.startedAt ? step.endedAt.getTime() - step.startedAt.getTime() : null;

    return (
      <div
        key={step.id}
        className="relative flex gap-3 animate-in fade-in-0 slide-in-from-left-2"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {/* Timeline connector */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
              step.state === 'output-available'
                ? 'border-green-300 bg-green-50 dark:bg-green-950/50'
                : step.state === 'output-error' || step.state === 'output-denied'
                  ? 'border-red-300 bg-red-50 dark:bg-red-950/50'
                  : step.state === 'approval-requested'
                    ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/50'
                    : 'border-blue-300 bg-blue-50 dark:bg-blue-950/50'
            )}
          >
            <Icon className={cn('h-4 w-4', config.color, isRunning && 'animate-spin')} />
          </div>
          {!isLast && (
            <div className="w-0.5 flex-1 min-h-[20px] bg-gradient-to-b from-border to-transparent" />
          )}
        </div>

        {/* Content */}
        <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
          <div
            className={cn(
              'rounded-lg border p-3 transition-all cursor-pointer hover:shadow-sm',
              isRunning && 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20',
              onStepClick && 'hover:bg-accent/50'
            )}
            onClick={() => onStepClick?.(step)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-sm">{formatToolName(step.toolName)}</span>
                  <MCPServerBadge
                    serverId={step.serverId}
                    serverName={step.serverName}
                    status={step.serverStatus}
                    size="sm"
                    showStatus={false}
                  />
                </div>
                {step.toolDescription && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {step.toolDescription}
                  </p>
                )}
                {step.progressMessage && isRunning && (
                  <p className="text-xs text-blue-600 mt-1 animate-pulse">{step.progressMessage}</p>
                )}
                {step.error && (
                  <p className="text-xs text-destructive mt-1 line-clamp-2">{step.error}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {hasResult && step.state === 'output-available' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStepExpanded(step.id);
                    }}
                  >
                    {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                )}
                {duration !== null && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {formatDuration(duration)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress bar for running */}
            {isRunning && step.progress !== undefined && (
              <Progress value={step.progress} className="h-1 mt-2" />
            )}

            {/* Expanded result preview */}
            {isExpanded && hasResult && (
              <Collapsible open={isExpanded}>
                <CollapsibleContent className="mt-3">
                  <div className="rounded-lg bg-muted/50 p-2 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto border">
                    <pre className="whitespace-pre-wrap">
                      {typeof step.result === 'string'
                        ? step.result
                        : JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card/95 backdrop-blur-md shadow-lg overflow-hidden',
        hasRunning && 'border-blue-500/30',
        className
      )}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          {hasRunning ? (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          ) : (
            <div
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                statistics.failedCount > 0 ? 'bg-red-500' : 'bg-green-500'
              )}
            />
          )}
          <span className="font-semibold text-sm">{title || t('mcpCalls')}</span>
          <Badge variant="outline" className="text-[10px]">
            {steps.length} {t('calls')}
          </Badge>
          {statistics.uniqueServers > 1 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Server className="h-3 w-3" />
              {statistics.uniqueServers}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick stats */}
          <div className="flex items-center gap-1 text-xs">
            {statistics.completedCount > 0 && (
              <span className="flex items-center gap-0.5 text-green-600">
                <CheckCircle className="h-3 w-3" />
                {statistics.completedCount}
              </span>
            )}
            {statistics.failedCount > 0 && (
              <span className="flex items-center gap-0.5 text-red-500 ml-1">
                <XCircle className="h-3 w-3" />
                {statistics.failedCount}
              </span>
            )}
            {statistics.runningCount > 0 && (
              <span className="flex items-center gap-0.5 text-blue-500 ml-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {statistics.runningCount}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {formatDuration(statistics.totalDuration)}
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {!isCollapsed && (
        <>
          {/* Statistics bar */}
          {showStatistics && (
            <div className="flex items-center gap-4 px-4 py-2 border-t border-b bg-muted/30 text-xs text-muted-foreground">
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
                  <span>
                    {statistics.completedCount > 0
                      ? formatDuration(
                          Math.round(statistics.totalDuration / statistics.completedCount)
                        )
                      : '0ms'}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('avgDuration')}</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Timeline content */}
          <div className="p-4">
            {groupByServer && groupedSteps ? (
              Object.entries(groupedSteps).map(([serverId, serverSteps]) => (
                <div key={serverId} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <MCPServerBadge
                      serverId={serverId}
                      serverName={serverSteps[0]?.serverName}
                      status={serverSteps[0]?.serverStatus}
                      size="md"
                    />
                    <span className="text-xs text-muted-foreground">
                      ({serverSteps.length} {t('calls')})
                    </span>
                  </div>
                  <div className="pl-2">
                    {serverSteps.map((step, index) =>
                      renderStep(step, index, index === serverSteps.length - 1)
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-0">
                {steps.map((step, index) => renderStep(step, index, index === steps.length - 1))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
