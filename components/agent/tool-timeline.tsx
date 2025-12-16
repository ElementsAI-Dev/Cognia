'use client';

/**
 * ToolTimeline - Visual timeline of tool executions
 */

import { Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolState } from '@/types/message';

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

  return (
    <div className={cn('space-y-4 rounded-lg border p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Tool Executions</span>
        <span className="text-muted-foreground">
          {executions.length} tool{executions.length !== 1 ? 's' : ''} • Total: {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Timeline */}
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
            <div key={execution.id} className="relative flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    execution.state === 'output-available'
                      ? 'border-green-200 bg-green-50'
                      : execution.state === 'output-error' ||
                          execution.state === 'output-denied'
                        ? 'border-red-200 bg-red-50'
                        : 'border-blue-200 bg-blue-50'
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
                  <div className="h-full w-0.5 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {formatToolName(execution.toolName)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config.label}
                      {execution.error && (
                        <span className="text-destructive"> - {execution.error}</span>
                      )}
                    </p>
                  </div>
                  {duration !== null && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>

                {/* Progress bar for completed executions */}
                {duration !== null && totalDuration > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        execution.state === 'output-available'
                          ? 'bg-green-500'
                          : execution.state === 'output-error' ||
                              execution.state === 'output-denied'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
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
    </div>
  );
}

export default ToolTimeline;
