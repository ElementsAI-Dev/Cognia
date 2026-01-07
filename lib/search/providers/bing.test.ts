/**
 * Bing Search Provider Tests
 */

import {
  searchWithBing,
  searchNewsWithBing,
  searchImagesWithBing,
  testBingConnection,
} from './bing';

jest.mock('../proxy-search-fetch', () => ({
  bingFetch: jest.fn(),
}));

import { bingFetch } from '../proxy-search-fetch';

const mockBingFetch = bingFetch as jest.MockedFunction<typeof bingFetch>;

describe('bing provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithBing', () => {
    const mockBingResponse = {
      _type: 'SearchResponse',
      queryContext: { originalQuery: 'test query' },
      webPages: {
        totalEstimatedMatches: 100,
        value: [
          {
            id: '1',
            name: 'Result 1',
            url: 'https://example.com/1',
            snippet: 'Snippet 1',
            dateLastCrawled: '2024-01-01',
          },
          {
            id: '2',
            name: 'Result 2',
            url: 'https://example.com/2',
            snippet: 'Snippet 2',
          },
        ],
      },
    };

    beforeEach(() => {
      mockBingFetch.mockResolvedValue(createMockResponse(mockBingResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithBing('test', '')).rejects.toThrow('Bing API key is required');
    });

    it('should make request with correct URL and headers', async () => {
      await searchWithBing('test query', 'test-api-key');
      
      expect(mockBingFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.bing.microsoft.com/v7.0/search'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Ocp-Apim-Subscription-Key': 'test-api-key' },
        })
      );
    });

    it('should include query parameters', async () => {
      await searchWithBing('test query', 'key', { maxResults: 15 });
      
      const url = mockBingFetch.mock.calls[0][0] as string;
      expect(url).toContain('q=test+query');
      expect(url).toContain('count=15');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithBing('test query', 'key');
      
      expect(result.provider).toBe('bing');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(100);
    });

    it('should map results correctly', async () => {
      const result = await searchWithBing('test query', 'key');
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Snippet 1',
        publishedDate: '2024-01-01',
      });
    });

    it('should include computation as answer', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({
        ...mockBingResponse,
        computation: { expression: '2 + 2', value: '4' },
      }));
      
      const result = await searchWithBing('2 + 2', 'key');
      
      expect(result.answer).toBe('2 + 2 = 4');
    });

    it('should include images when available', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({
        ...mockBingResponse,
        images: {
          value: [
            { name: 'Image 1', contentUrl: 'https://example.com/img.jpg', thumbnailUrl: 'https://example.com/thumb.jpg' },
          ],
        },
      }));
      
      const result = await searchWithBing('test', 'key');
      
      expect(result.images).toHaveLength(1);
      expect(result.images![0].url).toBe('https://example.com/img.jpg');
    });

    it('should handle country and language options', async () => {
      await searchWithBing('test', 'key', { country: 'US', language: 'en' });
      
      const url = mockBingFetch.mock.calls[0][0] as string;
      expect(url).toContain('cc=US');
      expect(url).toContain('setLang=en');
    });

    it('should handle recency filter', async () => {
      await searchWithBing('test', 'key', { recency: 'week' });
      
      const url = mockBingFetch.mock.calls[0][0] as string;
      expect(url).toContain('freshness=Week');
    });

    it('should handle response filter', async () => {
      await searchWithBing('test', 'key', { responseFilter: ['Webpages', 'News'] });
      
      const url = mockBingFetch.mock.calls[0][0] as string;
      expect(url).toContain('responseFilter=Webpages%2CNews');
    });

    it('should handle API errors', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, false, 401));
      
      await expect(searchWithBing('test', 'key')).rejects.toThrow('Bing API error: 401');
    });

    it('should handle network errors', async () => {
      mockBingFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithBing('test', 'key')).rejects.toThrow('Bing search failed: Network error');
    });

    it('should handle empty webPages', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({
        _type: 'SearchResponse',
        queryContext: { originalQuery: 'test' },
      }));
      
      const result = await searchWithBing('test', 'key');
      
      expect(result.results).toHaveLength(0);
    });
  });

  describe('searchNewsWithBing', () => {
    const mockNewsResponse = {
      _type: 'News',
      value: [
        {
          name: 'News 1',
          url: 'https://example.com/news1',
          description: 'News description 1',
          datePublished: '2024-01-15',
          provider: [{ name: 'News Provider' }],
        },
      ],
      totalEstimatedMatches: 50,
    };

    beforeEach(() => {
      mockBingFetch.mockResolvedValue(createMockResponse(mockNewsResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchNewsWithBing('test', '')).rejects.toThrow('Bing API key is required');
    });

    it('should make request to news endpoint', async () => {
      await searchNewsWithBing('test', 'key');
      
      expect(mockBingFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.bing.microsoft.com/v7.0/news/search'),
        expect.any(Object)
      );
    });

    it('should return formatted news response', async () => {
      const result = await searchNewsWithBing('test', 'key');
      
      expect(result.provider).toBe('bing');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe('News Provider');
    });

    it('should handle API errors', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({}, false, 500));
      
      await expect(searchNewsWithBing('test', 'key')).rejects.toThrow('Bing News API error');
    });
  });

  describe('searchImagesWithBing', () => {
    const mockImagesResponse = {
      _type: 'Images',
      value: [
        {
          name: 'Image 1',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          contentUrl: 'https://example.com/full.jpg',
          hostPageUrl: 'https://example.com/page',
          width: 800,
          height: 600,
        },
      ],
      totalEstimatedMatches: 1000,
    };

    beforeEach(() => {
      mockBingFetch.mockResolvedValue(createMockResponse(mockImagesResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchImagesWithBing('test', '')).rejects.toThrow('Bing API key is required');
    });

    it('should make request to images endpoint', async () => {
      await searchImagesWithBing('test', 'key');
      
      expect(mockBingFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.bing.microsoft.com/v7.0/images/search'),
        expect.any(Object)
      );
    });

    it('should return formatted images response', async () => {
      const result = await searchImagesWithBing('test', 'key');
      
      expect(result.provider).toBe('bing');
      expect(result.results).toHaveLength(0);
      expect(result.images).toHaveLength(1);
      expect(result.images![0]).toMatchObject({
        url: 'https://example.com/full.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        title: 'Image 1',
        width: 800,
        height: 600,
      });
    });

    it('should handle API errors', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({}, false, 403));
      
      await expect(searchImagesWithBing('test', 'key')).rejects.toThrow('Bing Image API error');
    });
  });

  describe('testBingConnection', () => {
    it('should return true on successful connection', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({
        _type: 'SearchResponse',
        queryContext: { originalQuery: 'test' },
        webPages: { value: [] },
      }));
      
      const result = await testBingConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testBingConnection('invalid-key');
      
      expect(result).toBe(false);
    });

    it('should use minimal search for testing', async () => {
      mockBingFetch.mockResolvedValue(createMockResponse({
        _type: 'SearchResponse',
        queryContext: { originalQuery: 'test' },
        webPages: { value: [] },
      }));
      
      await testBingConnection('key');
      
      const url = mockBingFetch.mock.calls[0][0] as string;
      expect(url).toContain('count=1');
    });
  });
});
