/**
 * Perplexity Search Provider Tests
 */

import {
  searchWithPerplexity,
  testPerplexityConnection,
} from './perplexity';

jest.mock('../proxy-search-fetch', () => ({
  perplexityFetch: jest.fn(),
}));

import { perplexityFetch } from '../proxy-search-fetch';

const mockPerplexityFetch = perplexityFetch as jest.MockedFunction<typeof perplexityFetch>;

describe('perplexity provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithPerplexity', () => {
    const mockPerplexityResponse = {
      results: [
        {
          title: 'Result 1',
          url: 'https://example.com/1',
          snippet: 'Snippet 1',
          date: '2024-01-01',
        },
        {
          title: 'Result 2',
          url: 'https://example.com/2',
          snippet: 'Snippet 2',
        },
      ],
    };

    beforeEach(() => {
      mockPerplexityFetch.mockResolvedValue(createMockResponse(mockPerplexityResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithPerplexity('test', '')).rejects.toThrow('Perplexity API key is required');
    });

    it('should make request with correct URL and headers', async () => {
      await searchWithPerplexity('test query', 'test-api-key');
      
      expect(mockPerplexityFetch).toHaveBeenCalledWith(
        'https://api.perplexity.ai/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include query in request body', async () => {
      await searchWithPerplexity('test query', 'key');
      
      const requestBody = JSON.parse(mockPerplexityFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.query).toBe('test query');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithPerplexity('test query', 'key');
      
      expect(result.provider).toBe('perplexity');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
    });

    it('should map results correctly', async () => {
      const result = await searchWithPerplexity('test query', 'key');
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Snippet 1',
        publishedDate: '2024-01-01',
      });
    });

    it('should handle API errors', async () => {
      mockPerplexityFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, false, 401));
      
      await expect(searchWithPerplexity('test', 'key')).rejects.toThrow('Perplexity API error');
    });

    it('should handle network errors', async () => {
      mockPerplexityFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithPerplexity('test', 'key')).rejects.toThrow('Perplexity search failed');
    });

    it('should handle recency option', async () => {
      await searchWithPerplexity('test', 'key', { recency: 'week' });
      
      const requestBody = JSON.parse(mockPerplexityFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.search_recency_filter).toBe('week');
    });

    it('should handle domain filters', async () => {
      await searchWithPerplexity('test', 'key', {
        includeDomains: ['example.com'],
      });
      
      const requestBody = JSON.parse(mockPerplexityFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.search_domain_filter).toContain('example.com');
    });

    it('should use latest after/before date filter parameter names', async () => {
      await searchWithPerplexity('test', 'key', {
        searchAfterDate: '01/01/2024',
        searchBeforeDate: '01/31/2024',
      });

      const requestBody = JSON.parse(mockPerplexityFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.search_after_date_filter).toBe('01/01/2024');
      expect(requestBody.search_before_date_filter).toBe('01/31/2024');
      expect(requestBody.search_after_date).toBeUndefined();
      expect(requestBody.search_before_date).toBeUndefined();
    });

    it('should encode excludeDomains as -domain entries', async () => {
      await searchWithPerplexity('test', 'key', {
        excludeDomains: ['example.com', '-already.com'],
      });

      const requestBody = JSON.parse(mockPerplexityFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.search_domain_filter).toEqual(['-example.com', '-already.com']);
    });

    it('should throw when includeDomains and excludeDomains are both provided', async () => {
      await expect(searchWithPerplexity('test', 'key', {
        includeDomains: ['example.com'],
        excludeDomains: ['example.org'],
      })).rejects.toThrow('mixing includeDomains and excludeDomains');
    });

    it('should set language filter as an array', async () => {
      await searchWithPerplexity('test', 'key', {
        language: 'en',
      });

      const requestBody = JSON.parse(mockPerplexityFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.search_language_filter).toEqual(['en']);
    });
  });

  describe('testPerplexityConnection', () => {
    it('should return true on successful connection', async () => {
      mockPerplexityFetch.mockResolvedValue(createMockResponse({
        results: [],
      }));
      
      const result = await testPerplexityConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockPerplexityFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testPerplexityConnection('invalid-key');
      
      expect(result).toBe(false);
    });
  });
});
