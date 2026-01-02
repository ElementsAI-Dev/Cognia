/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidget } from './chat-widget';

// Mock useChatWidget hook
const mockHide = jest.fn();
const mockSetInputValue = jest.fn();
const mockHandleSubmit = jest.fn();
const mockHandleKeyDown = jest.fn();
const mockClearMessages = jest.fn();
const mockNewSession = jest.fn();
const mockUpdateConfig = jest.fn();
const mockSetPinned = jest.fn();
const mockStop = jest.fn();
const mockRegenerate = jest.fn();

const mockUseChatWidget: {
  isVisible: boolean;
  isLoading: boolean;
  error: string | null;
  messages: Array<{ id: string; role: string; content: string }>;
  inputValue: string;
  config: {
    width: number;
    height: number;
    x: number | null;
    y: number | null;
    rememberPosition: boolean;
    startMinimized: boolean;
    opacity: number;
    shortcut: string;
    pinned: boolean;
    provider: string;
    model: string;
    systemPrompt: string;
    maxMessages: number;
    showTimestamps: boolean;
    soundEnabled: boolean;
    autoFocus: boolean;
  };
  inputRef: { current: HTMLTextAreaElement | null };
  hide: jest.Mock;
  setInputValue: jest.Mock;
  handleSubmit: jest.Mock;
  handleKeyDown: jest.Mock;
  clearMessages: jest.Mock;
  newSession: jest.Mock;
  updateConfig: jest.Mock;
  setPinned: jest.Mock;
  stop: jest.Mock;
  regenerate: jest.Mock;
} = {
  isVisible: true,
  isLoading: false,
  error: null,
  messages: [],
  inputValue: '',
  config: {
    width: 420,
    height: 600,
    x: null,
    y: null,
    rememberPosition: true,
    startMinimized: false,
    opacity: 1.0,
    shortcut: 'CommandOrControl+Shift+Space',
    pinned: false,
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
    maxMessages: 50,
    showTimestamps: false,
    soundEnabled: false,
    autoFocus: true,
  },
  inputRef: { current: null },
  hide: mockHide,
  setInputValue: mockSetInputValue,
  handleSubmit: mockHandleSubmit,
  handleKeyDown: mockHandleKeyDown,
  clearMessages: mockClearMessages,
  newSession: mockNewSession,
  updateConfig: mockUpdateConfig,
  setPinned: mockSetPinned,
  stop: mockStop,
  regenerate: mockRegenerate,
};

jest.mock('@/hooks/use-chat-widget', () => ({
  useChatWidget: () => mockUseChatWidget,
}));

// Mock store
const mockResetConfig = jest.fn();
const mockSetFeedback = jest.fn();
const mockEditMessage = jest.fn();

jest.mock('@/stores/chat', () => ({
  useChatWidgetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      resetConfig: mockResetConfig,
      setFeedback: mockSetFeedback,
      editMessage: mockEditMessage,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock child components
jest.mock('./chat-widget-header', () => ({
  ChatWidgetHeader: ({ onClose, onNewSession, onClearMessages, onTogglePin, onSettings, onExport }: {
    onClose: () => void;
    onNewSession: () => void;
    onClearMessages: () => void;
    onTogglePin: () => void;
    onSettings?: () => void;
    onExport?: () => void;
  }) => (
    <div data-testid="chat-widget-header">
      <button data-testid="close-btn" onClick={onClose}>Close</button>
      <button data-testid="new-session-btn" onClick={onNewSession}>New Session</button>
      <button data-testid="clear-messages-btn" onClick={onClearMessages}>Clear</button>
      <button data-testid="toggle-pin-btn" onClick={onTogglePin}>Pin</button>
      {onSettings && <button data-testid="settings-btn" onClick={onSettings}>Settings</button>}
      {onExport && <button data-testid="export-btn" onClick={onExport}>Export</button>}
    </div>
  ),
}));

jest.mock('./chat-widget-messages', () => ({
  ChatWidgetMessages: ({ messages, isLoading, error, onRegenerate, onFeedback, onEdit, onContinue }: {
    messages: unknown[];
    isLoading: boolean;
    error: string | null;
    onRegenerate?: (id: string) => void;
    onFeedback?: (id: string, feedback: string) => void;
    onEdit?: (id: string, content: string) => void;
    onContinue?: () => void;
  }) => (
    <div data-testid="chat-widget-messages">
      <span data-testid="message-count">{messages.length}</span>
      <span data-testid="loading-state">{isLoading.toString()}</span>
      {error && <span data-testid="error-state">{error}</span>}
      {onRegenerate && <button data-testid="regenerate-btn" onClick={() => onRegenerate('msg-1')}>Regenerate</button>}
      {onFeedback && <button data-testid="feedback-btn" onClick={() => onFeedback('msg-1', 'like')}>Feedback</button>}
      {onEdit && <button data-testid="edit-btn" onClick={() => onEdit('msg-1', 'new content')}>Edit</button>}
      {onContinue && <button data-testid="continue-btn" onClick={onContinue}>Continue</button>}
    </div>
  ),
}));

jest.mock('./chat-widget-input', () => ({
  ChatWidgetInput: React.forwardRef<HTMLTextAreaElement, {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onStop?: () => void;
    isLoading: boolean;
    disabled: boolean;
  }>(function ChatWidgetInput({ value, onChange, onSubmit, onKeyDown, onStop, isLoading }, ref) {
    return (
      <div data-testid="chat-widget-input">
        <textarea
          ref={ref}
          data-testid="input-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button data-testid="submit-btn" onClick={onSubmit}>Submit</button>
        {isLoading && onStop && <button data-testid="stop-btn" onClick={onStop}>Stop</button>}
      </div>
    );
  }),
}));

jest.mock('./chat-widget-settings', () => ({
  ChatWidgetSettings: ({ open, onOpenChange, onUpdateConfig, onResetConfig }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: unknown;
    onUpdateConfig: (config: unknown) => void;
    onResetConfig: () => void;
  }) => (
    open ? (
      <div data-testid="chat-widget-settings">
        <button data-testid="settings-close-btn" onClick={() => onOpenChange(false)}>Close Settings</button>
        <button data-testid="settings-update-btn" onClick={() => onUpdateConfig({})}>Update</button>
        <button data-testid="settings-reset-btn" onClick={onResetConfig}>Reset</button>
      </div>
    ) : null
  ),
}));

jest.mock('./chat-widget-suggestions', () => ({
  ChatWidgetSuggestions: ({ onSelect }: { onSelect: (prompt: string) => void }) => (
    <div data-testid="chat-widget-suggestions">
      <button data-testid="suggestion-btn" onClick={() => onSelect('Test prompt')}>Suggestion</button>
    </div>
  ),
}));

describe('ChatWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock values
    mockUseChatWidget.messages = [];
    mockUseChatWidget.isLoading = false;
    mockUseChatWidget.error = null;
    mockUseChatWidget.inputValue = '';
    mockUseChatWidget.config.pinned = false;
  });

  it('renders without crashing', () => {
    render(<ChatWidget />);
    expect(screen.getByTestId('chat-widget-header')).toBeInTheDocument();
    expect(screen.getByTestId('chat-widget-messages')).toBeInTheDocument();
    expect(screen.getByTestId('chat-widget-input')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ChatWidget className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls hide when close button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('close-btn'));
    expect(mockHide).toHaveBeenCalled();
  });

  it('calls newSession when new session button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('new-session-btn'));
    expect(mockNewSession).toHaveBeenCalled();
  });

  it('calls clearMessages when clear button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('clear-messages-btn'));
    expect(mockClearMessages).toHaveBeenCalled();
  });

  it('calls setPinned when pin button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('toggle-pin-btn'));
    expect(mockSetPinned).toHaveBeenCalledWith(true);
  });

  it('toggles pinned state correctly', () => {
    mockUseChatWidget.config.pinned = true;
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('toggle-pin-btn'));
    expect(mockSetPinned).toHaveBeenCalledWith(false);
  });

  it('opens settings when settings button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('settings-btn'));
    expect(screen.getByTestId('chat-widget-settings')).toBeInTheDocument();
  });

  it('displays suggestions when no messages', () => {
    render(<ChatWidget />);
    expect(screen.getByTestId('chat-widget-suggestions')).toBeInTheDocument();
  });

  it('hides suggestions when messages exist', () => {
    mockUseChatWidget.messages = [{ id: '1', role: 'user', content: 'Hello' }];
    render(<ChatWidget />);
    expect(screen.queryByTestId('chat-widget-suggestions')).not.toBeInTheDocument();
  });

  it('hides suggestions when loading', () => {
    mockUseChatWidget.isLoading = true;
    render(<ChatWidget />);
    expect(screen.queryByTestId('chat-widget-suggestions')).not.toBeInTheDocument();
  });

  it('calls setInputValue when suggestion is selected', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('suggestion-btn'));
    expect(mockSetInputValue).toHaveBeenCalledWith('Test prompt');
  });

  it('calls handleSubmit when submit button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('submit-btn'));
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('calls stop when stop button is clicked during loading', () => {
    mockUseChatWidget.isLoading = true;
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('stop-btn'));
    expect(mockStop).toHaveBeenCalled();
  });

  it('calls regenerate when regenerate button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('regenerate-btn'));
    expect(mockRegenerate).toHaveBeenCalledWith('msg-1');
  });

  it('calls setFeedback when feedback button is clicked', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('feedback-btn'));
    expect(mockSetFeedback).toHaveBeenCalledWith('msg-1', 'like');
  });

  it('calls editMessage and handleSubmit when edit is performed', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('edit-btn'));
    expect(mockEditMessage).toHaveBeenCalledWith('msg-1', 'new content');
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('handles continue action correctly', () => {
    render(<ChatWidget />);
    fireEvent.click(screen.getByTestId('continue-btn'));
    expect(mockSetInputValue).toHaveBeenCalledWith('请继续');
    expect(mockHandleSubmit).toHaveBeenCalled();
  });

  it('passes correct props to messages component', () => {
    mockUseChatWidget.messages = [{ id: '1', role: 'user', content: 'Hello' }];
    mockUseChatWidget.isLoading = true;
    render(<ChatWidget />);
    
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
  });

  it('displays error state in messages', () => {
    mockUseChatWidget.error = 'Something went wrong';
    render(<ChatWidget />);
    expect(screen.getByTestId('error-state')).toHaveTextContent('Something went wrong');
  });

  it('calls resetConfig when reset button is clicked in settings', () => {
    render(<ChatWidget />);
    // Open settings first
    fireEvent.click(screen.getByTestId('settings-btn'));
    // Click reset
    fireEvent.click(screen.getByTestId('settings-reset-btn'));
    expect(mockResetConfig).toHaveBeenCalled();
  });

  it('calls updateConfig when update button is clicked in settings', () => {
    render(<ChatWidget />);
    // Open settings first
    fireEvent.click(screen.getByTestId('settings-btn'));
    // Click update
    fireEvent.click(screen.getByTestId('settings-update-btn'));
    expect(mockUpdateConfig).toHaveBeenCalled();
  });
});

describe('ChatWidget - Keyboard interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls hide when Escape key is pressed', () => {
    render(<ChatWidget />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockHide).toHaveBeenCalled();
  });
});

describe('ChatWidget - Export functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseChatWidget.messages = [];
  });

  it('displays export button in header when messages exist', () => {
    mockUseChatWidget.messages = [{ id: '1', role: 'user', content: 'Hello' }];
    render(<ChatWidget />);
    expect(screen.getByTestId('export-btn')).toBeInTheDocument();
  });
});
