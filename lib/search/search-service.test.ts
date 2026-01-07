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

jest.mock('./providers/tavily', () => ({
  searchWithTavily: jest.fn(),
  testTavilyConnection: jest.fn(),
}));

jest.mock('./providers/perplexity', () => ({
  searchWithPerplexity: jest.fn(),
  testPerplexityConnection: jest.fn(),
}));

jest.mock('./providers/exa', () => ({
  searchWithExa: jest.fn(),
  testExaConnection: jest.fn(),
}));

jest.mock('./providers/searchapi', () => ({
  searchWithSearchAPI: jest.fn(),
  testSearchAPIConnection: jest.fn(),
}));

jest.mock('./providers/serpapi', () => ({
  searchWithSerpAPI: jest.fn(),
  testSerpAPIConnection: jest.fn(),
}));

jest.mock('./providers/bing', () => ({
  searchWithBing: jest.fn(),
  testBingConnection: jest.fn(),
}));

jest.mock('./providers/google', () => ({
  searchWithGoogle: jest.fn(),
  testGoogleConnection: jest.fn(),
}));

jest.mock('./providers/google-ai', () => ({
  searchWithGoogleAI: jest.fn(),
  testGoogleAIConnection: jest.fn(),
}));

jest.mock('./providers/brave', () => ({
  searchWithBrave: jest.fn(),
  testBraveConnection: jest.fn(),
}));

import { searchWithTavily, testTavilyConnection } from './providers/tavily';
import { searchWithPerplexity, testPerplexityConnection } from './providers/perplexity';
import { searchWithBing, testBingConnection } from './providers/bing';
const mockSearchWithTavily = searchWithTavily as jest.MockedFunction<typeof searchWithTavily>;
const mockTestTavilyConnection = testTavilyConnection as jest.MockedFunction<typeof testTavilyConnection>;
const mockSearchWithPerplexity = searchWithPerplexity as jest.MockedFunction<typeof searchWithPerplexity>;
const mockTestPerplexityConnection = testPerplexityConnection as jest.MockedFunction<typeof testPerplexityConnection>;
const mockSearchWithBing = searchWithBing as jest.MockedFunction<typeof searchWithBing>;
const mockTestBingConnection = testBingConnection as jest.MockedFunction<typeof testBingConnection>;

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
    serpapi: { providerId: 'serpapi', apiKey: '', enabled: false, priority: 5 },
    bing: { providerId: 'bing', apiKey: 'test-bing-key', enabled: true, priority: 6 },
    google: { providerId: 'google', apiKey: '', enabled: false, priority: 7 },
    'google-ai': { providerId: 'google-ai', apiKey: '', enabled: false, priority: 8 },
    brave: { providerId: 'brave', apiKey: '', enabled: false, priority: 9 },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchWithTavily.mockResolvedValue(mockSearchResponse);
    mockSearchWithPerplexity.mockResolvedValue({ ...mockSearchResponse, provider: 'perplexity' });
    mockSearchWithBing.mockResolvedValue({ ...mockSearchResponse, provider: 'bing' });
  });

  describe('search', () => {
    it('should throw error when provider settings are not provided', async () => {
      await expect(search('test query', {})).rejects.toThrow('Provider settings are required');
    });

    it('should throw error when no providers are enabled', async () => {
      const settings = createMockProviderSettings();
      Object.values(settings).forEach(s => { s.enabled = false; s.apiKey = ''; });
      
      await expect(search('test query', { providerSettings: settings }))
        .rejects.toThrow('No search providers are enabled');
    });

    it('should search with first enabled provider', async () => {
      const settings = createMockProviderSettings();
      
      const result = await search('test query', { providerSettings: settings });
      
      expect(mockSearchWithTavily).toHaveBeenCalledWith(
        'test query',
        'test-tavily-key',
        expect.any(Object)
      );
      expect(result.provider).toBe('tavily');
    });

    it('should search with specific provider when specified', async () => {
      const settings = createMockProviderSettings();
      
      await search('test query', {
        provider: 'tavily',
        providerSettings: settings,
      });
      
      expect(mockSearchWithTavily).toHaveBeenCalled();
    });

    it('should throw error when specific provider is not enabled', async () => {
      const settings = createMockProviderSettings();
      settings.exa.enabled = false;
      
      await expect(
        search('test query', {
          provider: 'exa',
          providerSettings: settings,
        })
      ).rejects.toThrow('Provider exa is not enabled or missing API key');
    });

    it('should fallback to next provider on failure when fallback is enabled', async () => {
      mockSearchWithTavily.mockRejectedValueOnce(new Error('Tavily failed'));
      
      const settings = createMockProviderSettings();
      const result = await search('test query', {
        providerSettings: settings,
        fallbackEnabled: true,
      });
      
      expect(mockSearchWithTavily).toHaveBeenCalled();
      expect(mockSearchWithPerplexity).toHaveBeenCalled();
      expect(result.provider).toBe('perplexity');
    });

    it('should not fallback when fallback is disabled', async () => {
      mockSearchWithTavily.mockRejectedValueOnce(new Error('Tavily failed'));
      
      const settings = createMockProviderSettings();
      
      await expect(
        search('test query', {
          provider: 'tavily',
          providerSettings: settings,
          fallbackEnabled: false,
        })
      ).rejects.toThrow('Tavily failed');
    });

    it('should throw last error when all providers fail', async () => {
      mockSearchWithTavily.mockRejectedValue(new Error('Tavily failed'));
      mockSearchWithPerplexity.mockRejectedValue(new Error('Perplexity failed'));
      mockSearchWithBing.mockRejectedValue(new Error('Bing failed'));
      
      const settings = createMockProviderSettings();
      
      await expect(search('test query', { providerSettings: settings }))
        .rejects.toThrow();
    });
  });

  describe('autoSearch', () => {
    it('should search with fallback enabled', async () => {
      const settings = createMockProviderSettings();
      
      const result = await autoSearch('test query', settings);
      
      expect(result).toBeDefined();
      expect(mockSearchWithTavily).toHaveBeenCalled();
    });

    it('should pass options to search', async () => {
      const settings = createMockProviderSettings();
      
      await autoSearch('test query', settings, { maxResults: 5 });
      
      expect(mockSearchWithTavily).toHaveBeenCalledWith(
        'test query',
        'test-tavily-key',
        expect.objectContaining({ maxResults: 5 })
      );
    });
  });

  describe('searchWithProvider', () => {
    it('should search with specific provider', async () => {
      const result = await searchWithProvider('tavily', 'test query', 'api-key');
      
      expect(mockSearchWithTavily).toHaveBeenCalledWith(
        'test query',
        'api-key',
        {}
      );
      expect(result).toBeDefined();
    });

    it('should pass options to provider', async () => {
      await searchWithProvider('tavily', 'test query', 'api-key', { maxResults: 10 });
      
      expect(mockSearchWithTavily).toHaveBeenCalledWith(
        'test query',
        'api-key',
        { maxResults: 10 }
      );
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        searchWithProvider('unknown' as SearchProviderType, 'test', 'key')
      ).rejects.toThrow('Unknown search provider');
    });
  });

  describe('testProviderConnection', () => {
    it('should test tavily connection', async () => {
      mockTestTavilyConnection.mockResolvedValue(true);
      
      const result = await testProviderConnection('tavily', 'api-key');
      
      expect(mockTestTavilyConnection).toHaveBeenCalledWith('api-key');
      expect(result).toBe(true);
    });

    it('should test perplexity connection', async () => {
      mockTestPerplexityConnection.mockResolvedValue(true);
      
      const result = await testProviderConnection('perplexity', 'api-key');
      
      expect(mockTestPerplexityConnection).toHaveBeenCalledWith('api-key');
      expect(result).toBe(true);
    });

    it('should test bing connection', async () => {
      mockTestBingConnection.mockResolvedValue(true);
      
      const result = await testProviderConnection('bing', 'api-key');
      
      expect(mockTestBingConnection).toHaveBeenCalledWith('api-key');
      expect(result).toBe(true);
    });

    it('should return false on connection error', async () => {
      mockTestTavilyConnection.mockRejectedValue(new Error('Connection failed'));
      
      const result = await testProviderConnection('tavily', 'invalid-key');
      
      expect(result).toBe(false);
    });

    it('should return false for unknown provider', async () => {
      const result = await testProviderConnection('unknown' as SearchProviderType, 'key');
      
      expect(result).toBe(false);
    });
  });

  describe('aggregateSearch', () => {
    it('should search with all enabled providers', async () => {
      const settings = createMockProviderSettings();
      
      const result = await aggregateSearch('test query', settings);
      
      expect(mockSearchWithTavily).toHaveBeenCalled();
      expect(mockSearchWithPerplexity).toHaveBeenCalled();
      expect(mockSearchWithBing).toHaveBeenCalled();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should throw error when no providers are enabled', async () => {
      const settings = createMockProviderSettings();
      Object.values(settings).forEach(s => { s.enabled = false; s.apiKey = ''; });
      
      await expect(aggregateSearch('test query', settings))
        .rejects.toThrow('No search providers are enabled');
    });

    it('should continue with remaining providers when one fails', async () => {
      mockSearchWithTavily.mockRejectedValue(new Error('Tavily failed'));
      
      const settings = createMockProviderSettings();
      const result = await aggregateSearch('test query', settings);
      
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should throw error when all providers fail', async () => {
      mockSearchWithTavily.mockRejectedValue(new Error('Failed'));
      mockSearchWithPerplexity.mockRejectedValue(new Error('Failed'));
      mockSearchWithBing.mockRejectedValue(new Error('Failed'));
      
      const settings = createMockProviderSettings();
      
      await expect(aggregateSearch('test query', settings))
        .rejects.toThrow('All search providers failed');
    });

    it('should deduplicate results by URL', async () => {
      const duplicateResult = {
        title: 'Same Result',
        url: 'https://example.com/same',
        content: 'Same content',
        score: 0.9,
      };
      
      mockSearchWithTavily.mockResolvedValue({
        ...mockSearchResponse,
        results: [duplicateResult],
      });
      mockSearchWithPerplexity.mockResolvedValue({
        ...mockSearchResponse,
        provider: 'perplexity',
        results: [duplicateResult],
      });
      
      const settings = createMockProviderSettings();
      settings.bing.enabled = false;
      
      const result = await aggregateSearch('test query', settings);
      
      const sameUrls = result.results.filter(r => r.url === 'https://example.com/same');
      expect(sameUrls.length).toBe(1);
    });

    it('should preserve answer from first provider with answer', async () => {
      mockSearchWithTavily.mockResolvedValue({
        ...mockSearchResponse,
        answer: 'Tavily answer',
      });
      
      const settings = createMockProviderSettings();
      const result = await aggregateSearch('test query', settings);
      
      expect(result.answer).toBe('Tavily answer');
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

    it('should include published date when present', () => {
      const formatted = formatSearchResultsForLLM(mockSearchResponse);
      
      expect(formatted).toContain('Published: 2024-01-01');
    });

    it('should include provider and response time', () => {
      const formatted = formatSearchResultsForLLM(mockSearchResponse);
      
      expect(formatted).toContain('Provider: tavily');
      expect(formatted).toContain('500ms');
    });
  });

  describe('formatSearchResultsCompact', () => {
    it('should format results compactly', () => {
      const formatted = formatSearchResultsCompact(mockSearchResponse);
      
      expect(formatted).toContain('[Answer] Test answer');
      expect(formatted).toContain('[1] Test Result 1');
      expect(formatted).toContain('Source: https://example.com/1');
    });

    it('should limit content length', () => {
      const longContent = 'A'.repeat(500);
      const responseWithLongContent: SearchResponse = {
        ...mockSearchResponse,
        results: [{ title: 'Test', url: 'https://test.com', content: longContent, score: 0.9 }],
      };
      
      const formatted = formatSearchResultsCompact(responseWithLongContent);
      
      expect(formatted).toContain('...');
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

    it('should not include answer section when answer is absent', () => {
      const responseNoAnswer = { ...mockSearchResponse, answer: undefined };
      const formatted = formatSearchResultsCompact(responseNoAnswer);
      
      expect(formatted).not.toContain('[Answer]');
    });
  });
});
