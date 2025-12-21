/**
 * API Key Rotation - Multi-key management and rotation algorithms
 * Supports round-robin, random, and least-used strategies
 */

import type { ApiKeyRotationStrategy, ApiKeyUsageStats } from '@/types/provider';

export interface ApiKeyWithStats {
  key: string;
  stats: ApiKeyUsageStats;
}

export interface RotationResult {
  apiKey: string;
  index: number;
}

/**
 * Get default usage stats for a new API key
 */
export function getDefaultUsageStats(): ApiKeyUsageStats {
  return {
    usageCount: 0,
    lastUsed: 0,
    errorCount: 0,
  };
}

/**
 * Round-robin rotation strategy
 * Cycles through keys in order
 */
function roundRobinSelect(
  keys: string[],
  currentIndex: number
): RotationResult {
  const nextIndex = (currentIndex + 1) % keys.length;
  return {
    apiKey: keys[nextIndex],
    index: nextIndex,
  };
}

/**
 * Random rotation strategy
 * Randomly selects a key, avoiding recently errored ones if possible
 */
function randomSelect(
  keys: string[],
  usageStats: Record<string, ApiKeyUsageStats>
): RotationResult {
  const now = Date.now();
  const errorCooldown = 60000; // 1 minute cooldown for errored keys

  // Filter out keys that recently had errors
  const availableKeys = keys.filter((key) => {
    const stats = usageStats[key];
    if (!stats || stats.errorCount === 0) return true;
    // Allow if last error was more than cooldown ago
    return now - stats.lastUsed > errorCooldown;
  });

  // If all keys have recent errors, use all keys
  const keysToUse = availableKeys.length > 0 ? availableKeys : keys;

  const randomIndex = Math.floor(Math.random() * keysToUse.length);
  const selectedKey = keysToUse[randomIndex];
  const originalIndex = keys.indexOf(selectedKey);

  return {
    apiKey: selectedKey,
    index: originalIndex,
  };
}

/**
 * Least-used rotation strategy
 * Selects the key with the lowest usage score (considers errors with weight)
 */
function leastUsedSelect(
  keys: string[],
  usageStats: Record<string, ApiKeyUsageStats>
): RotationResult {
  const errorWeight = 3; // Each error counts as 3 uses
  const now = Date.now();
  const recentErrorPenalty = 10; // Additional penalty for recent errors
  const recentThreshold = 300000; // 5 minutes

  let minScore = Infinity;
  let selectedIndex = 0;

  keys.forEach((key, index) => {
    const stats = usageStats[key] || getDefaultUsageStats();
    
    // Calculate score: usage count + weighted errors + recent error penalty
    let score = stats.usageCount + stats.errorCount * errorWeight;
    
    // Add penalty for recent errors
    if (stats.errorCount > 0 && stats.lastUsed && now - stats.lastUsed < recentThreshold) {
      score += recentErrorPenalty;
    }

    if (score < minScore) {
      minScore = score;
      selectedIndex = index;
    }
  });

  return {
    apiKey: keys[selectedIndex],
    index: selectedIndex,
  };
}

/**
 * Get next API key based on rotation strategy
 */
export function getNextApiKey(
  keys: string[],
  strategy: ApiKeyRotationStrategy,
  currentIndex: number,
  usageStats: Record<string, ApiKeyUsageStats>
): RotationResult {
  if (keys.length === 0) {
    throw new Error('No API keys available');
  }

  if (keys.length === 1) {
    return { apiKey: keys[0], index: 0 };
  }

  switch (strategy) {
    case 'round-robin':
      return roundRobinSelect(keys, currentIndex);
    case 'random':
      return randomSelect(keys, usageStats);
    case 'least-used':
      return leastUsedSelect(keys, usageStats);
    default:
      return roundRobinSelect(keys, currentIndex);
  }
}

/**
 * Record successful API key usage
 */
export function recordApiKeySuccess(
  stats: ApiKeyUsageStats | undefined
): ApiKeyUsageStats {
  const currentStats = stats || getDefaultUsageStats();
  return {
    ...currentStats,
    usageCount: currentStats.usageCount + 1,
    lastUsed: Date.now(),
  };
}

/**
 * Record API key error
 */
export function recordApiKeyError(
  stats: ApiKeyUsageStats | undefined,
  errorMessage?: string
): ApiKeyUsageStats {
  const currentStats = stats || getDefaultUsageStats();
  return {
    ...currentStats,
    usageCount: currentStats.usageCount + 1,
    errorCount: currentStats.errorCount + 1,
    lastUsed: Date.now(),
    lastError: errorMessage,
  };
}

/**
 * Reset usage stats for an API key
 */
export function resetApiKeyStats(): ApiKeyUsageStats {
  return getDefaultUsageStats();
}

/**
 * Get aggregated stats for all API keys
 */
export function getAggregatedStats(
  usageStats: Record<string, ApiKeyUsageStats>
): {
  totalUsage: number;
  totalErrors: number;
  keyCount: number;
  healthyKeyCount: number;
} {
  const keys = Object.keys(usageStats);
  const now = Date.now();
  const healthThreshold = 300000; // 5 minutes

  let totalUsage = 0;
  let totalErrors = 0;
  let healthyKeyCount = 0;

  keys.forEach((key) => {
    const stats = usageStats[key];
    totalUsage += stats.usageCount;
    totalErrors += stats.errorCount;

    // A key is healthy if it has no recent errors
    const hasRecentError =
      stats.errorCount > 0 && stats.lastUsed && now - stats.lastUsed < healthThreshold;
    if (!hasRecentError) {
      healthyKeyCount++;
    }
  });

  return {
    totalUsage,
    totalErrors,
    keyCount: keys.length,
    healthyKeyCount,
  };
}

/**
 * Mask API key for display (show first 8 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '*'.repeat(apiKey.length);
  }
  return `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;
}

/**
 * Validate API key format (basic validation)
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Basic validation: at least 20 characters, no whitespace
  return apiKey.length >= 20 && !/\s/.test(apiKey);
}
