/**
 * TTS Cache - Audio caching system using IndexedDB
 * Caches generated TTS audio to avoid redundant API calls
 */

import type { TTSProvider, TTSSettings } from '@/types/media/tts';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

const DB_NAME = 'cognia-tts-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

export interface TTSCacheEntry {
  key: string;
  audioBlob: Blob;
  mimeType: string;
  createdAt: number;
  expiresAt: number;
  provider: TTSProvider;
  text: string;
  size: number;
}

/**
 * Generate cache key from TTS parameters
 */
export function generateCacheKey(
  text: string,
  provider: TTSProvider,
  settings: Partial<TTSSettings>
): string {
  const params = {
    text,
    provider,
    // Include relevant settings based on provider
    ...(provider === 'openai' && {
      voice: settings.openaiVoice,
      model: settings.openaiModel,
      speed: settings.openaiSpeed,
    }),
    ...(provider === 'gemini' && {
      voice: settings.geminiVoice,
    }),
    ...(provider === 'edge' && {
      voice: settings.edgeVoice,
      rate: settings.edgeRate,
      pitch: settings.edgePitch,
    }),
    ...(provider === 'elevenlabs' && {
      voice: settings.elevenlabsVoice,
      model: settings.elevenlabsModel,
      stability: settings.elevenlabsStability,
      similarityBoost: settings.elevenlabsSimilarityBoost,
    }),
    ...(provider === 'lmnt' && {
      voice: settings.lmntVoice,
      speed: settings.lmntSpeed,
    }),
    ...(provider === 'hume' && {
      voice: settings.humeVoice,
    }),
    ...(provider === 'cartesia' && {
      voice: settings.cartesiaVoice,
      model: settings.cartesiaModel,
      language: settings.cartesiaLanguage,
      speed: settings.cartesiaSpeed,
      emotion: settings.cartesiaEmotion,
    }),
    ...(provider === 'deepgram' && {
      voice: settings.deepgramVoice,
    }),
  };

  // Create hash from parameters
  const str = JSON.stringify(params);
  return hashString(str);
}

/**
 * Simple hash function for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `tts_${Math.abs(hash).toString(36)}`;
}

/**
 * TTS Cache Manager
 */
class TTSCacheManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open TTS cache database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('provider', 'provider', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get cached audio
   */
  async get(key: string): Promise<TTSCacheEntry | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(new Error('Failed to get cached audio'));
      request.onsuccess = () => {
        const entry = request.result as TTSCacheEntry | undefined;
        
        // Check if expired
        if (entry && entry.expiresAt < Date.now()) {
          this.delete(key).catch((e) => log.error('Failed to delete expired cache entry', e as Error));
          resolve(null);
        } else {
          resolve(entry || null);
        }
      };
    });
  }

  /**
   * Store audio in cache
   */
  async set(
    key: string,
    audioBlob: Blob,
    mimeType: string,
    provider: TTSProvider,
    text: string
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();
    const entry: TTSCacheEntry = {
      key,
      audioBlob,
      mimeType,
      createdAt: now,
      expiresAt: now + CACHE_TTL,
      provider,
      text: text.substring(0, 100), // Store truncated text for reference
      size: audioBlob.size,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(new Error('Failed to cache audio'));
      request.onsuccess = () => {
        // Check cache size after adding
        this.cleanupIfNeeded().catch((e) => log.error('Failed to cleanup cache', e as Error));
        resolve();
      };
    });
  }

  /**
   * Delete cached entry
   */
  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(new Error('Failed to delete cached audio'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all cached audio
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(new Error('Failed to clear cache'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Get total cache size
   */
  async getCacheSize(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to get cache size'));
      request.onsuccess = () => {
        const entries = request.result as TTSCacheEntry[];
        const totalSize = entries.reduce((acc, entry) => acc + entry.size, 0);
        resolve(totalSize);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalSize: number;
    entryCount: number;
    providers: Record<TTSProvider, number>;
  }> {
    await this.init();
    if (!this.db) return { totalSize: 0, entryCount: 0, providers: {} as Record<TTSProvider, number> };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to get cache stats'));
      request.onsuccess = () => {
        const entries = request.result as TTSCacheEntry[];
        const totalSize = entries.reduce((acc, entry) => acc + entry.size, 0);
        const providers = entries.reduce((acc, entry) => {
          acc[entry.provider] = (acc[entry.provider] || 0) + 1;
          return acc;
        }, {} as Record<TTSProvider, number>);

        resolve({
          totalSize,
          entryCount: entries.length,
          providers,
        });
      };
    });
  }

  /**
   * Clean up expired entries and enforce size limit
   */
  async cleanupIfNeeded(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();

    // First, delete expired entries
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onerror = () => reject(new Error('Failed to cleanup expired entries'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });

    // Check total size and remove oldest entries if needed
    const totalSize = await this.getCacheSize();
    if (totalSize > MAX_CACHE_SIZE) {
      await this.removeOldestEntries(totalSize - MAX_CACHE_SIZE);
    }
  }

  /**
   * Remove oldest entries to free up space
   */
  private async removeOldestEntries(bytesToFree: number): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.openCursor();

      let freedBytes = 0;

      request.onerror = () => reject(new Error('Failed to remove oldest entries'));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && freedBytes < bytesToFree) {
          const entry = cursor.value as TTSCacheEntry;
          freedBytes += entry.size;
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

// Singleton instance
export const ttsCache = new TTSCacheManager();

/**
 * Get cached audio or generate new
 */
export async function getCachedOrGenerate(
  key: string,
  generateFn: () => Promise<{ audioData: ArrayBuffer | Blob; mimeType: string } | null>,
  provider: TTSProvider,
  text: string,
  cacheEnabled: boolean = true
): Promise<{ audioData: ArrayBuffer | Blob; mimeType: string } | null> {
  // Try to get from cache first
  if (cacheEnabled) {
    try {
      const cached = await ttsCache.get(key);
      if (cached) {
        return {
          audioData: cached.audioBlob,
          mimeType: cached.mimeType,
        };
      }
    } catch (error) {
      log.warn('Failed to get cached audio', { error: String(error) });
    }
  }

  // Generate new audio
  const result = await generateFn();
  if (!result) return null;

  // Store in cache
  if (cacheEnabled) {
    try {
      const blob = result.audioData instanceof Blob
        ? result.audioData
        : new Blob([result.audioData], { type: result.mimeType });
      await ttsCache.set(key, blob, result.mimeType, provider, text);
    } catch (error) {
      log.warn('Failed to cache audio', { error: String(error) });
    }
  }

  return result;
}
