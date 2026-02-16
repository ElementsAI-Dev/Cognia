import type { AgentTeamState } from './types';
import type { AgentTeammate, AgentTeamTask } from '@/types/agent/agent-team';

// Selectors
// ============================================================================

export const selectTeams = (state: AgentTeamState) => state.teams;
export const selectTeammates = (state: AgentTeamState) => state.teammates;
export const selectTasks = (state: AgentTeamState) => state.tasks;
export const selectMessages = (state: AgentTeamState) => state.messages;
export const selectActiveTeamId = (state: AgentTeamState) => state.activeTeamId;
export const selectSelectedTeammateId = (state: AgentTeamState) => state.selectedTeammateId;
export const selectDisplayMode = (state: AgentTeamState) => state.displayMode;
export const selectIsPanelOpen = (state: AgentTeamState) => state.isPanelOpen;
export const selectTemplates = (state: AgentTeamState) => state.templates;
export const selectDefaultConfig = (state: AgentTeamState) => state.defaultConfig;

// Derived selectors
export const selectTeamCount = (state: AgentTeamState) => Object.keys(state.teams).length;
export const selectActiveTeam = (state: AgentTeamState) =>
  state.activeTeamId ? state.teams[state.activeTeamId] : undefined;
export const selectActiveTeammates = (state: AgentTeamState) => {
  const team = state.activeTeamId ? state.teams[state.activeTeamId] : undefined;
  if (!team) return [];
  return team.teammateIds
    .map(id => state.teammates[id])
    .filter((tm): tm is AgentTeammate => tm !== undefined);
};
export const selectActiveTeamTasks = (state: AgentTeamState) => {
  const team = state.activeTeamId ? state.teams[state.activeTeamId] : undefined;
  if (!team) return [];
  return team.taskIds
    .map(id => state.tasks[id])
    .filter((t): t is AgentTeamTask => t !== undefined)
    .sort((a, b) => a.order - b.order);
};

