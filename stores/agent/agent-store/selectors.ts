import type { AgentState } from './types';

// Selectors
export const selectIsAgentRunning = (state: AgentState) => state.isAgentRunning;
export const selectCurrentStep = (state: AgentState) => state.currentStep;
export const selectToolExecutions = (state: AgentState) => state.toolExecutions;
export const selectCurrentToolId = (state: AgentState) => state.currentToolId;

// Derived selector for progress percentage
export const selectAgentProgress = (state: AgentState) => {
  if (state.totalSteps === 0) return 0;
  return Math.round((state.currentStep / state.totalSteps) * 100);
};

