'use client';

/**
 * AgentFlowVisualizer - Visual representation of agent execution flow
 * Shows parent agent, sub-agents, and their execution states
 */

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Pause,
  AlertTriangle,
  Bot,
  GitBranch,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { SubAgent, SubAgentStatus } from '@/types/sub-agent';
import type { BackgroundAgent, BackgroundAgentStep } from '@/types/background-agent';

interface AgentFlowVisualizerProps {
  agent: BackgroundAgent;
  onSubAgentClick?: (subAgent: SubAgent) => void;
  onStepClick?: (step: BackgroundAgentStep) => void;
  className?: string;
}

const statusConfig: Record<SubAgentStatus | string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  animate?: boolean;
}> = {
  pending: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  queued: { icon: Clock, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  running: { icon: Loader2, color: 'text-primary', bgColor: 'bg-primary/10', animate: true },
  waiting: { icon: Pause, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
  completed: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950' },
  failed: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  cancelled: { icon: XCircle, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  timeout: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950' },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface SubAgentNodeProps {
  subAgent: SubAgent;
  onClick?: () => void;
  isLast?: boolean;
}

function SubAgentNode({ subAgent, onClick, isLast }: SubAgentNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = statusConfig[subAgent.status] || statusConfig.pending;
  const Icon = config.icon;

  const duration = useMemo(() => {
    if (subAgent.startedAt && subAgent.completedAt) {
      return subAgent.completedAt.getTime() - subAgent.startedAt.getTime();
    }
    return null;
  }, [subAgent.startedAt, subAgent.completedAt]);

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
            'hover:border-primary/50 hover:shadow-sm',
            config.bgColor
          )}
          onClick={onClick}
        >
          {/* Status icon */}
          <div className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
            config.bgColor,
            subAgent.status === 'running' && 'border-primary'
          )}>
            <Icon className={cn('h-4 w-4', config.color, config.animate && 'animate-spin')} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{subAgent.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {subAgent.status}
                </Badge>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            {/* Progress bar */}
            {subAgent.status === 'running' && (
              <Progress value={subAgent.progress} className="h-1 mt-2" />
            )}

            {/* Duration */}
            {duration && (
              <span className="text-xs text-muted-foreground mt-1 block">
                {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>

        <CollapsibleContent className="ml-11 mt-2 space-y-2">
          {/* Task description */}
          {subAgent.description && (
            <p className="text-xs text-muted-foreground">{subAgent.description}</p>
          )}

          {/* Task */}
          <div className="text-xs bg-muted/50 rounded p-2">
            <span className="font-medium">Task:</span> {subAgent.task}
          </div>

          {/* Result */}
          {subAgent.result && (
            <div className="text-xs bg-muted/50 rounded p-2">
              <span className="font-medium">Result:</span>
              <p className="mt-1 whitespace-pre-wrap line-clamp-3">
                {subAgent.result.finalResponse}
              </p>
            </div>
          )}

          {/* Error */}
          {subAgent.error && (
            <div className="text-xs bg-destructive/10 text-destructive rounded p-2">
              <span className="font-medium">Error:</span> {subAgent.error}
            </div>
          )}

          {/* Logs */}
          {subAgent.logs.length > 0 && (
            <div className="text-xs space-y-1">
              <span className="font-medium">Recent Logs:</span>
              {subAgent.logs.slice(-3).map((log, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded',
                    log.level === 'error' && 'bg-destructive/10 text-destructive',
                    log.level === 'warn' && 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600',
                    log.level === 'info' && 'bg-muted'
                  )}
                >
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function AgentFlowVisualizer({
  agent,
  onSubAgentClick,
  onStepClick,
  className,
}: AgentFlowVisualizerProps) {
  const [showSteps, setShowSteps] = useState(true);
  const [showSubAgents, setShowSubAgents] = useState(true);

  const parentConfig = statusConfig[agent.status] || statusConfig.pending;
  const ParentIcon = parentConfig.icon;

  const completedSubAgents = agent.subAgents.filter(sa => sa.status === 'completed').length;
  const totalSubAgents = agent.subAgents.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Parent Agent Header */}
      <div className={cn(
        'rounded-xl border-2 p-4',
        agent.status === 'running' && 'border-primary shadow-lg shadow-primary/10',
        agent.status === 'completed' && 'border-green-500',
        agent.status === 'failed' && 'border-destructive'
      )}>
        <div className="flex items-start gap-4">
          {/* Main icon */}
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            parentConfig.bgColor
          )}>
            <Bot className={cn('h-6 w-6', parentConfig.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </div>
              <Badge
                variant={agent.status === 'running' ? 'default' : 'secondary'}
                className={cn(
                  agent.status === 'completed' && 'bg-green-500',
                  agent.status === 'failed' && 'bg-destructive'
                )}
              >
                <ParentIcon className={cn('h-3 w-3 mr-1', parentConfig.animate && 'animate-spin')} />
                {agent.status}
              </Badge>
            </div>

            {/* Progress */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{agent.progress}%</span>
              </div>
              <Progress value={agent.progress} className="h-2" />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span>{completedSubAgents}/{totalSubAgents} sub-agents</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{agent.steps.length} steps</span>
              </div>
              {agent.startedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {agent.completedAt
                      ? formatDuration(agent.completedAt.getTime() - agent.startedAt.getTime())
                      : 'Running...'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Steps */}
      {agent.steps.length > 0 && (
        <Collapsible open={showSteps} onOpenChange={setShowSteps}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Execution Steps ({agent.steps.length})
              </span>
              {showSteps ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2 p-2">
                {agent.steps.map((step) => {
                  const stepConfig = statusConfig[step.status] || statusConfig.pending;
                  const StepIcon = stepConfig.icon;

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg border cursor-pointer',
                        'hover:border-primary/50 transition-colors',
                        stepConfig.bgColor
                      )}
                      onClick={() => onStepClick?.(step)}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background">
                        <StepIcon className={cn('h-3 w-3', stepConfig.color, stepConfig.animate && 'animate-spin')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{step.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {step.duration ? formatDuration(step.duration) : ''}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Sub-Agents */}
      {agent.subAgents.length > 0 && (
        <Collapsible open={showSubAgents} onOpenChange={setShowSubAgents}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Sub-Agents ({completedSubAgents}/{totalSubAgents})
              </span>
              {showSubAgents ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-3 p-2">
              {agent.subAgents.map((subAgent, _index) => (
                <SubAgentNode
                  key={subAgent.id}
                  subAgent={subAgent}
                  onClick={() => onSubAgentClick?.(subAgent)}
                  isLast={_index === agent.subAgents.length - 1}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default AgentFlowVisualizer;
