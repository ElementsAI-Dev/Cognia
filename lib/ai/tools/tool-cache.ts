/**
 * Tool Cache - Cache tool execution results to avoid redundant calls
 * 
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - TTL (Time To Live) support
 * - Cache statistics tracking
 * - Thread-safe operations
 */

import { loggers } from '@/lib/logger';

const log = loggers.ai;

export interface ToolCacheEntry {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp: Date;
  hitCount: number;
  lastAccessed: Date;
  accessOrder: number; // Monotonically increasing counter for LRU ordering
}

export interface ToolCacheConfig {
  maxEntries: number;
  ttl: number; // Time to live in milliseconds
  enabled: boolean;
}

export interface ToolCacheStats {
  size: number;
  maxEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  evictedCount: number;
}

const DEFAULT_CACHE_CONFIG: ToolCacheConfig = {
  maxEntries: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
  enabled: true,
};

export class ToolCache {
  private cache: Map<string, ToolCacheEntry> = new Map();
  private config: ToolCacheConfig;
  private stats: ToolCacheStats;
  private timestampCounter: number = 0; // Monotonically increasing counter

  constructor(config: Partial<ToolCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      size: 0,
      maxEntries: this.config.maxEntries,
      totalHits: 0,
      totalMisses: 0,
      hitRate: 0,
      evictedCount: 0,
    };
  }

  /**
   * Generate cache key from tool name and arguments
   */
  private getCacheKey(toolName: string, args: Record<string, unknown>): string {
    // Sort keys to ensure consistent key generation
    const sortedArgs = Object.keys(args)
      .sort()
      .reduce((acc, key) => {
        acc[key] = args[key];
        return acc;
      }, {} as Record<string, unknown>);
    
    return `${toolName}:${JSON.stringify(sortedArgs)}`;
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: ToolCacheEntry): boolean {
    if (this.config.ttl === 0) return false;
    return Date.now() - entry.timestamp.getTime() > this.config.ttl;
  }

  /**
   * Get current timestamp with guaranteed increment
   */
  private getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * Get next access order
   */
  private getNextAccessOrder(): number {
    return ++this.timestampCounter;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestOrder: number | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (oldestOrder === null || entry.accessOrder < oldestOrder) {
        oldestOrder = entry.accessOrder;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictedCount++;
    }
  }

  /**
   * Get cached result for a tool call
   */
  get(toolName: string, args: Record<string, unknown>): unknown | null {
    if (!this.config.enabled) return null;

    const key = this.getCacheKey(toolName, args);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.totalMisses++;
      this.updateStats();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.totalMisses++;
      this.updateStats();
      return null;
    }

    // Update access time and hit count
    const oldLastAccessed = entry.lastAccessed;
    const oldOrder = entry.accessOrder;
    entry.lastAccessed = new Date();
    entry.accessOrder = this.getNextAccessOrder();
    entry.hitCount++;
    this.stats.totalHits++;
    this.updateStats();

    // Debug: log the update
    if (process.env.DEBUG_LRU) {
      log.debug(`LRU Get updated ${key}: order ${oldOrder} -> ${entry.accessOrder}, time ${oldLastAccessed.toISOString()} -> ${entry.lastAccessed.toISOString()}`);
    }

    return entry.result;
  }

  /**
   * Cache tool execution result
   */
  set(toolName: string, args: Record<string, unknown>, result: unknown): void {
    if (!this.config.enabled) return;

    const key = this.getCacheKey(toolName, args);

    // Check if this key already exists (update case)
    const existingEntry = this.cache.get(key);

    if (!existingEntry) {
      // Only evict if we're adding a new entry and cache is full
      while (this.cache.size >= this.config.maxEntries) {
        this.evictLRU();
      }
    }

    const entry: ToolCacheEntry = {
      toolName,
      args,
      result,
      timestamp: this.getCurrentTimestamp(),
      hitCount: existingEntry ? existingEntry.hitCount : 0,
      lastAccessed: this.getCurrentTimestamp(),
      accessOrder: this.getNextAccessOrder(),
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Invalidate cache entries for a specific tool
   */
  invalidate(toolName: string): void {
    const prefix = `${toolName}:`;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    this.updateStats();
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalHits = 0;
    this.stats.totalMisses = 0;
    this.stats.hitRate = 0;
    this.stats.evictedCount = 0;
    this.updateStats();
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
  }

  /**
   * Get current cache statistics
   */
  getStats(): ToolCacheStats {
    return { ...this.stats };
  }

  /**
   * Get all cache entries (for debugging)
   */
  getAllEntries(): ToolCacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<ToolCacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.stats.maxEntries = this.config.maxEntries;
    
    // Evict entries if new maxEntries is smaller than current size
    while (this.cache.size > this.config.maxEntries && this.config.maxEntries > 0) {
      this.evictLRU();
    }
    
    // Clear cache if disabled
    if (!this.config.enabled) {
      this.clear();
    }
    
    // Update stats after eviction
    this.updateStats();
  }
}

// Global cache instance
export const globalToolCache = new ToolCache();

export default ToolCache;
