//! Awareness Tauri commands
//!
//! Commands for system awareness and smart suggestions.

use crate::awareness::{
    activity_tracker::ActivityStats, ActivityType, AppUsageStats, AwarenessManager, AwarenessState,
    DailyUsageSummary, FocusSession, Suggestion, SystemState, UserActivity,
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
pub async fn awareness_stop_monitoring(manager: State<'_, AwarenessManager>) -> Result<(), String> {
    manager.stop_monitoring();
    Ok(())
}

/// Clear activity history
#[tauri::command]
pub async fn awareness_clear_history(manager: State<'_, AwarenessManager>) -> Result<(), String> {
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

// ============== Activity Tracker Extended Commands ==============

/// Get activities by type
#[tauri::command]
pub async fn awareness_get_activities_by_type(
    manager: State<'_, AwarenessManager>,
    activity_type: String,
) -> Result<Vec<UserActivity>, String> {
    let parsed_type = parse_activity_type(&activity_type);
    Ok(manager.get_activities_by_type(&parsed_type))
}

/// Get activities in time range
#[tauri::command]
pub async fn awareness_get_activities_in_range(
    manager: State<'_, AwarenessManager>,
    start_ms: i64,
    end_ms: i64,
) -> Result<Vec<UserActivity>, String> {
    Ok(manager.get_activities_in_range(start_ms, end_ms))
}

/// Get activities by application
#[tauri::command]
pub async fn awareness_get_activities_by_application(
    manager: State<'_, AwarenessManager>,
    app_name: String,
) -> Result<Vec<UserActivity>, String> {
    Ok(manager.get_activities_by_application(&app_name))
}

/// Get activity statistics
#[tauri::command]
pub async fn awareness_get_activity_stats(
    manager: State<'_, AwarenessManager>,
) -> Result<ActivityStats, String> {
    Ok(manager.get_activity_stats())
}

/// Set activity tracking enabled/disabled
#[tauri::command]
pub async fn awareness_set_activity_tracking_enabled(
    manager: State<'_, AwarenessManager>,
    enabled: bool,
) -> Result<(), String> {
    manager.set_activity_tracking_enabled(enabled);
    Ok(())
}

/// Check if activity tracking is enabled
#[tauri::command]
pub async fn awareness_is_activity_tracking_enabled(
    manager: State<'_, AwarenessManager>,
) -> Result<bool, String> {
    Ok(manager.is_activity_tracking_enabled())
}

/// Export activity history as JSON
#[tauri::command]
pub async fn awareness_export_activity_history(
    manager: State<'_, AwarenessManager>,
) -> Result<String, String> {
    Ok(manager.export_activity_history())
}

/// Import activity history from JSON
#[tauri::command]
pub async fn awareness_import_activity_history(
    manager: State<'_, AwarenessManager>,
    json: String,
) -> Result<usize, String> {
    manager.import_activity_history(&json)
}

// ============== Smart Suggestions Extended Commands ==============

/// Dismiss a suggestion
#[tauri::command]
pub async fn awareness_dismiss_suggestion(
    manager: State<'_, AwarenessManager>,
    action: String,
) -> Result<(), String> {
    manager.dismiss_suggestion(&action);
    Ok(())
}

/// Clear all dismissed suggestions
#[tauri::command]
pub async fn awareness_clear_dismissed_suggestions(
    manager: State<'_, AwarenessManager>,
) -> Result<(), String> {
    manager.clear_dismissed_suggestions();
    Ok(())
}

/// Check if a suggestion is dismissed
#[tauri::command]
pub async fn awareness_is_suggestion_dismissed(
    manager: State<'_, AwarenessManager>,
    action: String,
) -> Result<bool, String> {
    Ok(manager.is_suggestion_dismissed(&action))
}

/// Get list of dismissed suggestions
#[tauri::command]
pub async fn awareness_get_dismissed_suggestions(
    manager: State<'_, AwarenessManager>,
) -> Result<Vec<String>, String> {
    Ok(manager.get_dismissed_suggestions())
}

// ============== Focus Tracker Extended Commands ==============

/// Get all focus sessions
#[tauri::command]
pub async fn awareness_get_all_focus_sessions(
    manager: State<'_, AwarenessManager>,
) -> Result<Vec<FocusSession>, String> {
    Ok(manager.get_all_focus_sessions())
}

/// Get focus session count
#[tauri::command]
pub async fn awareness_get_focus_session_count(
    manager: State<'_, AwarenessManager>,
) -> Result<usize, String> {
    Ok(manager.get_focus_session_count())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_activity_type_text_selection() {
        assert!(matches!(
            parse_activity_type("text_selection"),
            ActivityType::TextSelection
        ));
        assert!(matches!(
            parse_activity_type("textselection"),
            ActivityType::TextSelection
        ));
        assert!(matches!(
            parse_activity_type("TEXT_SELECTION"),
            ActivityType::TextSelection
        ));
    }

    #[test]
    fn test_parse_activity_type_screenshot() {
        assert!(matches!(
            parse_activity_type("screenshot"),
            ActivityType::Screenshot
        ));
        assert!(matches!(
            parse_activity_type("SCREENSHOT"),
            ActivityType::Screenshot
        ));
    }

    #[test]
    fn test_parse_activity_type_app_switch() {
        assert!(matches!(
            parse_activity_type("app_switch"),
            ActivityType::AppSwitch
        ));
        assert!(matches!(
            parse_activity_type("appswitch"),
            ActivityType::AppSwitch
        ));
    }

    #[test]
    fn test_parse_activity_type_file_operations() {
        assert!(matches!(
            parse_activity_type("file_open"),
            ActivityType::FileOpen
        ));
        assert!(matches!(
            parse_activity_type("fileopen"),
            ActivityType::FileOpen
        ));
        assert!(matches!(
            parse_activity_type("file_save"),
            ActivityType::FileSave
        ));
        assert!(matches!(
            parse_activity_type("filesave"),
            ActivityType::FileSave
        ));
    }

    #[test]
    fn test_parse_activity_type_url_visit() {
        assert!(matches!(
            parse_activity_type("url_visit"),
            ActivityType::UrlVisit
        ));
        assert!(matches!(
            parse_activity_type("urlvisit"),
            ActivityType::UrlVisit
        ));
    }

    #[test]
    fn test_parse_activity_type_search() {
        assert!(matches!(
            parse_activity_type("search"),
            ActivityType::Search
        ));
    }

    #[test]
    fn test_parse_activity_type_clipboard() {
        assert!(matches!(parse_activity_type("copy"), ActivityType::Copy));
        assert!(matches!(parse_activity_type("paste"), ActivityType::Paste));
    }

    #[test]
    fn test_parse_activity_type_ai_query() {
        assert!(matches!(
            parse_activity_type("ai_query"),
            ActivityType::AiQuery
        ));
        assert!(matches!(
            parse_activity_type("aiquery"),
            ActivityType::AiQuery
        ));
    }

    #[test]
    fn test_parse_activity_type_translation() {
        assert!(matches!(
            parse_activity_type("translation"),
            ActivityType::Translation
        ));
    }

    #[test]
    fn test_parse_activity_type_code_action() {
        assert!(matches!(
            parse_activity_type("code_action"),
            ActivityType::CodeAction
        ));
        assert!(matches!(
            parse_activity_type("codeaction"),
            ActivityType::CodeAction
        ));
    }

    #[test]
    fn test_parse_activity_type_document_action() {
        assert!(matches!(
            parse_activity_type("document_action"),
            ActivityType::DocumentAction
        ));
        assert!(matches!(
            parse_activity_type("documentaction"),
            ActivityType::DocumentAction
        ));
    }

    #[test]
    fn test_parse_activity_type_custom() {
        match parse_activity_type("custom_type") {
            ActivityType::Custom(s) => assert_eq!(s, "custom_type"),
            _ => panic!("Expected Custom variant"),
        }

        match parse_activity_type("unknown_activity") {
            ActivityType::Custom(s) => assert_eq!(s, "unknown_activity"),
            _ => panic!("Expected Custom variant"),
        }
    }

    #[test]
    fn test_parse_activity_type_case_insensitive() {
        assert!(matches!(parse_activity_type("COPY"), ActivityType::Copy));
        assert!(matches!(parse_activity_type("Paste"), ActivityType::Paste));
        assert!(matches!(
            parse_activity_type("SEARCH"),
            ActivityType::Search
        ));
    }

    // ============== Extended Command Tests ==============

    #[test]
    fn test_parse_activity_type_all_variants() {
        // Test all activity types
        let types = vec![
            ("text_selection", true),
            ("screenshot", true),
            ("app_switch", true),
            ("file_open", true),
            ("file_save", true),
            ("url_visit", true),
            ("search", true),
            ("copy", true),
            ("paste", true),
            ("ai_query", true),
            ("translation", true),
            ("code_action", true),
            ("document_action", true),
        ];

        for (input, _) in types {
            let result = parse_activity_type(input);
            // Verify it doesn't return Custom for known types
            assert!(
                !matches!(result, ActivityType::Custom(_)),
                "Expected known type for {}",
                input
            );
        }
    }

    #[test]
    fn test_parse_activity_type_custom_fallback() {
        let result = parse_activity_type("unknown_type_xyz");
        assert!(matches!(result, ActivityType::Custom(s) if s == "unknown_type_xyz"));
    }
}
