/**
 * MCP Tool Cache - Caching layer for MCP tools
 *
 * Provides caching for getAllTools() to reduce IPC calls during agent execution.
 * Cache is automatically invalidated when servers connect/disconnect.
 */

import type { McpTool } from '@/types/mcp';

/**
 * Cached tool entry
 */
interface CachedToolEntry {
  tools: Array<{ serverId: string; tool: McpTool }>;
  timestamp: number;
  version: number;
}

/**
 * Tool cache configuration
 */
export interface ToolCacheConfig {
  /** Cache time-to-live in milliseconds (default: 5 minutes) */
  ttl: number;
  /** Maximum cache entries (default: 10) */
  maxSize: number;
  /** Whether caching is enabled (default: true) */
  enabled: boolean;
}

const DEFAULT_CACHE_CONFIG: ToolCacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 10,
  enabled: true,
};

/**
 * Tool cache manager for MCP tools
 *
 * Implements a simple LRU-like cache with TTL and version-based invalidation.
 */
export class ToolCacheManager {
  private cache: Map<string, CachedToolEntry> = new Map();
  private config: ToolCacheConfig;
  private version: number = 0;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<ToolCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Get cached tools by key
   */
  get(key: string): Array<{ serverId: string; tool: McpTool }> | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Check version match
    if (entry.version !== this.version) {
      this.cache.delete(key);
      return null;
    }

    return entry.tools;
  }

  /**
   * Set cached tools
   */
  set(key: string, tools: Array<{ serverId: string; tool: McpTool }>): void {
    if (!this.config.enabled) return;

    // Enforce max size (LRU eviction)
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      tools,
      timestamp: Date.now(),
      version: this.version,
    });
  }

  /**
   * Invalidate all cache entries (call when server state changes)
   */
  invalidate(): void {
    this.version++;
    this.cache.clear();
  }

  /**
   * Invalidate cache entries for a specific server
   */
  invalidateServer(serverId: string): void {
    this.version++;
    // Remove entries containing this server
    for (const [key, entry] of this.cache) {
      if (entry.tools.some((t) => t.serverId === serverId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; version: number; enabled: boolean } {
    return {
      size: this.cache.size,
      version: this.version,
      enabled: this.config.enabled,
    };
  }

  /**
   * Update cache configuration
   */
  configure(config: Partial<ToolCacheConfig>): void {
    this.config = { ...this.config, ...config };
    if (!this.config.enabled) {
      this.cache.clear();
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    // Cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Destroy the cache manager
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Global singleton instance
let globalCacheManager: ToolCacheManager | null = null;

/**
 * Get the global tool cache manager instance
 */
export function getToolCacheManager(): ToolCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new ToolCacheManager();
  }
  return globalCacheManager;
}

/**
 * Destroy the global tool cache manager
 */
export function destroyToolCacheManager(): void {
  if (globalCacheManager) {
    globalCacheManager.destroy();
    globalCacheManager = null;
  }
}

/**
 * Cached version of getAllTools
 *
 * Wraps a getAllTools function with caching support.
 */
export function createCachedGetAllTools(
  getAllTools: () => Promise<Array<{ serverId: string; tool: McpTool }>>
): () => Promise<Array<{ serverId: string; tool: McpTool }>> {
  return async () => {
    const cache = getToolCacheManager();
    const cached = cache.get('all');
    if (cached) {
      return cached;
    }

    const tools = await getAllTools();
    cache.set('all', tools);
    return tools;
  };
}
