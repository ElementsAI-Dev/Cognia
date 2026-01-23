//! Tauri commands for input completion

use crate::input_completion::{
    CompletionConfig, CompletionResult, CompletionStatus,
    CompletionSuggestion, ImeState, InputCompletionManager,
};
use crate::input_completion::types::CompletionStats;
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
    Ok(manager.get_current_suggestion())
}

/// Accept the current suggestion
#[tauri::command]
pub fn input_completion_accept(
    manager: State<'_, InputCompletionManager>,
) -> Result<Option<CompletionSuggestion>, String> {
    Ok(manager.accept_suggestion())
}

/// Dismiss the current suggestion
#[tauri::command]
pub fn input_completion_dismiss(manager: State<'_, InputCompletionManager>) -> Result<(), String> {
    manager.dismiss_suggestion();
    Ok(())
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
    // Test with a simple prompt
    manager.trigger_completion("Hello").await
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
