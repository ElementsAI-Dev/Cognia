/**
 * Cache Types
 * Types for caching system with TTL support
 */

// Cache entry structure
export interface CacheEntry<T = unknown> {
  value: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
  hits: number;
}

// Cache statistics
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

// Cache configuration
export interface CacheConfig {
  defaultTTL?: number; // Default time to live in milliseconds (0 = no expiry)
  maxSize?: number; // Maximum number of entries
  persistToStorage?: boolean; // Whether to persist cache to localStorage
  storageKey?: string; // Key for localStorage persistence
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

// Default cache configuration
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  persistToStorage: false,
  storageKey: 'app-cache',
  cleanupInterval: 60 * 1000, // 1 minute
};
