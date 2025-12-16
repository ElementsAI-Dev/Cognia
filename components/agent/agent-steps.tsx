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
          <span className="font-medium">
            {completedSteps} / {steps.length} steps
          </span>
        </div>
        <Progress value={progress} className="h-2" />
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
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        step.status === 'running' && 'border-primary bg-primary/5',
        step.status === 'completed' && 'bg-muted/50',
        step.status === 'error' && 'border-destructive bg-destructive/5'
      )}
    >
      <div className="mt-0.5">{statusIcons[step.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Step {index + 1}</span>
          <span className="font-medium">{step.name}</span>
        </div>
        {step.description && (
          <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
        )}
        {step.completedAt && step.startedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Completed in{' '}
            {((step.completedAt.getTime() - step.startedAt.getTime()) / 1000).toFixed(
              1
            )}
            s
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
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 font-semibold">Agent Execution</h3>
      <AgentSteps steps={steps} />
    </div>
  );
}

export default AgentSteps;
