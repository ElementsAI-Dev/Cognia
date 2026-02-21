//! Tauri commands for input completion

use crate::input_completion::types::CompletionStats;
use crate::input_completion::{
    CompletionConfig, CompletionFeedback, CompletionRequestV2, CompletionRequestV3,
    CompletionResult, CompletionResultV2, CompletionResultV3, CompletionStatus,
    CompletionSuggestion, CompletionSuggestionRef, ImeState, InputCompletionManager,
};
use tauri::State;

/// Start the input completion system
#[tauri::command]
pub async fn input_completion_start(
    manager: State<'_, InputCompletionManager>,
) -> Result<(), String> {
    log::info!("Starting input completion via command");
    manager.start().await
}

/// Stop the input completion system
#[tauri::command]
pub fn input_completion_stop(manager: State<'_, InputCompletionManager>) -> Result<(), String> {
    log::info!("Stopping input completion via command");
    manager.stop();
    Ok(())
}

/// Get the current IME state
#[tauri::command]
pub fn input_completion_get_ime_state(
    manager: State<'_, InputCompletionManager>,
) -> Result<ImeState, String> {
    Ok(manager.get_ime_state())
}

/// Get the current completion suggestion
#[tauri::command]
pub fn input_completion_get_suggestion(
    manager: State<'_, InputCompletionManager>,
) -> Result<Option<CompletionSuggestion>, String> {
    if let Some(current) = manager.get_current_suggestion() {
        return Ok(Some(current));
    }

    Ok(manager.get_active_suggestions().into_iter().next())
}

/// Accept the current suggestion
#[tauri::command]
pub fn input_completion_accept(
    manager: State<'_, InputCompletionManager>,
) -> Result<Option<CompletionSuggestion>, String> {
    Ok(manager.accept_suggestion())
}

/// Accept a suggestion by id (v2).
#[tauri::command]
pub fn input_completion_accept_v2(
    manager: State<'_, InputCompletionManager>,
    suggestion: CompletionSuggestionRef,
) -> Result<Option<CompletionSuggestion>, String> {
    if !suggestion.suggestion_id.is_empty() && !manager.has_suggestion_id(&suggestion.suggestion_id)
    {
        return Ok(None);
    }
    if !suggestion.suggestion_id.is_empty() {
        let _ = manager.get_suggestion_by_id(&suggestion.suggestion_id);
    }
    Ok(manager.accept_suggestion_v2(suggestion))
}

/// Dismiss the current suggestion
#[tauri::command]
pub fn input_completion_dismiss(manager: State<'_, InputCompletionManager>) -> Result<(), String> {
    manager.dismiss_suggestion();
    Ok(())
}

/// Dismiss a suggestion by id (v2). Returns true when a suggestion existed.
#[tauri::command]
pub fn input_completion_dismiss_v2(
    manager: State<'_, InputCompletionManager>,
    suggestion: Option<CompletionSuggestionRef>,
) -> Result<bool, String> {
    Ok(manager.dismiss_suggestion_v2(suggestion))
}

/// Get the completion status
#[tauri::command]
pub fn input_completion_get_status(
    manager: State<'_, InputCompletionManager>,
) -> Result<CompletionStatus, String> {
    Ok(manager.get_status())
}

/// Update the completion configuration
#[tauri::command]
pub fn input_completion_update_config(
    manager: State<'_, InputCompletionManager>,
    config: CompletionConfig,
) -> Result<(), String> {
    manager.update_config(config);
    Ok(())
}

/// Get the current completion configuration
#[tauri::command]
pub fn input_completion_get_config(
    manager: State<'_, InputCompletionManager>,
) -> Result<CompletionConfig, String> {
    Ok(manager.get_config())
}

/// Manually trigger completion for given text
#[tauri::command]
pub async fn input_completion_trigger(
    manager: State<'_, InputCompletionManager>,
    text: String,
) -> Result<CompletionResult, String> {
    manager.trigger_completion(&text).await
}

/// Trigger completion with metadata-rich v2 request.
#[tauri::command]
pub async fn input_completion_trigger_v2(
    manager: State<'_, InputCompletionManager>,
    request: CompletionRequestV2,
) -> Result<CompletionResultV2, String> {
    manager.trigger_completion_v2(request).await
}

/// Trigger completion with v3 alignment payload.
#[tauri::command]
pub async fn input_completion_trigger_v3(
    manager: State<'_, InputCompletionManager>,
    request: CompletionRequestV3,
) -> Result<CompletionResultV3, String> {
    manager.trigger_completion_v3(request).await
}

/// Check if input completion is running
#[tauri::command]
pub fn input_completion_is_running(
    manager: State<'_, InputCompletionManager>,
) -> Result<bool, String> {
    Ok(manager.is_running())
}

/// Get completion statistics
#[tauri::command]
pub fn input_completion_get_stats(
    manager: State<'_, InputCompletionManager>,
) -> Result<CompletionStats, String> {
    Ok(manager.get_stats())
}

/// Reset completion statistics
#[tauri::command]
pub fn input_completion_reset_stats(
    manager: State<'_, InputCompletionManager>,
) -> Result<(), String> {
    manager.reset_stats();
    Ok(())
}

/// Clear completion cache
#[tauri::command]
pub fn input_completion_clear_cache(
    manager: State<'_, InputCompletionManager>,
) -> Result<(), String> {
    manager.clear_cache();
    Ok(())
}

/// Test provider connection
#[tauri::command]
pub async fn input_completion_test_connection(
    manager: State<'_, InputCompletionManager>,
) -> Result<CompletionResult, String> {
    manager.trigger_completion("Hello").await
}

/// Submit quality feedback for a completion suggestion
#[tauri::command]
pub fn input_completion_submit_feedback(
    manager: State<'_, InputCompletionManager>,
    feedback: CompletionFeedback,
) -> Result<(), String> {
    manager.submit_feedback(feedback);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_completion_config_serialization() {
        let config = CompletionConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let parsed: CompletionConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.enabled, config.enabled);
    }
}
