'use client';

/**
 * AgentTeamPanel - Main panel for managing and viewing agent teams
 *
 * Displays team status, teammates, shared task list, and messaging.
 * Follows the existing component patterns (BackgroundAgentPanel, ProcessManagerPanel).
 */

import { useState, useCallback, lazy, Suspense, useMemo } from 'react';
import { useTeamTeammates, useTeamTasks, useTeamMessages } from '@/hooks/agent/use-team-data';
import { useTranslations } from 'next-intl';
import {
  Users,
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  ListTodo,
  CheckCircle,
  XCircle,
  Circle,
  Clock,
  Loader2,
  Power,
  Ban,
  Lock,
  Eye,
  Hand,
  Brain,
  Layers,
  LayoutGrid,
  LayoutList,
  Columns,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { AgentTeamChat } from './agent-team-chat';
import { AgentTeamActivityFeed } from './agent-team-activity-feed';
import { AgentTeamTimeline } from './agent-team-timeline';
import { AgentTeamConfigEditor } from './agent-team-config-editor';
import {
  TEAM_STATUS_CONFIG,
  TEAMMATE_STATUS_CONFIG,
  TASK_STATUS_CONFIG,
  type AgentTeam,
  type AgentTeammate,
  type AgentTeamTask,
  type TeamDisplayMode,
} from '@/types/agent/agent-team';

// Lazy load graph component (heavy xyflow dependency)
const AgentTeamGraph = lazy(() =>
  import('./agent-team-graph').then((m) => ({ default: m.AgentTeamGraph }))
);

// ============================================================================
// Status Icon Helper
// ============================================================================

function StatusIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, React.ElementType> = {
    Circle,
    Brain,
    Play,
    Pause,
    CheckCircle,
    XCircle,
    Ban,
    FileText: ListTodo,
    Clock,
    Loader2,
    Power,
    Lock,
    Hand,
    Eye,
  };

  const IconComponent = iconMap[icon] || Circle;
  return <IconComponent className={cn('size-3.5', className)} />;
}

// ============================================================================
// TeamStatusBadge
// ============================================================================

function TeamStatusBadge({ status }: { status: AgentTeam['status'] }) {
  const config = TEAM_STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', config.color)}>
      <StatusIcon icon={config.icon} />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// TeammateCard
// ============================================================================

interface TeammateCardProps {
  teammate: AgentTeammate;
  isSelected: boolean;
  onClick: () => void;
}

function TeammateCard({ teammate, isSelected, onClick }: TeammateCardProps) {
  const t = useTranslations('agentTeam');
  const statusConfig = TEAMMATE_STATUS_CONFIG[teammate.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border p-3 text-left transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('size-2 rounded-full', {
            'bg-muted-foreground': teammate.status === 'idle' || teammate.status === 'shutdown',
            'bg-blue-500': teammate.status === 'planning' || teammate.status === 'awaiting_approval',
            'bg-primary animate-pulse': teammate.status === 'executing',
            'bg-green-500': teammate.status === 'completed',
            'bg-destructive': teammate.status === 'failed',
            'bg-yellow-500': teammate.status === 'paused',
            'bg-orange-500': teammate.status === 'cancelled',
          })} />
          <span className="text-sm font-medium">{teammate.name}</span>
          {teammate.role === 'lead' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t('teammate.lead')}</Badge>
          )}
        </div>
        <span className={cn('text-xs', statusConfig.color)}>
          {statusConfig.label}
        </span>
      </div>

      {teammate.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
          {teammate.description}
        </p>
      )}

      {teammate.status === 'executing' && teammate.progress > 0 && (
        <Progress value={teammate.progress} className="mt-2 h-1" />
      )}

      {teammate.lastActivity && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {teammate.lastActivity}
        </p>
      )}

      {teammate.tokenUsage.totalTokens > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t('teammate.tokens', { count: teammate.tokenUsage.totalTokens.toLocaleString() })}
        </p>
      )}
    </button>
  );
}

// ============================================================================
// TaskItem
// ============================================================================

interface TaskItemProps {
  task: AgentTeamTask;
  teammates: Record<string, AgentTeammate>;
}

function TaskItem({ task, teammates }: TaskItemProps) {
  const t = useTranslations('agentTeam');
  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const assignee = task.claimedBy ? teammates[task.claimedBy] : task.assignedTo ? teammates[task.assignedTo] : undefined;

  return (
    <div className={cn(
      'rounded-md border p-2.5 text-sm',
      task.status === 'completed' && 'opacity-60',
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon icon={statusConfig.icon} className={statusConfig.color} />
          <span className="truncate font-medium">{task.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.priority !== 'normal' && (
            <Badge
              variant="outline"
              className={cn('text-[10px] px-1 py-0', {
                'border-red-500 text-red-500': task.priority === 'critical',
                'border-orange-500 text-orange-500': task.priority === 'high',
                'border-muted-foreground text-muted-foreground': task.priority === 'low' || task.priority === 'background',
              })}
            >
              {task.priority}
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-[10px] px-1 py-0', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {task.description && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
        {assignee && (
          <span>→ {assignee.name}</span>
        )}
        {task.dependencies.length > 0 && (
          <span className="flex items-center gap-0.5">
            <Lock className="size-2.5" />
            {task.dependencies.length > 1 ? t('task.dependenciesPlural', { count: task.dependencies.length }) : t('task.dependencies', { count: task.dependencies.length })}
          </span>
        )}
        {task.actualDuration && (
          <span>{(task.actualDuration / 1000).toFixed(1)}s</span>
        )}
        {task.tags.length > 0 && (
          <span>{task.tags.join(', ')}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DisplayModeSelector
// ============================================================================

function DisplayModeSelector({
  mode,
  onChange,
}: {
  mode: TeamDisplayMode;
  onChange: (mode: TeamDisplayMode) => void;
}) {
  const t = useTranslations('agentTeam');
  return (
    <div className="flex items-center gap-0.5 rounded-md border p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'compact' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-6"
            onClick={() => onChange('compact')}
          >
            <LayoutList className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('display.compact')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'expanded' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-6"
            onClick={() => onChange('expanded')}
          >
            <LayoutGrid className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('display.expanded')}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mode === 'split' ? 'secondary' : 'ghost'}
            size="icon"
            className="size-6"
            onClick={() => onChange('split')}
          >
            <Columns className="size-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('display.split')}</TooltipContent>
      </Tooltip>
    </div>
  );
}

// ============================================================================
// AgentTeamPanel
// ============================================================================

export interface AgentTeamPanelProps {
  className?: string;
  onExecuteTeam?: (teamId: string) => void;
  onCancelTeam?: (teamId: string) => void;
  onPauseTeam?: (teamId: string) => void;
  onResumeTeam?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onCreateTeam?: () => void;
}

export function AgentTeamPanel({
  className,
  onExecuteTeam,
  onCancelTeam,
  onPauseTeam,
  onResumeTeam,
  onDeleteTeam,
  onCreateTeam,
}: AgentTeamPanelProps) {
  const t = useTranslations('agentTeam');
  const [expandedSections, setExpandedSections] = useState({
    teammates: true,
    tasks: true,
    messages: false,
  });

  const teams = useAgentTeamStore((s) => s.teams);
  const teammatesRecord = useAgentTeamStore((s) => s.teammates);
  const activeTeamId = useAgentTeamStore((s) => s.activeTeamId);
  const selectedTeammateId = useAgentTeamStore((s) => s.selectedTeammateId);
  const displayMode = useAgentTeamStore((s) => s.displayMode);
  const setActiveTeam = useAgentTeamStore((s) => s.setActiveTeam);
  const setSelectedTeammate = useAgentTeamStore((s) => s.setSelectedTeammate);
  const setDisplayMode = useAgentTeamStore((s) => s.setDisplayMode);

  const activeTeam = activeTeamId ? teams[activeTeamId] : undefined;

  const teamTeammates = useTeamTeammates(activeTeamId);
  const teamTasksUnsorted = useTeamTasks(activeTeamId);
  const teamMessagesUnsorted = useTeamMessages(activeTeamId);

  const teamTasks = useMemo(
    () => [...teamTasksUnsorted].sort((a, b) => a.order - b.order),
    [teamTasksUnsorted]
  );

  const teamMessages = useMemo(
    () => [...teamMessagesUnsorted].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    [teamMessagesUnsorted]
  );

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const teamList = Object.values(teams);

  // Empty state
  if (teamList.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-3 p-8 text-center', className)}>
        <Users className="size-10 text-muted-foreground/50" />
        <div>
          <h3 className="text-sm font-medium">{t('noTeams')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('noTeamsHint')}
          </p>
        </div>
        {onCreateTeam && (
          <Button size="sm" onClick={onCreateTeam} className="gap-1.5">
            <Plus className="size-3.5" />
            {t('createTeam')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <span className="text-sm font-medium">{t('title')}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">
            {teamList.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <DisplayModeSelector mode={displayMode} onChange={setDisplayMode} />
          {onCreateTeam && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" onClick={onCreateTeam}>
                  <Plus className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('createTeam')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Team Selector (if multiple teams) */}
      {teamList.length > 1 && (
        <div className="flex gap-1 border-b px-3 py-1.5 overflow-x-auto">
          {teamList.map(team => (
            <Button
              key={team.id}
              variant={team.id === activeTeamId ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs shrink-0 h-7"
              onClick={() => setActiveTeam(team.id)}
            >
              {team.name}
            </Button>
          ))}
        </div>
      )}

      {/* Active Team Content */}
      {activeTeam ? (
        displayMode === 'split' ? (
          /* Split mode: Graph visualization */
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('loadingGraph')}
            </div>
          }>
            <AgentTeamGraph
              teamId={activeTeam.id}
              className="flex-1"
              onTeammateClick={(id) => setSelectedTeammate(id === selectedTeammateId ? null : id)}
            />
          </Suspense>
        ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {/* Team Overview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{activeTeam.name}</h3>
                <TeamStatusBadge status={activeTeam.status} />
              </div>

              {activeTeam.description && (
                <p className="text-xs text-muted-foreground">{activeTeam.description}</p>
              )}

              {/* Progress */}
              {(activeTeam.status === 'executing' || activeTeam.status === 'planning') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{activeTeam.status === 'planning' ? t('planning') : t('executing')}</span>
                    <span>{activeTeam.progress}%</span>
                  </div>
                  <Progress value={activeTeam.progress} className="h-1.5" />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                {activeTeam.status === 'idle' && onExecuteTeam && (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onExecuteTeam(activeTeam.id)}>
                    <Play className="size-3" />
                    {t('executeTeam')}
                  </Button>
                )}
                {activeTeam.status === 'executing' && (
                  <>
                    {onPauseTeam && (
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onPauseTeam(activeTeam.id)}>
                        <Pause className="size-3" />
                        {t('pauseTeam')}
                      </Button>
                    )}
                    {onCancelTeam && (
                      <Button variant="destructive" size="sm" className="h-7 gap-1 text-xs" onClick={() => onCancelTeam(activeTeam.id)}>
                        <Square className="size-3" />
                        {t('cancelTeam')}
                      </Button>
                    )}
                  </>
                )}
                {activeTeam.status === 'paused' && onResumeTeam && (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onResumeTeam(activeTeam.id)}>
                    <Play className="size-3" />
                    {t('resumeTeam')}
                  </Button>
                )}
                {(activeTeam.status === 'completed' || activeTeam.status === 'failed' || activeTeam.status === 'cancelled') && onDeleteTeam && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive" onClick={() => onDeleteTeam(activeTeam.id)}>
                    <Trash2 className="size-3" />
                    {t('remove')}
                  </Button>
                )}
              </div>

              {/* Token Usage */}
              {activeTeam.totalTokenUsage.totalTokens > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {t('result.totalTokens', { count: activeTeam.totalTokenUsage.totalTokens.toLocaleString() })}
                </p>
              )}
            </div>

            <Separator />

            {/* Teammates Section */}
            <Collapsible open={expandedSections.teammates} onOpenChange={() => toggleSection('teammates')}>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {expandedSections.teammates ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <Layers className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {t('teammate.title')} ({teamTeammates.length})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {teamTeammates.map(teammate => (
                  <TeammateCard
                    key={teammate.id}
                    teammate={teammate}
                    isSelected={teammate.id === selectedTeammateId}
                    onClick={() => setSelectedTeammate(
                      teammate.id === selectedTeammateId ? null : teammate.id
                    )}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Tasks Section */}
            <Collapsible open={expandedSections.tasks} onOpenChange={() => toggleSection('tasks')}>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {expandedSections.tasks ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <ListTodo className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {t('task.title')} ({teamTasks.length})
                  </span>
                  {teamTasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {t('task.done', { completed: teamTasks.filter(tk => tk.status === 'completed').length, total: teamTasks.length })}
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-1.5">
                {teamTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    {t('task.noTasksHint')}
                  </p>
                ) : (
                  teamTasks.map(task => (
                    <TaskItem key={task.id} task={task} teammates={teammatesRecord} />
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Messages Section (Interactive Chat) */}
            <Collapsible open={expandedSections.messages} onOpenChange={() => toggleSection('messages')}>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  {expandedSections.messages ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {t('message.title')} ({teamMessages.length})
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <AgentTeamChat teamId={activeTeam.id} maxHeight="300px" />
              </CollapsibleContent>
            </Collapsible>

            {/* Final Result */}
            {activeTeam.finalResult && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium flex items-center gap-1.5">
                    <CheckCircle className="size-3.5 text-green-500" />
                    {t('result.title')}
                  </h4>
                  <div className="rounded-md border bg-muted/30 p-2.5 text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {activeTeam.finalResult}
                  </div>
                </div>
              </>
            )}

            {/* Error */}
            {activeTeam.error && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-xs font-medium flex items-center gap-1.5 text-destructive">
                    <XCircle className="size-3.5" />
                    {t('result.error')}
                  </h4>
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                    {activeTeam.error}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Timeline */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t('timeline.title')}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <AgentTeamTimeline teamId={activeTeam.id} />
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Activity Feed */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t('activityFeed.title')}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <AgentTeamActivityFeed teamId={activeTeam.id} maxHeight="250px" />
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Config */}
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Brain className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{t('configEditor.title')}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <AgentTeamConfigEditor teamId={activeTeam.id} />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
        )
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
          {t('selectTeam')}
        </div>
      )}
    </div>
  );
}
