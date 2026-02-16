import type { StoreApi } from 'zustand';
import type { ChatStore, ChatStoreActions, MessagePart, ToolInvocationPart } from '../types';

type ChatStoreSet = StoreApi<ChatStore>['setState'];
type MessagesSlice = Pick<
  ChatStoreActions,
  | 'setMessages'
  | 'appendMessage'
  | 'updateMessage'
  | 'deleteMessage'
  | 'clearMessages'
  | 'appendToLastMessage'
  | 'updateToolInvocation'
>;

export const createMessagesSlice = (set: ChatStoreSet): MessagesSlice => ({
  setMessages: (messages) => set({ messages, error: null }),

  appendMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      error: null,
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  deleteMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  clearMessages: () => set({ messages: [], error: null }),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      const lastIndex = messages.length - 1;
      const last = messages[lastIndex];

      if (last && last.role === 'assistant') {
        messages[lastIndex] = {
          ...last,
          content: last.content + content,
        };
      }

      return { messages };
    }),

  updateToolInvocation: (messageId, toolCallId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) => {
        if (m.id !== messageId || !m.parts) return m;

        return {
          ...m,
          parts: m.parts.map((part): MessagePart => {
            if (part.type === 'tool-invocation' && part.toolCallId === toolCallId) {
              return { ...part, ...updates } as ToolInvocationPart;
            }
            return part;
          }),
        };
      }),
    })),
});
