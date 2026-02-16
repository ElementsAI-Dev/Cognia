import type { StoreApi } from 'zustand';
import { nanoid } from 'nanoid';
import {
  DEFAULT_BACKGROUND_AGENT_CONFIG,
  type BackgroundAgent,
  type BackgroundAgentConfig,
  type BackgroundAgentStatus,
  type BackgroundAgentResult,
  type BackgroundAgentLog,
  type BackgroundAgentStep,
  type BackgroundAgentNotification,
  type CreateBackgroundAgentInput,
  type UpdateBackgroundAgentInput,
} from '@/types/agent/background-agent';
import type { SubAgent } from '@/types/agent/sub-agent';
import { initialState } from '../initial-state';
import type { BackgroundAgentState } from '../types';
type BackgroundAgentStoreSet = StoreApi<BackgroundAgentState>['setState'];
type BackgroundAgentStoreGet = StoreApi<BackgroundAgentState>['getState'];
type BackgroundAgentActions = Omit<BackgroundAgentState, keyof typeof initialState>;
export const createBackgroundAgentActionsSlice = (
  set: BackgroundAgentStoreSet,
  get: BackgroundAgentStoreGet
): BackgroundAgentActions => ({
createAgent: (input: CreateBackgroundAgentInput): BackgroundAgent => {
    const now = new Date();
    const config: BackgroundAgentConfig = {
      ...DEFAULT_BACKGROUND_AGENT_CONFIG,
      ...input.config,
    };

    const agent: BackgroundAgent = {
      id: nanoid(),
      sessionId: input.sessionId,
      name: input.name,
      description: input.description,
      task: input.task,
      status: 'idle',
      progress: 0,
      config,
      executionState: {
        currentStep: 0,
        totalSteps: 0,
        currentPhase: 'planning',
        activeSubAgents: [],
        completedSubAgents: [],
        failedSubAgents: [],
        pendingApprovals: [],
        lastActivity: now,
      },
      subAgents: [],
      steps: [],
      logs: [],
      notifications: [],
      createdAt: now,
      retryCount: 0,
      priority: input.priority ?? 5,
      tags: input.tags,
      metadata: input.metadata,
    };

    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent },
    }));

    return agent;
  },

  updateAgent: (id: string, updates: UpdateBackgroundAgentInput): void => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent) return state;

      const updated: BackgroundAgent = {
        ...agent,
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.task !== undefined && { task: updates.task }),
        ...(updates.config !== undefined && { config: { ...agent.config, ...updates.config } }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.tags !== undefined && { tags: updates.tags }),
        ...(updates.metadata !== undefined && {
          metadata: { ...agent.metadata, ...updates.metadata },
        }),
      };

      return { agents: { ...state.agents, [id]: updated } };
    });
  },

  deleteAgent: (id: string): void => {
    set((state) => {
      const { [id]: _, ...rest } = state.agents;
      return {
        agents: rest,
        queue: {
          ...state.queue,
          items: state.queue.items.filter((item) => item.agentId !== id),
        },
        selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
      };
    });
  },

  setAgentStatus: (id: string, status: BackgroundAgentStatus): void => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent) return state;

      const updates: Partial<BackgroundAgent> = { status };

      if (status === 'queued' && !agent.queuedAt) {
        updates.queuedAt = new Date();
      }
      if (status === 'running' && !agent.startedAt) {
        updates.startedAt = new Date();
      }
      if (['completed', 'failed', 'cancelled', 'timeout'].includes(status)) {
        updates.completedAt = new Date();
      }

      return {
        agents: { ...state.agents, [id]: { ...agent, ...updates } },
      };
    });
  },

  setAgentProgress: (id: string, progress: number): void => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent) return state;

      return {
        agents: {
          ...state.agents,
          [id]: {
            ...agent,
            progress: Math.min(100, Math.max(0, progress)),
            executionState: {
              ...agent.executionState,
              lastActivity: new Date(),
            },
          },
        },
      };
    });
  },

  setAgentResult: (id: string, result: BackgroundAgentResult): void => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent) return state;

      return {
        agents: {
          ...state.agents,
          [id]: {
            ...agent,
            result,
            status: result.success ? 'completed' : 'failed',
            completedAt: new Date(),
            progress: 100,
            error: result.error,
            executionState: {
              ...agent.executionState,
              currentPhase: 'completed',
              lastActivity: new Date(),
            },
          },
        },
      };
    });
  },

  setAgentError: (id: string, error: string): void => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent) return state;

      return {
        agents: {
          ...state.agents,
          [id]: {
            ...agent,
            error,
            status: 'failed',
            completedAt: new Date(),
          },
        },
      };
    });
  },

  queueAgent: (id: string): void => {
    set((state) => {
      const agent = state.agents[id];
      if (!agent || agent.status !== 'idle') return state;

      return {
        agents: {
          ...state.agents,
          [id]: { ...agent, status: 'queued', queuedAt: new Date() },
        },
        queue: {
          ...state.queue,
          items: [
            ...state.queue.items,
            { agentId: id, priority: agent.priority, queuedAt: new Date() },
          ].sort((a, b) => a.priority - b.priority),
        },
      };
    });
  },

  dequeueAgent: (id: string): void => {
    set((state) => ({
      queue: {
        ...state.queue,
        items: state.queue.items.filter((item) => item.agentId !== id),
      },
    }));
  },

  pauseQueue: (): void => {
    set((state) => ({
      queue: { ...state.queue, isPaused: true },
    }));
  },

  resumeQueue: (): void => {
    set((state) => ({
      queue: { ...state.queue, isPaused: false },
    }));
  },

  addStep: (
    agentId: string,
    stepData: Omit<BackgroundAgentStep, 'id' | 'stepNumber'>
  ): BackgroundAgentStep => {
    const agent = get().agents[agentId];
    const step: BackgroundAgentStep = {
      id: nanoid(),
      stepNumber: (agent?.steps.length ?? 0) + 1,
      ...stepData,
    };

    set((state) => {
      const currentAgent = state.agents[agentId];
      if (!currentAgent) return state;

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...currentAgent,
            steps: [...currentAgent.steps, step],
            executionState: {
              ...currentAgent.executionState,
              totalSteps: currentAgent.steps.length + 1,
              lastActivity: new Date(),
            },
          },
        },
      };
    });

    return step;
  },

  updateStep: (agentId: string, stepId: string, updates: Partial<BackgroundAgentStep>): void => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;

      const updatedSteps = agent.steps.map((step) => {
        if (step.id !== stepId) return step;

        const updated = { ...step, ...updates };
        if (updates.status === 'running' && !step.startedAt) {
          updated.startedAt = new Date();
        }
        if ((updates.status === 'completed' || updates.status === 'failed') && !step.completedAt) {
          updated.completedAt = new Date();
          if (step.startedAt) {
            updated.duration = updated.completedAt.getTime() - step.startedAt.getTime();
          }
        }
        return updated;
      });

      const currentStep = updatedSteps.find((s) => s.id === stepId);

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            steps: updatedSteps,
            executionState: {
              ...agent.executionState,
              currentStep: currentStep?.stepNumber ?? agent.executionState.currentStep,
              lastActivity: new Date(),
            },
          },
        },
      };
    });
  },

  addLog: (
    agentId: string,
    level: BackgroundAgentLog['level'],
    message: string,
    source: BackgroundAgentLog['source'],
    data?: unknown
  ): void => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;

      const log: BackgroundAgentLog = {
        id: nanoid(),
        timestamp: new Date(),
        level,
        message,
        source,
        data,
      };

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            logs: [...agent.logs, log],
            executionState: {
              ...agent.executionState,
              lastActivity: new Date(),
            },
          },
        },
      };
    });
  },

  addNotification: (
    agentId: string,
    notificationData: Omit<BackgroundAgentNotification, 'id' | 'timestamp' | 'read'>
  ): void => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;

      const notification: BackgroundAgentNotification = {
        id: nanoid(),
        timestamp: new Date(),
        read: false,
        ...notificationData,
      };

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            notifications: [...agent.notifications, notification],
          },
        },
      };
    });
  },

  markNotificationRead: (agentId: string, notificationId: string): void => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            notifications: agent.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
          },
        },
      };
    });
  },

  markAllNotificationsRead: (agentId?: string): void => {
    set((state) => {
      if (agentId) {
        const agent = state.agents[agentId];
        if (!agent) return state;

        return {
          agents: {
            ...state.agents,
            [agentId]: {
              ...agent,
              notifications: agent.notifications.map((n) => ({ ...n, read: true })),
            },
          },
        };
      }

      const updatedAgents = { ...state.agents };
      Object.keys(updatedAgents).forEach((id) => {
        updatedAgents[id] = {
          ...updatedAgents[id],
          notifications: updatedAgents[id].notifications.map((n) => ({ ...n, read: true })),
        };
      });

      return { agents: updatedAgents };
    });
  },

  addSubAgent: (agentId: string, subAgent: SubAgent): void => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            subAgents: [...agent.subAgents, subAgent],
          },
        },
      };
    });
  },

  updateSubAgent: (agentId: string, subAgentId: string, updates: Partial<SubAgent>): void => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;

      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...agent,
            subAgents: agent.subAgents.map((sa) =>
              sa.id === subAgentId ? { ...sa, ...updates } : sa
            ),
          },
        },
      };
    });
  },

  getAgent: (id: string): BackgroundAgent | undefined => get().agents[id],

  getAgentsBySession: (sessionId: string): BackgroundAgent[] =>
    Object.values(get().agents).filter((a) => a.sessionId === sessionId),

  getAgentsByStatus: (status: BackgroundAgentStatus): BackgroundAgent[] =>
    Object.values(get().agents).filter((a) => a.status === status),

  getRunningAgents: (): BackgroundAgent[] =>
    Object.values(get().agents).filter((a) => a.status === 'running'),

  getUnreadNotificationCount: (): number =>
    Object.values(get().agents)
      .flatMap((a) => a.notifications)
      .filter((n) => !n.read).length,

  cancelAllAgents: (): void => {
    set((state) => {
      const updatedAgents = { ...state.agents };

      Object.values(updatedAgents).forEach((agent) => {
        if (agent.status === 'running' || agent.status === 'queued') {
          updatedAgents[agent.id] = {
            ...agent,
            status: 'cancelled',
            completedAt: new Date(),
          };
        }
      });

      return {
        agents: updatedAgents,
        queue: { ...state.queue, items: [], currentlyRunning: 0 },
      };
    });
  },

  clearCompletedAgents: (): void => {
    set((state) => {
      const updatedAgents = { ...state.agents };

      Object.keys(updatedAgents).forEach((id) => {
        const agent = updatedAgents[id];
        if (['completed', 'failed', 'cancelled'].includes(agent.status)) {
          delete updatedAgents[id];
        }
      });

      return {
        agents: updatedAgents,
        selectedAgentId: updatedAgents[state.selectedAgentId ?? ''] ? state.selectedAgentId : null,
      };
    });
  },

  openPanel: (): void => set({ isPanelOpen: true }),
  closePanel: (): void => set({ isPanelOpen: false }),
  togglePanel: (): void => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  selectAgent: (id: string | null): void => set({ selectedAgentId: id }),

  reset: (): void => set(initialState),
});
