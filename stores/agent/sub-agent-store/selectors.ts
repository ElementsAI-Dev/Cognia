import type { SubAgentState } from './types';

// Selectors
export const selectSubAgents = (state: SubAgentState) => state.subAgents;
export const selectGroups = (state: SubAgentState) => state.groups;
export const selectActiveParentId = (state: SubAgentState) => state.activeParentId;

// Derived selectors
export const selectSubAgentCount = (state: SubAgentState) => Object.keys(state.subAgents).length;
export const selectActiveSubAgentCount = (state: SubAgentState) =>
  Object.values(state.subAgents).filter((sa) => sa.status === 'running' || sa.status === 'queued')
    .length;
export const selectCompletedSubAgentCount = (state: SubAgentState) =>
  Object.values(state.subAgents).filter((sa) => sa.status === 'completed').length;

