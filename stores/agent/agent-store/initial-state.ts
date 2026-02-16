import type { ToolExecution } from '@/types/agent/tool';
import type { AgentPlan } from '@/types/agent';
import type { SubAgent } from '@/types/agent/sub-agent';
export const initialState = {
  isAgentRunning: false,
  currentStep: 0,
  totalSteps: 5,
  toolExecutions: [] as ToolExecution[],
  currentToolId: null as string | null,
  plans: {} as Record<string, AgentPlan>,
  activePlanId: null as string | null,
  subAgents: {} as Record<string, SubAgent>,
  activeSubAgentIds: [] as string[],
};
