import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { ChatFolder, ModeHistoryEntry, SessionStore } from './types';

type PersistedChatFolder = Omit<ChatFolder, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

type PersistedModeHistoryEntry = Omit<ModeHistoryEntry, 'timestamp'> & {
  timestamp: string;
};

interface PersistedSessionStore {
  activeSessionId: string | null;
  modeHistory: PersistedModeHistoryEntry[];
  folders: PersistedChatFolder[];
  inputDrafts: Record<string, string>;
}

export const sessionStorePersistConfig: PersistOptions<SessionStore, PersistedSessionStore> = {
  name: 'cognia-sessions',
  version: 3,
  storage: createJSONStorage(() => localStorage),
  migrate: (persistedState: unknown) => {
    const state = (persistedState || {}) as Partial<PersistedSessionStore & { sessions?: unknown[] }>;

    if (typeof window !== 'undefined' && Array.isArray(state.sessions) && state.sessions.length > 0) {
      try {
        localStorage.setItem(
          'cognia-sessions-legacy-snapshot-v3',
          JSON.stringify({
            state: {
              sessions: state.sessions,
              activeSessionId: state.activeSessionId || null,
            },
          })
        );
      } catch {
        // ignore snapshot write failures
      }
    }

    return {
      activeSessionId: state.activeSessionId || null,
      modeHistory: Array.isArray(state.modeHistory) ? state.modeHistory : [],
      folders: Array.isArray(state.folders) ? state.folders : [],
      inputDrafts: state.inputDrafts && typeof state.inputDrafts === 'object' ? state.inputDrafts : {},
    };
  },
  partialize: (state) => ({
    activeSessionId: state.activeSessionId,
    inputDrafts: state.inputDrafts,
    modeHistory: state.modeHistory.map((item) => ({
      ...item,
      timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
    })),
    folders: state.folders.map((folder) => ({
      ...folder,
      createdAt: folder.createdAt instanceof Date ? folder.createdAt.toISOString() : folder.createdAt,
      updatedAt: folder.updatedAt instanceof Date ? folder.updatedAt.toISOString() : folder.updatedAt,
    })),
  }),
  onRehydrateStorage: () => (state) => {
    if (state?.modeHistory) {
      state.modeHistory = state.modeHistory.map((entry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp),
      }));
    }
    if (state?.folders) {
      state.folders = state.folders.map((folder) => ({
        ...folder,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt),
      }));
    }
  },
};
