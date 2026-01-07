/**
 * SerpAPI Provider Tests
 */

import {
  searchWithSerpAPI,
  testSerpAPIConnection,
} from './serpapi';
import { serpApiFetch } from '../proxy-search-fetch';

jest.mock('../proxy-search-fetch', () => ({
  serpApiFetch: jest.fn(),
}));

const mockSerpApiFetch = serpApiFetch as jest.MockedFunction<typeof serpApiFetch>;

describe('serpapi provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithSerpAPI', () => {
    const mockSerpAPIResponse = {
      organic_results: [
        {
          title: 'Result 1',
          link: 'https://example.com/1',
          snippet: 'Snippet 1',
          position: 1,
          date: '2024-01-01',
        },
        {
          title: 'Result 2',
          link: 'https://example.com/2',
          snippet: 'Snippet 2',
          position: 2,
        },
      ],
      answer_box: {
        answer: 'Direct answer from SerpAPI',
      },
      search_information: {
        total_results: 500000,
      },
    };

    beforeEach(() => {
      mockSerpApiFetch.mockResolvedValue(createMockResponse(mockSerpAPIResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithSerpAPI('test', '')).rejects.toThrow('SerpAPI API key is required');
    });

    it('should make request with correct URL', async () => {
      await searchWithSerpAPI('test query', 'test-api-key');
      
      expect(mockSerpApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('serpapi.com'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include API key in URL', async () => {
      await searchWithSerpAPI('test query', 'test-api-key');
      
      const url = mockSerpApiFetch.mock.calls[0][0] as string;
      expect(url).toContain('api_key=test-api-key');
    });

    it('should include query parameters', async () => {
      await searchWithSerpAPI('test query', 'key', { maxResults: 20 });
      
      const url = mockSerpApiFetch.mock.calls[0][0] as string;
      expect(url).toContain('q=test+query');
      expect(url).toContain('num=20');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithSerpAPI('test query', 'key');
      
      expect(result.provider).toBe('serpapi');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
    });

    it('should map results correctly', async () => {
      const result = await searchWithSerpAPI('test query', 'key');
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Snippet 1',
      });
    });

    it('should include answer from answer_box', async () => {
      const result = await searchWithSerpAPI('test query', 'key');
      
      expect(result.answer).toBe('Direct answer from SerpAPI');
    });

    it('should handle country and language options', async () => {
      await searchWithSerpAPI('test', 'key', { country: 'us', language: 'en' });
      
      const url = mockSerpApiFetch.mock.calls[0][0] as string;
      expect(url).toContain('gl=us');
      expect(url).toContain('hl=en');
    });

    it('should handle API errors', async () => {
      mockSerpApiFetch.mockResolvedValue(createMockResponse({ error: 'Invalid API key' }, false, 401));
      
      await expect(searchWithSerpAPI('test', 'key')).rejects.toThrow('SerpAPI error');
    });

    it('should handle network errors', async () => {
      mockSerpApiFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithSerpAPI('test', 'key')).rejects.toThrow('SerpAPI search failed');
    });

    it('should handle empty results', async () => {
      mockSerpApiFetch.mockResolvedValue(createMockResponse({
        search_information: { total_results: 0 },
      }));
      
      const result = await searchWithSerpAPI('test', 'key');
      
      expect(result.results).toHaveLength(0);
    });
  });

  describe('testSerpAPIConnection', () => {
    it('should return true on successful connection', async () => {
      mockSerpApiFetch.mockResolvedValue(createMockResponse({
        organic_results: [],
      }));
      
      const result = await testSerpAPIConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockSerpApiFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testSerpAPIConnection('invalid-key');
      
      expect(result).toBe(false);
    });
  });
});
