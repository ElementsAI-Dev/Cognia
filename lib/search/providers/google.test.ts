/**
 * Google Custom Search Provider Tests
 */

import {
  searchWithGoogle,
  testGoogleConnection,
} from './google';

jest.mock('../proxy-search-fetch', () => ({
  googleFetch: jest.fn(),
}));

import { googleFetch } from '../proxy-search-fetch';

const mockGoogleFetch = googleFetch as jest.MockedFunction<typeof googleFetch>;

describe('google provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithGoogle', () => {
    const mockGoogleResponse = {
      kind: 'customsearch#search',
      searchInformation: {
        totalResults: '1000',
        searchTime: 0.5,
      },
      items: [
        {
          title: 'Result 1',
          link: 'https://example.com/1',
          snippet: 'Snippet 1',
          pagemap: {
            metatags: [{ 'article:published_time': '2024-01-01' }],
          },
        },
        {
          title: 'Result 2',
          link: 'https://example.com/2',
          snippet: 'Snippet 2',
        },
      ],
    };

    beforeEach(() => {
      mockGoogleFetch.mockResolvedValue(createMockResponse(mockGoogleResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithGoogle('test', '', { cx: 'test-cx' })).rejects.toThrow('Google API key is required');
    });

    it('should throw error when CX is missing', async () => {
      await expect(searchWithGoogle('test', 'key', {})).rejects.toThrow('Google Custom Search Engine ID (cx) is required');
    });

    it('should make request with correct URL parameters', async () => {
      await searchWithGoogle('test query', 'test-api-key', { cx: 'test-cx' });
      
      const url = mockGoogleFetch.mock.calls[0][0] as string;
      expect(url).toContain('https://www.googleapis.com/customsearch/v1');
      expect(url).toContain('key=test-api-key');
      expect(url).toContain('cx=test-cx');
      expect(url).toContain('q=test+query');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithGoogle('test query', 'key', { cx: 'test-cx' });
      
      expect(result.provider).toBe('google');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.totalResults).toBe(1000);
    });

    it('should map results correctly', async () => {
      const result = await searchWithGoogle('test query', 'key', { cx: 'test-cx' });
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Snippet 1',
      });
    });

    it('should handle maxResults option', async () => {
      await searchWithGoogle('test', 'key', { cx: 'test-cx', maxResults: 5 });
      
      const url = mockGoogleFetch.mock.calls[0][0] as string;
      expect(url).toContain('num=5');
    });

    it('should handle language option', async () => {
      await searchWithGoogle('test', 'key', { cx: 'test-cx', language: 'en' });
      
      const url = mockGoogleFetch.mock.calls[0][0] as string;
      expect(url).toContain('lr=lang_en');
    });

    it('should handle country option', async () => {
      await searchWithGoogle('test', 'key', { cx: 'test-cx', country: 'US' });
      
      const url = mockGoogleFetch.mock.calls[0][0] as string;
      expect(url).toContain('gl=US');
    });

    it('should handle recency option', async () => {
      await searchWithGoogle('test', 'key', { cx: 'test-cx', recency: 'week' });
      
      const url = mockGoogleFetch.mock.calls[0][0] as string;
      expect(url).toContain('dateRestrict=w1');
    });

    it('should handle API errors', async () => {
      mockGoogleFetch.mockResolvedValue(createMockResponse({ error: { message: 'Quota exceeded' } }, false, 403));
      
      await expect(searchWithGoogle('test', 'key', { cx: 'test-cx' })).rejects.toThrow('Google API error');
    });

    it('should handle network errors', async () => {
      mockGoogleFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithGoogle('test', 'key', { cx: 'test-cx' })).rejects.toThrow('Google search failed');
    });

    it('should handle empty results', async () => {
      mockGoogleFetch.mockResolvedValue(createMockResponse({
        kind: 'customsearch#search',
        searchInformation: { totalResults: '0' },
      }));
      
      const result = await searchWithGoogle('test', 'key', { cx: 'test-cx' });
      
      expect(result.results).toHaveLength(0);
    });
  });

  describe('testGoogleConnection', () => {
    it('should return true on successful connection', async () => {
      mockGoogleFetch.mockResolvedValue(createMockResponse({
        kind: 'customsearch#search',
        searchInformation: { totalResults: '0' },
        items: [],
      }));
      
      const result = await testGoogleConnection('valid-key', 'test-cx');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockGoogleFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testGoogleConnection('invalid-key', 'test-cx');
      
      expect(result).toBe(false);
    });
  });
});
