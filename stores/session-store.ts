/**
 * Session Store - manages chat sessions with persistence
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
} from '@/types';

interface SessionState {
  // State
  sessions: Session[];
  activeSessionId: string | null;

  // Actions
  createSession: (input?: CreateSessionInput) => Session;
  deleteSession: (id: string) => void;
  updateSession: (id: string, updates: UpdateSessionInput) => void;
  setActiveSession: (id: string | null) => void;
  duplicateSession: (id: string) => Session | null;
  togglePinSession: (id: string) => void;
  deleteAllSessions: () => void;

  // Branching actions
  createBranch: (sessionId: string, branchPointMessageId: string, name?: string) => ConversationBranch | null;
  switchBranch: (sessionId: string, branchId: string | null) => void; // null for main branch
  deleteBranch: (sessionId: string, branchId: string) => void;
  renameBranch: (sessionId: string, branchId: string, name: string) => void;
  getBranches: (sessionId: string) => ConversationBranch[];
  getActiveBranchId: (sessionId: string) => string | undefined;

  // Bulk operations
  clearAllSessions: () => void;
  importSessions: (sessions: Session[]) => void;

  // Selectors
  getSession: (id: string) => Session | undefined;
  getActiveSession: () => Session | undefined;
}

const DEFAULT_PROVIDER: ProviderName = 'openai';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MODE: ChatMode = 'chat';

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

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
          messageCount: 0,
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
          const newActiveId =
            state.activeSessionId === id
              ? newSessions[0]?.id || null
              : state.activeSessionId;

          return {
            sessions: newSessions,
            activeSessionId: newActiveId,
          };
        }),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...updates,
                  updatedAt: new Date(),
                }
              : s
          ),
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
          sessions: state.sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  pinned: !s.pinned,
                  updatedAt: new Date(),
                }
              : s
          ),
        })),

      deleteAllSessions: () =>
        set({
          sessions: [],
          activeSessionId: null,
        }),

      // Branching actions
      createBranch: (sessionId, branchPointMessageId, name) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return null;

        const existingBranches = session.branches || [];
        const branchNumber = existingBranches.length + 1;

        const branch: ConversationBranch = {
          id: nanoid(),
          name: name || `Branch ${branchNumber}`,
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
                  branches: s.branches?.map((b) => ({
                    ...b,
                    isActive: b.id === branchId,
                  })),
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
            const wasActive = s.activeBranchId === branchId;

            return {
              ...s,
              branches: newBranches,
              activeBranchId: wasActive ? undefined : s.activeBranchId,
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
                    b.id === branchId
                      ? { ...b, name, updatedAt: new Date() }
                      : b
                  ),
                  updatedAt: new Date(),
                }
              : s
          ),
        }));
      },

      getBranches: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        return session?.branches || [];
      },

      getActiveBranchId: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        return session?.activeBranchId;
      },

      clearAllSessions: () =>
        set({
          sessions: [],
          activeSessionId: null,
        }),

      importSessions: (sessions) =>
        set((state) => ({
          sessions: [...sessions, ...state.sessions],
        })),

      getSession: (id) => {
        const { sessions } = get();
        return sessions.find((s) => s.id === id);
      },

      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId);
      },
    }),
    {
      name: 'cognia-sessions',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions.map((s) => ({
          ...s,
          // Convert dates to ISO strings for storage
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
          // Handle branch dates
          branches: s.branches?.map((b) => ({
            ...b,
            createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
            updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
          })),
        })),
        activeSessionId: state.activeSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert ISO strings back to Date objects
        if (state?.sessions) {
          state.sessions = state.sessions.map((s) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
            // Handle branch dates
            branches: s.branches?.map((b) => ({
              ...b,
              createdAt: new Date(b.createdAt),
              updatedAt: new Date(b.updatedAt),
            })),
          }));
        }
      },
    }
  )
);

// Selectors
export const selectSessions = (state: SessionState) => state.sessions;
export const selectActiveSessionId = (state: SessionState) => state.activeSessionId;
