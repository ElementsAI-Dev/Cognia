/**
 * useSmartModelPair - Smart model pair selection for arena battles
 * Selects optimal model pairs based on BT ratings, provider diversity, and
 * recent rotation history persisted in the arena store.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useArenaStore } from '@/stores/arena';
import { useArena } from './use-arena';
import type { ModelSelection } from '@/types/arena';

interface PairCandidate {
  pairKey: string;
  models: ModelSelection[];
  reason: string;
}

function getPairKey(models: ModelSelection[]): string {
  return models
    .map((model) => `${model.provider}:${model.model}`)
    .sort()
    .join('::');
}

function sortModelsByRating(
  models: ModelSelection[],
  ratings: Array<{ modelId: string; rating: number }>
): ModelSelection[] {
  return [...models].sort((a, b) => {
    const ratingA = ratings.find((entry) => entry.modelId === `${a.provider}:${a.model}`)?.rating ?? 1500;
    const ratingB = ratings.find((entry) => entry.modelId === `${b.provider}:${b.model}`)?.rating ?? 1500;
    return ratingB - ratingA;
  });
}

function buildPairCandidates(
  availableModels: ModelSelection[],
  modelRatings: Array<{ modelId: string; rating: number }>,
  recommendation: { modelA: string; modelB: string; reason: string } | null
): PairCandidate[] {
  const candidates: PairCandidate[] = [];
  const seenPairKeys = new Set<string>();
  const addCandidate = (models: ModelSelection[], reason: string) => {
    if (models.length < 2) {
      return;
    }

    const pairKey = getPairKey(models);
    if (seenPairKeys.has(pairKey)) {
      return;
    }

    seenPairKeys.add(pairKey);
    candidates.push({
      pairKey,
      models,
      reason,
    });
  };

  if (recommendation) {
    const recommendedModels = [
      availableModels.find((model) => `${model.provider}:${model.model}` === recommendation.modelA),
      availableModels.find((model) => `${model.provider}:${model.model}` === recommendation.modelB),
    ].filter((model): model is ModelSelection => Boolean(model));

    if (recommendedModels.length === 2) {
      addCandidate(recommendedModels, recommendation.reason);
    }
  }

  const sortedModels = sortModelsByRating(availableModels, modelRatings);
  for (let index = 0; index < sortedModels.length; index += 1) {
    for (let innerIndex = index + 1; innerIndex < sortedModels.length; innerIndex += 1) {
      const first = sortedModels[index];
      const second = sortedModels[innerIndex];
      const reason =
        first.provider !== second.provider
          ? 'High-signal provider-diverse fallback'
          : 'High-signal fallback';
      addCandidate([first, second], reason);
    }
  }

  return candidates;
}

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
  const currentRecommendation = useArenaStore((state) => state.workflowContext.currentRecommendation);
  const recentMatchupPairKeys = useArenaStore((state) => state.workflowContext.recentMatchupPairKeys);
  const recordMatchupRecommendation = useArenaStore((state) => state.recordMatchupRecommendation);
  const clearMatchupRecommendations = useArenaStore((state) => state.clearMatchupRecommendations);
  const availableModels = useMemo(() => getAvailableModels(), [getAvailableModels]);
  const pairCandidates = useMemo(
    () => buildPairCandidates(availableModels, modelRatings, getRecommendedMatchup()),
    [availableModels, modelRatings, getRecommendedMatchup]
  );

  const selection = useMemo(() => {
    if (
      currentRecommendation?.models?.length === 2 &&
      currentRecommendation.models.every((recommendedModel) =>
        availableModels.some(
          (model) =>
            model.provider === recommendedModel.provider &&
            model.model === recommendedModel.model
        )
      )
    ) {
      return {
        models: currentRecommendation.models,
        reason: currentRecommendation.reason,
        exhaustedCycle: currentRecommendation.exhaustedCycle,
      };
    }

    const nextCandidate = pairCandidates.find(
      (candidate) => !recentMatchupPairKeys.includes(candidate.pairKey)
    );
    if (nextCandidate) {
      return {
        models: nextCandidate.models,
        reason: nextCandidate.reason,
        exhaustedCycle: false,
      };
    }

    if (pairCandidates[0]) {
      return {
        models: pairCandidates[0].models,
        reason: pairCandidates[0].reason,
        exhaustedCycle: recentMatchupPairKeys.length > 0,
      };
    }

    return {
      models: availableModels.slice(0, 2),
      reason: null,
      exhaustedCycle: false,
    };
  }, [availableModels, currentRecommendation, pairCandidates, recentMatchupPairKeys]);

  useEffect(() => {
    if (!currentRecommendation && selection.models.length >= 2 && selection.reason) {
      recordMatchupRecommendation(selection.models, selection.reason, {
        exhaustedCycle: selection.exhaustedCycle,
        maxRecentPairs: Math.max(pairCandidates.length, 1),
      });
    }
  }, [
    currentRecommendation,
    pairCandidates.length,
    recordMatchupRecommendation,
    selection.exhaustedCycle,
    selection.models,
    selection.reason,
  ]);

  const getSmartModelPair = useCallback((): ModelSelection[] => selection.models, [selection.models]);

  const rotateMatchup = useCallback((): ModelSelection[] => {
    if (pairCandidates.length === 0) {
      return [];
    }

    const nextCandidate = pairCandidates.find(
      (candidate) => !recentMatchupPairKeys.includes(candidate.pairKey)
    );

    if (nextCandidate) {
      recordMatchupRecommendation(nextCandidate.models, nextCandidate.reason, {
        maxRecentPairs: pairCandidates.length,
      });
      return nextCandidate.models;
    }

    clearMatchupRecommendations();
    const cycledCandidate = pairCandidates[0];
    recordMatchupRecommendation(cycledCandidate.models, cycledCandidate.reason, {
      exhaustedCycle: true,
      maxRecentPairs: pairCandidates.length,
    });
    return cycledCandidate.models;
  }, [
    clearMatchupRecommendations,
    pairCandidates,
    recentMatchupPairKeys,
    recordMatchupRecommendation,
  ]);

  return {
    getSmartModelPair,
    rotateMatchup,
    selectedModels: selection.models,
    availableModels,
    recommendationReason: selection.reason,
    hasExhaustedCycle: selection.exhaustedCycle,
  };
}
