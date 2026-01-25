/**
 * Chat Widget Store - manages the floating AI chat assistant state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { ProviderName } from '@/types';

// Message feedback type
export type MessageFeedback = 'like' | 'dislike' | null;

// Chat widget message
export interface ChatWidgetMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  error?: string;
  feedback?: MessageFeedback;
  isEdited?: boolean;
  originalContent?: string;
}

// Chat widget configuration
export interface ChatWidgetConfig {
  width: number;
  height: number;
  x: number | null;
  y: number | null;
  rememberPosition: boolean;
  startMinimized: boolean;
  opacity: number;
  shortcut: string;
  pinned: boolean;
  provider: ProviderName;
  model: string;
  systemPrompt: string;
  maxMessages: number;
  showTimestamps: boolean;
  soundEnabled: boolean;
  autoFocus: boolean;
  /** Background color for opaque rendering (hex format, e.g., "#ffffff") */
  backgroundColor: string;
}

// Chat widget state
interface ChatWidgetState {
  // UI State
  isVisible: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // Messages
  messages: ChatWidgetMessage[];
  inputValue: string;

  // Configuration
  config: ChatWidgetConfig;

  // Session
  sessionId: string;
  lastActivity: Date | null;
}

// Chat widget actions
interface ChatWidgetActions {
  // Visibility
  show: () => void;
  hide: () => void;
  toggle: () => void;
  setVisible: (visible: boolean) => void;

  // Messages
  addMessage: (message: Omit<ChatWidgetMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatWidgetMessage>) => void;
  deleteMessage: (id: string) => void;
  deleteMessagesAfter: (id: string) => void;
  clearMessages: () => void;
  setStreaming: (id: string, isStreaming: boolean) => void;
  setFeedback: (id: string, feedback: MessageFeedback) => void;
  editMessage: (id: string, newContent: string) => void;

  // Input
  setInputValue: (value: string) => void;
  clearInput: () => void;

  // Loading
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Configuration
  updateConfig: (config: Partial<ChatWidgetConfig>) => void;
  resetConfig: () => void;

  // Session
  newSession: () => void;
  recordActivity: () => void;

  // Quick actions
  sendQuickMessage: (text: string) => void;
}

type ChatWidgetStore = ChatWidgetState & ChatWidgetActions;

const DEFAULT_CONFIG: ChatWidgetConfig = {
  width: 420,
  height: 600,
  x: null,
  y: null,
  rememberPosition: true,
  startMinimized: false,
  opacity: 1.0,
  shortcut: 'CommandOrControl+Shift+Space',
  pinned: true,
  provider: 'openai',
  model: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful AI assistant. Be concise and friendly.',
  maxMessages: 50,
  showTimestamps: false,
  soundEnabled: false,
  autoFocus: true,
  backgroundColor: '#ffffff',
};

const DEFAULT_STATE: ChatWidgetState = {
  isVisible: false,
  isLoading: false,
  isStreaming: false,
  error: null,
  messages: [],
  inputValue: '',
  config: DEFAULT_CONFIG,
  sessionId: nanoid(),
  lastActivity: null,
};

export const useChatWidgetStore = create<ChatWidgetStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // Visibility
      show: () => set({ isVisible: true, lastActivity: new Date() }),
      hide: () => set({ isVisible: false }),
      toggle: () => set((state) => ({ isVisible: !state.isVisible, lastActivity: new Date() })),
      setVisible: (visible) =>
        set({ isVisible: visible, lastActivity: visible ? new Date() : get().lastActivity }),

      // Messages
      addMessage: (message) => {
        const id = nanoid();
        const newMessage: ChatWidgetMessage = {
          ...message,
          id,
          timestamp: new Date(),
        };

        set((state) => {
          const messages = [...state.messages, newMessage];
          // Limit messages to maxMessages
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

      // Input
      setInputValue: (value) => set({ inputValue: value }),
      clearInput: () => set({ inputValue: '' }),

      // Loading
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error, isLoading: false }),

      // Configuration
      updateConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      resetConfig: () =>
        set({
          config: DEFAULT_CONFIG,
        }),

      // Session
      newSession: () =>
        set({
          sessionId: nanoid(),
          messages: [],
          error: null,
          inputValue: '',
          lastActivity: new Date(),
        }),

      recordActivity: () => set({ lastActivity: new Date() }),

      // Quick actions
      sendQuickMessage: (text) => {
        const { setInputValue, show } = get();
        show();
        setInputValue(text);
      },
    }),
    {
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
    }
  )
);

// Selectors
export const selectChatWidgetMessages = (state: ChatWidgetStore) => state.messages;
export const selectChatWidgetConfig = (state: ChatWidgetStore) => state.config;
export const selectChatWidgetIsVisible = (state: ChatWidgetStore) => state.isVisible;
export const selectChatWidgetIsLoading = (state: ChatWidgetStore) => state.isLoading;
