'use client';

/**
 * CacheProvider - Advanced caching system for performance optimization
 * Provides in-memory and persistent caching with TTL support
 */

import { createContext, useContext, useCallback, useEffect, useState, ReactNode, useRef } from 'react';
import type {
  CacheEntry,
  CacheStats,
  CacheConfig,
} from '@/types';
import { DEFAULT_CACHE_CONFIG } from '@/types';

// Re-export types for backward compatibility
export type {
  CacheEntry,
  CacheStats,
  CacheConfig,
} from '@/types';

// Cache context value
interface CacheContextValue {
  // Basic operations
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T, ttl?: number) => void;
  has: (key: string) => boolean;
  delete: (key: string) => void;
  clear: () => void;

  // Batch operations
  getMany: <T>(keys: string[]) => Record<string, T>;
  setMany: <T>(entries: Record<string, T>, ttl?: number) => void;
  deleteMany: (keys: string[]) => void;

  // Cache management
  getStats: () => CacheStats;
  getSize: () => number;
  getKeys: () => string[];
  cleanup: () => void;

  // Configuration
  updateConfig: (config: Partial<CacheConfig>) => void;
}

// Create context
const CacheContext = createContext<CacheContextValue | undefined>(undefined);

// Default configuration (use centralized constant)
const DEFAULT_CONFIG = DEFAULT_CACHE_CONFIG;

interface CacheProviderProps {
  children: ReactNode;
  config?: Partial<CacheConfig>;
  /** Initial cache values */
  initialCache?: Record<string, unknown>;
}

/**
 * Cache Provider Component
 */
export function CacheProvider({
  children,
  config: userConfig = {},
  initialCache = {},
}: CacheProviderProps) {
  const [config, setConfig] = useState<CacheConfig>(() => ({ ...DEFAULT_CONFIG, ...userConfig }));
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const statsRef = useRef({ hits: 0, misses: 0, totalRequests: 0 });

  // Load initial cache
  useEffect(() => {
    // Load from initial cache prop
    Object.entries(initialCache).forEach(([key, value]) => {
      cacheRef.current.set(key, {
        value,
        timestamp: Date.now(),
        ttl: config.defaultTTL,
        hits: 0,
      });
    });

    // Load from localStorage if enabled
    const storageKey = config.storageKey ?? 'app-cache';
    if (config.persistToStorage) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.entries(parsed).forEach(([key, entry]) => {
            const cacheEntry = entry as CacheEntry;
            // Check if entry is still valid
            if (!cacheEntry.ttl || Date.now() - cacheEntry.timestamp < cacheEntry.ttl) {
              cacheRef.current.set(key, cacheEntry);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load cache from storage:', error);
      }
    }
  }, [initialCache, config.persistToStorage, config.storageKey, config.defaultTTL]);

  // Persist cache to localStorage
  const persistCache = useCallback(() => {
    if (!config.persistToStorage) return;

    try {
      const cacheObj = Object.fromEntries(cacheRef.current.entries());
      const storageKey = config.storageKey ?? 'app-cache';
      localStorage.setItem(storageKey, JSON.stringify(cacheObj));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }, [config.persistToStorage, config.storageKey]);

  // Cleanup expired entries
  const cleanup = useCallback(() => {
    const now = Date.now();
    let cleaned = 0;

    cacheRef.current.forEach((entry, key) => {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        cacheRef.current.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      persistCache();
    }

    return cleaned;
  }, [persistCache]);

  // Periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanup, config.cleanupInterval);
    return () => clearInterval(interval);
  }, [config.cleanupInterval, cleanup]);

  // Enforce max size
  const enforceMaxSize = useCallback(() => {
    const maxSize = config.maxSize ?? 1000;
    if (cacheRef.current.size <= maxSize) return;

    // Sort by last access (hits) and delete least used
    const entries = Array.from(cacheRef.current.entries())
      .sort((a, b) => a[1].hits - b[1].hits);

    const toDelete = entries.slice(0, cacheRef.current.size - maxSize);
    toDelete.forEach(([key]) => cacheRef.current.delete(key));

    persistCache();
  }, [config.maxSize, persistCache]);

  // Basic operations
  const get = useCallback(<T,>(key: string): T | null => {
    statsRef.current.totalRequests++;

    const entry = cacheRef.current.get(key);

    if (!entry) {
      statsRef.current.misses++;
      return null;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(key);
      statsRef.current.misses++;
      return null;
    }

    entry.hits++;
    statsRef.current.hits++;

    return entry.value as T;
  }, []);

  const set = useCallback(
    <T,>(key: string, value: T, ttl?: number) => {
      cacheRef.current.set(key, {
        value,
        timestamp: Date.now(),
        ttl: ttl ?? config.defaultTTL,
        hits: 0,
      });

      enforceMaxSize();
      persistCache();
    },
    [config.defaultTTL, enforceMaxSize, persistCache]
  );

  const has = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);

    if (!entry) return false;

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      cacheRef.current.delete(key);
      return false;
    }

    return true;
  }, []);

  const delete_key = useCallback((key: string) => {
    cacheRef.current.delete(key);
    persistCache();
  }, [persistCache]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0, totalRequests: 0 };
    persistCache();
  }, [persistCache]);

  // Batch operations
  const getMany = useCallback(<T,>(keys: string[]): Record<string, T> => {
    const result: Record<string, T> = {};

    keys.forEach((key) => {
      const value = get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
    });

    return result;
  }, [get]);

  const setMany = useCallback(
    <T,>(entries: Record<string, T>, ttl?: number) => {
      Object.entries(entries).forEach(([key, value]) => {
        cacheRef.current.set(key, {
          value,
          timestamp: Date.now(),
          ttl: ttl ?? config.defaultTTL,
          hits: 0,
        });
      });

      enforceMaxSize();
      persistCache();
    },
    [config.defaultTTL, enforceMaxSize, persistCache]
  );

  const deleteMany = useCallback((keys: string[]) => {
    keys.forEach((key) => cacheRef.current.delete(key));
    persistCache();
  }, [persistCache]);

  // Cache management
  const getStats = useCallback((): CacheStats => {
    const { hits, misses, totalRequests } = statsRef.current;
    return {
      size: cacheRef.current.size,
      hits,
      misses,
      hitRate: totalRequests > 0 ? hits / totalRequests : 0,
      totalRequests,
    };
  }, []);

  const getSize = useCallback(() => cacheRef.current.size, []);

  const getKeys = useCallback(() => Array.from(cacheRef.current.keys()), []);

  const updateConfig = useCallback((updates: Partial<CacheConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const value: CacheContextValue = {
    get,
    set,
    has,
    delete: delete_key,
    clear,
    getMany,
    setMany,
    deleteMany,
    getStats,
    getSize,
    getKeys,
    cleanup,
    updateConfig,
  };

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>;
}

/**
 * Hook to access cache
 */
export function useCache(): CacheContextValue {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
}

/**
 * Hook for cached async operations
 */
export function useCachedAsync<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): () => Promise<T> {
  const { get, set } = useCache();

  return useCallback(async () => {
    // Check cache first
    const cached = get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const result = await fn();
    set(key, result, ttl);
    return result;
  }, [key, fn, ttl, get, set]);
}

/**
 * Hook for memoized values with cache
 */
export function useCachedValue<T>(key: string, value: T, ttl?: number): T {
  const { get, set } = useCache();

  useEffect(() => {
    set(key, value, ttl);
  }, [key, value, ttl, set]);

  const cached = get<T>(key);
  return cached !== null ? cached : value;
}

export default CacheProvider;
