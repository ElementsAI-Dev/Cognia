'use client';

/**
 * ToolTimeline - Visual timeline of tool executions
 */

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, AlertTriangle, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolState } from '@/types/message';
import { Button } from '@/components/ui/button';

export interface ToolExecution {
  id: string;
  toolName: string;
  state: ToolState;
  startTime: number;
  endTime?: number;
  error?: string;
}

interface ToolTimelineProps {
  executions: ToolExecution[];
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

export function ToolTimeline({ executions, className }: ToolTimelineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  if (executions.length === 0) {
    return null;
  }

  // Calculate total duration
  const totalDuration = executions.reduce((acc, exec) => {
    if (exec.endTime && exec.startTime) {
      return acc + (exec.endTime - exec.startTime);
    }
    return acc;
  }, 0);

  // Check if any tool is currently running
  const hasRunningTool = executions.some(
    (exec) => exec.state === 'input-streaming' || exec.state === 'input-available'
  );

  // Count completed and failed tools
  const completedCount = executions.filter((e) => e.state === 'output-available').length;
  const failedCount = executions.filter((e) => e.state === 'output-error' || e.state === 'output-denied').length;

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
              failedCount > 0 ? "bg-red-500" : "bg-green-500"
            )} />
          )}
          <span className="font-semibold">Tool Executions</span>
          {hasRunningTool && (
            <span className="text-xs text-blue-500 animate-pulse">Running...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            {completedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" /> {completedCount}
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-500 ml-1">
                <XCircle className="h-3 w-3" /> {failedCount}
              </span>
            )}
            <span className="ml-1">{formatDuration(totalDuration)}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </button>

      {/* Timeline - collapsible */}
      {!isCollapsed && (
      <div className="relative space-y-0">
        {executions.map((execution, index) => {
          const config = stateConfig[execution.state];
          const Icon = config.icon;
          const duration = execution.endTime
            ? execution.endTime - execution.startTime
            : null;
          const isLast = index === executions.length - 1;
          const isRunning =
            execution.state === 'input-streaming' ||
            execution.state === 'input-available';

          return (
            <div 
              key={execution.id} 
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
                    <p className="font-medium text-sm truncate">
                      {formatToolName(execution.toolName)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config.label}
                      {execution.error && (
                        <span className="text-destructive block truncate"> {execution.error}</span>
                      )}
                    </p>
                  </div>
                  {duration !== null && (
                    <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>

                {/* Progress bar for completed executions */}
                {duration !== null && totalDuration > 0 && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/50">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500 ease-out',
                        execution.state === 'output-available'
                          ? 'bg-linear-to-r from-green-400 to-green-500'
                          : execution.state === 'output-error' ||
                              execution.state === 'output-denied'
                            ? 'bg-linear-to-r from-red-400 to-red-500'
                            : 'bg-linear-to-r from-blue-400 to-blue-500'
                      )}
                      style={{
                        width: `${Math.min((duration / totalDuration) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
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
