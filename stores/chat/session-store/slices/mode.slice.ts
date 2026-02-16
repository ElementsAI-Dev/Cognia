import { nanoid } from 'nanoid';
import { getPluginLifecycleHooks } from '@/lib/plugin';
import type {
  SliceCreator,
  ModeSliceState,
  ModeSliceActions,
  ModeConfig,
  ModeHistoryEntry,
  ChatMode,
  Session,
} from '../types';
import type { ProviderName } from '@/types';

const DEFAULT_PROVIDER: ProviderName = 'openai';
const DEFAULT_MODEL = 'gpt-4o';

export const MODE_CONFIGS: Record<ChatMode, ModeConfig> = {
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

export const modeSliceInitialState: ModeSliceState = {
  modeHistory: [] as ModeHistoryEntry[],
};

export const createModeSlice: SliceCreator<ModeSliceActions> = (set, get) => ({
  switchMode: (sessionId: string, mode: ChatMode) => {
    set((state) => {
      const targetSession = state.sessions.find((s) => s.id === sessionId);
      if (!targetSession || targetSession.mode === mode) {
        return state;
      }

      getPluginLifecycleHooks().dispatchOnChatModeSwitch(sessionId, mode, targetSession.mode);

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
        systemPrompt: MODE_CONFIGS[targetMode].defaultSystemPrompt || currentSession?.systemPrompt,
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
});
