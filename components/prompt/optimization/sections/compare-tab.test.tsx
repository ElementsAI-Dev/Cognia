/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompareTab } from './compare-tab';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock lib
jest.mock('@/lib/ai/prompts/prompt-self-optimizer', () => ({
  // Type export only, no runtime needed
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} {...props} data-testid="textarea" />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('CompareTab', () => {
  const defaultProps = {
    templateContent: 'Original prompt text',
    optimizedContent: 'Optimized prompt text',
    comparison: null,
    selectedSuggestions: new Set<string>(),
    allSuggestions: [] as { id: string; description: string; type: string; priority: 'high' | 'medium' | 'low' }[],
    showDiff: true,
    copied: false,
    onOptimizedContentChange: jest.fn(),
    onShowDiffToggle: jest.fn(),
    onCopy: jest.fn(),
    onReset: jest.fn(),
    onBack: jest.fn(),
    onApply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders optimized content textarea', () => {
    render(<CompareTab {...defaultProps} />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('Optimized prompt text');
  });

  it('shows original content when showDiff is true', () => {
    render(<CompareTab {...defaultProps} />);
    expect(screen.getByText('Original prompt text')).toBeInTheDocument();
  });

  it('hides original content when showDiff is false', () => {
    render(<CompareTab {...defaultProps} showDiff={false} />);
    expect(screen.queryByText('Original prompt text')).not.toBeInTheDocument();
  });

  it('calls onShowDiffToggle when toggle button clicked', () => {
    render(<CompareTab {...defaultProps} />);
    fireEvent.click(screen.getByText('hideOriginal'));
    expect(defaultProps.onShowDiffToggle).toHaveBeenCalled();
  });

  it('shows showOriginal text when diff is hidden', () => {
    render(<CompareTab {...defaultProps} showDiff={false} />);
    expect(screen.getByText('showOriginal')).toBeInTheDocument();
  });

  it('calls onCopy when copy button clicked', () => {
    render(<CompareTab {...defaultProps} />);
    // Find copy button (the one without text, just icon)
    const buttons = screen.getAllByRole('button');
    const copyBtn = buttons.find(b => !b.textContent?.includes('Original') && !b.textContent?.includes('startOver') && !b.textContent?.includes('back') && !b.textContent?.includes('apply') && !b.textContent?.includes('hide'));
    if (copyBtn) {
      fireEvent.click(copyBtn);
      expect(defaultProps.onCopy).toHaveBeenCalled();
    }
  });

  it('calls onReset when start over button clicked', () => {
    render(<CompareTab {...defaultProps} />);
    fireEvent.click(screen.getByText('startOver'));
    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it('calls onBack when back button clicked', () => {
    render(<CompareTab {...defaultProps} />);
    fireEvent.click(screen.getByText('back'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('calls onApply when apply button clicked', () => {
    render(<CompareTab {...defaultProps} />);
    fireEvent.click(screen.getByText('apply'));
    expect(defaultProps.onApply).toHaveBeenCalled();
  });

  it('disables apply when optimizedContent is empty', () => {
    render(<CompareTab {...defaultProps} optimizedContent="" />);
    const applyBtn = screen.getByText('apply').closest('button');
    expect(applyBtn).toBeDisabled();
  });

  it('calls onOptimizedContentChange when textarea changes', () => {
    render(<CompareTab {...defaultProps} />);
    fireEvent.change(screen.getByTestId('textarea'), { target: { value: 'New text' } });
    expect(defaultProps.onOptimizedContentChange).toHaveBeenCalledWith('New text');
  });

  it('displays comparison metrics when provided', () => {
    const comparison = [
      { metric: 'clarity', original: 50, optimized: 80, improvement: 30, improvementPercent: 60 },
      { metric: 'specificity', original: 40, optimized: 70, improvement: 30, improvementPercent: 75 },
    ];
    render(<CompareTab {...defaultProps} comparison={comparison} />);
    expect(screen.getByText('clarity')).toBeInTheDocument();
    expect(screen.getByText('specificity')).toBeInTheDocument();
  });

  it('shows applied suggestions when selected', () => {
    const allSuggestions = [
      { id: 's1', description: 'Add examples', type: 'examples', priority: 'high' as const },
      { id: 's2', description: 'Improve clarity', type: 'clarity', priority: 'medium' as const },
    ];
    render(<CompareTab {...defaultProps} allSuggestions={allSuggestions} selectedSuggestions={new Set(['s1'])} />);
    expect(screen.getByText('examples')).toBeInTheDocument();
  });
});
