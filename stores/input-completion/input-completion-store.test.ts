/**
 * Tests for input completion store
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useInputCompletionStore } from './input-completion-store';
import { DEFAULT_COMPLETION_CONFIG, SUGGESTION_SHORTCUTS, SuggestionNavigationState } from '@/types/input-completion';

describe('useInputCompletionStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useInputCompletionStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useInputCompletionStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.imeState).toBeNull();
      expect(state.currentSuggestion).toBeNull();
      expect(state.config).toEqual(DEFAULT_COMPLETION_CONFIG);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.stats.totalRequests).toBe(0);
      expect(state.stats.acceptedSuggestions).toBe(0);
      expect(state.stats.dismissedSuggestions).toBe(0);
    });
  });

  describe('setIsRunning', () => {
    it('should update isRunning state', () => {
      useInputCompletionStore.getState().setIsRunning(true);
      expect(useInputCompletionStore.getState().isRunning).toBe(true);

      useInputCompletionStore.getState().setIsRunning(false);
      expect(useInputCompletionStore.getState().isRunning).toBe(false);
    });
  });

  describe('setImeState', () => {
    it('should update IME state', () => {
      const imeState = {
        is_active: true,
        is_composing: true,
        input_mode: 'Chinese' as const,
        ime_name: 'Test IME',
        composition_string: 'ni hao',
        candidates: ['你好', '泥好'],
      };

      useInputCompletionStore.getState().setImeState(imeState);
      expect(useInputCompletionStore.getState().imeState).toEqual(imeState);
    });

    it('should handle null IME state', () => {
      useInputCompletionStore.getState().setImeState(null);
      expect(useInputCompletionStore.getState().imeState).toBeNull();
    });
  });

  describe('setCurrentSuggestion', () => {
    it('should update current suggestion', () => {
      const suggestion = {
        text: 'test suggestion',
        display_text: 'test suggestion',
        confidence: 0.9,
        completion_type: 'Line' as const,
        id: 'test-id',
      };

      useInputCompletionStore.getState().setCurrentSuggestion(suggestion);
      expect(useInputCompletionStore.getState().currentSuggestion).toEqual(suggestion);
    });

    it('should handle null suggestion', () => {
      useInputCompletionStore.getState().setCurrentSuggestion(null);
      expect(useInputCompletionStore.getState().currentSuggestion).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should partially update config', () => {
      useInputCompletionStore.getState().updateConfig({ enabled: false });
      expect(useInputCompletionStore.getState().config.enabled).toBe(false);
      // Other config should remain unchanged
      expect(useInputCompletionStore.getState().config.model).toEqual(
        DEFAULT_COMPLETION_CONFIG.model
      );
    });
  });

  describe('setConfig', () => {
    it('should replace entire config', () => {
      const newConfig = {
        ...DEFAULT_COMPLETION_CONFIG,
        enabled: false,
        model: {
          ...DEFAULT_COMPLETION_CONFIG.model,
          model_id: 'custom-model',
        },
      };

      useInputCompletionStore.getState().setConfig(newConfig);
      expect(useInputCompletionStore.getState().config).toEqual(newConfig);
    });
  });

  describe('setIsLoading', () => {
    it('should update loading state', () => {
      useInputCompletionStore.getState().setIsLoading(true);
      expect(useInputCompletionStore.getState().isLoading).toBe(true);
    });
  });

  describe('setError', () => {
    it('should update error state', () => {
      useInputCompletionStore.getState().setError('Test error');
      expect(useInputCompletionStore.getState().error).toBe('Test error');
    });

    it('should clear error with null', () => {
      useInputCompletionStore.getState().setError('Test error');
      useInputCompletionStore.getState().setError(null);
      expect(useInputCompletionStore.getState().error).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update running and IME state from status', () => {
      const status = {
        is_running: true,
        ime_state: {
          is_active: true,
          is_composing: false,
          input_mode: 'English' as const,
          ime_name: null,
          composition_string: null,
          candidates: [],
        },
        has_suggestion: false,
        buffer_length: 5,
      };

      useInputCompletionStore.getState().updateStatus(status);
      expect(useInputCompletionStore.getState().isRunning).toBe(true);
      expect(useInputCompletionStore.getState().imeState).toEqual(status.ime_state);
    });
  });

  describe('stats operations', () => {
    it('should increment accepted suggestions', () => {
      useInputCompletionStore.getState().incrementAccepted();
      expect(useInputCompletionStore.getState().stats.acceptedSuggestions).toBe(1);

      useInputCompletionStore.getState().incrementAccepted();
      expect(useInputCompletionStore.getState().stats.acceptedSuggestions).toBe(2);
    });

    it('should increment dismissed suggestions', () => {
      useInputCompletionStore.getState().incrementDismissed();
      expect(useInputCompletionStore.getState().stats.dismissedSuggestions).toBe(1);
    });

    it('should increment total requests', () => {
      useInputCompletionStore.getState().incrementRequests();
      expect(useInputCompletionStore.getState().stats.totalRequests).toBe(1);
    });

    it('should reset stats', () => {
      useInputCompletionStore.getState().incrementAccepted();
      useInputCompletionStore.getState().incrementDismissed();
      useInputCompletionStore.getState().incrementRequests();

      useInputCompletionStore.getState().resetStats();
      const stats = useInputCompletionStore.getState().stats;
      expect(stats.totalRequests).toBe(0);
      expect(stats.acceptedSuggestions).toBe(0);
      expect(stats.dismissedSuggestions).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Modify state
      useInputCompletionStore.getState().setIsRunning(true);
      useInputCompletionStore.getState().setError('error');
      useInputCompletionStore.getState().incrementAccepted();

      // Reset
      useInputCompletionStore.getState().reset();

      // Verify reset
      const state = useInputCompletionStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.error).toBeNull();
      expect(state.stats.acceptedSuggestions).toBe(0);
    });
  });

  describe('multi-suggestion navigation types', () => {
    it('should verify SuggestionNavigationState structure', () => {
      const navState: SuggestionNavigationState = {
        suggestions: [
          {
            text: 'suggestion 1',
            display_text: 'suggestion 1',
            confidence: 0.9,
            completion_type: 'Line',
            id: 'id-1',
          },
          {
            text: 'suggestion 2',
            display_text: 'suggestion 2',
            confidence: 0.8,
            completion_type: 'Line',
            id: 'id-2',
          },
        ],
        selectedIndex: 0,
        totalCount: 2,
      };

      expect(navState.suggestions).toHaveLength(2);
      expect(navState.selectedIndex).toBe(0);
      expect(navState.totalCount).toBe(2);
    });

    it('should verify SUGGESTION_SHORTCUTS values', () => {
      expect(SUGGESTION_SHORTCUTS.accept).toBe('Tab');
      expect(SUGGESTION_SHORTCUTS.dismiss).toBe('Escape');
      expect(SUGGESTION_SHORTCUTS.next).toBe('Alt+]');
      expect(SUGGESTION_SHORTCUTS.prev).toBe('Alt+[');
    });
  });

  describe('config with max_suggestions', () => {
    it('should have default max_suggestions of 3', () => {
      const state = useInputCompletionStore.getState();
      expect(state.config.ui.max_suggestions).toBe(3);
    });

    it('should update max_suggestions config', () => {
      useInputCompletionStore.getState().updateConfig({
        ui: {
          ...DEFAULT_COMPLETION_CONFIG.ui,
          max_suggestions: 5,
        },
      });
      expect(useInputCompletionStore.getState().config.ui.max_suggestions).toBe(5);
    });
  });

  describe('persistence', () => {
    it('should only persist stats, not config or runtime state', () => {
      // Modify config and stats
      useInputCompletionStore.getState().updateConfig({ enabled: false });
      useInputCompletionStore.getState().setIsRunning(true);
      useInputCompletionStore.getState().setError('test error');
      useInputCompletionStore.getState().incrementAccepted();
      useInputCompletionStore.getState().incrementRequests();

      // After reset, config should be default (not persisted)
      useInputCompletionStore.getState().reset();
      const state = useInputCompletionStore.getState();

      // Config should reset to defaults (not persisted)
      expect(state.config).toEqual(DEFAULT_COMPLETION_CONFIG);
      // Runtime state should reset
      expect(state.isRunning).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
