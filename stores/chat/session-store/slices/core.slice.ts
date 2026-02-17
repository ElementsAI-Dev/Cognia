import { nanoid } from 'nanoid';
import { getPluginLifecycleHooks } from '@/lib/plugin';
import { messageRepository, agentTraceRepository, db } from '@/lib/db';
import { loggers } from '@/lib/logger';
import type {
  SliceCreator,
  CoreSliceState,
  CoreSliceActions,
  Session,
  CreateSessionInput,
  ChatFolder,
} from '../types';
import type { ProviderName } from '@/types';

const DEFAULT_PROVIDER: ProviderName = 'openai';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MODE = 'chat' as const;

export const coreSliceInitialState: CoreSliceState = {
  sessions: [],
  activeSessionId: null,
  folders: [],
  inputDrafts: {} as Record<string, string>,
};

export const createCoreSlice: SliceCreator<CoreSliceActions> = (set, get) => ({
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

  createSession: (input: CreateSessionInput = {}) => {
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
      learningContext: input.learningContext,
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    }));

    getPluginLifecycleHooks().dispatchOnSessionCreate(session.id);

    return session;
  },

  deleteSession: (id) => {
    messageRepository.deleteBySessionId(id).catch((err) =>
      loggers.chat.error('Failed to delete messages for session', err as Error)
    );
    db.summaries.where('sessionId').equals(id).delete().catch((err) =>
      loggers.chat.error('Failed to delete summaries for session', err as Error)
    );
    agentTraceRepository.deleteBySessionId(id).catch((err) =>
      loggers.chat.error('Failed to delete agent traces for session', err as Error)
    );

    set((state) => {
      const newSessions = state.sessions.filter((s) => s.id !== id);
      const newActiveId =
        state.activeSessionId === id ? newSessions[0]?.id || null : state.activeSessionId;

      getPluginLifecycleHooks().dispatchOnSessionDelete(id);

      return { sessions: newSessions, activeSessionId: newActiveId };
    });
  },

  updateSession: (id, updates) =>
    set((state) => {
      const existing = state.sessions.find((s) => s.id === id);

      if (existing && updates.title && updates.title !== existing.title) {
        getPluginLifecycleHooks().dispatchOnSessionRename(id, existing.title, updates.title);
      }

      if (existing && (updates.provider || updates.model)) {
        const newProvider = updates.provider || existing.provider;
        const newModel = updates.model || existing.model;
        if (newProvider !== existing.provider || newModel !== existing.model) {
          getPluginLifecycleHooks().dispatchOnModelSwitch(
            newProvider,
            newModel,
            existing.provider,
            existing.model
          );
        }
      }

      if (existing && 'systemPrompt' in updates && updates.systemPrompt !== existing.systemPrompt) {
        getPluginLifecycleHooks().dispatchOnSystemPromptChange(
          id,
          updates.systemPrompt || '',
          existing.systemPrompt
        );
      }

      return {
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
        ),
      };
    }),

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

  deleteAllSessions: () => {
    const { sessions } = get();
    for (const session of sessions) {
      getPluginLifecycleHooks().dispatchOnSessionClear(session.id);
    }

    for (const session of sessions) {
      messageRepository.deleteBySessionId(session.id).catch((err) =>
        loggers.chat.error('Failed to delete messages for session', err as Error)
      );
      db.summaries.where('sessionId').equals(session.id).delete().catch((err) =>
        loggers.chat.error('Failed to delete summaries for session', err as Error)
      );
      agentTraceRepository.deleteBySessionId(session.id).catch((err) =>
        loggers.chat.error('Failed to delete agent traces for session', err as Error)
      );
    }

    set({ sessions: [], activeSessionId: null });
  },

  clearAllSessions: () => set({ sessions: [], activeSessionId: null }),
  importSessions: (sessions) =>
    set((state) => ({ sessions: [...sessions, ...state.sessions] })),
  getSession: (id) => get().sessions.find((s) => s.id === id),
  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find((s) => s.id === activeSessionId);
  },

  setInputDraft: (sessionId, draft) =>
    set((state) => ({
      inputDrafts: {
        ...state.inputDrafts,
        [sessionId]: draft,
      },
    })),

  getInputDraft: (sessionId) => get().inputDrafts[sessionId] || '',

  clearInputDraft: (sessionId) =>
    set((state) => {
      const { [sessionId]: _, ...rest } = state.inputDrafts;
      return { inputDrafts: rest };
    }),

  setFrozenSummary: (sessionId, summary) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, frozenSummary: summary, updatedAt: new Date() } : s
      ),
    })),

  getFrozenSummary: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    return session?.frozenSummary;
  },

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
});
