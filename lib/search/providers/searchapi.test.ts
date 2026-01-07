/**
 * SearchAPI Provider Tests
 */

import {
  searchWithSearchAPI,
  testSearchAPIConnection,
} from './searchapi';
import { searchApiFetch } from '../proxy-search-fetch';

jest.mock('../proxy-search-fetch', () => ({
  searchApiFetch: jest.fn(),
}));

const mockSearchApiFetch = searchApiFetch as jest.MockedFunction<typeof searchApiFetch>;

describe('searchapi provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithSearchAPI', () => {
    const mockSearchAPIResponse = {
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
        answer: 'Direct answer from SearchAPI',
      },
      search_information: {
        total_results: 1000000,
      },
    };

    beforeEach(() => {
      mockSearchApiFetch.mockResolvedValue(createMockResponse(mockSearchAPIResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithSearchAPI('test', '')).rejects.toThrow('SearchAPI API key is required');
    });

    it('should make request with correct URL and headers', async () => {
      await searchWithSearchAPI('test query', 'test-api-key');
      
      expect(mockSearchApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('searchapi.io'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include API key in URL', async () => {
      await searchWithSearchAPI('test query', 'test-api-key');
      
      const url = mockSearchApiFetch.mock.calls[0][0] as string;
      expect(url).toContain('api_key=test-api-key');
    });

    it('should include query parameters', async () => {
      await searchWithSearchAPI('test query', 'key', { maxResults: 15 });
      
      const url = mockSearchApiFetch.mock.calls[0][0] as string;
      expect(url).toContain('q=test+query');
      expect(url).toContain('num=15');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithSearchAPI('test query', 'key');
      
      expect(result.provider).toBe('searchapi');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
    });

    it('should map results correctly', async () => {
      const result = await searchWithSearchAPI('test query', 'key');
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Snippet 1',
      });
    });

    it('should include answer from answer_box', async () => {
      const result = await searchWithSearchAPI('test query', 'key');
      
      expect(result.answer).toBe('Direct answer from SearchAPI');
    });

    it('should handle country and language options', async () => {
      await searchWithSearchAPI('test', 'key', { country: 'US', language: 'en' });
      
      const url = mockSearchApiFetch.mock.calls[0][0] as string;
      expect(url).toContain('gl=US');
      expect(url).toContain('hl=en');
    });

    it('should handle API errors', async () => {
      mockSearchApiFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, false, 401));
      
      await expect(searchWithSearchAPI('test', 'key')).rejects.toThrow('SearchAPI error');
    });

    it('should handle network errors', async () => {
      mockSearchApiFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithSearchAPI('test', 'key')).rejects.toThrow('SearchAPI search failed');
    });

    it('should handle empty results', async () => {
      mockSearchApiFetch.mockResolvedValue(createMockResponse({
        search_information: { total_results: 0 },
      }));
      
      const result = await searchWithSearchAPI('test', 'key');
      
      expect(result.results).toHaveLength(0);
    });
  });

  describe('testSearchAPIConnection', () => {
    it('should return true on successful connection', async () => {
      mockSearchApiFetch.mockResolvedValue(createMockResponse({
        organic_results: [],
      }));
      
      const result = await testSearchAPIConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockSearchApiFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testSearchAPIConnection('invalid-key');
      
      expect(result).toBe(false);
    });
  });
});
