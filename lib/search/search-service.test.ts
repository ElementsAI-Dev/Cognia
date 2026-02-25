/**
 * Search Service Tests
 */

import {
  search,
  autoSearch,
  searchWithProvider,
  testProviderConnection,
  aggregateSearch,
  formatSearchResultsForLLM,
  formatSearchResultsCompact,
} from './search-service';

import type { SearchProviderType, SearchProviderSettings, SearchResponse } from '@/types/search';

jest.mock('./search-type-router', () => ({
  routeSearch: jest.fn(),
}));

jest.mock('./providers/tavily', () => ({
  testTavilyConnection: jest.fn(),
}));

jest.mock('./providers/perplexity', () => ({
  testPerplexityConnection: jest.fn(),
}));

jest.mock('./providers/exa', () => ({
  testExaConnection: jest.fn(),
}));

jest.mock('./providers/searchapi', () => ({
  testSearchAPIConnection: jest.fn(),
}));

jest.mock('./providers/serper', () => ({
  testSerperConnection: jest.fn(),
}));

jest.mock('./providers/serpapi', () => ({
  testSerpAPIConnection: jest.fn(),
}));

jest.mock('./providers/bing', () => ({
  testBingConnection: jest.fn(),
}));

jest.mock('./providers/google', () => ({
  testGoogleConnection: jest.fn(),
}));

jest.mock('./providers/google-ai', () => ({
  testGoogleAIConnection: jest.fn(),
}));

jest.mock('./providers/brave', () => ({
  testBraveConnection: jest.fn(),
}));

import { routeSearch } from './search-type-router';
import { testTavilyConnection } from './providers/tavily';
import { testPerplexityConnection } from './providers/perplexity';
import { testBingConnection } from './providers/bing';
import { testGoogleConnection } from './providers/google';
import { testSerperConnection } from './providers/serper';

const mockRouteSearch = routeSearch as jest.MockedFunction<typeof routeSearch>;
const mockTestTavilyConnection = testTavilyConnection as jest.MockedFunction<typeof testTavilyConnection>;
const mockTestPerplexityConnection = testPerplexityConnection as jest.MockedFunction<typeof testPerplexityConnection>;
const mockTestBingConnection = testBingConnection as jest.MockedFunction<typeof testBingConnection>;
const mockTestGoogleConnection = testGoogleConnection as jest.MockedFunction<typeof testGoogleConnection>;
const mockTestSerperConnection = testSerperConnection as jest.MockedFunction<typeof testSerperConnection>;

describe('search-service', () => {
  const mockSearchResponse: SearchResponse = {
    provider: 'tavily',
    query: 'test query',
    answer: 'Test answer',
    results: [
      {
        title: 'Test Result 1',
        url: 'https://example.com/1',
        content: 'Test content 1',
        score: 0.95,
        publishedDate: '2024-01-01',
      },
      {
        title: 'Test Result 2',
        url: 'https://example.com/2',
        content: 'Test content 2',
        score: 0.85,
      },
    ],
    responseTime: 500,
    totalResults: 2,
  };

  const createMockProviderSettings = (): Record<SearchProviderType, SearchProviderSettings> => ({
    tavily: { providerId: 'tavily', apiKey: 'test-tavily-key', enabled: true, priority: 1 },
    perplexity: { providerId: 'perplexity', apiKey: 'test-perplexity-key', enabled: true, priority: 2 },
    exa: { providerId: 'exa', apiKey: '', enabled: false, priority: 3 },
    searchapi: { providerId: 'searchapi', apiKey: '', enabled: false, priority: 4 },
    serper: { providerId: 'serper', apiKey: '', enabled: false, priority: 5 },
    serpapi: { providerId: 'serpapi', apiKey: '', enabled: false, priority: 6 },
    bing: { providerId: 'bing', apiKey: 'test-bing-key', enabled: true, priority: 7 },
    google: { providerId: 'google', apiKey: '', cx: '', enabled: false, priority: 8 },
    brave: { providerId: 'brave', apiKey: '', enabled: false, priority: 9 },
    'google-ai': { providerId: 'google-ai', apiKey: '', enabled: false, priority: 10 },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouteSearch.mockImplementation(async (query, provider) => ({
      ...mockSearchResponse,
      provider,
      query,
    }));
  });

  describe('search', () => {
    it('should throw error when provider settings are not provided', async () => {
      await expect(search('test query', {})).rejects.toThrow('Provider settings are required');
    });

    it('should throw error when no providers are enabled', async () => {
      const settings = createMockProviderSettings();
      Object.values(settings).forEach((s) => {
        s.enabled = false;
        s.apiKey = '';
      });

      await expect(search('test query', { providerSettings: settings }))
        .rejects.toThrow('No search providers are enabled');
    });

    it('should search with first enabled provider', async () => {
      const settings = createMockProviderSettings();

      const result = await search('test query', { providerSettings: settings });

      expect(mockRouteSearch).toHaveBeenCalledWith(
        'test query',
        'tavily',
        expect.objectContaining({ providerId: 'tavily', apiKey: 'test-tavily-key' }),
        expect.any(Object)
      );
      expect(result.provider).toBe('tavily');
    });

    it('should search with specific provider when specified', async () => {
      const settings = createMockProviderSettings();

      await search('test query', {
        provider: 'perplexity',
        providerSettings: settings,
      });

      expect(mockRouteSearch).toHaveBeenCalledWith(
        'test query',
        'perplexity',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should throw error when specific provider is not enabled/configured', async () => {
      const settings = createMockProviderSettings();
      settings.google.enabled = true;
      settings.google.apiKey = 'google-key';
      settings.google.cx = ''; // missing cx

      await expect(
        search('test query', {
          provider: 'google',
          providerSettings: settings,
        })
      ).rejects.toThrow('missing required configuration');
    });

    it('should fallback to next provider on failure when fallback is enabled', async () => {
      mockRouteSearch
        .mockRejectedValueOnce(new Error('Tavily failed'))
        .mockResolvedValueOnce({ ...mockSearchResponse, provider: 'perplexity' });

      const settings = createMockProviderSettings();
      const result = await search('test query', {
        providerSettings: settings,
        fallbackEnabled: true,
      });

      expect(result.provider).toBe('perplexity');
    });

    it('should not fallback when fallback is disabled', async () => {
      mockRouteSearch.mockRejectedValueOnce(new Error('Tavily failed'));

      const settings = createMockProviderSettings();

      await expect(
        search('test query', {
          provider: 'tavily',
          providerSettings: settings,
          fallbackEnabled: false,
        })
      ).rejects.toThrow('Tavily failed');
    });
  });

  describe('autoSearch', () => {
    it('should search with fallback enabled', async () => {
      const settings = createMockProviderSettings();

      const result = await autoSearch('test query', settings);

      expect(result).toBeDefined();
      expect(mockRouteSearch).toHaveBeenCalled();
    });

    it('should pass options to routeSearch', async () => {
      const settings = createMockProviderSettings();

      await autoSearch('test query', settings, { maxResults: 5 });

      expect(mockRouteSearch).toHaveBeenCalledWith(
        'test query',
        'tavily',
        expect.any(Object),
        expect.objectContaining({ maxResults: 5 })
      );
    });
  });

  describe('searchWithProvider', () => {
    it('should call routeSearch with provider settings wrapper', async () => {
      await searchWithProvider('tavily', 'test query', 'api-key', { maxResults: 10 });

      expect(mockRouteSearch).toHaveBeenCalledWith(
        'test query',
        'tavily',
        expect.objectContaining({ providerId: 'tavily', apiKey: 'api-key', enabled: true }),
        expect.objectContaining({ maxResults: 10 })
      );
    });
  });

  describe('testProviderConnection', () => {
    it('should test tavily connection', async () => {
      mockTestTavilyConnection.mockResolvedValue(true);

      const result = await testProviderConnection('tavily', 'api-key');

      expect(mockTestTavilyConnection).toHaveBeenCalledWith('api-key');
      expect(result).toBe(true);
    });

    it('should test serper connection', async () => {
      mockTestSerperConnection.mockResolvedValue(true);

      const result = await testProviderConnection('serper', 'api-key');

      expect(mockTestSerperConnection).toHaveBeenCalledWith('api-key');
      expect(result).toBe(true);
    });

    it('should require cx for google connection test', async () => {
      const result = await testProviderConnection('google', 'api-key');
      expect(result).toBe(false);
      expect(mockTestGoogleConnection).not.toHaveBeenCalled();
    });

    it('should call google test connection when cx is provided', async () => {
      mockTestGoogleConnection.mockResolvedValue(true);

      const result = await testProviderConnection('google', 'api-key', { cx: 'my-cx' });

      expect(mockTestGoogleConnection).toHaveBeenCalledWith('api-key', 'my-cx');
      expect(result).toBe(true);
    });

    it('should return false on connection error', async () => {
      mockTestPerplexityConnection.mockRejectedValue(new Error('Connection failed'));

      const result = await testProviderConnection('perplexity', 'invalid-key');

      expect(result).toBe(false);
    });
  });

  describe('aggregateSearch', () => {
    it('should search with all enabled providers', async () => {
      const settings = createMockProviderSettings();

      const result = await aggregateSearch('test query', settings);

      expect(mockRouteSearch).toHaveBeenCalledTimes(3);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should throw error when no providers are enabled', async () => {
      const settings = createMockProviderSettings();
      Object.values(settings).forEach((s) => {
        s.enabled = false;
        s.apiKey = '';
      });

      await expect(aggregateSearch('test query', settings))
        .rejects.toThrow('No search providers are enabled');
    });

    it('should continue with remaining providers when one fails', async () => {
      mockRouteSearch
        .mockRejectedValueOnce(new Error('Tavily failed'))
        .mockResolvedValueOnce({ ...mockSearchResponse, provider: 'perplexity' })
        .mockResolvedValueOnce({ ...mockSearchResponse, provider: 'bing' });

      const settings = createMockProviderSettings();
      const result = await aggregateSearch('test query', settings);

      expect(result.results.length).toBeGreaterThan(0);
    });
  });

  describe('formatSearchResultsForLLM', () => {
    it('should format results with markdown', () => {
      const formatted = formatSearchResultsForLLM(mockSearchResponse);

      expect(formatted).toContain('## Web Search Results');
      expect(formatted).toContain('test query');
      expect(formatted).toContain('### Search Results');
      expect(formatted).toContain('Test Result 1');
      expect(formatted).toContain('https://example.com/1');
    });

    it('should include AI summary when answer is present', () => {
      const formatted = formatSearchResultsForLLM(mockSearchResponse);

      expect(formatted).toContain('### AI Summary');
      expect(formatted).toContain('Test answer');
    });

    it('should not include AI summary when answer is absent', () => {
      const responseNoAnswer = { ...mockSearchResponse, answer: undefined };
      const formatted = formatSearchResultsForLLM(responseNoAnswer);

      expect(formatted).not.toContain('### AI Summary');
    });
  });

  describe('formatSearchResultsCompact', () => {
    it('should format results compactly', () => {
      const formatted = formatSearchResultsCompact(mockSearchResponse);

      expect(formatted).toContain('[Answer] Test answer');
      expect(formatted).toContain('[1] Test Result 1');
      expect(formatted).toContain('Source: https://example.com/1');
    });

    it('should only show top 5 results', () => {
      const manyResults: SearchResponse = {
        ...mockSearchResponse,
        results: Array.from({ length: 10 }, (_, i) => ({
          title: `Result ${i + 1}`,
          url: `https://example.com/${i + 1}`,
          content: `Content ${i + 1}`,
          score: 1 - i * 0.1,
        })),
      };

      const formatted = formatSearchResultsCompact(manyResults);

      expect(formatted).toContain('[1]');
      expect(formatted).toContain('[5]');
      expect(formatted).not.toContain('[6]');
    });
  });
});

