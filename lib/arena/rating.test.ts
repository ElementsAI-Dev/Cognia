import {
  getModelId,
  parseModelId,
  expectedWinProbability,
  calculateNewRatings,
  buildQualityIndicators,
  preferencesToMatchups,
} from './rating';
import type { ArenaBattle, ArenaPreference } from '@/types/arena';
import { DEFAULT_ARENA_SETTINGS } from '@/types/arena';

describe('arena rating utilities', () => {
  describe('getModelId', () => {
    it('should combine provider and model with colon', () => {
      expect(getModelId('openai', 'gpt-4o')).toBe('openai:gpt-4o');
    });

    it('should handle models with colons in their name', () => {
      expect(getModelId('anthropic', 'claude-3:latest')).toBe('anthropic:claude-3:latest');
    });
  });

  describe('parseModelId', () => {
    it('should split provider and model', () => {
      const result = parseModelId('openai:gpt-4o');
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
    });

    it('should handle models with colons in their name', () => {
      const result = parseModelId('anthropic:claude-3:latest');
      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3:latest');
    });
  });

  describe('getModelId + parseModelId roundtrip', () => {
    it('should be reversible for simple models', () => {
      const id = getModelId('google', 'gemini-pro');
      const { provider, model } = parseModelId(id);
      expect(provider).toBe('google');
      expect(model).toBe('gemini-pro');
    });
  });

  describe('expectedWinProbability', () => {
    it('should return 0.5 for equal ratings', () => {
      expect(expectedWinProbability(1500, 1500)).toBe(0.5);
    });

    it('should return > 0.5 when A is higher rated', () => {
      expect(expectedWinProbability(1600, 1400)).toBeGreaterThan(0.5);
    });

    it('should return < 0.5 when A is lower rated', () => {
      expect(expectedWinProbability(1400, 1600)).toBeLessThan(0.5);
    });

    it('should return ~0.76 for 200 point difference', () => {
      const result = expectedWinProbability(1700, 1500);
      expect(result).toBeCloseTo(0.76, 1);
    });

    it('should sum to 1.0 for symmetric ratings', () => {
      const pA = expectedWinProbability(1600, 1400);
      const pB = expectedWinProbability(1400, 1600);
      expect(pA + pB).toBeCloseTo(1.0, 10);
    });
  });

  describe('calculateNewRatings', () => {
    it('should increase winner rating and decrease loser rating', () => {
      const { newWinnerRating, newLoserRating } = calculateNewRatings(1500, 1500);
      expect(newWinnerRating).toBeGreaterThan(1500);
      expect(newLoserRating).toBeLessThan(1500);
    });

    it('should give bigger boost for an upset', () => {
      const upset = calculateNewRatings(1300, 1700);
      const expected = calculateNewRatings(1700, 1300);
      // Winner gains more in an upset than in an expected win
      const upsetGain = upset.newWinnerRating - 1300;
      const expectedGain = expected.newWinnerRating - 1700;
      expect(upsetGain).toBeGreaterThan(expectedGain);
    });

    it('should preserve total rating', () => {
      const { newWinnerRating, newLoserRating } = calculateNewRatings(1500, 1500);
      expect(newWinnerRating + newLoserRating).toBeCloseTo(3000, 5);
    });

    it('should respect custom K-factor', () => {
      const small = calculateNewRatings(1500, 1500, 16);
      const large = calculateNewRatings(1500, 1500, 64);
      const smallChange = small.newWinnerRating - 1500;
      const largeChange = large.newWinnerRating - 1500;
      expect(largeChange).toBeGreaterThan(smallChange);
    });
  });

  describe('buildQualityIndicators', () => {
    const mockBattle: ArenaBattle = {
      id: 'test-battle',
      prompt: 'Compare these models',
      mode: 'blind',
      contestants: [
        {
          id: 'c1',
          provider: 'openai',
          model: 'gpt-4o',
          displayName: 'GPT-4o',
          response: 'Response from GPT-4o with some content',
          status: 'completed',
        },
        {
          id: 'c2',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          displayName: 'Claude Sonnet 4',
          response: 'Response from Claude with some content',
          status: 'completed',
        },
      ],
      createdAt: new Date(),
      viewingStartedAt: new Date(Date.now() - 5000),
    };

    it('should compute promptLength', () => {
      const qi = buildQualityIndicators(mockBattle, DEFAULT_ARENA_SETTINGS);
      expect(qi.promptLength).toBe(mockBattle.prompt.length);
    });

    it('should compute avgResponseLength', () => {
      const qi = buildQualityIndicators(mockBattle, DEFAULT_ARENA_SETTINGS);
      expect(qi.avgResponseLength).toBeGreaterThan(0);
    });

    it('should detect all responses complete', () => {
      const qi = buildQualityIndicators(mockBattle, DEFAULT_ARENA_SETTINGS);
      expect(qi.allResponsesComplete).toBe(true);
    });

    it('should compute viewing time', () => {
      const qi = buildQualityIndicators(mockBattle, DEFAULT_ARENA_SETTINGS);
      expect(qi.viewingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should compute quality score between 0 and 1', () => {
      const qi = buildQualityIndicators(mockBattle, DEFAULT_ARENA_SETTINGS);
      expect(qi.qualityScore).toBeGreaterThanOrEqual(0);
      expect(qi.qualityScore).toBeLessThanOrEqual(1);
    });

    it('should handle battle without viewingStartedAt', () => {
      const noView = { ...mockBattle, viewingStartedAt: undefined };
      const qi = buildQualityIndicators(noView, DEFAULT_ARENA_SETTINGS);
      expect(qi.viewingTimeMs).toBe(0);
    });
  });

  describe('preferencesToMatchups', () => {
    it('should convert preferences to matchups', () => {
      const preferences: ArenaPreference[] = [
        {
          id: 'p1',
          battleId: 'b1',
          winner: 'openai:gpt-4o',
          loser: 'anthropic:claude-sonnet-4-20250514',
          timestamp: new Date(),
        },
      ];
      const matchups = preferencesToMatchups(preferences);
      expect(matchups).toHaveLength(1);
      expect(matchups[0].winner).toBe('openai:gpt-4o');
      expect(matchups[0].loser).toBe('anthropic:claude-sonnet-4-20250514');
      expect(matchups[0].isTie).toBe(false);
    });

    it('should handle empty preferences', () => {
      expect(preferencesToMatchups([])).toEqual([]);
    });

    it('should convert multiple preferences', () => {
      const preferences: ArenaPreference[] = [
        { id: 'p1', battleId: 'b1', winner: 'a', loser: 'b', timestamp: new Date() },
        { id: 'p2', battleId: 'b2', winner: 'b', loser: 'c', timestamp: new Date() },
        { id: 'p3', battleId: 'b3', winner: 'a', loser: 'c', timestamp: new Date() },
      ];
      const matchups = preferencesToMatchups(preferences);
      expect(matchups).toHaveLength(3);
    });
  });
});
