import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { ChatWidgetMessage, ChatWidgetStore, ChatWidgetState } from './types';

type PersistedChatWidgetMessage = Omit<ChatWidgetMessage, 'timestamp'> & {
  timestamp: string | Date;
};

type PersistedChatWidgetStore = Pick<ChatWidgetState, 'config' | 'sessionId'> & {
  messages: PersistedChatWidgetMessage[];
};

export const chatWidgetPersistConfig: PersistOptions<ChatWidgetStore, PersistedChatWidgetStore> = {
  name: 'cognia-chat-widget',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    config: state.config,
    messages: state.messages.slice(-20).map((m) => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      isStreaming: false,
    })),
    sessionId: state.sessionId,
  }),
  onRehydrateStorage: () => (state) => {
    if (state?.messages) {
      state.messages = state.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp as unknown as string),
      }));
    }
  },
};
