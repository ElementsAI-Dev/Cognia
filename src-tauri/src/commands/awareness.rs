//! Awareness Tauri commands
//!
//! Commands for system awareness and smart suggestions.

use crate::awareness::{
    ActivityType, AwarenessManager, AwarenessState, Suggestion,
    SystemState, UserActivity, FocusSession, AppUsageStats, DailyUsageSummary,
};
use tauri::State;

/// Get current awareness state
#[tauri::command]
pub async fn awareness_get_state(
    manager: State<'_, AwarenessManager>,
) -> Result<AwarenessState, String> {
    Ok(manager.get_state())
}

/// Get system state
#[tauri::command]
pub async fn awareness_get_system_state(
    manager: State<'_, AwarenessManager>,
) -> Result<SystemState, String> {
    Ok(manager.get_system_state())
}

/// Get suggestions
#[tauri::command]
pub async fn awareness_get_suggestions(
    manager: State<'_, AwarenessManager>,
) -> Result<Vec<Suggestion>, String> {
    Ok(manager.get_suggestions())
}

/// Record an activity
#[tauri::command]
pub async fn awareness_record_activity(
    manager: State<'_, AwarenessManager>,
    activity_type: String,
    description: String,
    application: Option<String>,
    target: Option<String>,
    metadata: Option<std::collections::HashMap<String, String>>,
) -> Result<(), String> {
    let activity = UserActivity {
        activity_type: parse_activity_type(&activity_type),
        description,
        application,
        target,
        timestamp: chrono::Utc::now().timestamp_millis(),
        duration_ms: None,
        metadata: metadata.unwrap_or_default(),
    };
    
    manager.record_activity(activity);
    Ok(())
}

/// Get recent activities
#[tauri::command]
pub async fn awareness_get_recent_activities(
    manager: State<'_, AwarenessManager>,
    count: Option<usize>,
) -> Result<Vec<UserActivity>, String> {
    Ok(manager.get_recent_activities(count.unwrap_or(10)))
}

/// Start background monitoring
#[tauri::command]
pub async fn awareness_start_monitoring(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.start_monitoring().await
}

/// Stop background monitoring
#[tauri::command]
pub async fn awareness_stop_monitoring(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.stop_monitoring();
    Ok(())
}

/// Clear activity history
#[tauri::command]
pub async fn awareness_clear_history(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.clear_history();
    Ok(())
}

/// Parse activity type from string
fn parse_activity_type(s: &str) -> ActivityType {
    match s.to_lowercase().as_str() {
        "text_selection" | "textselection" => ActivityType::TextSelection,
        "screenshot" => ActivityType::Screenshot,
        "app_switch" | "appswitch" => ActivityType::AppSwitch,
        "file_open" | "fileopen" => ActivityType::FileOpen,
        "file_save" | "filesave" => ActivityType::FileSave,
        "url_visit" | "urlvisit" => ActivityType::UrlVisit,
        "search" => ActivityType::Search,
        "copy" => ActivityType::Copy,
        "paste" => ActivityType::Paste,
        "ai_query" | "aiquery" => ActivityType::AiQuery,
        "translation" => ActivityType::Translation,
        "code_action" | "codeaction" => ActivityType::CodeAction,
        "document_action" | "documentaction" => ActivityType::DocumentAction,
        _ => ActivityType::Custom(s.to_string()),
    }
}

// ============== Focus Tracking Commands ==============

/// Start focus tracking
#[tauri::command]
pub async fn awareness_start_focus_tracking(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.start_focus_tracking();
    Ok(())
}

/// Stop focus tracking
#[tauri::command]
pub async fn awareness_stop_focus_tracking(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.stop_focus_tracking();
    Ok(())
}

/// Check if focus tracking is enabled
#[tauri::command]
pub async fn awareness_is_focus_tracking(
    manager: State<'_, AwarenessManager>,
) -> Result<bool, String> {
    Ok(manager.is_focus_tracking())
}

/// Record a focus change
#[tauri::command]
pub async fn awareness_record_focus_change(
    manager: State<'_, AwarenessManager>,
    app_name: String,
    process_name: String,
    window_title: String,
) -> Result<(), String> {
    manager.record_focus_change(&app_name, &process_name, &window_title);
    Ok(())
}

/// Get current focus session
#[tauri::command]
pub async fn awareness_get_current_focus(
    manager: State<'_, AwarenessManager>,
) -> Result<Option<FocusSession>, String> {
    Ok(manager.get_current_focus())
}

/// Get recent focus sessions
#[tauri::command]
pub async fn awareness_get_recent_focus_sessions(
    manager: State<'_, AwarenessManager>,
    count: Option<usize>,
) -> Result<Vec<FocusSession>, String> {
    Ok(manager.get_recent_focus_sessions(count.unwrap_or(20)))
}

/// Get app usage statistics
#[tauri::command]
pub async fn awareness_get_app_usage_stats(
    manager: State<'_, AwarenessManager>,
    app_name: String,
) -> Result<Option<AppUsageStats>, String> {
    Ok(manager.get_app_usage_stats(&app_name))
}

/// Get all app usage statistics
#[tauri::command]
pub async fn awareness_get_all_app_usage_stats(
    manager: State<'_, AwarenessManager>,
) -> Result<Vec<AppUsageStats>, String> {
    Ok(manager.get_all_app_usage_stats())
}

/// Get today's usage summary
#[tauri::command]
pub async fn awareness_get_today_usage_summary(
    manager: State<'_, AwarenessManager>,
) -> Result<DailyUsageSummary, String> {
    Ok(manager.get_today_usage_summary())
}

/// Get daily usage summary
#[tauri::command]
pub async fn awareness_get_daily_usage_summary(
    manager: State<'_, AwarenessManager>,
    date: String,
) -> Result<DailyUsageSummary, String> {
    Ok(manager.get_daily_usage_summary(&date))
}

/// Clear focus history
#[tauri::command]
pub async fn awareness_clear_focus_history(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.clear_focus_history();
    Ok(())
}
