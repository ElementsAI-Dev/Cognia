/**
 * Serper Search Provider Tests
 */

import {
  searchWithSerper,
  searchNewsWithSerper,
  searchImagesWithSerper,
  searchVideosWithSerper,
  searchScholarWithSerper,
  testSerperConnection,
} from './serper';

jest.mock('../proxy-search-fetch', () => ({
  serperFetch: jest.fn(),
}));

import { serperFetch } from '../proxy-search-fetch';

const mockSerperFetch = serperFetch as jest.MockedFunction<typeof serperFetch>;

describe('serper provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithSerper', () => {
    beforeEach(() => {
      mockSerperFetch.mockResolvedValue(
        createMockResponse({
          organic: [
            { title: 'Result 1', link: 'https://example.com/1', snippet: 'Snippet 1', position: 1 },
            { title: 'Result 2', link: 'https://example.com/2', snippet: 'Snippet 2', position: 2 },
          ],
          knowledgeGraph: { description: 'KG description' },
        })
      );
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithSerper('test', '')).rejects.toThrow('Serper API key is required');
    });

    it('should make request with correct URL, method, headers, and body mapping', async () => {
      await searchWithSerper('test query', 'test-api-key', {
        maxResults: 3,
        country: 'us',
        language: 'en',
        recency: 'week',
      });

      expect(mockSerperFetch).toHaveBeenCalledWith(
        'https://google.serper.dev/search',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-KEY': 'test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );

      const body = JSON.parse((mockSerperFetch.mock.calls[0]?.[1]?.body as string) || '{}');
      expect(body).toMatchObject({
        q: 'test query',
        num: 3,
        gl: 'us',
        hl: 'en',
        tbs: 'qdr:w',
      });
    });

    it('should return formatted search response', async () => {
      const result = await searchWithSerper('test query', 'key');

      expect(result.provider).toBe('serper');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.answer).toBe('KG description');
    });

    it('should handle API errors', async () => {
      mockSerperFetch.mockResolvedValue(createMockResponse({ error: 'Bad request' }, false, 400));

      await expect(searchWithSerper('test', 'key')).rejects.toThrow('Serper API error');
    });
  });

  describe('searchNewsWithSerper', () => {
    it('should map news results', async () => {
      mockSerperFetch.mockResolvedValue(
        createMockResponse({
          news: [
            { title: 'News 1', link: 'https://example.com/n1', snippet: 'N1', position: 1, date: '2024-01-01' },
          ],
        })
      );

      const result = await searchNewsWithSerper('news', 'key');

      expect(result.provider).toBe('serper');
      expect(result.results[0]).toMatchObject({
        title: 'News 1',
        url: 'https://example.com/n1',
        content: 'N1',
        publishedDate: '2024-01-01',
      });
    });
  });

  describe('searchImagesWithSerper', () => {
    it('should map images to SearchResponse.images', async () => {
      mockSerperFetch.mockResolvedValue(
        createMockResponse({
          images: [
            {
              imageUrl: 'https://example.com/img.jpg',
              thumbnailUrl: 'https://example.com/thumb.jpg',
              title: 'Img',
              imageWidth: 100,
              imageHeight: 80,
            },
          ],
        })
      );

      const result = await searchImagesWithSerper('img', 'key');

      expect(result.provider).toBe('serper');
      expect(result.images).toHaveLength(1);
      expect(result.images?.[0]).toMatchObject({
        url: 'https://example.com/img.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        title: 'Img',
        width: 100,
        height: 80,
      });
    });
  });

  describe('searchVideosWithSerper', () => {
    it('should map videos to SearchResponse.results', async () => {
      mockSerperFetch.mockResolvedValue(
        createMockResponse({
          videos: [
            { title: 'Video 1', link: 'https://example.com/v1', snippet: 'V1', position: 1 },
          ],
        })
      );

      const result = await searchVideosWithSerper('video', 'key');

      expect(result.provider).toBe('serper');
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        title: 'Video 1',
        url: 'https://example.com/v1',
        content: 'V1',
      });
    });
  });

  describe('searchScholarWithSerper', () => {
    it('should call /scholar and return results', async () => {
      mockSerperFetch.mockResolvedValue(
        createMockResponse({
          organic: [
            { title: 'Paper', link: 'https://example.com/p', snippet: 'Abstract', position: 1 },
          ],
        })
      );

      const result = await searchScholarWithSerper('paper', 'key');

      expect(mockSerperFetch).toHaveBeenCalledWith(
        'https://google.serper.dev/scholar',
        expect.any(Object)
      );
      expect(result.provider).toBe('serper');
      expect(result.results).toHaveLength(1);
    });
  });

  describe('testSerperConnection', () => {
    it('should return true on successful connection', async () => {
      mockSerperFetch.mockResolvedValue(createMockResponse({ organic: [] }));

      const ok = await testSerperConnection('key');
      expect(ok).toBe(true);
    });

    it('should return false on failure', async () => {
      mockSerperFetch.mockResolvedValue(createMockResponse({}, false, 401));

      const ok = await testSerperConnection('bad');
      expect(ok).toBe(false);
    });
  });
});

