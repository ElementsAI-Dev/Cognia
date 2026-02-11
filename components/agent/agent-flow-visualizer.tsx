'use client';

/**
 * AgentFlowVisualizer - Visual representation of agent execution flow
 * Shows parent agent, sub-agents, and their execution states
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Clock,
  Bot,
  GitBranch,
  Zap,
  Play,
  RotateCcw,
  StopCircle,
  Plus,
} from 'lucide-react';
import { cn, formatDurationShort } from '@/lib/utils';
import { getSubAgentStatusConfig } from '@/lib/agent';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubAgent } from '@/hooks';
import { SubAgentNode } from './sub-agent-node';
import { SubAgentTemplateSelector } from './sub-agent-template-selector';
import type { SubAgent, SubAgentExecutionMode } from '@/types/agent/sub-agent';
import type { BackgroundAgent, BackgroundAgentStep } from '@/types/agent/background-agent';

interface AgentFlowVisualizerProps {
  agent: BackgroundAgent;
  onSubAgentClick?: (subAgent: SubAgent) => void;
  onStepClick?: (step: BackgroundAgentStep) => void;
  className?: string;
}

// Use shared status config from lib/agent/constants.ts

export function AgentFlowVisualizer({
  agent,
  onSubAgentClick,
  onStepClick,
  className,
}: AgentFlowVisualizerProps) {
  const t = useTranslations('agentFlowVisualizer');
  const [showSteps, setShowSteps] = useState(true);
  const [showSubAgents, setShowSubAgents] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [executionMode, setExecutionMode] = useState<SubAgentExecutionMode>('sequential');

  // Use sub-agent hook for managing sub-agents
  const {
    subAgents: managedSubAgents,
    isExecuting,
    progress: subAgentProgress,
    templates,
    executeOne,
    executeAll,
    cancelOne,
    cancelAll,
    clearCompleted,
    createFromTemplate,
    deleteSubAgent,
  } = useSubAgent({ parentAgentId: agent.id });

  // Use managed sub-agents if available, otherwise fall back to agent.subAgents
  const displaySubAgents = managedSubAgents.length > 0 ? managedSubAgents : agent.subAgents;

  // Handlers for sub-agent operations
  const handleExecuteAll = async () => {
    try {
      await executeAll(executionMode);
    } catch (_error) {
      toast.error(t('executeSubAgentsFailed'));
    }
  };

  const handleExecuteOne = async (subAgent: SubAgent) => {
    try {
      await executeOne(subAgent.id);
    } catch (_error) {
      toast.error(t('executeSubAgentFailed'));
    }
  };

  const handleCancelOne = useCallback(
    (subAgent: SubAgent) => {
      cancelOne(subAgent.id);
    },
    [cancelOne]
  );

  const handleDeleteOne = useCallback(
    (subAgent: SubAgent) => {
      deleteSubAgent(subAgent.id);
    },
    [deleteSubAgent]
  );

  const handleCreateFromTemplate = useCallback(
    (templateId: string, variables: Record<string, string>) => {
      createFromTemplate(templateId, variables);
      setShowTemplates(false);
    },
    [createFromTemplate]
  );

  const handleCancelAll = useCallback(() => {
    cancelAll();
  }, [cancelAll]);

  const handleClearCompleted = useCallback(() => {
    clearCompleted();
  }, [clearCompleted]);

  const parentConfig = getSubAgentStatusConfig(agent.status);
  const ParentIcon = parentConfig.icon;

  const completedSubAgents = displaySubAgents.filter((sa) => sa.status === 'completed').length;
  const totalSubAgents = displaySubAgents.length;
  const pendingSubAgents = displaySubAgents.filter(
    (sa) => sa.status === 'pending' || sa.status === 'queued'
  ).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Parent Agent Header */}
      <div
        className={cn(
          'rounded-xl border-2 p-4',
          agent.status === 'running' && 'border-primary shadow-lg shadow-primary/10',
          agent.status === 'completed' && 'border-green-500',
          agent.status === 'failed' && 'border-destructive'
        )}
      >
        <div className="flex items-start gap-4">
          {/* Main icon */}
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              parentConfig.bgColor
            )}
          >
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
                <ParentIcon
                  className={cn('h-3 w-3 mr-1', parentConfig.animate && 'animate-spin')}
                />
                {agent.status}
              </Badge>
            </div>

            {/* Progress */}
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('progress')}</span>
                <span>{agent.progress}%</span>
              </div>
              <Progress value={agent.progress} className="h-2" />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span>
                  {completedSubAgents}/{totalSubAgents} {t('subAgents')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>
                  {agent.steps.length} {t('steps')}
                </span>
              </div>
              {agent.startedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {agent.completedAt
                      ? formatDurationShort(agent.completedAt.getTime() - agent.startedAt.getTime())
                      : t('running')}
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
                {t('executionSteps')} ({agent.steps.length})
              </span>
              {showSteps ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2 p-2">
                {agent.steps.map((step) => {
                  const stepConfig = getSubAgentStatusConfig(step.status);
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
                        <StepIcon
                          className={cn(
                            'h-3 w-3',
                            stepConfig.color,
                            stepConfig.animate && 'animate-spin'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{step.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {step.duration ? formatDurationShort(step.duration) : ''}
                          </span>
                        </div>
                        {step.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {step.description}
                          </p>
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
      {(displaySubAgents.length > 0 || agent.subAgents.length > 0) && (
        <Collapsible open={showSubAgents} onOpenChange={setShowSubAgents}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                {t('subAgentsTitle')} ({completedSubAgents}/{totalSubAgents})
                {isExecuting && (
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    {t('running')}
                  </Badge>
                )}
              </span>
              {showSubAgents ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {/* Sub-Agent Controller UI */}
            <div className="flex items-center justify-between gap-2 p-2 border-b">
              <div className="flex items-center gap-2">
                {/* Add from Template Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1"
                      onClick={() => setShowTemplates(!showTemplates)}
                    >
                      <Plus className="h-3 w-3" />
                      <span className="text-xs">{t('addFromTemplate') || 'Template'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('addFromTemplateTooltip') || 'Create sub-agent from template'}
                  </TooltipContent>
                </Tooltip>

                {/* Execution Mode Selector */}
                <Select
                  value={executionMode}
                  onValueChange={(value) => setExecutionMode(value as SubAgentExecutionMode)}
                  disabled={isExecuting}
                >
                  <SelectTrigger className="h-7 w-[110px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">{t('sequential')}</SelectItem>
                    <SelectItem value="parallel">{t('parallel')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Execute All Button */}
                {pendingSubAgents > 0 && !isExecuting && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={handleExecuteAll}
                      >
                        <Play className="h-3 w-3" />
                        <span className="text-xs">{t('runAll')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('executeAllTooltip', { mode: executionMode })}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Cancel All Button */}
                {isExecuting && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={handleCancelAll}
                      >
                        <StopCircle className="h-3 w-3" />
                        <span className="text-xs">{t('cancel')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('cancelAllTooltip')}</TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Clear Completed Button */}
                {completedSubAgents > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={handleClearCompleted}
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span className="text-xs">{t('clearDone')}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('clearCompletedTooltip')}</TooltipContent>
                  </Tooltip>
                )}

                {/* Progress indicator when executing */}
                {isExecuting && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Progress value={subAgentProgress} className="w-16 h-1" />
                    <span>{Math.round(subAgentProgress)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Selector */}
            {showTemplates && (
              <div className="p-3 border-b">
                <SubAgentTemplateSelector
                  templates={templates}
                  onSelect={handleCreateFromTemplate}
                />
              </div>
            )}

            {/* Sub-Agent List */}
            <div className="space-y-3 p-2">
              {displaySubAgents.map((subAgent, index) => (
                <SubAgentNode
                  key={subAgent.id}
                  subAgent={subAgent}
                  onClick={() => onSubAgentClick?.(subAgent)}
                  onExecute={handleExecuteOne}
                  onCancel={handleCancelOne}
                  onDelete={handleDeleteOne}
                  isLast={index === displaySubAgents.length - 1}
                  showActions={true}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

