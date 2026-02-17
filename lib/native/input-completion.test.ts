/**
 * Tests for input completion native API
 */

// Mock Tauri invoke
const mockInvoke = jest.fn();
jest.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));

import * as api from './input-completion';
import { DEFAULT_COMPLETION_SETTINGS } from '@/types/chat/input-completion';

describe('input-completion API', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('startInputCompletion', () => {
    it('should call the correct Tauri command', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.startInputCompletion();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_start');
    });
  });

  describe('stopInputCompletion', () => {
    it('should call the correct Tauri command', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.stopInputCompletion();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_stop');
    });
  });

  describe('getImeState', () => {
    it('should return IME state', async () => {
      const mockState = {
        is_active: true,
        is_composing: false,
        input_mode: 'Chinese',
        ime_name: 'Microsoft Pinyin',
        composition_string: null,
        candidates: [],
      };
      mockInvoke.mockResolvedValue(mockState);

      const result = await api.getImeState();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_get_ime_state');
      expect(result).toEqual(mockState);
    });
  });

  describe('getCurrentSuggestion', () => {
    it('should return current suggestion when available', async () => {
      const mockSuggestion = {
        text: 'hello world',
        display_text: 'hello world',
        confidence: 0.9,
        completion_type: 'Line',
        id: 'test-id',
      };
      mockInvoke.mockResolvedValue(mockSuggestion);

      const result = await api.getCurrentSuggestion();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_get_suggestion');
      expect(result).toEqual(mockSuggestion);
    });

    it('should return null when no suggestion', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await api.getCurrentSuggestion();
      expect(result).toBeNull();
    });
  });

  describe('acceptSuggestion', () => {
    it('should call accept command and return suggestion', async () => {
      const mockSuggestion = {
        text: 'accepted text',
        display_text: 'accepted text',
        confidence: 0.85,
        completion_type: 'Line',
        id: 'accept-id',
      };
      mockInvoke.mockResolvedValue(mockSuggestion);

      const result = await api.acceptSuggestion();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_accept');
      expect(result).toEqual(mockSuggestion);
    });
  });

  describe('acceptSuggestionV2', () => {
    it('should call v2 accept command with suggestion ref', async () => {
      const mockSuggestion = {
        text: 'accepted text',
        display_text: 'accepted text',
        confidence: 0.85,
        completion_type: 'Line',
        id: 'accept-id',
      };
      mockInvoke.mockResolvedValue(mockSuggestion);

      const result = await api.acceptSuggestionV2({ suggestion_id: 'accept-id' });
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_accept_v2', {
        suggestion: { suggestion_id: 'accept-id' },
      });
      expect(result).toEqual(mockSuggestion);
    });
  });

  describe('dismissSuggestion', () => {
    it('should call dismiss command', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await api.dismissSuggestion();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_dismiss');
    });
  });

  describe('dismissSuggestionV2', () => {
    it('should call v2 dismiss command', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await api.dismissSuggestionV2({ suggestion_id: 'dismiss-id' });
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_dismiss_v2', {
        suggestion: { suggestion_id: 'dismiss-id' },
      });
      expect(result).toBe(true);
    });
  });

  describe('getCompletionStatus', () => {
    it('should return completion status', async () => {
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
        buffer_length: 10,
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await api.getCompletionStatus();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_get_status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('updateCompletionConfig', () => {
    it('should call update config with provided config', async () => {
      const mockConfig = {
        enabled: true,
        model: {
          provider: 'ollama' as const,
          model_id: 'qwen2.5-coder:0.5b',
          max_tokens: 128,
          temperature: 0.1,
          timeout_secs: 5,
        },
        trigger: {
          debounce_ms: 400,
          min_context_length: 5,
          max_context_length: 500,
          trigger_on_word_boundary: false,
          skip_chars: [' ', '\n'],
          skip_with_modifiers: true,
        },
        ui: {
          show_inline_preview: true,
          max_suggestions: 1,
          font_size: 14,
          ghost_text_opacity: 0.5,
          auto_dismiss_ms: 5000,
          show_accept_hint: true,
        },
      };
      mockInvoke.mockResolvedValue(undefined);

      await api.updateCompletionConfig(mockConfig);
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_update_config', {
        config: mockConfig,
      });
    });
  });

  describe('getCompletionConfig', () => {
    it('should return current config', async () => {
      const mockConfig = {
        enabled: true,
        model: {
          provider: 'ollama',
          model_id: 'test-model',
          max_tokens: 64,
          temperature: 0.2,
          timeout_secs: 3,
        },
        trigger: {
          debounce_ms: 300,
          min_context_length: 3,
          max_context_length: 200,
          trigger_on_word_boundary: true,
          skip_chars: [],
          skip_with_modifiers: false,
        },
        ui: {
          show_inline_preview: false,
          max_suggestions: 3,
          font_size: 12,
          ghost_text_opacity: 0.7,
          auto_dismiss_ms: 0,
          show_accept_hint: false,
        },
      };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await api.getCompletionConfig();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_get_config');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('triggerCompletion', () => {
    it('should trigger completion with text and return result', async () => {
      const mockResult = {
        suggestions: [
          {
            text: 'completion',
            display_text: 'completion',
            confidence: 0.8,
            completion_type: 'Line',
            id: 'result-id',
          },
        ],
        latency_ms: 150,
        model: 'test-model',
        cached: false,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await api.triggerCompletion('test input');
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_trigger', {
        text: 'test input',
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('triggerCompletionV2', () => {
    it('should trigger completion with v2 request', async () => {
      const mockResult = {
        request_id: 'req-1',
        surface: 'chat_input',
        mode: 'chat',
        suggestions: [],
        latency_ms: 80,
        model: 'test-model',
        cached: false,
      };
      mockInvoke.mockResolvedValue(mockResult);

      const request = {
        request_id: 'req-1',
        text: 'hello',
        mode: 'chat' as const,
        surface: 'chat_input' as const,
      };

      const result = await api.triggerCompletionV2(request);
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_trigger_v2', { request });
      expect(result).toEqual(mockResult);
    });
  });

  describe('isInputCompletionRunning', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should return true when running', async () => {
      mockInvoke.mockResolvedValue(true);

      const { isInputCompletionRunning } = await import('./input-completion');
      const result = await isInputCompletionRunning();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_is_running');
      expect(result).toBe(true);
    });

    it('should return false when not running', async () => {
      mockInvoke.mockResolvedValue(false);

      const { isInputCompletionRunning } = await import('./input-completion');
      const result = await isInputCompletionRunning();
      expect(mockInvoke).toHaveBeenCalledWith('input_completion_is_running');
      expect(result).toBe(false);
    });
  });

  describe('settings sync adapters', () => {
    it('maps unified settings to native config with local-only trigger mode', () => {
      const mapped = api.mapSettingsToCompletionConfig({
        ...DEFAULT_COMPLETION_SETTINGS,
        aiCompletionEnabled: true,
        aiCompletionProvider: 'auto',
        aiCompletionDebounce: 250,
        aiCompletionMaxTokens: 96,
      });

      expect(mapped.enabled).toBe(true);
      expect(mapped.model.provider).toBe('auto');
      expect(mapped.trigger.debounce_ms).toBe(250);
      expect(mapped.trigger.input_capture_mode).toBe('local_only');
      expect(mapped.model.max_tokens).toBe(96);
    });

    it('syncs unified settings through input_completion_update_config', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await api.syncCompletionSettings({
        ...DEFAULT_COMPLETION_SETTINGS,
        aiCompletionEnabled: true,
        aiCompletionProvider: 'groq',
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'input_completion_update_config',
        expect.objectContaining({
          config: expect.objectContaining({
            enabled: true,
            model: expect.objectContaining({ provider: 'groq' }),
          }),
        })
      );
    });
  });
});
