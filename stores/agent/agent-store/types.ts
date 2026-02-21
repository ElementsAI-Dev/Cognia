import type { ToolExecution } from '@/types/agent/tool';
import type {
  AgentPlan,
  PlanStep,
  CreatePlanInput,
  UpdatePlanInput,
} from '@/types/agent';
import type { SubAgent, CreateSubAgentInput, UpdateSubAgentInput } from '@/types/agent/sub-agent';
export interface AgentState {
  // Agent running state
  isAgentRunning: boolean;
  currentStep: number;
  totalSteps: number;

  // Tool executions
  toolExecutions: ToolExecution[];
  currentToolId: string | null;

  // Plan management
  plans: Record<string, AgentPlan>;
  activePlanId: string | null;

  // Sub-agent management
  subAgents: Record<string, SubAgent>;
  activeSubAgentIds: string[];

  // Actions
  startAgent: (maxSteps?: number) => void;
  stopAgent: () => void;
  nextStep: () => void;
  setTotalSteps: (steps: number) => void;

  // Tool execution management
  addToolExecution: (execution: Omit<ToolExecution, 'startedAt'>) => void;
  updateToolExecution: (id: string, updates: Partial<ToolExecution>) => void;
  completeToolExecution: (id: string, output: unknown) => void;
  failToolExecution: (id: string, error: string) => void;

  // Plan management actions
  createPlan: (input: CreatePlanInput) => AgentPlan;
  updatePlan: (planId: string, updates: UpdatePlanInput) => void;
  deletePlan: (planId: string) => void;
  setActivePlan: (planId: string | null) => void;
  getPlan: (planId: string) => AgentPlan | undefined;
  getActivePlan: () => AgentPlan | undefined;
  getPlansForSession: (sessionId: string) => AgentPlan[];

  // Plan step management
  addPlanStep: (planId: string, step: Omit<PlanStep, 'id' | 'status' | 'order'>) => void;
  updatePlanStep: (planId: string, stepId: string, updates: Partial<PlanStep>) => void;
  deletePlanStep: (planId: string, stepId: string) => void;
  reorderPlanSteps: (planId: string, stepIds: string[]) => void;
  startPlanStep: (planId: string, stepId: string) => void;
  completePlanStep: (planId: string, stepId: string, output?: string) => void;
  failPlanStep: (planId: string, stepId: string, error: string) => void;
  skipPlanStep: (planId: string, stepId: string) => void;

  // Plan execution
  approvePlan: (planId: string) => void;
  startPlanExecution: (planId: string) => void;
  completePlanExecution: (planId: string) => void;
  cancelPlanExecution: (planId: string) => void;

  // Sub-agent management
  createSubAgent: (input: CreateSubAgentInput) => SubAgent;
  updateSubAgent: (id: string, updates: UpdateSubAgentInput) => void;
  deleteSubAgent: (id: string) => void;
  startSubAgent: (id: string) => void;
  completeSubAgent: (id: string, result: SubAgent['result']) => void;
  failSubAgent: (id: string, error: string) => void;
  cancelSubAgent: (id: string) => void;
  getSubAgent: (id: string) => SubAgent | undefined;
  getSubAgentsByParent: (parentAgentId: string) => SubAgent[];
  updateSubAgentProgress: (id: string, progress: number) => void;

  // Reset
  reset: () => void;
}
