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

// Mock zustand useShallow
jest.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(fn: (state: unknown) => T) => fn,
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

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="sheet" data-open={open}>{children}</div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/empty', () => ({
  Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="empty" className={className}>{children}</div>
  ),
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock child components
jest.mock('./prompt-marketplace-sidebar', () => ({
  PromptMarketplaceSidebar: ({ isMobile }: { isMobile?: boolean }) => (
    <div data-testid="sidebar" data-mobile={isMobile}>Sidebar</div>
  ),
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
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('has a search input', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders tabs for navigation', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders all five tabs', () => {
    render(<PromptMarketplaceBrowser />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
  });

  it('renders tab values correctly', () => {
    render(<PromptMarketplaceBrowser />);
    const tabs = screen.getAllByRole('tab');
    const values = tabs.map((t) => t.getAttribute('data-value'));
    expect(values).toEqual(['browse', 'installed', 'favorites', 'collections', 'recent']);
  });

  // Layout: sidebar is inside Sheet, not rendered directly
  it('renders sidebar inside Sheet (not as standalone)', () => {
    render(<PromptMarketplaceBrowser />);
    const sheetContent = screen.getByTestId('sheet-content');
    expect(sheetContent).toBeInTheDocument();
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toBeInTheDocument();
    expect(sheetContent.contains(sidebar)).toBe(true);
  });

  it('passes isMobile to sidebar inside Sheet', () => {
    render(<PromptMarketplaceBrowser />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.getAttribute('data-mobile')).toBe('true');
  });

  // Layout: filter trigger button
  it('renders filter Sheet trigger button', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByTestId('sheet-trigger')).toBeInTheDocument();
  });

  // Layout: compact header
  it('renders compact header with reduced padding', () => {
    const { container } = render(<PromptMarketplaceBrowser />);
    const header = container.querySelector('.shrink-0.border-b');
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain('px-3');
    expect(header?.className).toContain('py-2');
    expect(header?.className).toContain('space-y-2');
  });

  // Layout: empty state padding
  it('renders empty state with compact padding', () => {
    render(<PromptMarketplaceBrowser />);
    const emptyStates = screen.getAllByTestId('empty');
    emptyStates.forEach((el) => {
      expect(el.className).toContain('py-10');
      expect(el.className).toContain('sm:py-14');
    });
  });

  // Layout: root container is flex-col (not flex-row with sidebar)
  it('root container uses flex-col layout (no side-by-side sidebar)', () => {
    const { container } = render(<PromptMarketplaceBrowser />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('flex-col');
    expect(root.className).toContain('h-full');
    expect(root.className).toContain('overflow-hidden');
  });

  // Layout: content area has reduced padding
  it('content area has compact padding', () => {
    const { container } = render(<PromptMarketplaceBrowser />);
    const contentDiv = container.querySelector('.p-3.space-y-5');
    expect(contentDiv).toBeInTheDocument();
  });
});
