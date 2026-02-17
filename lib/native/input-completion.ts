/**
 * Native API for input completion
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  CompletionConfig,
  CompletionFeedback,
  CompletionSuggestionRef,
  InputCompletionResult,
  TriggerCompletionV2Request,
  TriggerCompletionV2Result,
  CompletionStatus,
  CompletionSuggestion,
  CompletionStats,
  ImeState,
} from '@/types/input-completion';
import type { CompletionSettings } from '@/types/chat/input-completion';

/**
 * Start the input completion system
 */
export async function startInputCompletion(): Promise<void> {
  return invoke('input_completion_start');
}

/**
 * Stop the input completion system
 */
export async function stopInputCompletion(): Promise<void> {
  return invoke('input_completion_stop');
}

/**
 * Get the current IME state
 */
export async function getImeState(): Promise<ImeState> {
  return invoke('input_completion_get_ime_state');
}

/**
 * Get the current completion suggestion
 */
export async function getCurrentSuggestion(): Promise<CompletionSuggestion | null> {
  return invoke('input_completion_get_suggestion');
}

/**
 * Accept the current suggestion
 */
export async function acceptSuggestion(): Promise<CompletionSuggestion | null> {
  return invoke('input_completion_accept');
}

/**
 * Accept suggestion by id (v2)
 */
export async function acceptSuggestionV2(suggestion: CompletionSuggestionRef): Promise<CompletionSuggestion | null> {
  return invoke('input_completion_accept_v2', { suggestion });
}

/**
 * Dismiss the current suggestion
 */
export async function dismissSuggestion(): Promise<void> {
  return invoke('input_completion_dismiss');
}

/**
 * Dismiss suggestion by id (v2)
 */
export async function dismissSuggestionV2(suggestion?: CompletionSuggestionRef): Promise<boolean> {
  return invoke('input_completion_dismiss_v2', { suggestion: suggestion ?? null });
}

/**
 * Get the completion status
 */
export async function getCompletionStatus(): Promise<CompletionStatus> {
  return invoke('input_completion_get_status');
}

/**
 * Update the completion configuration
 */
export async function updateCompletionConfig(config: CompletionConfig): Promise<void> {
  return invoke('input_completion_update_config', { config });
}

/**
 * Get the current completion configuration
 */
export async function getCompletionConfig(): Promise<CompletionConfig> {
  return invoke('input_completion_get_config');
}

/**
 * Manually trigger completion for given text
 */
export async function triggerCompletion(text: string): Promise<InputCompletionResult> {
  return invoke('input_completion_trigger', { text });
}

/**
 * Trigger completion with v2 request metadata
 */
export async function triggerCompletionV2(request: TriggerCompletionV2Request): Promise<TriggerCompletionV2Result> {
  return invoke('input_completion_trigger_v2', { request });
}

/**
 * Check if input completion is running
 */
export async function isInputCompletionRunning(): Promise<boolean> {
  return invoke('input_completion_is_running');
}

/**
 * Get completion statistics
 */
export async function getCompletionStats(): Promise<CompletionStats> {
  return invoke('input_completion_get_stats');
}

/**
 * Reset completion statistics
 */
export async function resetCompletionStats(): Promise<void> {
  return invoke('input_completion_reset_stats');
}

/**
 * Clear completion cache
 */
export async function clearCompletionCache(): Promise<void> {
  return invoke('input_completion_clear_cache');
}

/**
 * Test provider connection
 */
export async function testProviderConnection(): Promise<InputCompletionResult> {
  return invoke('input_completion_test_connection');
}

/**
 * Submit quality feedback for a completion suggestion
 */
export async function submitCompletionFeedback(feedback: CompletionFeedback): Promise<void> {
  return invoke('input_completion_submit_feedback', { feedback });
}

/**
 * Map unified frontend completion settings into native completion config.
 */
export function mapSettingsToCompletionConfig(settings: CompletionSettings): CompletionConfig {
  const provider = settings.aiCompletionProvider;
  const modelIdByProvider: Record<CompletionSettings['aiCompletionProvider'], string> = {
    auto: 'qwen2.5-coder:0.5b',
    ollama: 'qwen2.5-coder:0.5b',
    openai: 'gpt-4o-mini',
    groq: 'llama-3.1-8b-instant',
  };

  return {
    enabled: settings.aiCompletionEnabled,
    model: {
      provider,
      model_id: modelIdByProvider[provider],
      endpoint: settings.aiCompletionEndpoint || undefined,
      api_key: settings.aiCompletionApiKey || undefined,
      max_tokens: settings.aiCompletionMaxTokens || 64,
      temperature: 0.1,
      timeout_secs: 5,
    },
    trigger: {
      debounce_ms: settings.aiCompletionDebounce || 400,
      min_context_length: 5,
      max_context_length: 500,
      trigger_on_word_boundary: false,
      skip_chars: [' ', '\n', '\t', '\r'],
      skip_with_modifiers: true,
      input_capture_mode: 'local_only',
      adaptive_debounce: {
        enabled: true,
        min_debounce_ms: 200,
        max_debounce_ms: 800,
        fast_typing_threshold: 5.0,
        slow_typing_threshold: 1.0,
      },
    },
    ui: {
      show_inline_preview: settings.showInlinePreview,
      max_suggestions: settings.maxSuggestions,
      font_size: 14,
      ghost_text_opacity: settings.ghostTextOpacity,
      auto_dismiss_ms: settings.autoDismissDelay,
      show_accept_hint: true,
    },
  };
}

/**
 * Sync frontend completion settings to native runtime config.
 */
export async function syncCompletionSettings(settings: CompletionSettings): Promise<void> {
  await updateCompletionConfig(mapSettingsToCompletionConfig(settings));
}
