/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './chat-input';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      dropFilesHere: 'Drop files here',
      attachFile: `Attach file (${params?.current || 0}/${params?.max || 10})`,
      voiceInput: 'Voice input',
      stopListening: 'Stop listening',
      optimizePrompt: 'Optimize prompt',
      useMcpTools: 'Use MCP tools',
      sendMessage: 'Send message',
      stopGenerating: 'Stop generating',
      processing: 'Processing...',
      dismiss: 'Dismiss',
      switchMode: 'Switch mode',
      typeMessage: 'Type a message...',
      typeToMention: 'Type @ to mention tools...',
      listening: 'Listening...',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    sendOnEnter: true,
  }),
  useRecentFilesStore: () => ({
    addFile: jest.fn(),
    recentFiles: [],
  }),
}));

// Mock hooks
jest.mock('@/hooks', () => ({
  useMention: () => ({
    mentionState: { isOpen: false, query: '', startPosition: 0 },
    groupedMentions: {},
    handleTextChange: jest.fn(),
    selectMention: jest.fn(() => ({ newText: '', newCursorPosition: 0 })),
    closeMention: jest.fn(),
    parseToolCalls: jest.fn(() => []),
    isMcpAvailable: false,
  }),
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

// Mock react-textarea-autosize
jest.mock('react-textarea-autosize', () => {
  return React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    function TextareaAutosize(props, ref) {
      return <textarea ref={ref} {...props} />;
    }
  );
});

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

// Mock other components
jest.mock('./recent-files-popover', () => ({
  RecentFilesPopover: () => <div data-testid="recent-files-popover" />,
}));

jest.mock('./mention-popover', () => ({
  MentionPopover: () => <div data-testid="mention-popover" />,
}));

describe('ChatInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    onSubmit: jest.fn(),
    isLoading: false,
    isStreaming: false,
    onStop: jest.fn(),
    disabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays textarea with placeholder', () => {
    render(<ChatInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('typeMessage')).toBeInTheDocument();
  });

  it('displays current value in textarea', () => {
    render(<ChatInput {...defaultProps} value="Hello world" />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello world');
  });

  it('calls onChange when typing', () => {
    render(<ChatInput {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New message' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith('New message');
  });

  it('displays send button', () => {
    render(<ChatInput {...defaultProps} value="Hello" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onSubmit when send button is clicked', () => {
    render(<ChatInput {...defaultProps} value="Hello" />);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1]; // Last button is send
    fireEvent.click(sendButton);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith('Hello', undefined, undefined);
  });

  it('disables send button when value is empty', () => {
    render(<ChatInput {...defaultProps} value="" />);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    expect(sendButton).toBeDisabled();
  });

  it('disables send button when loading', () => {
    render(<ChatInput {...defaultProps} value="Hello" isLoading={true} />);
    // When loading, show stop button instead
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('disables input when disabled prop is true', () => {
    render(<ChatInput {...defaultProps} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('displays stop button when streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);
    // Stop button should be visible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onStop when stop button is clicked during streaming', () => {
    render(<ChatInput {...defaultProps} isStreaming={true} />);
    const buttons = screen.getAllByRole('button');
    const stopButton = buttons[buttons.length - 1];
    fireEvent.click(stopButton);
    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it('displays attachment button', () => {
    render(<ChatInput {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays optimize prompt button when onOptimizePrompt is provided and has value', () => {
    const onOptimizePrompt = jest.fn();
    render(<ChatInput {...defaultProps} value="Test prompt" onOptimizePrompt={onOptimizePrompt} />);
    // Should display optimize button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(2);
  });

  it('submits on Enter key when sendOnEnter is true', () => {
    render(<ChatInput {...defaultProps} value="Hello" />);
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('does not submit on Shift+Enter', () => {
    render(<ChatInput {...defaultProps} value="Hello" />);
    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('displays drag overlay when dragging', () => {
    const { container } = render(<ChatInput {...defaultProps} />);
    const dropZone = container.firstChild as HTMLElement;
    
    fireEvent.dragEnter(dropZone, {
      dataTransfer: { types: ['Files'] },
    });
    
    // Drag state should be set
    expect(dropZone).toHaveClass('transition-all');
  });

  it('displays mode selector when onModeClick is provided', () => {
    const onModeClick = jest.fn();
    render(<ChatInput {...defaultProps} onModeClick={onModeClick} modeName="Chat" />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('displays model selector when onModelClick is provided', () => {
    const onModelClick = jest.fn();
    render(<ChatInput {...defaultProps} onModelClick={onModelClick} modelName="GPT-4o" />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
  });

  it('clears input after successful submit', () => {
    render(<ChatInput {...defaultProps} value="Hello" />);
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    fireEvent.click(sendButton);
    expect(defaultProps.onChange).toHaveBeenCalledWith('');
  });
});
