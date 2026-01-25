/**
 * Tests for Prompt Marketplace Store
 */

import { act, renderHook } from '@testing-library/react';
import {
  usePromptMarketplaceStore,
  selectMarketplacePrompts,
  selectFeaturedPrompts,
  selectTrendingPrompts,
  selectInstalledPrompts,
  selectFavoritePrompts,
  selectIsLoading,
  selectError,
} from './prompt-marketplace-store';
import type {
  MarketplacePrompt,
  MarketplaceSearchFilters,
} from '@/types/content/prompt-marketplace';

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'mock-id-123'),
}));

// Mock the prompt-template-store
jest.mock('./prompt-template-store', () => ({
  usePromptTemplateStore: {
    getState: () => ({
      createTemplate: jest.fn(() => ({ id: 'template-123' })),
      deleteTemplate: jest.fn(),
      updateTemplate: jest.fn(),
    }),
  },
}));

const createMockPrompt = (overrides: Partial<MarketplacePrompt> = {}): MarketplacePrompt => ({
  id: `prompt-${Date.now()}`,
  name: 'Test Prompt',
  description: 'A test prompt for testing',
  content: 'This is the prompt content with {{variable}}',
  category: 'writing',
  tags: ['test', 'mock'],
  source: 'marketplace',
  variables: [
    {
      name: 'variable',
      type: 'text',
      description: 'A test variable',
      required: true,
    },
  ],
  targets: ['chat', 'workflow'],
  qualityTier: 'community',
  version: '1.0.0',
  versions: [],
  author: {
    id: 'author-1',
    name: 'Test Author',
    avatar: undefined,
    verified: false,
  },
  rating: {
    average: 4.5,
    count: 100,
    distribution: { 1: 5, 2: 10, 3: 15, 4: 30, 5: 40 },
  },
  stats: {
    downloads: 1000,
    weeklyDownloads: 100,
    favorites: 50,
    shares: 10,
    views: 5000,
  },
  reviewCount: 0,
  isFeatured: false,
  icon: '📝',
  color: '#3B82F6',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const initialUserActivity = {
  userId: '',
  favorites: [],
  installed: [],
  reviewed: [],
  published: [],
  collections: [],
  recentlyViewed: [],
};

describe('usePromptMarketplaceStore', () => {
  beforeEach(() => {
    // Reset store state directly to ensure clean state
    act(() => {
      usePromptMarketplaceStore.setState({
        prompts: {},
        collections: {},
        featuredIds: [],
        trendingIds: [],
        userActivity: initialUserActivity,
        isLoading: false,
        error: null,
        lastSyncedAt: null,
      });
    });
  });

  describe('Initial State', () => {
    it('should have empty prompts initially', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      expect(Object.keys(result.current.prompts)).toHaveLength(0);
    });

    it('should not be loading initially', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      expect(result.current.error).toBeNull();
    });

    it('should have empty user activity', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      expect(result.current.userActivity.favorites).toEqual([]);
      expect(result.current.userActivity.installed).toEqual([]);
      expect(result.current.userActivity.recentlyViewed).toEqual([]);
    });
  });

  describe('Sample Data Initialization', () => {
    it('should initialize sample data', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.initializeSampleData();
      });

      expect(Object.keys(result.current.prompts).length).toBeGreaterThan(0);
      expect(result.current.lastSyncedAt).not.toBeNull();
    });
  });

  describe('Fetching Actions', () => {
    it('should fetch featured prompts', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const featuredPrompt = createMockPrompt({ id: 'featured-1', isFeatured: true });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [featuredPrompt.id]: featuredPrompt },
        });
      });

      await act(async () => {
        await result.current.fetchFeatured();
      });

      expect(result.current.featuredIds).toContain('featured-1');
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch trending prompts sorted by weekly downloads', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt1 = createMockPrompt({
        id: 'p1',
        stats: { ...createMockPrompt().stats, weeklyDownloads: 100 },
      });
      const prompt2 = createMockPrompt({
        id: 'p2',
        stats: { ...createMockPrompt().stats, weeklyDownloads: 200 },
      });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt1.id]: prompt1, [prompt2.id]: prompt2 },
        });
      });

      await act(async () => {
        await result.current.fetchTrending();
      });

      expect(result.current.trendingIds[0]).toBe('p2');
    });

    it('should fetch prompts by category', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const writingPrompt = createMockPrompt({ id: 'w1', category: 'writing' });
      const codingPrompt = createMockPrompt({ id: 'c1', category: 'coding' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [writingPrompt.id]: writingPrompt, [codingPrompt.id]: codingPrompt },
        });
      });

      let writingPrompts: MarketplacePrompt[] = [];
      await act(async () => {
        writingPrompts = await result.current.fetchByCategory('writing');
      });

      expect(writingPrompts).toHaveLength(1);
      expect(writingPrompts[0].id).toBe('w1');
    });

    it('should get prompt by id', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'test-id' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      expect(result.current.getPromptById('test-id')).toEqual(prompt);
      expect(result.current.getPromptById('non-existent')).toBeUndefined();
    });

    it('should fetch prompt details', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'detail-id' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      let details: MarketplacePrompt | null = null;
      await act(async () => {
        details = await result.current.fetchPromptDetails('detail-id');
      });

      expect(details).toEqual(prompt);
    });
  });

  describe('Search', () => {
    it('should search prompts by query', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt1 = createMockPrompt({ id: 'p1', name: 'Writing Assistant' });
      const prompt2 = createMockPrompt({ id: 'p2', name: 'Code Helper' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt1.id]: prompt1, [prompt2.id]: prompt2 },
        });
      });

      const filters: MarketplaceSearchFilters = { query: 'writing' };
      let searchResult = { prompts: [] as MarketplacePrompt[], total: 0 };

      await act(async () => {
        searchResult = await result.current.searchPrompts(filters);
      });

      expect(searchResult.prompts).toHaveLength(1);
      expect(searchResult.prompts[0].name).toBe('Writing Assistant');
    });

    it('should search prompts by tags', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt1 = createMockPrompt({ id: 'p1', tags: ['ai', 'writing'] });
      const prompt2 = createMockPrompt({ id: 'p2', tags: ['coding'] });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt1.id]: prompt1, [prompt2.id]: prompt2 },
        });
      });

      const filters: MarketplaceSearchFilters = { tags: ['writing'] };
      let searchResult = { prompts: [] as MarketplacePrompt[], total: 0 };

      await act(async () => {
        searchResult = await result.current.searchPrompts(filters);
      });

      expect(searchResult.prompts).toHaveLength(1);
      expect(searchResult.prompts[0].id).toBe('p1');
    });

    it('should sort prompts by downloads', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt1 = createMockPrompt({
        id: 'p1',
        stats: { ...createMockPrompt().stats, downloads: 100 },
      });
      const prompt2 = createMockPrompt({
        id: 'p2',
        stats: { ...createMockPrompt().stats, downloads: 500 },
      });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt1.id]: prompt1, [prompt2.id]: prompt2 },
        });
      });

      const filters: MarketplaceSearchFilters = { sortBy: 'downloads' };
      let searchResult = { prompts: [] as MarketplacePrompt[], total: 0 };

      await act(async () => {
        searchResult = await result.current.searchPrompts(filters);
      });

      expect(searchResult.prompts[0].id).toBe('p2');
    });

    it('should filter by minimum rating', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt1 = createMockPrompt({
        id: 'p1',
        rating: { ...createMockPrompt().rating, average: 3.0 },
      });
      const prompt2 = createMockPrompt({
        id: 'p2',
        rating: { ...createMockPrompt().rating, average: 4.5 },
      });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt1.id]: prompt1, [prompt2.id]: prompt2 },
        });
      });

      const filters: MarketplaceSearchFilters = { minRating: 4.0 };
      let searchResult = { prompts: [] as MarketplacePrompt[], total: 0 };

      await act(async () => {
        searchResult = await result.current.searchPrompts(filters);
      });

      expect(searchResult.prompts).toHaveLength(1);
      expect(searchResult.prompts[0].id).toBe('p2');
    });
  });

  describe('Installation', () => {
    it('should install a prompt', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'install-test' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      let templateId = '';
      await act(async () => {
        templateId = await result.current.installPrompt(prompt);
      });

      expect(templateId).toBe('template-123');
      expect(result.current.userActivity.installed).toHaveLength(1);
      expect(result.current.userActivity.installed[0].marketplaceId).toBe('install-test');
    });

    it('should check if prompt is installed', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'check-install' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      expect(result.current.isPromptInstalled('check-install')).toBe(false);

      await act(async () => {
        await result.current.installPrompt(prompt);
      });

      expect(result.current.isPromptInstalled('check-install')).toBe(true);
    });

    it('should uninstall a prompt', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'uninstall-test' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      await act(async () => {
        await result.current.installPrompt(prompt);
      });

      expect(result.current.isPromptInstalled('uninstall-test')).toBe(true);

      act(() => {
        result.current.uninstallPrompt('uninstall-test');
      });

      expect(result.current.isPromptInstalled('uninstall-test')).toBe(false);
    });

    it('should get installed prompts', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'get-installed' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      await act(async () => {
        await result.current.installPrompt(prompt);
      });

      const installed = result.current.getInstalledPrompts();
      expect(installed).toHaveLength(1);
    });
  });

  describe('Favorites', () => {
    it('should add to favorites', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.addToFavorites('fav-1');
      });

      expect(result.current.userActivity.favorites).toContain('fav-1');
      expect(result.current.isFavorite('fav-1')).toBe(true);
    });

    it('should not duplicate favorites', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.addToFavorites('fav-1');
        result.current.addToFavorites('fav-1');
      });

      expect(result.current.userActivity.favorites.filter((id) => id === 'fav-1')).toHaveLength(1);
    });

    it('should remove from favorites', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.addToFavorites('fav-1');
        result.current.addToFavorites('fav-2');
      });

      act(() => {
        result.current.removeFromFavorites('fav-1');
      });

      expect(result.current.isFavorite('fav-1')).toBe(false);
      expect(result.current.isFavorite('fav-2')).toBe(true);
    });
  });

  describe('Recently Viewed', () => {
    it('should record view', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.recordView('view-1');
      });

      expect(result.current.userActivity.recentlyViewed).toHaveLength(1);
      expect(result.current.userActivity.recentlyViewed[0].promptId).toBe('view-1');
    });

    it('should move recent view to top', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.recordView('view-1');
        result.current.recordView('view-2');
        result.current.recordView('view-1');
      });

      expect(result.current.userActivity.recentlyViewed[0].promptId).toBe('view-1');
      expect(result.current.userActivity.recentlyViewed).toHaveLength(2);
    });

    it('should limit recently viewed to 50', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.recordView(`view-${i}`);
        }
      });

      expect(result.current.userActivity.recentlyViewed.length).toBeLessThanOrEqual(50);
    });

    it('should get recently viewed prompts', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'recent-1' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
        result.current.recordView('recent-1');
      });

      const recentlyViewed = result.current.getRecentlyViewed();
      expect(recentlyViewed).toHaveLength(1);
      expect(recentlyViewed[0].id).toBe('recent-1');
    });
  });

  describe('Collections', () => {
    it('should follow a collection', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.followCollection('col-1');
      });

      expect(result.current.userActivity.collections).toContain('col-1');
    });

    it('should not duplicate collection follows', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.followCollection('col-1');
        result.current.followCollection('col-1');
      });

      expect(result.current.userActivity.collections.filter((id) => id === 'col-1')).toHaveLength(
        1
      );
    });

    it('should unfollow a collection', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.followCollection('col-1');
        result.current.followCollection('col-2');
      });

      act(() => {
        result.current.unfollowCollection('col-1');
      });

      expect(result.current.userActivity.collections).not.toContain('col-1');
      expect(result.current.userActivity.collections).toContain('col-2');
    });
  });

  describe('Error Handling', () => {
    it('should set error', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
    });

    it('should clear error', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.setError('Error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'cache-test' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
          featuredIds: ['cache-test'],
          trendingIds: ['cache-test'],
        });
      });

      act(() => {
        result.current.clearCache();
      });

      expect(Object.keys(result.current.prompts)).toHaveLength(0);
      expect(result.current.featuredIds).toHaveLength(0);
      expect(result.current.trendingIds).toHaveLength(0);
    });
  });

  describe('Selectors', () => {
    it('selectMarketplacePrompts should return all prompts', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt1 = createMockPrompt({ id: 'p1' });
      const prompt2 = createMockPrompt({ id: 'p2' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt1.id]: prompt1, [prompt2.id]: prompt2 },
        });
      });

      const prompts = selectMarketplacePrompts(result.current);
      expect(prompts).toHaveLength(2);
    });

    it('selectFeaturedPrompts should return featured prompts', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const featured = createMockPrompt({ id: 'f1', isFeatured: true });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [featured.id]: featured },
          featuredIds: ['f1'],
        });
      });

      const featuredPrompts = selectFeaturedPrompts(result.current);
      expect(featuredPrompts).toHaveLength(1);
      expect(featuredPrompts[0].id).toBe('f1');
    });

    it('selectTrendingPrompts should return trending prompts', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const trending = createMockPrompt({ id: 't1' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [trending.id]: trending },
          trendingIds: ['t1'],
        });
      });

      const trendingPrompts = selectTrendingPrompts(result.current);
      expect(trendingPrompts).toHaveLength(1);
    });

    it('selectInstalledPrompts should return installed prompts', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'installed-1' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
      });

      await act(async () => {
        await result.current.installPrompt(prompt);
      });

      const installed = selectInstalledPrompts(result.current);
      expect(installed).toHaveLength(1);
    });

    it('selectFavoritePrompts should return favorite prompts', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'fav-1' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
        });
        result.current.addToFavorites('fav-1');
      });

      const favorites = selectFavoritePrompts(result.current);
      expect(favorites).toHaveLength(1);
    });

    it('selectIsLoading should return loading state', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        usePromptMarketplaceStore.setState({ isLoading: true });
      });

      expect(selectIsLoading(result.current)).toBe(true);
    });

    it('selectError should return error state', () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(selectError(result.current)).toBe('Test error');
    });
  });

  describe('Update Checks', () => {
    it('should check for updates', async () => {
      const { result } = renderHook(() => usePromptMarketplaceStore());
      const prompt = createMockPrompt({ id: 'update-test', version: '2.0.0' });

      act(() => {
        usePromptMarketplaceStore.setState({
          prompts: { [prompt.id]: prompt },
          userActivity: {
            ...result.current.userActivity,
            installed: [
              {
                id: 'inst-1',
                marketplaceId: 'update-test',
                localTemplateId: 'local-1',
                installedVersion: '1.0.0',
                latestVersion: '1.0.0',
                hasUpdate: false,
                autoUpdate: false,
                installedAt: new Date(),
              },
            ],
          },
        });
      });

      let updatesAvailable: unknown[] = [];
      await act(async () => {
        updatesAvailable = await result.current.checkForUpdates();
      });

      expect(updatesAvailable).toHaveLength(1);
      expect(result.current.userActivity.installed[0].hasUpdate).toBe(true);
    });
  });
});
