import { nanoid } from 'nanoid';
import type { ChatWidgetConfig, ChatWidgetState } from './types';

export const DEFAULT_CONFIG: ChatWidgetConfig = {
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

export const initialState: ChatWidgetState = {
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
