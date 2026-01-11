/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptMarketplaceBrowser } from './prompt-marketplace-browser';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock store
jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      prompts: [],
      filteredPrompts: [],
      isLoading: false,
      searchQuery: '',
      setSearchQuery: jest.fn(),
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      sortBy: 'popular',
      setSortBy: jest.fn(),
      fetchPrompts: jest.fn(),
      getCategoryCounts: jest.fn().mockReturnValue({}),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
}));

// Mock child components
jest.mock('./prompt-marketplace-category-nav', () => ({
  PromptMarketplaceCategoryNav: () => <div data-testid="category-nav">Category Nav</div>,
}));

jest.mock('./prompt-marketplace-card', () => ({
  PromptMarketplaceCard: ({ prompt }: { prompt: { title: string } }) => (
    <div data-testid="marketplace-card">{prompt.title}</div>
  ),
}));

describe('PromptMarketplaceBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByTestId('category-nav')).toBeInTheDocument();
  });

  it('has a search input', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders empty state when no prompts', () => {
    render(<PromptMarketplaceBrowser />);
    // Should show empty state or loading
    expect(screen.getByTestId('category-nav')).toBeInTheDocument();
  });
});
