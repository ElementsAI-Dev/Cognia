/**
 * Memory Manager - Manage long-term memory for agents
 * 
 * Features:
 * - Key-value storage with LRU eviction
 * - Tag-based organization
 * - TTL (Time To Live) support
 * - Access tracking
 * - Cross-session persistence
 */

import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

export interface MemoryEntry {
  id: string;
  key: string;
  value: unknown;
  timestamp: Date;
  accessCount: number;
  lastAccessed: Date;
  accessOrder: number; // Monotonically increasing counter for LRU ordering
  tags: string[];
  ttl?: number;
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  keys?: string[];
  tags?: string[];
  limit?: number;
  includeExpired?: boolean;
}

export interface MemoryStats {
  totalEntries: number;
  totalAccessCount: number;
  expiredEntries: number;
  tags: Record<string, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
}

export interface MemoryManagerConfig {
  maxEntries: number;
  defaultTTL: number; // Time to live in milliseconds
  enablePersistence: boolean;
  persistenceKey: string;
}

const DEFAULT_CONFIG: MemoryManagerConfig = {
  maxEntries: 1000,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  enablePersistence: true,
  persistenceKey: 'cognia-agent-memory',
};

export class MemoryManager {
  private memory: Map<string, MemoryEntry> = new Map();
  private config: MemoryManagerConfig;
  private timestampCounter: number = 0; // Monotonically increasing counter

  constructor(config: Partial<MemoryManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Load from persistence if enabled
    if (this.config.enablePersistence) {
      this.loadFromPersistence();
    }
  }

  /**
   * Generate storage key
   */
  private getStorageKey(key: string): string {
    return `memory:${key}`;
  }

  /**
   * Check if an entry has expired
   */
  private isExpired(entry: MemoryEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp.getTime() > entry.ttl;
  }

  /**
   * Get current timestamp
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

    for (const [key, entry] of this.memory.entries()) {
      if (oldestOrder === null || entry.accessOrder < oldestOrder) {
        oldestOrder = entry.accessOrder;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memory.delete(oldestKey);
    }
  }

  /**
   * Save to persistence
   */
  private saveToPersistence(): void {
    if (!this.config.enablePersistence) return;

    // Only save on client side
    if (typeof window === 'undefined') return;

    try {
      const entries = Array.from(this.memory.entries());
      const data = JSON.stringify(entries);
      localStorage.setItem(this.config.persistenceKey, data);
    } catch (error) {
      log.warn('Failed to save memory to persistence', { error });
    }
  }

  /**
   * Load from persistence
   */
  private loadFromPersistence(): void {
    if (!this.config.enablePersistence) return;

    // Only load on client side
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(this.config.persistenceKey);
      if (data) {
        const entries = JSON.parse(data);
        this.memory = new Map(
          entries.map(([key, entry]: [string, MemoryEntry]) => [
            key,
            {
              ...entry,
              timestamp: new Date(entry.timestamp),
              lastAccessed: new Date(entry.lastAccessed),
            },
          ])
        );
      }
    } catch (error) {
      log.warn('Failed to load memory from persistence', { error });
    }
  }

  /**
   * Set a value in memory
   */
  set(
    key: string,
    value: unknown,
    options: {
      tags?: string[];
      ttl?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): void {
    const storageKey = this.getStorageKey(key);

    // Check if this key already exists (update case)
    const existingEntry = this.memory.get(storageKey);

    if (!existingEntry) {
      // Only evict if we're adding a new entry and memory is full
      while (this.memory.size >= this.config.maxEntries) {
        this.evictLRU();
      }
    }

    const entry: MemoryEntry = {
      id: nanoid(),
      key,
      value,
      timestamp: this.getCurrentTimestamp(),
      accessCount: existingEntry ? existingEntry.accessCount : 0,
      lastAccessed: this.getCurrentTimestamp(),
      accessOrder: this.getNextAccessOrder(),
      tags: options.tags || [],
      ttl: options.ttl ?? this.config.defaultTTL,
      metadata: options.metadata,
    };

    this.memory.set(storageKey, entry);
    this.saveToPersistence();
  }

  /**
   * Get a value from memory
   */
  get(key: string): unknown | null {
    const storageKey = this.getStorageKey(key);
    const entry = this.memory.get(storageKey);

    if (!entry) return null;

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.memory.delete(storageKey);
      this.saveToPersistence();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = this.getCurrentTimestamp();
    entry.accessOrder = this.getNextAccessOrder();
    this.saveToPersistence();

    return entry.value;
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    const storageKey = this.getStorageKey(key);
    const entry = this.memory.get(storageKey);

    if (!entry) return false;

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.memory.delete(storageKey);
      return false;
    }

    return true;
  }

  /**
   * Delete a value from memory
   */
  delete(key: string): boolean {
    const storageKey = this.getStorageKey(key);
    const deleted = this.memory.delete(storageKey);
    
    if (deleted) {
      this.saveToPersistence();
    }
    
    return deleted;
  }

  /**
   * Query memory entries
   */
  query(query: MemoryQuery): MemoryEntry[] {
    let results = Array.from(this.memory.values());

    // Filter by keys
    if (query.keys && query.keys.length > 0) {
      results = results.filter(e => query.keys!.includes(e.key));
    }

    // Filter by tags (AND logic - must have ALL specified tags)
    if (query.tags && query.tags.length > 0) {
      results = results.filter(e =>
        query.tags!.every(tag => e.tags.includes(tag))
      );
    }

    // Filter expired entries
    if (!query.includeExpired) {
      results = results.filter(e => !this.isExpired(e));
    }

    // Limit results
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.memory.values())
      .filter(e => !this.isExpired(e))
      .map(e => e.key);
  }

  /**
   * Get all entries
   */
  entries(): MemoryEntry[] {
    return Array.from(this.memory.values()).filter(e => !this.isExpired(e));
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.memory.clear();
    this.saveToPersistence();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let count = 0;

    for (const [key, entry] of this.memory.entries()) {
      if (this.isExpired(entry)) {
        this.memory.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.saveToPersistence();
    }

    return count;
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    const entries = Array.from(this.memory.values());
    const expiredEntries = entries.filter(e => this.isExpired(e));
    const validEntries = entries.filter(e => !this.isExpired(e));

    const tags: Record<string, number> = {};
    for (const entry of validEntries) {
      for (const tag of entry.tags) {
        tags[tag] = (tags[tag] || 0) + 1;
      }
    }

    const timestamps = validEntries.map(e => e.timestamp.getTime());
    const oldestEntry = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : undefined;
    const newestEntry = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : undefined;

    return {
      totalEntries: validEntries.length,
      totalAccessCount: validEntries.reduce((sum, e) => sum + e.accessCount, 0),
      expiredEntries: expiredEntries.length,
      tags,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Evict entries if new maxEntries is smaller than current size
    while (this.memory.size > this.config.maxEntries && this.config.maxEntries > 0) {
      this.evictLRU();
    }
  }
}

// Global memory manager instance
export const globalMemoryManager = new MemoryManager();

export default MemoryManager;
