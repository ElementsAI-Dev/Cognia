/**
 * Completion Settings Store
 *
 * Zustand store for managing input completion settings including:
 * - Provider enable/disable states
 * - AI completion configuration
 * - Trigger character customization
 * - UI preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CompletionSettings } from '@/types/chat/input-completion';
import { DEFAULT_COMPLETION_SETTINGS } from '@/types/chat/input-completion';

export interface CompletionSettingsState extends CompletionSettings {
  // Actions
  setMentionEnabled: (enabled: boolean) => void;
  setSlashCommandsEnabled: (enabled: boolean) => void;
  setEmojiEnabled: (enabled: boolean) => void;
  setAICompletionEnabled: (enabled: boolean) => void;
  setAICompletionProvider: (provider: CompletionSettings['aiCompletionProvider']) => void;
  setAICompletionDebounce: (ms: number) => void;
  setAICompletionMaxTokens: (tokens: number) => void;
  setAICompletionEndpoint: (endpoint: string) => void;
  setAICompletionApiKey: (apiKey: string) => void;
  setSlashTriggerChar: (char: string) => void;
  setEmojiTriggerChar: (char: string) => void;
  setShowInlinePreview: (show: boolean) => void;
  setGhostTextOpacity: (opacity: number) => void;
  setAutoDismissDelay: (ms: number) => void;
  setMaxSuggestions: (max: number) => void;
  setEnablePartialAccept: (enabled: boolean) => void;
  resetToDefaults: () => void;
  updateSettings: (settings: Partial<CompletionSettings>) => void;
}

export const useCompletionSettingsStore = create<CompletionSettingsState>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_COMPLETION_SETTINGS,

      // Actions
      setMentionEnabled: (enabled) => set({ mentionEnabled: enabled }),
      setSlashCommandsEnabled: (enabled) => set({ slashCommandsEnabled: enabled }),
      setEmojiEnabled: (enabled) => set({ emojiEnabled: enabled }),
      setAICompletionEnabled: (enabled) => set({ aiCompletionEnabled: enabled }),
      setAICompletionProvider: (provider) => set({ aiCompletionProvider: provider }),
      setAICompletionDebounce: (ms) => set({ aiCompletionDebounce: ms }),
      setAICompletionMaxTokens: (tokens) => set({ aiCompletionMaxTokens: tokens }),
      setAICompletionEndpoint: (endpoint) => set({ aiCompletionEndpoint: endpoint }),
      setAICompletionApiKey: (apiKey) => set({ aiCompletionApiKey: apiKey }),
      setSlashTriggerChar: (char) => set({ slashTriggerChar: char }),
      setEmojiTriggerChar: (char) => set({ emojiTriggerChar: char }),
      setShowInlinePreview: (show) => set({ showInlinePreview: show }),
      setGhostTextOpacity: (opacity) => set({ ghostTextOpacity: opacity }),
      setAutoDismissDelay: (ms) => set({ autoDismissDelay: ms }),
      setMaxSuggestions: (max) => set({ maxSuggestions: max }),
      setEnablePartialAccept: (enabled) => set({ enablePartialAccept: enabled }),
      resetToDefaults: () => set(DEFAULT_COMPLETION_SETTINGS),
      updateSettings: (settings) => set(settings),
    }),
    {
      name: 'cognia-completion-settings',
      version: 1,
    }
  )
);

/** Selectors for optimized subscriptions */
export const selectMentionEnabled = (state: CompletionSettingsState) => state.mentionEnabled;
export const selectSlashCommandsEnabled = (state: CompletionSettingsState) => state.slashCommandsEnabled;
export const selectEmojiEnabled = (state: CompletionSettingsState) => state.emojiEnabled;
export const selectAICompletionEnabled = (state: CompletionSettingsState) => state.aiCompletionEnabled;
export const selectAICompletionProvider = (state: CompletionSettingsState) => state.aiCompletionProvider;
export const selectMaxSuggestions = (state: CompletionSettingsState) => state.maxSuggestions;
export const selectGhostTextOpacity = (state: CompletionSettingsState) => state.ghostTextOpacity;
export const selectEnablePartialAccept = (state: CompletionSettingsState) => state.enablePartialAccept;

export default useCompletionSettingsStore;
