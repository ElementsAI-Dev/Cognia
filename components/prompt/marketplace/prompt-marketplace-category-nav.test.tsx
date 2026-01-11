/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptMarketplaceCategoryNav } from './prompt-marketplace-category-nav';

// Mock UI components
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
  ScrollBar: () => null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} data-variant={variant} {...props}>{children}</button>
  ),
}));

// Mock types
jest.mock('@/types/content/prompt-marketplace', () => ({
  MARKETPLACE_CATEGORIES: [
    { id: 'writing', name: 'Writing', icon: '✍️' },
    { id: 'coding', name: 'Coding', icon: '💻' },
    { id: 'analysis', name: 'Analysis', icon: '📊' },
  ],
}));

describe('PromptMarketplaceCategoryNav', () => {
  const defaultProps = {
    selected: 'all' as const,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<PromptMarketplaceCategoryNav {...defaultProps} />);
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
  });

  it('renders All category button', () => {
    render(<PromptMarketplaceCategoryNav {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('renders category buttons', () => {
    render(<PromptMarketplaceCategoryNav {...defaultProps} />);
    
    expect(screen.getByText('Writing')).toBeInTheDocument();
    expect(screen.getByText('Coding')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
  });

  it('calls onSelect when All is clicked', () => {
    render(<PromptMarketplaceCategoryNav {...defaultProps} />);
    
    fireEvent.click(screen.getByText('All'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('all');
  });

  it('calls onSelect when category is clicked', () => {
    render(<PromptMarketplaceCategoryNav {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Writing'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('writing');
  });

  it('highlights selected category', () => {
    render(<PromptMarketplaceCategoryNav {...defaultProps} selected="writing" />);
    
    const writingButton = screen.getByText('Writing').closest('button');
    expect(writingButton).toHaveAttribute('data-variant', 'default');
  });

  it('shows counts when provided', () => {
    const showCounts = { all: 100, writing: 30, coding: 40, analysis: 30 };
    render(<PromptMarketplaceCategoryNav {...defaultProps} showCounts={showCounts} />);
    
    expect(screen.getByText('(100)')).toBeInTheDocument();
    expect(screen.getByText('(30)')).toBeInTheDocument();
  });
});
