/**
 * Tests for Arena Store
 */

import { act } from '@testing-library/react';
import { useArenaStore } from './arena-store';
import type { ArenaContestant, ArenaPreference } from '@/types/arena';

describe('useArenaStore', () => {
  beforeEach(() => {
    act(() => {
      useArenaStore.getState().clearAllData();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useArenaStore.getState();
      expect(state.battles).toEqual([]);
      expect(state.preferences).toEqual([]);
      expect(state.modelRatings).toEqual([]);
      expect(state.activeBattleId).toBeNull();
      expect(state.settings.enabled).toBe(true);
    });
  });

  describe('battle management', () => {
    const mockContestants: Omit<ArenaContestant, 'id' | 'response' | 'status' | 'startTime'>[] = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' },
    ];

    it('should create a new battle', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle(
          'Test prompt',
          mockContestants
        );
        battleId = battle.id;
      });

      const state = useArenaStore.getState();
      expect(state.battles).toHaveLength(1);
      expect(state.battles[0].id).toBe(battleId);
      expect(state.battles[0].prompt).toBe('Test prompt');
      expect(state.battles[0].contestants).toHaveLength(2);
      expect(state.activeBattleId).toBe(battleId);
    });

    it('should create battle with blind mode', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle(
          'Test prompt',
          mockContestants,
          { mode: 'blind' }
        );
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().battles.find(b => b.id === battleId);
      expect(battle?.mode).toBe('blind');
    });

    it('should create battle with multi-turn options', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle(
          'Test prompt',
          mockContestants,
          { conversationMode: 'multi', maxTurns: 5 }
        );
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().battles.find(b => b.id === battleId);
      expect(battle?.conversationMode).toBe('multi');
      expect(battle?.maxTurns).toBe(5);
      expect(battle?.currentTurn).toBe(1);
    });

    it('should get battle by id', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      expect(battle).toBeDefined();
      expect(battle?.prompt).toBe('Test');
    });

    it('should delete battle', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      expect(useArenaStore.getState().battles).toHaveLength(1);

      act(() => {
        useArenaStore.getState().deleteBattle(battleId);
      });

      expect(useArenaStore.getState().battles).toHaveLength(0);
    });

    it('should set active battle', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
        useArenaStore.getState().setActiveBattle(null);
      });

      expect(useArenaStore.getState().activeBattleId).toBeNull();

      act(() => {
        useArenaStore.getState().setActiveBattle(battleId);
      });

      expect(useArenaStore.getState().activeBattleId).toBe(battleId);
    });
  });

  describe('contestant updates', () => {
    const mockContestants: Omit<ArenaContestant, 'id' | 'response' | 'status' | 'startTime'>[] = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' },
    ];

    it('should update contestant status', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const contestantId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().updateContestantStatus(battleId, contestantId, 'streaming');
      });

      const updatedBattle = useArenaStore.getState().getBattle(battleId);
      expect(updatedBattle?.contestants[0].status).toBe('streaming');
    });

    it('should update contestant response', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const contestantId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().updateContestant(battleId, contestantId, { response: 'Hello world' });
      });

      const updatedBattle = useArenaStore.getState().getBattle(battleId);
      expect(updatedBattle?.contestants[0].response).toBe('Hello world');
    });

    it('should append to contestant response', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const contestantId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().updateContestant(battleId, contestantId, { response: 'Hello' });
        useArenaStore.getState().appendToContestantResponse(battleId, contestantId, ' world');
      });

      const updatedBattle = useArenaStore.getState().getBattle(battleId);
      expect(updatedBattle?.contestants[0].response).toBe('Hello world');
    });
  });

  describe('winner selection', () => {
    const mockContestants: Omit<ArenaContestant, 'id' | 'response' | 'status' | 'startTime'>[] = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' },
    ];

    it('should select winner', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const winnerId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().selectWinner(battleId, winnerId, { reason: 'quality' });
      });

      const updatedBattle = useArenaStore.getState().getBattle(battleId);
      expect(updatedBattle?.winnerId).toBe(winnerId);
      expect(updatedBattle?.winReason).toBe('quality');
      expect(updatedBattle?.completedAt).toBeDefined();
    });

    it('should declare tie', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      act(() => {
        useArenaStore.getState().declareTie(battleId, 'Both responses were equally good');
      });

      const updatedBattle = useArenaStore.getState().getBattle(battleId);
      expect(updatedBattle?.isTie).toBe(true);
      expect(updatedBattle?.notes).toBe('Both responses were equally good');
      expect(updatedBattle?.completedAt).toBeDefined();
    });

    it('should declare both bad', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      act(() => {
        useArenaStore.getState().declareBothBad(battleId, 'Neither response was satisfactory');
      });

      const updatedBattle = useArenaStore.getState().getBattle(battleId);
      expect(updatedBattle?.isBothBad).toBe(true);
      expect(updatedBattle?.notes).toBe('Neither response was satisfactory');
      expect(updatedBattle?.completedAt).toBeDefined();
    });

    it('should create preference after winner selection', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const winnerId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().selectWinner(battleId, winnerId);
      });

      const preferences = useArenaStore.getState().preferences;
      expect(preferences.length).toBeGreaterThan(0);
    });
  });

  describe('model ratings', () => {
    const mockContestants: Omit<ArenaContestant, 'id' | 'response' | 'status' | 'startTime'>[] = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' },
    ];

    it('should get model rating', () => {
      const rating = useArenaStore.getState().getModelRating('openai', 'gpt-4o');
      expect(rating).toBe(1500); // Default ELO rating
    });

    it('should update ratings after winner selection', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const winnerId = battle?.contestants[0].id || '';

      const initialWinnerRating = useArenaStore.getState().getModelRating('openai', 'gpt-4o');
      const initialLoserRating = useArenaStore.getState().getModelRating('anthropic', 'claude-3-opus');

      act(() => {
        useArenaStore.getState().selectWinner(battleId, winnerId);
      });

      const finalWinnerRating = useArenaStore.getState().getModelRating('openai', 'gpt-4o');
      const finalLoserRating = useArenaStore.getState().getModelRating('anthropic', 'claude-3-opus');

      // Winner should gain rating, loser should lose rating
      expect(finalWinnerRating).toBeGreaterThan(initialWinnerRating);
      expect(finalLoserRating).toBeLessThan(initialLoserRating);
    });

    it('should get all model ratings', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const winnerId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().selectWinner(battleId, winnerId);
      });

      const ratings = useArenaStore.getState().getAllModelRatings();
      expect(ratings.length).toBeGreaterThan(0);
    });

    it('should reset model ratings', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const winnerId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().selectWinner(battleId, winnerId);
        useArenaStore.getState().resetModelRatings();
      });

      const ratings = useArenaStore.getState().getAllModelRatings();
      expect(ratings).toEqual([]);
    });
  });

  describe('settings', () => {
    it('should update settings', () => {
      act(() => {
        useArenaStore.getState().updateSettings({ enabled: false });
      });

      expect(useArenaStore.getState().settings.enabled).toBe(false);
    });

    it('should update multiple settings', () => {
      act(() => {
        useArenaStore.getState().updateSettings({
          defaultModelCount: 4,
          preferenceLearning: false,
          defaultMode: 'blind',
        });
      });

      const settings = useArenaStore.getState().settings;
      expect(settings.defaultModelCount).toBe(4);
      expect(settings.preferenceLearning).toBe(false);
      expect(settings.defaultMode).toBe('blind');
    });
  });

  describe('data management', () => {
    const mockContestants: Omit<ArenaContestant, 'id' | 'response' | 'status' | 'startTime'>[] = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' },
    ];

    it('should clear all data', () => {
      act(() => {
        useArenaStore.getState().createBattle('Test', mockContestants);
      });

      expect(useArenaStore.getState().battles.length).toBeGreaterThan(0);

      act(() => {
        useArenaStore.getState().clearAllData();
      });

      const state = useArenaStore.getState();
      expect(state.battles).toEqual([]);
      expect(state.preferences).toEqual([]);
      expect(state.modelRatings).toEqual([]);
      expect(state.activeBattleId).toBeNull();
    });

    it('should export preferences', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle('Test', mockContestants);
        battleId = battle.id;
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      const winnerId = battle?.contestants[0].id || '';

      act(() => {
        useArenaStore.getState().selectWinner(battleId, winnerId);
      });

      const exported = useArenaStore.getState().exportPreferences();
      expect(exported).toBeDefined();
      expect(Array.isArray(exported)).toBe(true);
    });

    it('should import preferences', () => {
      const mockPreferences: ArenaPreference[] = [];

      act(() => {
        useArenaStore.getState().importPreferences(mockPreferences);
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('multi-turn support', () => {
    const mockContestants: Omit<ArenaContestant, 'id' | 'response' | 'status' | 'startTime'>[] = [
      { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o' },
      { provider: 'anthropic', model: 'claude-3-opus', displayName: 'Claude 3 Opus' },
    ];

    it('should add turn to multi-turn battle', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle(
          'Initial prompt',
          mockContestants,
          { conversationMode: 'multi', maxTurns: 5 }
        );
        battleId = battle.id;
      });

      act(() => {
        useArenaStore.getState().continueBattle(battleId, 'Follow-up message');
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      expect(battle?.currentTurn).toBe(2);
    });

    it('should not exceed max turns', () => {
      let battleId: string = '';
      act(() => {
        const battle = useArenaStore.getState().createBattle(
          'Initial prompt',
          mockContestants,
          { conversationMode: 'multi', maxTurns: 2 }
        );
        battleId = battle.id;
      });

      act(() => {
        useArenaStore.getState().continueBattle(battleId, 'Turn 2');
      });

      // Try to add turn beyond max
      act(() => {
        useArenaStore.getState().continueBattle(battleId, 'Turn 3');
      });

      const battle = useArenaStore.getState().getBattle(battleId);
      // Should stay at max turns
      expect(battle?.currentTurn).toBeLessThanOrEqual(battle?.maxTurns || 2);
    });
  });
});
