/**
 * Arena rating utilities - ELO/Bradley-Terry helper functions
 */

import type { ProviderName } from '@/types/provider';
import type {
  ArenaBattle,
  ArenaSettings,
  ArenaQualityIndicators,
  ArenaPreference,
} from '@/types/arena';
import { ELO_K_FACTOR } from '@/types/arena';
import type { Matchup } from '@/lib/ai/arena/bradley-terry';

/**
 * Get model identifier from provider and model
 */
export function getModelId(provider: ProviderName, model: string): string {
  return `${provider}:${model}`;
}

/**
 * Parse model identifier to provider and model
 */
export function parseModelId(modelId: string): { provider: ProviderName; model: string } {
  const [provider, ...modelParts] = modelId.split(':');
  return {
    provider: provider as ProviderName,
    model: modelParts.join(':'),
  };
}

/**
 * Calculate expected win probability using ELO formula
 */
export function expectedWinProbability(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate new ELO ratings after a match
 */
export function calculateNewRatings(
  winnerRating: number,
  loserRating: number,
  kFactor: number = ELO_K_FACTOR
): { newWinnerRating: number; newLoserRating: number } {
  const expectedWin = expectedWinProbability(winnerRating, loserRating);
  const newWinnerRating = winnerRating + kFactor * (1 - expectedWin);
  const newLoserRating = loserRating + kFactor * (0 - (1 - expectedWin));
  return { newWinnerRating, newLoserRating };
}

/**
 * Build quality indicators for a battle
 */
export function buildQualityIndicators(
  battle: ArenaBattle,
  settings: ArenaSettings
): ArenaQualityIndicators {
  const responseLengths = battle.contestants.map((c) => c.response?.length || 0);
  const avgResponseLength = responseLengths.length
    ? responseLengths.reduce((sum, length) => sum + length, 0) / responseLengths.length
    : 0;
  const viewingStartedAt = battle.viewingStartedAt
    ? new Date(battle.viewingStartedAt).getTime()
    : null;
  const viewingTimeMs = viewingStartedAt ? Math.max(0, Date.now() - viewingStartedAt) : 0;
  const allResponsesComplete = battle.contestants.every((c) => c.status === 'completed');
  const qualityScoreParts = [
    battle.prompt.length > 0,
    avgResponseLength > 0,
    !settings.enableAntiGaming || viewingTimeMs >= settings.minViewingTimeMs,
    allResponsesComplete,
  ];
  const qualityScore =
    qualityScoreParts.filter(Boolean).length / Math.max(qualityScoreParts.length, 1);

  return {
    promptLength: battle.prompt.length,
    avgResponseLength,
    viewingTimeMs,
    allResponsesComplete,
    qualityScore,
  };
}

/**
 * Convert preferences to matchups for BT calculation
 */
export function preferencesToMatchups(preferences: ArenaPreference[]): Matchup[] {
  return preferences.map((p) => ({
    winner: p.winner,
    loser: p.loser,
    isTie: false,
  }));
}
