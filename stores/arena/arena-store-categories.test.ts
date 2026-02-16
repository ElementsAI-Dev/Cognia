/**
 * Tests for category-specific BT recalculation in arena store
 * Verifies that recalculateBTRatings populates categoryRatings and categoryBtScores
 */

import { act } from '@testing-library/react';
import { useArenaStore } from './arena-store';
import type { ArenaPreference } from '@/types/arena';

describe('useArenaStore - recalculateBTRatings categories', () => {
  beforeEach(() => {
    act(() => {
      useArenaStore.getState().clearAllData();
    });
  });

  it('should populate categoryRatings when preferences have taskCategory', () => {
    // Add preferences with category
    const preferences: ArenaPreference[] = [
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        taskCategory: 'coding',
        timestamp: new Date(),
      },
      {
        id: 'p2',
        battleId: 'b2',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        taskCategory: 'coding',
        timestamp: new Date(),
      },
      {
        id: 'p3',
        battleId: 'b3',
        winner: 'anthropic:claude-sonnet-4-20250514',
        loser: 'openai:gpt-4o',
        taskCategory: 'coding',
        timestamp: new Date(),
      },
    ];

    act(() => {
      useArenaStore.setState({ preferences });
      useArenaStore.getState().recalculateBTRatings();
    });

    const ratings = useArenaStore.getState().modelRatings;
    expect(ratings.length).toBeGreaterThanOrEqual(2);

    // Both models should have coding category rating
    const gpt4o = ratings.find((r) => r.modelId === 'openai:gpt-4o');
    const claude = ratings.find((r) => r.modelId === 'anthropic:claude-sonnet-4-20250514');

    expect(gpt4o).toBeDefined();
    expect(claude).toBeDefined();
    expect(gpt4o!.categoryRatings.coding).toBeDefined();
    expect(claude!.categoryRatings.coding).toBeDefined();
    expect(gpt4o!.categoryBtScores?.coding).toBeDefined();
    expect(claude!.categoryBtScores?.coding).toBeDefined();
  });

  it('should handle multiple categories independently', () => {
    const preferences: ArenaPreference[] = [
      // Coding preferences
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        taskCategory: 'coding',
        timestamp: new Date(),
      },
      {
        id: 'p2',
        battleId: 'b2',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        taskCategory: 'coding',
        timestamp: new Date(),
      },
      // Math preferences (reversed winner)
      {
        id: 'p3',
        battleId: 'b3',
        winner: 'anthropic:claude-sonnet-4-20250514',
        loser: 'openai:gpt-4o',
        taskCategory: 'math',
        timestamp: new Date(),
      },
      {
        id: 'p4',
        battleId: 'b4',
        winner: 'anthropic:claude-sonnet-4-20250514',
        loser: 'openai:gpt-4o',
        taskCategory: 'math',
        timestamp: new Date(),
      },
    ];

    act(() => {
      useArenaStore.setState({ preferences });
      useArenaStore.getState().recalculateBTRatings();
    });

    const ratings = useArenaStore.getState().modelRatings;
    const gpt4o = ratings.find((r) => r.modelId === 'openai:gpt-4o');
    const claude = ratings.find((r) => r.modelId === 'anthropic:claude-sonnet-4-20250514');

    expect(gpt4o).toBeDefined();
    expect(claude).toBeDefined();

    // Both should have coding and math categories
    expect(gpt4o!.categoryRatings.coding).toBeDefined();
    expect(gpt4o!.categoryRatings.math).toBeDefined();
    expect(claude!.categoryRatings.coding).toBeDefined();
    expect(claude!.categoryRatings.math).toBeDefined();
  });

  it('should skip categories with fewer than 2 preferences', () => {
    const preferences: ArenaPreference[] = [
      // Only 1 coding preference - should be skipped
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        taskCategory: 'coding',
        timestamp: new Date(),
      },
      // 2 math preferences - should be processed
      {
        id: 'p2',
        battleId: 'b2',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        taskCategory: 'math',
        timestamp: new Date(),
      },
      {
        id: 'p3',
        battleId: 'b3',
        winner: 'anthropic:claude-sonnet-4-20250514',
        loser: 'openai:gpt-4o',
        taskCategory: 'math',
        timestamp: new Date(),
      },
    ];

    act(() => {
      useArenaStore.setState({ preferences });
      useArenaStore.getState().recalculateBTRatings();
    });

    const ratings = useArenaStore.getState().modelRatings;
    const gpt4o = ratings.find((r) => r.modelId === 'openai:gpt-4o');

    expect(gpt4o).toBeDefined();
    // coding should not be populated (only 1 preference)
    expect(gpt4o!.categoryRatings.coding).toBeUndefined();
    // math should be populated (2 preferences)
    expect(gpt4o!.categoryRatings.math).toBeDefined();
  });

  it('should not crash when preferences have no taskCategory', () => {
    const preferences: ArenaPreference[] = [
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        timestamp: new Date(),
      },
      {
        id: 'p2',
        battleId: 'b2',
        winner: 'anthropic:claude-sonnet-4-20250514',
        loser: 'openai:gpt-4o',
        timestamp: new Date(),
      },
    ];

    act(() => {
      useArenaStore.setState({ preferences });
      useArenaStore.getState().recalculateBTRatings();
    });

    const ratings = useArenaStore.getState().modelRatings;
    expect(ratings.length).toBe(2);

    // No category ratings should be set
    const gpt4o = ratings.find((r) => r.modelId === 'openai:gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(Object.keys(gpt4o!.categoryRatings)).toHaveLength(0);
  });

  it('should do nothing when preferences are empty', () => {
    act(() => {
      useArenaStore.setState({ preferences: [] });
      useArenaStore.getState().recalculateBTRatings();
    });

    const ratings = useArenaStore.getState().modelRatings;
    expect(ratings).toEqual([]);
  });
});
