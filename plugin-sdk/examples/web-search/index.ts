/**
 * Web Search Plugin
 * 
 * Enhanced web search capabilities with multiple providers and result caching
 */

import type { PluginContext, PluginTool, PluginCommand, PluginHooks } from '@/types/plugin';

// Plugin Definition Type
interface WebSearchPluginExports {
  tools: PluginTool[];
  commands: PluginCommand[];
  hooks: PluginHooks;
}

// =============================================================================
// Types
// =============================================================================

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp: number;
}

interface SearchCache {
  query: string;
  results: SearchResult[];
  timestamp: number;
  provider: string;
}

interface PluginConfig {
  defaultProvider: 'google' | 'bing' | 'duckduckgo';
  maxResults: number;
  enableCache: boolean;
  cacheTTL: number;
  safeSearch: boolean;
}

// =============================================================================
// Cache Implementation
// =============================================================================

class SearchResultCache {
  private cache: Map<string, SearchCache> = new Map();
  private ttl: number;

  constructor(ttlSeconds: number = 3600) {
    this.ttl = ttlSeconds * 1000;
  }

  private getCacheKey(query: string, provider: string): string {
    return `${provider}:${query.toLowerCase().trim()}`;
  }

  get(query: string, provider: string): SearchResult[] | null {
    const key = this.getCacheKey(query, provider);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.results;
  }

  set(query: string, provider: string, results: SearchResult[]): void {
    const key = this.getCacheKey(query, provider);
    this.cache.set(key, {
      query,
      results,
      timestamp: Date.now(),
      provider,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  setTTL(ttlSeconds: number): void {
    this.ttl = ttlSeconds * 1000;
  }
}

// =============================================================================
// Search Providers
// =============================================================================

async function searchGoogle(
  query: string,
  _maxResults: number,
  _safeSearch: boolean
): Promise<SearchResult[]> {
  // In a real implementation, this would use the Google Custom Search API
  // For demo purposes, returning mock data
  return [
    {
      title: `Google Result for: ${query}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Search results from Google for "${query}"...`,
      source: 'google',
      timestamp: Date.now(),
    },
  ];
}

async function searchBing(
  query: string,
  _maxResults: number,
  _safeSearch: boolean
): Promise<SearchResult[]> {
  // In a real implementation, this would use the Bing Search API
  return [
    {
      title: `Bing Result for: ${query}`,
      url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
      snippet: `Search results from Bing for "${query}"...`,
      source: 'bing',
      timestamp: Date.now(),
    },
  ];
}

async function searchDuckDuckGo(
  query: string,
  _maxResults: number,
  _safeSearch: boolean
): Promise<SearchResult[]> {
  // In a real implementation, this would use the DuckDuckGo API
  return [
    {
      title: `DuckDuckGo Result for: ${query}`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: `Search results from DuckDuckGo for "${query}"...`,
      source: 'duckduckgo',
      timestamp: Date.now(),
    },
  ];
}

// =============================================================================
// Plugin Implementation
// =============================================================================

export default function createPlugin(context: PluginContext): WebSearchPluginExports {
  const config = context.config as unknown as PluginConfig;
  const cache = new SearchResultCache(config.cacheTTL);
  const pluginId = context.pluginId;

  // Update cache TTL when config changes
  context.events.on('config:changed', (newConfig: unknown) => {
    const cfg = newConfig as PluginConfig;
    cache.setTTL(cfg.cacheTTL);
    if (!cfg.enableCache) {
      cache.clear();
    }
  });

  return {
    tools: [
      {
        name: 'web_search',
        pluginId,
        definition: {
          name: 'web_search',
          description: 'Search the web using various providers (Google, Bing, DuckDuckGo)',
          parametersSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              provider: {
                type: 'string',
                enum: ['google', 'bing', 'duckduckgo', 'auto'],
                description: 'Search provider to use (default: auto uses configured default)',
              },
              maxResults: {
                type: 'integer',
                description: 'Maximum number of results (overrides config)',
                minimum: 1,
                maximum: 50,
              },
            },
            required: ['query'],
          },
        },
        execute: async (params: Record<string, unknown>) => {
          const query = params.query as string;
          const providerParam = params.provider as string | undefined;
          const maxResultsParam = params.maxResults as number | undefined;
          
          const provider = providerParam === 'auto' || !providerParam
            ? config.defaultProvider
            : providerParam as PluginConfig['defaultProvider'];
          const maxResults = maxResultsParam || config.maxResults;

          context.logger.info(`Searching ${provider} for: ${query}`);

          // Check cache first
          if (config.enableCache) {
            const cached = cache.get(query, provider);
            if (cached) {
              context.logger.debug('Returning cached results');
              return {
                success: true,
                results: cached,
                cached: true,
                provider,
              };
            }
          }

          // Perform search
          let results: SearchResult[];
          try {
            switch (provider) {
              case 'google':
                results = await searchGoogle(query, maxResults, config.safeSearch);
                break;
              case 'bing':
                results = await searchBing(query, maxResults, config.safeSearch);
                break;
              case 'duckduckgo':
                results = await searchDuckDuckGo(query, maxResults, config.safeSearch);
                break;
              default:
                throw new Error(`Unknown provider: ${provider}`);
            }

            // Cache results
            if (config.enableCache) {
              cache.set(query, provider, results);
            }

            return {
              success: true,
              results,
              cached: false,
              provider,
              totalResults: results.length,
            };
          } catch (error) {
            context.logger.error('Search failed:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Search failed',
              provider,
            };
          }
        },
      },
      {
        name: 'clear_search_cache',
        pluginId,
        definition: {
          name: 'clear_search_cache',
          description: 'Clear the search results cache',
          parametersSchema: {
            type: 'object',
            properties: {},
          },
        },
        execute: async () => {
          cache.clear();
          context.logger.info('Search cache cleared');
          return { success: true, message: 'Cache cleared' };
        },
      },
    ],
    commands: [
      {
        id: `${pluginId}:search`,
        name: '/search',
        description: 'Quick web search command',
        execute: async () => {
          context.logger.info('Search command executed');
        },
      },
    ],
    hooks: {
      onEnable: async () => {
        context.logger.info('Web Search Plugin enabled');
      },
      onDisable: async () => {
        cache.clear();
        context.logger.info('Web Search Plugin disabled, cache cleared');
      },
    },
  };
}
