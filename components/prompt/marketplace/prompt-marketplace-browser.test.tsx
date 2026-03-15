/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptMarketplaceBrowser } from './prompt-marketplace-browser';

const mockSearchPrompts = jest.fn();
const mockRefreshCatalog = jest.fn();
const mockFetchFeatured = jest.fn();
const mockFetchTrending = jest.fn();
const mockSetRemoteFirstEnabled = jest.fn();
const mockCheckForUpdates = jest.fn();
const mockUpdateInstalledPrompt = jest.fn();
const mockSetBrowseQuery = jest.fn();
const mockSetBrowseCategory = jest.fn();
const mockSetBrowseSortBy = jest.fn();
const mockSetBrowseMinRating = jest.fn();
const mockToggleBrowseQualityTier = jest.fn();
const mockClearBrowseFilters = jest.fn();
const mockSetBrowsePage = jest.fn();
const mockSetBrowseScrollOffset = jest.fn();
const mockSetSelectedPrompt = jest.fn();
const mockSetDetailOpen = jest.fn();
const mockPromptMarketplaceDetail = jest.fn((_props: Record<string, unknown>) => <div>detail</div>);
type PromptFixture = {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  variables: unknown[];
  targets: string[];
  author: { id: string; name: string };
  source: string;
  qualityTier: string;
  version: string;
  versions: unknown[];
  stats: { downloads: number; weeklyDownloads: number; favorites: number; shares: number; views: number };
  rating: { average: number; count: number; distribution: Record<number, number> };
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
};
const mockBrowseTab = jest.fn((_props: Record<string, unknown>) => (
  <>
    <div data-testid="browse-fragment-featured">featured</div>
    <div data-testid="browse-fragment-trending">trending</div>
    <button
      type="button"
      data-testid="browse-fragment-results"
      onClick={() => {
        const onViewDetail = _props.onViewDetail as ((selectedPrompt: PromptFixture) => void) | undefined;
        onViewDetail?.(prompt);
      }}
    >
      results
    </button>
  </>
));

const prompt = {
  id: 'p1',
  name: 'Prompt One',
  description: 'Prompt description',
  content: 'Hello',
  category: 'chat',
  tags: ['tag'],
  variables: [],
  targets: ['chat'],
  author: { id: 'a1', name: 'Author' },
  source: 'marketplace',
  qualityTier: 'community',
  version: '1.0.0',
  versions: [],
  stats: { downloads: 10, weeklyDownloads: 2, favorites: 1, shares: 1, views: 10 },
  rating: { average: 4.5, count: 2, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } },
  reviewCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const storeState = {
  prompts: { p1: prompt },
  collections: {},
  featuredIds: ['p1'],
  trendingIds: ['p1'],
  isLoading: false,
  sourceState: 'remote' as const,
  sourceWarning: null as string | null,
  remoteFirstEnabled: true,
  lastSyncedAt: new Date(),
  operationStates: {},
  browseViewState: {
    query: '',
    category: 'all' as const,
    sortBy: 'downloads' as const,
    minRating: 0,
    selectedTiers: [],
    page: 1,
    pageSize: 20,
    selectedPromptId: null as string | null,
    detailOpen: false,
    scrollOffset: 0,
  },
  installRetryContexts: {},
  userActivity: {
    installed: [],
    favorites: [],
    recentlyViewed: [],
  },
  searchPrompts: mockSearchPrompts,
  refreshCatalog: mockRefreshCatalog,
  fetchFeatured: mockFetchFeatured,
  fetchTrending: mockFetchTrending,
  setRemoteFirstEnabled: mockSetRemoteFirstEnabled,
  getPromptById: (id: string) => (storeState.prompts as Record<string, typeof prompt>)[id],
  checkForUpdates: mockCheckForUpdates,
  updateInstalledPrompt: mockUpdateInstalledPrompt,
  setBrowseQuery: mockSetBrowseQuery,
  setBrowseCategory: mockSetBrowseCategory,
  setBrowseSortBy: mockSetBrowseSortBy,
  setBrowseMinRating: mockSetBrowseMinRating,
  toggleBrowseQualityTier: mockToggleBrowseQualityTier,
  clearBrowseFilters: mockClearBrowseFilters,
  setBrowsePage: mockSetBrowsePage,
  setBrowseScrollOffset: mockSetBrowseScrollOffset,
  setSelectedPrompt: mockSetSelectedPrompt,
  setDetailOpen: mockSetDetailOpen,
};

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(matchesByQuery: Record<string, boolean>) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: matchesByQuery[query] ?? false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(selector: (state: unknown) => T) => selector,
}));

jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      aria-label="promptMarketplace.source.remoteFirst"
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>value</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./prompt-marketplace-sidebar', () => ({
  PromptMarketplaceSidebar: () => <div>sidebar</div>,
}));

jest.mock('./prompt-marketplace-detail', () => ({
  PromptMarketplaceDetail: (props: Record<string, unknown>) => mockPromptMarketplaceDetail(props),
}));

jest.mock('./prompt-marketplace-inspector', () => ({
  PromptMarketplaceInspector: () => <div>inspector</div>,
}));

jest.mock('./prompt-author-profile', () => ({
  PromptAuthorProfile: () => <div>profile</div>,
}));

jest.mock('./tabs', () => ({
  BrowseTab: (props: Record<string, unknown>) => mockBrowseTab(props),
  InstalledTab: () => <div>installed-tab</div>,
  FavoritesTab: () => <div>favorites-tab</div>,
  CollectionsTab: () => <div>collections-tab</div>,
  RecentTab: () => <div>recent-tab</div>,
}));

describe('PromptMarketplaceBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia({
      '(max-width: 1023px)': false,
    });
    mockSearchPrompts.mockReturnValue({
      prompts: [prompt],
      total: 1,
      page: 1,
      pageSize: 1,
      hasMore: false,
      filters: {},
      facets: { categories: {}, tags: {}, qualityTiers: {} },
    });
    mockRefreshCatalog.mockResolvedValue(undefined);
  });

  it('renders source state banner and remote-first controls', () => {
    render(<PromptMarketplaceBrowser />);
    expect(screen.getByText('source.remote')).toBeInTheDocument();
    expect(screen.getByLabelText('promptMarketplace.source.remoteFirst')).toBeInTheDocument();
  });

  it('updates canonical browse query state', async () => {
    render(<PromptMarketplaceBrowser />);
    const searchInput = screen.getByPlaceholderText('search.placeholder');
    fireEvent.change(searchInput, { target: { value: 'author' } });

    await waitFor(() => {
      expect(mockSetBrowseQuery).toHaveBeenCalledWith('author');
    });
  });

  it('refreshes catalog when remote-first toggle changes', async () => {
    render(<PromptMarketplaceBrowser />);
    const toggle = screen.getByLabelText('promptMarketplace.source.remoteFirst');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockSetRemoteFirstEnabled).toHaveBeenCalled();
      expect(mockRefreshCatalog).toHaveBeenCalled();
    });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('passes continue-edit callback through to marketplace detail', () => {
    const onContinueEditing = jest.fn();
    render(<PromptMarketplaceBrowser onContinueEditing={onContinueEditing} />);

    expect(mockPromptMarketplaceDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        onContinueEditing,
      })
    );
  });

  it('keeps browse fragments inside a dedicated middle region', () => {
    render(<PromptMarketplaceBrowser />);

    const layout = screen.getByTestId('prompt-marketplace-browse-layout');
    const browseRegion = screen.getByTestId('prompt-marketplace-browse-region');

    expect(layout.children).toHaveLength(2);
    expect(browseRegion).toContainElement(screen.getByTestId('browse-fragment-featured'));
    expect(browseRegion).toContainElement(screen.getByTestId('browse-fragment-trending'));
    expect(browseRegion).toContainElement(screen.getByTestId('browse-fragment-results'));
  });

  it('shows persistent inspector only after a prompt is selected on wide screens', () => {
    mockMatchMedia({
      '(max-width: 1023px)': false,
      '(min-width: 1536px)': true,
    });
    storeState.browseViewState.selectedPromptId = 'p1';

    render(<PromptMarketplaceBrowser />);

    const layout = screen.getByTestId('prompt-marketplace-browse-layout');
    expect(layout.children).toHaveLength(3);
    expect(screen.getByText('inspector')).toBeInTheDocument();

    storeState.browseViewState.selectedPromptId = null;
  });

  it('opens detail when inspector is not persistently available', async () => {
    mockMatchMedia({
      '(max-width: 1023px)': false,
      '(min-width: 1536px)': false,
    });

    render(<PromptMarketplaceBrowser />);
    fireEvent.click(screen.getByTestId('browse-fragment-results'));

    await waitFor(() => {
      expect(mockSetSelectedPrompt).toHaveBeenCalledWith('p1');
      expect(mockSetDetailOpen).toHaveBeenCalledWith(true);
    });
  });
});
