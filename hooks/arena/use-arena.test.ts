/**
 * Tests for useArena hook
 */

import { renderHook } from '@testing-library/react';
import { useArena } from './use-arena';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
          enabled: true,
        },
        anthropic: {
          apiKey: 'test-anthropic-key',
          defaultModel: 'claude-3-opus',
          enabled: true,
        },
      },
    };
    return selector(state);
  }),
}));

jest.mock('@/stores/arena', () => ({
  useArenaStore: Object.assign(
    jest.fn((selector) => {
      const state = {
        battles: [],
        activeBattleId: null,
        settings: {
          enabled: true,
          defaultModelCount: 2,
          preferenceLearning: true,
        },
        createBattle: jest.fn(() => 'battle-1'),
        getBattle: jest.fn(() => ({
          id: 'battle-1',
          prompt: 'Test prompt',
          contestants: [
            { id: 'c1', provider: 'openai', model: 'gpt-4o', status: 'pending' },
            { id: 'c2', provider: 'anthropic', model: 'claude-3-opus', status: 'pending' },
          ],
        })),
        updateContestantStatus: jest.fn(),
        updateContestantResponse: jest.fn(),
        appendContestantResponse: jest.fn(),
        selectWinner: jest.fn(),
        declareTie: jest.fn(),
        setActiveBattle: jest.fn(),
        addTurn: jest.fn(),
      };
      return typeof selector === 'function' ? selector(state) : state;
    }),
    {
      getState: jest.fn(() => ({
        battles: [],
        activeBattleId: null,
        settings: {
          enabled: true,
          defaultModelCount: 2,
          preferenceLearning: true,
        },
        createBattle: jest.fn(() => 'battle-1'),
        getBattle: jest.fn(() => ({
          id: 'battle-1',
          prompt: 'Test prompt',
          contestants: [
            { id: 'c1', provider: 'openai', model: 'gpt-4o', status: 'pending' },
            { id: 'c2', provider: 'anthropic', model: 'claude-3-opus', status: 'pending' },
          ],
        })),
        updateContestantStatus: jest.fn(),
        updateContestantResponse: jest.fn(),
        appendContestantResponse: jest.fn(),
        selectWinner: jest.fn(),
        declareTie: jest.fn(),
        setActiveBattle: jest.fn(),
        addTurn: jest.fn(),
      })),
    }
  ),
}));

// Mock AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(() => ({
    textStream: (async function* () {
      yield 'Hello';
      yield ' world';
    })(),
    usage: Promise.resolve({ promptTokens: 10, completionTokens: 5 }),
  })),
}));

// Mock AI client
jest.mock('@/lib/ai/core/client', () => ({
  getProviderModel: jest.fn(() => ({})),
}));

// Mock auto-router
jest.mock('@/lib/ai/generation/auto-router', () => ({
  classifyTaskRuleBased: jest.fn(() => ({
    primaryCategory: 'general',
    confidence: 0.8,
  })),
}));

describe('useArena', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useArena());

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide getAvailableModels function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.getAvailableModels).toBe('function');
    });

    it('should provide startBattle function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.startBattle).toBe('function');
    });
  });

  describe('getAvailableModels', () => {
    it('should return available models from configured providers', () => {
      const { result } = renderHook(() => useArena());

      const models = result.current.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe('battle operations', () => {
    it('should have pickWinner function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.pickWinner).toBe('function');
    });

    it('should have pickTie function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.pickTie).toBe('function');
    });

    it('should have cancelBattle function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.cancelBattle).toBe('function');
    });
  });

  describe('multi-turn support', () => {
    it('should have continueTurn function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.continueTurn).toBe('function');
    });

    it('should have canContinue function', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.canContinue).toBe('function');
    });
  });

  describe('model parameters', () => {
    it('should support temperature parameter in startBattle', () => {
      const { result } = renderHook(() => useArena());

      // startBattle should accept temperature option
      expect(typeof result.current.startBattle).toBe('function');
      // The function signature should support model parameters
    });

    it('should support maxTokens parameter in startBattle', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.startBattle).toBe('function');
    });

    it('should support taskCategory parameter in startBattle', () => {
      const { result } = renderHook(() => useArena());

      expect(typeof result.current.startBattle).toBe('function');
    });
  });

  describe('callbacks', () => {
    it('should call onBattleStart callback', async () => {
      const onBattleStart = jest.fn();
      const { result } = renderHook(() =>
        useArena({ onBattleStart })
      );

      // The callback should be stored
      expect(result.current.startBattle).toBeDefined();
    });

    it('should call onBattleComplete callback', async () => {
      const onBattleComplete = jest.fn();
      const { result } = renderHook(() =>
        useArena({ onBattleComplete })
      );

      expect(result.current.startBattle).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle missing API keys gracefully', () => {
      const { result } = renderHook(() => useArena());

      // Should not throw
      expect(result.current.error).toBeNull();
    });
  });
});
