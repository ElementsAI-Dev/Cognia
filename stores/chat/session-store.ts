/**
 * Session Store - manages chat sessions with persistence and mode management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { getPluginLifecycleHooks } from '@/lib/plugin';
import type {
  Session,
  CreateSessionInput,
  UpdateSessionInput,
  ProviderName,
  ChatMode,
  ConversationBranch,
  ChatViewMode,
  FlowChatCanvasState,
  NodePosition,
  ChatGoal,
  CreateGoalInput,
  UpdateGoalInput,
  ChatGoalStatus,
  GoalStep,
  CreateStepInput,
  UpdateStepInput,
  ChatFolder,
} from '@/types';
import { DEFAULT_FLOW_CANVAS_STATE } from '@/types/chat/flow-chat';

// Mode history entry for tracking mode switches
interface ModeHistoryEntry {
  mode: ChatMode;
  timestamp: Date;
  sessionId: string;
}

// Mode configuration for each chat mode
interface ModeConfig {
  id: ChatMode;
  name: string;
  description: string;
  icon: string;
  defaultSystemPrompt?: string;
  suggestedModels?: string[];
  features: string[];
}

interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
  modeHistory: ModeHistoryEntry[];
  folders: ChatFolder[];

  createSession: (input?: CreateSessionInput) => Session;
  deleteSession: (id: string) => void;
  updateSession: (id: string, updates: UpdateSessionInput) => void;
  setActiveSession: (id: string | null) => void;
  duplicateSession: (id: string) => Session | null;
  togglePinSession: (id: string) => void;
  deleteAllSessions: () => void;

  // Folder management
  createFolder: (name: string) => ChatFolder;
  deleteFolder: (id: string) => void;
  updateFolder: (id: string, updates: Partial<ChatFolder>) => void;
  moveSessionToFolder: (sessionId: string, folderId: string | null) => void;
  setSessionCustomIcon: (sessionId: string, icon: string | undefined) => void;

  switchMode: (sessionId: string, mode: ChatMode) => void;
  switchModeWithNewSession: (
    currentSessionId: string,
    targetMode: ChatMode,
    options?: { carryContext?: boolean; summary?: string }
  ) => Session;
  getModeHistory: (sessionId?: string) => ModeHistoryEntry[];
  getModeConfig: (mode: ChatMode) => ModeConfig;
  getRecentModes: (limit?: number) => ChatMode[];

  createBranch: (
    sessionId: string,
    branchPointMessageId: string,
    name?: string
  ) => ConversationBranch | null;
  switchBranch: (sessionId: string, branchId: string | null) => void;
  deleteBranch: (sessionId: string, branchId: string) => void;
  renameBranch: (sessionId: string, branchId: string, name: string) => void;
  getBranches: (sessionId: string) => ConversationBranch[];
  getActiveBranchId: (sessionId: string) => string | undefined;

  // Environment management
  setSessionEnvironment: (sessionId: string, envId: string | null, envPath?: string | null) => void;
  getSessionEnvironment: (sessionId: string) => { envId: string | null; envPath: string | null };
  clearSessionEnvironment: (sessionId: string) => void;

  // Flow canvas view management
  setViewMode: (sessionId: string, viewMode: ChatViewMode) => void;
  getViewMode: (sessionId: string) => ChatViewMode;
  updateFlowCanvasState: (sessionId: string, updates: Partial<FlowChatCanvasState>) => void;
  getFlowCanvasState: (sessionId: string) => FlowChatCanvasState;
  updateNodePosition: (sessionId: string, position: NodePosition) => void;
  updateNodePositions: (sessionId: string, positions: NodePosition[]) => void;
  toggleNodeCollapse: (sessionId: string, nodeId: string) => void;
  setSelectedNodes: (sessionId: string, nodeIds: string[]) => void;

  clearAllSessions: () => void;
  importSessions: (sessions: Session[]) => void;

  getSession: (id: string) => Session | undefined;
  getActiveSession: () => Session | undefined;

  // Goal management
  setGoal: (sessionId: string, input: CreateGoalInput) => ChatGoal;
  updateGoal: (sessionId: string, updates: UpdateGoalInput) => void;
  clearGoal: (sessionId: string) => void;
  completeGoal: (sessionId: string) => void;
  pauseGoal: (sessionId: string) => void;
  resumeGoal: (sessionId: string) => void;
  getGoal: (sessionId: string) => ChatGoal | undefined;

  // Step management (for multi-step goals)
  addStep: (sessionId: string, input: CreateStepInput) => GoalStep | undefined;
  updateStep: (sessionId: string, stepId: string, updates: UpdateStepInput) => void;
  removeStep: (sessionId: string, stepId: string) => void;
  toggleStepComplete: (sessionId: string, stepId: string) => void;
  reorderSteps: (sessionId: string, stepIds: string[]) => void;

  // Bulk operations
  selectedSessionIds: string[];
  selectSession: (id: string) => void;
  deselectSession: (id: string) => void;
  selectAllSessions: () => void;
  clearSelection: () => void;
  bulkDeleteSessions: (ids: string[]) => void;
  bulkMoveSessions: (ids: string[], folderId: string | null) => void;
  bulkPinSessions: (ids: string[], pinned: boolean) => void;
}

const DEFAULT_PROVIDER: ProviderName = 'openai';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MODE: ChatMode = 'chat';

const MODE_CONFIGS: Record<ChatMode, ModeConfig> = {
  chat: {
    id: 'chat',
    name: 'Chat',
    description: 'General conversation and Q&A',
    icon: 'MessageSquare',
    features: ['conversation', 'quick-answers', 'brainstorming'],
  },
  agent: {
    id: 'agent',
    name: 'Agent',
    description: 'Autonomous task execution with tools',
    icon: 'Bot',
    defaultSystemPrompt: 'You are an autonomous agent capable of using tools to accomplish tasks.',
    suggestedModels: ['gpt-4o', 'claude-3-5-sonnet'],
    features: ['tool-use', 'planning', 'multi-step-tasks'],
  },
  research: {
    id: 'research',
    name: 'Research',
    description: 'In-depth research and analysis',
    icon: 'Search',
    defaultSystemPrompt: 'You are a research assistant. Provide thorough, well-sourced answers.',
    features: ['web-search', 'citations', 'deep-analysis'],
  },
  learning: {
    id: 'learning',
    name: 'Learning',
    description: 'Interactive learning and tutoring',
    icon: 'GraduationCap',
    defaultSystemPrompt:
      'You are a patient tutor. Explain concepts clearly and check understanding.',
    features: ['explanations', 'quizzes', 'adaptive-learning'],
  },
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      modeHistory: [] as ModeHistoryEntry[],
      folders: [],

      createFolder: (name: string) => {
        const folder: ChatFolder = {
          id: nanoid(),
          name,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({
          folders: [...state.folders, folder],
        }));
        return folder;
      },

      deleteFolder: (id: string) => {
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== id),
          sessions: state.sessions.map((s) =>
            s.folderId === id ? { ...s, folderId: undefined, updatedAt: new Date() } : s
          ),
        }));
      },

      updateFolder: (id: string, updates: Partial<ChatFolder>) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, ...updates, updatedAt: new Date() } : f
          ),
        }));
      },

      moveSessionToFolder: (sessionId: string, folderId: string | null) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, folderId: folderId || undefined, updatedAt: new Date() }
              : s
          ),
        }));
      },

      setSessionCustomIcon: (sessionId: string, icon: string | undefined) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, customIcon: icon, updatedAt: new Date() } : s
          ),
        }));
      },

      createSession: (input = {}) => {
        const session: Session = {
          id: nanoid(),
          title: input.title || 'New Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: input.provider || DEFAULT_PROVIDER,
          model: input.model || DEFAULT_MODEL,
          mode: input.mode || DEFAULT_MODE,
          systemPrompt: input.systemPrompt,
          projectId: input.projectId,
          virtualEnvId: input.virtualEnvId,
          messageCount: 0,
          carriedContext: input.carriedContext,
          historyContext: input.historyContext,
        };
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
        }));

        getPluginLifecycleHooks().dispatchOnSessionCreate(session.id);

        return session;
      },

      deleteSession: (id) =>
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          const newActiveId =
            state.activeSessionId === id ? newSessions[0]?.id || null : state.activeSessionId;

          getPluginLifecycleHooks().dispatchOnSessionDelete(id);

          return { sessions: newSessions, activeSessionId: newActiveId };
        }),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
          ),
        })),

      setActiveSession: (id) =>
        set((state) => {
          if (state.activeSessionId !== id) {
            if (id) {
              getPluginLifecycleHooks().dispatchOnSessionSwitch(id);
            }
          }
          return { activeSessionId: id };
        }),

      duplicateSession: (id) => {
        const { sessions } = get();
        const original = sessions.find((s) => s.id === id);
        if (!original) return null;
        const duplicate: Session = {
          ...original,
          id: nanoid(),
          title: `${original.title} (copy)`,
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
          pinned: false,
        };
        set((state) => ({
          sessions: [duplicate, ...state.sessions],
          activeSessionId: duplicate.id,
        }));
        return duplicate;
      },

      togglePinSession: (id) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, pinned: !s.pinned, updatedAt: new Date() } : s
          ),
        })),

      deleteAllSessions: () => set({ sessions: [], activeSessionId: null }),

      switchMode: (sessionId: string, mode: ChatMode) => {
        set((state) => {
          const targetSession = state.sessions.find((s) => s.id === sessionId);
          if (!targetSession || targetSession.mode === mode) {
            return state;
          }

          const historyEntry: ModeHistoryEntry = { mode, timestamp: new Date(), sessionId };
          return {
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? { ...s, mode, updatedAt: new Date() } : s
            ),
            modeHistory: [...state.modeHistory.slice(-49), historyEntry],
          };
        });
      },

      switchModeWithNewSession: (
        currentSessionId: string,
        targetMode: ChatMode,
        options?: { carryContext?: boolean; summary?: string }
      ) => {
        let createdSession: Session | null = null;

        set((state) => {
          const currentSession = state.sessions.find((s) => s.id === currentSessionId);

          const carriedContext =
            options?.carryContext && options?.summary && currentSession
              ? {
                  fromSessionId: currentSessionId,
                  fromMode: currentSession.mode,
                  summary: options.summary,
                  carriedAt: new Date(),
                }
              : undefined;

          const newSession: Session = {
            id: nanoid(),
            title: 'New Chat',
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: currentSession?.provider || DEFAULT_PROVIDER,
            model: currentSession?.model || DEFAULT_MODEL,
            mode: targetMode,
            systemPrompt:
              MODE_CONFIGS[targetMode].defaultSystemPrompt || currentSession?.systemPrompt,
            projectId: currentSession?.projectId,
            virtualEnvId: currentSession?.virtualEnvId,
            messageCount: 0,
            carriedContext,
          };

          createdSession = newSession;

          const historyEntry: ModeHistoryEntry = {
            mode: targetMode,
            timestamp: new Date(),
            sessionId: newSession.id,
          };

          return {
            sessions: [newSession, ...state.sessions],
            activeSessionId: newSession.id,
            modeHistory: [...state.modeHistory.slice(-49), historyEntry],
          };
        });

        if (!createdSession) {
          return {
            id: nanoid(),
            title: 'New Chat',
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: DEFAULT_PROVIDER,
            model: DEFAULT_MODEL,
            mode: targetMode,
            systemPrompt: MODE_CONFIGS[targetMode].defaultSystemPrompt,
            messageCount: 0,
          };
        }

        return createdSession;
      },

      getModeHistory: (sessionId?: string) => {
        const { modeHistory } = get();
        return sessionId ? modeHistory.filter((h) => h.sessionId === sessionId) : modeHistory;
      },

      getModeConfig: (mode: ChatMode) => MODE_CONFIGS[mode],

      getRecentModes: (limit = 5) => {
        const { modeHistory } = get();
        const uniqueModes: ChatMode[] = [];
        for (let i = modeHistory.length - 1; i >= 0 && uniqueModes.length < limit; i--) {
          const mode = modeHistory[i].mode;
          if (!uniqueModes.includes(mode)) uniqueModes.push(mode);
        }
        return uniqueModes;
      },

      createBranch: (sessionId, branchPointMessageId, name) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return null;
        const existingBranches = session.branches || [];
        const branch: ConversationBranch = {
          id: nanoid(),
          name: name || `Branch ${existingBranches.length + 1}`,
          parentBranchId: session.activeBranchId,
          branchPointMessageId,
          createdAt: new Date(),
          updatedAt: new Date(),
          messageCount: 0,
          isActive: true,
        };
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  branches: [...(s.branches || []), branch],
                  activeBranchId: branch.id,
                  updatedAt: new Date(),
                }
              : s
          ),
        }));
        return branch;
      },

      switchBranch: (sessionId, branchId) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  activeBranchId: branchId || undefined,
                  branches: s.branches?.map((b) => ({ ...b, isActive: b.id === branchId })),
                  updatedAt: new Date(),
                }
              : s
          ),
        }));
      },

      deleteBranch: (sessionId, branchId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const newBranches = (s.branches || []).filter((b) => b.id !== branchId);
            return {
              ...s,
              branches: newBranches,
              activeBranchId: s.activeBranchId === branchId ? undefined : s.activeBranchId,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      renameBranch: (sessionId, branchId, name) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  branches: s.branches?.map((b) =>
                    b.id === branchId ? { ...b, name, updatedAt: new Date() } : b
                  ),
                  updatedAt: new Date(),
                }
              : s
          ),
        }));
      },

      getBranches: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.branches || [],
      getActiveBranchId: (sessionId) =>
        get().sessions.find((s) => s.id === sessionId)?.activeBranchId,

      // Environment management
      setSessionEnvironment: (sessionId, envId, envPath) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  virtualEnvId: envId || undefined,
                  virtualEnvPath: envPath || undefined,
                  updatedAt: new Date(),
                }
              : s
          ),
        })),

      getSessionEnvironment: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        return {
          envId: session?.virtualEnvId || null,
          envPath: session?.virtualEnvPath || null,
        };
      },

      clearSessionEnvironment: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, virtualEnvId: undefined, virtualEnvPath: undefined, updatedAt: new Date() }
              : s
          ),
        })),

      // Flow canvas view management
      setViewMode: (sessionId, viewMode) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, viewMode, updatedAt: new Date() } : s
          ),
        })),

      getViewMode: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        return session?.viewMode || 'list';
      },

      updateFlowCanvasState: (sessionId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  flowCanvasState: {
                    ...(s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE),
                    ...updates,
                  },
                  updatedAt: new Date(),
                }
              : s
          ),
        })),

      getFlowCanvasState: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        return session?.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
      },

      updateNodePosition: (sessionId, position) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const currentState = s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
            return {
              ...s,
              flowCanvasState: {
                ...currentState,
                nodePositions: {
                  ...currentState.nodePositions,
                  [position.messageId]: position,
                },
              },
              updatedAt: new Date(),
            };
          }),
        })),

      updateNodePositions: (sessionId, positions) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const currentState = s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
            const newPositions = { ...currentState.nodePositions };
            for (const pos of positions) {
              newPositions[pos.messageId] = pos;
            }
            return {
              ...s,
              flowCanvasState: {
                ...currentState,
                nodePositions: newPositions,
              },
              updatedAt: new Date(),
            };
          }),
        })),

      toggleNodeCollapse: (sessionId, nodeId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const currentState = s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE;
            const collapsedNodeIds = new Set(currentState.collapsedNodeIds);
            if (collapsedNodeIds.has(nodeId)) {
              collapsedNodeIds.delete(nodeId);
            } else {
              collapsedNodeIds.add(nodeId);
            }
            return {
              ...s,
              flowCanvasState: {
                ...currentState,
                collapsedNodeIds: Array.from(collapsedNodeIds),
              },
              updatedAt: new Date(),
            };
          }),
        })),

      setSelectedNodes: (sessionId, nodeIds) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  flowCanvasState: {
                    ...(s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE),
                    selectedNodeIds: nodeIds,
                  },
                  updatedAt: new Date(),
                }
              : s
          ),
        })),

      clearAllSessions: () => set({ sessions: [], activeSessionId: null }),
      importSessions: (sessions) =>
        set((state) => ({ sessions: [...sessions, ...state.sessions] })),
      getSession: (id) => get().sessions.find((s) => s.id === id),
      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },

      // Goal management
      setGoal: (sessionId, input) => {
        const now = new Date();
        // Create initial steps if provided
        const steps: GoalStep[] | undefined = input.steps?.map((stepInput, index) => ({
          id: nanoid(),
          content: stepInput.content,
          completed: false,
          order: index,
          createdAt: now,
        }));
        const goal: ChatGoal = {
          id: nanoid(),
          content: input.content,
          status: 'active',
          progress: input.progress ?? 0,
          steps,
          originalContent: input.originalContent,
          isPolished: input.isPolished,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, goal, updatedAt: now } : s
          ),
        }));
        return goal;
      },

      updateGoal: (sessionId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal) return s;
            const now = new Date();
            return {
              ...s,
              goal: {
                ...s.goal,
                ...updates,
                updatedAt: now,
                completedAt: updates.status === 'completed' ? now : s.goal.completedAt,
              },
              updatedAt: now,
            };
          }),
        })),

      clearGoal: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, goal: undefined, updatedAt: new Date() } : s
          ),
        })),

      completeGoal: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal) return s;
            const now = new Date();
            return {
              ...s,
              goal: {
                ...s.goal,
                status: 'completed' as ChatGoalStatus,
                progress: 100,
                completedAt: now,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      pauseGoal: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal) return s;
            const now = new Date();
            return {
              ...s,
              goal: {
                ...s.goal,
                status: 'paused' as ChatGoalStatus,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      resumeGoal: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal) return s;
            const now = new Date();
            return {
              ...s,
              goal: {
                ...s.goal,
                status: 'active' as ChatGoalStatus,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      getGoal: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.goal,

      // Step management (for multi-step goals)
      addStep: (sessionId, input) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session?.goal) return undefined;

        const now = new Date();
        const existingSteps = session.goal.steps || [];
        const newStep: GoalStep = {
          id: nanoid(),
          content: input.content,
          completed: false,
          order: existingSteps.length,
          createdAt: now,
        };

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal) return s;
            const steps = [...(s.goal.steps || []), newStep];
            return {
              ...s,
              goal: {
                ...s.goal,
                steps,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        }));
        return newStep;
      },

      updateStep: (sessionId, stepId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal?.steps) return s;
            const now = new Date();
            const steps = s.goal.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    ...updates,
                    completedAt: updates.completed ? now : step.completedAt,
                  }
                : step
            );
            // Auto-calculate progress from steps
            const completedCount = steps.filter((step) => step.completed).length;
            const progress =
              steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
            return {
              ...s,
              goal: {
                ...s.goal,
                steps,
                progress,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      removeStep: (sessionId, stepId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal?.steps) return s;
            const now = new Date();
            const steps = s.goal.steps
              .filter((step) => step.id !== stepId)
              .map((step, index) => ({ ...step, order: index }));
            // Auto-calculate progress from remaining steps
            const completedCount = steps.filter((step) => step.completed).length;
            const progress =
              steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
            return {
              ...s,
              goal: {
                ...s.goal,
                steps,
                progress,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      toggleStepComplete: (sessionId, stepId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal?.steps) return s;
            const now = new Date();
            const steps = s.goal.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    completed: !step.completed,
                    completedAt: !step.completed ? now : undefined,
                  }
                : step
            );
            // Auto-calculate progress from steps
            const completedCount = steps.filter((step) => step.completed).length;
            const progress =
              steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
            // Auto-complete goal if all steps are completed
            const allCompleted = steps.length > 0 && steps.every((step) => step.completed);
            return {
              ...s,
              goal: {
                ...s.goal,
                steps,
                progress,
                status: allCompleted ? 'completed' : s.goal.status,
                completedAt: allCompleted ? now : s.goal.completedAt,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      reorderSteps: (sessionId, stepIds) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId || !s.goal?.steps) return s;
            const now = new Date();
            const stepMap = new Map(s.goal.steps.map((step) => [step.id, step]));
            const steps = stepIds
              .map((id, index) => {
                const step = stepMap.get(id);
                return step ? { ...step, order: index } : null;
              })
              .filter((step): step is GoalStep => step !== null);
            return {
              ...s,
              goal: {
                ...s.goal,
                steps,
                updatedAt: now,
              },
              updatedAt: now,
            };
          }),
        })),

      // Bulk operations
      selectedSessionIds: [],

      selectSession: (id) =>
        set((state) => ({
          selectedSessionIds: state.selectedSessionIds.includes(id)
            ? state.selectedSessionIds
            : [...state.selectedSessionIds, id],
        })),

      deselectSession: (id) =>
        set((state) => ({
          selectedSessionIds: state.selectedSessionIds.filter((sid) => sid !== id),
        })),

      selectAllSessions: () =>
        set((state) => ({
          selectedSessionIds: state.sessions.map((s) => s.id),
        })),

      clearSelection: () =>
        set(() => ({
          selectedSessionIds: [],
        })),

      bulkDeleteSessions: (ids) =>
        set((state) => {
          const idsToDelete = new Set(ids);
          const newActiveId =
            state.activeSessionId && idsToDelete.has(state.activeSessionId)
              ? state.sessions.find((s) => !idsToDelete.has(s.id))?.id ?? null
              : state.activeSessionId;

          return {
            sessions: state.sessions.filter((s) => !idsToDelete.has(s.id)),
            activeSessionId: newActiveId,
            selectedSessionIds: state.selectedSessionIds.filter((id) => !idsToDelete.has(id)),
          };
        }),

      bulkMoveSessions: (ids, folderId) =>
        set((state) => {
          const idsToMove = new Set(ids);
          const now = new Date();
          return {
            sessions: state.sessions.map((s) =>
              idsToMove.has(s.id) ? { ...s, folderId: folderId ?? undefined, updatedAt: now } : s
            ),
          };
        }),

      bulkPinSessions: (ids, pinned) =>
        set((state) => {
          const idsToPin = new Set(ids);
          const now = new Date();
          return {
            sessions: state.sessions.map((s) =>
              idsToPin.has(s.id) ? { ...s, pinned, updatedAt: now } : s
            ),
          };
        }),
    }),
    {
      name: 'cognia-sessions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
          branches: s.branches?.map((b) => ({
            ...b,
            createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
            updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
          })),
          goal: s.goal
            ? {
                ...s.goal,
                createdAt:
                  s.goal.createdAt instanceof Date
                    ? s.goal.createdAt.toISOString()
                    : s.goal.createdAt,
                updatedAt:
                  s.goal.updatedAt instanceof Date
                    ? s.goal.updatedAt.toISOString()
                    : s.goal.updatedAt,
                completedAt:
                  s.goal.completedAt instanceof Date
                    ? s.goal.completedAt.toISOString()
                    : s.goal.completedAt,
                steps: s.goal.steps?.map((step) => ({
                  ...step,
                  createdAt:
                    step.createdAt instanceof Date ? step.createdAt.toISOString() : step.createdAt,
                  completedAt:
                    step.completedAt instanceof Date
                      ? step.completedAt.toISOString()
                      : step.completedAt,
                })),
              }
            : undefined,
        })),
        activeSessionId: state.activeSessionId,
        modeHistory: state.modeHistory.map((h) => ({
          ...h,
          timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : h.timestamp,
        })),
        folders: state.folders.map((f) => ({
          ...f,
          createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
          updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.sessions) {
          state.sessions = state.sessions.map((s) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            branches: s.branches?.map((b) => ({
              ...b,
              createdAt: new Date(b.createdAt),
              updatedAt: new Date(b.updatedAt),
            })),
            goal: s.goal
              ? {
                  ...s.goal,
                  createdAt: new Date(s.goal.createdAt as unknown as string),
                  updatedAt: new Date(s.goal.updatedAt as unknown as string),
                  completedAt: s.goal.completedAt
                    ? new Date(s.goal.completedAt as unknown as string)
                    : undefined,
                  steps: s.goal.steps?.map((step) => ({
                    ...step,
                    createdAt: new Date(step.createdAt as unknown as string),
                    completedAt: step.completedAt
                      ? new Date(step.completedAt as unknown as string)
                      : undefined,
                  })),
                }
              : undefined,
          }));
        }
        if (state?.modeHistory) {
          state.modeHistory = state.modeHistory.map((h) => ({
            ...h,
            timestamp: new Date(h.timestamp as unknown as string),
          }));
        }
        if (state?.folders) {
          state.folders = state.folders.map((f) => ({
            ...f,
            createdAt: new Date(f.createdAt as unknown as string),
            updatedAt: new Date(f.updatedAt as unknown as string),
          }));
        }
      },
    }
  )
);

export const selectSessions = (state: SessionState) => state.sessions;
export const selectActiveSessionId = (state: SessionState) => state.activeSessionId;
export const selectModeHistory = (state: SessionState) => state.modeHistory;
export { MODE_CONFIGS };
export type { ModeConfig, ModeHistoryEntry };
