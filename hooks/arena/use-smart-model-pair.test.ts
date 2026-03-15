import { act, renderHook } from '@testing-library/react';
import { useSmartModelPair } from './use-smart-model-pair';

type MockModelSelection = {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  displayName: string;
};

let mockAvailableModels: MockModelSelection[] = [];
let mockState: {
  modelRatings: Array<{ modelId: string; rating: number }>;
  getRecommendedMatchup: jest.Mock;
  workflowContext: {
    recentMatchupPairKeys: string[];
    currentRecommendation: {
      pairKey: string;
      models: MockModelSelection[];
      reason: string;
      exhaustedCycle: boolean;
      generatedAt: string;
    } | null;
  };
  recordMatchupRecommendation: jest.Mock;
  clearMatchupRecommendations: jest.Mock;
};

jest.mock('./use-arena', () => ({
  useArena: () => ({
    getAvailableModels: () => mockAvailableModels,
  }),
}));

jest.mock('@/stores/arena', () => ({
  useArenaStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

function makePairKey(models: MockModelSelection[]): string {
  return models
    .map((model) => `${model.provider}:${model.model}`)
    .sort()
    .join('::');
}

describe('useSmartModelPair', () => {
  beforeEach(() => {
    mockAvailableModels = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-5-sonnet', displayName: 'Claude 3.5 Sonnet' },
      { provider: 'google', model: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
    ];
    mockState = {
      modelRatings: [
        { modelId: 'openai:gpt-4o', rating: 1600 },
        { modelId: 'anthropic:claude-3-5-sonnet', rating: 1590 },
        { modelId: 'google:gemini-1.5-pro', rating: 1580 },
      ],
      getRecommendedMatchup: jest.fn(() => ({
        modelA: 'openai:gpt-4o',
        modelB: 'anthropic:claude-3-5-sonnet',
        reason: 'Uncertain matchup - similar ratings with few direct comparisons',
      })),
      workflowContext: {
        recentMatchupPairKeys: [],
        currentRecommendation: null,
      },
      recordMatchupRecommendation: jest.fn((models: MockModelSelection[], reason: string, options?: { exhaustedCycle?: boolean }) => {
        const recommendation = {
          pairKey: makePairKey(models),
          models,
          reason,
          exhaustedCycle: Boolean(options?.exhaustedCycle),
          generatedAt: new Date().toISOString(),
        };
        mockState.workflowContext.currentRecommendation = recommendation;
        mockState.workflowContext.recentMatchupPairKeys = options?.exhaustedCycle
          ? [recommendation.pairKey]
          : [recommendation.pairKey, ...mockState.workflowContext.recentMatchupPairKeys.filter((key) => key !== recommendation.pairKey)];
        return recommendation;
      }),
      clearMatchupRecommendations: jest.fn(() => {
        mockState.workflowContext.currentRecommendation = null;
        mockState.workflowContext.recentMatchupPairKeys = [];
      }),
    };
  });

  it('prefers the recommended matchup and exposes its rationale', () => {
    const { result, rerender } = renderHook(() => useSmartModelPair());
    rerender();

    expect(result.current.selectedModels).toEqual([
      expect.objectContaining({ provider: 'openai', model: 'gpt-4o' }),
      expect.objectContaining({ provider: 'anthropic', model: 'claude-3-5-sonnet' }),
    ]);
    expect(result.current.recommendationReason).toContain('Uncertain matchup');
  });

  it('rotates away from the most recently suggested pair and cycles deterministically', () => {
    const { result, rerender } = renderHook(() => useSmartModelPair());
    rerender();

    const initialPairKey = makePairKey(result.current.selectedModels as MockModelSelection[]);

    act(() => {
      result.current.rotateMatchup();
    });
    rerender();

    const secondPairKey = makePairKey(result.current.selectedModels as MockModelSelection[]);
    expect(secondPairKey).not.toBe(initialPairKey);

    act(() => {
      result.current.rotateMatchup();
    });
    rerender();

    const thirdPairKey = makePairKey(result.current.selectedModels as MockModelSelection[]);
    expect(new Set([initialPairKey, secondPairKey, thirdPairKey]).size).toBe(3);

    act(() => {
      result.current.rotateMatchup();
    });
    rerender();

    expect(result.current.hasExhaustedCycle).toBe(true);
    expect(makePairKey(result.current.selectedModels as MockModelSelection[])).toBe(initialPairKey);
  });
});
