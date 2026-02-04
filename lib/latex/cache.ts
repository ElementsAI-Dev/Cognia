/**
 * LRU Cache for rendered LaTeX formulas
 * Reduces redundant KaTeX rendering calls for repeated formulas
 */

import katex from 'katex';
import { getKatexOptions, MATH_CACHE_MAX_SIZE, MATH_CACHE_MAX_AGE } from './config';

interface CacheEntry {
  html: string;
  timestamp: number;
  accessCount: number;
}

/**
 * LRU Cache for math formula rendering results
 */
class MathCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private maxAge: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = MATH_CACHE_MAX_SIZE, maxAge = MATH_CACHE_MAX_AGE) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Generate cache key from latex content and display mode
   */
  private getCacheKey(latex: string, displayMode: boolean): string {
    return `${displayMode ? 'D' : 'I'}:${latex}`;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.maxAge;
  }

  /**
   * Evict oldest/least accessed entries when cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size < this.maxSize) return;

    // Remove expired entries first
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }

    // If still over limit, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      // Sort by access count (ascending) and timestamp (ascending)
      entries.sort((a, b) => {
        const countDiff = a[1].accessCount - b[1].accessCount;
        if (countDiff !== 0) return countDiff;
        return a[1].timestamp - b[1].timestamp;
      });

      // Remove bottom 20% entries
      const removeCount = Math.ceil(this.maxSize * 0.2);
      for (let i = 0; i < removeCount && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Get cached rendered HTML for a formula
   */
  get(latex: string, displayMode: boolean): string | null {
    const key = this.getCacheKey(latex, displayMode);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update access count and timestamp for LRU
    entry.accessCount++;
    entry.timestamp = Date.now();
    this.hits++;
    return entry.html;
  }

  /**
   * Store rendered HTML in cache
   */
  set(latex: string, displayMode: boolean, html: string): void {
    this.evictIfNeeded();
    const key = this.getCacheKey(latex, displayMode);
    this.cache.set(key, {
      html,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  /**
   * Check if formula is in cache
   */
  has(latex: string, displayMode: boolean): boolean {
    const key = this.getCacheKey(latex, displayMode);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate: number; hits: number; misses: number } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total === 0 ? 0 : this.hits / total,
      hits: this.hits,
      misses: this.misses,
    };
  }
}

// Global cache instance
const globalMathCache = new MathCache();

/**
 * Render LaTeX to HTML with caching
 * @param latex - LaTeX string to render
 * @param displayMode - Whether to render in display (block) mode
 * @returns Rendered HTML string
 */
export function renderMathCached(
  latex: string,
  displayMode: boolean,
  options: { trust?: boolean } = {}
): string {
  // Try to get from cache first
  const cached = globalMathCache.get(latex, displayMode);
  if (cached !== null) {
    return cached;
  }

  // Render and cache
  try {
    const katexOptions = getKatexOptions(displayMode, options);
    const html = katex.renderToString(latex, katexOptions);
    globalMathCache.set(latex, displayMode, html);
    return html;
  } catch (error) {
    // Don't cache errors
    throw error;
  }
}

/**
 * Render LaTeX to HTML with caching, returning result object
 * @param latex - LaTeX string to render
 * @param displayMode - Whether to render in display (block) mode
 * @returns Result object with html and optional error
 */
export function renderMathSafe(
  latex: string,
  displayMode: boolean,
  options: { trust?: boolean } = {}
): { html: string; error: string | null } {
  try {
    const html = renderMathCached(latex, displayMode, options);
    return { html, error: null };
  } catch (err) {
    return {
      html: '',
      error: err instanceof Error ? err.message : 'Failed to render math',
    };
  }
}

/**
 * Batch render multiple formulas with caching
 * @param formulas - Array of { latex, displayMode } objects
 * @returns Array of rendered HTML strings
 */
export function renderMathBatch(
  formulas: Array<{ latex: string; displayMode: boolean }>,
  options: { trust?: boolean } = {}
): Array<{ html: string; error: string | null }> {
  return formulas.map(({ latex, displayMode }) => renderMathSafe(latex, displayMode, options));
}

/**
 * Clear the global math cache
 */
export function clearMathCache(): void {
  globalMathCache.clear();
}

/**
 * Get math cache statistics
 */
export function getMathCacheStats(): { size: number; maxSize: number; hitRate: number; hits: number; misses: number } {
  return globalMathCache.getStats();
}

/**
 * Preload commonly used formulas into cache
 * @param formulas - Array of { latex, displayMode } objects to preload
 */
export function preloadMathCache(
  formulas: Array<{ latex: string; displayMode: boolean }>
): void {
  for (const { latex, displayMode } of formulas) {
    if (!globalMathCache.has(latex, displayMode)) {
      try {
        renderMathCached(latex, displayMode);
      } catch {
        // Ignore errors during preload
      }
    }
  }
}

export { globalMathCache, MathCache };
