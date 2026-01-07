/**
 * Tavily Search Provider Tests
 */

import {
  searchWithTavily,
  getAnswerFromTavily,
  extractContentWithTavily,
  testTavilyConnection,
} from './tavily';

jest.mock('@tavily/core', () => ({
  tavily: jest.fn(),
}));

import { tavily } from '@tavily/core';

const mockTavily = tavily as jest.MockedFunction<typeof tavily>;

describe('tavily provider', () => {
  const mockClient = {
    search: jest.fn(),
    extract: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTavily.mockReturnValue(mockClient as unknown as ReturnType<typeof tavily>);
  });

  describe('searchWithTavily', () => {
    const mockSearchResponse = {
      query: 'test query',
      answer: 'Test answer from Tavily',
      results: [
        {
          title: 'Result 1',
          url: 'https://example.com/1',
          content: 'Content 1',
          score: 0.95,
          publishedDate: '2024-01-01',
        },
        {
          title: 'Result 2',
          url: 'https://example.com/2',
          content: 'Content 2',
          score: 0.85,
        },
      ],
    };

    beforeEach(() => {
      mockClient.search.mockResolvedValue(mockSearchResponse);
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithTavily('test', '')).rejects.toThrow('Tavily API key is required');
    });

    it('should create client with API key', async () => {
      await searchWithTavily('test query', 'test-api-key');
      
      expect(mockTavily).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should search with default options', async () => {
      await searchWithTavily('test query', 'test-api-key');
      
      expect(mockClient.search).toHaveBeenCalledWith('test query', {
        maxResults: 5,
        searchDepth: 'basic',
        includeAnswer: true,
        includeRawContent: false,
        includeDomains: undefined,
        excludeDomains: undefined,
      });
    });

    it('should search with custom options', async () => {
      await searchWithTavily('test query', 'test-api-key', {
        maxResults: 10,
        searchDepth: 'deep',
        includeAnswer: false,
        includeRawContent: 'markdown',
        includeDomains: ['example.com'],
        excludeDomains: ['spam.com'],
      });
      
      expect(mockClient.search).toHaveBeenCalledWith('test query', {
        maxResults: 10,
        searchDepth: 'advanced',
        includeAnswer: false,
        includeRawContent: 'markdown',
        includeDomains: ['example.com'],
        excludeDomains: ['spam.com'],
      });
    });

    it('should return formatted search response', async () => {
      const result = await searchWithTavily('test query', 'test-api-key');
      
      expect(result.provider).toBe('tavily');
      expect(result.query).toBe('test query');
      expect(result.answer).toBe('Test answer from Tavily');
      expect(result.results).toHaveLength(2);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should map results correctly', async () => {
      const result = await searchWithTavily('test query', 'test-api-key');
      
      expect(result.results[0]).toEqual({
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Content 1',
        score: 0.95,
        publishedDate: '2024-01-01',
      });
    });

    it('should handle search errors', async () => {
      mockClient.search.mockRejectedValue(new Error('API rate limit exceeded'));
      
      await expect(searchWithTavily('test', 'key')).rejects.toThrow(
        'Tavily search failed: API rate limit exceeded'
      );
    });

    it('should handle unknown errors', async () => {
      mockClient.search.mockRejectedValue('Unknown error');
      
      await expect(searchWithTavily('test', 'key')).rejects.toThrow(
        'Tavily search failed: Unknown error'
      );
    });

    it('should convert deep searchDepth to advanced', async () => {
      await searchWithTavily('test', 'key', { searchDepth: 'deep' });
      
      expect(mockClient.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ searchDepth: 'advanced' })
      );
    });
  });

  describe('getAnswerFromTavily', () => {
    it('should return answer when available', async () => {
      mockClient.search.mockResolvedValue({
        query: 'test',
        answer: 'The answer is 42',
        results: [],
      });
      
      const answer = await getAnswerFromTavily('test query', 'test-api-key');
      
      expect(answer).toBe('The answer is 42');
    });

    it('should return null when no answer', async () => {
      mockClient.search.mockResolvedValue({
        query: 'test',
        results: [],
      });
      
      const answer = await getAnswerFromTavily('test query', 'test-api-key');
      
      expect(answer).toBeNull();
    });

    it('should use correct search options', async () => {
      mockClient.search.mockResolvedValue({ query: 'test', results: [] });
      
      await getAnswerFromTavily('test', 'key');
      
      expect(mockClient.search).toHaveBeenCalledWith('test', {
        maxResults: 3,
        searchDepth: 'basic',
        includeAnswer: true,
        includeRawContent: false,
        includeDomains: undefined,
        excludeDomains: undefined,
      });
    });
  });

  describe('extractContentWithTavily', () => {
    it('should throw error when API key is missing', async () => {
      await expect(extractContentWithTavily('https://example.com', ''))
        .rejects.toThrow('Tavily API key is required');
    });

    it('should extract content from URL', async () => {
      mockClient.extract.mockResolvedValue({
        results: [{ rawContent: 'Extracted content from page' }],
      });
      
      const content = await extractContentWithTavily('https://example.com', 'test-key');
      
      expect(mockClient.extract).toHaveBeenCalledWith(['https://example.com']);
      expect(content).toBe('Extracted content from page');
    });

    it('should return empty string when no content', async () => {
      mockClient.extract.mockResolvedValue({ results: [{}] });
      
      const content = await extractContentWithTavily('https://example.com', 'test-key');
      
      expect(content).toBe('');
    });

    it('should handle extraction errors', async () => {
      mockClient.extract.mockRejectedValue(new Error('Extraction failed'));
      
      await expect(extractContentWithTavily('https://example.com', 'key'))
        .rejects.toThrow('Tavily extract failed: Extraction failed');
    });

    it('should handle unknown extraction errors', async () => {
      mockClient.extract.mockRejectedValue('Unknown');
      
      await expect(extractContentWithTavily('https://example.com', 'key'))
        .rejects.toThrow('Tavily extract failed: Unknown error');
    });
  });

  describe('testTavilyConnection', () => {
    it('should return true on successful connection', async () => {
      mockClient.search.mockResolvedValue({ query: 'test', results: [] });
      
      const result = await testTavilyConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockClient.search.mockRejectedValue(new Error('Invalid API key'));
      
      const result = await testTavilyConnection('invalid-key');
      
      expect(result).toBe(false);
    });

    it('should use minimal search for testing', async () => {
      mockClient.search.mockResolvedValue({ query: 'test', results: [] });
      
      await testTavilyConnection('key');
      
      expect(mockClient.search).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ maxResults: 1 })
      );
    });
  });
});
