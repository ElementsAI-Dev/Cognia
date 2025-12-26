'use client';

/**
 * BackgroundAgentPanel - Panel for managing background agents
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Play,
  Pause,
  StopCircle,
  Trash2,
  Bell,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBackgroundAgent } from '@/hooks/use-background-agent';
import { AgentFlowVisualizer } from './agent-flow-visualizer';
import type { BackgroundAgent, BackgroundAgentStatus } from '@/types/background-agent';

const statusConfig: Record<BackgroundAgentStatus, {
  icon: React.ElementType;
  color: string;
  label: string;
}> = {
  idle: { icon: Clock, color: 'text-muted-foreground', label: 'Idle' },
  queued: { icon: Clock, color: 'text-blue-500', label: 'Queued' },
  initializing: { icon: Loader2, color: 'text-blue-500', label: 'Initializing' },
  running: { icon: Loader2, color: 'text-primary', label: 'Running' },
  paused: { icon: Pause, color: 'text-yellow-500', label: 'Paused' },
  waiting: { icon: Clock, color: 'text-orange-500', label: 'Waiting' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-destructive', label: 'Failed' },
  cancelled: { icon: XCircle, color: 'text-orange-500', label: 'Cancelled' },
  timeout: { icon: XCircle, color: 'text-red-500', label: 'Timeout' },
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

interface AgentCardProps {
  agent: BackgroundAgent;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function AgentCard({
  agent,
  isSelected,
  onSelect,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDelete,
}: AgentCardProps) {
  const config = statusConfig[agent.status];
  const Icon = config.icon;
  const isRunning = agent.status === 'running';
  const isPaused = agent.status === 'paused';
  const isIdle = agent.status === 'idle';
  const isCompleted = ['completed', 'failed', 'cancelled', 'timeout'].includes(agent.status);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        isSelected && 'border-primary bg-primary/5',
        isRunning && 'border-primary/50 shadow-sm'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          isRunning && 'bg-primary/10',
          isCompleted && agent.status === 'completed' && 'bg-green-50 dark:bg-green-950',
          isCompleted && agent.status !== 'completed' && 'bg-destructive/10'
        )}>
          <Icon className={cn(
            'h-5 w-5',
            config.color,
            isRunning && 'animate-spin'
          )} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{agent.name}</h4>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {config.label}
            </Badge>
          </div>

          {/* Task preview */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {agent.task.slice(0, 50)}...
          </p>

          {/* Progress */}
          {isRunning && (
            <div className="mt-2">
              <Progress value={agent.progress} className="h-1" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {agent.progress}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {agent.subAgents.filter(sa => sa.status === 'completed').length}/{agent.subAgents.length} sub-agents
                </span>
              </div>
            </div>
          )}

          {/* Time info */}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            {agent.startedAt && (
              <span>Started: {formatTime(agent.startedAt)}</span>
            )}
            {agent.completedAt && agent.startedAt && (
              <span>
                Duration: {formatDuration(agent.completedAt.getTime() - agent.startedAt.getTime())}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t">
        {isIdle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); onStart(); }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start</TooltipContent>
          </Tooltip>
        )}

        {isRunning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); onPause(); }}
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pause</TooltipContent>
          </Tooltip>
        )}

        {isPaused && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => { e.stopPropagation(); onResume(); }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resume</TooltipContent>
          </Tooltip>
        )}

        {(isRunning || isPaused || agent.status === 'queued') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
              >
                <StopCircle className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cancel</TooltipContent>
          </Tooltip>
        )}

        {isCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function BackgroundAgentPanel() {
  const _t = useTranslations('agent');
  const [activeTab, setActiveTab] = useState<'all' | 'running' | 'completed'>('all');

  const {
    agents,
    runningAgents,
    completedAgents,
    selectedAgent,
    isPanelOpen,
    unreadNotificationCount,
    queueState,
    startAgent,
    pauseAgent,
    resumeAgent,
    cancelAgent,
    deleteAgent,
    cancelAll,
    pauseQueue,
    resumeQueue,
    markAllNotificationsRead,
    closePanel,
    selectAgent,
    clearCompleted,
  } = useBackgroundAgent();

  const displayAgents = activeTab === 'running'
    ? runningAgents
    : activeTab === 'completed'
      ? completedAgents
      : agents;

  return (
    <Sheet open={isPanelOpen} onOpenChange={(open) => !open && closePanel()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Background Agents
              {runningAgents.length > 0 && (
                <Badge variant="default" className="ml-2">
                  {runningAgents.length} running
                </Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {unreadNotificationCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="relative"
                      onClick={markAllNotificationsRead}
                    >
                      <Bell className="h-4 w-4" />
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                        {unreadNotificationCount}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark all as read</TooltipContent>
                </Tooltip>
              )}
              <Button variant="ghost" size="sm" onClick={closePanel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Queue status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>
              Queue: {queueState.items} waiting, {queueState.currentlyRunning}/{queueState.maxConcurrent} running
            </span>
            <div className="flex items-center gap-2">
              {queueState.isPaused ? (
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={resumeQueue}>
                  <Play className="h-3 w-3 mr-1" />
                  Resume Queue
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={pauseQueue}>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause Queue
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Agent list */}
          <div className="w-1/2 border-r">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="w-full justify-start rounded-none border-b h-10 bg-transparent p-0">
                <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  All ({agents.length})
                </TabsTrigger>
                <TabsTrigger value="running" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  Running ({runningAgents.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  Completed ({completedAgents.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="m-0">
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="p-2 space-y-2">
                    {displayAgents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Bot className="h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">No agents</p>
                      </div>
                    ) : (
                      displayAgents.map((agent) => (
                        <AgentCard
                          key={agent.id}
                          agent={agent}
                          isSelected={selectedAgent?.id === agent.id}
                          onSelect={() => selectAgent(agent.id)}
                          onStart={() => startAgent(agent.id)}
                          onPause={() => pauseAgent(agent.id)}
                          onResume={() => resumeAgent(agent.id)}
                          onCancel={() => cancelAgent(agent.id)}
                          onDelete={() => deleteAgent(agent.id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Actions */}
                {displayAgents.length > 0 && (
                  <div className="p-2 border-t flex items-center justify-between">
                    {activeTab === 'completed' && (
                      <Button variant="outline" size="sm" onClick={clearCompleted}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Clear All
                      </Button>
                    )}
                    {activeTab === 'running' && runningAgents.length > 0 && (
                      <Button variant="destructive" size="sm" onClick={cancelAll}>
                        <StopCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel All
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Agent details */}
          <div className="w-1/2">
            {selectedAgent ? (
              <ScrollArea className="h-full">
                <div className="p-4">
                  <AgentFlowVisualizer agent={selectedAgent} />
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Bot className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-sm">Select an agent to view details</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BackgroundAgentPanel;
