'use client';

/**
 * AgentSteps - Displays agent execution steps with progress
 */

import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/stores';

interface AgentStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startedAt?: Date;
  completedAt?: Date;
}

interface AgentStepsProps {
  steps: AgentStep[];
  className?: string;
}

export function AgentSteps({ steps, className }: AgentStepsProps) {
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-primary">
            {completedSteps} / {steps.length} steps
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-muted/50" />
      </div>

      {/* Step list */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <StepItem key={step.id} step={step} index={index} />
        ))}
      </div>
    </div>
  );
}

function StepItem({ step, index }: { step: AgentStep; index: number }) {
  const statusIcons = {
    pending: <Circle className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border/50 p-3 transition-all duration-200',
        'animate-in fade-in-0 slide-in-from-left-2',
        step.status === 'running' && 'border-primary/50 bg-primary/5 shadow-sm shadow-primary/10',
        step.status === 'completed' && 'bg-muted/30',
        step.status === 'error' && 'border-destructive/50 bg-destructive/5'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={cn(
        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg',
        step.status === 'running' && 'bg-primary/10',
        step.status === 'completed' && 'bg-green-500/10',
        step.status === 'error' && 'bg-destructive/10',
        step.status === 'pending' && 'bg-muted'
      )}>
        {statusIcons[step.status]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">Step {index + 1}</span>
          <span className="font-medium truncate">{step.name}</span>
        </div>
        {step.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{step.description}</p>
        )}
        {step.completedAt && step.startedAt && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            ✓ Completed in{' '}
            {((step.completedAt.getTime() - step.startedAt.getTime()) / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
}

// Wrapper component that uses the agent store
export function AgentStepsPanel() {
  const isAgentRunning = useAgentStore((state) => state.isAgentRunning);
  const toolExecutions = useAgentStore((state) => state.toolExecutions);

  if (!isAgentRunning && toolExecutions.length === 0) {
    return null;
  }

  // Convert tool executions to AgentStep format
  const steps: AgentStep[] = toolExecutions.map((tool) => ({
    id: tool.id,
    name: tool.toolName,
    description: undefined,
    status:
      tool.status === 'pending'
        ? ('pending' as const)
        : tool.status === 'running'
          ? ('running' as const)
          : tool.status === 'completed'
            ? ('completed' as const)
            : ('error' as const),
    startedAt: tool.startedAt,
    completedAt: tool.completedAt,
  }));

  return (
    <div className="rounded-2xl border border-border/50 bg-card/95 backdrop-blur-sm p-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <h3 className="mb-4 font-semibold flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        Agent Execution
      </h3>
      <AgentSteps steps={steps} />
    </div>
  );
}

// Export AgentStep type for use in other components
export type { AgentStep };

export default AgentSteps;
