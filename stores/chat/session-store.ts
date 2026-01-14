/**
 * Session Store - manages chat sessions with persistence and mode management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
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

  createSession: (input?: CreateSessionInput) => Session;
  deleteSession: (id: string) => void;
  updateSession: (id: string, updates: UpdateSessionInput) => void;
  setActiveSession: (id: string | null) => void;
  duplicateSession: (id: string) => Session | null;
  togglePinSession: (id: string) => void;
  deleteAllSessions: () => void;

  switchMode: (sessionId: string, mode: ChatMode) => void;
  switchModeWithNewSession: (
    currentSessionId: string,
    targetMode: ChatMode,
    options?: { carryContext?: boolean; summary?: string }
  ) => Session;
  getModeHistory: (sessionId?: string) => ModeHistoryEntry[];
  getModeConfig: (mode: ChatMode) => ModeConfig;
  getRecentModes: (limit?: number) => ChatMode[];

  createBranch: (sessionId: string, branchPointMessageId: string, name?: string) => ConversationBranch | null;
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
    defaultSystemPrompt: 'You are a patient tutor. Explain concepts clearly and check understanding.',
    features: ['explanations', 'quizzes', 'adaptive-learning'],
  },
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      modeHistory: [] as ModeHistoryEntry[],

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
        return session;
      },

      deleteSession: (id) =>
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          const newActiveId = state.activeSessionId === id ? newSessions[0]?.id || null : state.activeSessionId;
          return { sessions: newSessions, activeSessionId: newActiveId };
        }),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) => s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s),
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

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
          sessions: state.sessions.map((s) => s.id === id ? { ...s, pinned: !s.pinned, updatedAt: new Date() } : s),
        })),

      deleteAllSessions: () => set({ sessions: [], activeSessionId: null }),

      switchMode: (sessionId: string, mode: ChatMode) => {
        set((state) => {
          const historyEntry: ModeHistoryEntry = { mode, timestamp: new Date(), sessionId };
          return {
            sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, mode, updatedAt: new Date() } : s),
            modeHistory: [...state.modeHistory.slice(-49), historyEntry],
          };
        });
      },

      switchModeWithNewSession: (
        currentSessionId: string,
        targetMode: ChatMode,
        options?: { carryContext?: boolean; summary?: string }
      ) => {
        const { sessions } = get();
        const currentSession = sessions.find((s) => s.id === currentSessionId);
        
        // Build carried context if provided
        const carriedContext = options?.carryContext && options?.summary && currentSession
          ? {
              fromSessionId: currentSessionId,
              fromMode: currentSession.mode,
              summary: options.summary,
              carriedAt: new Date(),
            }
          : undefined;

        // Create new session with target mode, inheriting some settings from current session
        const newSession: Session = {
          id: nanoid(),
          title: 'New Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: currentSession?.provider || DEFAULT_PROVIDER,
          model: currentSession?.model || DEFAULT_MODEL,
          mode: targetMode,
          systemPrompt: MODE_CONFIGS[targetMode].defaultSystemPrompt || currentSession?.systemPrompt,
          projectId: currentSession?.projectId,
          virtualEnvId: currentSession?.virtualEnvId,
          messageCount: 0,
          carriedContext,
        };

        // Add mode history entry for the new session
        const historyEntry: ModeHistoryEntry = {
          mode: targetMode,
          timestamp: new Date(),
          sessionId: newSession.id,
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          activeSessionId: newSession.id,
          modeHistory: [...state.modeHistory.slice(-49), historyEntry],
        }));

        return newSession;
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
          sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, branches: [...(s.branches || []), branch], activeBranchId: branch.id, updatedAt: new Date() } : s),
        }));
        return branch;
      },

      switchBranch: (sessionId, branchId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, activeBranchId: branchId || undefined, branches: s.branches?.map((b) => ({ ...b, isActive: b.id === branchId })), updatedAt: new Date() } : s),
        }));
      },

      deleteBranch: (sessionId, branchId) => {
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id !== sessionId) return s;
            const newBranches = (s.branches || []).filter((b) => b.id !== branchId);
            return { ...s, branches: newBranches, activeBranchId: s.activeBranchId === branchId ? undefined : s.activeBranchId, updatedAt: new Date() };
          }),
        }));
      },

      renameBranch: (sessionId, branchId, name) => {
        set((state) => ({
          sessions: state.sessions.map((s) => s.id === sessionId ? { ...s, branches: s.branches?.map((b) => b.id === branchId ? { ...b, name, updatedAt: new Date() } : b), updatedAt: new Date() } : s),
        }));
      },

      getBranches: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.branches || [],
      getActiveBranchId: (sessionId) => get().sessions.find((s) => s.id === sessionId)?.activeBranchId,

      // Environment management
      setSessionEnvironment: (sessionId, envId, envPath) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, virtualEnvId: envId || undefined, virtualEnvPath: envPath || undefined, updatedAt: new Date() }
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
            s.id === sessionId
              ? { ...s, viewMode, updatedAt: new Date() }
              : s
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
                  flowCanvasState: { ...(s.flowCanvasState || DEFAULT_FLOW_CANVAS_STATE), ...updates },
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
      importSessions: (sessions) => set((state) => ({ sessions: [...sessions, ...state.sessions] })),
      getSession: (id) => get().sessions.find((s) => s.id === id),
      getActiveSession: () => { const { sessions, activeSessionId } = get(); return sessions.find((s) => s.id === activeSessionId); },
    }),
    {
      name: 'cognia-sessions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
          branches: s.branches?.map((b) => ({ ...b, createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt, updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt })),
        })),
        activeSessionId: state.activeSessionId,
        modeHistory: state.modeHistory.map((h) => ({ ...h, timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : h.timestamp })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.sessions) {
          state.sessions = state.sessions.map((s) => ({ ...s, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt), branches: s.branches?.map((b) => ({ ...b, createdAt: new Date(b.createdAt), updatedAt: new Date(b.updatedAt) })) }));
        }
        if (state?.modeHistory) {
          state.modeHistory = state.modeHistory.map((h) => ({ ...h, timestamp: new Date(h.timestamp as unknown as string) }));
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
