/**
 * Preference Learner - Integrates arena preferences with auto-router
 * Uses ELO-based ratings from arena battles to optimize model selection
 */

import { useArenaStore } from '@/stores/arena';
import type { ArenaPreference, ArenaModelRating } from '@/types/arena';
import type { TaskCategory, TaskClassification } from '@/types/provider/auto-router';
import type { ModelSelection } from '@/types/provider/auto-router';
import type { ProviderName } from '@/types/provider';
import { DEFAULT_ELO_RATING } from '@/types/arena';

/**
 * Preference-based model scoring adjustment
 */
export interface PreferenceAdjustment {
  modelId: string;
  provider: ProviderName;
  model: string;
  baseScore: number;
  preferenceBonus: number;
  adjustedScore: number;
  winRate: number;
  totalBattles: number;
}

/**
 * Get model identifier
 */
function getModelId(provider: ProviderName, model: string): string {
  return `${provider}:${model}`;
}

/**
 * Get model rating from store
 */
export function getModelRating(
  provider: ProviderName,
  model: string,
  category?: TaskCategory
): number {
  const { modelRatings } = useArenaStore.getState();
  const modelId = getModelId(provider, model);
  const rating = modelRatings.find((r) => r.modelId === modelId);

  if (!rating) return DEFAULT_ELO_RATING;

  if (category && rating.categoryRatings[category]) {
    return rating.categoryRatings[category]!;
  }

  return rating.rating;
}

/**
 * Get all model ratings sorted by rating
 */
export function getAllModelRatings(): ArenaModelRating[] {
  const { modelRatings } = useArenaStore.getState();
  return [...modelRatings].sort((a, b) => b.rating - a.rating);
}

/**
 * Get model win rate
 */
export function getModelWinRate(provider: ProviderName, model: string): number {
  const { modelRatings } = useArenaStore.getState();
  const modelId = getModelId(provider, model);
  const rating = modelRatings.find((r) => r.modelId === modelId);

  if (!rating || rating.totalBattles === 0) return 0.5; // Default 50% if no data
  return rating.wins / rating.totalBattles;
}

/**
 * Calculate preference bonus based on ELO rating
 * Returns a multiplier between 0.8 and 1.2
 */
export function calculatePreferenceBonus(
  provider: ProviderName,
  model: string,
  category?: TaskCategory
): number {
  const rating = getModelRating(provider, model, category);
  const deviation = rating - DEFAULT_ELO_RATING;

  // Convert ELO deviation to a bonus multiplier
  // ±400 ELO = ±20% bonus
  const bonus = deviation / 2000; // Max ±0.2 for ±400 ELO
  return Math.max(0.8, Math.min(1.2, 1 + bonus));
}

/**
 * Apply preference-based adjustments to model candidates
 */
export function applyPreferenceAdjustments(
  candidates: ModelSelection[],
  classification?: TaskClassification
): PreferenceAdjustment[] {
  const category = classification?.category;

  return candidates.map((candidate) => {
    const modelId = getModelId(candidate.provider, candidate.model);
    // ModelSelection doesn't have confidence, use a base score of 0.5
    const baseScore = 0.5;
    const preferenceBonus = calculatePreferenceBonus(candidate.provider, candidate.model, category);
    const winRate = getModelWinRate(candidate.provider, candidate.model);

    const { modelRatings } = useArenaStore.getState();
    const rating = modelRatings.find((r) => r.modelId === modelId);

    return {
      modelId,
      provider: candidate.provider,
      model: candidate.model,
      baseScore,
      preferenceBonus,
      adjustedScore: baseScore * preferenceBonus,
      winRate,
      totalBattles: rating?.totalBattles || 0,
    };
  });
}

/**
 * Sort candidates by preference-adjusted scores
 */
export function sortByPreference(
  candidates: ModelSelection[],
  classification?: TaskClassification
): ModelSelection[] {
  const adjustments = applyPreferenceAdjustments(candidates, classification);

  // Create a map for quick lookup
  const adjustmentMap = new Map(adjustments.map((a) => [a.modelId, a]));

  // Sort candidates by adjusted score
  return [...candidates].sort((a, b) => {
    const aId = getModelId(a.provider, a.model);
    const bId = getModelId(b.provider, b.model);
    const aAdj = adjustmentMap.get(aId);
    const bAdj = adjustmentMap.get(bId);

    if (!aAdj || !bAdj) return 0;
    return bAdj.adjustedScore - aAdj.adjustedScore;
  });
}

/**
 * Get top models for a category based on arena preferences
 */
export function getTopModelsForCategory(
  category: TaskCategory,
  limit: number = 3
): ArenaModelRating[] {
  const { modelRatings } = useArenaStore.getState();

  // Filter models that have category-specific ratings
  const withCategoryRatings = modelRatings.filter(
    (r) => r.categoryRatings[category] !== undefined
  );

  // Sort by category rating
  return withCategoryRatings
    .sort((a, b) => {
      const aRating = a.categoryRatings[category] || DEFAULT_ELO_RATING;
      const bRating = b.categoryRatings[category] || DEFAULT_ELO_RATING;
      return bRating - aRating;
    })
    .slice(0, limit);
}

/**
 * Get recent preferences for analysis
 */
export function getRecentPreferences(limit: number = 100): ArenaPreference[] {
  const { preferences } = useArenaStore.getState();
  return preferences.slice(0, limit);
}

/**
 * Calculate category distribution from preferences
 */
export function getCategoryDistribution(): Partial<Record<TaskCategory, number>> {
  const { preferences } = useArenaStore.getState();
  const distribution: Partial<Record<TaskCategory, number>> = {};

  for (const pref of preferences) {
    if (pref.taskCategory) {
      distribution[pref.taskCategory] = (distribution[pref.taskCategory] || 0) + 1;
    }
  }

  return distribution;
}

/**
 * Export preferences for backup/sharing
 */
export function exportPreferences(): {
  preferences: ArenaPreference[];
  modelRatings: ArenaModelRating[];
  exportedAt: Date;
} {
  const { preferences, modelRatings } = useArenaStore.getState();
  return {
    preferences,
    modelRatings,
    exportedAt: new Date(),
  };
}

/**
 * Import preferences from backup
 */
export function importPreferences(data: {
  preferences: ArenaPreference[];
  modelRatings?: ArenaModelRating[];
}): void {
  const store = useArenaStore.getState();

  // Import preferences
  if (data.preferences?.length > 0) {
    store.importPreferences(data.preferences);
  }
}

/**
 * Check if we have enough data for reliable preferences
 */
export function hasReliablePreferenceData(minBattles: number = 10): boolean {
  const { battles } = useArenaStore.getState();
  const completedBattles = battles.filter((b) => b.winnerId || b.isTie);
  return completedBattles.length >= minBattles;
}

/**
 * Get recommendation for model based on preferences
 */
export function getPreferenceRecommendation(
  candidates: ModelSelection[],
  classification?: TaskClassification
): ModelSelection | null {
  if (!hasReliablePreferenceData(5)) {
    // Not enough data, return null to use default routing
    return null;
  }

  const sorted = sortByPreference(candidates, classification);
  return sorted[0] || null;
}

/**
 * Hook into auto-router to apply preference-based adjustments
 */
export function enhanceWithPreferences(
  selection: ModelSelection,
  alternatives: ModelSelection[],
  classification?: TaskClassification
): ModelSelection {
  // If preference learning is disabled or not enough data, return original
  const { settings } = useArenaStore.getState();
  if (!settings.preferenceLearning || !hasReliablePreferenceData()) {
    return selection;
  }

  // Check if there's a better option based on preferences
  const recommendation = getPreferenceRecommendation(
    [selection, ...alternatives],
    classification
  );

  if (recommendation) {
    // Calculate the preference advantage
    const originalBonus = calculatePreferenceBonus(
      selection.provider,
      selection.model,
      classification?.category
    );
    const recommendedBonus = calculatePreferenceBonus(
      recommendation.provider,
      recommendation.model,
      classification?.category
    );

    // Only switch if the recommendation is significantly better (>5% advantage)
    if (recommendedBonus > originalBonus * 1.05) {
      return {
        ...recommendation,
        reason: `${recommendation.reason || ''} [Preference-optimized]`.trim(),
      };
    }
  }

  return selection;
}
