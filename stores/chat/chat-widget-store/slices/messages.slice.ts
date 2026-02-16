import { nanoid } from 'nanoid';
import type { StoreApi } from 'zustand';
import type { ChatWidgetActions, ChatWidgetMessage, ChatWidgetStore } from '../types';

type ChatWidgetStoreSet = StoreApi<ChatWidgetStore>['setState'];
type MessagesSlice = Pick<
  ChatWidgetActions,
  | 'addMessage'
  | 'updateMessage'
  | 'deleteMessage'
  | 'deleteMessagesAfter'
  | 'clearMessages'
  | 'setStreaming'
  | 'setFeedback'
  | 'editMessage'
>;

export const createMessagesSlice = (set: ChatWidgetStoreSet): MessagesSlice => ({
  addMessage: (message) => {
    const id = nanoid();
    const newMessage: ChatWidgetMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };

    set((state) => {
      const messages = [...state.messages, newMessage];
      if (messages.length > state.config.maxMessages) {
        messages.shift();
      }
      return { messages, lastActivity: new Date() };
    });

    return id;
  },

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  deleteMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  deleteMessagesAfter: (id) =>
    set((state) => {
      const index = state.messages.findIndex((m) => m.id === id);
      if (index === -1) return state;
      return { messages: state.messages.slice(0, index + 1) };
    }),

  clearMessages: () =>
    set({
      messages: [],
      error: null,
    }),

  setStreaming: (id, isStreaming) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, isStreaming } : m)),
      isStreaming,
    })),

  setFeedback: (id, feedback) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, feedback } : m)),
    })),

  editMessage: (id, newContent) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              content: newContent,
              isEdited: true,
              originalContent: m.originalContent || m.content,
            }
          : m
      ),
    })),
});
