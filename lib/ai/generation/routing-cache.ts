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

// ============================================================================
// SEMANTIC CACHE - Enhanced cache with fuzzy/semantic matching
// ============================================================================

/**
 * Tokenize and normalize text for semantic comparison
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // Keep alphanumeric and Chinese chars
    .split(/\s+/)
    .filter(token => token.length > 2) // Filter short tokens
    .slice(0, 50); // Limit to 50 tokens
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let intersection = 0;
  set1.forEach(token => {
    if (set2.has(token)) intersection++;
  });
  
  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Extract key features from input for semantic matching
 */
function extractFeatures(input: string): {
  tokens: string[];
  length: 'short' | 'medium' | 'long';
  hasCode: boolean;
  hasQuestion: boolean;
  language: 'en' | 'zh' | 'mixed';
} {
  const tokens = tokenize(input);
  const wordCount = input.split(/\s+/).length;
  
  return {
    tokens,
    length: wordCount < 20 ? 'short' : wordCount < 100 ? 'medium' : 'long',
    hasCode: /```|function|const |let |var |class |import |export |def |async |await /i.test(input),
    hasQuestion: /\?|what|how|why|when|where|who|which|是什么|怎么|为什么|什么时候/i.test(input),
    language: /[\u4e00-\u9fff]/.test(input) 
      ? (/[a-zA-Z]{3,}/.test(input) ? 'mixed' : 'zh') 
      : 'en',
  };
}

interface SemanticCacheEntry {
  input: string;
  features: ReturnType<typeof extractFeatures>;
  selection: ModelSelection;
  timestamp: number;
  hitCount: number;
  context: {
    hasImages: boolean;
    hasTools: boolean;
    agentMode?: string;
  };
}

class SemanticCache {
  private entries: SemanticCacheEntry[] = [];
  private maxSize: number = 200;
  private defaultTTL: number = 600000; // 10 minutes
  private similarityThreshold: number = 0.6;

  constructor(maxSize: number = 200, ttlMs: number = 600000) {
    this.maxSize = maxSize;
    this.defaultTTL = ttlMs;
  }

  /**
   * Find semantically similar cached entry
   */
  findSimilar(
    input: string,
    hasImages: boolean = false,
    hasTools: boolean = false,
    agentMode?: string
  ): ModelSelection | null {
    const inputFeatures = extractFeatures(input);
    const now = Date.now();
    
    let bestMatch: SemanticCacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.entries) {
      // Check if expired
      if (now - entry.timestamp > this.defaultTTL) continue;
      
      // Context must match exactly
      if (entry.context.hasImages !== hasImages) continue;
      if (entry.context.hasTools !== hasTools) continue;
      if (entry.context.agentMode !== agentMode) continue;
      
      // Feature-based filtering
      if (entry.features.length !== inputFeatures.length) continue;
      if (entry.features.hasCode !== inputFeatures.hasCode) continue;
      if (entry.features.language !== inputFeatures.language) continue;

      // Calculate semantic similarity
      const similarity = jaccardSimilarity(inputFeatures.tokens, entry.features.tokens);
      
      if (similarity >= this.similarityThreshold && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      return bestMatch.selection;
    }

    return null;
  }

  /**
   * Add entry to semantic cache
   */
  add(
    input: string,
    selection: ModelSelection,
    hasImages: boolean = false,
    hasTools: boolean = false,
    agentMode?: string
  ): void {
    // Remove expired entries and trim to size
    this.cleanup();

    const entry: SemanticCacheEntry = {
      input: input.slice(0, 500), // Store truncated input
      features: extractFeatures(input),
      selection,
      timestamp: Date.now(),
      hitCount: 0,
      context: { hasImages, hasTools, agentMode },
    };

    this.entries.push(entry);
  }

  /**
   * Clean up expired entries and trim to max size
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Remove expired entries
    this.entries = this.entries.filter(e => now - e.timestamp <= this.defaultTTL);
    
    // If still over capacity, remove least-used entries
    if (this.entries.length >= this.maxSize) {
      this.entries.sort((a, b) => a.hitCount - b.hitCount);
      this.entries = this.entries.slice(-Math.floor(this.maxSize * 0.8));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; avgHitCount: number } {
    const totalHits = this.entries.reduce((sum, e) => sum + e.hitCount, 0);
    return {
      size: this.entries.length,
      avgHitCount: this.entries.length > 0 ? totalHits / this.entries.length : 0,
    };
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Set similarity threshold
   */
  setSimilarityThreshold(threshold: number): void {
    this.similarityThreshold = Math.max(0, Math.min(1, threshold));
  }
}

// Singleton semantic cache
const semanticCache = new SemanticCache();

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
 * Uses both exact match and semantic similarity matching
 */
export function getCachedRouting(
  input: string,
  hasImages: boolean = false,
  hasTools: boolean = false,
  agentMode?: string,
  useSemanticCache: boolean = true
): ModelSelection | null {
  // Try exact match first (fast)
  const key = generateCacheKey(input, hasImages, hasTools, agentMode);
  const exactMatch = routingCache.get(key);
  if (exactMatch) return exactMatch;
  
  // Try semantic match (slower but handles similar queries)
  if (useSemanticCache) {
    const semanticMatch = semanticCache.findSimilar(input, hasImages, hasTools, agentMode);
    if (semanticMatch) return semanticMatch;
  }
  
  return null;
}

/**
 * Cache a routing decision
 * Stores in both exact and semantic caches
 */
export function cacheRoutingDecision(
  input: string,
  selection: ModelSelection,
  hasImages: boolean = false,
  hasTools: boolean = false,
  agentMode?: string
): void {
  // Store in exact match cache
  const key = generateCacheKey(input, hasImages, hasTools, agentMode);
  routingCache.set(key, selection);
  
  // Also store in semantic cache for fuzzy matching
  semanticCache.add(input, selection, hasImages, hasTools, agentMode);
}

/**
 * Get semantic cache statistics
 */
export function getSemanticCacheStats(): { size: number; avgHitCount: number } {
  return semanticCache.getStats();
}

/**
 * Clear semantic cache
 */
export function clearSemanticCache(): void {
  semanticCache.clear();
}

/**
 * Set semantic similarity threshold (0-1)
 */
export function setSemanticSimilarityThreshold(threshold: number): void {
  semanticCache.setSimilarityThreshold(threshold);
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

// ============================================================================
// COST-AWARE BUDGET MANAGER
// ============================================================================

export interface BudgetConfig {
  /** Maximum cost per request in USD */
  maxCostPerRequest?: number;
  /** Maximum daily cost in USD */
  dailyBudget?: number;
  /** Maximum monthly cost in USD */
  monthlyBudget?: number;
  /** Alert threshold as percentage of budget (0-1) */
  alertThreshold?: number;
  /** Callback when budget alert is triggered */
  onBudgetAlert?: (alert: BudgetAlert) => void;
}

export interface BudgetAlert {
  type: 'request_limit' | 'daily_warning' | 'daily_exceeded' | 'monthly_warning' | 'monthly_exceeded';
  message: string;
  currentSpend: number;
  budget: number;
  percentUsed: number;
}

export interface BudgetStatus {
  dailySpend: number;
  monthlySpend: number;
  requestCount: number;
  avgCostPerRequest: number;
  dailyBudgetRemaining: number | null;
  monthlyBudgetRemaining: number | null;
  isOverBudget: boolean;
}

class BudgetManager {
  private config: BudgetConfig = {};
  private dailySpend: number = 0;
  private monthlySpend: number = 0;
  private requestCount: number = 0;
  private lastDayReset: number = Date.now();
  private lastMonthReset: number = Date.now();

  configure(config: BudgetConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a request is within budget
   */
  canMakeRequest(estimatedCost: number): { allowed: boolean; reason?: string } {
    this.checkResets();

    // Check per-request limit
    if (this.config.maxCostPerRequest && estimatedCost > this.config.maxCostPerRequest) {
      this.triggerAlert({
        type: 'request_limit',
        message: `Request cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit ($${this.config.maxCostPerRequest})`,
        currentSpend: estimatedCost,
        budget: this.config.maxCostPerRequest,
        percentUsed: (estimatedCost / this.config.maxCostPerRequest) * 100,
      });
      return { 
        allowed: false, 
        reason: `Estimated cost ($${estimatedCost.toFixed(4)}) exceeds per-request limit` 
      };
    }

    // Check daily budget
    if (this.config.dailyBudget) {
      const projectedDaily = this.dailySpend + estimatedCost;
      if (projectedDaily > this.config.dailyBudget) {
        this.triggerAlert({
          type: 'daily_exceeded',
          message: `Daily budget exceeded`,
          currentSpend: this.dailySpend,
          budget: this.config.dailyBudget,
          percentUsed: (this.dailySpend / this.config.dailyBudget) * 100,
        });
        return { 
          allowed: false, 
          reason: `Daily budget ($${this.config.dailyBudget}) would be exceeded` 
        };
      }
    }

    // Check monthly budget
    if (this.config.monthlyBudget) {
      const projectedMonthly = this.monthlySpend + estimatedCost;
      if (projectedMonthly > this.config.monthlyBudget) {
        this.triggerAlert({
          type: 'monthly_exceeded',
          message: `Monthly budget exceeded`,
          currentSpend: this.monthlySpend,
          budget: this.config.monthlyBudget,
          percentUsed: (this.monthlySpend / this.config.monthlyBudget) * 100,
        });
        return { 
          allowed: false, 
          reason: `Monthly budget ($${this.config.monthlyBudget}) would be exceeded` 
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Record a completed request's cost
   */
  recordCost(cost: number): void {
    this.checkResets();
    
    this.dailySpend += cost;
    this.monthlySpend += cost;
    this.requestCount++;

    // Check for warning thresholds
    const threshold = this.config.alertThreshold || 0.8;

    if (this.config.dailyBudget) {
      const dailyPercent = this.dailySpend / this.config.dailyBudget;
      if (dailyPercent >= threshold && dailyPercent < 1) {
        this.triggerAlert({
          type: 'daily_warning',
          message: `Approaching daily budget limit (${(dailyPercent * 100).toFixed(1)}% used)`,
          currentSpend: this.dailySpend,
          budget: this.config.dailyBudget,
          percentUsed: dailyPercent * 100,
        });
      }
    }

    if (this.config.monthlyBudget) {
      const monthlyPercent = this.monthlySpend / this.config.monthlyBudget;
      if (monthlyPercent >= threshold && monthlyPercent < 1) {
        this.triggerAlert({
          type: 'monthly_warning',
          message: `Approaching monthly budget limit (${(monthlyPercent * 100).toFixed(1)}% used)`,
          currentSpend: this.monthlySpend,
          budget: this.config.monthlyBudget,
          percentUsed: monthlyPercent * 100,
        });
      }
    }
  }

  /**
   * Get current budget status
   */
  getStatus(): BudgetStatus {
    this.checkResets();

    return {
      dailySpend: this.dailySpend,
      monthlySpend: this.monthlySpend,
      requestCount: this.requestCount,
      avgCostPerRequest: this.requestCount > 0 ? this.monthlySpend / this.requestCount : 0,
      dailyBudgetRemaining: this.config.dailyBudget 
        ? Math.max(0, this.config.dailyBudget - this.dailySpend) 
        : null,
      monthlyBudgetRemaining: this.config.monthlyBudget 
        ? Math.max(0, this.config.monthlyBudget - this.monthlySpend) 
        : null,
      isOverBudget: this.isOverBudget(),
    };
  }

  /**
   * Check if currently over budget
   */
  isOverBudget(): boolean {
    if (this.config.dailyBudget && this.dailySpend >= this.config.dailyBudget) {
      return true;
    }
    if (this.config.monthlyBudget && this.monthlySpend >= this.config.monthlyBudget) {
      return true;
    }
    return false;
  }

  /**
   * Reset budgets if new day/month
   */
  private checkResets(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const oneMonthMs = 30 * oneDayMs; // Approximate

    // Reset daily spend if new day
    if (now - this.lastDayReset > oneDayMs) {
      this.dailySpend = 0;
      this.lastDayReset = now;
    }

    // Reset monthly spend if new month
    if (now - this.lastMonthReset > oneMonthMs) {
      this.monthlySpend = 0;
      this.requestCount = 0;
      this.lastMonthReset = now;
    }
  }

  /**
   * Trigger a budget alert
   */
  private triggerAlert(alert: BudgetAlert): void {
    this.config.onBudgetAlert?.(alert);
  }

  /**
   * Reset all spending (for testing)
   */
  reset(): void {
    this.dailySpend = 0;
    this.monthlySpend = 0;
    this.requestCount = 0;
    this.lastDayReset = Date.now();
    this.lastMonthReset = Date.now();
  }
}

// Singleton budget manager
const budgetManager = new BudgetManager();

/**
 * Configure budget limits
 */
export function configureBudget(config: BudgetConfig): void {
  budgetManager.configure(config);
}

/**
 * Check if a request is within budget
 */
export function checkBudget(estimatedCost: number): { allowed: boolean; reason?: string } {
  return budgetManager.canMakeRequest(estimatedCost);
}

/**
 * Record cost after a request completes
 */
export function recordRequestCost(cost: number): void {
  budgetManager.recordCost(cost);
}

/**
 * Get current budget status
 */
export function getBudgetStatus(): BudgetStatus {
  return budgetManager.getStatus();
}

/**
 * Reset budget tracking (for testing)
 */
export function resetBudget(): void {
  budgetManager.reset();
}

/**
 * Cost-aware model selection - chooses cheaper model if within quality threshold
 */
export function selectCostOptimalModel(
  candidates: ModelSelection[],
  qualityThreshold: number = 0.9
): ModelSelection | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Sort by cost (ascending)
  const withCosts = candidates.filter(c => c.estimatedCost);
  if (withCosts.length === 0) return candidates[0];

  withCosts.sort((a, b) => 
    (a.estimatedCost?.totalCost || 0) - (b.estimatedCost?.totalCost || 0)
  );

  // Get the most expensive (presumably highest quality) for comparison
  const mostExpensive = withCosts[withCosts.length - 1];
  const maxCost = mostExpensive.estimatedCost?.totalCost || 1;

  // Find cheapest model that's within quality threshold
  for (const candidate of withCosts) {
    const cost = candidate.estimatedCost?.totalCost || 0;
    const costRatio = cost / maxCost;
    
    // If cost is at least qualityThreshold of max, consider it good enough
    // Lower cost ratio = cheaper = better (if quality is acceptable)
    if (costRatio <= (1 - qualityThreshold) || candidate === mostExpensive) {
      // Check budget
      const budgetCheck = budgetManager.canMakeRequest(cost);
      if (budgetCheck.allowed) {
        return candidate;
      }
    }
  }

  // Fallback to cheapest that's within budget
  for (const candidate of withCosts) {
    const cost = candidate.estimatedCost?.totalCost || 0;
    if (budgetManager.canMakeRequest(cost).allowed) {
      return candidate;
    }
  }

  return null;
}

// ============================================================================
// OBSERVABILITY AND FEEDBACK COLLECTION
// ============================================================================

export interface RoutingFeedback {
  id: string;
  timestamp: number;
  selection: ModelSelection;
  /** User satisfaction: 1-5 or -1 for implicit negative (retry/cancel) */
  rating?: number;
  /** Whether user overrode the routing decision */
  wasOverridden: boolean;
  /** If overridden, what model was used instead */
  overriddenTo?: { provider: string; model: string };
  /** Response quality metrics */
  responseMetrics?: {
    latencyMs: number;
    tokenCount: number;
    wasCompleted: boolean;
    wasRetried: boolean;
    errorOccurred: boolean;
  };
}

export interface RoutingObservabilityEvent {
  type: 'routing_decision' | 'cache_hit' | 'cache_miss' | 'feedback' | 'budget_alert' | 'health_change';
  timestamp: number;
  data: Record<string, unknown>;
}

type ObservabilityListener = (event: RoutingObservabilityEvent) => void;

class RoutingObservability {
  private feedbackHistory: RoutingFeedback[] = [];
  private maxFeedbackHistory: number = 500;
  private listeners: ObservabilityListener[] = [];
  private eventLog: RoutingObservabilityEvent[] = [];
  private maxEventLog: number = 1000;

  subscribe(listener: ObservabilityListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private emit(event: RoutingObservabilityEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLog) {
      this.eventLog.shift();
    }
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[RoutingObservability] Listener error:', error);
      }
    });
  }

  recordDecision(selection: ModelSelection, fromCache: boolean): void {
    this.emit({
      type: fromCache ? 'cache_hit' : 'routing_decision',
      timestamp: Date.now(),
      data: {
        provider: selection.provider,
        model: selection.model,
        tier: selection.tier,
        category: selection.classification?.category,
        complexity: selection.classification?.complexity,
        routingMode: selection.routingMode,
        latencyMs: selection.routingLatency,
        fromCache,
      },
    });
  }

  recordFeedback(feedback: RoutingFeedback): void {
    this.feedbackHistory.push(feedback);
    if (this.feedbackHistory.length > this.maxFeedbackHistory) {
      this.feedbackHistory.shift();
    }
    this.emit({
      type: 'feedback',
      timestamp: Date.now(),
      data: {
        selectionId: feedback.id,
        rating: feedback.rating,
        wasOverridden: feedback.wasOverridden,
        overriddenTo: feedback.overriddenTo,
      },
    });
  }

  recordImplicitNegative(selection: ModelSelection, reason: 'retry' | 'cancel' | 'error'): void {
    this.recordFeedback({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      selection,
      rating: -1,
      wasOverridden: false,
      responseMetrics: {
        latencyMs: 0,
        tokenCount: 0,
        wasCompleted: false,
        wasRetried: reason === 'retry',
        errorOccurred: reason === 'error',
      },
    });
  }

  recordOverride(original: ModelSelection, newProvider: string, newModel: string): void {
    this.recordFeedback({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      selection: original,
      wasOverridden: true,
      overriddenTo: { provider: newProvider, model: newModel },
    });
  }

  getFeedbackStats(): {
    totalFeedback: number;
    avgRating: number;
    overrideRate: number;
    retryRate: number;
  } {
    if (this.feedbackHistory.length === 0) {
      return { totalFeedback: 0, avgRating: 0, overrideRate: 0, retryRate: 0 };
    }
    let totalRating = 0, ratingCount = 0, overrideCount = 0, retryCount = 0;
    for (const f of this.feedbackHistory) {
      if (f.rating && f.rating > 0) { totalRating += f.rating; ratingCount++; }
      if (f.wasOverridden) overrideCount++;
      if (f.responseMetrics?.wasRetried) retryCount++;
    }
    return {
      totalFeedback: this.feedbackHistory.length,
      avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      overrideRate: overrideCount / this.feedbackHistory.length,
      retryRate: retryCount / this.feedbackHistory.length,
    };
  }

  getRecentEvents(count: number = 50): RoutingObservabilityEvent[] {
    return this.eventLog.slice(-count);
  }

  reset(): void {
    this.feedbackHistory = [];
    this.eventLog = [];
  }
}

const routingObservability = new RoutingObservability();

export function subscribeToRoutingEvents(listener: ObservabilityListener): () => void {
  return routingObservability.subscribe(listener);
}

export function recordRoutingFeedback(feedback: RoutingFeedback): void {
  routingObservability.recordFeedback(feedback);
}

export function recordImplicitNegativeFeedback(selection: ModelSelection, reason: 'retry' | 'cancel' | 'error'): void {
  routingObservability.recordImplicitNegative(selection, reason);
}

export function recordRoutingOverride(original: ModelSelection, newProvider: string, newModel: string): void {
  routingObservability.recordOverride(original, newProvider, newModel);
}

export function getRoutingFeedbackStats(): ReturnType<typeof routingObservability.getFeedbackStats> {
  return routingObservability.getFeedbackStats();
}

export function getRecentRoutingEvents(count?: number): RoutingObservabilityEvent[] {
  return routingObservability.getRecentEvents(count);
}

export function resetRoutingObservability(): void {
  routingObservability.reset();
}
