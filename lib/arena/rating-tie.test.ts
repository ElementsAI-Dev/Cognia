/**
 * Tests for preferencesToMatchups with tie propagation
 * Covers the fix where isTie was hardcoded to false instead of reading from ArenaPreference
 */

import { preferencesToMatchups } from './rating';
import type { ArenaPreference } from '@/types/arena';

describe('preferencesToMatchups tie handling', () => {
  it('should propagate isTie: true from preference', () => {
    const preferences: ArenaPreference[] = [
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'openai:gpt-4o',
        loser: 'anthropic:claude-sonnet-4-20250514',
        isTie: true,
        timestamp: new Date(),
      },
    ];
    const matchups = preferencesToMatchups(preferences);
    expect(matchups).toHaveLength(1);
    expect(matchups[0].isTie).toBe(true);
  });

  it('should propagate isTie: false from preference', () => {
    const preferences: ArenaPreference[] = [
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'a',
        loser: 'b',
        isTie: false,
        timestamp: new Date(),
      },
    ];
    const matchups = preferencesToMatchups(preferences);
    expect(matchups[0].isTie).toBe(false);
  });

  it('should default to false when isTie is undefined', () => {
    const preferences: ArenaPreference[] = [
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'a',
        loser: 'b',
        timestamp: new Date(),
      },
    ];
    const matchups = preferencesToMatchups(preferences);
    expect(matchups[0].isTie).toBe(false);
  });

  it('should handle mixed tie and non-tie preferences', () => {
    const preferences: ArenaPreference[] = [
      { id: 'p1', battleId: 'b1', winner: 'a', loser: 'b', isTie: true, timestamp: new Date() },
      { id: 'p2', battleId: 'b2', winner: 'c', loser: 'd', isTie: false, timestamp: new Date() },
      { id: 'p3', battleId: 'b3', winner: 'e', loser: 'f', timestamp: new Date() },
    ];
    const matchups = preferencesToMatchups(preferences);
    expect(matchups[0].isTie).toBe(true);
    expect(matchups[1].isTie).toBe(false);
    expect(matchups[2].isTie).toBe(false);
  });

  it('should preserve winner and loser fields alongside isTie', () => {
    const preferences: ArenaPreference[] = [
      {
        id: 'p1',
        battleId: 'b1',
        winner: 'openai:gpt-4o',
        loser: 'google:gemini-2.0-flash-exp',
        isTie: true,
        timestamp: new Date(),
      },
    ];
    const matchups = preferencesToMatchups(preferences);
    expect(matchups[0]).toEqual({
      winner: 'openai:gpt-4o',
      loser: 'google:gemini-2.0-flash-exp',
      isTie: true,
    });
  });
});
