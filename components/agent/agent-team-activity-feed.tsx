'use client';

/**
 * AgentTeamActivityFeed - Real-time event log for agent teams
 *
 * Features:
 * - Chronological list of all team events
 * - Filterable by event type
 * - Color-coded event icons
 * - Auto-scrolls as new events arrive
 * - Timestamp display
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  Ban,
  Users,
  UserPlus,
  ListPlus,
  FileCheck,
  AlertTriangle,
  Unlock,
  RotateCcw,
  Filter,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import type { AgentTeamEvent } from '@/types/agent/agent-team';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface AgentTeamActivityFeedProps {
  teamId: string;
  className?: string;
  maxHeight?: string;
}

// ============================================================================
// Event Config
// ============================================================================

const EVENT_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; color: string; category: string }
> = {
  team_started: { icon: Play, label: 'Team Started', color: 'text-primary', category: 'team' },
  team_completed: { icon: CheckCircle2, label: 'Team Completed', color: 'text-green-500', category: 'team' },
  team_failed: { icon: XCircle, label: 'Team Failed', color: 'text-destructive', category: 'team' },
  team_cancelled: { icon: Ban, label: 'Team Cancelled', color: 'text-muted-foreground', category: 'team' },
  teammate_started: { icon: UserPlus, label: 'Teammate Started', color: 'text-blue-500', category: 'teammate' },
  teammate_completed: { icon: CheckCircle2, label: 'Teammate Done', color: 'text-green-500', category: 'teammate' },
  teammate_failed: { icon: XCircle, label: 'Teammate Failed', color: 'text-destructive', category: 'teammate' },
  task_created: { icon: ListPlus, label: 'Task Created', color: 'text-indigo-500', category: 'task' },
  task_started: { icon: Play, label: 'Task Started', color: 'text-blue-500', category: 'task' },
  task_completed: { icon: CheckCircle2, label: 'Task Completed', color: 'text-green-500', category: 'task' },
  task_failed: { icon: XCircle, label: 'Task Failed', color: 'text-destructive', category: 'task' },
  task_retried: { icon: RotateCcw, label: 'Task Retried', color: 'text-orange-500', category: 'task' },
  plan_submitted: { icon: FileCheck, label: 'Plan Submitted', color: 'text-purple-500', category: 'plan' },
  plan_approved: { icon: CheckCircle2, label: 'Plan Approved', color: 'text-green-500', category: 'plan' },
  plan_rejected: { icon: XCircle, label: 'Plan Rejected', color: 'text-orange-500', category: 'plan' },
  budget_exceeded: { icon: AlertTriangle, label: 'Budget Exceeded', color: 'text-destructive', category: 'budget' },
  deadlock_resolved: { icon: Unlock, label: 'Deadlock Resolved', color: 'text-yellow-500', category: 'system' },
};

const CATEGORIES = ['team', 'teammate', 'task', 'plan', 'budget', 'system'];

// ============================================================================
// Component
// ============================================================================

export function AgentTeamActivityFeed({
  teamId,
  className,
  maxHeight = '400px',
}: AgentTeamActivityFeedProps) {
  const t = useTranslations('agentTeam');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(CATEGORIES)
  );

  const allEvents = useAgentTeamStore((s) => s.events);
  const allTeammates = useAgentTeamStore((s) => s.teammates);
  const allTasks = useAgentTeamStore((s) => s.tasks);

  const events = useMemo(() => {
    return allEvents
      .filter((e) => e.teamId === teamId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [allEvents, teamId]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const config = EVENT_CONFIG[e.type];
      return config && activeCategories.has(config.category);
    });
  }, [events, activeCategories]);

  // Auto-scroll to bottom on new events
  const prevLength = useRef(filteredEvents.length);
  useEffect(() => {
    if (filteredEvents.length > prevLength.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLength.current = filteredEvents.length;
  }, [filteredEvents.length]);

  const toggleCategory = (category: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {t('activityFeed.title') || 'Activity'}
          </span>
          <Badge variant="outline" className="text-[10px] h-4">
            {filteredEvents.length}
          </Badge>
        </div>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
              <Filter className="h-3 w-3" />
              {t('activityFeed.filter') || 'Filter'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {CATEGORIES.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={activeCategories.has(cat)}
                onCheckedChange={() => toggleCategory(cat)}
                className="text-xs capitalize"
              >
                {cat}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Event List */}
      <ScrollArea style={{ maxHeight }} className="flex-1" ref={scrollRef}>
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-6 w-6 mb-2 opacity-40" />
            <p className="text-xs">
              {t('activityFeed.noEvents') || 'No events yet'}
            </p>
          </div>
        ) : (
          <div className="px-3 py-2">
            {filteredEvents.map((event, idx) => (
              <EventItem
                key={`${event.type}-${new Date(event.timestamp).getTime()}-${idx}`}
                event={event}
                teammates={allTeammates}
                tasks={allTasks}
                isLast={idx === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// EventItem
// ============================================================================

function EventItem({
  event,
  teammates,
  tasks,
  isLast,
}: {
  event: AgentTeamEvent;
  teammates: Record<string, { name: string }>;
  tasks: Record<string, { title: string }>;
  isLast: boolean;
}) {
  const config = EVENT_CONFIG[event.type] || {
    icon: Zap,
    label: event.type,
    color: 'text-muted-foreground',
    category: 'system',
  };
  const Icon = config.icon;
  const time = new Date(event.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

  const teammateName = event.teammateId
    ? teammates[event.teammateId]?.name
    : undefined;
  const taskTitle = event.taskId ? tasks[event.taskId]?.title : undefined;

  return (
    <div className="flex gap-2.5">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center rounded-full p-1',
            'bg-muted',
          )}
        >
          <Icon className={cn('h-3 w-3', config.color)} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border min-h-[16px]" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{config.label}</span>
          <span className="text-[10px] text-muted-foreground">{timeStr}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {teammateName && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {teammateName}
            </Badge>
          )}
          {taskTitle && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 truncate max-w-[150px]">
              {taskTitle}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export type { AgentTeamActivityFeedProps };
