/**
 * Brave Search Provider Tests
 */

import {
  searchWithBrave,
  searchNewsWithBrave,
  searchImagesWithBrave,
  searchVideosWithBrave,
  testBraveConnection,
} from './brave';

jest.mock('../proxy-search-fetch', () => ({
  braveFetch: jest.fn(),
}));

import { braveFetch } from '../proxy-search-fetch';

const mockBraveFetch = braveFetch as jest.MockedFunction<typeof braveFetch>;

describe('brave provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithBrave', () => {
    const mockBraveResponse = {
      type: 'search',
      query: { original: 'test query' },
      web: {
        type: 'search',
        results: [
          {
            title: 'Result 1',
            url: 'https://example.com/1',
            description: 'Description 1',
            page_age: '2024-01-01',
            meta_url: { hostname: 'example.com', favicon: 'https://example.com/favicon.ico' },
          },
          {
            title: 'Result 2',
            url: 'https://example.com/2',
            description: 'Description 2',
          },
        ],
      },
    };

    beforeEach(() => {
      mockBraveFetch.mockResolvedValue(createMockResponse(mockBraveResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithBrave('test', '')).rejects.toThrow('Brave API key is required');
    });

    it('should make request with correct URL and headers', async () => {
      await searchWithBrave('test query', 'test-api-key');
      
      expect(mockBraveFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.search.brave.com/res/v1/web/search'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Subscription-Token': 'test-api-key',
          }),
        })
      );
    });

    it('should include query parameters', async () => {
      await searchWithBrave('test query', 'key', { maxResults: 15 });
      
      const url = mockBraveFetch.mock.calls[0][0] as string;
      expect(url).toContain('q=test+query');
      expect(url).toContain('count=15');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithBrave('test query', 'key');
      
      expect(result.provider).toBe('brave');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
    });

    it('should map results correctly', async () => {
      const result = await searchWithBrave('test query', 'key');
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Description 1',
        publishedDate: '2024-01-01',
        source: 'example.com',
        favicon: 'https://example.com/favicon.ico',
      });
    });

    it('should include infobox as answer', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({
        ...mockBraveResponse,
        infobox: {
          type: 'infobox',
          title: 'Test',
          url: 'https://example.com',
          description: 'Short description',
          long_desc: 'Longer description with more details',
        },
      }));
      
      const result = await searchWithBrave('test', 'key');
      
      expect(result.answer).toBe('Longer description with more details');
    });

    it('should handle country and language options', async () => {
      await searchWithBrave('test', 'key', { country: 'US', language: 'en' });
      
      const url = mockBraveFetch.mock.calls[0][0] as string;
      expect(url).toContain('country=US');
      expect(url).toContain('search_lang=en');
    });

    it('should handle recency filter', async () => {
      await searchWithBrave('test', 'key', { recency: 'week' });
      
      const url = mockBraveFetch.mock.calls[0][0] as string;
      expect(url).toContain('freshness=pw');
    });

    it('should handle API errors', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, false, 401));
      
      await expect(searchWithBrave('test', 'key')).rejects.toThrow('Brave API error: 401');
    });

    it('should handle network errors', async () => {
      mockBraveFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithBrave('test', 'key')).rejects.toThrow('Brave search failed: Network error');
    });

    it('should handle empty web results', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({
        type: 'search',
        query: { original: 'test' },
      }));
      
      const result = await searchWithBrave('test', 'key');
      
      expect(result.results).toHaveLength(0);
    });

    it('should handle safesearch option', async () => {
      await searchWithBrave('test', 'key', { safesearch: 'strict' });
      
      const url = mockBraveFetch.mock.calls[0][0] as string;
      expect(url).toContain('safesearch=strict');
    });
  });

  describe('searchNewsWithBrave', () => {
    const mockNewsResponse = {
      type: 'news',
      query: { original: 'test' },
      news: {
        type: 'news',
        results: [
          {
            title: 'News 1',
            url: 'https://example.com/news1',
            description: 'News description 1',
            page_age: '2024-01-15',
            source: 'News Provider',
          },
        ],
      },
    };

    beforeEach(() => {
      mockBraveFetch.mockResolvedValue(createMockResponse(mockNewsResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchNewsWithBrave('test', '')).rejects.toThrow('Brave API key is required');
    });

    it('should make request to news endpoint', async () => {
      await searchNewsWithBrave('test', 'key');
      
      expect(mockBraveFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.search.brave.com/res/v1/news/search'),
        expect.any(Object)
      );
    });

    it('should return formatted news response', async () => {
      const result = await searchNewsWithBrave('test', 'key');
      
      expect(result.provider).toBe('brave');
      expect(result.results).toHaveLength(1);
      expect(result.results[0].source).toBe('News Provider');
    });

    it('should handle API errors', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({}, false, 500));
      
      await expect(searchNewsWithBrave('test', 'key')).rejects.toThrow('Brave News API error');
    });
  });

  describe('searchImagesWithBrave', () => {
    const mockImagesResponse = {
      type: 'images',
      query: { original: 'test' },
      results: [
        {
          title: 'Image 1',
          url: 'https://example.com/page',
          source: 'example.com',
          thumbnail: { src: 'https://example.com/thumb.jpg', width: 150, height: 100 },
          properties: { url: 'https://example.com/full.jpg', width: 800, height: 600 },
        },
      ],
    };

    beforeEach(() => {
      mockBraveFetch.mockResolvedValue(createMockResponse(mockImagesResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchImagesWithBrave('test', '')).rejects.toThrow('Brave API key is required');
    });

    it('should make request to images endpoint', async () => {
      await searchImagesWithBrave('test', 'key');
      
      expect(mockBraveFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.search.brave.com/res/v1/images/search'),
        expect.any(Object)
      );
    });

    it('should return formatted images response', async () => {
      const result = await searchImagesWithBrave('test', 'key');
      
      expect(result.provider).toBe('brave');
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
      mockBraveFetch.mockResolvedValue(createMockResponse({}, false, 403));
      
      await expect(searchImagesWithBrave('test', 'key')).rejects.toThrow('Brave Images API error');
    });
  });

  describe('searchVideosWithBrave', () => {
    const mockVideosResponse = {
      type: 'videos',
      query: { original: 'test' },
      videos: {
        type: 'videos',
        results: [
          {
            title: 'Video 1',
            url: 'https://example.com/video1',
            description: 'Video description',
            page_age: '2024-01-10',
            video: { publisher: 'Video Publisher' },
            thumbnail: { src: 'https://example.com/video-thumb.jpg' },
          },
        ],
      },
    };

    beforeEach(() => {
      mockBraveFetch.mockResolvedValue(createMockResponse(mockVideosResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchVideosWithBrave('test', '')).rejects.toThrow('Brave API key is required');
    });

    it('should make request to videos endpoint', async () => {
      await searchVideosWithBrave('test', 'key');
      
      expect(mockBraveFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.search.brave.com/res/v1/videos/search'),
        expect.any(Object)
      );
    });

    it('should return formatted videos response', async () => {
      const result = await searchVideosWithBrave('test', 'key');
      
      expect(result.provider).toBe('brave');
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        title: 'Video 1',
        url: 'https://example.com/video1',
        content: 'Video description',
        source: 'Video Publisher',
      });
    });

    it('should handle API errors', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({}, false, 429));
      
      await expect(searchVideosWithBrave('test', 'key')).rejects.toThrow('Brave Videos API error');
    });
  });

  describe('testBraveConnection', () => {
    it('should return true on successful connection', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({
        type: 'search',
        query: { original: 'test' },
        web: { results: [] },
      }));
      
      const result = await testBraveConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testBraveConnection('invalid-key');
      
      expect(result).toBe(false);
    });

    it('should use minimal search for testing', async () => {
      mockBraveFetch.mockResolvedValue(createMockResponse({
        type: 'search',
        query: { original: 'test' },
        web: { results: [] },
      }));
      
      await testBraveConnection('key');
      
      const url = mockBraveFetch.mock.calls[0][0] as string;
      expect(url).toContain('count=1');
    });
  });
});
