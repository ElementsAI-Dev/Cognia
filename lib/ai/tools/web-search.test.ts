/**
 * Tests for Web Search Tool
 *
 * Tests cover:
 * - executeWebSearch with API key and provider settings
 * - smartSearchExecute: direct execution → API route fallback
 * - SearchCache integration (cache hit/miss)
 * - Error handling paths
 * - executeWebSearchWithApiKey backward compatibility
 */

import {
  executeWebSearch,
  executeWebSearchWithApiKey,
  webSearchTool,
  webSearchInputSchema,
  type WebSearchToolInput,
  type WebSearchResult,
  type WebSearchConfig,
} from './web-search';

// Mock the search-service module (used by executeSearchDirect)
const mockSearch = jest.fn();
const mockSearchWithProvider = jest.fn();
jest.mock('@/lib/search/search-service', () => ({
  search: (...args: unknown[]) => mockSearch(...args),
  searchWithProvider: (...args: unknown[]) => mockSearchWithProvider(...args),
}));

// Mock the search-cache module
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
jest.mock('@/lib/search/search-cache', () => ({
  getSearchCache: () => ({
    get: mockCacheGet,
    set: mockCacheSet,
  }),
}));

// Store original fetch and create mock for callSearchApi fallback
let originalFetch: typeof global.fetch;
const mockFetch = jest.fn();

// Helper: create a standard SearchResponse
function makeSearchResponse(overrides: Record<string, unknown> = {}) {
  return {
    provider: 'tavily',
    query: 'test query',
    answer: 'This is the answer',
    results: [
      {
        title: 'Result 1',
        url: 'https://example.com/1',
        content: 'Content 1',
        score: 0.9,
      },
    ],
    responseTime: 500,
    ...overrides,
  };
}

describe('executeWebSearch', () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    mockSearch.mockReset();
    mockSearchWithProvider.mockReset();
    mockCacheGet.mockReturnValue(null); // default: cache miss
    mockCacheSet.mockReturnValue(undefined);
  });

  it('searches with API key via direct execution', async () => {
    const searchResponse = makeSearchResponse();
    mockSearchWithProvider.mockResolvedValue(searchResponse);

    const input: WebSearchToolInput = {
      query: 'test query',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = {
      apiKey: 'test-api-key',
      provider: 'tavily',
    };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('tavily');
    expect(result.query).toBe('test query');
    expect(result.answer).toBe('This is the answer');
    expect(result.results).toHaveLength(1);
    expect(result.responseTime).toBe(500);
    expect(mockSearchWithProvider).toHaveBeenCalledWith(
      'tavily',
      'test query',
      'test-api-key',
      expect.objectContaining({ maxResults: 5, searchDepth: 'basic' })
    );
  });

  it('searches with provider settings via direct execution', async () => {
    const searchResponse = makeSearchResponse({ provider: 'perplexity' });
    mockSearch.mockResolvedValue(searchResponse);

    const input: WebSearchToolInput = {
      query: 'test query',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = {
      providerSettings: {
        tavily: { apiKey: 'tavily-key', enabled: true },
        perplexity: { apiKey: 'perplexity-key', enabled: true },
      } as WebSearchConfig['providerSettings'],
    };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(mockSearch).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({
        providerSettings: config.providerSettings,
        fallbackEnabled: true,
      })
    );
  });

  it('uses specified provider from input', async () => {
    mockSearchWithProvider.mockResolvedValue(makeSearchResponse({ provider: 'exa' }));

    const input: WebSearchToolInput = {
      query: 'test',
      provider: 'exa',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = { apiKey: 'test-key' };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('exa');
    expect(mockSearchWithProvider).toHaveBeenCalledWith(
      'exa', 'test', 'test-key', expect.any(Object)
    );
  });

  it('defaults to tavily when no provider specified', async () => {
    mockSearchWithProvider.mockResolvedValue(makeSearchResponse());

    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = { apiKey: 'test-key' };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(mockSearchWithProvider).toHaveBeenCalledWith(
      'tavily', 'test', 'test-key', expect.any(Object)
    );
  });

  it('returns error when no config provided', async () => {
    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = {};

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No API key or provider settings provided');
  });

  it('handles direct search errors with API route fallback', async () => {
    // Direct execution fails
    mockSearchWithProvider.mockRejectedValue(new Error('Direct search failed'));

    // API route fallback also fails
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API error' }),
    });

    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = { apiKey: 'test-key' };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Direct search failed');
  });

  it('falls back to API route when direct execution fails', async () => {
    // Direct execution fails
    mockSearchWithProvider.mockRejectedValue(new Error('Module not found'));

    // API route succeeds
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeSearchResponse({ provider: 'tavily' })),
    });

    const input: WebSearchToolInput = {
      query: 'fallback test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = { apiKey: 'test-key' };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('tavily');
    expect(mockFetch).toHaveBeenCalledWith('/api/search', expect.any(Object));
  });

  it('includes publishedDate in results', async () => {
    mockSearchWithProvider.mockResolvedValue(
      makeSearchResponse({
        results: [
          {
            title: 'Article',
            url: 'https://example.com',
            content: 'Content',
            score: 0.9,
            publishedDate: '2024-01-15',
          },
        ],
      })
    );

    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const result = await executeWebSearch(input, { apiKey: 'key' });

    expect(result.results?.[0].publishedDate).toBe('2024-01-15');
  });

  it('returns cached result on cache hit', async () => {
    const cachedResponse = makeSearchResponse({ responseTime: 0 });
    mockCacheGet.mockReturnValue(cachedResponse);

    const input: WebSearchToolInput = {
      query: 'cached query',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const result = await executeWebSearch(input, { apiKey: 'key' });

    expect(result.success).toBe(true);
    expect(result.query).toBe('test query');
    // Direct search should NOT be called because cache returned a result
    expect(mockSearchWithProvider).not.toHaveBeenCalled();
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('stores result in cache after successful search', async () => {
    mockCacheGet.mockReturnValue(null); // cache miss
    mockSearchWithProvider.mockResolvedValue(makeSearchResponse());

    const input: WebSearchToolInput = {
      query: 'new query',
      maxResults: 5,
      searchDepth: 'basic',
    };

    await executeWebSearch(input, { apiKey: 'key' });

    expect(mockCacheSet).toHaveBeenCalledWith(
      'new query',
      expect.objectContaining({ provider: 'tavily' }),
      'tavily',
      expect.any(Object)
    );
  });
});

describe('executeWebSearchWithApiKey', () => {
  beforeAll(() => {
    originalFetch = global.fetch;
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchWithProvider.mockReset();
    mockCacheGet.mockReturnValue(null);
  });

  it('searches with API key directly', async () => {
    mockSearchWithProvider.mockResolvedValue(makeSearchResponse());

    const input: WebSearchToolInput = {
      query: 'test query',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const result = await executeWebSearchWithApiKey(input, 'my-api-key');

    expect(result.success).toBe(true);
    expect(mockSearchWithProvider).toHaveBeenCalled();
  });

  it('uses provider from input', async () => {
    mockSearchWithProvider.mockResolvedValue(
      makeSearchResponse({ provider: 'perplexity' })
    );

    const input: WebSearchToolInput = {
      query: 'test',
      provider: 'perplexity',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const result = await executeWebSearchWithApiKey(input, 'my-api-key');

    expect(result.success).toBe(true);
    expect(result.provider).toBe('perplexity');
  });
});

describe('webSearchInputSchema', () => {
  it('validates valid input', () => {
    const result = webSearchInputSchema.safeParse({
      query: 'test query',
    });

    expect(result.success).toBe(true);
  });

  it('uses default values', () => {
    const result = webSearchInputSchema.safeParse({
      query: 'test',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxResults).toBe(5);
      expect(result.data.searchDepth).toBe('basic');
    }
  });

  it('validates maxResults range', () => {
    const tooLow = webSearchInputSchema.safeParse({
      query: 'test',
      maxResults: 0,
    });
    expect(tooLow.success).toBe(false);

    const tooHigh = webSearchInputSchema.safeParse({
      query: 'test',
      maxResults: 15,
    });
    expect(tooHigh.success).toBe(false);

    const valid = webSearchInputSchema.safeParse({
      query: 'test',
      maxResults: 5,
    });
    expect(valid.success).toBe(true);
  });

  it('validates provider enum', () => {
    const validProviders = [
      'tavily',
      'perplexity',
      'exa',
      'searchapi',
      'serpapi',
      'bing',
      'google',
      'brave',
    ];

    for (const provider of validProviders) {
      const result = webSearchInputSchema.safeParse({
        query: 'test',
        provider,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid provider', () => {
    const result = webSearchInputSchema.safeParse({
      query: 'test',
      provider: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('validates searchDepth enum', () => {
    const validDepths = ['basic', 'advanced', 'deep'];

    for (const depth of validDepths) {
      const result = webSearchInputSchema.safeParse({
        query: 'test',
        searchDepth: depth,
      });
      expect(result.success).toBe(true);
    }
  });

  it('requires query', () => {
    const result = webSearchInputSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});

describe('webSearchTool', () => {
  it('has correct name', () => {
    expect(webSearchTool.name).toBe('web_search');
  });

  it('has description', () => {
    expect(webSearchTool.description).toBeTruthy();
    expect(webSearchTool.description).toContain('Search the web');
  });

  it('uses correct schema', () => {
    expect(webSearchTool.parameters).toBe(webSearchInputSchema);
  });

  it('uses correct execute function', () => {
    expect(webSearchTool.execute).toBe(executeWebSearch);
  });
});

describe('WebSearchResult interface', () => {
  it('includes all success fields', () => {
    const result: WebSearchResult = {
      success: true,
      provider: 'tavily',
      query: 'test',
      answer: 'Answer',
      results: [
        {
          title: 'Title',
          url: 'https://example.com',
          content: 'Content',
          score: 0.9,
        },
      ],
      responseTime: 500,
    };

    expect(result.success).toBe(true);
    expect(result.provider).toBe('tavily');
    expect(result.results).toHaveLength(1);
  });

  it('includes error on failure', () => {
    const result: WebSearchResult = {
      success: false,
      error: 'Something went wrong',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
  });
});
