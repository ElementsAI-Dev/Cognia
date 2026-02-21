/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatContainer } from './chat-container';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
let mockSessionMode: 'chat' | 'agent' | 'research' | 'learning' = 'chat';
let mockExternalAgentId: string | undefined;
let mockExternalAgentSessionId: string | undefined;
let mockExternalChatFailurePolicy: 'fallback' | 'strict' = 'fallback';
const mockUpdateSession = jest.fn();

const buildMockSession = () => ({
  id: 'session-1',
  title: 'Test Session',
  provider: 'openai',
  model: 'gpt-4o',
  mode: mockSessionMode,
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,
  webSearchEnabled: false,
  thinkingEnabled: false,
  activeBranchId: 'branch-1',
  projectId: null,
  externalAgentId: mockExternalAgentId,
  externalAgentSessionId: mockExternalAgentSessionId,
});

const mockMessages = [
  { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
  { id: 'msg-2', role: 'assistant', content: 'Hi there!', createdAt: new Date() },
];

// Stable mock references to prevent infinite re-renders
const mockScrollRef = { current: null as HTMLDivElement | null };
const mockScrollToBottom = jest.fn();
const mockStickToBottomContext = {
  isAtBottom: true,
  scrollToBottom: mockScrollToBottom,
  scrollRef: mockScrollRef,
};

// Stable hook return values
const mockAddMessage = jest.fn();
const mockUpdateMessage = jest.fn();
const mockDeleteMessagesAfter = jest.fn();
const mockClearMessages = jest.fn();
const mockAppendToMessage = jest.fn();
const mockCreateStreamingMessage = jest.fn(() => ({ id: 'stream-1', role: 'assistant', content: '' }));
const mockCopyMessagesForBranch = jest.fn();
const mockMessagesHook = {
  messages: mockMessages,
  isLoading: false,
  isInitialized: true,
  addMessage: mockAddMessage,
  updateMessage: mockUpdateMessage,
  deleteMessagesAfter: mockDeleteMessagesAfter,
  clearMessages: mockClearMessages,
  appendToMessage: mockAppendToMessage,
  createStreamingMessage: mockCreateStreamingMessage,
  copyMessagesForBranch: mockCopyMessagesForBranch,
};

const mockAgentRun = jest.fn();
const mockAgentStop = jest.fn();
const mockAgentReset = jest.fn();
const mockAgentHook = {
  isRunning: false,
  currentStep: 0,
  error: null,
  toolCalls: [],
  run: mockAgentRun,
  stop: mockAgentStop,
  reset: mockAgentReset,
};
const mockExternalAgentExecute = jest.fn();
const mockExternalAgentSetActiveAgent = jest.fn();
const mockExternalAgentCheckHealth = jest.fn();
const mockExternalAgentConnect = jest.fn();
const mockExternalAgentCancel = jest.fn();
const mockExternalRespondToPermission = jest.fn();
const mockExternalSetConfigOption = jest.fn();
const mockExternalAgentHook: Record<string, unknown> = {
  execute: mockExternalAgentExecute,
  setActiveAgent: mockExternalAgentSetActiveAgent,
  checkHealth: mockExternalAgentCheckHealth,
  connect: mockExternalAgentConnect,
  cancel: mockExternalAgentCancel,
  pendingPermission: null,
  respondToPermission: mockExternalRespondToPermission,
  availableCommands: [],
  planEntries: [],
  planStep: null,
  configOptions: [],
  setConfigOption: mockExternalSetConfigOption,
  isExecuting: false,
};

const mockProjectContextHook = { hasKnowledge: false };

const mockTTSSpeak = jest.fn();
const mockTTSStop = jest.fn();
const mockTTSHook = {
  speak: mockTTSSpeak,
  stop: mockTTSStop,
  isSpeaking: false,
  isSupported: true,
};

// Stable AI lib mocks
const mockSendMessage = jest.fn();
const mockAIChatStop = jest.fn();
const mockAIChatHook = {
  sendMessage: mockSendMessage,
  stop: mockAIChatStop,
};

const mockSelectModel = jest.fn(() => ({ provider: 'openai', model: 'gpt-4o', reason: 'default' }));
const mockAutoRouterHook = {
  selectModel: mockSelectModel,
};

const mockCheckIntent = jest.fn(() => Promise.resolve(null));
const mockIntentDetectionHook = { checkIntent: mockCheckIntent };

const mockCheckFeatureIntent = jest.fn(() =>
  Promise.resolve({
    detected: false,
    feature: null,
    confidence: 0,
    matchedPatterns: [],
    reason: '',
    reasonZh: '',
    alternatives: [],
  })
);
const mockFeatureRoutingHook = { checkFeatureIntent: mockCheckFeatureIntent };

const mockGenerateChatSummary = jest.fn();
const mockSummaryHook = { generateChatSummary: mockGenerateChatSummary };

const mockVerifySource = jest.fn();
const mockSourceVerificationHook = { verifySource: mockVerifySource, isVerifying: false };

jest.mock('@/stores', () => ({
  useSessionStore: (selector: (state: unknown) => unknown) => {
    const session = buildMockSession();
    const state = {
      sessions: [session],
      activeSessionId: 'session-1',
      setActiveSession: jest.fn(),
      getSession: jest.fn(() => session),
      getActiveSession: jest.fn(() => session),
      createSession: jest.fn(() => session),
      updateSession: mockUpdateSession,
      getViewMode: jest.fn(() => 'list'),
      getFlowCanvasState: jest.fn(() => undefined),
      getBranches: jest.fn(() => [{ id: 'branch-1', name: 'Main', isActive: true }]),
    };
    return selector ? selector(state) : state;
  },
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key', enabled: true },
        tavily: { apiKey: 'tavily-key' },
      },
      simplifiedModeSettings: { enabled: false, preset: 'default' },
      autoRouterSettings: { 
        enabled: false, 
        showRoutingIndicator: false,
        tier: 'balanced',
      },
      customInstructionsEnabled: true,
      aboutUser: '',
      responsePreferences: '',
      customInstructions: '',
      chatHistoryContextSettings: {
        enabled: true,
        maxMessages: 10,
        maxTokens: 4000,
      },
      sourceVerification: { enabled: false },
      streamingEnabled: true,
      speechSettings: {
        ttsEnabled: false,
        ttsAutoPlay: false,
      },
      defaultTemperature: 0.7,
      defaultMaxTokens: 2048,
      defaultTopP: 1,
      defaultFrequencyPenalty: 0,
      defaultPresencePenalty: 0,
      addAlwaysAllowedTool: jest.fn(),
      alwaysAllowedTools: [],
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
  useSkillStore: (selector: (state: unknown) => unknown) => {
    const state = {
      skills: {},
      activeSkillIds: [],
      getActiveSkills: jest.fn(() => []),
    };
    return selector ? selector(state) : state;
  },
  useCustomThemeStore: (selector: (state: unknown) => unknown) => {
    const state = {
      themes: [],
      activeThemeId: null,
    };
    return selector ? selector(state) : state;
  },
  useArtifactStore: (selector: (state: unknown) => unknown) => {
    const state = {
      artifacts: [],
      openPanel: jest.fn(),
      panelOpen: false,
      closePanel: jest.fn(),
      selectedArtifactId: null,
      selectArtifact: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
  useUIStore: (selector: (state: unknown) => unknown) => {
    const state = {
      sidebarOpen: true,
      setSidebarOpen: jest.fn(),
      rightPanelOpen: false,
      setRightPanelOpen: jest.fn(),
      activeTab: 'chat',
      setActiveTab: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
  useToolApprovalStore: (selector: (state: unknown) => unknown) => {
    const state = {
      pendingApprovals: [],
      addApproval: jest.fn(),
      removeApproval: jest.fn(),
      approveAll: jest.fn(),
      rejectAll: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
  useExternalAgentStore: (selector: (state: unknown) => unknown) => {
    const state = {
      chatFailurePolicy: mockExternalChatFailurePolicy,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/skills', () => ({
  useSkillStore: (selector: (state: unknown) => unknown) => {
    const state = {
      skills: {},
      activeSkillIds: [],
      getActiveSkills: jest.fn(() => []),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/stores/workflow', () => ({
  useWorkflowStore: (selector: (state: unknown) => unknown) => {
    const state = {
      presentations: {},
      activePresentationId: null,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock hooks with stable references
jest.mock('@/hooks', () => ({
  useMessages: () => mockMessagesHook,
  useAgent: () => mockAgentHook,
  useExternalAgent: () => mockExternalAgentHook,
  useProjectContext: () => mockProjectContextHook,
  calculateTokenBreakdown: jest.fn(() => ({
    systemPrompt: 0,
    messages: 0,
    attachments: 0,
    total: 0,
    limit: 128000,
    percent: 0,
  })),
  useTTS: () => mockTTSHook,
}));

// Mock AI lib with stable references
jest.mock('@/lib/ai', () => ({
  useAIChat: () => mockAIChatHook,
  useAutoRouter: () => mockAutoRouterHook,
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
  findMatchingSkills: jest.fn(() => []),
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
jest.mock('../message', () => ({
  ErrorMessage: ({ error, onDismiss }: { error: string; onDismiss: () => void }) => (
    <div data-testid="error-message" onClick={onDismiss}>{error}</div>
  ),
  MessageReactions: () => <div data-testid="message-reactions">Reactions</div>,
  QuotedContent: () => null,
}));

jest.mock('./chat-header', () => ({
  ChatHeader: ({ sessionId }: { sessionId?: string }) => (
    <header data-testid="chat-header" data-session={sessionId}>Header</header>
  ),
}));

jest.mock('../chat-input', () => ({
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

jest.mock('../welcome/welcome-state', () => ({
  WelcomeState: ({ mode, onSuggestionClick }: { mode: string; onSuggestionClick: (s: string) => void }) => (
    <div data-testid="welcome-state" data-mode={mode}>
      <button onClick={() => onSuggestionClick('Hello')}>Suggestion</button>
    </div>
  ),
}));

jest.mock('../dialogs/ai-settings-dialog', () => ({
  AISettingsDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="ai-settings-dialog">AI Settings</div> : null,
}));

jest.mock('../dialogs/model-picker-dialog', () => ({
  ModelPickerDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="model-picker-dialog">Model Picker</div> : null,
}));

jest.mock('../dialogs/context-settings-dialog', () => ({
  ContextSettingsDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="context-settings-dialog">Context Settings</div> : null,
}));

jest.mock('@/components/prompt', () => ({
  PromptOptimizerDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="prompt-optimizer-dialog">Prompt Optimizer</div> : null,
  PromptOptimizationHub: ({ open }: { open: boolean }) =>
    open ? <div data-testid="prompt-optimization-hub">Prompt Optimization Hub</div> : null,
}));

jest.mock('../dialogs/preset-manager-dialog', () => ({
  PresetManagerDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="preset-manager-dialog">Preset Manager</div> : null,
}));

jest.mock('../selectors/branch-selector', () => ({
  BranchButton: () => <button data-testid="branch-button">Branch</button>,
}));

jest.mock('../popovers/text-selection-popover', () => ({
  TextSelectionPopover: () => null,
}));

// QuotedContent is mocked in ../message above

jest.mock('../message-parts', () => ({
  TextPart: ({ part }: { part: { content: string } }) => <span>{part.content}</span>,
  ReasoningPart: () => <div>Reasoning</div>,
  ToolPart: () => <div>Tool</div>,
  SourcesPart: () => <div>Sources</div>,
  A2UIPart: () => <div>A2UI</div>,
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
  ToolApprovalDialog: ({
    open,
    request,
    onOpenChange,
    onDeny,
    onSelectOption,
  }: {
    open: boolean;
    request?: { id?: string };
    onOpenChange: (open: boolean) => void;
    onDeny: (id: string) => void;
    onSelectOption?: (id: string, optionId: string) => void;
  }) =>
    open ? (
      <div data-testid="tool-approval-dialog">
        <button
          data-testid="tool-option-select"
          onClick={() => onSelectOption?.(request?.id || 'request-id', 'allow_once')}
        >
          Option
        </button>
        <button data-testid="tool-deny" onClick={() => onDeny(request?.id || 'request-id')}>
          Deny
        </button>
        <button data-testid="tool-close" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/agent/workflow-selector', () => ({
  WorkflowSelector: ({ open }: { open: boolean }) => 
    open ? <div data-testid="workflow-selector">Workflow</div> : null,
}));

jest.mock('@/components/ppt', () => ({
  PPTPreview: () => <div data-testid="ppt-preview">PPT</div>,
}));

jest.mock('@/components/skills', () => ({
  SkillSuggestions: () => <div data-testid="skill-suggestions">Skills</div>,
}));

jest.mock('@/components/learning', () => ({
  LearningModePanel: () => <div data-testid="learning-panel">Learning</div>,
  LearningStartDialog: ({ open }: { open: boolean }) => 
    open ? <div data-testid="learning-dialog">Learning Dialog</div> : null,
}));

jest.mock('@/components/search/source-verification-dialog', () => ({
  SourceVerificationDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="source-verification-dialog">Source Verification</div> : null,
}));

jest.mock('@/components/a2ui', () => ({
  A2UIMessageRenderer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  hasA2UIContent: jest.fn(() => false),
  useA2UIMessageIntegration: () => ({ processMessage: jest.fn() }),
}));

jest.mock('@/components/artifacts', () => ({
  MessageArtifacts: () => <div data-testid="message-artifacts">Artifacts</div>,
  MessageAnalysisResults: () => (
    <div data-testid="message-analysis-results">Analysis Results</div>
  ),
}));

// ../message mock is defined earlier in the file

jest.mock('../ui/quick-reply-bar', () => ({
  QuickReplyBar: () => <div data-testid="quick-reply-bar">Quick Reply</div>,
}));

jest.mock('../ui/workflow-indicator', () => ({
  WorkflowIndicator: () => <div data-testid="workflow-indicator">Workflow</div>,
}));

jest.mock('../ui/keyboard-shortcuts-handler', () => ({
  useKeyboardShortcuts: () => {},
}));

jest.mock('../ui/carried-context-banner', () => ({
  CarriedContextBanner: () => null,
}));

jest.mock('../ui/mode-switch-suggestion', () => ({
  ModeSwitchSuggestion: () => null,
}));

jest.mock('../ui/feature-navigation-dialog', () => ({
  FeatureNavigationDialog: () => null,
}));

jest.mock('../ui/routing-indicator', () => ({
  RoutingIndicator: () => null,
}));

jest.mock('../ui/message-swipe-actions', () => ({
  MessageSwipeActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../goal', () => ({
  ChatGoalBanner: () => null,
}));

jest.mock('../workflow/workflow-picker-dialog', () => ({
  WorkflowPickerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="workflow-picker">Workflow Picker</div> : null,
}));

jest.mock('../workflow/workflow-result-card', () => ({
  WorkflowResultCard: () => <div data-testid="workflow-result">Workflow Result</div>,
}));

jest.mock('../flow', () => ({
  FlowChatCanvas: () => <div data-testid="flow-canvas">Flow Canvas</div>,
}));

jest.mock('@/stores/agent/custom-mode-store', () => ({
  useCustomModeStore: () => ({
    customModes: [],
    getCustomMode: jest.fn(() => null),
  }),
  processPromptTemplateVariables: jest.fn((prompt: string) => prompt),
}));

jest.mock('@/hooks/chat/use-intent-detection', () => ({
  useIntentDetection: () => mockIntentDetectionHook,
}));

jest.mock('@/hooks/chat/use-feature-routing', () => ({
  useFeatureRouting: () => mockFeatureRoutingHook,
}));

jest.mock('@/hooks/chat', () => ({
  useSummary: () => mockSummaryHook,
}));

jest.mock('@/hooks/search/use-source-verification', () => ({
  useSourceVerification: () => mockSourceVerificationHook,
}));

jest.mock('use-stick-to-bottom', () => ({
  useStickToBottomContext: () => mockStickToBottomContext,
}));

jest.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }: { data: unknown[]; itemContent: (index: number, item: unknown) => React.ReactNode }) => (
    <div data-testid="virtuoso">
      {data?.map((item, index) => (
        <div key={index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  mockSessionMode = 'chat';
  mockExternalAgentId = undefined;
  mockExternalAgentSessionId = undefined;
  mockExternalChatFailurePolicy = 'fallback';
  mockExternalAgentHook.pendingPermission = null;
  mockExternalAgentHook.isExecuting = false;
  mockExternalRespondToPermission.mockImplementation(async () => {
    mockExternalAgentHook.pendingPermission = null;
  });
  mockUpdateSession.mockReset();
});

describe('ChatContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('switches learning sub-mode to speedpass without feature-routing interruption', async () => {
    mockSessionMode = 'learning';
    mockCheckFeatureIntent.mockClear();
    mockUpdateSession.mockClear();

    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: '明天考试，帮我速通过高数并刷题' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockUpdateSession).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          learningContext: expect.objectContaining({
            subMode: 'speedpass',
          }),
        })
      );
    });

    expect(mockCheckFeatureIntent).toHaveBeenCalledWith('明天考试，帮我速通过高数并刷题');
    expect(mockCheckFeatureIntent).toHaveBeenCalledTimes(1);
  });

  it('routes agent execution through external agent and persists external session id', async () => {
    mockSessionMode = 'agent';
    mockExternalAgentId = 'external-agent-1';
    mockExternalAgentSessionId = 'external-session-old';
    mockAgentRun.mockReset();
    mockExternalAgentCheckHealth.mockResolvedValueOnce(true);
    mockExternalAgentExecute.mockResolvedValueOnce({
      success: true,
      finalResponse: 'External response',
      sessionId: 'external-session-new',
      messages: [],
      steps: [],
      toolCalls: [],
      duration: 12,
    });

    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Run externally' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockExternalAgentSetActiveAgent).toHaveBeenCalledWith('external-agent-1');
    });

    expect(mockExternalAgentExecute).toHaveBeenCalledWith(
      'Run externally',
      expect.objectContaining({
        sessionId: 'external-session-old',
      })
    );
    expect(mockAgentRun).not.toHaveBeenCalled();
    expect(mockUpdateSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        externalAgentSessionId: 'external-session-new',
      })
    );
  });

  it('falls back to built-in agent when external execution fails', async () => {
    mockSessionMode = 'agent';
    mockExternalAgentId = 'external-agent-1';
    mockAgentRun.mockResolvedValueOnce({
      success: true,
      finalResponse: 'Built-in fallback response',
      steps: [],
      totalSteps: 1,
      duration: 20,
    });
    mockExternalAgentCheckHealth.mockResolvedValueOnce(true);
    mockExternalAgentExecute.mockRejectedValueOnce(new Error('External failure'));

    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Fallback request' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockAgentRun).toHaveBeenCalledWith('Fallback request');
    });
  });

  it('does not fall back when failure policy is strict', async () => {
    mockSessionMode = 'agent';
    mockExternalAgentId = 'external-agent-1';
    mockExternalChatFailurePolicy = 'strict';
    mockAgentRun.mockClear();
    mockExternalAgentCheckHealth.mockResolvedValueOnce(true);
    mockExternalAgentExecute.mockRejectedValueOnce(new Error('External failure strict'));

    render(<ChatContainer sessionId="session-1" />);
    const input = screen.getByTestId('input-field');
    const sendButton = screen.getByTestId('send-button');

    fireEvent.change(input, { target: { value: 'Strict request' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockExternalAgentExecute).toHaveBeenCalledWith(
        'Strict request',
        expect.objectContaining({})
      );
    });
    expect(mockAgentRun).not.toHaveBeenCalled();
  });

  it('responds to ACP permission option selection', async () => {
    mockExternalAgentHook.pendingPermission = {
      id: 'permission-id-1',
      requestId: 'request-id-1',
      title: 'Read file',
      reason: 'Need workspace access',
      riskLevel: 'medium',
      rawInput: { path: 'README.md' },
      toolInfo: {
        name: 'read_file',
        description: 'Read a file',
      },
      options: [
        {
          optionId: 'allow_once',
          kind: 'allow_once',
          name: 'Allow once',
          isDefault: true,
        },
      ],
    };

    render(<ChatContainer sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('tool-approval-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('tool-option-select'));

    await waitFor(() => {
      expect(mockExternalRespondToPermission).toHaveBeenCalledWith({
        requestId: 'request-id-1',
        granted: true,
        optionId: 'allow_once',
      });
    });
  });

  it('auto-denies permission request when timeout is reached', async () => {
    mockExternalAgentHook.pendingPermission = {
      id: 'permission-timeout-id',
      requestId: 'request-timeout-id',
      title: 'Run command',
      reason: 'Requires execution permission',
      riskLevel: 'high',
      rawInput: { command: 'echo hi' },
      toolInfo: {
        name: 'shell_execute',
        description: 'Run shell command',
      },
      autoApproveTimeout: 10,
    };

    render(<ChatContainer sessionId="session-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('tool-approval-dialog')).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(20);
    });

    await waitFor(() => {
      expect(mockExternalRespondToPermission).toHaveBeenCalledWith({
        requestId: 'request-timeout-id',
        granted: false,
        reason: 'Permission request timed out',
      });
    });
  });

  it('stops external execution when stop is clicked', () => {
    mockSessionMode = 'agent';
    mockExternalAgentHook.isExecuting = true;

    render(<ChatContainer sessionId="session-1" />);
    fireEvent.click(screen.getByTestId('stop-button'));

    expect(mockExternalAgentCancel).toHaveBeenCalled();
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
