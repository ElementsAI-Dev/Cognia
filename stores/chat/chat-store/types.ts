import type { UIMessage, MessagePart, ToolInvocationPart, ToolState } from '@/types/core/message';

export interface ToolInvocationUpdate {
  state?: ToolState;
  result?: unknown;
  errorText?: string;
}

export interface ChatStoreState {
  messages: UIMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
}

export interface ChatStoreActions {
  setMessages: (messages: UIMessage[]) => void;
  appendMessage: (message: UIMessage) => void;
  updateMessage: (id: string, updates: Partial<UIMessage>) => void;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  appendToLastMessage: (content: string) => void;
  updateToolInvocation: (
    messageId: string,
    toolCallId: string,
    updates: ToolInvocationUpdate
  ) => void;
}

export type ChatStore = ChatStoreState & ChatStoreActions;

export type {
  UIMessage,
  MessagePart,
  ToolInvocationPart,
  ToolState,
};
