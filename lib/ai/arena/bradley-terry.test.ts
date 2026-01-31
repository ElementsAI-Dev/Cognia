/**
 * Bradley-Terry Model Tests
 */

import {
  aggregateMatchups,
  computeBradleyTerryRatings,
  btScoreToRating,
  btWinProbability,
  computeHeadToHead,
  computeModelStats,
  computeFullRatings,
  getModelId,
  parseModelId,
  BT_BASE_RATING,
  type Matchup,
} from './bradley-terry';

describe('Bradley-Terry Model', () => {
  describe('getModelId and parseModelId', () => {
    it('should create and parse model IDs correctly', () => {
      const id = getModelId('openai', 'gpt-4');
      expect(id).toBe('openai:gpt-4');

      const parsed = parseModelId(id);
      expect(parsed.provider).toBe('openai');
      expect(parsed.model).toBe('gpt-4');
    });

    it('should handle model names with colons', () => {
      const id = getModelId('ollama', 'llama3:8b');
      const parsed = parseModelId(id);
      expect(parsed.provider).toBe('ollama');
      expect(parsed.model).toBe('llama3:8b');
    });
  });

  describe('btScoreToRating', () => {
    it('should convert 0 BT score to base rating', () => {
      const rating = btScoreToRating(0);
      expect(rating).toBeCloseTo(BT_BASE_RATING, 0);
    });

    it('should increase rating for positive BT scores', () => {
      const rating = btScoreToRating(1);
      expect(rating).toBeGreaterThan(BT_BASE_RATING);
    });

    it('should decrease rating for negative BT scores', () => {
      const rating = btScoreToRating(-1);
      expect(rating).toBeLessThan(BT_BASE_RATING);
    });
  });

  describe('btWinProbability', () => {
    it('should return 0.5 for equal scores', () => {
      const prob = btWinProbability(0, 0);
      expect(prob).toBeCloseTo(0.5, 5);
    });

    it('should return higher probability for higher score', () => {
      const prob = btWinProbability(1, 0);
      expect(prob).toBeGreaterThan(0.5);
    });

    it('should return lower probability for lower score', () => {
      const prob = btWinProbability(0, 1);
      expect(prob).toBeLessThan(0.5);
    });

    it('should be symmetric', () => {
      const probA = btWinProbability(1, 0);
      const probB = btWinProbability(0, 1);
      expect(probA + probB).toBeCloseTo(1.0, 5);
    });

    it('should handle extreme differences', () => {
      const prob = btWinProbability(100, 0);
      expect(prob).toBeCloseTo(1.0, 2);
    });
  });

  describe('aggregateMatchups', () => {
    it('should aggregate matchups correctly', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
        { winner: 'A', loser: 'C' },
      ];

      const result = aggregateMatchups(matchups);

      expect(result.get('A')?.get('B')?.wins).toBe(2);
      expect(result.get('B')?.get('A')?.wins).toBe(1);
      expect(result.get('A')?.get('C')?.wins).toBe(1);
    });

    it('should handle ties', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B', isTie: true },
      ];

      const result = aggregateMatchups(matchups);

      expect(result.get('A')?.get('B')?.ties).toBe(1);
      expect(result.get('B')?.get('A')?.ties).toBe(1);
    });

    it('should return empty map for empty matchups', () => {
      const result = aggregateMatchups([]);
      expect(result.size).toBe(0);
    });
  });

  describe('computeModelStats', () => {
    it('should compute correct statistics', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
        { winner: 'A', loser: 'C' },
      ];

      const stats = computeModelStats(matchups);

      expect(stats.get('A')?.wins).toBe(3);
      expect(stats.get('A')?.losses).toBe(1);
      expect(stats.get('B')?.wins).toBe(1);
      expect(stats.get('B')?.losses).toBe(2);
      expect(stats.get('C')?.wins).toBe(0);
      expect(stats.get('C')?.losses).toBe(1);
    });

    it('should count ties correctly', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B', isTie: true },
      ];

      const stats = computeModelStats(matchups);

      expect(stats.get('A')?.ties).toBe(1);
      expect(stats.get('B')?.ties).toBe(1);
    });
  });

  describe('computeBradleyTerryRatings', () => {
    it('should compute ratings for simple matchups', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
      ];

      const ratings = computeBradleyTerryRatings(matchups);

      expect(ratings.get('A')).toBeGreaterThan(ratings.get('B')!);
    });

    it('should return similar ratings for evenly matched models', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
      ];

      const ratings = computeBradleyTerryRatings(matchups);
      const diff = Math.abs(ratings.get('A')! - ratings.get('B')!);

      expect(diff).toBeLessThan(50);
    });

    it('should handle three models correctly', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'C' },
        { winner: 'B', loser: 'C' },
      ];

      const ratings = computeBradleyTerryRatings(matchups);

      expect(ratings.get('A')).toBeGreaterThan(ratings.get('B')!);
      expect(ratings.get('B')).toBeGreaterThan(ratings.get('C')!);
    });

    it('should return empty map for no matchups', () => {
      const ratings = computeBradleyTerryRatings([]);
      expect(ratings.size).toBe(0);
    });
  });

  describe('computeHeadToHead', () => {
    it('should calculate head-to-head statistics', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
        { winner: 'A', loser: 'B' },
      ];

      const h2h = computeHeadToHead(matchups);
      const record = h2h.find((r) => 
        (r.modelA === 'A' && r.modelB === 'B') || 
        (r.modelA === 'B' && r.modelB === 'A')
      );

      expect(record).toBeDefined();
      expect(record!.total).toBe(4);
    });

    it('should handle ties in head-to-head', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B', isTie: true },
        { winner: 'B', loser: 'A' },
      ];

      const h2h = computeHeadToHead(matchups);
      const record = h2h.find((r) => 
        (r.modelA === 'A' && r.modelB === 'B') || 
        (r.modelA === 'B' && r.modelB === 'A')
      );

      expect(record).toBeDefined();
      expect(record!.ties).toBe(1);
    });

    it('should return empty array for no matchups', () => {
      const h2h = computeHeadToHead([]);
      expect(h2h).toEqual([]);
    });
  });

  describe('computeFullRatings', () => {
    it('should compute full ratings with statistics', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
      ];

      const ratings = computeFullRatings(matchups);

      expect(ratings).toHaveLength(2);
      
      const ratingA = ratings.find((r) => r.modelId === 'A');
      const ratingB = ratings.find((r) => r.modelId === 'B');

      expect(ratingA).toBeDefined();
      expect(ratingB).toBeDefined();
      expect(ratingA!.wins).toBe(2);
      expect(ratingA!.losses).toBe(1);
      expect(ratingB!.wins).toBe(1);
      expect(ratingB!.losses).toBe(2);
    });

    it('should compute win rates', () => {
      const matchups: Matchup[] = [
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'B', loser: 'A' },
      ];

      const ratings = computeFullRatings(matchups);
      const ratingA = ratings.find((r) => r.modelId === 'A');

      expect(ratingA!.winRate).toBeCloseTo(0.75, 2);
    });
  });

  describe('integration', () => {
    it('should produce consistent results end-to-end', () => {
      const matchups: Matchup[] = [
        // A beats B 3 times
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        { winner: 'A', loser: 'B' },
        // B beats C 2 times
        { winner: 'B', loser: 'C' },
        { winner: 'B', loser: 'C' },
        // A beats C 2 times
        { winner: 'A', loser: 'C' },
        { winner: 'A', loser: 'C' },
      ];

      const ratings = computeBradleyTerryRatings(matchups);

      // A should have highest rating
      expect(ratings.get('A')).toBeGreaterThan(ratings.get('B')!);
      // B should be in middle
      expect(ratings.get('B')).toBeGreaterThan(ratings.get('C')!);

      // Win probability should reflect scores
      const probAB = btWinProbability(
        ratings.get('A')! - BT_BASE_RATING,
        ratings.get('B')! - BT_BASE_RATING
      );
      expect(probAB).toBeGreaterThan(0.5);
    });
  });
});
