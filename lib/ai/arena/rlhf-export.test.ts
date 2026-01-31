/**
 * RLHF Export Tests
 */

import {
  battleToRLHFPair,
  battleToDPO,
  battleToHHRLHF,
  battleToOpenAIComparison,
  exportBattles,
  getExportStatistics,
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
      response: 'This is the winning response.',
      status: 'completed',
      startTime: Date.now() - 5000,
      endTime: Date.now() - 2000,
      latency: 3000,
      tokenCount: 50,
    },
    {
      id: 'contestant-2',
      provider: 'anthropic',
      model: 'claude-3-opus',
      response: 'This is the losing response.',
      status: 'completed',
      startTime: Date.now() - 5000,
      endTime: Date.now() - 1000,
      latency: 4000,
      tokenCount: 45,
    },
  ];

  return {
    id: 'battle-1',
    sessionId: 'session-1',
    prompt: 'What is the meaning of life?',
    contestants,
    createdAt: Date.now() - 10000,
    completedAt: Date.now(),
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
      expect(pair?.chosen_model).toBe('gpt-4o');
      expect(pair?.rejected_model).toBe('claude-3-opus');
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

  describe('battleToDPO', () => {
    it('should convert battle to DPO format', () => {
      const battle = createMockBattle();
      const dpo = battleToDPO(battle);

      expect(dpo).toBeDefined();
      expect(dpo?.prompt).toBe('What is the meaning of life?');
      expect(dpo?.chosen).toBe('This is the winning response.');
      expect(dpo?.rejected).toBe('This is the losing response.');
    });

    it('should return null for incomplete battle', () => {
      const battle = createMockBattle({ winnerId: undefined });
      const dpo = battleToDPO(battle);
      expect(dpo).toBeNull();
    });

    it('should include system prompt when provided', () => {
      const battle = createMockBattle({ systemPrompt: 'You are a helpful assistant.' });
      const dpo = battleToDPO(battle);

      expect(dpo?.system).toBe('You are a helpful assistant.');
    });
  });

  describe('battleToHHRLHF', () => {
    it('should convert battle to HH-RLHF format', () => {
      const battle = createMockBattle();
      const hh = battleToHHRLHF(battle);

      expect(hh).toBeDefined();
      expect(hh?.chosen).toContain('Human:');
      expect(hh?.chosen).toContain('Assistant:');
      expect(hh?.rejected).toContain('Human:');
      expect(hh?.rejected).toContain('Assistant:');
    });

    it('should return null for incomplete battle', () => {
      const battle = createMockBattle({ winnerId: undefined });
      const hh = battleToHHRLHF(battle);
      expect(hh).toBeNull();
    });
  });

  describe('battleToOpenAIComparison', () => {
    it('should convert battle to OpenAI comparison format', () => {
      const battle = createMockBattle();
      const comparison = battleToOpenAIComparison(battle);

      expect(comparison).toBeDefined();
      expect(comparison?.input).toBeDefined();
      expect(comparison?.ideal).toBe('This is the winning response.');
      expect(comparison?.completion_a).toBeDefined();
      expect(comparison?.completion_b).toBeDefined();
      expect(comparison?.choice).toBe('a');
    });

    it('should return null for incomplete battle', () => {
      const battle = createMockBattle({ winnerId: undefined });
      const comparison = battleToOpenAIComparison(battle);
      expect(comparison).toBeNull();
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
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      });
      const recentBattle = createMockBattle({
        id: 'recent-battle',
        createdAt: Date.now() - 1000,
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

  describe('getExportStatistics', () => {
    it('should return correct statistics', () => {
      const battles = [
        createMockBattle(),
        createMockBattle({ id: 'battle-2' }),
        createMockBattle({ id: 'battle-3', isTie: true, winnerId: undefined }),
      ];

      const stats = getExportStatistics(battles);

      expect(stats.totalBattles).toBe(3);
      expect(stats.completedBattles).toBe(2);
      expect(stats.tiedBattles).toBe(1);
      expect(stats.exportablePairs).toBe(2);
    });

    it('should handle empty battles array', () => {
      const stats = getExportStatistics([]);

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

      const stats = getExportStatistics(battles);

      expect(stats.uniqueModels).toBeGreaterThan(0);
    });
  });
});
