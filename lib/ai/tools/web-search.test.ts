/**
 * Tests for Web Search Tool
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

// Store original fetch and create mock
let originalFetch: typeof global.fetch;
const mockFetch = jest.fn();

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
  });

  it('searches with API key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
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
      }),
    });

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
  });

  it('searches with provider settings', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        provider: 'perplexity',
        query: 'test query',
        results: [
          {
            title: 'Result',
            url: 'https://example.com',
            content: 'Content',
            score: 0.8,
          },
        ],
        responseTime: 600,
      }),
    });

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
    expect(mockFetch).toHaveBeenCalled();
  });

  it('uses specified provider', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        provider: 'exa',
        query: 'test',
        results: [],
        responseTime: 100,
      }),
    });

    const input: WebSearchToolInput = {
      query: 'test',
      provider: 'exa',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = {
      apiKey: 'test-key',
    };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('exa');
  });

  it('uses default provider when not specified', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        provider: 'tavily',
        query: 'test',
        results: [],
        responseTime: 100,
      }),
    });

    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = {
      apiKey: 'test-key',
    };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('tavily');
  });

  it('handles search errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API error' }),
    });

    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const config: WebSearchConfig = {
      apiKey: 'test-key',
    };

    const result = await executeWebSearch(input, config);

    expect(result.success).toBe(false);
    expect(result.error).toBe('API error');
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

  it('includes publishedDate in results', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        provider: 'tavily',
        query: 'test',
        results: [
          {
            title: 'Article',
            url: 'https://example.com',
            content: 'Content',
            score: 0.9,
            publishedDate: '2024-01-15',
          },
        ],
        responseTime: 100,
      }),
    });

    const input: WebSearchToolInput = {
      query: 'test',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const result = await executeWebSearch(input, { apiKey: 'key' });

    expect(result.results?.[0].publishedDate).toBe('2024-01-15');
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
    mockFetch.mockReset();
  });

  it('searches with API key directly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        provider: 'tavily',
        query: 'test query',
        results: [],
        responseTime: 100,
      }),
    });

    const input: WebSearchToolInput = {
      query: 'test query',
      maxResults: 5,
      searchDepth: 'basic',
    };

    const result = await executeWebSearchWithApiKey(input, 'my-api-key');

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('uses provider from input', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        provider: 'perplexity',
        query: 'test',
        results: [],
        responseTime: 100,
      }),
    });

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
