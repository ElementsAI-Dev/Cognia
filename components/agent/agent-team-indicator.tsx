'use client';

/**
 * AgentTeamIndicator - Compact indicator showing active agent teams
 *
 * Designed for sidebar/header placement. Shows:
 * - Number of active teams
 * - Overall progress
 * - Click to open team panel
 */

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { TEAM_STATUS_CONFIG } from '@/types/agent/agent-team';

export interface AgentTeamIndicatorProps {
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function AgentTeamIndicator({
  onClick,
  className,
  compact = false,
}: AgentTeamIndicatorProps) {
  const teams = useAgentTeamStore((s) => s.teams);
  const teammates = useAgentTeamStore((s) => s.teammates);

  const teamList = useMemo(() => Object.values(teams), [teams]);

  const activeTeams = useMemo(
    () => teamList.filter((t) => t.status === 'executing' || t.status === 'planning' || t.status === 'paused'),
    [teamList]
  );

  const overallProgress = useMemo(() => {
    if (activeTeams.length === 0) return 0;
    let totalProgress = 0;
    let totalTeammates = 0;
    for (const team of activeTeams) {
      for (const tmId of team.teammateIds) {
        const tm = teammates[tmId];
        if (tm) {
          totalProgress += tm.progress;
          totalTeammates++;
        }
      }
    }
    return totalTeammates > 0 ? Math.round(totalProgress / totalTeammates) : 0;
  }, [activeTeams, teammates]);

  // Don't render if no active teams
  if (activeTeams.length === 0) return null;

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('relative h-8 w-8', className)}
            onClick={onClick}
          >
            <Users className="h-4 w-4" />
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 text-[9px] animate-pulse"
            >
              {activeTeams.length}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="space-y-1">
            <p className="font-medium text-xs">
              {activeTeams.length} active team{activeTeams.length !== 1 ? 's' : ''}
            </p>
            {activeTeams.map((team) => (
              <p key={team.id} className="text-[10px] text-muted-foreground">
                {team.name} — {TEAM_STATUS_CONFIG[team.status].label}
              </p>
            ))}
            {overallProgress > 0 && (
              <p className="text-[10px]">Progress: {overallProgress}%</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('gap-2 h-8', className)}
      onClick={onClick}
    >
      <Users className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">
        {activeTeams.length} Team{activeTeams.length !== 1 ? 's' : ''}
      </span>
      {overallProgress > 0 && (
        <div className="w-16">
          <Progress value={overallProgress} className="h-1" />
        </div>
      )}
      <Badge variant="secondary" className="text-[9px] h-4 px-1">
        {overallProgress}%
      </Badge>
    </Button>
  );
}
