/**
 * Completion Cache
 *
 * LRU cache for AI completion results to reduce API calls.
 * Features:
 * - Configurable max size
 * - TTL-based expiration
 * - Hash-based key generation
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
}

export interface CompletionCacheOptions {
  maxSize?: number;
  ttlMs?: number;
}

const DEFAULT_OPTIONS: Required<CompletionCacheOptions> = {
  maxSize: 100,
  ttlMs: 5 * 60 * 1000, // 5 minutes
};

export class CompletionCache<T = string> {
  private cache = new Map<string, CacheEntry<T>>();
  private options: Required<CompletionCacheOptions>;

  constructor(options: CompletionCacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /** Generate a cache key from input and context */
  static generateKey(input: string, context?: string): string {
    const combined = context ? `${input}::${context}` : input;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `completion_${hash}`;
  }

  /** Get a cached value */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.options.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hit count
    entry.hits++;
    return entry.value;
  }

  /** Set a cached value */
  set(key: string, value: T): void {
    // Evict oldest entries if at max size
    if (this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /** Check if a key exists and is valid */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > this.options.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /** Delete a cached value */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Clear all cached values */
  clear(): void {
    this.cache.clear();
  }

  /** Get cache statistics */
  getStats(): { size: number; hits: number; maxSize: number } {
    let totalHits = 0;
    this.cache.forEach((entry) => {
      totalHits += entry.hits;
    });

    return {
      size: this.cache.size,
      hits: totalHits,
      maxSize: this.options.maxSize,
    };
  }

  /** Evict oldest entries */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 10%
    const toRemove = Math.max(1, Math.floor(this.options.maxSize * 0.1));
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /** Cleanup expired entries */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.options.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    });

    return removed;
  }
}

/** Global completion cache instance */
export const completionCache = new CompletionCache<string>();

export default CompletionCache;
