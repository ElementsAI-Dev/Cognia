/**
 * @jest-environment jsdom
 */

import {
  getModelRating,
  getAllModelRatings,
  getModelWinRate,
  calculatePreferenceBonus,
  applyPreferenceAdjustments,
  sortByPreference,
  getTopModelsForCategory,
  getRecentPreferences,
  getCategoryDistribution,
  exportPreferences,
  importPreferences,
  hasReliablePreferenceData,
  getPreferenceRecommendation,
  enhanceWithPreferences,
} from './preference-learner';
import { useArenaStore } from '@/stores/arena';
import { DEFAULT_ELO_RATING } from '@/types/arena';
import type { ArenaModelRating, ArenaPreference } from '@/types/arena';
import type { ModelSelection } from '@/types/provider/auto-router';

// Mock the arena store
jest.mock('@/stores/arena', () => ({
  useArenaStore: {
    getState: jest.fn(),
  },
}));

const mockUseArenaStore = useArenaStore as jest.Mocked<typeof useArenaStore>;

// Helper to create mock ModelSelection
const createMockModelSelection = (
  provider: 'openai' | 'anthropic',
  model: string,
  reason: string
): ModelSelection => ({
  provider,
  model,
  tier: 'balanced',
  reason,
  routingMode: 'rule-based',
  routingLatency: 10,
  classification: {
    complexity: 'moderate',
    category: 'general',
    requiresReasoning: false,
    requiresTools: false,
    requiresVision: false,
    requiresCreativity: false,
    requiresCoding: false,
    requiresLongContext: false,
    estimatedInputTokens: 100,
    estimatedOutputTokens: 200,
    confidence: 0.9,
  },
});

describe('preference-learner', () => {
  const mockModelRatings: ArenaModelRating[] = [
    {
      modelId: 'openai:gpt-4',
      provider: 'openai',
      model: 'gpt-4',
      rating: 1600,
      wins: 80,
      losses: 20,
      ties: 10,
      totalBattles: 110,
      categoryRatings: { coding: 1650, general: 1580 },
      updatedAt: new Date(),
    },
    {
      modelId: 'anthropic:claude-3',
      provider: 'anthropic',
      model: 'claude-3',
      rating: 1550,
      wins: 60,
      losses: 40,
      ties: 5,
      totalBattles: 105,
      categoryRatings: { coding: 1520, creative: 1600 },
      updatedAt: new Date(),
    },
  ];

  const mockPreferences: ArenaPreference[] = [
    {
      id: 'pref-1',
      battleId: 'battle-1',
      winner: 'openai:gpt-4',
      loser: 'anthropic:claude-3',
      taskCategory: 'coding',
      timestamp: new Date(),
    },
    {
      id: 'pref-2',
      battleId: 'battle-2',
      winner: 'anthropic:claude-3',
      loser: 'openai:gpt-4',
      taskCategory: 'creative',
      timestamp: new Date(),
    },
  ];

  const mockBattles = Array.from({ length: 15 }, (_, i) => ({
    id: `battle-${i}`,
    winnerId: i % 2 === 0 ? 'openai:gpt-4' : 'anthropic:claude-3',
    isTie: false,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseArenaStore.getState.mockReturnValue({
      modelRatings: mockModelRatings,
      preferences: mockPreferences,
      battles: mockBattles,
      settings: { preferenceLearning: true },
      importPreferences: jest.fn(),
    } as unknown as ReturnType<typeof useArenaStore.getState>);
  });

  describe('getModelRating', () => {
    it('should return model rating', () => {
      const rating = getModelRating('openai', 'gpt-4');
      expect(rating).toBe(1600);
    });

    it('should return category-specific rating when category is provided', () => {
      const rating = getModelRating('openai', 'gpt-4', 'coding');
      expect(rating).toBe(1650);
    });

    it('should return default rating for unknown model', () => {
      const rating = getModelRating('unknown' as 'openai', 'unknown-model');
      expect(rating).toBe(DEFAULT_ELO_RATING);
    });

    it('should return overall rating when category rating not available', () => {
      const rating = getModelRating('openai', 'gpt-4', 'math');
      expect(rating).toBe(1600);
    });
  });

  describe('getAllModelRatings', () => {
    it('should return all ratings sorted by rating descending', () => {
      const ratings = getAllModelRatings();
      expect(ratings).toHaveLength(2);
      expect(ratings[0].rating).toBeGreaterThanOrEqual(ratings[1].rating);
    });
  });

  describe('getModelWinRate', () => {
    it('should calculate win rate correctly', () => {
      const winRate = getModelWinRate('openai', 'gpt-4');
      expect(winRate).toBeCloseTo(80 / 110, 2);
    });

    it('should return 0.5 for unknown model', () => {
      const winRate = getModelWinRate('unknown' as 'openai', 'unknown');
      expect(winRate).toBe(0.5);
    });

    it('should return 0.5 for model with no battles', () => {
      mockUseArenaStore.getState.mockReturnValue({
        modelRatings: [{ ...mockModelRatings[0], totalBattles: 0 }],
        preferences: [],
        battles: [],
        settings: { preferenceLearning: true },
      } as unknown as ReturnType<typeof useArenaStore.getState>);
      
      const winRate = getModelWinRate('openai', 'gpt-4');
      expect(winRate).toBe(0.5);
    });
  });

  describe('calculatePreferenceBonus', () => {
    it('should return bonus greater than 1 for high-rated model', () => {
      const bonus = calculatePreferenceBonus('openai', 'gpt-4');
      expect(bonus).toBeGreaterThan(1);
    });

    it('should clamp bonus between 0.8 and 1.2', () => {
      const bonus = calculatePreferenceBonus('openai', 'gpt-4');
      expect(bonus).toBeGreaterThanOrEqual(0.8);
      expect(bonus).toBeLessThanOrEqual(1.2);
    });

    it('should use category-specific rating when provided', () => {
      const bonusCoding = calculatePreferenceBonus('openai', 'gpt-4', 'coding');
      const bonusGeneral = calculatePreferenceBonus('openai', 'gpt-4', 'general');
      expect(bonusCoding).not.toBe(bonusGeneral);
    });
  });

  describe('applyPreferenceAdjustments', () => {
    it('should apply adjustments to all candidates', () => {
      const candidates: ModelSelection[] = [
        createMockModelSelection('openai', 'gpt-4', 'test'),
        createMockModelSelection('anthropic', 'claude-3', 'test'),
      ];

      const adjustments = applyPreferenceAdjustments(candidates);
      expect(adjustments).toHaveLength(2);
      expect(adjustments[0]).toHaveProperty('adjustedScore');
      expect(adjustments[0]).toHaveProperty('preferenceBonus');
    });

    it('should include win rate and total battles', () => {
      const candidates: ModelSelection[] = [
        createMockModelSelection('openai', 'gpt-4', 'test'),
      ];

      const adjustments = applyPreferenceAdjustments(candidates);
      expect(adjustments[0].winRate).toBeDefined();
      expect(adjustments[0].totalBattles).toBeDefined();
    });
  });

  describe('sortByPreference', () => {
    it('should sort candidates by adjusted score', () => {
      const candidates: ModelSelection[] = [
        createMockModelSelection('anthropic', 'claude-3', 'test'),
        createMockModelSelection('openai', 'gpt-4', 'test'),
      ];

      const sorted = sortByPreference(candidates);
      expect(sorted[0].provider).toBe('openai');
    });
  });

  describe('getTopModelsForCategory', () => {
    it('should return top models for a category', () => {
      const top = getTopModelsForCategory('coding', 2);
      expect(top.length).toBeLessThanOrEqual(2);
    });

    it('should filter models by category availability', () => {
      const top = getTopModelsForCategory('creative', 10);
      expect(top.every(m => m.categoryRatings.creative !== undefined)).toBe(true);
    });
  });

  describe('getRecentPreferences', () => {
    it('should return recent preferences', () => {
      const recent = getRecentPreferences(10);
      expect(recent.length).toBeLessThanOrEqual(10);
    });

    it('should respect limit parameter', () => {
      const recent = getRecentPreferences(1);
      expect(recent.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getCategoryDistribution', () => {
    it('should calculate category distribution', () => {
      const distribution = getCategoryDistribution();
      expect(distribution.coding).toBe(1);
      expect(distribution.creative).toBe(1);
    });
  });

  describe('exportPreferences', () => {
    it('should export preferences and ratings', () => {
      const exported = exportPreferences();
      expect(exported.preferences).toBeDefined();
      expect(exported.modelRatings).toBeDefined();
      expect(exported.exportedAt).toBeInstanceOf(Date);
    });
  });

  describe('importPreferences', () => {
    it('should call store import method', () => {
      const mockImport = jest.fn();
      mockUseArenaStore.getState.mockReturnValue({
        ...mockUseArenaStore.getState(),
        importPreferences: mockImport,
      } as unknown as ReturnType<typeof useArenaStore.getState>);

      importPreferences({ preferences: mockPreferences });
      expect(mockImport).toHaveBeenCalledWith(mockPreferences);
    });

    it('should not call import for empty preferences', () => {
      const mockImport = jest.fn();
      mockUseArenaStore.getState.mockReturnValue({
        ...mockUseArenaStore.getState(),
        importPreferences: mockImport,
      } as unknown as ReturnType<typeof useArenaStore.getState>);

      importPreferences({ preferences: [] });
      expect(mockImport).not.toHaveBeenCalled();
    });
  });

  describe('hasReliablePreferenceData', () => {
    it('should return true when enough battles exist', () => {
      expect(hasReliablePreferenceData(10)).toBe(true);
    });

    it('should return false when not enough battles', () => {
      mockUseArenaStore.getState.mockReturnValue({
        ...mockUseArenaStore.getState(),
        battles: [],
      } as unknown as ReturnType<typeof useArenaStore.getState>);

      expect(hasReliablePreferenceData(10)).toBe(false);
    });
  });

  describe('getPreferenceRecommendation', () => {
    it('should return null when not enough data', () => {
      mockUseArenaStore.getState.mockReturnValue({
        ...mockUseArenaStore.getState(),
        battles: [],
      } as unknown as ReturnType<typeof useArenaStore.getState>);

      const candidates: ModelSelection[] = [
        createMockModelSelection('openai', 'gpt-4', 'test'),
      ];

      expect(getPreferenceRecommendation(candidates)).toBeNull();
    });

    it('should return top candidate when data is sufficient', () => {
      const candidates: ModelSelection[] = [
        createMockModelSelection('openai', 'gpt-4', 'test'),
        createMockModelSelection('anthropic', 'claude-3', 'test'),
      ];

      const recommendation = getPreferenceRecommendation(candidates);
      expect(recommendation).not.toBeNull();
    });
  });

  describe('enhanceWithPreferences', () => {
    it('should return original selection when preference learning is disabled', () => {
      mockUseArenaStore.getState.mockReturnValue({
        ...mockUseArenaStore.getState(),
        settings: { preferenceLearning: false },
      } as unknown as ReturnType<typeof useArenaStore.getState>);

      const selection = createMockModelSelection('anthropic', 'claude-3', 'test');
      const result = enhanceWithPreferences(selection, []);

      expect(result).toEqual(selection);
    });

    it('should enhance selection when better option exists', () => {
      const selection = createMockModelSelection('anthropic', 'claude-3', 'test');
      const alternatives: ModelSelection[] = [
        createMockModelSelection('openai', 'gpt-4', 'alternative'),
      ];

      const result = enhanceWithPreferences(selection, alternatives);
      expect(result).toBeDefined();
    });
  });
});
