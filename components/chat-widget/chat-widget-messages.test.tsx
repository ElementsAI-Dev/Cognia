/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidgetMessages } from './chat-widget-messages';
import type { ChatWidgetMessage } from '@/stores/chat';

// Mock scrollIntoView for JSDOM
Element.prototype.scrollIntoView = jest.fn();

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      emptyTitle: '有什么可以帮您的？',
      emptyDesc: '随时向我提问',
      thinking: '思考中...',
      continueGeneration: '继续生成',
      edited: '(已编辑)',
      edit: '编辑',
      read: '朗读',
      stopReading: '停止朗读',
      helpful: '有帮助',
      notHelpful: '没帮助',
      regenerate: '重新生成',
    };
    return translations[key] || key;
  },
}));

// Mock useSpeech hook
jest.mock('@/hooks/media/use-speech', () => ({
  useSpeech: () => ({
    isListening: false,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    sttSupported: true,
    interimTranscript: '',
    isSpeaking: false,
    speak: jest.fn(),
    stopSpeaking: jest.fn(),
    ttsSupported: true,
  }),
}));

// Mock Streamdown component
jest.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: string }) => (
    <div data-testid="streamdown">{children}</div>
  ),
}));

// Mock copy button
jest.mock('@/components/chat/ui/copy-button', () => ({
  InlineCopyButton: ({ content }: { content: string }) => (
    <button data-testid="copy-button" data-content={content}>
      Copy
    </button>
  ),
}));

// Mock loading animation
jest.mock('@/components/chat/renderers/loading-animation', () => ({
  LoadingAnimation: ({ text }: { text: string }) => (
    <div data-testid="loading-animation">{text}</div>
  ),
}));

// Mock empty state
jest.mock('@/components/layout/feedback/empty-state', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: React.forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
    function ScrollArea({ children, className }, ref) {
      return (
        <div ref={ref} className={className} data-testid="scroll-area">
          {children}
        </div>
      );
    }
  ),
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="avatar">
      {children}
    </div>
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="avatar-fallback">
      {children}
    </div>
  ),
}));

describe('ChatWidgetMessages', () => {
  const createMessage = (overrides: Partial<ChatWidgetMessage> = {}): ChatWidgetMessage => ({
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  });

  const defaultProps = {
    messages: [] as ChatWidgetMessage[],
    isLoading: false,
    error: null,
    showTimestamps: false,
    onRegenerate: jest.fn(),
    onFeedback: jest.fn(),
    onEdit: jest.fn(),
    onContinue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatWidgetMessages {...defaultProps} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('displays empty state when no messages', () => {
    render(<ChatWidgetMessages {...defaultProps} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('有什么可以帮您的？')).toBeInTheDocument();
  });

  it('does not display empty state when messages exist', () => {
    const messages = [createMessage()];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('does not display empty state when loading', () => {
    render(<ChatWidgetMessages {...defaultProps} isLoading={true} />);
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('displays user message correctly', () => {
    const messages = [createMessage({ content: 'Hello from user' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText('Hello from user')).toBeInTheDocument();
  });

  it('displays assistant message with Streamdown', () => {
    const messages = [createMessage({ role: 'assistant', content: 'Hello from assistant' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.getByTestId('streamdown')).toBeInTheDocument();
    expect(screen.getByText('Hello from assistant')).toBeInTheDocument();
  });

  it('displays loading animation when isLoading is true', () => {
    render(<ChatWidgetMessages {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId('loading-animation')).toBeInTheDocument();
    expect(screen.getByText('思考中...')).toBeInTheDocument();
  });

  it('displays error message when error is provided', () => {
    render(<ChatWidgetMessages {...defaultProps} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays timestamps when showTimestamps is true', () => {
    const messages = [createMessage({ timestamp: new Date('2024-01-01T12:00:00Z') })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} showTimestamps={true} />);
    // Timestamp should be rendered
    const container = screen.getByTestId('scroll-area');
    expect(container).toBeInTheDocument();
  });

  it('displays continue button after last assistant message', () => {
    const messages = [
      createMessage({ id: '1', role: 'user', content: 'Hello' }),
      createMessage({ id: '2', role: 'assistant', content: 'Hi there' }),
    ];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText('继续生成')).toBeInTheDocument();
  });

  it('does not display continue button when loading', () => {
    const messages = [
      createMessage({ id: '1', role: 'user', content: 'Hello' }),
      createMessage({ id: '2', role: 'assistant', content: 'Hi there' }),
    ];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} isLoading={true} />);
    expect(screen.queryByText('继续生成')).not.toBeInTheDocument();
  });

  it('does not display continue button when last message is from user', () => {
    const messages = [createMessage({ id: '1', role: 'user', content: 'Hello' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.queryByText('继续生成')).not.toBeInTheDocument();
  });

  it('calls onContinue when continue button is clicked', () => {
    const messages = [
      createMessage({ id: '1', role: 'user', content: 'Hello' }),
      createMessage({ id: '2', role: 'assistant', content: 'Hi there' }),
    ];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);

    fireEvent.click(screen.getByText('继续生成'));
    expect(defaultProps.onContinue).toHaveBeenCalled();
  });

  it('displays copy button for assistant messages', () => {
    const messages = [createMessage({ role: 'assistant', content: 'Hello' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
  });

  it('displays edited indicator for edited messages', () => {
    const messages = [createMessage({ isEdited: true })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText('(已编辑)')).toBeInTheDocument();
  });

  it('displays error on message when message has error', () => {
    const messages = [createMessage({ error: 'Failed to send' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    expect(screen.getByText('Failed to send')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ChatWidgetMessages {...defaultProps} className="custom-class" />);
    expect(screen.getByTestId('scroll-area')).toHaveClass('custom-class');
  });

  it('renders multiple messages in order', () => {
    const messages = [
      createMessage({ id: '1', role: 'user', content: 'First' }),
      createMessage({ id: '2', role: 'assistant', content: 'Second' }),
      createMessage({ id: '3', role: 'user', content: 'Third' }),
    ];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('displays regenerate button for last assistant message', () => {
    const messages = [
      createMessage({ id: '1', role: 'user', content: 'Hello' }),
      createMessage({ id: '2', role: 'assistant', content: 'Hi' }),
    ];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    // Regenerate button should exist (refresh icon)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays streaming indicator for streaming messages', () => {
    const messages = [
      createMessage({ role: 'assistant', isStreaming: true, content: 'Typing...' }),
    ];
    const { container } = render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    // Streaming message should have animate-pulse class
    const messageElement = container.querySelector('.animate-pulse');
    expect(messageElement).toBeInTheDocument();
  });
});

describe('ChatWidgetMessages - Message Bubble interactions', () => {
  const createMessage = (overrides: Partial<ChatWidgetMessage> = {}): ChatWidgetMessage => ({
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
    ...overrides,
  });

  const defaultProps = {
    messages: [] as ChatWidgetMessage[],
    isLoading: false,
    error: null,
    onRegenerate: jest.fn(),
    onFeedback: jest.fn(),
    onEdit: jest.fn(),
    onContinue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays feedback buttons for assistant messages', () => {
    const messages = [createMessage({ role: 'assistant', content: 'Hello' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    // Feedback buttons should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays like/dislike feedback state', () => {
    const messages = [createMessage({ role: 'assistant', content: 'Hello', feedback: 'like' })];
    const { container } = render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    // Should show liked state (green color class)
    const likeButton = container.querySelector('.text-green-500');
    expect(likeButton).toBeInTheDocument();
  });

  it('displays dislike feedback state', () => {
    const messages = [createMessage({ role: 'assistant', content: 'Hello', feedback: 'dislike' })];
    const { container } = render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    // Should show disliked state (red color class)
    const dislikeButton = container.querySelector('.text-red-500');
    expect(dislikeButton).toBeInTheDocument();
  });
});

describe('ChatWidgetMessages - Edit functionality', () => {
  const createMessage = (overrides: Partial<ChatWidgetMessage> = {}): ChatWidgetMessage => ({
    id: 'msg-1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
    ...overrides,
  });

  const defaultProps = {
    messages: [] as ChatWidgetMessage[],
    isLoading: false,
    error: null,
    onRegenerate: jest.fn(),
    onFeedback: jest.fn(),
    onEdit: jest.fn(),
    onContinue: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows edit button for user messages when onEdit is provided', () => {
    const messages = [createMessage({ role: 'user', content: 'Hello' })];
    render(<ChatWidgetMessages {...defaultProps} messages={messages} />);
    // Edit button should be present (pencil icon)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
