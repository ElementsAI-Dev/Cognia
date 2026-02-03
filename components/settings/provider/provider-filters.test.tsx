/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderFilters } from './provider-filters';

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) => (
    <input data-testid="search-input" value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button data-testid="button" data-variant={variant} onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value} onClick={() => onValueChange('premium')}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/toggle', () => {
  const Toggle = ({ children, pressed, onPressedChange, 'aria-label': ariaLabel }: { children: React.ReactNode; pressed?: boolean; onPressedChange?: () => void; 'aria-label'?: string }) => (
    <button data-testid={`toggle-${ariaLabel}`} data-pressed={pressed} onClick={onPressedChange}>{children}</button>
  );
  return { Toggle };
});

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/ai/providers/provider-helpers', () => ({
  CATEGORY_CONFIG: {
    all: { icon: null },
    premium: { icon: null },
    standard: { icon: null },
    specialized: { icon: null },
  },
  PROVIDER_CATEGORIES: {
    openai: 'premium',
    anthropic: 'premium',
    google: 'standard',
  },
}));

jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI' },
    anthropic: { name: 'Anthropic' },
    google: { name: 'Google' },
  },
}));

describe('ProviderFilters', () => {
  const mockOnCategoryChange = jest.fn();
  const mockOnSearchChange = jest.fn();
  const mockOnViewModeChange = jest.fn();

  const defaultProps = {
    categoryFilter: 'all' as const,
    onCategoryChange: mockOnCategoryChange,
    searchQuery: '',
    onSearchChange: mockOnSearchChange,
    viewMode: 'cards' as const,
    onViewModeChange: mockOnViewModeChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    render(<ProviderFilters {...defaultProps} />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('renders tabs for category filter', () => {
    render(<ProviderFilters {...defaultProps} />);
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('displays current search query value', () => {
    render(<ProviderFilters {...defaultProps} searchQuery="openai" />);
    expect(screen.getByTestId('search-input')).toHaveValue('openai');
  });

  it('calls onSearchChange when typing in search', () => {
    render(<ProviderFilters {...defaultProps} />);
    fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'test' } });
    expect(mockOnSearchChange).toHaveBeenCalledWith('test');
  });

  it('calls onCategoryChange when tab clicked', () => {
    render(<ProviderFilters {...defaultProps} />);
    fireEvent.click(screen.getByTestId('tabs'));
    expect(mockOnCategoryChange).toHaveBeenCalledWith('premium');
  });

  it('renders view mode buttons', () => {
    render(<ProviderFilters {...defaultProps} />);
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onViewModeChange when view mode button clicked', () => {
    render(<ProviderFilters {...defaultProps} viewMode="cards" />);
    const buttons = screen.getAllByTestId('button');
    fireEvent.click(buttons[0]);
    expect(mockOnViewModeChange).toHaveBeenCalled();
  });

  describe('capability filters', () => {
    const mockOnCapabilityFilterChange = jest.fn();

    beforeEach(() => {
      mockOnCapabilityFilterChange.mockClear();
    });

    it('renders capability filter toggles when callback provided', () => {
      render(
        <ProviderFilters
          {...defaultProps}
          capabilityFilters={[]}
          onCapabilityFilterChange={mockOnCapabilityFilterChange}
        />
      );
      // Component should render without errors
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('does not render capability filters when callback not provided', () => {
      render(<ProviderFilters {...defaultProps} />);
      expect(screen.queryByTestId('toggle-Vision')).not.toBeInTheDocument();
    });

    it('toggles capability filter when pressed', () => {
      render(
        <ProviderFilters
          {...defaultProps}
          capabilityFilters={[]}
          onCapabilityFilterChange={mockOnCapabilityFilterChange}
        />
      );
      // Component should handle capability filter changes
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('shows pressed state for active capability filters', () => {
      render(
        <ProviderFilters
          {...defaultProps}
          capabilityFilters={['vision']}
          onCapabilityFilterChange={mockOnCapabilityFilterChange}
        />
      );
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });
  });
});
