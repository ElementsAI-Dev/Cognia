/**
 * Proxy Search Fetch Tests
 */

import {
  searchFetch,
  createSearchProviderFetch,
  braveFetch,
  bingFetch,
  googleFetch,
  googleAIFetch,
  serpApiFetch,
  searchApiFetch,
  exaFetch,
  tavilyFetch,
  perplexityFetch,
} from './proxy-search-fetch';

jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: jest.fn(),
  isProxyEnabled: jest.fn(),
  getCurrentProxyUrl: jest.fn(),
}));

import { proxyFetch, isProxyEnabled, getCurrentProxyUrl } from '@/lib/network/proxy-fetch';

const mockProxyFetch = proxyFetch as jest.MockedFunction<typeof proxyFetch>;
const mockIsProxyEnabled = isProxyEnabled as jest.MockedFunction<typeof isProxyEnabled>;
const mockGetCurrentProxyUrl = getCurrentProxyUrl as jest.MockedFunction<typeof getCurrentProxyUrl>;

const originalEnv = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, 'NODE_ENV', { value, configurable: true });
}

function restoreNodeEnv() {
  Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
}

describe('proxy-search-fetch', () => {
  const mockResponse = {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ data: 'test' }),
    text: jest.fn().mockResolvedValue('test response'),
  } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProxyFetch.mockResolvedValue(mockResponse);
    mockIsProxyEnabled.mockReturnValue(false);
    mockGetCurrentProxyUrl.mockReturnValue('http://proxy.example.com:8080');
  });

  describe('searchFetch', () => {
    it('should call proxyFetch with the provided URL', async () => {
      await searchFetch('https://api.example.com/search');
      
      expect(mockProxyFetch).toHaveBeenCalledWith(
        'https://api.example.com/search',
        undefined
      );
    });

    it('should pass init options to proxyFetch', async () => {
      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      };
      
      await searchFetch('https://api.example.com/search', init);
      
      expect(mockProxyFetch).toHaveBeenCalledWith(
        'https://api.example.com/search',
        init
      );
    });

    it('should return the response from proxyFetch', async () => {
      const result = await searchFetch('https://api.example.com/search');
      
      expect(result).toBe(mockResponse);
    });

    it('should handle URL objects', async () => {
      const url = new URL('https://api.example.com/search');
      
      await searchFetch(url);
      
      expect(mockProxyFetch).toHaveBeenCalledWith(url, undefined);
    });

    it('should handle Request objects', async () => {
      // Skip if Request is not available (Node.js < 18)
      if (typeof Request === 'undefined') {
        return;
      }
      const request = new Request('https://api.example.com/search');
      
      await searchFetch(request);
      
      expect(mockProxyFetch).toHaveBeenCalledWith(request, undefined);
    });

    it('should log proxy usage in development when proxy is enabled', async () => {
      setNodeEnv('development');
      mockIsProxyEnabled.mockReturnValue(true);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await searchFetch('https://api.example.com/search');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Search] Request via proxy')
      );
      
      consoleSpy.mockRestore();
      restoreNodeEnv();
    });

    it('should not log in production', async () => {
      setNodeEnv('production');
      mockIsProxyEnabled.mockReturnValue(true);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await searchFetch('https://api.example.com/search');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      restoreNodeEnv();
    });
  });

  describe('createSearchProviderFetch', () => {
    it('should create a fetch function for a provider', async () => {
      const customFetch = createSearchProviderFetch('CustomProvider');
      
      const result = await customFetch('https://api.example.com/search');
      
      expect(result).toBe(mockResponse);
      expect(mockProxyFetch).toHaveBeenCalled();
    });

    it('should log request details in development', async () => {
      setNodeEnv('development');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const customFetch = createSearchProviderFetch('TestProvider');
      
      await customFetch('https://api.example.com/search');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TestProvider]')
      );
      
      consoleSpy.mockRestore();
      restoreNodeEnv();
    });

    it('should log errors with provider name', async () => {
      mockProxyFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const customFetch = createSearchProviderFetch('FailingProvider');
      
      await expect(customFetch('https://api.example.com/search')).rejects.toThrow('Network error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FailingProvider] Failed'),
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should include response time in logs', async () => {
      setNodeEnv('development');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const customFetch = createSearchProviderFetch('TimedProvider');
      
      await customFetch('https://api.example.com/search');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\(\d+ms\)/)
      );
      
      consoleSpy.mockRestore();
      restoreNodeEnv();
    });

    it('should pass init options correctly', async () => {
      const customFetch = createSearchProviderFetch('CustomProvider');
      const init: RequestInit = { method: 'POST' };
      
      await customFetch('https://api.example.com/search', init);
      
      expect(mockProxyFetch).toHaveBeenCalledWith(
        'https://api.example.com/search',
        init
      );
    });
  });

  describe('pre-configured provider fetches', () => {
    const testCases = [
      { name: 'braveFetch', fetch: braveFetch, providerName: 'Brave' },
      { name: 'bingFetch', fetch: bingFetch, providerName: 'Bing' },
      { name: 'googleFetch', fetch: googleFetch, providerName: 'Google' },
      { name: 'googleAIFetch', fetch: googleAIFetch, providerName: 'GoogleAI' },
      { name: 'serpApiFetch', fetch: serpApiFetch, providerName: 'SerpAPI' },
      { name: 'searchApiFetch', fetch: searchApiFetch, providerName: 'SearchAPI' },
      { name: 'exaFetch', fetch: exaFetch, providerName: 'Exa' },
      { name: 'tavilyFetch', fetch: tavilyFetch, providerName: 'Tavily' },
      { name: 'perplexityFetch', fetch: perplexityFetch, providerName: 'Perplexity' },
    ];

    testCases.forEach(({ name, fetch, providerName }) => {
      describe(name, () => {
        it('should be a function', () => {
          expect(typeof fetch).toBe('function');
        });

        it('should call proxyFetch when invoked', async () => {
          await fetch('https://api.example.com/search');
          
          expect(mockProxyFetch).toHaveBeenCalled();
        });

        it('should return response from proxyFetch', async () => {
          const result = await fetch('https://api.example.com/search');
          
          expect(result).toBe(mockResponse);
        });

        it(`should log with provider name "${providerName}" in development`, async () => {
          setNodeEnv('development');
          
          const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
          
          await fetch('https://api.example.com/search');
          
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(`[${providerName}]`)
          );
          
          consoleSpy.mockRestore();
          restoreNodeEnv();
        });
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from proxyFetch', async () => {
      const error = new Error('Connection failed');
      mockProxyFetch.mockRejectedValue(error);
      
      await expect(searchFetch('https://api.example.com/search'))
        .rejects.toThrow('Connection failed');
    });

    it('should log error details for provider fetches', async () => {
      const error = new Error('API error');
      mockProxyFetch.mockRejectedValue(error);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(braveFetch('https://api.brave.com/search'))
        .rejects.toThrow('API error');
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});
