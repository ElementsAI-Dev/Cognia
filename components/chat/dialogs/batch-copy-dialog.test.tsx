/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchCopyDialog } from './batch-copy-dialog';
import type { UIMessage } from '@/types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'Batch Copy',
      description: 'Select messages to copy',
      filter: 'Filter',
      all: 'All',
      user: 'User',
      assistant: 'Assistant',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      outputFormat: 'Output Format',
      plainText: 'Plain Text',
      markdown: 'Markdown',
      json: 'JSON',
      copyMessages: `Copy ${params?.count || 0} messages`,
      copiedMessages: `Copied ${params?.count || 0} messages`,
      selectAtLeastOne: 'Select at least one message',
    };
    return translations[key] || key;
  },
}));

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock use-copy hook
jest.mock('@/hooks/ui/use-copy', () => ({
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue({ success: true }),
    isCopying: false,
  }),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, ...props }: { checked: boolean }) => (
    <input type="checkbox" checked={checked} readOnly {...props} />
  ),
}));

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange: _onValueChange }: { children: React.ReactNode; onValueChange: (v: string) => void }) => (
    <div data-testid="radio-group">{children}</div>
  ),
  RadioGroupItem: ({ value, id }: { value: string; id: string }) => (
    <input type="radio" value={value} id={id} aria-label={value} title={value} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode }) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => (
    <span onClick={onClick} {...props}>{children}</span>
  ),
}));

const createMockMessage = (id: string, role: 'user' | 'assistant', content: string): UIMessage => ({
  id,
  role,
  content,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  parts: [],
});

describe('BatchCopyDialog', () => {
  const mockMessages: UIMessage[] = [
    createMockMessage('1', 'user', 'Hello, how are you?'),
    createMockMessage('2', 'assistant', 'I am doing well, thank you!'),
    createMockMessage('3', 'user', 'What can you help me with?'),
    createMockMessage('4', 'assistant', 'I can help with many things.'),
  ];

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    messages: mockMessages,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<BatchCopyDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('Batch Copy')).toBeInTheDocument();
  });

  it('displays dialog description', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('Select messages to copy')).toBeInTheDocument();
  });

  it('displays all messages', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText(/Hello, how are you/)).toBeInTheDocument();
    expect(screen.getByText(/I am doing well/)).toBeInTheDocument();
  });

  it('displays role filter badges', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    // 'Assistant' appears both in filter and message items
    expect(screen.getAllByText('Assistant').length).toBeGreaterThan(0);
  });

  it('displays format options', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('Plain Text')).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
  });

  it('displays select all button', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('Select All')).toBeInTheDocument();
  });

  it('shows selection count', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText(/0 of 4 selected/)).toBeInTheDocument();
  });

  it('displays copy button with count', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('Copy 0 messages')).toBeInTheDocument();
  });

  it('disables copy button when no messages selected', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    const copyButton = screen.getByText('Copy 0 messages').closest('button');
    expect(copyButton).toBeDisabled();
  });

  it('displays cancel button', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    const onOpenChange = jest.fn();
    render(<BatchCopyDialog {...defaultProps} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByText('cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays message previews truncated', () => {
    const longMessage = createMockMessage('5', 'user', 'A'.repeat(150));
    render(<BatchCopyDialog {...defaultProps} messages={[longMessage]} />);
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it('displays role badges for each message', () => {
    render(<BatchCopyDialog {...defaultProps} />);
    const youBadges = screen.getAllByText('You');
    const assistantBadges = screen.getAllByText('Assistant');
    expect(youBadges.length).toBeGreaterThan(0);
    expect(assistantBadges.length).toBeGreaterThan(0);
  });

  it('handles empty messages array', () => {
    render(<BatchCopyDialog {...defaultProps} messages={[]} />);
    expect(screen.getByText(/0 of 0 selected/)).toBeInTheDocument();
  });
});
