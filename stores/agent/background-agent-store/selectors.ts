import type { BackgroundAgentState } from './types';

// Selectors
export const selectAgents = (state: BackgroundAgentState) => state.agents;
export const selectQueue = (state: BackgroundAgentState) => state.queue;
export const selectIsPanelOpen = (state: BackgroundAgentState) => state.isPanelOpen;
export const selectSelectedAgentId = (state: BackgroundAgentState) => state.selectedAgentId;

