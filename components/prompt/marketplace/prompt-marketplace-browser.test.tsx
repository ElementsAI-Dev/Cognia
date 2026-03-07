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
};

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
  PromptMarketplaceDetail: () => <div>detail</div>,
}));

jest.mock('./prompt-author-profile', () => ({
  PromptAuthorProfile: () => <div>profile</div>,
}));

jest.mock('./tabs', () => ({
  BrowseTab: () => <div>browse-tab</div>,
  InstalledTab: () => <div>installed-tab</div>,
  FavoritesTab: () => <div>favorites-tab</div>,
  CollectionsTab: () => <div>collections-tab</div>,
  RecentTab: () => <div>recent-tab</div>,
}));

describe('PromptMarketplaceBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('applies browse query into search filters', async () => {
    render(<PromptMarketplaceBrowser />);
    const searchInput = screen.getByPlaceholderText('search.placeholder');
    fireEvent.change(searchInput, { target: { value: 'author' } });

    await waitFor(() => {
      expect(mockSearchPrompts).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'author',
        })
      );
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
});
