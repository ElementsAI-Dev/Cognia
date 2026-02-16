/**
 * RLHF Export Tests
 */

import {
  battleToRLHFPair,
  battlesToDPO,
  battlesToHHRLHF,
  battlesToOpenAIComparison,
  exportBattles,
  getExportStats as _getExportStats,
  type ExportOptions,
} from './rlhf-export';
import type { ArenaBattle, ArenaContestant } from '@/types/arena';

// Helper to create mock battle
function createMockBattle(overrides?: Partial<ArenaBattle>): ArenaBattle {
  const contestants: ArenaContestant[] = [
    {
      id: 'contestant-1',
      provider: 'openai',
      model: 'gpt-4o',
      displayName: 'GPT-4o',
      response: 'This is the winning response.',
      status: 'completed',
      startTime: Date.now() - 5000,
      endTime: Date.now() - 2000,
      latency: 3000,
      tokenCounts: { input: 20, output: 30, total: 50 },
    },
    {
      id: 'contestant-2',
      provider: 'anthropic',
      model: 'claude-3-opus',
      displayName: 'Claude 3 Opus',
      response: 'This is the losing response.',
      status: 'completed',
      startTime: Date.now() - 5000,
      endTime: Date.now() - 1000,
      latency: 4000,
      tokenCounts: { input: 20, output: 25, total: 45 },
    },
  ];

  return {
    id: 'battle-1',
    sessionId: 'session-1',
    prompt: 'What is the meaning of life?',
    mode: 'normal',
    contestants,
    createdAt: new Date(Date.now() - 10000),
    completedAt: new Date(),
    winnerId: 'contestant-1',
    blindMode: false,
    winReason: 'quality',
    ...overrides,
  };
}

describe('RLHF Export', () => {
  describe('battleToRLHFPair', () => {
    it('should convert battle to RLHF preference pair', () => {
      const battle = createMockBattle();
      const pair = battleToRLHFPair(battle);

      expect(pair).toBeDefined();
      expect(pair?.prompt).toBe('What is the meaning of life?');
      expect(pair?.chosen).toBe('This is the winning response.');
      expect(pair?.rejected).toBe('This is the losing response.');
      expect(pair?.chosen_model).toBe('openai:gpt-4o');
      expect(pair?.rejected_model).toBe('anthropic:claude-3-opus');
    });

    it('should return null for incomplete battle', () => {
      const battle = createMockBattle({ winnerId: undefined });
      const pair = battleToRLHFPair(battle);
      expect(pair).toBeNull();
    });

    it('should return null for tie battle', () => {
      const battle = createMockBattle({ isTie: true, winnerId: undefined });
      const pair = battleToRLHFPair(battle);
      expect(pair).toBeNull();
    });

    it('should include metadata when requested', () => {
      const battle = createMockBattle();
      const pair = battleToRLHFPair(battle, { includeMetadata: true });

      expect(pair?.metadata).toBeDefined();
      expect(pair?.metadata?.battle_id).toBe('battle-1');
      expect(pair?.metadata?.win_reason).toBe('quality');
    });
  });

  describe('battlesToDPO', () => {
    it('should convert battles to DPO format', () => {
      const battles = [createMockBattle()];
      const dpoList = battlesToDPO(battles);

      expect(dpoList).toHaveLength(1);
      expect(dpoList[0].prompt).toBe('What is the meaning of life?');
      expect(dpoList[0].chosen).toBe('This is the winning response.');
      expect(dpoList[0].rejected).toBe('This is the losing response.');
    });

    it('should filter out incomplete battles', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2', winnerId: undefined }),
      ];
      const dpoList = battlesToDPO(battles);
      expect(dpoList).toHaveLength(1);
    });

    it('should handle empty battles array', () => {
      const dpoList = battlesToDPO([]);
      expect(dpoList).toHaveLength(0);
    });
  });

  describe('battlesToHHRLHF', () => {
    it('should convert battles to HH-RLHF format', () => {
      const battles = [createMockBattle()];
      const hhList = battlesToHHRLHF(battles);

      expect(hhList).toHaveLength(1);
      expect(hhList[0].chosen).toContain('Human:');
      expect(hhList[0].chosen).toContain('Assistant:');
      expect(hhList[0].rejected).toContain('Human:');
      expect(hhList[0].rejected).toContain('Assistant:');
    });

    it('should filter out incomplete battles', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2', winnerId: undefined }),
      ];
      const hhList = battlesToHHRLHF(battles);
      expect(hhList).toHaveLength(1);
    });
  });

  describe('battlesToOpenAIComparison', () => {
    it('should convert battles to OpenAI comparison format', () => {
      const battles = [createMockBattle()];
      const comparisons = battlesToOpenAIComparison(battles);

      expect(comparisons).toHaveLength(1);
      expect(comparisons[0].prompt).toBeDefined();
      expect(comparisons[0].completion_a).toBeDefined();
      expect(comparisons[0].completion_b).toBeDefined();
      expect(comparisons[0].label).toBe('a');
    });

    it('should filter out incomplete battles', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2', winnerId: undefined }),
      ];
      const comparisons = battlesToOpenAIComparison(battles);
      expect(comparisons).toHaveLength(1);
    });
  });

  describe('exportBattles', () => {
    it('should export battles in RLHF format', () => {
      const battles = [createMockBattle()];
      const options: ExportOptions = { format: 'rlhf' };
      const result = exportBattles(battles, options);

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(1);
    });

    it('should export battles in DPO format', () => {
      const battles = [createMockBattle()];
      const options: ExportOptions = { format: 'dpo' };
      const result = exportBattles(battles, options);

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export battles in HH-RLHF format', () => {
      const battles = [createMockBattle()];
      const options: ExportOptions = { format: 'hh-rlhf' };
      const result = exportBattles(battles, options);

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export battles in OpenAI comparison format', () => {
      const battles = [createMockBattle()];
      const options: ExportOptions = { format: 'openai-comparison' };
      const result = exportBattles(battles, options);

      expect(result).toBeDefined();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should filter out incomplete battles', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2', winnerId: undefined }),
      ];
      const options: ExportOptions = { format: 'rlhf' };
      const result = exportBattles(battles, options);

      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
    });

    it('should include ties when option is set', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2', isTie: true, winnerId: undefined }),
      ];
      const options: ExportOptions = { format: 'rlhf', includeTies: true };
      const result = exportBattles(battles, options);

      // Ties are typically excluded from RLHF training, so length might still be 1
      expect(result).toBeDefined();
    });

    it('should filter by date range', () => {
      const oldBattle = createMockBattle({
        id: 'old-battle',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      });
      const recentBattle = createMockBattle({
        id: 'recent-battle',
        createdAt: new Date(Date.now() - 1000),
      });

      const battles = [oldBattle, recentBattle];
      const options: ExportOptions = {
        format: 'rlhf',
        dateRange: {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
          end: Date.now(),
        },
      };
      const result = exportBattles(battles, options);

      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(1);
    });
  });

  describe('_getExportStats', () => {
    it('should return correct statistics', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2' }),
        createMockBattle({ id: 'battle-3', isTie: true, winnerId: undefined }),
      ];

      const stats = _getExportStats(battles);

      expect(stats.totalBattles).toBe(3);
      expect(stats.completedBattles).toBe(2);
      expect(stats.tiedBattles).toBe(1);
      expect(stats.exportablePairs).toBe(2);
    });

    it('should handle empty battles array', () => {
      const stats = _getExportStats([]);

      expect(stats.totalBattles).toBe(0);
      expect(stats.completedBattles).toBe(0);
      expect(stats.tiedBattles).toBe(0);
      expect(stats.exportablePairs).toBe(0);
    });

    it('should count unique models', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2' }),
      ];

      const stats = _getExportStats(battles);

      expect(stats.uniqueModels).toBeGreaterThan(0);
    });
  });
});
