/**
 * Chat Store - manages chat messages and streaming state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UIMessage, MessagePart, ToolInvocationPart, ToolState } from '@/types/core/message';

interface ToolInvocationUpdate {
  state?: ToolState;
  result?: unknown;
  errorText?: string;
}

interface ChatState {
  // State
  messages: UIMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // Actions
  setMessages: (messages: UIMessage[]) => void;
  appendMessage: (message: UIMessage) => void;
  updateMessage: (id: string, updates: Partial<UIMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Streaming
  setStreaming: (streaming: boolean) => void;
  appendToLastMessage: (content: string) => void;

  // Tool state
  updateToolInvocation: (
    messageId: string,
    toolCallId: string,
    updates: ToolInvocationUpdate
  ) => void;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set) => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    error: null,

    setMessages: (messages) => set({ messages, error: null }),

    appendMessage: (message) =>
      set((state) => ({
        messages: [...state.messages, message],
        error: null,
      })),

    updateMessage: (id, updates) =>
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),

    deleteMessage: (id) =>
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id),
      })),

    clearMessages: () => set({ messages: [], error: null }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error, isLoading: false, isStreaming: false }),

    setStreaming: (isStreaming) => set({ isStreaming }),

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
  }))
);

// Selectors
export const selectMessages = (state: ChatState) => state.messages;
export const selectIsLoading = (state: ChatState) => state.isLoading;
export const selectIsStreaming = (state: ChatState) => state.isStreaming;
export const selectError = (state: ChatState) => state.error;
