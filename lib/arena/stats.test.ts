import { computeArenaStats, buildWinRateMatrix } from './stats';
import type { ArenaBattle, ArenaModelRating, ArenaHeadToHead } from '@/types/arena';
import type { MatrixModelInfo } from './stats';

describe('arena stats utilities', () => {
  const makeBattle = (overrides: Partial<ArenaBattle> = {}): ArenaBattle => ({
    id: `battle-${Math.random().toString(36).slice(2)}`,
    prompt: 'Test prompt',
    mode: 'blind',
    contestants: [
      {
        id: 'c1',
        provider: 'openai',
        model: 'gpt-4o',
        displayName: 'GPT-4o',
        response: 'Response A',
        status: 'completed',
      },
      {
        id: 'c2',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        displayName: 'Claude Sonnet 4',
        response: 'Response B',
        status: 'completed',
      },
    ],
    createdAt: new Date('2025-01-01T00:00:00'),
    ...overrides,
  });

  describe('computeArenaStats', () => {
    it('should return zero stats for empty battles', () => {
      const stats = computeArenaStats([], []);
      expect(stats.totalBattles).toBe(0);
      expect(stats.completedCount).toBe(0);
      expect(stats.tieCount).toBe(0);
      expect(stats.modelStats).toEqual([]);
      expect(stats.categoryStats).toEqual([]);
    });

    it('should count total battles', () => {
      const battles = [makeBattle(), makeBattle(), makeBattle()];
      const stats = computeArenaStats(battles, []);
      expect(stats.totalBattles).toBe(3);
    });

    it('should count completed battles with winner', () => {
      const battles = [
        makeBattle({ winnerId: 'c1' }),
        makeBattle({ winnerId: 'c2' }),
        makeBattle(), // no winner
      ];
      const stats = computeArenaStats(battles, []);
      expect(stats.completedCount).toBe(2);
      expect(stats.decisiveCount).toBe(2);
    });

    it('should count ties', () => {
      const battles = [
        makeBattle({ isTie: true }),
        makeBattle({ isTie: true }),
        makeBattle({ winnerId: 'c1' }),
      ];
      const stats = computeArenaStats(battles, []);
      expect(stats.tieCount).toBe(2);
    });

    it('should count both-bad battles', () => {
      const battles = [makeBattle({ isBothBad: true })];
      const stats = computeArenaStats(battles, []);
      expect(stats.bothBadCount).toBe(1);
    });

    it('should count blind mode battles', () => {
      const battles = [
        makeBattle({ mode: 'blind' }),
        makeBattle({ mode: 'normal' }),
      ];
      const stats = computeArenaStats(battles, []);
      expect(stats.blindModeCount).toBe(1);
      expect(stats.blindModePercent).toBe(50);
    });

    it('should count multi-turn battles', () => {
      const battles = [
        makeBattle({ conversationMode: 'multi' }),
        makeBattle({ conversationMode: 'single' }),
      ];
      const stats = computeArenaStats(battles, []);
      expect(stats.multiTurnCount).toBe(1);
    });

    it('should count unique models', () => {
      const stats = computeArenaStats([makeBattle()], []);
      expect(stats.uniqueModelCount).toBe(2); // openai:gpt-4o and anthropic:claude-sonnet-4-20250514
    });

    it('should compute model stats sorted by battle count', () => {
      const battles = [makeBattle(), makeBattle({ winnerId: 'c1' })];
      const stats = computeArenaStats(battles, []);
      expect(stats.modelStats.length).toBe(2);
      // Both models appear in 2 battles
      expect(stats.modelStats[0].battleCount).toBe(2);
    });

    it('should compute category stats', () => {
      const battles = [
        makeBattle({ taskClassification: { category: 'coding', confidence: 0.9, complexity: 'moderate', requiresReasoning: false, requiresTools: false, requiresVision: false, requiresCreativity: false, requiresCoding: true, requiresLongContext: false, estimatedInputTokens: 100, estimatedOutputTokens: 200 } }),
        makeBattle({ taskClassification: { category: 'coding', confidence: 0.8, complexity: 'moderate', requiresReasoning: false, requiresTools: false, requiresVision: false, requiresCreativity: false, requiresCoding: true, requiresLongContext: false, estimatedInputTokens: 100, estimatedOutputTokens: 200 } }),
        makeBattle({ taskClassification: { category: 'math', confidence: 0.7, complexity: 'moderate', requiresReasoning: true, requiresTools: false, requiresVision: false, requiresCreativity: false, requiresCoding: false, requiresLongContext: false, estimatedInputTokens: 100, estimatedOutputTokens: 200 } }),
      ];
      const stats = computeArenaStats(battles, []);
      expect(stats.categoryStats.length).toBe(2);
      expect(stats.categoryStats[0].category).toBe('coding');
      expect(stats.categoryStats[0].count).toBe(2);
    });

    it('should handle topRating', () => {
      const ratings: ArenaModelRating[] = [
        {
          modelId: 'openai:gpt-4o',
          provider: 'openai',
          model: 'gpt-4o',
          rating: 1600,
          categoryRatings: {},
          totalBattles: 10,
          wins: 7,
          losses: 3,
          ties: 0,
          updatedAt: new Date(),
        },
      ];
      const stats = computeArenaStats([], ratings);
      expect(stats.topRating).toBeDefined();
      expect(stats.topRating?.rating).toBe(1600);
    });
  });

  describe('buildWinRateMatrix', () => {
    const models: MatrixModelInfo[] = [
      { id: 'openai:gpt-4o', name: 'gpt-4o', provider: 'openai', rating: 1600 },
      { id: 'anthropic:claude', name: 'claude', provider: 'anthropic', rating: 1500 },
    ];

    it('should return 0.5 for self-matchups', () => {
      const matrix = buildWinRateMatrix(models, []);
      expect(matrix['openai:gpt-4o']['openai:gpt-4o'].winRate).toBe(0.5);
      expect(matrix['openai:gpt-4o']['openai:gpt-4o'].games).toBe(0);
    });

    it('should return 0.5 when no head-to-head data exists', () => {
      const matrix = buildWinRateMatrix(models, []);
      expect(matrix['openai:gpt-4o']['anthropic:claude'].winRate).toBe(0.5);
      expect(matrix['openai:gpt-4o']['anthropic:claude'].games).toBe(0);
    });

    it('should use head-to-head data when available', () => {
      const h2h: ArenaHeadToHead[] = [
        {
          modelA: 'openai:gpt-4o',
          modelB: 'anthropic:claude',
          winsA: 7,
          winsB: 3,
          ties: 0,
          total: 10,
          winRateA: 0.7,
        },
      ];
      const matrix = buildWinRateMatrix(models, h2h);
      expect(matrix['openai:gpt-4o']['anthropic:claude'].winRate).toBe(0.7);
      expect(matrix['openai:gpt-4o']['anthropic:claude'].games).toBe(10);
      // Reverse direction
      expect(matrix['anthropic:claude']['openai:gpt-4o'].winRate).toBeCloseTo(0.3);
    });

    it('should handle empty models', () => {
      const matrix = buildWinRateMatrix([], []);
      expect(Object.keys(matrix)).toHaveLength(0);
    });
  });
});
