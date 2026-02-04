/**
 * Search Result Cache
 * LRU cache for search results with TTL support
 */

import type { SearchResponse, SearchOptions, SearchProviderType } from '@/types/search';
import { createLogger } from '@/lib/logger';

const log = createLogger('search');

export interface SearchCacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  newsTTL?: number;
}

export interface CacheEntry {
  response: SearchResponse;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Generate a cache key from search parameters
 */
export function generateSearchCacheKey(
  query: string,
  provider?: SearchProviderType,
  options?: SearchOptions
): string {
  const keyParts = [
    query.toLowerCase().trim(),
    provider || 'auto',
    options?.maxResults?.toString() || '10',
    options?.searchType || 'general',
    options?.recency || 'any',
    options?.language || 'en',
    options?.country || '',
    options?.includeDomains?.sort().join(',') || '',
    options?.excludeDomains?.sort().join(',') || '',
  ];

  const keyString = keyParts.join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return `search:${Math.abs(hash).toString(36)}`;
}

/**
 * Search Result Cache using LRU eviction
 */
export class SearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly newsTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(options: SearchCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 500;
    this.defaultTTL = options.defaultTTL ?? 10 * 60 * 1000; // 10 minutes
    this.newsTTL = options.newsTTL ?? 5 * 60 * 1000; // 5 minutes for news
  }

  /**
   * Get cached search response
   */
  get(
    query: string,
    provider?: SearchProviderType,
    options?: SearchOptions
  ): SearchResponse | null {
    const key = generateSearchCacheKey(query, provider, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end for LRU (delete and re-add)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    log.debug(`Cache hit for query: "${query}" (key: ${key})`);

    return entry.response;
  }

  /**
   * Store search response in cache
   */
  set(
    query: string,
    response: SearchResponse,
    provider?: SearchProviderType,
    options?: SearchOptions
  ): void {
    const key = generateSearchCacheKey(query, provider, options);

    // Determine TTL based on search type
    const ttl = options?.searchType === 'news' ? this.newsTTL : this.defaultTTL;

    // Evict oldest entries if cache is full
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        log.debug(`Evicted cache entry: ${firstKey}`);
      }
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl,
    });

    log.debug(`Cached search response for query: "${query}" (key: ${key}, ttl: ${ttl}ms)`);
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern?: string): number {
    if (!pattern) {
      const count = this.cache.size;
      this.cache.clear();
      log.debug(`Cleared all ${count} cache entries`);
      return count;
    }

    let count = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    log.debug(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
    return count;
  }

  /**
   * Check if a query is cached
   */
  has(
    query: string,
    provider?: SearchProviderType,
    options?: SearchOptions
  ): boolean {
    const key = generateSearchCacheKey(query, provider, options);
    const entry = this.cache.get(key);

    if (!entry) return false;

    // Check expiration
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    log.debug('Search cache cleared');
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      log.debug(`Cleaned up ${count} expired cache entries`);
    }

    return count;
  }
}

/** Global search cache singleton */
let globalSearchCache: SearchCache | null = null;

/**
 * Get or create the global search cache
 */
export function getSearchCache(options?: SearchCacheOptions): SearchCache {
  if (!globalSearchCache) {
    globalSearchCache = new SearchCache(options);
  }
  return globalSearchCache;
}

/**
 * Reset the global search cache
 */
export function resetSearchCache(): void {
  globalSearchCache?.clear();
  globalSearchCache = null;
}
