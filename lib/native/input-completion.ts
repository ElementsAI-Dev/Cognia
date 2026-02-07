/**
 * Native API for input completion
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  CompletionConfig,
  CompletionFeedback,
  CompletionResult,
  CompletionStatus,
  CompletionSuggestion,
  CompletionStats,
  ImeState,
} from '@/types/input-completion';

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
 * Dismiss the current suggestion
 */
export async function dismissSuggestion(): Promise<void> {
  return invoke('input_completion_dismiss');
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
export async function triggerCompletion(text: string): Promise<CompletionResult> {
  return invoke('input_completion_trigger', { text });
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
export async function testProviderConnection(): Promise<CompletionResult> {
  return invoke('input_completion_test_connection');
}

/**
 * Submit quality feedback for a completion suggestion
 */
export async function submitCompletionFeedback(feedback: CompletionFeedback): Promise<void> {
  return invoke('input_completion_submit_feedback', { feedback });
}
