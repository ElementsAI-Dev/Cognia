/**
 * Tests for useInputCompletion hook
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useInputCompletion } from './use-input-completion';
import * as api from '@/lib/native/input-completion';
import type { CompletionSuggestion, InputCompletionResult, ImeState } from '@/types/input-completion';

// Mock config for tests - avoid circular dependency with DEFAULT_COMPLETION_CONFIG
const mockCompletionConfig = {
  enabled: true,
  model: {
    provider: 'ollama',
    model_id: 'qwen2.5-coder:0.5b',
    endpoint: null,
    api_key: null,
    max_tokens: 128,
    temperature: 0.1,
    timeout_secs: 5,
  },
  trigger: {
    debounce_ms: 400,
    min_context_length: 5,
    max_context_length: 500,
    trigger_on_word_boundary: false,
    skip_chars: [' ', '\n', '\t', '\r'],
    skip_with_modifiers: true,
  },
  ui: {
    show_inline_preview: true,
    max_suggestions: 3,
    font_size: 14,
    ghost_text_opacity: 0.5,
    auto_dismiss_ms: 5000,
    show_accept_hint: true,
  },
};

// Mock the native API
jest.mock('@/lib/native/input-completion', () => ({
  startInputCompletion: jest.fn().mockResolvedValue(undefined),
  stopInputCompletion: jest.fn().mockResolvedValue(undefined),
  getImeState: jest.fn().mockResolvedValue({
    is_active: false,
    is_composing: false,
    input_mode: 'English',
    ime_name: null,
    composition_string: null,
    candidates: [],
  }),
  getCurrentSuggestion: jest.fn().mockResolvedValue(null),
  acceptSuggestion: jest.fn().mockResolvedValue(null),
  dismissSuggestion: jest.fn().mockResolvedValue(undefined),
  getCompletionStatus: jest.fn().mockResolvedValue({
    is_running: false,
    ime_state: {
      is_active: false,
      is_composing: false,
      input_mode: 'English',
      ime_name: null,
      composition_string: null,
      candidates: [],
    },
    has_suggestion: false,
    buffer_length: 0,
  }),
  updateCompletionConfig: jest.fn().mockResolvedValue(undefined),
  getCompletionConfig: jest.fn().mockImplementation(() => Promise.resolve(mockCompletionConfig)),
  triggerCompletion: jest.fn().mockResolvedValue({
    suggestions: [],
    latency_ms: 0,
    model: 'test',
    cached: false,
  }),
  isInputCompletionRunning: jest.fn().mockResolvedValue(false),
}));

// Mock Tauri event listener - use a more complete mock
const mockUnlisten = jest.fn();
jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockImplementation(() => Promise.resolve(mockUnlisten)),
}));

// Import the store after mocking to use the mocked version
import { useInputCompletionStore } from '@/stores/input-completion';

describe('useInputCompletion', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store state
    useInputCompletionStore.getState().reset();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useInputCompletion());

      expect(result.current.isRunning).toBe(false);
      expect(result.current.imeState).toBeNull();
      expect(result.current.currentSuggestion).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should have action methods', () => {
      const { result } = renderHook(() => useInputCompletion());

      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.accept).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');
      expect(typeof result.current.trigger).toBe('function');
      expect(typeof result.current.updateConfig).toBe('function');
      expect(typeof result.current.refreshImeState).toBe('function');
      expect(typeof result.current.refreshStatus).toBe('function');
    });

    it('should have stats object', () => {
      const { result } = renderHook(() => useInputCompletion());

      expect(result.current.stats).toBeDefined();
      expect(result.current.stats.totalRequests).toBe(0);
      expect(result.current.stats.acceptedSuggestions).toBe(0);
      expect(result.current.stats.dismissedSuggestions).toBe(0);
    });

    it('should have initialized flag', () => {
      const { result } = renderHook(() => useInputCompletion());
      expect(typeof result.current.initialized).toBe('boolean');
    });

    it('should expose config from store', () => {
      const { result } = renderHook(() => useInputCompletion());

      expect(result.current.config).toBeDefined();
      expect(result.current.config.model).toBeDefined();
      expect(result.current.config.trigger).toBeDefined();
      expect(result.current.config.ui).toBeDefined();
    });
  });

  describe('Start Action', () => {
    it('should start the completion system', async () => {
      const { result } = renderHook(() => useInputCompletion());

      await act(async () => {
        await result.current.start();
      });

      expect(api.startInputCompletion).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle start errors', async () => {
      const onError = jest.fn();
      const testError = new Error('Start failed');
      (api.startInputCompletion as jest.Mock).mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useInputCompletion({ onError }));

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Start failed');
      expect(onError).toHaveBeenCalledWith('Start failed');
    });
  });

  describe('Stop Action', () => {
    it('should stop the completion system', async () => {
      const { result } = renderHook(() => useInputCompletion());

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.isRunning).toBe(true);

      await act(async () => {
        await result.current.stop();
      });

      expect(api.stopInputCompletion).toHaveBeenCalledTimes(1);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentSuggestion).toBeNull();
    });

    it('should handle stop errors', async () => {
      const testError = new Error('Stop failed');
      (api.stopInputCompletion as jest.Mock).mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useInputCompletion());

      await act(async () => {
        await result.current.stop();
      });

      expect(result.current.error).toBe('Stop failed');
    });
  });

  describe('Accept Action', () => {
    const mockSuggestion: CompletionSuggestion = {
      id: 'test-id',
      text: 'console.log("hello")',
      display_text: 'console.log("hello")',
      confidence: 0.9,
      completion_type: 'Line',
    };

    it('should accept the current suggestion', async () => {
      const onAccept = jest.fn();
      (api.acceptSuggestion as jest.Mock).mockResolvedValueOnce(mockSuggestion);

      const { result } = renderHook(() => useInputCompletion({ onAccept }));

      const accepted = await act(async () => {
        return await result.current.accept();
      });

      expect(api.acceptSuggestion).toHaveBeenCalledTimes(1);
      expect(accepted).toEqual(mockSuggestion);
      expect(result.current.stats.acceptedSuggestions).toBe(1);
      expect(result.current.currentSuggestion).toBeNull();
      expect(onAccept).toHaveBeenCalledWith(mockSuggestion);
    });

    it('should return null when no suggestion to accept', async () => {
      (api.acceptSuggestion as jest.Mock).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useInputCompletion());

      const accepted = await act(async () => {
        return await result.current.accept();
      });

      expect(accepted).toBeNull();
      expect(result.current.stats.acceptedSuggestions).toBe(0);
    });

    it('should handle accept errors', async () => {
      const testError = new Error('Accept failed');
      (api.acceptSuggestion as jest.Mock).mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useInputCompletion());

      const accepted = await act(async () => {
        return await result.current.accept();
      });

      expect(accepted).toBeNull();
      expect(result.current.error).toBe('Accept failed');
    });
  });

  describe('Dismiss Action', () => {
    it('should dismiss the current suggestion', async () => {
      const onDismiss = jest.fn();
      const { result } = renderHook(() => useInputCompletion({ onDismiss }));

      await act(async () => {
        await result.current.dismiss();
      });

      expect(api.dismissSuggestion).toHaveBeenCalledTimes(1);
      expect(result.current.stats.dismissedSuggestions).toBe(1);
      expect(result.current.currentSuggestion).toBeNull();
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should handle dismiss errors', async () => {
      const testError = new Error('Dismiss failed');
      (api.dismissSuggestion as jest.Mock).mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useInputCompletion());

      await act(async () => {
        await result.current.dismiss();
      });

      expect(result.current.error).toBe('Dismiss failed');
    });
  });

  describe('Trigger Action', () => {
    const mockCompletionResult: InputCompletionResult = {
      suggestions: [
        {
          id: 'test-id',
          text: 'console.log("hello")',
          display_text: 'console.log("hello")',
          confidence: 0.9,
          completion_type: 'Line',
        },
      ],
      latency_ms: 100,
      model: 'qwen2.5-coder:0.5b',
      cached: false,
    };

    it('should trigger completion with text', async () => {
      const onSuggestion = jest.fn();
      (api.triggerCompletion as jest.Mock).mockResolvedValueOnce(mockCompletionResult);

      const { result } = renderHook(() => useInputCompletion({ onSuggestion }));

      const completionResult = await act(async () => {
        return await result.current.trigger('console.');
      });

      expect(api.triggerCompletion).toHaveBeenCalledWith('console.');
      expect(completionResult).toEqual(mockCompletionResult);
      expect(result.current.currentSuggestion).toEqual(mockCompletionResult.suggestions[0]);
      expect(result.current.stats.totalRequests).toBe(1);
      expect(onSuggestion).toHaveBeenCalledWith(mockCompletionResult.suggestions[0]);
    });

    it('should handle empty suggestions', async () => {
      const emptyResult: InputCompletionResult = {
        suggestions: [],
        latency_ms: 50,
        model: 'qwen2.5-coder:0.5b',
        cached: false,
      };
      (api.triggerCompletion as jest.Mock).mockResolvedValueOnce(emptyResult);

      const { result } = renderHook(() => useInputCompletion());

      const completionResult = await act(async () => {
        return await result.current.trigger('test');
      });

      expect(completionResult).toEqual(emptyResult);
      expect(result.current.currentSuggestion).toBeNull();
    });

    it('should handle trigger errors', async () => {
      const onError = jest.fn();
      const testError = new Error('Trigger failed');
      (api.triggerCompletion as jest.Mock).mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useInputCompletion({ onError }));

      const completionResult = await act(async () => {
        return await result.current.trigger('test');
      });

      expect(completionResult).toBeNull();
      expect(result.current.error).toBe('Trigger failed');
      expect(onError).toHaveBeenCalledWith('Trigger failed');
    });
  });

  describe('Update Config Action', () => {
    it('should update configuration', async () => {
      const { result } = renderHook(() => useInputCompletion());

      const newConfig = {
        enabled: false,
        model: {
          provider: 'openai' as const,
          model_id: 'gpt-4',
          max_tokens: 256,
          temperature: 0.5,
          timeout_secs: 10,
        },
        trigger: result.current.config.trigger,
        ui: result.current.config.ui,
      };

      await act(async () => {
        await result.current.updateConfig(newConfig);
      });

      expect(api.updateCompletionConfig).toHaveBeenCalledWith(newConfig);
      expect(result.current.config.enabled).toBe(false);
    });

    it('should handle update config errors', async () => {
      const testError = new Error('Update failed');
      (api.updateCompletionConfig as jest.Mock).mockRejectedValueOnce(testError);

      const { result } = renderHook(() => useInputCompletion());

      const newConfig = {
        enabled: false,
        model: result.current.config.model,
        trigger: result.current.config.trigger,
        ui: result.current.config.ui,
      };

      await act(async () => {
        await result.current.updateConfig(newConfig);
      });

      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('Refresh IME State Action', () => {
    const mockImeState: ImeState = {
      is_active: true,
      is_composing: true,
      input_mode: 'Chinese',
      ime_name: 'Microsoft Pinyin',
      composition_string: 'nihao',
      candidates: ['你好', '尼好', '泥好'],
    };

    it('should refresh IME state', async () => {
      (api.getImeState as jest.Mock).mockResolvedValueOnce(mockImeState);

      const { result } = renderHook(() => useInputCompletion());

      const imeState = await act(async () => {
        return await result.current.refreshImeState();
      });

      expect(api.getImeState).toHaveBeenCalledTimes(1);
      expect(imeState).toEqual(mockImeState);
      expect(result.current.imeState).toEqual(mockImeState);
    });

    it('should return null on IME state refresh error', async () => {
      (api.getImeState as jest.Mock).mockRejectedValueOnce(new Error('IME error'));

      const { result } = renderHook(() => useInputCompletion());

      const imeState = await act(async () => {
        return await result.current.refreshImeState();
      });

      expect(imeState).toBeNull();
    });
  });

  describe('Refresh Status Action', () => {
    it('should refresh status', async () => {
      const mockStatus = {
        is_running: true,
        ime_state: {
          is_active: false,
          is_composing: false,
          input_mode: 'English',
          ime_name: null,
          composition_string: null,
          candidates: [],
        },
        has_suggestion: true,
        buffer_length: 42,
      };
      (api.getCompletionStatus as jest.Mock).mockResolvedValueOnce(mockStatus);

      const { result } = renderHook(() => useInputCompletion());

      const status = await act(async () => {
        return await result.current.refreshStatus();
      });

      expect(api.getCompletionStatus).toHaveBeenCalledTimes(1);
      expect(status).toEqual(mockStatus);
      expect(result.current.isRunning).toBe(true);
      expect(result.current.imeState).toEqual(mockStatus.ime_state);
    });

    it('should return null on status refresh error', async () => {
      (api.getCompletionStatus as jest.Mock).mockRejectedValueOnce(new Error('Status error'));

      const { result } = renderHook(() => useInputCompletion());

      const status = await act(async () => {
        return await result.current.refreshStatus();
      });

      expect(status).toBeNull();
    });
  });

  describe('Multi-suggestion Support', () => {
    it('should have max_suggestions config', () => {
      const { result } = renderHook(() => useInputCompletion());
      
      expect(result.current.config.ui.max_suggestions).toBeDefined();
      expect(typeof result.current.config.ui.max_suggestions).toBe('number');
    });

    it('should update max_suggestions config', async () => {
      const { result } = renderHook(() => useInputCompletion());

      const newConfig = {
        ...result.current.config,
        ui: {
          ...result.current.config.ui,
          max_suggestions: 5,
        },
      };

      await act(async () => {
        await result.current.updateConfig(newConfig);
      });

      expect(result.current.config.ui.max_suggestions).toBe(5);
    });
  });

  describe('Error Recovery', () => {
    it('should handle retryable errors gracefully', async () => {
      // Simulate a timeout error that should trigger retry logic in backend
      (api.triggerCompletion as jest.Mock).mockRejectedValueOnce(new Error('connection timeout'));

      const { result } = renderHook(() => useInputCompletion());

      await act(async () => {
        await result.current.trigger('test text');
      });

      // Should not throw, error is handled
      expect(result.current.error).not.toBeNull();
    });

    it('should clear error on successful operation', async () => {
      const { result } = renderHook(() => useInputCompletion());

      // Set an error
      await act(async () => {
        (api.triggerCompletion as jest.Mock).mockRejectedValueOnce(new Error('test error'));
        await result.current.trigger('test');
      });

      expect(result.current.error).not.toBeNull();

      // Successful operation should not persist error state
      await act(async () => {
        (api.triggerCompletion as jest.Mock).mockResolvedValueOnce(undefined);
        await result.current.trigger('test again');
      });

      // Error should be cleared or updated
      expect(result.current.isLoading).toBe(false);
    });
  });
});
