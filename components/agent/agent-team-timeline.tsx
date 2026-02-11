'use client';

/**
 * AgentTeamTimeline - Execution timeline visualization for agent teams
 *
 * Features:
 * - Gantt-style horizontal bars per teammate showing activity periods
 * - Event markers (task created, completed, failed, messages)
 * - Color-coded by status
 * - Auto-updates during execution
 * - Zoomable time axis
 */

import { useMemo, useState, useEffect } from 'react';
import { useTeamTeammates, useTeamTasks, useTeamMessages } from '@/hooks/agent/use-team-data';
import { useTranslations } from 'next-intl';
import {
  Clock,
  Crown,
  User,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { TEAMMATE_STATUS_CONFIG } from '@/types/agent/agent-team';
import type {
  AgentTeammate,
  AgentTeamTask,
  AgentTeamMessage,
  AgentTeamEvent,
} from '@/types/agent/agent-team';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AgentTeamTimelineProps {
  teamId: string;
  className?: string;
}

interface TimelineRow {
  teammate: AgentTeammate;
  isLead: boolean;
  tasks: AgentTeamTask[];
  events: AgentTeamEvent[];
  messages: AgentTeamMessage[];
}

// ============================================================================
// Helpers
// ============================================================================

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

// ============================================================================
// Component
// ============================================================================

export function AgentTeamTimeline({ teamId, className }: AgentTeamTimelineProps) {
  const t = useTranslations('agentTeam');

  const team = useAgentTeamStore((s) => s.teams[teamId]);
  const allEvents = useAgentTeamStore((s) => s.events);
  const teammates = useTeamTeammates(teamId);
  const tasks = useTeamTasks(teamId);
  const messages = useTeamMessages(teamId);

  // Tick state for live-updating timelines during execution
  const [tick, setTick] = useState(0);
  const isRunning = team?.status === 'executing' || team?.status === 'planning';

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  const timelineData = useMemo(() => {
    // tick is referenced to trigger re-computation during execution
    void tick;
    if (!team) return { rows: [], timeRange: { start: 0, end: 0, duration: 0 } };

    const teamEvents = allEvents.filter(
      (e) => e.teamId === teamId
    );

    // Calculate time range
    const teamStart = team.startedAt
      ? new Date(team.startedAt).getTime()
      : team.createdAt
        ? new Date(team.createdAt).getTime()
        : 0;

    const startTime = teamStart || new Date(team.createdAt).getTime();

    const endTime = team.completedAt
      ? new Date(team.completedAt).getTime()
      : team.startedAt
        ? new Date(team.startedAt).getTime() + (team.totalDuration || 60000)
        : startTime + 60000;

    const duration = Math.max(endTime - startTime, 1000); // Min 1 second

    // Build rows per teammate
    const rows: TimelineRow[] = teammates.map((tm) => ({
      teammate: tm,
      isLead: tm.id === team.leadId,
      tasks: tasks.filter(
        (task) => task.claimedBy === tm.id || task.assignedTo === tm.id
      ),
      events: teamEvents.filter((e) => e.teammateId === tm.id),
      messages: messages.filter(
        (m) => m.senderId === tm.id || m.recipientId === tm.id
      ),
    }));

    // Sort: lead first, then by creation time
    rows.sort((a, b) => {
      if (a.isLead && !b.isLead) return -1;
      if (!a.isLead && b.isLead) return 1;
      return (
        new Date(a.teammate.createdAt).getTime() -
        new Date(b.teammate.createdAt).getTime()
      );
    });

    return {
      rows,
      timeRange: { start: startTime, end: endTime, duration },
    };
  }, [team, teammates, tasks, messages, allEvents, teamId, tick]);

  if (!team) return null;

  const { rows, timeRange } = timelineData;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t('timeline.title') || 'Execution Timeline'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {team.startedAt && (
            <span>{formatTime(team.startedAt)}</span>
          )}
          {team.totalDuration && (
            <Badge variant="outline" className="text-[9px] h-4">
              {formatDuration(team.totalDuration)}
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="min-w-[400px]">
          {/* Time axis */}
          <div className="flex items-center h-6 border-b px-3 text-[9px] text-muted-foreground">
            <div className="w-[140px] shrink-0" />
            <div className="flex-1 flex justify-between">
              {[0, 25, 50, 75, 100].map((pct) => (
                <span key={pct}>
                  {formatDuration((timeRange.duration * pct) / 100)}
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          {rows.map((row) => (
            <TimelineRowComponent
              key={row.teammate.id}
              row={row}
              timeRange={timeRange}
            />
          ))}

          {/* Legend */}
          <div className="flex items-center gap-3 px-3 py-2 border-t text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="h-2 w-6 rounded bg-primary/60" />
              Executing
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-6 rounded bg-green-500/60" />
              Completed
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-6 rounded bg-destructive/60" />
              Failed
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-6 rounded bg-yellow-500/60" />
              Planning
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// TimelineRow
// ============================================================================

function TimelineRowComponent({
  row,
  timeRange,
}: {
  row: TimelineRow;
  timeRange: { start: number; end: number; duration: number };
}) {
  const { teammate, isLead, tasks } = row;
  const statusConfig = TEAMMATE_STATUS_CONFIG[teammate.status];

  return (
    <div className="flex items-center h-14 border-b hover:bg-muted/30 transition-colors">
      {/* Label */}
      <div className="w-[140px] shrink-0 px-3 flex items-center gap-2">
        <div className={cn(
          'flex items-center justify-center rounded-full p-0.5',
          isLead ? 'bg-primary/15' : 'bg-muted',
        )}>
          {isLead ? (
            <Crown className="h-3 w-3 text-primary" />
          ) : (
            <User className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium truncate">{teammate.name}</p>
          <Badge variant="outline" className={cn('text-[8px] h-3 px-0.5', statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Timeline bar area */}
      <div className="flex-1 relative h-full py-1.5 pr-3">
        <div className="relative h-full bg-muted/20 rounded overflow-hidden">
          {/* Task bars */}
          {tasks.map((task) => (
            <TaskBar
              key={task.id}
              task={task}
              timeRange={timeRange}
            />
          ))}

          {/* Message markers */}
          {row.messages.slice(0, 20).map((msg) => (
            <MessageMarker
              key={msg.id}
              message={msg}
              timeRange={timeRange}
              isSender={msg.senderId === teammate.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TaskBar
// ============================================================================

function TaskBar({
  task,
  timeRange,
}: {
  task: AgentTeamTask;
  timeRange: { start: number; end: number; duration: number };
}) {
  const startTime = task.startedAt
    ? new Date(task.startedAt).getTime()
    : task.createdAt
      ? new Date(task.createdAt).getTime()
      : timeRange.start;

  const endTime = task.completedAt
    ? new Date(task.completedAt).getTime()
    : task.status === 'in_progress'
      ? timeRange.end
      : startTime + 1000;

  const leftPct = Math.max(0, ((startTime - timeRange.start) / timeRange.duration) * 100);
  const widthPct = Math.max(1, ((endTime - startTime) / timeRange.duration) * 100);

  const bgColor =
    task.status === 'completed'
      ? 'bg-green-500/60'
      : task.status === 'failed'
        ? 'bg-destructive/60'
        : task.status === 'in_progress'
          ? 'bg-primary/60'
          : task.status === 'blocked'
            ? 'bg-orange-500/40'
            : 'bg-muted-foreground/30';

  const duration = task.actualDuration || (endTime - startTime);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 h-5 rounded-sm cursor-pointer',
            'transition-all hover:brightness-110',
            bgColor,
            task.status === 'in_progress' && 'animate-pulse',
          )}
          style={{
            left: `${leftPct}%`,
            width: `${Math.min(widthPct, 100 - leftPct)}%`,
            minWidth: '4px',
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-white truncate px-1">
            {task.title}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[200px]">
        <p className="font-medium">{task.title}</p>
        <p className="text-muted-foreground">{task.status} • {formatDuration(duration)}</p>
        {task.error && <p className="text-destructive">{task.error}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// MessageMarker
// ============================================================================

function MessageMarker({
  message,
  timeRange,
  isSender,
}: {
  message: AgentTeamMessage;
  timeRange: { start: number; end: number; duration: number };
  isSender: boolean;
}) {
  const msgTime = new Date(message.timestamp).getTime();
  const leftPct = Math.max(0, ((msgTime - timeRange.start) / timeRange.duration) * 100);

  if (leftPct > 100) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'absolute top-0 w-1 h-full cursor-pointer',
            isSender ? 'bg-chart-4/50' : 'bg-chart-5/50',
          )}
          style={{ left: `${leftPct}%` }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px] max-w-[180px]">
        <p className="font-medium flex items-center gap-1">
          <MessageSquare className="h-2.5 w-2.5" />
          {message.senderName}
          {message.recipientName && ` → ${message.recipientName}`}
        </p>
        <p className="text-muted-foreground line-clamp-2">{message.content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export type { AgentTeamTimelineProps };
