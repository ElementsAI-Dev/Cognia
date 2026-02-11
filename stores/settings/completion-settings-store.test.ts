/**
 * Tests for Completion Settings Store
 */

import { act } from '@testing-library/react';
import {
  useCompletionSettingsStore,
  selectMentionEnabled,
  selectSlashCommandsEnabled,
  selectEmojiEnabled,
  selectAICompletionEnabled,
  selectAICompletionProvider,
  selectMaxSuggestions,
  selectGhostTextOpacity,
  selectEnablePartialAccept,
} from './completion-settings-store';
import { DEFAULT_COMPLETION_SETTINGS } from '@/types/chat/input-completion';

describe('useCompletionSettingsStore', () => {
  beforeEach(() => {
    act(() => {
      useCompletionSettingsStore.getState().resetToDefaults();
    });
  });

  describe('initial state', () => {
    it('has correct initial state from defaults', () => {
      const state = useCompletionSettingsStore.getState();
      expect(state.mentionEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.mentionEnabled);
      expect(state.slashCommandsEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.slashCommandsEnabled);
      expect(state.emojiEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.emojiEnabled);
      expect(state.aiCompletionEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionEnabled);
      expect(state.aiCompletionProvider).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionProvider);
      expect(state.aiCompletionDebounce).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionDebounce);
      expect(state.aiCompletionMaxTokens).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionMaxTokens);
      expect(state.aiCompletionEndpoint).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionEndpoint);
      expect(state.aiCompletionApiKey).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionApiKey);
      expect(state.slashTriggerChar).toBe(DEFAULT_COMPLETION_SETTINGS.slashTriggerChar);
      expect(state.emojiTriggerChar).toBe(DEFAULT_COMPLETION_SETTINGS.emojiTriggerChar);
      expect(state.showInlinePreview).toBe(DEFAULT_COMPLETION_SETTINGS.showInlinePreview);
      expect(state.ghostTextOpacity).toBe(DEFAULT_COMPLETION_SETTINGS.ghostTextOpacity);
      expect(state.autoDismissDelay).toBe(DEFAULT_COMPLETION_SETTINGS.autoDismissDelay);
      expect(state.maxSuggestions).toBe(DEFAULT_COMPLETION_SETTINGS.maxSuggestions);
    });
  });

  describe('provider toggle actions', () => {
    it('should toggle mention enabled', () => {
      act(() => {
        useCompletionSettingsStore.getState().setMentionEnabled(false);
      });

      expect(useCompletionSettingsStore.getState().mentionEnabled).toBe(false);

      act(() => {
        useCompletionSettingsStore.getState().setMentionEnabled(true);
      });

      expect(useCompletionSettingsStore.getState().mentionEnabled).toBe(true);
    });

    it('should toggle slash commands enabled', () => {
      act(() => {
        useCompletionSettingsStore.getState().setSlashCommandsEnabled(false);
      });

      expect(useCompletionSettingsStore.getState().slashCommandsEnabled).toBe(false);
    });

    it('should toggle emoji enabled', () => {
      act(() => {
        useCompletionSettingsStore.getState().setEmojiEnabled(false);
      });

      expect(useCompletionSettingsStore.getState().emojiEnabled).toBe(false);
    });

    it('should toggle AI completion enabled', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionEnabled(true);
      });

      expect(useCompletionSettingsStore.getState().aiCompletionEnabled).toBe(true);
    });
  });

  describe('AI completion settings', () => {
    it('should set AI completion provider', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionProvider('openai');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionProvider).toBe('openai');

      act(() => {
        useCompletionSettingsStore.getState().setAICompletionProvider('ollama');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionProvider).toBe('ollama');

      act(() => {
        useCompletionSettingsStore.getState().setAICompletionProvider('groq');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionProvider).toBe('groq');
    });

    it('should set AI completion debounce', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionDebounce(500);
      });

      expect(useCompletionSettingsStore.getState().aiCompletionDebounce).toBe(500);
    });

    it('should set AI completion max tokens', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionMaxTokens(100);
      });

      expect(useCompletionSettingsStore.getState().aiCompletionMaxTokens).toBe(100);
    });

    it('should set AI completion endpoint', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionEndpoint('https://api.example.com');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionEndpoint).toBe('https://api.example.com');
    });

    it('should set AI completion API key', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionApiKey('sk-test-key-123');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionApiKey).toBe('sk-test-key-123');
    });

    it('should clear AI completion endpoint with empty string', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionEndpoint('https://api.example.com');
        useCompletionSettingsStore.getState().setAICompletionEndpoint('');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionEndpoint).toBe('');
    });

    it('should clear AI completion API key with empty string', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionApiKey('sk-key');
        useCompletionSettingsStore.getState().setAICompletionApiKey('');
      });

      expect(useCompletionSettingsStore.getState().aiCompletionApiKey).toBe('');
    });
  });

  describe('trigger settings', () => {
    it('should set slash trigger char', () => {
      act(() => {
        useCompletionSettingsStore.getState().setSlashTriggerChar('\\');
      });

      expect(useCompletionSettingsStore.getState().slashTriggerChar).toBe('\\');
    });

    it('should set emoji trigger char', () => {
      act(() => {
        useCompletionSettingsStore.getState().setEmojiTriggerChar(';');
      });

      expect(useCompletionSettingsStore.getState().emojiTriggerChar).toBe(';');
    });
  });

  describe('UI settings', () => {
    it('should set show inline preview', () => {
      act(() => {
        useCompletionSettingsStore.getState().setShowInlinePreview(false);
      });

      expect(useCompletionSettingsStore.getState().showInlinePreview).toBe(false);
    });

    it('should set ghost text opacity', () => {
      act(() => {
        useCompletionSettingsStore.getState().setGhostTextOpacity(0.75);
      });

      expect(useCompletionSettingsStore.getState().ghostTextOpacity).toBe(0.75);
    });

    it('should set auto dismiss delay', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAutoDismissDelay(3000);
      });

      expect(useCompletionSettingsStore.getState().autoDismissDelay).toBe(3000);
    });

    it('should set max suggestions', () => {
      act(() => {
        useCompletionSettingsStore.getState().setMaxSuggestions(15);
      });

      expect(useCompletionSettingsStore.getState().maxSuggestions).toBe(15);
    });
  });

  describe('bulk update', () => {
    it('should update multiple settings at once', () => {
      act(() => {
        useCompletionSettingsStore.getState().updateSettings({
          mentionEnabled: false,
          aiCompletionEnabled: true,
          aiCompletionProvider: 'groq',
          maxSuggestions: 20,
          aiCompletionEndpoint: 'https://custom.api.com',
          aiCompletionApiKey: 'test-key',
        });
      });

      const state = useCompletionSettingsStore.getState();
      expect(state.mentionEnabled).toBe(false);
      expect(state.aiCompletionEnabled).toBe(true);
      expect(state.aiCompletionProvider).toBe('groq');
      expect(state.maxSuggestions).toBe(20);
      expect(state.aiCompletionEndpoint).toBe('https://custom.api.com');
      expect(state.aiCompletionApiKey).toBe('test-key');
    });

    it('should preserve unaffected settings during update', () => {
      act(() => {
        useCompletionSettingsStore.getState().setGhostTextOpacity(0.8);
        useCompletionSettingsStore.getState().updateSettings({
          mentionEnabled: false,
        });
      });

      expect(useCompletionSettingsStore.getState().ghostTextOpacity).toBe(0.8);
    });
  });

  describe('reset to defaults', () => {
    it('should reset all settings to defaults', () => {
      act(() => {
        useCompletionSettingsStore.getState().updateSettings({
          mentionEnabled: false,
          slashCommandsEnabled: false,
          emojiEnabled: false,
          aiCompletionEnabled: true,
          aiCompletionProvider: 'groq',
          aiCompletionDebounce: 1000,
          aiCompletionMaxTokens: 200,
          aiCompletionEndpoint: 'https://custom.api.com',
          aiCompletionApiKey: 'sk-custom-key',
          slashTriggerChar: '\\',
          emojiTriggerChar: ';',
          showInlinePreview: false,
          ghostTextOpacity: 0.9,
          autoDismissDelay: 10000,
          maxSuggestions: 25,
        });

        useCompletionSettingsStore.getState().resetToDefaults();
      });

      const state = useCompletionSettingsStore.getState();
      expect(state.mentionEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.mentionEnabled);
      expect(state.slashCommandsEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.slashCommandsEnabled);
      expect(state.emojiEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.emojiEnabled);
      expect(state.aiCompletionEnabled).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionEnabled);
      expect(state.aiCompletionProvider).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionProvider);
      expect(state.aiCompletionEndpoint).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionEndpoint);
      expect(state.aiCompletionApiKey).toBe(DEFAULT_COMPLETION_SETTINGS.aiCompletionApiKey);
      expect(state.ghostTextOpacity).toBe(DEFAULT_COMPLETION_SETTINGS.ghostTextOpacity);
      expect(state.maxSuggestions).toBe(DEFAULT_COMPLETION_SETTINGS.maxSuggestions);
    });
  });

  describe('selectors', () => {
    it('selectMentionEnabled returns correct value', () => {
      act(() => {
        useCompletionSettingsStore.getState().setMentionEnabled(false);
      });

      expect(selectMentionEnabled(useCompletionSettingsStore.getState())).toBe(false);
    });

    it('selectSlashCommandsEnabled returns correct value', () => {
      expect(selectSlashCommandsEnabled(useCompletionSettingsStore.getState())).toBe(true);
    });

    it('selectEmojiEnabled returns correct value', () => {
      expect(selectEmojiEnabled(useCompletionSettingsStore.getState())).toBe(true);
    });

    it('selectAICompletionEnabled returns correct value', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionEnabled(true);
      });

      expect(selectAICompletionEnabled(useCompletionSettingsStore.getState())).toBe(true);
    });

    it('selectAICompletionProvider returns correct value', () => {
      act(() => {
        useCompletionSettingsStore.getState().setAICompletionProvider('openai');
      });

      expect(selectAICompletionProvider(useCompletionSettingsStore.getState())).toBe('openai');
    });

    it('selectMaxSuggestions returns correct value', () => {
      act(() => {
        useCompletionSettingsStore.getState().setMaxSuggestions(8);
      });

      expect(selectMaxSuggestions(useCompletionSettingsStore.getState())).toBe(8);
    });

    it('selectGhostTextOpacity returns correct value', () => {
      act(() => {
        useCompletionSettingsStore.getState().setGhostTextOpacity(0.6);
      });

      expect(selectGhostTextOpacity(useCompletionSettingsStore.getState())).toBe(0.6);
    });

    it('selectEnablePartialAccept returns correct value', () => {
      act(() => {
        useCompletionSettingsStore.getState().setEnablePartialAccept(false);
      });

      expect(selectEnablePartialAccept(useCompletionSettingsStore.getState())).toBe(false);
    });
  });
});
