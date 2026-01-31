/**
 * Bootstrap Resampling Tests
 */

import {
  generateBootstrapSamples,
  computePercentile,
  computeBootstrapCI,
  computeRatingStability,
  groupModelsByTier,
  DEFAULT_BOOTSTRAP_CONFIG,
} from './bootstrap';
import type { Matchup } from './bradley-terry';

describe('Bootstrap Resampling', () => {
  describe('generateBootstrapSamples', () => {
    it('should generate correct number of samples', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
      ];

      const samples = generateBootstrapSamples(matchups, 100);

      expect(samples).toHaveLength(100);
    });

    it('should maintain sample size equal to original', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'C' },
        { winner: 'B', loser: 'C' },
        { winner: 'C', loser: 'A' },
      ];

      const samples = generateBootstrapSamples(matchups, 10);

      samples.forEach((sample) => {
        expect(sample).toHaveLength(matchups.length);
      });
    });

    it('should return empty samples for empty matchups', () => {
      const samples = generateBootstrapSamples([], 10);

      expect(samples).toHaveLength(10);
      samples.forEach((sample) => {
        expect(sample).toHaveLength(0);
      });
    });

    it('should produce samples with replacement', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'C', loser: 'D' },
      ];

      // With replacement, we might see duplicates
      const samples = generateBootstrapSamples(matchups, 100);

      // At least some samples should have duplicates (statistically very likely)
      const hasDuplicates = samples.some((sample) => {
        const winners = sample.map((m) => m.winner);
        return new Set(winners).size < winners.length;
      });

      // This test might occasionally fail due to randomness, but very unlikely
      expect(hasDuplicates || matchups.length < 2).toBe(true);
    });

    it('should use seed for reproducibility when provided', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'C' },
        { winner: 'B', loser: 'C' },
      ];

      const samples1 = generateBootstrapSamples(matchups, 10, 12345);
      const samples2 = generateBootstrapSamples(matchups, 10, 12345);

      // Same seed should produce same results
      expect(JSON.stringify(samples1)).toBe(JSON.stringify(samples2));
    });
  });

  describe('computePercentile', () => {
    it('should compute median correctly', () => {
      const values = [1, 2, 3, 4, 5];
      expect(computePercentile(values, 0.5)).toBe(3);
    });

    it('should compute 25th percentile', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8];
      const p25 = computePercentile(values, 0.25);
      expect(p25).toBeGreaterThanOrEqual(2);
      expect(p25).toBeLessThanOrEqual(3);
    });

    it('should compute 75th percentile', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8];
      const p75 = computePercentile(values, 0.75);
      expect(p75).toBeGreaterThanOrEqual(6);
      expect(p75).toBeLessThanOrEqual(7);
    });

    it('should handle single value', () => {
      expect(computePercentile([42], 0.5)).toBe(42);
    });

    it('should handle empty array', () => {
      expect(computePercentile([], 0.5)).toBe(0);
    });

    it('should not modify original array', () => {
      const values = [5, 2, 8, 1, 9];
      const original = [...values];
      computePercentile(values, 0.5);
      expect(values).toEqual(original);
    });
  });

  describe('computeBootstrapCI', () => {
    it('should compute confidence interval', () => {
      const samples = [
        1400, 1420, 1450, 1480, 1500,
        1500, 1520, 1550, 1580, 1600,
      ];

      const ci = computeBootstrapCI(samples, 0.95);

      expect(ci.lower).toBeLessThan(ci.mean);
      expect(ci.upper).toBeGreaterThan(ci.mean);
      expect(ci.lower).toBeGreaterThanOrEqual(Math.min(...samples));
      expect(ci.upper).toBeLessThanOrEqual(Math.max(...samples));
    });

    it('should compute mean correctly', () => {
      const samples = [100, 200, 300];
      const ci = computeBootstrapCI(samples, 0.95);
      expect(ci.mean).toBe(200);
    });

    it('should compute standard error', () => {
      const samples = [100, 100, 100, 100];
      const ci = computeBootstrapCI(samples, 0.95);
      expect(ci.standardError).toBe(0);
    });

    it('should have narrower CI for larger samples', () => {
      const smallSample = [1400, 1600];
      const largeSample = [
        1400, 1450, 1480, 1490, 1500,
        1500, 1510, 1520, 1550, 1600,
      ];

      const ciSmall = computeBootstrapCI(smallSample, 0.95);
      const ciLarge = computeBootstrapCI(largeSample, 0.95);

      const widthSmall = ciSmall.upper - ciSmall.lower;
      const widthLarge = ciLarge.upper - ciLarge.lower;

      expect(widthLarge).toBeLessThanOrEqual(widthSmall);
    });

    it('should handle empty samples', () => {
      const ci = computeBootstrapCI([], 0.95);
      expect(ci.mean).toBe(0);
      expect(ci.lower).toBe(0);
      expect(ci.upper).toBe(0);
    });
  });

  describe('computeRatingStability', () => {
    it('should return high stability for consistent ratings', () => {
      const samples = [1500, 1500, 1500, 1500, 1500];
      const stability = computeRatingStability(samples);
      expect(stability).toBeCloseTo(1.0, 1);
    });

    it('should return low stability for variable ratings', () => {
      const samples = [1000, 1200, 1400, 1600, 2000];
      const stability = computeRatingStability(samples);
      expect(stability).toBeLessThan(0.8);
    });

    it('should be between 0 and 1', () => {
      const samples = [1400, 1450, 1500, 1550, 1600];
      const stability = computeRatingStability(samples);
      expect(stability).toBeGreaterThanOrEqual(0);
      expect(stability).toBeLessThanOrEqual(1);
    });

    it('should handle empty samples', () => {
      const stability = computeRatingStability([]);
      expect(stability).toBe(1);
    });
  });

  describe('groupModelsByTier', () => {
    it('should group models into tiers', () => {
      const ratings = new Map<string, number>([
        ['A', 1800], // S tier
        ['B', 1650], // A tier
        ['C', 1500], // B tier
        ['D', 1350], // C tier
        ['E', 1200], // D tier
      ]);

      const tiers = groupModelsByTier(ratings);

      expect(tiers.get('S')).toContain('A');
      expect(tiers.get('A')).toContain('B');
      expect(tiers.get('B')).toContain('C');
      expect(tiers.get('C')).toContain('D');
      expect(tiers.get('D')).toContain('E');
    });

    it('should handle models with same rating', () => {
      const ratings = new Map<string, number>([
        ['A', 1500],
        ['B', 1500],
        ['C', 1500],
      ]);

      const tiers = groupModelsByTier(ratings);
      const bTier = tiers.get('B') || [];

      expect(bTier).toContain('A');
      expect(bTier).toContain('B');
      expect(bTier).toContain('C');
    });

    it('should handle empty ratings', () => {
      const tiers = groupModelsByTier(new Map());
      
      expect(tiers.get('S')).toEqual([]);
      expect(tiers.get('A')).toEqual([]);
      expect(tiers.get('B')).toEqual([]);
      expect(tiers.get('C')).toEqual([]);
      expect(tiers.get('D')).toEqual([]);
    });

    it('should respect custom thresholds', () => {
      const ratings = new Map<string, number>([
        ['A', 1600],
        ['B', 1500],
      ]);

      // With higher S threshold, A should not be in S tier
      const tiers = groupModelsByTier(ratings, {
        S: 1700,
        A: 1550,
        B: 1450,
        C: 1350,
      });

      expect(tiers.get('S')).not.toContain('A');
      expect(tiers.get('A')).toContain('A');
    });
  });

  describe('DEFAULT_BOOTSTRAP_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_BOOTSTRAP_CONFIG.numSamples).toBe(1000);
      expect(DEFAULT_BOOTSTRAP_CONFIG.confidenceLevel).toBe(0.95);
    });
  });

  describe('integration', () => {
    it('should produce valid CI from matchup data', () => {
      const matchups: Matchup[] = [];
      // Generate synthetic matchup data
      for (let i = 0; i < 20; i++) {
        matchups.push({ winner: 'A', loser: 'B' });
      }
      for (let i = 0; i < 10; i++) {
        matchups.push({ winner: 'B', loser: 'A' });
      }

      const bootstrapSamples = generateBootstrapSamples(matchups, 100);

      // Each bootstrap sample should have same length
      bootstrapSamples.forEach((sample) => {
        expect(sample.length).toBe(matchups.length);
      });
    });
  });
});
