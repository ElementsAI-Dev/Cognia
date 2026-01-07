/**
 * Exa Search Provider Tests
 */

import {
  searchWithExa,
  testExaConnection,
} from './exa';
import { exaFetch } from '../proxy-search-fetch';

jest.mock('../proxy-search-fetch', () => ({
  exaFetch: jest.fn(),
}));

const mockExaFetch = exaFetch as jest.MockedFunction<typeof exaFetch>;

describe('exa provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithExa', () => {
    const mockExaResponse = {
      results: [
        {
          title: 'Result 1',
          url: 'https://example.com/1',
          text: 'Content 1',
          score: 0.95,
          publishedDate: '2024-01-01',
        },
        {
          title: 'Result 2',
          url: 'https://example.com/2',
          text: 'Content 2',
          score: 0.85,
        },
      ],
      autopromptString: 'Enhanced query',
    };

    beforeEach(() => {
      mockExaFetch.mockResolvedValue(createMockResponse(mockExaResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithExa('test', '')).rejects.toThrow('Exa API key is required');
    });

    it('should make request with correct URL and headers', async () => {
      await searchWithExa('test query', 'test-api-key');
      
      expect(mockExaFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.exa.ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
          }),
        })
      );
    });

    it('should include query in request body', async () => {
      await searchWithExa('test query', 'key');
      
      const requestBody = JSON.parse(mockExaFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.query).toBe('test query');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithExa('test query', 'key');
      
      expect(result.provider).toBe('exa');
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
    });

    it('should map results correctly', async () => {
      const result = await searchWithExa('test query', 'key');
      
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Content 1',
        score: 0.95,
        publishedDate: '2024-01-01',
      });
    });

    it('should handle maxResults option', async () => {
      await searchWithExa('test', 'key', { maxResults: 10 });
      
      const requestBody = JSON.parse(mockExaFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.numResults).toBe(10);
    });

    it('should handle domain filters', async () => {
      await searchWithExa('test', 'key', {
        includeDomains: ['example.com'],
        excludeDomains: ['spam.com'],
      });
      
      const requestBody = JSON.parse(mockExaFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.includeDomains).toContain('example.com');
      expect(requestBody.excludeDomains).toContain('spam.com');
    });

    it('should handle API errors', async () => {
      mockExaFetch.mockResolvedValue(createMockResponse({ error: 'Unauthorized' }, false, 401));
      
      await expect(searchWithExa('test', 'key')).rejects.toThrow('Exa API error');
    });

    it('should handle network errors', async () => {
      mockExaFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithExa('test', 'key')).rejects.toThrow('Exa search failed');
    });
  });

  describe('testExaConnection', () => {
    it('should return true on successful connection', async () => {
      mockExaFetch.mockResolvedValue(createMockResponse({
        results: [],
      }));
      
      const result = await testExaConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockExaFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testExaConnection('invalid-key');
      
      expect(result).toBe(false);
    });
  });
});
