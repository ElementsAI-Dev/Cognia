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
      prompts: {},
      collections: {},
      filteredPrompts: [],
      isLoading: false,
      searchQuery: '',
      featuredIds: [],
      trendingIds: [],
      userActivity: {
        installed: [],
        favorites: [],
        reviewed: [],
        recentlyViewed: [],
      },
      setSearchQuery: jest.fn(),
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      sortBy: 'popular',
      setSortBy: jest.fn(),
      fetchPrompts: jest.fn(),
      fetchFeatured: jest.fn(),
      fetchTrending: jest.fn(),
      initializeSampleData: jest.fn(),
      searchPrompts: jest.fn().mockResolvedValue({ prompts: [], total: 0 }),
      getPromptById: jest.fn().mockReturnValue(null),
      checkForUpdates: jest.fn().mockResolvedValue([]),
      updateInstalledPrompt: jest.fn(),
      getRecentlyViewed: jest.fn().mockReturnValue([]),
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
jest.mock('./prompt-marketplace-sidebar', () => ({
  PromptMarketplaceSidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

jest.mock('./prompt-marketplace-card', () => ({
  PromptMarketplaceCard: ({ prompt }: { prompt: { name: string } }) => (
    <div data-testid="marketplace-card">{prompt.name}</div>
  ),
}));

jest.mock('./prompt-marketplace-detail', () => ({
  PromptMarketplaceDetail: () => <div data-testid="detail">Detail</div>,
}));

jest.mock('./prompt-collection-card', () => ({
  PromptCollectionCard: () => <div data-testid="collection-card">Collection</div>,
}));

jest.mock('./prompt-author-profile', () => ({
  PromptAuthorProfile: () => <div data-testid="author-profile">Author Profile</div>,
}));

jest.mock('./prompt-import-export', () => ({
  PromptImportExport: () => <div data-testid="import-export">Import Export</div>,
}));

jest.mock('./prompt-publish-dialog', () => ({
  PromptPublishDialog: () => <div data-testid="publish-dialog">Publish</div>,
}));

describe('PromptMarketplaceBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('has a search input', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders empty state when no prompts', () => {
    render(<PromptMarketplaceBrowser />);
    // Should show sidebar
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders tabs for navigation', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders multiple tabs', () => {
    render(<PromptMarketplaceBrowser />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });
});
