/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionItem } from './suggestion-item';

const mockSuggestion = {
  id: 'sugg-1',
  type: 'improve' as const,
  explanation: 'Consider improving variable naming',
  originalText: 'const x = 1;',
  suggestedText: 'const count = 1;',
  range: { startLine: 1, endLine: 1 },
  status: 'pending' as const,
};

const mockHandlers = {
  onApply: jest.fn(),
  onReject: jest.fn(),
};

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} className={className} data-testid={className?.includes('h-9') || className?.includes('h-8') ? 'touch-target-button' : ''} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className} data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      apply: 'Apply',
      dismiss: 'Dismiss',
      applied: 'Applied',
      dismissed: 'Dismissed',
      viewChanges: 'View changes',
      original: 'Original',
      suggested: 'Suggested',
    };
    return translations[key] || key;
  },
}));

jest.mock('lucide-react', () => ({
  Bug: () => <span data-testid="bug-icon">🐛</span>,
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
  MessageSquare: () => <span data-testid="message-icon">💬</span>,
  Edit3: () => <span data-testid="edit-icon">✏️</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
  X: () => <span data-testid="x-icon">✗</span>,
  ChevronDown: () => <span data-testid="chevron-icon">▼</span>,
}));

describe('SuggestionItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders suggestion with explanation', () => {
    render(
      <SuggestionItem
        suggestion={mockSuggestion}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Consider improving variable naming')).toBeInTheDocument();
  });

  it('displays suggestion type badge', () => {
    render(
      <SuggestionItem
        suggestion={mockSuggestion}
        {...mockHandlers}
      />
    );
    const typeBadge = screen.getByText('improve');
    expect(typeBadge).toBeInTheDocument();
  });

  it('calls onApply when clicking Apply button', () => {
    render(
      <SuggestionItem
        suggestion={mockSuggestion}
        {...mockHandlers}
      />
    );
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);
    expect(mockHandlers.onApply).toHaveBeenCalledWith('sugg-1');
  });

  it('calls onReject when clicking Dismiss button', () => {
    render(
      <SuggestionItem
        suggestion={mockSuggestion}
        {...mockHandlers}
      />
    );
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    expect(mockHandlers.onReject).toHaveBeenCalledWith('sugg-1');
  });

  it('does not show action buttons when status is accepted', () => {
    const acceptedSuggestion = { ...mockSuggestion, status: 'accepted' as const };
    render(
      <SuggestionItem
        suggestion={acceptedSuggestion}
        {...mockHandlers}
      />
    );
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('does not show action buttons when status is rejected', () => {
    const rejectedSuggestion = { ...mockSuggestion, status: 'rejected' as const };
    render(
      <SuggestionItem
        suggestion={rejectedSuggestion}
        {...mockHandlers}
      />
    );
    expect(screen.queryByText('Apply')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss')).not.toBeInTheDocument();
    expect(screen.getByText('Dismissed')).toBeInTheDocument();
  });

  it('renders collapsible diff view when originalText and suggestedText exist', () => {
    render(
      <SuggestionItem
        suggestion={mockSuggestion}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('View changes')).toBeInTheDocument();
  });

  it('displays line range when provided', () => {
    render(
      <SuggestionItem
        suggestion={mockSuggestion}
        {...mockHandlers}
      />
    );
    expect(screen.getByText(/lines 1/)).toBeInTheDocument();
  });

  describe('Touch Target Accessibility', () => {
    it('renders Apply and Dismiss buttons with h-9 height', () => {
      render(
        <SuggestionItem
          suggestion={mockSuggestion}
          {...mockHandlers}
        />
      );
      const applyButton = screen.getByText('Apply').closest('button');
      const dismissButton = screen.getByText('Dismiss').closest('button');
      expect(applyButton).toHaveClass('h-9');
      expect(dismissButton).toHaveClass('h-9');
    });

    it('renders View Changes button with h-8 height', () => {
      render(
        <SuggestionItem
          suggestion={mockSuggestion}
          {...mockHandlers}
        />
      );
      const viewChangesButton = screen.getByText('View changes').closest('button');
      expect(viewChangesButton).toHaveClass('h-8');
    });
  });

  describe('Mobile Code Font Sizes', () => {
    it('applies responsive font sizes to diff view content', () => {
      render(
        <SuggestionItem
          suggestion={mockSuggestion}
          {...mockHandlers}
        />
      );
      // The collapsible content should have responsive font sizes
      const collapsibleContent = document.querySelector('.text-xs.sm\\:text-sm');
      expect(collapsibleContent).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('shows opacity-50 when status is accepted', () => {
      const acceptedSuggestion = { ...mockSuggestion, status: 'accepted' as const };
      const { container } = render(
        <SuggestionItem
          suggestion={acceptedSuggestion}
          {...mockHandlers}
        />
      );
      const suggestionCard = container.firstChild as HTMLElement;
      expect(suggestionCard).toHaveClass('opacity-50');
    });

    it('shows opacity-30 and line-through when status is rejected', () => {
      const rejectedSuggestion = { ...mockSuggestion, status: 'rejected' as const };
      const { container } = render(
        <SuggestionItem
          suggestion={rejectedSuggestion}
          {...mockHandlers}
        />
      );
      const suggestionCard = container.firstChild as HTMLElement;
      expect(suggestionCard).toHaveClass('opacity-30');
      expect(suggestionCard).toHaveClass('line-through');
    });
  });

  describe('Suggestion Types', () => {
    it('renders fix type suggestion', () => {
      const fixSuggestion = { ...mockSuggestion, type: 'fix' as const };
      render(
        <SuggestionItem
          suggestion={fixSuggestion}
          {...mockHandlers}
        />
      );
      expect(screen.getByTestId('bug-icon')).toBeInTheDocument();
      expect(screen.getByText('fix')).toBeInTheDocument();
    });

    it('renders comment type suggestion', () => {
      const commentSuggestion = { ...mockSuggestion, type: 'comment' as const };
      render(
        <SuggestionItem
          suggestion={commentSuggestion}
          {...mockHandlers}
        />
      );
      expect(screen.getByTestId('message-icon')).toBeInTheDocument();
      expect(screen.getByText('comment')).toBeInTheDocument();
    });

    it('renders edit type suggestion', () => {
      const editSuggestion = { ...mockSuggestion, type: 'edit' as const };
      render(
        <SuggestionItem
          suggestion={editSuggestion}
          {...mockHandlers}
        />
      );
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByText('edit')).toBeInTheDocument();
    });
  });

  describe('Code Diff Preview', () => {
    it('displays original code snippet', () => {
      render(
        <SuggestionItem
          suggestion={mockSuggestion}
          {...mockHandlers}
        />
      );
      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('displays suggested code snippet', () => {
      render(
        <SuggestionItem
          suggestion={mockSuggestion}
          {...mockHandlers}
        />
      );
      expect(screen.getByText('const count = 1;')).toBeInTheDocument();
    });
  });
});
