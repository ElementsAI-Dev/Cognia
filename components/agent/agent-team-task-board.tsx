'use client';

/**
 * AgentTeamTaskBoard - Kanban-style task board for agent teams
 *
 * Features:
 * - Kanban columns: Blocked → Pending → In Progress → Review → Completed/Failed
 * - Task cards with status, assignee, priority, dependencies
 * - Manual task creation/editing
 * - Claim/assign/cancel operations
 * - Dependency visualization (simple badges)
 * - Task detail popover with result, duration, token usage
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  User,
  ArrowRight,
  Ban,
  Lock,
  Zap,
  Timer,
  Hash,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { TASK_STATUS_CONFIG, type AgentTeamTask, type TeamTaskStatus } from '@/types/agent/agent-team';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AgentTeamTaskBoardProps {
  teamId: string;
  className?: string;
}

interface TaskCreateForm {
  title: string;
  description: string;
  priority: string;
  assignedTo: string;
}

// ============================================================================
// Column Configuration
// ============================================================================

const COLUMNS: { id: string; statuses: TeamTaskStatus[]; label: string; color: string }[] = [
  { id: 'blocked', statuses: ['blocked'], label: 'Blocked', color: 'border-orange-500/30' },
  { id: 'pending', statuses: ['pending', 'claimed'], label: 'Pending', color: 'border-blue-500/30' },
  { id: 'in_progress', statuses: ['in_progress'], label: 'In Progress', color: 'border-primary/30' },
  { id: 'review', statuses: ['review'], label: 'Review', color: 'border-yellow-500/30' },
  { id: 'done', statuses: ['completed', 'failed', 'cancelled'], label: 'Done', color: 'border-green-500/30' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-600 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  normal: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  low: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  background: 'bg-gray-400/20 text-gray-500 border-gray-400/30',
};

// ============================================================================
// Component
// ============================================================================

export function AgentTeamTaskBoard({ teamId, className }: AgentTeamTaskBoardProps) {
  const t = useTranslations('agentTeam');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<TaskCreateForm>({
    title: '',
    description: '',
    priority: 'normal',
    assignedTo: '',
  });

  const team = useAgentTeamStore((s) => s.teams[teamId]);
  const allTasks = useAgentTeamStore((s) => s.tasks);
  const allTeammates = useAgentTeamStore((s) => s.teammates);
  const createTask = useAgentTeamStore((s) => s.createTask);
  const setTaskStatus = useAgentTeamStore((s) => s.setTaskStatus);
  const claimTask = useAgentTeamStore((s) => s.claimTask);
  const assignTask = useAgentTeamStore((s) => s.assignTask);

  const tasks = useMemo(() => {
    if (!team) return [];
    return team.taskIds
      .map(id => allTasks[id])
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }, [team, allTasks]);

  const teammates = useMemo(() => {
    if (!team) return [];
    return team.teammateIds
      .map(id => allTeammates[id])
      .filter(Boolean);
  }, [team, allTeammates]);

  const getTasksByColumn = useCallback((statuses: TeamTaskStatus[]) => {
    return tasks.filter(task => statuses.includes(task.status));
  }, [tasks]);

  const handleCreateTask = useCallback(() => {
    if (!createForm.title.trim() || !createForm.description.trim()) return;

    createTask({
      teamId,
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      priority: createForm.priority as AgentTeamTask['priority'],
      assignedTo: createForm.assignedTo || undefined,
    });

    setCreateForm({ title: '', description: '', priority: 'normal', assignedTo: '' });
    setCreateDialogOpen(false);
  }, [teamId, createForm, createTask]);

  if (!team) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t('taskBoard.title') || 'Task Board'}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {tasks.length} {t('taskBoard.tasks') || 'tasks'}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-3 w-3" />
          {t('taskBoard.addTask') || 'Add Task'}
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {COLUMNS.map(column => {
          const columnTasks = getTasksByColumn(column.statuses);
          return (
            <div
              key={column.id}
              className={cn(
                'flex-1 min-w-[160px] rounded-lg border-2 p-2',
                column.color,
                'bg-muted/10'
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {column.label}
                </span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  {columnTasks.length}
                </Badge>
              </div>

              {/* Task Cards */}
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1.5">
                  {columnTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      teammates={teammates}
                      allTasks={tasks}
                      onSetStatus={setTaskStatus}
                      onClaim={claimTask}
                      onAssign={assignTask}
                    />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="text-[10px] text-muted-foreground text-center py-4">
                      {t('taskBoard.empty') || 'No tasks'}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t('taskBoard.createTask') || 'Create Task'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t('taskBoard.taskTitle') || 'Title'}
              </label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                {t('taskBoard.taskDescription') || 'Description'}
              </label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detailed task description..."
                className="text-sm min-h-[80px]"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">
                  {t('taskBoard.priority') || 'Priority'}
                </label>
                <Select
                  value={createForm.priority}
                  onValueChange={(v) => setCreateForm(f => ({ ...f, priority: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium mb-1 block">
                  {t('taskBoard.assignTo') || 'Assign To'}
                </label>
                <Select
                  value={createForm.assignedTo}
                  onValueChange={(v) => setCreateForm(f => ({ ...f, assignedTo: v }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto-assign</SelectItem>
                    {teammates
                      .filter(tm => tm.role !== 'lead')
                      .map(tm => (
                        <SelectItem key={tm.id} value={tm.id}>
                          {tm.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateTask}
              disabled={!createForm.title.trim() || !createForm.description.trim()}
            >
              {t('taskBoard.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// TaskCard
// ============================================================================

interface TaskCardProps {
  task: AgentTeamTask;
  teammates: ReturnType<typeof useAgentTeamStore.getState>['teammates'][string][];
  allTasks: AgentTeamTask[];
  onSetStatus: (taskId: string, status: TeamTaskStatus, result?: string, error?: string) => void;
  onClaim: (taskId: string, teammateId: string) => void;
  onAssign: (taskId: string, teammateId: string) => void;
}

function TaskCard({ task, teammates, allTasks, onSetStatus, onClaim: _onClaim, onAssign }: TaskCardProps) {
  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const assignee = task.claimedBy
    ? teammates.find(tm => tm.id === task.claimedBy)
    : task.assignedTo
      ? teammates.find(tm => tm.id === task.assignedTo)
      : undefined;

  const durationStr = task.actualDuration
    ? task.actualDuration < 60000
      ? `${Math.round(task.actualDuration / 1000)}s`
      : `${Math.round(task.actualDuration / 60000)}m`
    : undefined;

  const depNames = task.dependencies
    .map(depId => allTasks.find(t => t.id === depId)?.title)
    .filter(Boolean);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          'w-full rounded-md border p-2 text-left text-xs transition-colors',
          'hover:bg-accent/50 hover:border-accent',
          'bg-card/60'
        )}>
          {/* Title + Priority */}
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="font-medium line-clamp-2 leading-tight">{task.title}</span>
            <Badge
              variant="outline"
              className={cn('text-[9px] px-1 h-4 shrink-0', PRIORITY_COLORS[task.priority])}
            >
              {task.priority}
            </Badge>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
            {assignee && (
              <span className="flex items-center gap-0.5">
                <User className="h-2.5 w-2.5" />
                {assignee.name}
              </span>
            )}
            {durationStr && (
              <span className="flex items-center gap-0.5">
                <Timer className="h-2.5 w-2.5" />
                {durationStr}
              </span>
            )}
            {(task.retryCount ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-orange-500">
                <RotateCcw className="h-2.5 w-2.5" />
                {task.retryCount}
              </span>
            )}
            {depNames.length > 0 && (
              <span className="flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" />
                {depNames.length}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" side="right">
        <div className="space-y-2">
          <div>
            <h4 className="text-sm font-medium">{task.title}</h4>
            <Badge variant="outline" className={cn('text-[10px] mt-1', statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-4">{task.description}</p>

          {/* Dependencies */}
          {depNames.length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground">Dependencies:</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {depNames.map((name, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] h-4">
                    <ArrowRight className="h-2 w-2 mr-0.5" />
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Result */}
          {task.result && (
            <div className="rounded border bg-muted/30 p-2 text-[11px] max-h-32 overflow-y-auto whitespace-pre-wrap">
              {task.result}
            </div>
          )}

          {/* Error */}
          {task.error && (
            <div className="rounded border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
              {task.error}
            </div>
          )}

          {/* Token usage */}
          {task.tokenUsage && (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Zap className="h-3 w-3" />
              {task.tokenUsage.totalTokens.toLocaleString()} tokens
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1 pt-1 border-t">
            {task.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2"
                  onClick={() => onSetStatus(task.id, 'cancelled')}
                >
                  <Ban className="h-2.5 w-2.5 mr-1" />
                  Cancel
                </Button>
                {teammates.filter(tm => tm.role !== 'lead').length > 0 && (
                  <Select onValueChange={(tmId) => onAssign(task.id, tmId)}>
                    <SelectTrigger className="h-6 text-[10px] w-auto px-2">
                      <User className="h-2.5 w-2.5 mr-1" />
                      Assign
                    </SelectTrigger>
                    <SelectContent>
                      {teammates
                        .filter(tm => tm.role !== 'lead')
                        .map(tm => (
                          <SelectItem key={tm.id} value={tm.id} className="text-xs">
                            {tm.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            )}
            {task.status === 'failed' && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                onClick={() => onSetStatus(task.id, 'pending')}
              >
                <RotateCcw className="h-2.5 w-2.5 mr-1" />
                Retry
              </Button>
            )}
            {task.status === 'blocked' && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[10px] px-2"
                onClick={() => onSetStatus(task.id, 'cancelled')}
              >
                <Ban className="h-2.5 w-2.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { AgentTeamTaskBoardProps };
