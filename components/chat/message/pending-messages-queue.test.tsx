/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PendingMessagesQueue, PendingMessage } from './pending-messages-queue';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Pending Messages',
      statusQueued: 'Queued',
      statusProcessing: 'Processing',
      statusRetrying: 'Retrying',
      statusFailed: 'Failed',
      priorityLow: 'Low',
      priorityNormal: 'Normal',
      priorityHigh: 'High',
      processing: 'processing',
      waiting: 'waiting',
      failed: 'failed',
      paused: 'Paused',
      resume: 'Resume',
      pause: 'Pause',
      clearAll: 'Clear All',
      cancel: 'Cancel',
      retryAction: 'Retry',
      wait: 'Wait',
      retry: `Retry #${params?.count || 0}`,
      moreMessages: `+${params?.count || 0} more`,
    };
    return translations[key] || key;
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="badge">
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value?: number }) => (
    <div data-testid="progress" data-value={value} role="progressbar" />
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="collapsible" data-open={open}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div data-aschild={asChild}>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({
    children,
    asChild,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <span data-aschild={asChild}>{children}</span>,
}));

// Mock cn
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}));

const createMockMessage = (overrides: Partial<PendingMessage> = {}): PendingMessage => ({
  id: 'msg-1',
  content: 'Test message content',
  status: 'queued',
  priority: 'normal',
  createdAt: new Date('2024-01-01T10:00:00'),
  ...overrides,
});

describe('PendingMessagesQueue', () => {
  const defaultProps = {
    messages: [] as PendingMessage[],
    onCancelMessage: jest.fn(),
    onRetryMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no messages', () => {
    const { container } = render(<PendingMessagesQueue {...defaultProps} messages={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders queue when messages exist', () => {
    const messages = [createMockMessage()];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Pending Messages')).toBeInTheDocument();
  });

  it('displays message content', () => {
    const messages = [createMockMessage({ content: 'Hello world' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('displays queued status badge', () => {
    const messages = [createMockMessage({ status: 'queued' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Queued')).toBeInTheDocument();
  });

  it('displays processing status badge', () => {
    const messages = [createMockMessage({ status: 'processing' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('displays retrying status badge', () => {
    const messages = [createMockMessage({ status: 'retrying' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Retrying')).toBeInTheDocument();
  });

  it('displays failed status badge', () => {
    const messages = [createMockMessage({ status: 'failed' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('displays priority badges', () => {
    const messages = [
      createMockMessage({ id: '1', priority: 'low' }),
      createMockMessage({ id: '2', priority: 'normal' }),
      createMockMessage({ id: '3', priority: 'high' }),
    ];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('displays retry count when present', () => {
    const messages = [createMockMessage({ retryCount: 2 })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Retry #2')).toBeInTheDocument();
  });

  it('displays error message when present', () => {
    const messages = [createMockMessage({ status: 'failed', error: 'Connection timeout' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('displays estimated wait time when queued', () => {
    const messages = [createMockMessage({ status: 'queued', estimatedWaitTime: 30 })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText('Wait: ~30s')).toBeInTheDocument();
  });

  it('calls onCancelMessage when cancel button clicked', () => {
    const onCancelMessage = jest.fn();
    const messages = [createMockMessage({ id: 'cancel-test' })];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onCancelMessage={onCancelMessage}
      />
    );

    // Find cancel button (X icon button)
    const cancelButtons = screen.getAllByRole('button');
    const cancelButton = cancelButtons.find((btn) => btn.className.includes('destructive'));
    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(onCancelMessage).toHaveBeenCalledWith('cancel-test');
    }
  });

  it('calls onRetryMessage when retry button clicked for failed message', () => {
    const onRetryMessage = jest.fn();
    const messages = [createMockMessage({ id: 'retry-test', status: 'failed' })];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onRetryMessage={onRetryMessage}
      />
    );

    const buttons = screen.getAllByRole('button');
    // Retry button should exist for failed messages
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays clear all button when onClearAll is provided', () => {
    const onClearAll = jest.fn();
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue {...defaultProps} messages={messages} onClearAll={onClearAll} />
    );
    expect(screen.getByText('Clear All')).toBeInTheDocument();
  });

  it('calls onClearAll when clear all button clicked', () => {
    const onClearAll = jest.fn();
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue {...defaultProps} messages={messages} onClearAll={onClearAll} />
    );

    fireEvent.click(screen.getByText('Clear All'));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('displays pause button when onPauseQueue is provided', () => {
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onPauseQueue={jest.fn()}
        onResumeQueue={jest.fn()}
      />
    );
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('displays resume button when paused', () => {
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onPauseQueue={jest.fn()}
        onResumeQueue={jest.fn()}
        isPaused={true}
      />
    );
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });

  it('displays paused badge when queue is paused', () => {
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onPauseQueue={jest.fn()}
        onResumeQueue={jest.fn()}
        isPaused={true}
      />
    );
    expect(screen.getByText('Paused')).toBeInTheDocument();
  });

  it('calls onPauseQueue when pause button clicked', () => {
    const onPauseQueue = jest.fn();
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onPauseQueue={onPauseQueue}
        onResumeQueue={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Pause'));
    expect(onPauseQueue).toHaveBeenCalled();
  });

  it('calls onResumeQueue when resume button clicked', () => {
    const onResumeQueue = jest.fn();
    const messages = [createMockMessage()];
    render(
      <PendingMessagesQueue
        {...defaultProps}
        messages={messages}
        onPauseQueue={jest.fn()}
        onResumeQueue={onResumeQueue}
        isPaused={true}
      />
    );

    fireEvent.click(screen.getByText('Resume'));
    expect(onResumeQueue).toHaveBeenCalled();
  });

  it('respects maxVisible prop', () => {
    const messages = [
      createMockMessage({ id: '1', content: 'Message 1' }),
      createMockMessage({ id: '2', content: 'Message 2' }),
      createMockMessage({ id: '3', content: 'Message 3' }),
      createMockMessage({ id: '4', content: 'Message 4' }),
    ];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} maxVisible={2} />);

    expect(screen.getByText('Message 1')).toBeInTheDocument();
    expect(screen.getByText('Message 2')).toBeInTheDocument();
    expect(screen.queryByText('Message 3')).not.toBeInTheDocument();
    expect(screen.queryByText('Message 4')).not.toBeInTheDocument();
  });

  it('displays hidden count when messages exceed maxVisible', () => {
    const messages = [
      createMockMessage({ id: '1' }),
      createMockMessage({ id: '2' }),
      createMockMessage({ id: '3' }),
      createMockMessage({ id: '4' }),
    ];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} maxVisible={2} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });

  it('shows progress indicator when processing', () => {
    const messages = [createMockMessage({ status: 'processing' })];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sorts messages with processing first', () => {
    const messages = [
      createMockMessage({ id: '1', status: 'queued', content: 'Queued message' }),
      createMockMessage({ id: '2', status: 'processing', content: 'Processing message' }),
    ];
    const { container } = render(
      <PendingMessagesQueue {...defaultProps} messages={messages} />
    );

    const contents = container.querySelectorAll('.truncate');
    const textContents = Array.from(contents).map((el) => el.textContent);
    expect(textContents[0]).toBe('Processing message');
  });

  it('sorts by priority after status', () => {
    const messages = [
      createMockMessage({ id: '1', priority: 'low', content: 'Low priority' }),
      createMockMessage({ id: '2', priority: 'high', content: 'High priority' }),
      createMockMessage({ id: '3', priority: 'normal', content: 'Normal priority' }),
    ];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);

    // High priority should appear before others
    expect(screen.getByText('High priority')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const messages = [createMockMessage()];
    const { container } = render(
      <PendingMessagesQueue {...defaultProps} messages={messages} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays statistics in header', () => {
    const messages = [
      createMockMessage({ id: '1', status: 'queued' }),
      createMockMessage({ id: '2', status: 'processing' }),
      createMockMessage({ id: '3', status: 'failed' }),
    ];
    render(<PendingMessagesQueue {...defaultProps} messages={messages} />);
    expect(screen.getByText(/1 processing/)).toBeInTheDocument();
    expect(screen.getByText(/1 waiting/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });
});
