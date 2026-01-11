/**
 * Routing Cache - caches routing decisions for improved performance
 * and provides statistics tracking for routing analysis
 */

import type { 
  ModelSelection, 
  RoutingCacheEntry, 
  RoutingStats,
  TaskCategory,
} from '@/types/provider/auto-router';

// Simple hash function for cache keys
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Generate cache key from input and context
function generateCacheKey(
  input: string, 
  hasImages: boolean = false,
  hasTools: boolean = false,
  agentMode?: string
): string {
  // Normalize input: lowercase, trim, take first 200 chars
  const normalizedInput = input.toLowerCase().trim().slice(0, 200);
  const contextKey = `${hasImages ? 'v' : ''}${hasTools ? 't' : ''}${agentMode || ''}`;
  return hashString(`${normalizedInput}:${contextKey}`);
}

// In-memory cache with LRU-like eviction
class RoutingCache {
  private cache: Map<string, RoutingCacheEntry> = new Map();
  private maxSize: number = 100;
  private defaultTTL: number = 300000; // 5 minutes in ms

  constructor(maxSize: number = 100, defaultTTL: number = 300000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get a cached routing decision
   */
  get(key: string): ModelSelection | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and move to end (LRU)
    entry.hitCount++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.selection;
  }

  /**
   * Store a routing decision in cache
   */
  set(key: string, selection: ModelSelection): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      key,
      selection,
      timestamp: Date.now(),
      hitCount: 0,
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number } {
    let totalHits = 0;
    let totalEntries = 0;
    
    this.cache.forEach((entry) => {
      totalHits += entry.hitCount;
      totalEntries++;
    });

    return {
      size: this.cache.size,
      hitRate: totalEntries > 0 ? totalHits / (totalHits + totalEntries) : 0,
    };
  }

  /**
   * Update TTL setting
   */
  setTTL(ttl: number): void {
    this.defaultTTL = ttl * 1000; // Convert seconds to ms
  }
}

// Routing statistics tracker
class RoutingStatsTracker {
  private stats: RoutingStats = {
    totalRequests: 0,
    byTier: { fast: 0, balanced: 0, powerful: 0, reasoning: 0 },
    byProvider: {},
    byCategory: {
      general: 0,
      coding: 0,
      analysis: 0,
      creative: 0,
      research: 0,
      conversation: 0,
      math: 0,
      translation: 0,
      summarization: 0,
    },
    avgLatency: 0,
    cacheHitRate: 0,
    estimatedCostSaved: 0,
  };

  private latencies: number[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  /**
   * Record a routing decision
   */
  recordDecision(
    selection: ModelSelection,
    fromCache: boolean = false
  ): void {
    this.stats.totalRequests++;

    // Track by tier
    if (selection.tier in this.stats.byTier) {
      this.stats.byTier[selection.tier]++;
    }

    // Track by provider
    if (!this.stats.byProvider[selection.provider]) {
      this.stats.byProvider[selection.provider] = 0;
    }
    this.stats.byProvider[selection.provider]++;

    // Track by category
    const category = selection.classification?.category || 'general';
    if (category in this.stats.byCategory) {
      this.stats.byCategory[category as TaskCategory]++;
    }

    // Track latency
    if (selection.routingLatency) {
      this.latencies.push(selection.routingLatency);
      // Keep only last 100 latencies for moving average
      if (this.latencies.length > 100) {
        this.latencies.shift();
      }
      this.stats.avgLatency = 
        this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
    }

    // Track cache hits
    if (fromCache) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    this.stats.cacheHitRate = 
      this.cacheHits / (this.cacheHits + this.cacheMisses);

    // Estimate cost saved by using faster/cheaper models
    if (selection.tier === 'fast' && selection.estimatedCost) {
      // Assume balanced tier would cost 3x more
      this.stats.estimatedCostSaved += selection.estimatedCost.totalCost * 2;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): RoutingStats {
    return { ...this.stats };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats = {
      totalRequests: 0,
      byTier: { fast: 0, balanced: 0, powerful: 0, reasoning: 0 },
      byProvider: {},
      byCategory: {
        general: 0,
        coding: 0,
        analysis: 0,
        creative: 0,
        research: 0,
        conversation: 0,
        math: 0,
        translation: 0,
        summarization: 0,
      },
      avgLatency: 0,
      cacheHitRate: 0,
      estimatedCostSaved: 0,
    };
    this.latencies = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Singleton instances
const routingCache = new RoutingCache();
const statsTracker = new RoutingStatsTracker();

/**
 * Get cached routing decision or null if not found
 */
export function getCachedRouting(
  input: string,
  hasImages: boolean = false,
  hasTools: boolean = false,
  agentMode?: string
): ModelSelection | null {
  const key = generateCacheKey(input, hasImages, hasTools, agentMode);
  return routingCache.get(key);
}

/**
 * Cache a routing decision
 */
export function cacheRoutingDecision(
  input: string,
  selection: ModelSelection,
  hasImages: boolean = false,
  hasTools: boolean = false,
  agentMode?: string
): void {
  const key = generateCacheKey(input, hasImages, hasTools, agentMode);
  routingCache.set(key, selection);
}

/**
 * Record a routing decision for statistics
 */
export function recordRoutingDecision(
  selection: ModelSelection,
  fromCache: boolean = false
): void {
  statsTracker.recordDecision(selection, fromCache);
}

/**
 * Get routing statistics
 */
export function getRoutingStats(): RoutingStats {
  return statsTracker.getStats();
}

/**
 * Reset routing statistics
 */
export function resetRoutingStats(): void {
  statsTracker.reset();
}

/**
 * Clear routing cache
 */
export function clearRoutingCache(): void {
  routingCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; hitRate: number } {
  return routingCache.getStats();
}

/**
 * Update cache TTL
 */
export function setCacheTTL(ttlSeconds: number): void {
  routingCache.setTTL(ttlSeconds);
}

/**
 * Cost estimation utilities
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  provider: string,
  model: string
): { inputCost: number; outputCost: number; totalCost: number } | null {
  // Pricing per 1M tokens (approximate, as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'o1': { input: 15, output: 60 },
    'o1-mini': { input: 3, output: 12 },
    // Anthropic
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-opus-4': { input: 15, output: 75 },
    'claude-3-5-haiku': { input: 0.8, output: 4 },
    // Google
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
    // DeepSeek
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
    // Groq (free tier)
    'llama-3.3-70b': { input: 0.59, output: 0.79 },
    // Mistral
    'mistral-large': { input: 2, output: 6 },
    'mistral-small': { input: 0.2, output: 0.6 },
  };

  // Find matching price
  const modelKey = Object.keys(pricing).find(key => 
    model.toLowerCase().includes(key.toLowerCase())
  );

  if (!modelKey) return null;

  const { input, output } = pricing[modelKey];
  const inputCost = (inputTokens / 1_000_000) * input;
  const outputCost = (outputTokens / 1_000_000) * output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

/**
 * Compare cost between two model selections
 */
export function compareCosts(
  selection1: ModelSelection,
  selection2: ModelSelection
): { 
  cheaper: ModelSelection; 
  savings: number; 
  savingsPercent: number;
} | null {
  if (!selection1.estimatedCost || !selection2.estimatedCost) {
    return null;
  }

  const cost1 = selection1.estimatedCost.totalCost;
  const cost2 = selection2.estimatedCost.totalCost;

  if (cost1 <= cost2) {
    return {
      cheaper: selection1,
      savings: cost2 - cost1,
      savingsPercent: ((cost2 - cost1) / cost2) * 100,
    };
  } else {
    return {
      cheaper: selection2,
      savings: cost1 - cost2,
      savingsPercent: ((cost1 - cost2) / cost1) * 100,
    };
  }
}
