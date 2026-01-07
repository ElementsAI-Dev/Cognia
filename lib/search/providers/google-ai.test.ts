/**
 * Google AI Search Provider Tests
 */

import {
  searchWithGoogleAI,
  testGoogleAIConnection,
} from './google-ai';

jest.mock('../proxy-search-fetch', () => ({
  googleAIFetch: jest.fn(),
}));

import { googleAIFetch } from '../proxy-search-fetch';

const mockGoogleAIFetch = googleAIFetch as jest.MockedFunction<typeof googleAIFetch>;

describe('google-ai provider', () => {
  const createMockResponse = (data: unknown, ok = true, status = 200) => ({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  }) as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchWithGoogleAI', () => {
    const mockGoogleAIResponse = {
      candidates: [
        {
          content: {
            parts: [
              { text: 'AI generated response about the query' },
            ],
          },
          groundingMetadata: {
            webSearchQueries: ['test query'],
            groundingChunks: [
              {
                web: {
                  uri: 'https://example.com/1',
                  title: 'Result 1',
                },
              },
              {
                web: {
                  uri: 'https://example.com/2',
                  title: 'Result 2',
                },
              },
            ],
            searchEntryPoint: {
              renderedContent: '<div>Search results</div>',
            },
          },
        },
      ],
    };

    beforeEach(() => {
      mockGoogleAIFetch.mockResolvedValue(createMockResponse(mockGoogleAIResponse));
    });

    it('should throw error when API key is missing', async () => {
      await expect(searchWithGoogleAI('test', '')).rejects.toThrow('Google AI API key is required');
    });

    it('should make request with correct URL and headers', async () => {
      await searchWithGoogleAI('test query', 'test-api-key');
      
      expect(mockGoogleAIFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include API key in URL', async () => {
      await searchWithGoogleAI('test query', 'test-api-key');
      
      const url = mockGoogleAIFetch.mock.calls[0][0] as string;
      expect(url).toContain('key=test-api-key');
    });

    it('should include query in request body', async () => {
      await searchWithGoogleAI('test query', 'key');
      
      const requestBody = JSON.parse(mockGoogleAIFetch.mock.calls[0][1]?.body as string);
      expect(requestBody.contents).toBeDefined();
      expect(JSON.stringify(requestBody.contents)).toContain('test query');
    });

    it('should return formatted search response', async () => {
      const result = await searchWithGoogleAI('test query', 'key');
      
      expect(result.provider).toBe('google-ai');
      expect(result.query).toBe('test query');
      expect(result.answer).toBe('AI generated response about the query');
    });

    it('should extract grounding chunks as results', async () => {
      const result = await searchWithGoogleAI('test query', 'key');
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        title: 'Result 1',
        url: 'https://example.com/1',
      });
    });

    it('should handle API errors', async () => {
      mockGoogleAIFetch.mockResolvedValue(createMockResponse({ error: { message: 'Invalid key' } }, false, 401));
      
      await expect(searchWithGoogleAI('test', 'key')).rejects.toThrow('Google AI API error');
    });

    it('should handle network errors', async () => {
      mockGoogleAIFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(searchWithGoogleAI('test', 'key')).rejects.toThrow('Google AI search failed');
    });

    it('should handle empty candidates', async () => {
      mockGoogleAIFetch.mockResolvedValue(createMockResponse({
        candidates: [],
      }));
      
      // Empty candidates throws an error per implementation
      await expect(searchWithGoogleAI('test', 'key')).rejects.toThrow('No response from Google AI');
    });

    it('should handle missing grounding metadata', async () => {
      mockGoogleAIFetch.mockResolvedValue(createMockResponse({
        candidates: [
          {
            content: {
              parts: [{ text: 'Response without grounding' }],
            },
          },
        ],
      }));
      
      const result = await searchWithGoogleAI('test', 'key');
      
      expect(result.results).toHaveLength(0);
      expect(result.answer).toBe('Response without grounding');
    });
  });

  describe('testGoogleAIConnection', () => {
    it('should return true on successful connection', async () => {
      mockGoogleAIFetch.mockResolvedValue(createMockResponse({
        candidates: [{ content: { parts: [{ text: 'test' }] } }],
      }));
      
      const result = await testGoogleAIConnection('valid-key');
      
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockGoogleAIFetch.mockResolvedValue(createMockResponse({}, false, 401));
      
      const result = await testGoogleAIConnection('invalid-key');
      
      expect(result).toBe(false);
    });
  });
});
