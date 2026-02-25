/**
 * Proxy-aware Fetch for Search Providers
 *
 * Provides a fetch wrapper specifically for search providers
 * that routes requests through the configured proxy.
 */

import { proxyFetch, isProxyEnabled, getCurrentProxyUrl } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.network;

/**
 * Search-specific fetch with proxy support
 * Use this in search providers instead of global fetch
 */
export async function searchFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Log proxy usage in development
  if (process.env.NODE_ENV === 'development' && isProxyEnabled()) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    log.debug(`Search request via proxy: ${url} -> ${getCurrentProxyUrl()}`);
  }

  return proxyFetch(input, init);
}

/**
 * Create a fetch function for a specific search provider
 * with additional logging and error handling
 */
export function createSearchProviderFetch(providerName: string) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    try {
      const response = await searchFetch(input, init);
      const duration = Date.now() - startTime;

      if (process.env.NODE_ENV === 'development') {
        log.debug(`${providerName} ${response.status} ${url} (${duration}ms)`);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error(`${providerName} failed ${url} (${duration}ms)`, error as Error);
      throw error;
    }
  };
}

/**
 * Pre-configured fetch functions for each search provider
 */
export const braveFetch = createSearchProviderFetch('Brave');
export const bingFetch = createSearchProviderFetch('Bing');
export const googleFetch = createSearchProviderFetch('Google');
export const googleAIFetch = createSearchProviderFetch('GoogleAI');
export const serpApiFetch = createSearchProviderFetch('SerpAPI');
export const searchApiFetch = createSearchProviderFetch('SearchAPI');
export const exaFetch = createSearchProviderFetch('Exa');
export const tavilyFetch = createSearchProviderFetch('Tavily');
export const perplexityFetch = createSearchProviderFetch('Perplexity');
export const serperFetch = createSearchProviderFetch('Serper');

export default searchFetch;
