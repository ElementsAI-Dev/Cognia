import type { StoreApi } from 'zustand';
import { nanoid } from 'nanoid';
import type { ToolExecution } from '@/types/agent/tool';
import type { AgentToolStatus as ToolStatus } from '@/types/agent/tool';
import type {
  AgentPlan,
  PlanStep,
  PlanStepStatus,
  CreatePlanInput,
  UpdatePlanInput,
} from '@/types/agent';
import type { SubAgent, CreateSubAgentInput, UpdateSubAgentInput } from '@/types/agent/sub-agent';
import { DEFAULT_SUB_AGENT_CONFIG } from '@/types/agent/sub-agent';
import { initialState } from '../initial-state';
import type { AgentState } from '../types';
type AgentStoreSet = StoreApi<AgentState>['setState'];
type AgentStoreGet = StoreApi<AgentState>['getState'];
type AgentActions = Omit<AgentState, keyof typeof initialState>;
export const createAgentActionsSlice = (set: AgentStoreSet, get: AgentStoreGet): AgentActions => ({
startAgent: (maxSteps = 5) =>
    set({
      isAgentRunning: true,
      currentStep: 0,
      totalSteps: maxSteps,
      toolExecutions: [],
      currentToolId: null,
    }),

  stopAgent: () =>
    set({
      isAgentRunning: false,
      currentToolId: null,
    }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps),
    })),

  setTotalSteps: (totalSteps) => set({ totalSteps }),

  addToolExecution: (execution) => {
    const fullExecution: ToolExecution = {
      ...execution,
      startedAt: new Date(),
    };

    set((state) => ({
      toolExecutions: [...state.toolExecutions, fullExecution],
      currentToolId: fullExecution.id,
    }));
  },

  updateToolExecution: (id, updates) =>
    set((state) => ({
      toolExecutions: state.toolExecutions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  completeToolExecution: (id, output) => {
    const now = new Date();
    set((state) => ({
      toolExecutions: state.toolExecutions.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          status: 'completed' as ToolStatus,
          output,
          completedAt: now,
          duration: now.getTime() - t.startedAt.getTime(),
        };
      }),
      currentToolId: null,
    }));
  },

  failToolExecution: (id, error) => {
    const now = new Date();
    set((state) => ({
      toolExecutions: state.toolExecutions.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          status: 'error' as ToolStatus,
          error,
          completedAt: now,
          duration: now.getTime() - t.startedAt.getTime(),
        };
      }),
      currentToolId: null,
    }));
  },

  reset: () => set(initialState),

  // Plan management actions
  createPlan: (input: CreatePlanInput) => {
    const now = new Date();
    const planId = nanoid();
    const steps: PlanStep[] = input.steps.map((step, index) => ({
      ...step,
      id: nanoid(),
      status: 'pending' as PlanStepStatus,
      order: index,
    }));

    const plan: AgentPlan = {
      id: planId,
      sessionId: input.sessionId,
      title: input.title,
      description: input.description,
      steps,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      totalSteps: steps.length,
      completedSteps: 0,
    };

    set((state) => ({
      plans: { ...state.plans, [planId]: plan },
      activePlanId: planId,
    }));

    return plan;
  },

  updatePlan: (planId: string, updates: UpdatePlanInput) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            ...updates,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  deletePlan: (planId: string) => {
    set((state) => {
      const { [planId]: _removed, ...rest } = state.plans;
      return {
        plans: rest,
        activePlanId: state.activePlanId === planId ? null : state.activePlanId,
      };
    });
  },

  setActivePlan: (planId: string | null) => {
    set({ activePlanId: planId });
  },

  getPlan: (planId: string) => {
    return get().plans[planId];
  },

  getActivePlan: () => {
    const state = get();
    return state.activePlanId ? state.plans[state.activePlanId] : undefined;
  },

  getPlansForSession: (sessionId: string) => {
    return Object.values(get().plans).filter((p) => p.sessionId === sessionId);
  },

  // Plan step management
  addPlanStep: (planId: string, step: Omit<PlanStep, 'id' | 'status' | 'order'>) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      const newStep: PlanStep = {
        ...step,
        id: nanoid(),
        status: 'pending',
        order: plan.steps.length,
      };

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: [...plan.steps, newStep],
            totalSteps: plan.totalSteps + 1,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  updatePlanStep: (planId: string, stepId: string, updates: Partial<PlanStep>) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: plan.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  deletePlanStep: (planId: string, stepId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      const newSteps = plan.steps
        .filter((s) => s.id !== stepId)
        .map((s, index) => ({ ...s, order: index }));

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: newSteps,
            totalSteps: newSteps.length,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  reorderPlanSteps: (planId: string, stepIds: string[]) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      const stepMap = new Map(plan.steps.map((s) => [s.id, s]));
      const reorderedSteps = stepIds
        .map((id, index) => {
          const step = stepMap.get(id);
          return step ? { ...step, order: index } : null;
        })
        .filter((s): s is PlanStep => s !== null);

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: reorderedSteps,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  startPlanStep: (planId: string, stepId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: plan.steps.map((s) =>
              s.id === stepId
                ? { ...s, status: 'in_progress' as PlanStepStatus, startedAt: new Date() }
                : s
            ),
            currentStepId: stepId,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  completePlanStep: (planId: string, stepId: string, output?: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      const now = new Date();
      const newSteps = plan.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              status: 'completed' as PlanStepStatus,
              completedAt: now,
              actualDuration: s.startedAt
                ? (now.getTime() - s.startedAt.getTime()) / 1000
                : undefined,
              output,
            }
          : s
      );

      const completedCount = newSteps.filter((s) => s.status === 'completed').length;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: newSteps,
            completedSteps: completedCount,
            currentStepId: undefined,
            updatedAt: now,
          },
        },
      };
    });
  },

  failPlanStep: (planId: string, stepId: string, error: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: plan.steps.map((s) =>
              s.id === stepId
                ? {
                    ...s,
                    status: 'failed' as PlanStepStatus,
                    completedAt: new Date(),
                    error,
                  }
                : s
            ),
            status: 'failed',
            currentStepId: undefined,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  skipPlanStep: (planId: string, stepId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            steps: plan.steps.map((s) =>
              s.id === stepId
                ? { ...s, status: 'skipped' as PlanStepStatus, completedAt: new Date() }
                : s
            ),
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  // Plan execution
  approvePlan: (planId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan || plan.status !== 'draft') return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            status: 'approved',
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  startPlanExecution: (planId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan || plan.status !== 'approved') return state;

      const firstStep = plan.steps.find((s) => s.status === 'pending');

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            status: 'executing',
            startedAt: new Date(),
            currentStepId: firstStep?.id,
            updatedAt: new Date(),
          },
        },
        isAgentRunning: true,
        totalSteps: plan.totalSteps,
        currentStep: 0,
      };
    });
  },

  completePlanExecution: (planId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            status: 'completed',
            completedAt: new Date(),
            currentStepId: undefined,
            updatedAt: new Date(),
          },
        },
        isAgentRunning: false,
      };
    });
  },

  cancelPlanExecution: (planId: string) => {
    set((state) => {
      const plan = state.plans[planId];
      if (!plan) return state;

      return {
        plans: {
          ...state.plans,
          [planId]: {
            ...plan,
            status: 'cancelled',
            currentStepId: undefined,
            updatedAt: new Date(),
          },
        },
        isAgentRunning: false,
      };
    });
  },

  // Sub-agent management implementations
  createSubAgent: (input: CreateSubAgentInput) => {
    const id = nanoid();
    const subAgent: SubAgent = {
      id,
      parentAgentId: input.parentAgentId,
      name: input.name,
      description: input.description || '',
      task: input.task,
      status: 'pending',
      config: { ...DEFAULT_SUB_AGENT_CONFIG, ...input.config },
      logs: [],
      progress: 0,
      createdAt: new Date(),
      retryCount: 0,
      order: input.order ?? 0,
      tags: input.tags,
    };

    set((state) => ({
      subAgents: {
        ...state.subAgents,
        [id]: subAgent,
      },
    }));

    return subAgent;
  },

  updateSubAgent: (id: string, updates: UpdateSubAgentInput) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            ...updates,
          },
        },
      };
    });
  },

  deleteSubAgent: (id: string) => {
    set((state) => {
      const { [id]: _deleted, ...remaining } = state.subAgents;
      return {
        subAgents: remaining,
        activeSubAgentIds: state.activeSubAgentIds.filter((aid) => aid !== id),
      };
    });
  },

  startSubAgent: (id: string) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            status: 'running',
            startedAt: new Date(),
            context: {
              parentAgentId: subAgent.parentAgentId,
              sessionId: '', // Will be set by executor
              startTime: new Date(),
              currentStep: 0,
            },
          },
        },
        activeSubAgentIds: [...state.activeSubAgentIds, id],
      };
    });
  },

  completeSubAgent: (id: string, result: SubAgent['result']) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            status: 'completed',
            completedAt: new Date(),
            result,
            progress: 100,
          },
        },
        activeSubAgentIds: state.activeSubAgentIds.filter((aid) => aid !== id),
      };
    });
  },

  failSubAgent: (id: string, error: string) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            status: 'failed',
            completedAt: new Date(),
            error,
          },
        },
        activeSubAgentIds: state.activeSubAgentIds.filter((aid) => aid !== id),
      };
    });
  },

  cancelSubAgent: (id: string) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            status: 'cancelled',
            completedAt: new Date(),
          },
        },
        activeSubAgentIds: state.activeSubAgentIds.filter((aid) => aid !== id),
      };
    });
  },

  getSubAgent: (id: string) => {
    return get().subAgents[id];
  },

  getSubAgentsByParent: (parentAgentId: string) => {
    const { subAgents } = get();
    return Object.values(subAgents)
      .filter((sa) => sa.parentAgentId === parentAgentId)
      .sort((a, b) => a.order - b.order);
  },

  updateSubAgentProgress: (id: string, progress: number) => {
    set((state) => {
      const subAgent = state.subAgents[id];
      if (!subAgent) return state;

      return {
        subAgents: {
          ...state.subAgents,
          [id]: {
            ...subAgent,
            progress: Math.min(100, Math.max(0, progress)),
          },
        },
      };
    });
  },
});
