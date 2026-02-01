/**
 * Cache Middleware - AI SDK caching implementation
 * 
 * Implements caching for AI responses using the AI SDK middleware pattern.
 * Uses simulateReadableStream for cached streaming responses.
 * 
 * Based on AI SDK documentation:
 * https://ai-sdk.dev/docs/advanced/caching
 */

import {
  simulateReadableStream,
  type LanguageModelMiddleware,
} from 'ai';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

/**
 * Cache store interface
 */
export interface CacheStore {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, ttlSeconds?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

/**
 * In-memory cache store implementation
 */
export function createInMemoryCacheStore(options?: {
  maxSize?: number;
  defaultTTL?: number;
}): CacheStore {
  const { maxSize = 100, defaultTTL = 3600 } = options || {};
  const cache = new Map<string, { value: unknown; expiry: number }>();

  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        cache.delete(key);
      }
    }
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      cleanup();
      const entry = cache.get(key);
      if (!entry) return null;
      if (entry.expiry && Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
      }
      return entry.value as T;
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      cleanup();
      
      // Evict oldest entries if cache is full
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }

      const ttl = ttlSeconds ?? defaultTTL;
      cache.set(key, {
        value,
        expiry: ttl ? Date.now() + ttl * 1000 : 0,
      });
    },

    async delete(key: string): Promise<void> {
      cache.delete(key);
    },
  };
}

/**
 * IndexedDB cache store implementation for persistent caching
 */
export function createIndexedDBCacheStore(options?: {
  dbName?: string;
  storeName?: string;
  defaultTTL?: number;
}): CacheStore {
  const {
    dbName = 'cognia-ai-cache',
    storeName = 'responses',
    defaultTTL = 3600,
  } = options || {};

  let dbPromise: Promise<IDBDatabase> | null = null;

  const getDB = (): Promise<IDBDatabase> => {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB not available'));
    }

    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'key' });
          }
        };
      });
    }
    return dbPromise;
  };

  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(key);
          
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const entry = request.result;
            if (!entry) {
              resolve(null);
              return;
            }
            
            // Check expiry
            if (entry.expiry && Date.now() > entry.expiry) {
              // Delete expired entry
              this.delete(key).catch((e) => log.error('Failed to delete expired cache entry', e as Error));
              resolve(null);
              return;
            }
            
            resolve(entry.value as T);
          };
        });
      } catch {
        return null;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      try {
        const db = await getDB();
        const ttl = ttlSeconds ?? defaultTTL;
        
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put({
            key,
            value,
            expiry: ttl ? Date.now() + ttl * 1000 : 0,
            createdAt: Date.now(),
          });
          
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch (error) {
        log.error('Failed to cache response', error as Error);
      }
    },

    async delete(key: string): Promise<void> {
      try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);
          
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      } catch {
        // Ignore delete errors
      }
    },
  };
}

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(params: Record<string, unknown>): string {
  // Create a stable hash from the parameters
  const sortedParams = JSON.stringify(params, Object.keys(params).sort());
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < sortedParams.length; i++) {
    const char = sortedParams.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `ai-cache-${Math.abs(hash).toString(36)}`;
}

/**
 * Cache middleware options
 */
export interface CacheMiddlewareOptions {
  /** Cache store to use */
  store: CacheStore;
  /** TTL in seconds (default: 3600) */
  ttlSeconds?: number;
  /** Initial delay for simulated streaming (default: 0) */
  initialDelayMs?: number;
  /** Delay between chunks for simulated streaming (default: 10) */
  chunkDelayMs?: number;
  /** Custom cache key generator */
  generateKey?: (params: Record<string, unknown>) => string;
  /** Whether to cache streaming responses (default: true) */
  cacheStreaming?: boolean;
}

/**
 * Create a cache middleware for language models
 * 
 * This middleware caches both generate and stream responses.
 * For cached streaming responses, it uses simulateReadableStream
 * to replay the response chunk by chunk.
 */
export function createCacheMiddleware(options: CacheMiddlewareOptions): LanguageModelMiddleware {
  const {
    store,
    ttlSeconds = 3600,
    initialDelayMs = 0,
    chunkDelayMs = 10,
    generateKey = generateCacheKey,
    cacheStreaming = true,
  } = options;

  return {
    wrapGenerate: async ({ doGenerate, params }) => {
      const cacheKey = generateKey(params as Record<string, unknown>);
      
      // Check cache
      type GenerateResult = Awaited<ReturnType<typeof doGenerate>>;
      const cached = await store.get<GenerateResult>(cacheKey);
      
      if (cached !== null && typeof cached === 'object') {
        // Fix timestamps if present - create a mutable copy
        const result = JSON.parse(JSON.stringify(cached)) as GenerateResult;
        if ('response' in result && result.response) {
          const response = result.response as { timestamp?: string | Date };
          if (response?.timestamp && typeof response.timestamp === 'string') {
            response.timestamp = new Date(response.timestamp);
          }
        }
        return result;
      }

      // Execute and cache
      const result = await doGenerate();
      await store.set(cacheKey, result, ttlSeconds);
      
      return result;
    },

    wrapStream: cacheStreaming ? async ({ doStream, params }) => {
      const cacheKey = generateKey(params as Record<string, unknown>);
      
      // Check cache for stream parts
      type StreamChunk = { type: string; timestamp?: string | Date; [key: string]: unknown };
      const cached = await store.get<StreamChunk[]>(cacheKey);
      
      if (cached !== null && Array.isArray(cached)) {
        // Format timestamps in cached response
        const formattedChunks = cached.map((part) => {
          if (part.type === 'response-metadata' && part.timestamp) {
            return { ...part, timestamp: new Date(part.timestamp as string) };
          }
          return part;
        });

        // Return simulated stream from cache
        return {
          stream: simulateReadableStream({
            initialDelayInMs: initialDelayMs,
            chunkDelayInMs: chunkDelayMs,
            chunks: formattedChunks,
          }),
        };
      }

      // Execute streaming
      const streamResult = await doStream();
      const { stream } = streamResult;
      
      // Collect chunks for caching
      const fullResponse: StreamChunk[] = [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformStream = new TransformStream<any, any>({
        transform(chunk, controller) {
          fullResponse.push(chunk);
          controller.enqueue(chunk);
        },
        flush() {
          // Cache the full response after streaming completes
          store.set(cacheKey, fullResponse, ttlSeconds).catch((e) => log.error('Failed to cache streaming response', e as Error));
        },
      });

      return {
        ...streamResult,
        stream: stream.pipeThrough(transformStream),
      };
    } : undefined,
  };
}

/**
 * Create a simple cache middleware with in-memory storage
 */
export function createSimpleCacheMiddleware(options?: {
  ttlSeconds?: number;
  maxSize?: number;
}): LanguageModelMiddleware {
  const store = createInMemoryCacheStore({
    maxSize: options?.maxSize ?? 100,
    defaultTTL: options?.ttlSeconds ?? 3600,
  });

  return createCacheMiddleware({
    store,
    ttlSeconds: options?.ttlSeconds ?? 3600,
  });
}

/**
 * Default cache store instance
 */
let defaultCacheStore: CacheStore | null = null;

/**
 * Get or create the default cache store
 */
export function getDefaultCacheStore(): CacheStore {
  if (!defaultCacheStore) {
    // Use IndexedDB if available, otherwise in-memory
    if (typeof indexedDB !== 'undefined') {
      defaultCacheStore = createIndexedDBCacheStore();
    } else {
      defaultCacheStore = createInMemoryCacheStore();
    }
  }
  return defaultCacheStore;
}

/**
 * Set the default cache store
 */
export function setDefaultCacheStore(store: CacheStore): void {
  defaultCacheStore = store;
}
