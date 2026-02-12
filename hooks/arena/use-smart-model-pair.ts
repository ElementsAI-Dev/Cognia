/**
 * useSmartModelPair - Smart model pair selection for arena battles
 * Selects optimal model pairs based on BT ratings and provider diversity
 */

import { useCallback, useMemo } from 'react';
import { useArenaStore } from '@/stores/arena';
import { useArena } from './use-arena';
import type { ModelSelection } from '@/types/arena';

/**
 * Returns a smart model pair for arena battles based on:
 * 1. Recommended matchup from Bradley-Terry model
 * 2. Fallback: top 2 rated models from different providers
 * 3. Last resort: first 2 available models
 */
export function useSmartModelPair() {
  const { getAvailableModels } = useArena();
  const modelRatings = useArenaStore((state) => state.modelRatings);
  const getRecommendedMatchup = useArenaStore((state) => state.getRecommendedMatchup);
  const availableModels = useMemo(() => getAvailableModels(), [getAvailableModels]);

  const getSmartModelPair = useCallback((): ModelSelection[] => {
    // First try recommended matchup from BT model
    const recommendation = getRecommendedMatchup();
    if (recommendation) {
      const modelA = availableModels.find(
        (m) => `${m.provider}:${m.model}` === recommendation.modelA
      );
      const modelB = availableModels.find(
        (m) => `${m.provider}:${m.model}` === recommendation.modelB
      );
      if (modelA && modelB) {
        return [modelA, modelB];
      }
    }

    // Fallback: select top 2 rated models from different providers
    if (availableModels.length >= 2) {
      const sortedByRating = [...availableModels].sort((a, b) => {
        const ratingA =
          modelRatings.find((r) => r.modelId === `${a.provider}:${a.model}`)?.rating || 1500;
        const ratingB =
          modelRatings.find((r) => r.modelId === `${b.provider}:${b.model}`)?.rating || 1500;
        return ratingB - ratingA;
      });

      // Try to pick from different providers
      const first = sortedByRating[0];
      const second = sortedByRating.find((m) => m.provider !== first.provider) || sortedByRating[1];
      return [first, second];
    }

    return availableModels.slice(0, 2);
  }, [availableModels, modelRatings, getRecommendedMatchup]);

  const selectedModels = useMemo(() => getSmartModelPair(), [getSmartModelPair]);

  return {
    getSmartModelPair,
    selectedModels,
    availableModels,
  };
}
