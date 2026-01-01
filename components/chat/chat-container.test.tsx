/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatContainer } from './chat-container';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockSession = {
  id: 'session-1',
  title: 'Test Session',
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat' as const,
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  webSearchEnabled: false,
  thinkingEnabled: false,
  activeBranchId: 'branch-1',
  projectId: null,
};

const mockMessages = [
  { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
  { id: 'msg-2', role: 'assistant', content: 'Hi there!', createdAt: new Date() },
];

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => {
    const state = {
      sessions: [mockSession],
      activeSessionId: 'session-1',
      setActiveSession: jest.fn(),
      getSession: jest.fn(() => mockSession),
      getActiveSession: jest.fn(() => mockSession),
      createSession: jest.fn(() => mockSession),
      updateSession: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key', enabled: true },
        tavily: { apiKey: 'tavily-key' },
      },
    };
    return selector ? selector(state) : state;
  },
  usePresetStore: (selector: (state: unknown) => unknown) => {
    const state = {
      usePreset: jest.fn(),
      presets: [],
    };
    return selector ? selector(state) : state;
  },
  useMcpStore: (selector: (state: unknown) => unknown) => {
    const state = {
      callTool: jest.fn(),
      servers: [],
      initialize: jest.fn(),
      isInitialized: true,
    };
    return selector ? selector(state) : state;
  },
  useAgentStore: (selector: (state: unknown) => unknown) => {
    const state = {
      isAgentRunning: false,
      toolExecutions: [],
      addToolExecution: jest.fn(),
      completeToolExecution: jest.fn(),
      failToolExecution: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
  useProjectStore: (selector: (state: unknown) => unknown) => {
    const state = {
      getProject: jest.fn(() => null),
    };
    return selector ? selector(state) : state;
  },
  useQuoteStore: (selector: (state: unknown) => unknown) => {
    const state = {
      getFormattedQuotes: jest.fn(() => ''),
      clearQuotes: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
  useLearningStore: () => ({
    getLearningSessionByChat: jest.fn(() => null),
  }),
  useCustomThemeStore: (selector: (state: unknown) => unknown) => {
    const state = {
      themes: [],
      activeThemeId: null,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/skill-store', () => ({
  useSkillStore: (selector: (state: unknown) => unknown) => {
    const state = {
      getActiveSkills: jest.fn(() => []),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/workflow-store', () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => {
    const state = {
      presentations: {},
      activePresentationId: null,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock hooks
jest.mock('@/hooks', () => ({
  useMessages: () => ({
    messages: mockMessages,
    isLoading: false,
    isInitialized: true,
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessagesAfter: jest.fn(),
    clearMessages: jest.fn(),
    appendToMessage: jest.fn(),
    createStreamingMessage: jest.fn(() => ({ id: 'stream-1', role: 'assistant', content: '' })),
    copyMessagesForBranch: jest.fn(),
  }),
  useAgent: () => ({
    isRunning: false,
    currentStep: 0,
    error: null,
    toolCalls: [],
    run: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  }),
  useProjectContext: () => ({
    hasKnowledge: false,
  }),
}));

// Mock AI lib
jest.mock('@/lib/ai', () => ({
  useAIChat: () => ({
    sendMessage: jest.fn(),
    stop: jest.fn(),
  }),
  useAutoRouter: () => ({
    selectModel: jest.fn(() => ({ provider: 'openai', model: 'gpt-4o', reason: 'default' })),
  }),
  isVisionModel: jest.fn(() => false),
  buildMultimodalContent: jest.fn(),
}));

jest.mock('@/lib/ai/agent', () => ({
  initializeAgentTools: jest.fn(() => ({})),
}));

jest.mock('@/lib/ai/generation/suggestion-generator', () => ({
  generateSuggestions: jest.fn(),
  getDefaultSuggestions: jest.fn(() => []),
}));

jest.mock('@/lib/ai/generation/translate', () => ({
  translateText: jest.fn(),
}));

jest.mock('@/lib/skills/executor', () => ({
  buildProgressiveSkillsPrompt: jest.fn(() => ({ prompt: '', level: 0, tokenEstimate: 0 })),
}));

// Mock database
jest.mock('@/lib/db', () => ({
  messageRepository: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock provider types
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { defaultModel: 'gpt-4o' },
  },
}));

// Mock child components
jest.mock('./error-message', () => ({
  ErrorMessage: ({ error, onDismiss }: { error: string; onDismiss: () => void }) => (
    <div data-testid="error-message" onClick={onDismiss}>{error}</div>
  ),
}));

jest.mock('./chat-header', () => ({
  ChatHeader: ({ sessionId }: { sessionId?: string }) => (
    <header data-testid="chat-header" data-session={sessionId}>Header</header>
  ),
}));

jest.mock('./chat-input', () => ({
  ChatInput: ({ 
    value, 
    onChange, 
    onSubmit, 
    isLoading, 
    onStop,
    modeName,
    modelName,
  }: { 
    value: string; 
    onChange: (v: string) => void; 
    onSubmit: (content: string) => void;
    isLoading: boolean;
    onStop: () => void;
    modeName: string;
    modelName: string;
  }) => (
    <div data-testid="chat-input">
      <input 
        data-testid="input-field"
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type a message..."
      />
      <button 
        data-testid="send-button"
        onClick={() => onSubmit(value)}
        disabled={isLoading || !value.trim()}
      >
        Send
      </button>
      <button data-testid="stop-button" onClick={onStop}>Stop</button>
      <span data-testid="mode-name">{modeName}</span>
      <span data-testid="model-name">{modelName}</span>
    </div>
  ),
}));

jest.mock('./welcome-state', () => ({
  WelcomeState: ({ mode, onSuggestionClick }: { mode: string; onSuggestionClick: (s: string) => void }) => (
    <div data-testid="welcome-state" data-mode={mode}>
      <button onClick={() => onSuggestionClick('Hello')}>Suggestion</button>
    </div>
  ),
}));

jest.mock('./context-settings-dialog', () => ({
  ContextSettingsDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="context-settings-dialog">Context Settings</div> : null,
}));

jest.mock('./prompt-optimizer-dialog', () => ({
  PromptOptimizerDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="prompt-optimizer-dialog">Prompt Optimizer</div> : null,
}));

jest.mock('./preset-manager-dialog', () => ({
  PresetManagerDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="preset-manager-dialog">Preset Manager</div> : null,
}));

jest.mock('./branch-selector', () => ({
  BranchButton: () => <button data-testid="branch-button">Branch</button>,
}));

jest.mock('./text-selection-popover', () => ({
  TextSelectionPopover: () => null,
}));

jest.mock('./quoted-content', () => ({
  QuotedContent: () => null,
}));

jest.mock('./message-parts', () => ({
  TextPart: ({ part }: { part: { content: string } }) => <span>{part.content}</span>,
  ReasoningPart: () => <div>Reasoning</div>,
  ToolPart: () => <div>Tool</div>,
  SourcesPart: () => <div>Sources</div>,
}));

jest.mock('@/components/ai-elements/conversation', () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">{children}</div>
  ),
  ConversationContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation-content">{children}</div>
  ),
  ConversationScrollButton: () => <button data-testid="scroll-button">Scroll</button>,
}));

jest.mock('@/components/ai-elements/message', () => ({
  Message: ({ children, from }: { children: React.ReactNode; from: string }) => (
    <div data-testid={`message-${from}`}>{children}</div>
  ),
  MessageContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-content">{children}</div>
  ),
  MessageResponse: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-response">{children}</div>
  ),
  MessageActions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="message-actions">{children}</div>
  ),
  MessageAction: ({ children, onClick, tooltip }: { children: React.ReactNode; onClick: () => void; tooltip: string }) => (
    <button data-testid={`action-${tooltip}`} onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <span data-testid="loader">Loading...</span>,
}));

jest.mock('@/components/ai-elements/suggestion', () => ({
  Suggestions: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="suggestions">{children}</div>
  ),
  Suggestion: ({ suggestion, onClick }: { suggestion: string; onClick: (s: string) => void }) => (
    <button onClick={() => onClick(suggestion)}>{suggestion}</button>
  ),
}));

jest.mock('@/components/agent/tool-timeline', () => ({
  ToolTimeline: () => <div data-testid="tool-timeline">Timeline</div>,
}));

jest.mock('@/components/agent/tool-approval-dialog', () => ({
  ToolApprovalDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="tool-approval-dialog">Approval</div> : null,
}));

jest.mock('@/components/agent/workflow-selector', () => ({
  WorkflowSelector: ({ open }: { open: boolean }) => 
    open ? <div data-testid="workflow-selector">Workflow</div> : null,
}));

jest.mock('@/components/learning/ppt-preview', () => ({
  PPTPreview: () => <div data-testid="ppt-preview">PPT</div>,
}));

jest.mock('@/components/skills', () => ({
  SkillSuggestions: () => <div data-testid="skill-suggestions">Skills</div>,
}));

describe('ChatContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });

  it('renders chat header with session id', () => {
    render(<ChatContainer sessionId="session-1" />);
    const header = screen.getByTestId('chat-header');
    expect(header).toHaveAttribute('data-session', 'session-1');
  });

  it('renders chat input', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('renders conversation container', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('conversation')).toBeInTheDocument();
  });

  it('renders conversation content with messages', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('conversation-content')).toBeInTheDocument();
  });

  it('displays current model name in input', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('model-name')).toHaveTextContent('gpt-4o');
  });

  it('displays current mode name in input', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('mode-name')).toHaveTextContent('Chat');
  });

  it('renders scroll button', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('scroll-button')).toBeInTheDocument();
  });

  it('updates input value when typing', () => {
    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    fireEvent.change(input, { target: { value: 'New message' } });
    expect(input).toHaveValue('New message');
  });

  it('has send button', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('has stop button', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByTestId('stop-button')).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<ChatContainer sessionId="session-1" />);
    const sendButton = screen.getByTestId('send-button');
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when input has content', () => {
    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('clears input after sending message', () => {
    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);
    
    expect(input).toHaveValue('');
  });

  it('displays messages in conversation', () => {
    render(<ChatContainer sessionId="session-1" />);
    // Messages should be rendered
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('displays branch buttons for messages', () => {
    render(<ChatContainer sessionId="session-1" />);
    const branchButtons = screen.getAllByTestId('branch-button');
    expect(branchButtons.length).toBeGreaterThan(0);
  });

  it('renders without session id', () => {
    render(<ChatContainer />);
    expect(screen.getByTestId('chat-header')).toBeInTheDocument();
  });
});

describe('ChatContainer - Dialogs', () => {
  it('does not show context settings dialog initially', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.queryByTestId('context-settings-dialog')).not.toBeInTheDocument();
  });

  it('does not show prompt optimizer dialog initially', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.queryByTestId('prompt-optimizer-dialog')).not.toBeInTheDocument();
  });

  it('does not show preset manager dialog initially', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.queryByTestId('preset-manager-dialog')).not.toBeInTheDocument();
  });

  it('does not show tool approval dialog initially', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.queryByTestId('tool-approval-dialog')).not.toBeInTheDocument();
  });

  it('does not show workflow selector initially', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.queryByTestId('workflow-selector')).not.toBeInTheDocument();
  });
});

describe('ChatContainer - Error Handling', () => {
  it('does not show error message initially', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });
});

describe('ChatMessageItem', () => {
  it('renders user message content', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders assistant message content', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('shows message actions', () => {
    render(<ChatContainer sessionId="session-1" />);
    const actions = screen.getAllByTestId('message-actions');
    expect(actions.length).toBeGreaterThan(0);
  });
});

describe('MessagePartsRenderer', () => {
  it('renders plain text content for messages without parts', () => {
    render(<ChatContainer sessionId="session-1" />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });
});
