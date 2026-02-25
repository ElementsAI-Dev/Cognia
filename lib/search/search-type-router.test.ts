/**
 * Tests for Search Type Router
 */

import {
  getProvidersForType,
  providerSupportsType,
  getBestProviderForType,
  routeSearch,
  searchNews,
  searchImages,
  searchVideos,
  searchAcademic,
  findSimilar,
  autoRouteSearch,
} from './search-type-router';
import type { SearchProviderSettings, SearchProviderType } from '@/types/search';

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  })),
}));

// Mock all provider functions
jest.mock('./providers/brave', () => ({
  searchWithBrave: jest.fn().mockResolvedValue({ provider: 'brave', results: [] }),
  searchNewsWithBrave: jest.fn().mockResolvedValue({ provider: 'brave', results: [] }),
  searchImagesWithBrave: jest.fn().mockResolvedValue({ provider: 'brave', results: [] }),
  searchVideosWithBrave: jest.fn().mockResolvedValue({ provider: 'brave', results: [] }),
}));

jest.mock('./providers/bing', () => ({
  searchWithBing: jest.fn().mockResolvedValue({ provider: 'bing', results: [] }),
  searchNewsWithBing: jest.fn().mockResolvedValue({ provider: 'bing', results: [] }),
  searchImagesWithBing: jest.fn().mockResolvedValue({ provider: 'bing', results: [] }),
}));

jest.mock('./providers/google', () => ({
  searchWithGoogle: jest.fn().mockResolvedValue({ provider: 'google', results: [] }),
  searchImagesWithGoogle: jest.fn().mockResolvedValue({ provider: 'google', results: [] }),
}));

jest.mock('./providers/searchapi', () => ({
  searchWithSearchAPI: jest.fn().mockResolvedValue({ provider: 'searchapi', results: [] }),
  searchNewsWithSearchAPI: jest.fn().mockResolvedValue({ provider: 'searchapi', results: [] }),
  searchImagesWithSearchAPI: jest.fn().mockResolvedValue({ provider: 'searchapi', results: [] }),
  searchScholarWithSearchAPI: jest.fn().mockResolvedValue({ provider: 'searchapi', results: [] }),
}));

jest.mock('./providers/serpapi', () => ({
  searchWithSerpAPI: jest.fn().mockResolvedValue({ provider: 'serpapi', results: [] }),
  searchNewsWithSerpAPI: jest.fn().mockResolvedValue({ provider: 'serpapi', results: [] }),
  searchImagesWithSerpAPI: jest.fn().mockResolvedValue({ provider: 'serpapi', results: [] }),
}));

jest.mock('./providers/serper', () => ({
  searchWithSerper: jest.fn().mockResolvedValue({ provider: 'serper', results: [] }),
  searchNewsWithSerper: jest.fn().mockResolvedValue({ provider: 'serper', results: [] }),
  searchImagesWithSerper: jest.fn().mockResolvedValue({ provider: 'serper', results: [], images: [] }),
  searchVideosWithSerper: jest.fn().mockResolvedValue({ provider: 'serper', results: [] }),
  searchScholarWithSerper: jest.fn().mockResolvedValue({ provider: 'serper', results: [] }),
}));

jest.mock('./providers/exa', () => ({
  searchWithExa: jest.fn().mockResolvedValue({ provider: 'exa', results: [] }),
  findSimilarWithExa: jest.fn().mockResolvedValue({ provider: 'exa', results: [] }),
  getContentsWithExa: jest.fn().mockResolvedValue({ results: [] }),
}));

jest.mock('./providers/tavily', () => ({
  searchWithTavily: jest.fn().mockResolvedValue({ provider: 'tavily', results: [] }),
}));

jest.mock('./providers/perplexity', () => ({
  searchWithPerplexity: jest.fn().mockResolvedValue({ provider: 'perplexity', results: [] }),
}));

jest.mock('./providers/google-ai', () => ({
  searchWithGoogleAI: jest.fn().mockResolvedValue({ provider: 'google-ai', results: [] }),
}));

import { searchWithGoogle } from './providers/google';

describe('search-type-router', () => {
  const createMockSettings = (
    overrides: Partial<Record<SearchProviderType, Partial<SearchProviderSettings>>> = {}
  ): Partial<Record<SearchProviderType, SearchProviderSettings>> => ({
    tavily: { providerId: 'tavily', apiKey: 'tavily-key', enabled: true, priority: 1, ...overrides.tavily },
    brave: { providerId: 'brave', apiKey: 'brave-key', enabled: true, priority: 2, ...overrides.brave },
    bing: { providerId: 'bing', apiKey: 'bing-key', enabled: true, priority: 3, ...overrides.bing },
    google: { providerId: 'google', apiKey: 'google-key', cx: 'test-cx', enabled: false, priority: 4, ...overrides.google },
    searchapi: { providerId: 'searchapi', apiKey: 'searchapi-key', enabled: true, priority: 5, ...overrides.searchapi },
    serper: { providerId: 'serper', apiKey: 'serper-key', enabled: true, priority: 6, ...overrides.serper },
    exa: { providerId: 'exa', apiKey: 'exa-key', enabled: true, priority: 7, ...overrides.exa },
  });

  describe('getProvidersForType', () => {
    it('should return all providers for general search', () => {
      const providers = getProvidersForType('general');
      expect(providers).toContain('tavily');
      expect(providers).toContain('brave');
      expect(providers).toContain('bing');
    });

    it('should return providers that support news search', () => {
      const providers = getProvidersForType('news');
      expect(providers).toContain('brave');
      expect(providers).toContain('bing');
      expect(providers).toContain('searchapi');
      expect(providers).toContain('serper');
    });

    it('should return providers that support image search', () => {
      const providers = getProvidersForType('images');
      expect(providers).toContain('brave');
      expect(providers).toContain('bing');
      expect(providers).toContain('google');
      expect(providers).toContain('serper');
    });

    it('should return providers that support video search', () => {
      const providers = getProvidersForType('videos');
      expect(providers).toContain('brave');
      expect(providers).toContain('serper');
    });

    it('should return providers that support academic search', () => {
      const providers = getProvidersForType('academic');
      expect(providers).toContain('searchapi');
      expect(providers).toContain('exa');
    });
  });

  describe('providerSupportsType', () => {
    it('should return true for supported type', () => {
      expect(providerSupportsType('brave', 'news')).toBe(true);
      expect(providerSupportsType('brave', 'images')).toBe(true);
      expect(providerSupportsType('brave', 'videos')).toBe(true);
    });

    it('should return false for unsupported type', () => {
      expect(providerSupportsType('tavily', 'videos')).toBe(false);
      expect(providerSupportsType('google', 'academic')).toBe(false);
    });

    it('should return true for general type for all providers', () => {
      expect(providerSupportsType('tavily', 'general')).toBe(true);
      expect(providerSupportsType('brave', 'general')).toBe(true);
      expect(providerSupportsType('exa', 'general')).toBe(true);
    });

    it('should return false for unknown provider', () => {
      expect(providerSupportsType('unknown' as never, 'general')).toBe(false);
    });
  });

  describe('getBestProviderForType', () => {
    it('should return highest priority enabled provider for type', () => {
      const settings = createMockSettings();
      const provider = getBestProviderForType('general', settings);
      expect(provider).toBe('tavily');
    });

    it('should skip disabled providers', () => {
      const settings = createMockSettings({
        tavily: { enabled: false },
        brave: { enabled: true, priority: 1 },
      });
      const provider = getBestProviderForType('general', settings);
      expect(provider).toBe('brave');
    });

    it('should skip providers without API key', () => {
      const settings = createMockSettings({
        tavily: { apiKey: '' },
        brave: { priority: 1 },
      });
      const provider = getBestProviderForType('general', settings);
      expect(provider).toBe('brave');
    });

    it('should skip google when cx is missing', () => {
      const settings = createMockSettings({
        google: { enabled: true, priority: 1, cx: '' },
        tavily: { enabled: true, priority: 2 },
      });
      const provider = getBestProviderForType('general', settings);
      expect(provider).toBe('tavily');
    });

    it('should return null if no provider available', () => {
      const settings = createMockSettings({
        tavily: { enabled: false },
        brave: { enabled: false },
        bing: { enabled: false },
        google: { enabled: false },
        searchapi: { enabled: false },
        serper: { enabled: false },
        exa: { enabled: false },
      });
      const provider = getBestProviderForType('general', settings);
      expect(provider).toBeNull();
    });

    it('should find provider that supports specific type', () => {
      const settings = createMockSettings({
        tavily: { priority: 1 }, // tavily doesn't support videos
        brave: { priority: 2 }, // brave supports videos
      });
      const provider = getBestProviderForType('videos', settings);
      expect(provider).toBe('brave');
    });
  });

  describe('routeSearch', () => {
    it('should route general search to provider', async () => {
      const result = await routeSearch('test query', 'brave', {
        providerId: 'brave',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      });
      expect(result.provider).toBe('brave');
    });

    it('should route news search to news function', async () => {
      const result = await routeSearch('test query', 'brave', {
        providerId: 'brave',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      }, { searchType: 'news' });
      expect(result.provider).toBe('brave');
    });

    it('should throw for unknown provider', async () => {
      await expect(
        routeSearch('test query', 'unknown' as never, {
          providerId: 'tavily',
          apiKey: 'api-key',
          enabled: true,
          priority: 1,
        })
      ).rejects.toThrow('Unknown provider');
    });

    it('should fallback to general search for unsupported type', async () => {
      const result = await routeSearch('test query', 'tavily', {
        providerId: 'tavily',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      }, { searchType: 'videos' });
      expect(result.provider).toBe('tavily');
    });

    it('should throw when google cx is missing', async () => {
      await expect(
        routeSearch('test query', 'google', {
          providerId: 'google',
          apiKey: 'api-key',
          enabled: true,
          priority: 1,
        })
      ).rejects.toThrow('cx');
    });

    it('should inject cx when routing google provider', async () => {
      (searchWithGoogle as jest.Mock).mockResolvedValueOnce({ provider: 'google', results: [] });

      await routeSearch('test query', 'google', {
        providerId: 'google',
        apiKey: 'api-key',
        cx: 'my-cx',
        enabled: true,
        priority: 1,
      }, { maxResults: 3, language: 'en', recency: 'day' });

      expect(searchWithGoogle).toHaveBeenCalledWith(
        'test query',
        'api-key',
        expect.objectContaining({ cx: 'my-cx', maxResults: 3, language: 'en', recency: 'day' })
      );
    });
  });

  describe('convenience functions', () => {
    it('searchNews should route with news type', async () => {
      const result = await searchNews('news query', 'brave', {
        providerId: 'brave',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      });
      expect(result).toBeDefined();
    });

    it('searchImages should route with images type', async () => {
      const result = await searchImages('image query', 'brave', {
        providerId: 'brave',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      });
      expect(result).toBeDefined();
    });

    it('searchVideos should use brave', async () => {
      const result = await searchVideos('video query', 'brave', {
        providerId: 'brave',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      });
      expect(result).toBeDefined();
    });

    it('searchAcademic should use specified provider', async () => {
      const result = await searchAcademic('academic query', 'searchapi', {
        providerId: 'searchapi',
        apiKey: 'api-key',
        enabled: true,
        priority: 1,
      });
      expect(result).toBeDefined();
    });

    it('findSimilar should use exa', async () => {
      const result = await findSimilar('https://example.com', 'api-key');
      expect(result).toBeDefined();
    });
  });

  describe('autoRouteSearch', () => {
    it('should auto-select best provider for type', async () => {
      const settings = createMockSettings();
      const result = await autoRouteSearch('test query', 'general', settings);
      expect(result).toBeDefined();
    });

    it('should throw when no provider available', async () => {
      const settings = createMockSettings({
        tavily: { enabled: false },
        brave: { enabled: false },
        bing: { enabled: false },
        google: { enabled: false },
        searchapi: { enabled: false },
        serper: { enabled: false },
        exa: { enabled: false },
      });

      await expect(
        autoRouteSearch('test query', 'general', settings)
      ).rejects.toThrow('No enabled provider available');
    });

    it('should select appropriate provider for search type', async () => {
      const settings = createMockSettings({
        brave: { priority: 1, enabled: true },
      });

      const result = await autoRouteSearch('video query', 'videos', settings);
      expect(result).toBeDefined();
    });
  });
});
