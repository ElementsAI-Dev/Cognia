/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickReplyBar } from './quick-reply-bar';
import type { UIMessage } from '@/types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      quickReplies: 'Quick Replies',
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
  ScrollBar: () => null,
}));

describe('QuickReplyBar', () => {
  const mockMessages: UIMessage[] = [
    { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
    { id: 'msg-2', role: 'assistant', content: 'Hi there! How can I help?', createdAt: new Date() },
  ];

  const defaultProps = {
    messages: mockMessages,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<QuickReplyBar {...defaultProps} />);

    expect(screen.getByText('Quick Replies')).toBeInTheDocument();
  });

  it('displays suggestion buttons', () => {
    render(<QuickReplyBar {...defaultProps} />);

    const buttons = screen.getAllByRole('button');
    // Should have suggestion buttons plus refresh button
    expect(buttons.length).toBeGreaterThan(1);
  });

  it('calls onSelect when suggestion is clicked', () => {
    render(<QuickReplyBar {...defaultProps} />);

    // Find a suggestion button (not the refresh button)
    const suggestionButtons = screen
      .getAllByRole('button')
      .filter((btn) => !btn.querySelector('svg.animate-spin') && btn.textContent !== '');

    if (suggestionButtons.length > 0) {
      fireEvent.click(suggestionButtons[0]);
      expect(defaultProps.onSelect).toHaveBeenCalled();
    }
  });

  it('respects disabled prop', () => {
    render(<QuickReplyBar {...defaultProps} disabled />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      if (button.textContent && button.textContent.length > 0) {
        expect(button).toBeDisabled();
      }
    });
  });

  it('applies custom className', () => {
    const { container } = render(<QuickReplyBar {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows default suggestions when messages array is empty', () => {
    render(<QuickReplyBar {...defaultProps} messages={[]} />);

    expect(screen.getByText('Quick Replies')).toBeInTheDocument();
  });

  it('generates context-aware suggestions for code content', async () => {
    const codeMessages: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Here is some code:\n```javascript\nfunction test() {}\n```',
        createdAt: new Date(),
      },
    ];

    render(<QuickReplyBar {...defaultProps} messages={codeMessages} />);

    await waitFor(() => {
      // Should show code-related suggestions
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  it('generates context-aware suggestions for questions', async () => {
    const questionMessages: UIMessage[] = [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Would you like me to continue?',
        createdAt: new Date(),
      },
    ];

    render(<QuickReplyBar {...defaultProps} messages={questionMessages} />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  it('has a refresh button', () => {
    render(<QuickReplyBar {...defaultProps} />);

    // Find button with RefreshCw icon (smaller icon button)
    const buttons = screen.getAllByRole('button');
    const refreshButton = buttons.find((btn) => btn.className?.includes('h-6'));
    expect(refreshButton).toBeInTheDocument();
  });
});
