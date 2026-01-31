/**
 * Bootstrap Resampling for Confidence Intervals
 * Statistical methods for rating uncertainty estimation
 */

import type { Matchup } from './bradley-terry';

/**
 * Bootstrap configuration
 */
export interface BootstrapConfig {
  /** Number of bootstrap samples (default: 1000) */
  numSamples: number;
  /** Confidence level (default: 0.95 for 95% CI) */
  confidenceLevel: number;
  /** Random seed for reproducibility */
  seed?: number;
}

/**
 * Bootstrap result with confidence intervals
 */
export interface BootstrapResult {
  /** Point estimate */
  estimate: number;
  /** Standard error */
  standardError: number;
  /** Lower bound of CI */
  ciLower: number;
  /** Upper bound of CI */
  ciUpper: number;
  /** All bootstrap samples */
  samples: number[];
}

/**
 * Default bootstrap configuration
 */
export const DEFAULT_BOOTSTRAP_CONFIG: BootstrapConfig = {
  numSamples: 1000,
  confidenceLevel: 0.95,
};

/**
 * Simple random number generator with seed
 * Uses Mulberry32 algorithm
 */
function createRng(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate bootstrap sample indices
 * Samples with replacement from [0, n-1]
 */
export function generateBootstrapIndices(
  n: number,
  sampleSize?: number,
  rng?: () => number
): number[] {
  const random = rng || Math.random;
  const size = sampleSize || n;
  const indices: number[] = [];

  for (let i = 0; i < size; i++) {
    indices.push(Math.floor(random() * n));
  }

  return indices;
}

/**
 * Generate multiple bootstrap sample index sets
 */
export function generateBootstrapSamples(
  n: number,
  config?: Partial<BootstrapConfig>
): number[][] {
  const { numSamples = DEFAULT_BOOTSTRAP_CONFIG.numSamples, seed } = config || {};

  const rng = seed !== undefined ? createRng(seed) : Math.random;
  const samples: number[][] = [];

  for (let i = 0; i < numSamples; i++) {
    samples.push(generateBootstrapIndices(n, n, rng));
  }

  return samples;
}

/**
 * Compute percentile from sorted array
 */
export function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  if (p <= 0) return sortedArray[0];
  if (p >= 1) return sortedArray[sortedArray.length - 1];

  const index = p * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sortedArray[lower];
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Compute bootstrap confidence interval
 */
export function computeBootstrapCI(
  samples: number[],
  confidenceLevel: number = 0.95
): { lower: number; upper: number; mean: number; standardError: number } {
  if (samples.length === 0) {
    return { lower: 0, upper: 0, mean: 0, standardError: 0 };
  }

  const sortedSamples = [...samples].sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;

  const lower = percentile(sortedSamples, alpha / 2);
  const upper = percentile(sortedSamples, 1 - alpha / 2);

  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (samples.length - 1);
  const standardError = Math.sqrt(variance);

  return { lower, upper, mean, standardError };
}

/**
 * Bootstrap a statistic function
 */
export function bootstrap<T>(
  data: T[],
  statisticFn: (sample: T[]) => number,
  config?: Partial<BootstrapConfig>
): BootstrapResult {
  const {
    numSamples = DEFAULT_BOOTSTRAP_CONFIG.numSamples,
    confidenceLevel = DEFAULT_BOOTSTRAP_CONFIG.confidenceLevel,
    seed,
  } = config || {};

  const rng = seed !== undefined ? createRng(seed) : Math.random;
  const samples: number[] = [];

  // Generate bootstrap samples and compute statistic
  for (let i = 0; i < numSamples; i++) {
    const indices = generateBootstrapIndices(data.length, data.length, rng);
    const sample = indices.map((idx) => data[idx]);
    samples.push(statisticFn(sample));
  }

  const { lower, upper, mean: _mean, standardError } = computeBootstrapCI(samples, confidenceLevel);

  return {
    estimate: statisticFn(data),
    standardError,
    ciLower: lower,
    ciUpper: upper,
    samples,
  };
}

/**
 * Generate bootstrap samples for matchup data
 * Returns indices that can be used to resample matchups
 */
export function generateMatchupBootstrapSamples(
  matchups: Matchup[],
  config?: Partial<BootstrapConfig>
): number[][] {
  return generateBootstrapSamples(matchups.length, config);
}

/**
 * Stratified bootstrap sampling
 * Maintains distribution of model pairs in each sample
 */
export function generateStratifiedBootstrapSamples(
  matchups: Matchup[],
  config?: Partial<BootstrapConfig>
): number[][] {
  const { numSamples = DEFAULT_BOOTSTRAP_CONFIG.numSamples, seed } = config || {};

  // Group matchups by model pair
  const pairGroups = new Map<string, number[]>();
  for (let i = 0; i < matchups.length; i++) {
    const { winner, loser } = matchups[i];
    const key = [winner, loser].sort().join(':');
    if (!pairGroups.has(key)) pairGroups.set(key, []);
    pairGroups.get(key)!.push(i);
  }

  const rng = seed !== undefined ? createRng(seed) : Math.random;
  const samples: number[][] = [];

  for (let s = 0; s < numSamples; s++) {
    const sampleIndices: number[] = [];

    // Sample with replacement from each group
    for (const indices of pairGroups.values()) {
      for (let i = 0; i < indices.length; i++) {
        const randomIdx = Math.floor(rng() * indices.length);
        sampleIndices.push(indices[randomIdx]);
      }
    }

    samples.push(sampleIndices);
  }

  return samples;
}

/**
 * Compute rating stability score
 * Higher score means more stable/reliable rating
 */
export function computeRatingStability(
  ciLower: number,
  ciUpper: number,
  totalBattles: number
): number {
  const ciWidth = ciUpper - ciLower;
  // Narrower CI and more battles = higher stability
  const ciScore = Math.max(0, 1 - ciWidth / 400); // Normalize by typical CI width
  const battleScore = Math.min(1, totalBattles / 50); // Saturates at 50 battles
  return (ciScore + battleScore) / 2;
}

/**
 * Determine if two models are significantly different
 * Uses overlapping confidence intervals test
 */
export function areSignificantlyDifferent(
  ratingA: { rating: number; ci95Lower: number; ci95Upper: number },
  ratingB: { rating: number; ci95Lower: number; ci95Upper: number }
): boolean {
  // No overlap in 95% CIs means significantly different
  return ratingA.ci95Lower > ratingB.ci95Upper || ratingB.ci95Lower > ratingA.ci95Upper;
}

/**
 * Group models into statistically equivalent tiers
 */
export function groupIntoTiers(
  ratings: Array<{ modelId: string; rating: number; ci95Lower: number; ci95Upper: number }>
): Array<{ tier: number; models: string[] }> {
  if (ratings.length === 0) return [];

  // Sort by rating descending
  const sorted = [...ratings].sort((a, b) => b.rating - a.rating);

  const tiers: Array<{ tier: number; models: string[] }> = [];
  let currentTier = 1;
  let currentGroup: string[] = [sorted[0].modelId];
  let tierReference = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];

    // Check if significantly different from tier reference
    if (areSignificantlyDifferent(tierReference, current)) {
      // Start new tier
      tiers.push({ tier: currentTier, models: currentGroup });
      currentTier++;
      currentGroup = [current.modelId];
      tierReference = current;
    } else {
      // Add to current tier
      currentGroup.push(current.modelId);
    }
  }

  // Add last tier
  if (currentGroup.length > 0) {
    tiers.push({ tier: currentTier, models: currentGroup });
  }

  return tiers;
}
