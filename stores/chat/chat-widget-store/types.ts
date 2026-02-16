import type { ProviderName } from '@/types';

export type MessageFeedback = 'like' | 'dislike' | null;

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
  backgroundColor: string;
}

export interface ChatWidgetState {
  isVisible: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  messages: ChatWidgetMessage[];
  inputValue: string;
  config: ChatWidgetConfig;
  sessionId: string;
  lastActivity: Date | null;
}

export interface ChatWidgetActions {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  setVisible: (visible: boolean) => void;
  addMessage: (message: Omit<ChatWidgetMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatWidgetMessage>) => void;
  deleteMessage: (id: string) => void;
  deleteMessagesAfter: (id: string) => void;
  clearMessages: () => void;
  setStreaming: (id: string, isStreaming: boolean) => void;
  setFeedback: (id: string, feedback: MessageFeedback) => void;
  editMessage: (id: string, newContent: string) => void;
  setInputValue: (value: string) => void;
  clearInput: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateConfig: (config: Partial<ChatWidgetConfig>) => void;
  resetConfig: () => void;
  newSession: () => void;
  recordActivity: () => void;
  sendQuickMessage: (text: string) => void;
}

export type ChatWidgetStore = ChatWidgetState & ChatWidgetActions;
