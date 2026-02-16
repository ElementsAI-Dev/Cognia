import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { SessionStore } from './types';

type PersistedSessionStore = Record<string, unknown>;

export const sessionStorePersistConfig: PersistOptions<SessionStore, PersistedSessionStore> = {
  name: 'cognia-sessions',
  version: 1,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState: unknown, version: number) => {
    const state = persistedState as Record<string, unknown>;
    if (version === 0) {
      if (!Array.isArray(state.folders)) {
        state.folders = [];
      }
      if (!state.inputDrafts || typeof state.inputDrafts !== 'object') {
        state.inputDrafts = {};
      }
      if (!Array.isArray(state.modeHistory)) {
        state.modeHistory = [];
      }
      if (Array.isArray(state.sessions)) {
        state.sessions = (state.sessions as Record<string, unknown>[]).map((s) => ({
          ...s,
          branches: s.branches || [],
          goal: s.goal || undefined,
          folderId: s.folderId || undefined,
        }));
      }
    }
    return state;
  },
  partialize: (state) => ({
    sessions: state.sessions.map((s) => {
      const { flowCanvasState: _fcs, ...rest } = s;
      return {
        ...rest,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
        archivedAt: s.archivedAt instanceof Date ? s.archivedAt.toISOString() : s.archivedAt,
        branches: s.branches?.map((b) => ({
          ...b,
          createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
          updatedAt: b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
        })),
        goal: s.goal
          ? {
              ...s.goal,
              createdAt:
                s.goal.createdAt instanceof Date ? s.goal.createdAt.toISOString() : s.goal.createdAt,
              updatedAt:
                s.goal.updatedAt instanceof Date ? s.goal.updatedAt.toISOString() : s.goal.updatedAt,
              completedAt:
                s.goal.completedAt instanceof Date
                  ? s.goal.completedAt.toISOString()
                  : s.goal.completedAt,
              steps: s.goal.steps?.map((step) => ({
                ...step,
                createdAt:
                  step.createdAt instanceof Date ? step.createdAt.toISOString() : step.createdAt,
                completedAt:
                  step.completedAt instanceof Date ? step.completedAt.toISOString() : step.completedAt,
              })),
            }
          : undefined,
      };
    }),
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
        archivedAt: s.archivedAt ? new Date(s.archivedAt as unknown as string) : undefined,
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
};
