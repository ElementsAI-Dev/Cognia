/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionsTab } from './suggestions-tab';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="card" onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} data-testid="checkbox" />
  ),
}));

jest.mock('@/components/ui/empty', () => ({
  Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <span data-testid="loader">Loading...</span>,
}));

describe('SuggestionsTab', () => {
  const mockSuggestions = [
    { id: 's1', description: 'Add examples', type: 'examples', priority: 'high' as const },
    { id: 's2', description: 'Improve clarity', type: 'clarity', priority: 'medium' as const },
    { id: 's3', description: 'Add constraints', type: 'constraints', priority: 'low' as const, suggestedText: 'Be specific' },
  ];

  const defaultProps = {
    allSuggestions: mockSuggestions,
    selectedSuggestions: new Set<string>(),
    isOptimizing: false,
    onToggleSuggestion: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onOptimize: jest.fn(),
    onBack: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all suggestions', () => {
    render(<SuggestionsTab {...defaultProps} />);
    expect(screen.getByText('Add examples')).toBeInTheDocument();
    expect(screen.getByText('Improve clarity')).toBeInTheDocument();
    expect(screen.getByText('Add constraints')).toBeInTheDocument();
  });

  it('displays selection count', () => {
    render(<SuggestionsTab {...defaultProps} />);
    expect(screen.getByText(/0 \/ 3/)).toBeInTheDocument();
  });

  it('displays updated selection count', () => {
    render(<SuggestionsTab {...defaultProps} selectedSuggestions={new Set(['s1', 's2'])} />);
    expect(screen.getByText(/2 \/ 3/)).toBeInTheDocument();
  });

  it('renders select all button', () => {
    render(<SuggestionsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('selectAll'));
    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });

  it('renders deselect all button', () => {
    render(<SuggestionsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('deselectAll'));
    expect(defaultProps.onDeselectAll).toHaveBeenCalled();
  });

  it('calls onBack when back button clicked', () => {
    render(<SuggestionsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('back'));
    expect(defaultProps.onBack).toHaveBeenCalled();
  });

  it('disables optimize when no suggestions selected', () => {
    render(<SuggestionsTab {...defaultProps} />);
    const optimizeBtn = screen.getByText('optimize').closest('button');
    expect(optimizeBtn).toBeDisabled();
  });

  it('enables optimize when suggestions are selected', () => {
    render(<SuggestionsTab {...defaultProps} selectedSuggestions={new Set(['s1'])} />);
    const optimizeBtn = screen.getByText('optimize').closest('button');
    expect(optimizeBtn).not.toBeDisabled();
  });

  it('calls onOptimize when optimize button clicked', () => {
    render(<SuggestionsTab {...defaultProps} selectedSuggestions={new Set(['s1'])} />);
    fireEvent.click(screen.getByText('optimize'));
    expect(defaultProps.onOptimize).toHaveBeenCalled();
  });

  it('shows loading state when optimizing', () => {
    render(<SuggestionsTab {...defaultProps} isOptimizing selectedSuggestions={new Set(['s1'])} />);
    expect(screen.getByText('optimizing')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('shows empty state when no suggestions', () => {
    render(<SuggestionsTab {...defaultProps} allSuggestions={[]} />);
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByText('noSuggestions')).toBeInTheDocument();
  });

  it('shows suggested text when available', () => {
    render(<SuggestionsTab {...defaultProps} />);
    expect(screen.getByText('Be specific')).toBeInTheDocument();
  });

  it('displays priority badges', () => {
    render(<SuggestionsTab {...defaultProps} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });
});
