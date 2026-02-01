/**
 * Bootstrap Resampling Tests
 */

import {
  generateMatchupBootstrapSamples,
  percentile,
  computeBootstrapCI,
  computeRatingStability,
  groupIntoTiers,
  DEFAULT_BOOTSTRAP_CONFIG,
} from './bootstrap';
import type { Matchup } from './bradley-terry';

describe('Bootstrap Resampling', () => {
  describe('generateMatchupBootstrapSamples', () => {
    it('should generate correct number of samples', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
      ];

      const samples = generateMatchupBootstrapSamples(matchups, { numSamples: 100 });

      expect(samples).toHaveLength(100);
    });

    it('should maintain sample size equal to original', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'C' },
        { winner: 'B', loser: 'C' },
        { winner: 'C', loser: 'A' },
      ];

      const samples = generateMatchupBootstrapSamples(matchups, { numSamples: 10 });

      samples.forEach((sample: number[]) => {
        expect(sample).toHaveLength(matchups.length);
      });
    });

    it('should return empty samples for empty matchups', () => {
      const samples = generateMatchupBootstrapSamples([], { numSamples: 10 });

      expect(samples).toHaveLength(10);
      samples.forEach((sample: number[]) => {
        expect(sample).toHaveLength(0);
      });
    });

    it('should produce index samples for resampling', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'C', loser: 'D' },
        { winner: 'E', loser: 'F' },
      ];

      const samples = generateMatchupBootstrapSamples(matchups, { numSamples: 10 });

      // Each sample should contain valid indices
      samples.forEach((sample: number[]) => {
        sample.forEach((idx: number) => {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(matchups.length);
        });
      });
    });

    it('should use seed for reproducibility when provided', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'C' },
        { winner: 'B', loser: 'C' },
      ];

      const samples1 = generateMatchupBootstrapSamples(matchups, { numSamples: 10, seed: 12345 });
      const samples2 = generateMatchupBootstrapSamples(matchups, { numSamples: 10, seed: 12345 });

      // Same seed should produce same results
      expect(JSON.stringify(samples1)).toBe(JSON.stringify(samples2));
    });
  });

  describe('percentile', () => {
    it('should compute median correctly', () => {
      const values = [1, 2, 3, 4, 5];
      expect(percentile(values, 0.5)).toBe(3);
    });

    it('should compute 25th percentile', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8];
      const p25 = percentile(values, 0.25);
      expect(p25).toBeGreaterThanOrEqual(2);
      expect(p25).toBeLessThanOrEqual(3);
    });

    it('should compute 75th percentile', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8];
      const p75 = percentile(values, 0.75);
      expect(p75).toBeGreaterThanOrEqual(6);
      expect(p75).toBeLessThanOrEqual(7);
    });

    it('should handle single value', () => {
      expect(percentile([42], 0.5)).toBe(42);
    });

    it('should handle empty array', () => {
      expect(percentile([], 0.5)).toBe(0);
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
    it('should return high stability for narrow CI and many battles', () => {
      // Narrow CI (1480-1520 = 40 width) and many battles (100)
      const stability = computeRatingStability(1480, 1520, 100);
      expect(stability).toBeGreaterThan(0.7);
    });

    it('should return low stability for wide CI and few battles', () => {
      // Wide CI (1200-1800 = 600 width) and few battles (5)
      const stability = computeRatingStability(1200, 1800, 5);
      expect(stability).toBeLessThan(0.5);
    });

    it('should be between 0 and 1', () => {
      const stability = computeRatingStability(1400, 1600, 30);
      expect(stability).toBeGreaterThanOrEqual(0);
      expect(stability).toBeLessThanOrEqual(1);
    });

    it('should increase with more battles', () => {
      const stabilityFew = computeRatingStability(1400, 1600, 10);
      const stabilityMany = computeRatingStability(1400, 1600, 100);
      expect(stabilityMany).toBeGreaterThan(stabilityFew);
    });
  });

  describe('groupIntoTiers', () => {
    it('should group models into tiers based on CI overlap', () => {
      const ratings = [
        { modelId: 'A', rating: 1800, ci95Lower: 1750, ci95Upper: 1850 },
        { modelId: 'B', rating: 1600, ci95Lower: 1550, ci95Upper: 1650 },
        { modelId: 'C', rating: 1400, ci95Lower: 1350, ci95Upper: 1450 },
      ];

      const tiers = groupIntoTiers(ratings);

      // Each model should be in separate tier due to non-overlapping CIs
      expect(tiers).toHaveLength(3);
      expect(tiers[0].models).toContain('A');
      expect(tiers[1].models).toContain('B');
      expect(tiers[2].models).toContain('C');
    });

    it('should group models with overlapping CIs in same tier', () => {
      const ratings = [
        { modelId: 'A', rating: 1510, ci95Lower: 1450, ci95Upper: 1570 },
        { modelId: 'B', rating: 1500, ci95Lower: 1440, ci95Upper: 1560 },
        { modelId: 'C', rating: 1490, ci95Lower: 1430, ci95Upper: 1550 },
      ];

      const tiers = groupIntoTiers(ratings);

      // All models should be in same tier due to overlapping CIs
      expect(tiers).toHaveLength(1);
      expect(tiers[0].models).toContain('A');
      expect(tiers[0].models).toContain('B');
      expect(tiers[0].models).toContain('C');
    });

    it('should handle empty ratings', () => {
      const tiers = groupIntoTiers([]);
      expect(tiers).toHaveLength(0);
    });

    it('should handle single model', () => {
      const ratings = [
        { modelId: 'A', rating: 1500, ci95Lower: 1450, ci95Upper: 1550 },
      ];

      const tiers = groupIntoTiers(ratings);
      expect(tiers).toHaveLength(1);
      expect(tiers[0].models).toContain('A');
    });
  });

  describe('DEFAULT_BOOTSTRAP_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_BOOTSTRAP_CONFIG.numSamples).toBe(1000);
      expect(DEFAULT_BOOTSTRAP_CONFIG.confidenceLevel).toBe(0.95);
    });
  });

  describe('integration', () => {
    it('should produce valid samples from matchup data', () => {
      const matchups: Matchup[] = [];
      // Generate synthetic matchup data
      for (let i = 0; i < 20; i++) {
        matchups.push({ winner: 'A', loser: 'B' });
      }
      for (let i = 0; i < 10; i++) {
        matchups.push({ winner: 'B', loser: 'A' });
      }

      const bootstrapSamples = generateMatchupBootstrapSamples(matchups, { numSamples: 100 });

      // Each bootstrap sample should have same length
      bootstrapSamples.forEach((sample: number[]) => {
        expect(sample.length).toBe(matchups.length);
      });
    });
  });
});
