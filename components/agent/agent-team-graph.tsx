'use client';

/**
 * AgentTeamGraph - Interactive graph visualization for agent teams
 *
 * Two view modes:
 * 1. Team Structure: Lead → Teammates hierarchy with status colors,
 *    message flow edges, and task assignment connections
 * 2. Task Dependencies: DAG of tasks with dependency edges,
 *    status colors, and assignee labels
 *
 * Uses @xyflow/react (already installed in project).
 */

import { useMemo, useState, useCallback } from 'react';
import { useTeamTeammates, useTeamTasks, useTeamMessages } from '@/hooks/agent/use-team-data';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTranslations } from 'next-intl';
import {
  Users,
  ListTree,
  Crown,
  User,
  ArrowRight,
  MessageSquare,
  Lock,
  Loader2,
  CheckCircle2,
  XCircle,
  Pause,
  Clock,
  Ban,
  GitBranch,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import {
  TEAMMATE_STATUS_CONFIG,
  TASK_STATUS_CONFIG,
} from '@/types/agent/agent-team';
import type {
  AgentTeam,
  AgentTeammate,
  AgentTeamTask,
  AgentTeamMessage,
} from '@/types/agent/agent-team';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type GraphViewMode = 'team' | 'tasks';

interface AgentTeamGraphProps {
  teamId: string;
  className?: string;
  onTeammateClick?: (teammateId: string) => void;
  onTaskClick?: (taskId: string) => void;
}

interface TeammateNodeData {
  teammate: AgentTeammate;
  isLead: boolean;
  taskCount: number;
  messageCount: number;
  [key: string]: unknown;
}

interface TaskNodeData {
  task: AgentTeamTask;
  assigneeName?: string;
  depCount: number;
  [key: string]: unknown;
}

// ============================================================================
// Layout helpers
// ============================================================================

function layoutTeamNodes(
  team: AgentTeam,
  teammates: AgentTeammate[],
  messages: AgentTeamMessage[],
  tasks: AgentTeamTask[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const lead = teammates.find((tm) => tm.id === team.leadId);
  const workers = teammates.filter((tm) => tm.id !== team.leadId);

  // Position lead at top center
  if (lead) {
    const taskCount = tasks.filter(
      (t) => t.assignedTo === lead.id || t.claimedBy === lead.id
    ).length;
    const messageCount = messages.filter(
      (m) => m.senderId === lead.id || m.recipientId === lead.id
    ).length;

    nodes.push({
      id: lead.id,
      type: 'teammateNode',
      position: { x: 300, y: 40 },
      data: {
        teammate: lead,
        isLead: true,
        taskCount,
        messageCount,
      } satisfies TeammateNodeData,
    });
  }

  // Position workers in a row below the lead
  const workerSpacing = 220;
  const totalWidth = (workers.length - 1) * workerSpacing;
  const startX = 300 - totalWidth / 2;

  workers.forEach((tm, i) => {
    const taskCount = tasks.filter(
      (t) => t.assignedTo === tm.id || t.claimedBy === tm.id
    ).length;
    const messageCount = messages.filter(
      (m) => m.senderId === tm.id || m.recipientId === tm.id
    ).length;

    nodes.push({
      id: tm.id,
      type: 'teammateNode',
      position: { x: startX + i * workerSpacing, y: 220 },
      data: {
        teammate: tm,
        isLead: false,
        taskCount,
        messageCount,
      } satisfies TeammateNodeData,
    });

    // Edge from lead to each worker (delegation)
    if (lead) {
      edges.push({
        id: `lead-${tm.id}`,
        source: lead.id,
        target: tm.id,
        type: 'smoothstep',
        animated: tm.status === 'executing',
        style: {
          stroke: tm.status === 'executing' ? 'var(--primary)' : 'var(--border)',
          strokeWidth: tm.status === 'executing' ? 2 : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: tm.status === 'executing' ? 'var(--primary)' : 'var(--border)',
        },
        label: taskCount > 0 ? `${taskCount} tasks` : undefined,
        labelStyle: { fontSize: 10, fill: 'var(--muted-foreground)' },
      });
    }
  });

  // Message flow edges (teammate ↔ teammate, excluding lead-worker which are already shown)
  const messagePairs = new Map<string, number>();
  messages.forEach((msg) => {
    if (msg.type === 'broadcast' || msg.type === 'system') return;
    if (!msg.recipientId) return;
    const key = [msg.senderId, msg.recipientId].sort().join('-');
    messagePairs.set(key, (messagePairs.get(key) || 0) + 1);
  });

  messagePairs.forEach((count, key) => {
    const [id1, id2] = key.split('-');
    // Skip lead-worker pairs (already connected)
    if (lead && (id1 === lead.id || id2 === lead.id)) return;

    edges.push({
      id: `msg-${key}`,
      source: id1,
      target: id2,
      type: 'smoothstep',
      style: {
        stroke: 'var(--chart-4)',
        strokeWidth: 1,
        strokeDasharray: '4 4',
      },
      label: `${count} msgs`,
      labelStyle: { fontSize: 9, fill: 'var(--chart-4)' },
    });
  });

  return { nodes, edges };
}

function layoutTaskNodes(
  team: AgentTeam,
  tasks: AgentTeamTask[],
  teammates: AgentTeammate[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Topological sort for layout
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  function getLevel(taskId: string): number {
    if (levels.has(taskId)) return levels.get(taskId)!;
    if (visited.has(taskId)) return 0; // cycle protection
    visited.add(taskId);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.dependencies.length === 0) {
      levels.set(taskId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(
      ...task.dependencies.map((depId) => getLevel(depId))
    );
    const level = maxDepLevel + 1;
    levels.set(taskId, level);
    return level;
  }

  tasks.forEach((t) => getLevel(t.id));

  // Group by level
  const levelGroups = new Map<number, AgentTeamTask[]>();
  tasks.forEach((task) => {
    const level = levels.get(task.id) || 0;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(task);
  });

  const levelSpacingX = 280;
  const taskSpacingY = 120;

  levelGroups.forEach((levelTasks, level) => {
    const totalHeight = (levelTasks.length - 1) * taskSpacingY;
    const startY = 150 - totalHeight / 2;

    levelTasks.forEach((task, i) => {
      const assignee = task.claimedBy
        ? teammates.find((tm) => tm.id === task.claimedBy)
        : task.assignedTo
          ? teammates.find((tm) => tm.id === task.assignedTo)
          : undefined;

      nodes.push({
        id: task.id,
        type: 'taskNode',
        position: { x: 60 + level * levelSpacingX, y: startY + i * taskSpacingY },
        data: {
          task,
          assigneeName: assignee?.name,
          depCount: task.dependencies.length,
        } satisfies TaskNodeData,
      });

      // Dependency edges
      task.dependencies.forEach((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        if (!depTask) return;

        const isDepCompleted = depTask.status === 'completed';
        edges.push({
          id: `dep-${depId}-${task.id}`,
          source: depId,
          target: task.id,
          type: 'smoothstep',
          animated: !isDepCompleted,
          style: {
            stroke: isDepCompleted
              ? 'var(--chart-2)'
              : task.status === 'blocked'
                ? 'var(--destructive)'
                : 'var(--border)',
            strokeWidth: isDepCompleted ? 2 : 1,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isDepCompleted
              ? 'var(--chart-2)'
              : task.status === 'blocked'
                ? 'var(--destructive)'
                : 'var(--border)',
          },
        });
      });
    });
  });

  return { nodes, edges };
}

// ============================================================================
// Custom Nodes
// ============================================================================

const STATUS_ICONS: Record<string, React.ElementType> = {
  idle: Clock,
  planning: GitBranch,
  awaiting_approval: Pause,
  executing: Loader2,
  paused: Pause,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: Ban,
  shutdown: Ban,
};

function TeammateNodeComponent({ data }: NodeProps<Node<TeammateNodeData>>) {
  const { teammate, isLead, taskCount, messageCount } = data;
  const statusConfig = TEAMMATE_STATUS_CONFIG[teammate.status];
  const StatusIcon = STATUS_ICONS[teammate.status] || Clock;
  const isActive = teammate.status === 'executing';

  return (
    <div
      className={cn(
        'rounded-xl border-2 bg-card shadow-md px-4 py-3 min-w-[180px] max-w-[200px]',
        'transition-all duration-200',
        isLead && 'border-primary/60 shadow-primary/10',
        isActive && 'border-primary ring-2 ring-primary/20',
        teammate.status === 'completed' && 'border-green-500/50',
        teammate.status === 'failed' && 'border-destructive/50',
        !isLead && !isActive && teammate.status !== 'completed' && teammate.status !== 'failed' && 'border-border',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn(
          'flex items-center justify-center rounded-full p-1',
          isLead ? 'bg-primary/15' : 'bg-muted',
        )}>
          {isLead ? (
            <Crown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{teammate.name}</p>
          {teammate.config.specialization && (
            <p className="text-[10px] text-muted-foreground truncate">
              {teammate.config.specialization}
            </p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <StatusIcon className={cn(
          'h-3 w-3',
          statusConfig.color,
          isActive && 'animate-spin',
        )} />
        <Badge variant="outline" className={cn('text-[9px] h-4 px-1', statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {taskCount > 0 && (
          <span className="flex items-center gap-0.5">
            <ArrowRight className="h-2.5 w-2.5" />
            {taskCount}
          </span>
        )}
        {messageCount > 0 && (
          <span className="flex items-center gap-0.5">
            <MessageSquare className="h-2.5 w-2.5" />
            {messageCount}
          </span>
        )}
        {teammate.tokenUsage.totalTokens > 0 && (
          <span>{(teammate.tokenUsage.totalTokens / 1000).toFixed(1)}K</span>
        )}
      </div>

      {/* Progress bar for active teammates */}
      {isActive && teammate.progress > 0 && (
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${teammate.progress}%` }}
          />
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

const PRIORITY_DOT_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
  background: 'bg-gray-300',
};

function TaskNodeComponent({ data }: NodeProps<Node<TaskNodeData>>) {
  const { task, assigneeName, depCount } = data;
  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const StatusIcon = STATUS_ICONS[task.status] || Clock;
  const isActive = task.status === 'in_progress';

  return (
    <div
      className={cn(
        'rounded-lg border bg-card shadow-sm px-3 py-2.5 min-w-[200px] max-w-[220px]',
        'transition-all duration-200',
        isActive && 'border-primary ring-1 ring-primary/20',
        task.status === 'completed' && 'border-green-500/40',
        task.status === 'failed' && 'border-destructive/40',
        task.status === 'blocked' && 'border-orange-500/40',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-primary !w-2 !h-2" />

      {/* Title + Priority */}
      <div className="flex items-start gap-2 mb-1">
        <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', PRIORITY_DOT_COLORS[task.priority])} />
        <p className="text-xs font-medium line-clamp-2 leading-tight">{task.title}</p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5 mb-1">
        <StatusIcon className={cn(
          'h-3 w-3',
          statusConfig.color,
          isActive && 'animate-spin',
        )} />
        <Badge variant="outline" className={cn('text-[9px] h-4 px-1', statusConfig.color)}>
          {statusConfig.label}
        </Badge>
        {task.priority !== 'normal' && (
          <Badge variant="outline" className="text-[9px] h-4 px-1">
            {task.priority}
          </Badge>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {assigneeName && (
          <span className="flex items-center gap-0.5">
            <User className="h-2.5 w-2.5" />
            {assigneeName}
          </span>
        )}
        {depCount > 0 && (
          <span className="flex items-center gap-0.5">
            <Lock className="h-2.5 w-2.5" />
            {depCount}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

// ============================================================================
// Node Types Registry
// ============================================================================

const nodeTypes = {
  teammateNode: TeammateNodeComponent,
  taskNode: TaskNodeComponent,
};

// ============================================================================
// Main Component
// ============================================================================

function AgentTeamGraphInner({ teamId, className, onTeammateClick, onTaskClick }: AgentTeamGraphProps) {
  const t = useTranslations('agentTeam');
  const [viewMode, setViewMode] = useState<GraphViewMode>('team');

  const team = useAgentTeamStore((s) => s.teams[teamId]);
  const teammates = useTeamTeammates(teamId);
  const tasks = useTeamTasks(teamId);
  const messages = useTeamMessages(teamId);

  const { nodes, edges } = useMemo(() => {
    if (!team) return { nodes: [], edges: [] };

    if (viewMode === 'team') {
      return layoutTeamNodes(team, teammates, messages, tasks);
    }
    return layoutTaskNodes(team, tasks, teammates);
  }, [team, teammates, tasks, messages, viewMode]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (viewMode === 'team' && onTeammateClick) {
        onTeammateClick(node.id);
      } else if (viewMode === 'tasks' && onTaskClick) {
        onTaskClick(node.id);
      }
    },
    [viewMode, onTeammateClick, onTaskClick]
  );

  if (!team) return null;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'team' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() => setViewMode('team')}
              >
                <Users className="h-3 w-3" />
                {t('graph.teamView') || 'Team'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('graph.teamViewTooltip') || 'Team structure & communication'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'tasks' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={() => setViewMode('tasks')}
              >
                <ListTree className="h-3 w-3" />
                {t('graph.taskView') || 'Tasks'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('graph.taskViewTooltip') || 'Task dependency DAG'}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} edges</span>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 min-h-[300px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background bgColor="var(--background)" gap={16} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-card !border !shadow-sm [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground"
          />
          <MiniMap
            className="!bg-card !border !shadow-sm"
            nodeColor={(node) => {
              if (node.type === 'teammateNode') {
                const d = node.data as TeammateNodeData;
                if (d.isLead) return 'var(--primary)';
                if (d.teammate.status === 'executing') return 'var(--chart-1)';
                if (d.teammate.status === 'completed') return 'var(--chart-2)';
                if (d.teammate.status === 'failed') return 'var(--destructive)';
                return 'var(--muted-foreground)';
              }
              if (node.type === 'taskNode') {
                const d = node.data as TaskNodeData;
                if (d.task.status === 'completed') return 'var(--chart-2)';
                if (d.task.status === 'in_progress') return 'var(--chart-1)';
                if (d.task.status === 'failed') return 'var(--destructive)';
                if (d.task.status === 'blocked') return 'var(--chart-3)';
                return 'var(--muted-foreground)';
              }
              return 'var(--muted-foreground)';
            }}
            maskColor="var(--background)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function AgentTeamGraph(props: AgentTeamGraphProps) {
  return (
    <ReactFlowProvider>
      <AgentTeamGraphInner {...props} />
    </ReactFlowProvider>
  );
}

export type { AgentTeamGraphProps, GraphViewMode };
