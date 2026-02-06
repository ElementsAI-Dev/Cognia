/**
 * AgentTeam Store - Manages agent team state
 *
 * Follows the same patterns as sub-agent-store.ts and external-agent-store.ts:
 * - Zustand with persist middleware
 * - localStorage persistence for templates/settings
 * - Selectors for optimized subscriptions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  DEFAULT_TEAM_CONFIG,
  BUILT_IN_TEAM_TEMPLATES,
  type AgentTeam,
  type AgentTeammate,
  type AgentTeamTask,
  type AgentTeamMessage,
  type AgentTeamConfig,
  type AgentTeamTemplate,
  type AgentTeamEvent,
  type TeamStatus,
  type TeammateStatus,
  type TeamTaskStatus,
  type TeamDisplayMode,
  type CreateTeamInput,
  type AddTeammateInput,
  type CreateTaskInput,
  type SendMessageInput,
} from '@/types/agent/agent-team';

// ============================================================================
// State Interface
// ============================================================================

interface AgentTeamState {
  // Data
  teams: Record<string, AgentTeam>;
  teammates: Record<string, AgentTeammate>;
  tasks: Record<string, AgentTeamTask>;
  messages: Record<string, AgentTeamMessage>;
  templates: Record<string, AgentTeamTemplate>;
  events: AgentTeamEvent[];

  // UI State
  activeTeamId: string | null;
  selectedTeammateId: string | null;
  displayMode: TeamDisplayMode;
  isPanelOpen: boolean;

  // Settings
  defaultConfig: AgentTeamConfig;

  // Team CRUD
  createTeam: (input: CreateTeamInput) => AgentTeam;
  updateTeam: (teamId: string, updates: Partial<AgentTeam>) => void;
  deleteTeam: (teamId: string) => void;
  setTeamStatus: (teamId: string, status: TeamStatus) => void;

  // Teammate CRUD
  addTeammate: (input: AddTeammateInput) => AgentTeammate;
  updateTeammate: (teammateId: string, updates: Partial<AgentTeammate>) => void;
  removeTeammate: (teammateId: string) => void;
  setTeammateStatus: (teammateId: string, status: TeammateStatus) => void;
  setTeammateProgress: (teammateId: string, progress: number) => void;

  // Task CRUD
  createTask: (input: CreateTaskInput) => AgentTeamTask;
  updateTask: (taskId: string, updates: Partial<AgentTeamTask>) => void;
  deleteTask: (taskId: string) => void;
  setTaskStatus: (taskId: string, status: TeamTaskStatus, result?: string, error?: string) => void;
  claimTask: (taskId: string, teammateId: string) => void;
  assignTask: (taskId: string, teammateId: string) => void;

  // Messages
  addMessage: (input: SendMessageInput) => AgentTeamMessage;
  markMessageRead: (messageId: string) => void;
  markAllMessagesRead: (teammateId: string) => void;

  // Events
  addEvent: (event: AgentTeamEvent) => void;
  clearEvents: (teamId?: string) => void;

  // Templates
  addTemplate: (template: AgentTeamTemplate) => void;
  deleteTemplate: (templateId: string) => void;

  // UI State
  setActiveTeam: (teamId: string | null) => void;
  setSelectedTeammate: (teammateId: string | null) => void;
  setDisplayMode: (mode: TeamDisplayMode) => void;
  setIsPanelOpen: (open: boolean) => void;

  // Selectors
  getTeam: (teamId: string) => AgentTeam | undefined;
  getTeammate: (teammateId: string) => AgentTeammate | undefined;
  getTeammates: (teamId: string) => AgentTeammate[];
  getTeamTasks: (teamId: string) => AgentTeamTask[];
  getTeamMessages: (teamId: string) => AgentTeamMessage[];
  getUnreadMessages: (teammateId: string) => AgentTeamMessage[];
  getActiveTeam: () => AgentTeam | undefined;

  // Batch operations
  cancelAllTasks: (teamId: string) => void;
  shutdownAllTeammates: (teamId: string) => void;
  cleanupTeam: (teamId: string) => void;

  // Settings
  updateDefaultConfig: (config: Partial<AgentTeamConfig>) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const builtInTemplatesMap = BUILT_IN_TEAM_TEMPLATES.reduce(
  (acc: Record<string, AgentTeamTemplate>, template: AgentTeamTemplate) => ({
    ...acc,
    [template.id]: template,
  }),
  {} as Record<string, AgentTeamTemplate>
);

const initialState = {
  teams: {} as Record<string, AgentTeam>,
  teammates: {} as Record<string, AgentTeammate>,
  tasks: {} as Record<string, AgentTeamTask>,
  messages: {} as Record<string, AgentTeamMessage>,
  templates: builtInTemplatesMap,
  events: [] as AgentTeamEvent[],
  activeTeamId: null as string | null,
  selectedTeammateId: null as string | null,
  displayMode: 'expanded' as TeamDisplayMode,
  isPanelOpen: false,
  defaultConfig: { ...DEFAULT_TEAM_CONFIG },
};

// ============================================================================
// Store
// ============================================================================

export const useAgentTeamStore = create<AgentTeamState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ====================================================================
      // Team CRUD
      // ====================================================================

      createTeam: (input) => {
        const config: AgentTeamConfig = {
          ...get().defaultConfig,
          ...input.config,
        };

        const teamId = nanoid();

        // Create lead
        const lead: AgentTeammate = {
          id: nanoid(),
          teamId,
          name: 'Team Lead',
          description: 'Coordinates team work, assigns tasks, and synthesizes results',
          role: 'lead',
          status: 'idle',
          config: {},
          completedTaskIds: [],
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          progress: 0,
          createdAt: new Date(),
        };

        const team: AgentTeam = {
          id: teamId,
          name: input.name,
          description: input.description || '',
          task: input.task,
          status: 'idle',
          config,
          leadId: lead.id,
          teammateIds: [lead.id],
          taskIds: [],
          messageIds: [],
          progress: 0,
          totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          createdAt: new Date(),
          sessionId: input.sessionId,
          metadata: input.metadata,
        };

        set((state) => ({
          teams: { ...state.teams, [teamId]: team },
          teammates: { ...state.teammates, [lead.id]: lead },
          activeTeamId: teamId,
        }));

        return team;
      },

      updateTeam: (teamId, updates) => {
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;
          return {
            teams: { ...state.teams, [teamId]: { ...team, ...updates } },
          };
        });
      },

      deleteTeam: (teamId) => {
        const team = get().teams[teamId];
        if (!team) return;
        get().cleanupTeam(teamId);
      },

      setTeamStatus: (teamId, status) => {
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;
          const updates: Partial<AgentTeam> = { status };
          if (status === 'executing' && !team.startedAt) updates.startedAt = new Date();
          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            updates.completedAt = new Date();
            if (team.startedAt) {
              updates.totalDuration = updates.completedAt.getTime() - team.startedAt.getTime();
            }
          }
          return {
            teams: { ...state.teams, [teamId]: { ...team, ...updates } },
          };
        });
      },

      // ====================================================================
      // Teammate CRUD
      // ====================================================================

      addTeammate: (input) => {
        const team = get().teams[input.teamId];
        if (!team) throw new Error(`Team not found: ${input.teamId}`);

        const teammate: AgentTeammate = {
          id: nanoid(),
          teamId: input.teamId,
          name: input.name,
          description: input.description || '',
          role: input.role || 'teammate',
          status: 'idle',
          config: input.config || {},
          spawnPrompt: input.spawnPrompt,
          completedTaskIds: [],
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          progress: 0,
          createdAt: new Date(),
        };

        set((state) => ({
          teammates: { ...state.teammates, [teammate.id]: teammate },
          teams: {
            ...state.teams,
            [input.teamId]: {
              ...team,
              teammateIds: [...team.teammateIds, teammate.id],
            },
          },
        }));

        return teammate;
      },

      updateTeammate: (teammateId, updates) => {
        set((state) => {
          const teammate = state.teammates[teammateId];
          if (!teammate) return state;
          return {
            teammates: { ...state.teammates, [teammateId]: { ...teammate, ...updates } },
          };
        });
      },

      removeTeammate: (teammateId) => {
        const teammate = get().teammates[teammateId];
        if (!teammate || teammate.role === 'lead') return;

        set((state) => {
          const { [teammateId]: _, ...restTeammates } = state.teammates;
          const team = state.teams[teammate.teamId];
          if (!team) return { teammates: restTeammates };

          return {
            teammates: restTeammates,
            teams: {
              ...state.teams,
              [teammate.teamId]: {
                ...team,
                teammateIds: team.teammateIds.filter(id => id !== teammateId),
              },
            },
          };
        });
      },

      setTeammateStatus: (teammateId, status) => {
        set((state) => {
          const teammate = state.teammates[teammateId];
          if (!teammate) return state;
          return {
            teammates: {
              ...state.teammates,
              [teammateId]: { ...teammate, status, lastActiveAt: new Date() },
            },
          };
        });
      },

      setTeammateProgress: (teammateId, progress) => {
        set((state) => {
          const teammate = state.teammates[teammateId];
          if (!teammate) return state;
          return {
            teammates: {
              ...state.teammates,
              [teammateId]: { ...teammate, progress: Math.min(100, Math.max(0, progress)) },
            },
          };
        });
      },

      // ====================================================================
      // Task CRUD
      // ====================================================================

      createTask: (input) => {
        const task: AgentTeamTask = {
          id: nanoid(),
          teamId: input.teamId,
          title: input.title,
          description: input.description,
          status: 'pending',
          priority: input.priority || 'normal',
          assignedTo: input.assignedTo,
          dependencies: input.dependencies || [],
          tags: input.tags || [],
          expectedOutput: input.expectedOutput,
          createdAt: new Date(),
          estimatedDuration: input.estimatedDuration,
          order: input.order ?? Object.values(get().tasks).filter(t => t.teamId === input.teamId).length,
          metadata: input.metadata,
        };

        set((state) => {
          const team = state.teams[input.teamId];
          return {
            tasks: { ...state.tasks, [task.id]: task },
            ...(team ? {
              teams: {
                ...state.teams,
                [input.teamId]: {
                  ...team,
                  taskIds: [...team.taskIds, task.id],
                },
              },
            } : {}),
          };
        });

        return task;
      },

      updateTask: (taskId, updates) => {
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;
          return {
            tasks: { ...state.tasks, [taskId]: { ...task, ...updates } },
          };
        });
      },

      deleteTask: (taskId) => {
        const task = get().tasks[taskId];
        if (!task) return;

        set((state) => {
          const { [taskId]: _, ...restTasks } = state.tasks;
          const team = state.teams[task.teamId];
          if (!team) return { tasks: restTasks };

          return {
            tasks: restTasks,
            teams: {
              ...state.teams,
              [task.teamId]: {
                ...team,
                taskIds: team.taskIds.filter(id => id !== taskId),
              },
            },
          };
        });
      },

      setTaskStatus: (taskId, status, result, error) => {
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;

          const updates: Partial<AgentTeamTask> = { status };
          if (result !== undefined) updates.result = result;
          if (error !== undefined) updates.error = error;
          if (status === 'in_progress' && !task.startedAt) updates.startedAt = new Date();
          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            updates.completedAt = new Date();
            if (task.startedAt) {
              updates.actualDuration = updates.completedAt.getTime() - task.startedAt.getTime();
            }
          }

          return {
            tasks: { ...state.tasks, [taskId]: { ...task, ...updates } },
          };
        });
      },

      claimTask: (taskId, teammateId) => {
        set((state) => {
          const task = state.tasks[taskId];
          if (!task || task.status !== 'pending') return state;
          return {
            tasks: {
              ...state.tasks,
              [taskId]: { ...task, claimedBy: teammateId, status: 'claimed' },
            },
          };
        });
      },

      assignTask: (taskId, teammateId) => {
        set((state) => {
          const task = state.tasks[taskId];
          if (!task) return state;
          return {
            tasks: {
              ...state.tasks,
              [taskId]: { ...task, assignedTo: teammateId },
            },
          };
        });
      },

      // ====================================================================
      // Messages
      // ====================================================================

      addMessage: (input) => {
        const sender = get().teammates[input.senderId];
        const recipient = input.recipientId ? get().teammates[input.recipientId] : undefined;

        const message: AgentTeamMessage = {
          id: nanoid(),
          teamId: input.teamId,
          type: input.type || (input.recipientId ? 'direct' : 'broadcast'),
          senderId: input.senderId,
          senderName: sender?.name || 'Unknown',
          recipientId: input.recipientId,
          recipientName: recipient?.name,
          content: input.content,
          taskId: input.taskId,
          read: false,
          timestamp: new Date(),
          metadata: input.metadata,
        };

        set((state) => {
          const team = state.teams[input.teamId];
          return {
            messages: { ...state.messages, [message.id]: message },
            ...(team ? {
              teams: {
                ...state.teams,
                [input.teamId]: {
                  ...team,
                  messageIds: [...team.messageIds, message.id],
                },
              },
            } : {}),
          };
        });

        return message;
      },

      markMessageRead: (messageId) => {
        set((state) => {
          const msg = state.messages[messageId];
          if (!msg) return state;
          return {
            messages: { ...state.messages, [messageId]: { ...msg, read: true } },
          };
        });
      },

      markAllMessagesRead: (teammateId) => {
        set((state) => {
          const updated = { ...state.messages };
          for (const [id, msg] of Object.entries(updated)) {
            if (!msg.read && (msg.recipientId === teammateId || (msg.type === 'broadcast' && msg.senderId !== teammateId))) {
              updated[id] = { ...msg, read: true };
            }
          }
          return { messages: updated };
        });
      },

      // ====================================================================
      // Events
      // ====================================================================

      addEvent: (event) => {
        set((state) => ({
          events: [...state.events.slice(-99), event], // Keep last 100
        }));
      },

      clearEvents: (teamId) => {
        if (teamId) {
          set((state) => ({
            events: state.events.filter(e => e.teamId !== teamId),
          }));
        } else {
          set({ events: [] });
        }
      },

      // ====================================================================
      // Templates
      // ====================================================================

      addTemplate: (template) => {
        set((state) => ({
          templates: { ...state.templates, [template.id]: template },
        }));
      },

      deleteTemplate: (templateId) => {
        set((state) => {
          const template = state.templates[templateId];
          if (!template || template.isBuiltIn) return state;
          const { [templateId]: _, ...rest } = state.templates;
          return { templates: rest };
        });
      },

      // ====================================================================
      // UI State
      // ====================================================================

      setActiveTeam: (teamId) => set({ activeTeamId: teamId }),
      setSelectedTeammate: (teammateId) => set({ selectedTeammateId: teammateId }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setIsPanelOpen: (open) => set({ isPanelOpen: open }),

      // ====================================================================
      // Selectors
      // ====================================================================

      getTeam: (teamId) => get().teams[teamId],
      getTeammate: (teammateId) => get().teammates[teammateId],

      getTeammates: (teamId) => {
        const team = get().teams[teamId];
        if (!team) return [];
        return team.teammateIds
          .map(id => get().teammates[id])
          .filter((tm): tm is AgentTeammate => tm !== undefined);
      },

      getTeamTasks: (teamId) => {
        const team = get().teams[teamId];
        if (!team) return [];
        return team.taskIds
          .map(id => get().tasks[id])
          .filter((t): t is AgentTeamTask => t !== undefined)
          .sort((a, b) => a.order - b.order);
      },

      getTeamMessages: (teamId) => {
        const team = get().teams[teamId];
        if (!team) return [];
        return team.messageIds
          .map(id => get().messages[id])
          .filter((m): m is AgentTeamMessage => m !== undefined)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      },

      getUnreadMessages: (teammateId) => {
        return Object.values(get().messages).filter(msg => {
          if (msg.read) return false;
          if (msg.recipientId === teammateId) return true;
          if (msg.type === 'broadcast' && msg.senderId !== teammateId) return true;
          return false;
        });
      },

      getActiveTeam: () => {
        const { activeTeamId, teams } = get();
        return activeTeamId ? teams[activeTeamId] : undefined;
      },

      // ====================================================================
      // Batch Operations
      // ====================================================================

      cancelAllTasks: (teamId) => {
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;

          const updatedTasks = { ...state.tasks };
          for (const taskId of team.taskIds) {
            const task = updatedTasks[taskId];
            if (task && (task.status === 'pending' || task.status === 'in_progress' || task.status === 'claimed' || task.status === 'blocked')) {
              updatedTasks[taskId] = { ...task, status: 'cancelled', completedAt: new Date() };
            }
          }
          return { tasks: updatedTasks };
        });
      },

      shutdownAllTeammates: (teamId) => {
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;

          const updatedTeammates = { ...state.teammates };
          for (const id of team.teammateIds) {
            const tm = updatedTeammates[id];
            if (tm && tm.status !== 'shutdown' && tm.status !== 'completed' && tm.status !== 'failed') {
              updatedTeammates[id] = { ...tm, status: 'shutdown', currentTaskId: undefined };
            }
          }
          return { teammates: updatedTeammates };
        });
      },

      cleanupTeam: (teamId) => {
        set((state) => {
          const team = state.teams[teamId];
          if (!team) return state;

          const { [teamId]: _, ...restTeams } = state.teams;

          const restTeammates = { ...state.teammates };
          for (const id of team.teammateIds) {
            delete restTeammates[id];
          }

          const restTasks = { ...state.tasks };
          for (const id of team.taskIds) {
            delete restTasks[id];
          }

          const restMessages = { ...state.messages };
          for (const id of team.messageIds) {
            delete restMessages[id];
          }

          return {
            teams: restTeams,
            teammates: restTeammates,
            tasks: restTasks,
            messages: restMessages,
            activeTeamId: state.activeTeamId === teamId ? null : state.activeTeamId,
          };
        });
      },

      // ====================================================================
      // Settings
      // ====================================================================

      updateDefaultConfig: (config) => {
        set((state) => ({
          defaultConfig: { ...state.defaultConfig, ...config },
        }));
      },

      // ====================================================================
      // Reset
      // ====================================================================

      reset: () => {
        set({ ...initialState, templates: builtInTemplatesMap });
      },
    }),
    {
      name: 'cognia-agent-teams',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        templates: state.templates,
        defaultConfig: state.defaultConfig,
        displayMode: state.displayMode,
      }),
    }
  )
);

// ============================================================================
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

export default useAgentTeamStore;
