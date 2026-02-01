//! Activity tracking
//!
//! Tracks user activities for context-aware suggestions.

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

/// Maximum number of activities to keep in history
const MAX_HISTORY_SIZE: usize = 1000;

/// User activity record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserActivity {
    /// Activity type
    pub activity_type: ActivityType,
    /// Activity description
    pub description: String,
    /// Associated application
    pub application: Option<String>,
    /// Associated file or URL
    pub target: Option<String>,
    /// Activity timestamp
    pub timestamp: i64,
    /// Duration in milliseconds (if applicable)
    pub duration_ms: Option<u64>,
    /// Additional metadata
    pub metadata: std::collections::HashMap<String, String>,
}

/// Activity type classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ActivityType {
    /// Text selection
    TextSelection,
    /// Screenshot capture
    Screenshot,
    /// Application switch
    AppSwitch,
    /// File opened
    FileOpen,
    /// File saved
    FileSave,
    /// URL visited
    UrlVisit,
    /// Search performed
    Search,
    /// Copy operation
    Copy,
    /// Paste operation
    Paste,
    /// AI query
    AiQuery,
    /// Translation request
    Translation,
    /// Code action (explain, fix, etc.)
    CodeAction,
    /// Document action (summarize, etc.)
    DocumentAction,
    /// Custom action
    Custom(String),
}

/// Activity tracker
pub struct ActivityTracker {
    /// Activity history
    history: VecDeque<UserActivity>,
    /// Whether tracking is enabled
    is_enabled: bool,
    /// Activity counts by type
    activity_counts: std::collections::HashMap<String, u64>,
}

impl ActivityTracker {
    pub fn new() -> Self {
        log::debug!(
            "Creating new ActivityTracker with capacity {}",
            MAX_HISTORY_SIZE
        );
        Self {
            history: VecDeque::with_capacity(MAX_HISTORY_SIZE),
            is_enabled: true,
            activity_counts: std::collections::HashMap::new(),
        }
    }

    /// Record a new activity
    pub fn record(&mut self, activity: UserActivity) {
        if !self.is_enabled {
            log::trace!("Activity tracking disabled, skipping record");
            return;
        }

        // Update activity count
        let type_key = format!("{:?}", activity.activity_type);
        *self.activity_counts.entry(type_key.clone()).or_insert(0) += 1;

        log::trace!(
            "Recording activity: type={}, history_size={}",
            type_key,
            self.history.len() + 1
        );

        // Add to history
        self.history.push_front(activity);

        // Trim history if needed
        while self.history.len() > MAX_HISTORY_SIZE {
            self.history.pop_back();
        }
    }

    /// Get recent activities
    pub fn get_recent(&self, count: usize) -> Vec<UserActivity> {
        self.history.iter().take(count).cloned().collect()
    }

    /// Get activities by type
    pub fn get_by_type(&self, activity_type: &ActivityType) -> Vec<UserActivity> {
        self.history
            .iter()
            .filter(|a| &a.activity_type == activity_type)
            .cloned()
            .collect()
    }

    /// Get activities within time range
    pub fn get_in_range(&self, start_ms: i64, end_ms: i64) -> Vec<UserActivity> {
        self.history
            .iter()
            .filter(|a| a.timestamp >= start_ms && a.timestamp <= end_ms)
            .cloned()
            .collect()
    }

    /// Get activities for a specific application
    pub fn get_by_application(&self, app_name: &str) -> Vec<UserActivity> {
        let app_lower = app_name.to_lowercase();
        self.history
            .iter()
            .filter(|a| {
                a.application
                    .as_ref()
                    .map(|app| app.to_lowercase().contains(&app_lower))
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Get activity statistics
    pub fn get_stats(&self) -> ActivityStats {
        let total = self.history.len();
        let now = chrono::Utc::now().timestamp_millis();
        let hour_ago = now - 3600000;
        let day_ago = now - 86400000;

        let last_hour = self
            .history
            .iter()
            .filter(|a| a.timestamp > hour_ago)
            .count();
        let last_day = self
            .history
            .iter()
            .filter(|a| a.timestamp > day_ago)
            .count();

        // Most common activity type
        let most_common = self
            .activity_counts
            .iter()
            .max_by_key(|(_, count)| *count)
            .map(|(k, _)| k.clone());

        // Most used application
        let mut app_counts: std::collections::HashMap<String, u64> =
            std::collections::HashMap::new();
        for activity in &self.history {
            if let Some(app) = &activity.application {
                *app_counts.entry(app.clone()).or_insert(0) += 1;
            }
        }
        let most_used_app = app_counts
            .iter()
            .max_by_key(|(_, count)| *count)
            .map(|(k, _)| k.clone());

        ActivityStats {
            total_activities: total,
            activities_last_hour: last_hour,
            activities_last_day: last_day,
            most_common_type: most_common,
            most_used_application: most_used_app,
            activity_counts: self.activity_counts.clone(),
        }
    }

    /// Clear all history
    pub fn clear(&mut self) {
        let count = self.history.len();
        self.history.clear();
        self.activity_counts.clear();
        log::info!("Cleared {} activities from history", count);
    }

    /// Enable/disable tracking
    pub fn set_enabled(&mut self, enabled: bool) {
        log::info!(
            "Activity tracking {}",
            if enabled { "enabled" } else { "disabled" }
        );
        self.is_enabled = enabled;
    }

    /// Check if tracking is enabled
    pub fn is_enabled(&self) -> bool {
        self.is_enabled
    }

    /// Export history as JSON
    pub fn export(&self) -> String {
        serde_json::to_string(&self.history.iter().collect::<Vec<_>>()).unwrap_or_default()
    }

    /// Import history from JSON
    pub fn import(&mut self, json: &str) -> Result<usize, String> {
        let activities: Vec<UserActivity> = serde_json::from_str(json).map_err(|e| {
            log::error!("Failed to import activity history: {}", e);
            format!("Failed to parse: {}", e)
        })?;

        let count = activities.len();
        log::info!("Importing {} activities from JSON", count);
        for activity in activities {
            self.record(activity);
        }

        Ok(count)
    }
}

/// Activity statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityStats {
    pub total_activities: usize,
    pub activities_last_hour: usize,
    pub activities_last_day: usize,
    pub most_common_type: Option<String>,
    pub most_used_application: Option<String>,
    pub activity_counts: std::collections::HashMap<String, u64>,
}

impl Default for ActivityTracker {
    fn default() -> Self {
        Self::new()
    }
}

impl UserActivity {
    /// Create a text selection activity
    #[allow(dead_code)]
    pub fn text_selection(text: &str, app: Option<String>) -> Self {
        Self {
            activity_type: ActivityType::TextSelection,
            description: format!("Selected {} characters", text.len()),
            application: app,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("text_length".to_string(), text.len().to_string());
                if text.len() <= 100 {
                    m.insert("text_preview".to_string(), text.to_string());
                } else {
                    m.insert("text_preview".to_string(), format!("{}...", &text[..100]));
                }
                m
            },
        }
    }

    /// Create a screenshot activity
    #[allow(dead_code)]
    pub fn screenshot(mode: &str, width: u32, height: u32) -> Self {
        Self {
            activity_type: ActivityType::Screenshot,
            description: format!("Captured {} screenshot ({}x{})", mode, width, height),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("mode".to_string(), mode.to_string());
                m.insert("width".to_string(), width.to_string());
                m.insert("height".to_string(), height.to_string());
                m
            },
        }
    }

    /// Create an app switch activity
    #[allow(dead_code)]
    pub fn app_switch(from_app: Option<String>, to_app: String) -> Self {
        Self {
            activity_type: ActivityType::AppSwitch,
            description: format!("Switched to {}", to_app),
            application: Some(to_app),
            target: from_app,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        }
    }

    /// Create an AI query activity
    #[allow(dead_code)]
    pub fn ai_query(query: &str, action: &str) -> Self {
        Self {
            activity_type: ActivityType::AiQuery,
            description: format!(
                "AI {}: {}",
                action,
                if query.len() > 50 {
                    &query[..50]
                } else {
                    query
                }
            ),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("action".to_string(), action.to_string());
                m.insert("query_length".to_string(), query.len().to_string());
                m
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_tracker() {
        let tracker = ActivityTracker::new();
        assert!(tracker.is_enabled());
        assert_eq!(tracker.get_recent(10).len(), 0);
    }

    #[test]
    fn test_record_activity() {
        let mut tracker = ActivityTracker::new();
        let activity = UserActivity::text_selection("hello world", Some("TestApp".to_string()));
        tracker.record(activity);

        let recent = tracker.get_recent(10);
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].activity_type, ActivityType::TextSelection);
    }

    #[test]
    fn test_record_when_disabled() {
        let mut tracker = ActivityTracker::new();
        tracker.set_enabled(false);

        let activity = UserActivity::text_selection("test", None);
        tracker.record(activity);

        assert_eq!(tracker.get_recent(10).len(), 0);
    }

    #[test]
    fn test_get_by_type() {
        let mut tracker = ActivityTracker::new();

        tracker.record(UserActivity::text_selection("text1", None));
        tracker.record(UserActivity::screenshot("fullscreen", 1920, 1080));
        tracker.record(UserActivity::text_selection("text2", None));

        let selections = tracker.get_by_type(&ActivityType::TextSelection);
        assert_eq!(selections.len(), 2);

        let screenshots = tracker.get_by_type(&ActivityType::Screenshot);
        assert_eq!(screenshots.len(), 1);
    }

    #[test]
    fn test_get_by_application() {
        let mut tracker = ActivityTracker::new();

        tracker.record(UserActivity::text_selection(
            "text1",
            Some("VSCode".to_string()),
        ));
        tracker.record(UserActivity::text_selection(
            "text2",
            Some("Chrome".to_string()),
        ));
        tracker.record(UserActivity::text_selection(
            "text3",
            Some("VSCode Editor".to_string()),
        ));

        let vscode_activities = tracker.get_by_application("vscode");
        assert_eq!(vscode_activities.len(), 2);
    }

    #[test]
    fn test_clear() {
        let mut tracker = ActivityTracker::new();
        tracker.record(UserActivity::text_selection("test", None));
        assert_eq!(tracker.get_recent(10).len(), 1);

        tracker.clear();
        assert_eq!(tracker.get_recent(10).len(), 0);
    }

    #[test]
    fn test_get_stats() {
        let mut tracker = ActivityTracker::new();

        tracker.record(UserActivity::text_selection(
            "text1",
            Some("App1".to_string()),
        ));
        tracker.record(UserActivity::text_selection(
            "text2",
            Some("App1".to_string()),
        ));
        tracker.record(UserActivity::screenshot("window", 800, 600));

        let stats = tracker.get_stats();
        assert_eq!(stats.total_activities, 3);
        assert!(stats.most_common_type.is_some());
        assert!(stats.most_used_application.is_some());
    }

    #[test]
    fn test_export_import() {
        let mut tracker = ActivityTracker::new();
        tracker.record(UserActivity::text_selection("test export", None));

        let json = tracker.export();
        assert!(!json.is_empty());

        let mut new_tracker = ActivityTracker::new();
        let result = new_tracker.import(&json);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
    }

    #[test]
    fn test_user_activity_constructors() {
        let selection = UserActivity::text_selection("hello", Some("App".to_string()));
        assert_eq!(selection.activity_type, ActivityType::TextSelection);
        assert!(selection.metadata.contains_key("text_length"));

        let screenshot = UserActivity::screenshot("region", 100, 200);
        assert_eq!(screenshot.activity_type, ActivityType::Screenshot);
        assert!(screenshot.description.contains("region"));

        let app_switch = UserActivity::app_switch(Some("OldApp".to_string()), "NewApp".to_string());
        assert_eq!(app_switch.activity_type, ActivityType::AppSwitch);
        assert_eq!(app_switch.application, Some("NewApp".to_string()));

        let ai_query = UserActivity::ai_query("explain this code", "explain");
        assert_eq!(ai_query.activity_type, ActivityType::AiQuery);
    }

    #[test]
    fn test_max_history_size() {
        let mut tracker = ActivityTracker::new();

        // Record more than MAX_HISTORY_SIZE activities
        for i in 0..1100 {
            let mut activity = UserActivity::text_selection(&format!("text {}", i), None);
            activity.timestamp += i as i64; // Ensure unique timestamps
            tracker.record(activity);
        }

        // Should be capped at MAX_HISTORY_SIZE (1000)
        assert!(tracker.get_recent(2000).len() <= 1000);
    }

    #[test]
    fn test_get_in_range() {
        let mut tracker = ActivityTracker::new();
        let base_time = chrono::Utc::now().timestamp_millis();

        // Create activities at different times
        for i in 0..5 {
            let mut activity = UserActivity::text_selection(&format!("text {}", i), None);
            activity.timestamp = base_time + (i * 1000) as i64; // 1 second apart
            tracker.record(activity);
        }

        // Get activities in middle range
        let range_activities = tracker.get_in_range(base_time + 1000, base_time + 3000);
        assert_eq!(range_activities.len(), 3); // Activities at 1s, 2s, 3s
    }

    #[test]
    fn test_get_in_range_empty() {
        let mut tracker = ActivityTracker::new();
        let now = chrono::Utc::now().timestamp_millis();

        tracker.record(UserActivity::text_selection("test", None));

        // Query a range that doesn't include any activities
        let range_activities = tracker.get_in_range(now + 100000, now + 200000);
        assert!(range_activities.is_empty());
    }

    #[test]
    fn test_import_invalid_json() {
        let mut tracker = ActivityTracker::new();
        let result = tracker.import("invalid json");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to parse"));
    }

    #[test]
    fn test_import_empty_array() {
        let mut tracker = ActivityTracker::new();
        let result = tracker.import("[]");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 0);
    }

    #[test]
    fn test_activity_type_serialization() {
        let types = vec![
            ActivityType::TextSelection,
            ActivityType::Screenshot,
            ActivityType::AppSwitch,
            ActivityType::FileOpen,
            ActivityType::FileSave,
            ActivityType::UrlVisit,
            ActivityType::Search,
            ActivityType::Copy,
            ActivityType::Paste,
            ActivityType::AiQuery,
            ActivityType::Translation,
            ActivityType::CodeAction,
            ActivityType::DocumentAction,
            ActivityType::Custom("custom_action".to_string()),
        ];

        for activity_type in types {
            let json = serde_json::to_string(&activity_type);
            assert!(json.is_ok());

            let parsed: Result<ActivityType, _> = serde_json::from_str(&json.unwrap());
            assert!(parsed.is_ok());
        }
    }

    #[test]
    fn test_activity_type_equality() {
        assert_eq!(ActivityType::Screenshot, ActivityType::Screenshot);
        assert_ne!(ActivityType::Copy, ActivityType::Paste);
        assert_eq!(
            ActivityType::Custom("test".to_string()),
            ActivityType::Custom("test".to_string())
        );
        assert_ne!(
            ActivityType::Custom("test1".to_string()),
            ActivityType::Custom("test2".to_string())
        );
    }

    #[test]
    fn test_user_activity_serialization() {
        let activity = UserActivity {
            activity_type: ActivityType::FileOpen,
            description: "Opened file".to_string(),
            application: Some("VSCode".to_string()),
            target: Some("/path/to/file.rs".to_string()),
            timestamp: 1234567890,
            duration_ms: Some(500),
            metadata: {
                let mut m = std::collections::HashMap::new();
                m.insert("key".to_string(), "value".to_string());
                m
            },
        };

        let json = serde_json::to_string(&activity);
        assert!(json.is_ok());

        let parsed: Result<UserActivity, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());

        let parsed_activity = parsed.unwrap();
        assert_eq!(parsed_activity.activity_type, ActivityType::FileOpen);
        assert_eq!(parsed_activity.application, Some("VSCode".to_string()));
    }

    #[test]
    fn test_activity_stats_serialization() {
        let stats = ActivityStats {
            total_activities: 100,
            activities_last_hour: 10,
            activities_last_day: 50,
            most_common_type: Some("TextSelection".to_string()),
            most_used_application: Some("Chrome".to_string()),
            activity_counts: {
                let mut m = std::collections::HashMap::new();
                m.insert("TextSelection".to_string(), 50);
                m.insert("Screenshot".to_string(), 30);
                m
            },
        };

        let json = serde_json::to_string(&stats);
        assert!(json.is_ok());

        let parsed: Result<ActivityStats, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
        assert_eq!(parsed.unwrap().total_activities, 100);
    }

    #[test]
    fn test_default_trait() {
        let tracker = ActivityTracker::default();
        assert!(tracker.is_enabled());
        assert_eq!(tracker.get_recent(10).len(), 0);
    }

    #[test]
    fn test_toggle_enabled() {
        let mut tracker = ActivityTracker::new();

        assert!(tracker.is_enabled());

        tracker.set_enabled(false);
        assert!(!tracker.is_enabled());

        tracker.set_enabled(true);
        assert!(tracker.is_enabled());
    }

    #[test]
    fn test_get_stats_empty() {
        let tracker = ActivityTracker::new();
        let stats = tracker.get_stats();

        assert_eq!(stats.total_activities, 0);
        assert_eq!(stats.activities_last_hour, 0);
        assert_eq!(stats.activities_last_day, 0);
        assert!(stats.most_common_type.is_none());
        assert!(stats.most_used_application.is_none());
    }

    #[test]
    fn test_export_empty() {
        let tracker = ActivityTracker::new();
        let json = tracker.export();
        assert_eq!(json, "[]");
    }

    #[test]
    fn test_user_activity_clone() {
        let activity = UserActivity::text_selection("test text", Some("App".to_string()));
        let cloned = activity.clone();

        assert_eq!(cloned.activity_type, activity.activity_type);
        assert_eq!(cloned.description, activity.description);
        assert_eq!(cloned.application, activity.application);
    }

    #[test]
    fn test_user_activity_debug() {
        let activity = UserActivity::screenshot("fullscreen", 1920, 1080);
        let debug_str = format!("{:?}", activity);

        assert!(debug_str.contains("Screenshot"));
        assert!(debug_str.contains("fullscreen"));
    }

    #[test]
    fn test_text_selection_long_text() {
        let long_text = "a".repeat(200);
        let activity = UserActivity::text_selection(&long_text, None);

        // Preview should be truncated
        if let Some(preview) = activity.metadata.get("text_preview") {
            assert!(preview.len() <= 103); // 100 chars + "..."
        }
    }

    #[test]
    fn test_text_selection_short_text() {
        let short_text = "hello";
        let activity = UserActivity::text_selection(short_text, None);

        if let Some(preview) = activity.metadata.get("text_preview") {
            assert_eq!(preview, short_text);
        }
    }

    #[test]
    fn test_ai_query_long_query() {
        let long_query = "a".repeat(100);
        let activity = UserActivity::ai_query(&long_query, "explain");

        // Description should be truncated
        assert!(activity.description.len() < long_query.len() + 20);
    }

    #[test]
    fn test_ai_query_short_query() {
        let short_query = "what is this?";
        let activity = UserActivity::ai_query(short_query, "ask");

        assert!(activity.description.contains(short_query));
    }

    #[test]
    fn test_multiple_applications_stats() {
        let mut tracker = ActivityTracker::new();

        // Record activities for different apps
        for _ in 0..5 {
            tracker.record(UserActivity::text_selection(
                "text",
                Some("App1".to_string()),
            ));
        }
        for _ in 0..3 {
            tracker.record(UserActivity::text_selection(
                "text",
                Some("App2".to_string()),
            ));
        }
        for _ in 0..2 {
            tracker.record(UserActivity::text_selection(
                "text",
                Some("App3".to_string()),
            ));
        }

        let stats = tracker.get_stats();
        assert_eq!(stats.total_activities, 10);
        assert_eq!(stats.most_used_application, Some("App1".to_string()));
    }

    #[test]
    fn test_get_by_type_empty() {
        let tracker = ActivityTracker::new();
        let result = tracker.get_by_type(&ActivityType::Screenshot);
        assert!(result.is_empty());
    }

    #[test]
    fn test_get_by_application_empty() {
        let tracker = ActivityTracker::new();
        let result = tracker.get_by_application("NonExistent");
        assert!(result.is_empty());
    }

    #[test]
    fn test_get_by_application_case_insensitive() {
        let mut tracker = ActivityTracker::new();
        tracker.record(UserActivity::text_selection(
            "text",
            Some("VSCode".to_string()),
        ));

        let result = tracker.get_by_application("vscode");
        assert_eq!(result.len(), 1);

        let result = tracker.get_by_application("VSCODE");
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_record_order() {
        let mut tracker = ActivityTracker::new();

        tracker.record(UserActivity::text_selection("first", None));
        tracker.record(UserActivity::text_selection("second", None));
        tracker.record(UserActivity::text_selection("third", None));

        let recent = tracker.get_recent(3);
        // Most recent should be first
        assert!(
            recent[0].description.contains("third")
                || recent[0]
                    .metadata
                    .get("text_preview")
                    .map(|s| s.contains("third"))
                    .unwrap_or(false)
        );
    }

    #[test]
    fn test_activity_with_all_fields() {
        let mut metadata = std::collections::HashMap::new();
        metadata.insert("custom_key".to_string(), "custom_value".to_string());

        let activity = UserActivity {
            activity_type: ActivityType::Custom("test".to_string()),
            description: "Test activity".to_string(),
            application: Some("TestApp".to_string()),
            target: Some("/target/path".to_string()),
            timestamp: 1000,
            duration_ms: Some(100),
            metadata,
        };

        let mut tracker = ActivityTracker::new();
        tracker.record(activity);

        let recent = tracker.get_recent(1);
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].target, Some("/target/path".to_string()));
        assert_eq!(recent[0].duration_ms, Some(100));
    }
}
