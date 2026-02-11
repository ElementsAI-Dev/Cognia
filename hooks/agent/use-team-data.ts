/**
 * Shared hooks for resolving agent team data from ID arrays.
 *
 * Eliminates the duplicated pattern:
 *   team.taskIds.map(id => allTasks[id]).filter(Boolean)
 * found in 7+ agent-team components.
 */

import { useMemo } from 'react';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import type { AgentTeammate, AgentTeamTask, AgentTeamMessage } from '@/types/agent/agent-team';

/**
 * Resolves a team's teammate IDs into full AgentTeammate objects.
 */
export function useTeamTeammates(teamId: string | null | undefined): AgentTeammate[] {
  const team = useAgentTeamStore((s) => (teamId ? s.teams[teamId] : undefined));
  const allTeammates = useAgentTeamStore((s) => s.teammates);

  return useMemo(() => {
    if (!team) return [];
    return team.teammateIds
      .map((id) => allTeammates[id])
      .filter(Boolean);
  }, [team, allTeammates]);
}

/**
 * Resolves a team's task IDs into full AgentTeamTask objects.
 * Optionally sorted by order.
 */
export function useTeamTasks(teamId: string | null | undefined, sorted = false): AgentTeamTask[] {
  const team = useAgentTeamStore((s) => (teamId ? s.teams[teamId] : undefined));
  const allTasks = useAgentTeamStore((s) => s.tasks);

  return useMemo(() => {
    if (!team) return [];
    const resolved = team.taskIds
      .map((id) => allTasks[id])
      .filter(Boolean);
    return sorted ? resolved.sort((a, b) => a.order - b.order) : resolved;
  }, [team, allTasks, sorted]);
}

/**
 * Resolves a team's message IDs into full AgentTeamMessage objects.
 */
export function useTeamMessages(teamId: string | null | undefined): AgentTeamMessage[] {
  const team = useAgentTeamStore((s) => (teamId ? s.teams[teamId] : undefined));
  const allMessages = useAgentTeamStore((s) => s.messages);

  return useMemo(() => {
    if (!team) return [];
    return team.messageIds
      .map((id) => allMessages[id])
      .filter(Boolean);
  }, [team, allMessages]);
}

export type { AgentTeammate, AgentTeamTask, AgentTeamMessage };
