//! Awareness module
//!
//! Provides comprehensive system awareness capabilities:
//! - Screen content analysis
//! - System state monitoring
//! - Activity tracking
//! - Smart suggestions
//! - Focus tracking

pub mod activity_tracker;
mod focus_tracker;
mod smart_suggestions;
mod system_monitor;

pub use activity_tracker::{ActivityTracker, ActivityType, UserActivity};
pub use focus_tracker::{AppUsageStats, DailyUsageSummary, FocusSession, FocusTracker};
pub use smart_suggestions::{SmartSuggestions, Suggestion};
pub use system_monitor::{SystemMonitor, SystemState};

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Complete awareness state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AwarenessState {
    /// System state
    pub system: SystemState,
    /// Recent activities
    pub recent_activities: Vec<UserActivity>,
    /// Current suggestions
    pub suggestions: Vec<Suggestion>,
    /// Timestamp
    pub timestamp: i64,
}

/// Awareness manager
pub struct AwarenessManager {
    system_monitor: SystemMonitor,
    activity_tracker: Arc<RwLock<ActivityTracker>>,
    smart_suggestions: SmartSuggestions,
    focus_tracker: Arc<FocusTracker>,
    is_running: Arc<std::sync::atomic::AtomicBool>,
}

impl AwarenessManager {
    pub fn new() -> Self {
        log::debug!("Creating new AwarenessManager");
        Self {
            system_monitor: SystemMonitor::new(),
            activity_tracker: Arc::new(RwLock::new(ActivityTracker::new())),
            smart_suggestions: SmartSuggestions::new(),
            focus_tracker: Arc::new(FocusTracker::new()),
            is_running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    /// Get current awareness state
    pub fn get_state(&self) -> AwarenessState {
        log::trace!("Getting awareness state");
        let system = self.system_monitor.get_state();
        let recent_activities = self.activity_tracker.read().get_recent(10);
        let suggestions = self
            .smart_suggestions
            .get_suggestions(&system, &recent_activities);

        AwarenessState {
            system,
            recent_activities,
            suggestions,
            timestamp: chrono::Utc::now().timestamp_millis(),
        }
    }

    /// Get system state
    pub fn get_system_state(&self) -> SystemState {
        self.system_monitor.get_state()
    }

    /// Record an activity
    pub fn record_activity(&self, activity: UserActivity) {
        log::debug!("Recording activity: {:?}", activity.activity_type);
        self.activity_tracker.write().record(activity);
    }

    /// Get recent activities
    pub fn get_recent_activities(&self, count: usize) -> Vec<UserActivity> {
        self.activity_tracker.read().get_recent(count)
    }

    /// Get suggestions based on current context
    pub fn get_suggestions(&self) -> Vec<Suggestion> {
        let system = self.system_monitor.get_state();
        let activities = self.activity_tracker.read().get_recent(10);
        self.smart_suggestions.get_suggestions(&system, &activities)
    }

    /// Start background monitoring
    pub async fn start_monitoring(&self) -> Result<(), String> {
        use std::sync::atomic::Ordering;

        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.is_running.store(true, Ordering::SeqCst);

        let is_running = self.is_running.clone();
        let _activity_tracker = self.activity_tracker.clone();

        // Spawn background monitoring task
        tauri::async_runtime::spawn(async move {
            log::info!("Awareness monitoring started");

            while is_running.load(Ordering::SeqCst) {
                // Periodic activity recording could happen here
                // The _activity_tracker is available for future use
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            }

            log::info!("Awareness monitoring stopped");
        });

        Ok(())
    }

    /// Stop background monitoring
    pub fn stop_monitoring(&self) {
        use std::sync::atomic::Ordering;
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Clear activity history
    pub fn clear_history(&self) {
        log::info!("Clearing activity history");
        self.activity_tracker.write().clear();
    }

    // ============== Focus Tracking Methods ==============

    /// Start focus tracking
    pub fn start_focus_tracking(&self) {
        log::info!("Starting focus tracking via AwarenessManager");
        self.focus_tracker.start_tracking();
    }

    /// Stop focus tracking
    pub fn stop_focus_tracking(&self) {
        log::info!("Stopping focus tracking via AwarenessManager");
        self.focus_tracker.stop_tracking();
    }

    /// Record a focus change
    pub fn record_focus_change(&self, app_name: &str, process_name: &str, window_title: &str) {
        log::debug!(
            "Focus change: app='{}', process='{}'",
            app_name,
            process_name
        );
        self.focus_tracker
            .record_focus_change(app_name, process_name, window_title);
    }

    /// Get current focus session
    pub fn get_current_focus(&self) -> Option<FocusSession> {
        self.focus_tracker.get_current_session()
    }

    /// Get recent focus sessions
    pub fn get_recent_focus_sessions(&self, count: usize) -> Vec<FocusSession> {
        self.focus_tracker.get_recent_sessions(count)
    }

    /// Get app usage statistics
    pub fn get_app_usage_stats(&self, app_name: &str) -> Option<AppUsageStats> {
        self.focus_tracker.get_app_stats(app_name)
    }

    /// Get all app usage statistics
    pub fn get_all_app_usage_stats(&self) -> Vec<AppUsageStats> {
        self.focus_tracker.get_all_app_stats()
    }

    /// Get today's usage summary
    pub fn get_today_usage_summary(&self) -> DailyUsageSummary {
        self.focus_tracker.get_today_summary()
    }

    /// Get daily usage summary
    pub fn get_daily_usage_summary(&self, date: &str) -> DailyUsageSummary {
        self.focus_tracker.get_daily_summary(date)
    }

    /// Clear focus history
    pub fn clear_focus_history(&self) {
        log::info!("Clearing focus history");
        self.focus_tracker.clear();
    }

    /// Check if focus tracking is enabled
    pub fn is_focus_tracking(&self) -> bool {
        self.focus_tracker.is_tracking()
    }

    // ============== Activity Tracker Extended Methods ==============

    /// Get activities by type
    pub fn get_activities_by_type(&self, activity_type: &ActivityType) -> Vec<UserActivity> {
        self.activity_tracker.read().get_by_type(activity_type)
    }

    /// Get activities within time range
    pub fn get_activities_in_range(&self, start_ms: i64, end_ms: i64) -> Vec<UserActivity> {
        self.activity_tracker.read().get_in_range(start_ms, end_ms)
    }

    /// Get activities for a specific application
    pub fn get_activities_by_application(&self, app_name: &str) -> Vec<UserActivity> {
        self.activity_tracker.read().get_by_application(app_name)
    }

    /// Get activity statistics
    pub fn get_activity_stats(&self) -> activity_tracker::ActivityStats {
        self.activity_tracker.read().get_stats()
    }

    /// Enable/disable activity tracking
    pub fn set_activity_tracking_enabled(&self, enabled: bool) {
        self.activity_tracker.write().set_enabled(enabled);
    }

    /// Check if activity tracking is enabled
    pub fn is_activity_tracking_enabled(&self) -> bool {
        self.activity_tracker.read().is_enabled()
    }

    /// Export activity history as JSON
    pub fn export_activity_history(&self) -> String {
        self.activity_tracker.read().export()
    }

    /// Import activity history from JSON
    pub fn import_activity_history(&self, json: &str) -> Result<usize, String> {
        self.activity_tracker.write().import(json)
    }

    // ============== Smart Suggestions Extended Methods ==============

    /// Dismiss a suggestion
    pub fn dismiss_suggestion(&self, action: &str) {
        self.smart_suggestions.dismiss(action);
    }

    /// Clear all dismissed suggestions
    pub fn clear_dismissed_suggestions(&self) {
        self.smart_suggestions.clear_dismissed();
    }

    /// Check if a suggestion is dismissed
    pub fn is_suggestion_dismissed(&self, action: &str) -> bool {
        self.smart_suggestions.is_dismissed(action)
    }

    /// Get list of dismissed suggestions
    pub fn get_dismissed_suggestions(&self) -> Vec<String> {
        self.smart_suggestions.get_dismissed()
    }

    // ============== Focus Tracker Extended Methods ==============

    /// Get all focus sessions
    pub fn get_all_focus_sessions(&self) -> Vec<FocusSession> {
        self.focus_tracker.get_all_sessions()
    }

    /// Get focus session count
    pub fn get_focus_session_count(&self) -> usize {
        self.focus_tracker.session_count()
    }
}

impl Default for AwarenessManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_manager() {
        let manager = AwarenessManager::new();
        // Should be able to get state without errors
        let state = manager.get_state();
        assert!(state.timestamp > 0);
    }

    #[test]
    fn test_get_system_state() {
        let manager = AwarenessManager::new();
        let state = manager.get_system_state();
        // Basic sanity check
        assert!(state.memory_total >= state.memory_used);
    }

    #[test]
    fn test_record_activity() {
        let manager = AwarenessManager::new();

        let activity = UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Test activity".to_string(),
            application: Some("TestApp".to_string()),
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        };

        manager.record_activity(activity);

        let recent = manager.get_recent_activities(10);
        assert_eq!(recent.len(), 1);
    }

    #[test]
    fn test_get_suggestions() {
        let manager = AwarenessManager::new();
        let suggestions = manager.get_suggestions();
        // Should return a list (may be empty)
        assert!(suggestions.len() <= 5);
    }

    #[test]
    fn test_clear_history() {
        let manager = AwarenessManager::new();

        let activity = UserActivity {
            activity_type: ActivityType::Screenshot,
            description: "Test".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        };

        manager.record_activity(activity);
        assert!(!manager.get_recent_activities(10).is_empty());

        manager.clear_history();
        assert!(manager.get_recent_activities(10).is_empty());
    }

    #[test]
    fn test_focus_tracking() {
        let manager = AwarenessManager::new();

        assert!(!manager.is_focus_tracking());

        manager.start_focus_tracking();
        assert!(manager.is_focus_tracking());

        manager.record_focus_change("TestApp", "test.exe", "Test Window");

        let current = manager.get_current_focus();
        assert!(current.is_some());

        manager.stop_focus_tracking();
        assert!(!manager.is_focus_tracking());
    }

    #[test]
    fn test_focus_sessions() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(10));
        manager.record_focus_change("App2", "app2.exe", "Window 2");

        let sessions = manager.get_recent_focus_sessions(10);
        assert!(!sessions.is_empty());

        manager.stop_focus_tracking();
    }

    #[test]
    fn test_app_usage_stats() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("TestApp", "test.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(10));
        manager.record_focus_change("OtherApp", "other.exe", "Other");
        std::thread::sleep(std::time::Duration::from_millis(10));
        manager.stop_focus_tracking();

        let stats = manager.get_app_usage_stats("testapp");
        assert!(stats.is_some());
    }

    #[test]
    fn test_all_app_usage_stats() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.record_focus_change("App2", "app2.exe", "Window 2");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.stop_focus_tracking();

        let all_stats = manager.get_all_app_usage_stats();
        assert_eq!(all_stats.len(), 2);
    }

    #[test]
    fn test_today_usage_summary() {
        let manager = AwarenessManager::new();
        let summary = manager.get_today_usage_summary();

        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(summary.date, today);
    }

    #[test]
    fn test_daily_usage_summary() {
        let manager = AwarenessManager::new();
        let summary = manager.get_daily_usage_summary("2024-01-01");

        assert_eq!(summary.date, "2024-01-01");
    }

    #[test]
    fn test_clear_focus_history() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("App", "app.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.record_focus_change("App2", "app2.exe", "Window2");

        manager.clear_focus_history();

        let sessions = manager.get_recent_focus_sessions(10);
        assert!(sessions.is_empty());

        manager.stop_focus_tracking();
    }

    #[test]
    fn test_awareness_state_serialization() {
        let manager = AwarenessManager::new();
        let state = manager.get_state();

        let json = serde_json::to_string(&state);
        assert!(json.is_ok());

        let parsed: Result<AwarenessState, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_default_trait() {
        let manager = AwarenessManager::default();
        let state = manager.get_state();
        assert!(state.timestamp > 0);
    }

    #[test]
    fn test_awareness_state_clone() {
        let manager = AwarenessManager::new();
        let state = manager.get_state();
        let cloned = state.clone();

        assert_eq!(cloned.timestamp, state.timestamp);
        assert_eq!(
            cloned.recent_activities.len(),
            state.recent_activities.len()
        );
    }

    #[test]
    fn test_awareness_state_debug() {
        let manager = AwarenessManager::new();
        let state = manager.get_state();
        let debug_str = format!("{:?}", state);

        assert!(debug_str.contains("timestamp"));
        assert!(debug_str.contains("system"));
    }

    #[test]
    fn test_multiple_activities() {
        let manager = AwarenessManager::new();

        for i in 0..20 {
            let activity = UserActivity {
                activity_type: ActivityType::TextSelection,
                description: format!("Activity {}", i),
                application: Some("TestApp".to_string()),
                target: None,
                timestamp: chrono::Utc::now().timestamp_millis() + i as i64,
                duration_ms: None,
                metadata: std::collections::HashMap::new(),
            };
            manager.record_activity(activity);
        }

        let recent = manager.get_recent_activities(10);
        assert_eq!(recent.len(), 10);

        let all = manager.get_recent_activities(100);
        assert_eq!(all.len(), 20);
    }

    #[test]
    fn test_get_state_includes_activities() {
        let manager = AwarenessManager::new();

        let activity = UserActivity {
            activity_type: ActivityType::AiQuery,
            description: "Test query".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        };
        manager.record_activity(activity);

        let state = manager.get_state();
        assert_eq!(state.recent_activities.len(), 1);
    }

    #[test]
    fn test_stop_monitoring_idempotent() {
        let manager = AwarenessManager::new();

        // Stop multiple times should not panic
        manager.stop_monitoring();
        manager.stop_monitoring();
        manager.stop_monitoring();
    }

    #[test]
    fn test_start_monitoring_idempotent() {
        let manager = AwarenessManager::new();

        let result = tauri::async_runtime::block_on(manager.start_monitoring());
        assert!(result.is_ok());

        let second = tauri::async_runtime::block_on(manager.start_monitoring());
        assert!(second.is_ok());

        manager.stop_monitoring();
    }

    #[test]
    fn test_focus_tracking_integration() {
        let manager = AwarenessManager::new();

        assert!(!manager.is_focus_tracking());

        manager.start_focus_tracking();
        assert!(manager.is_focus_tracking());

        manager.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(10));
        manager.record_focus_change("App2", "app2.exe", "Window 2");

        let sessions = manager.get_recent_focus_sessions(5);
        assert!(!sessions.is_empty());

        let current = manager.get_current_focus();
        assert!(current.is_some());
        assert_eq!(current.unwrap().app_name, "App2");

        manager.stop_focus_tracking();
        assert!(!manager.is_focus_tracking());
    }

    #[test]
    fn test_app_usage_stats_integration() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        for i in 0..3 {
            manager.record_focus_change("TestApp", "test.exe", &format!("Window {}", i));
            std::thread::sleep(std::time::Duration::from_millis(5));
        }
        manager.record_focus_change("OtherApp", "other.exe", "Other");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.stop_focus_tracking();

        let stats = manager.get_app_usage_stats("testapp");
        assert!(stats.is_some());
        assert_eq!(stats.unwrap().session_count, 3);
    }

    #[test]
    fn test_all_app_usage_stats_integration() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("App1", "app1.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.record_focus_change("App2", "app2.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.record_focus_change("App3", "app3.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.stop_focus_tracking();

        let all_stats = manager.get_all_app_usage_stats();
        assert_eq!(all_stats.len(), 3);
    }

    #[test]
    fn test_daily_summary_integration() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("App", "app.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(10));
        manager.stop_focus_tracking();

        let today_summary = manager.get_today_usage_summary();
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(today_summary.date, today);
    }

    #[test]
    fn test_specific_date_summary() {
        let manager = AwarenessManager::new();
        let summary = manager.get_daily_usage_summary("2024-06-15");

        assert_eq!(summary.date, "2024-06-15");
        // No data for this date
        assert_eq!(summary.total_active_ms, 0);
    }

    #[test]
    fn test_clear_both_histories() {
        let manager = AwarenessManager::new();

        // Add activity
        let activity = UserActivity {
            activity_type: ActivityType::Screenshot,
            description: "Test".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        };
        manager.record_activity(activity);

        // Add focus session
        manager.start_focus_tracking();
        manager.record_focus_change("App", "app.exe", "Window");
        std::thread::sleep(std::time::Duration::from_millis(5));

        // Clear both
        manager.clear_history();
        manager.clear_focus_history();

        assert!(manager.get_recent_activities(10).is_empty());
        assert!(manager.get_recent_focus_sessions(10).is_empty());

        manager.stop_focus_tracking();
    }

    #[test]
    fn test_suggestions_with_activities() {
        let manager = AwarenessManager::new();

        // Add some activities
        for i in 0..5 {
            let activity = UserActivity {
                activity_type: ActivityType::TextSelection,
                description: format!("Selection {}", i),
                application: Some("VSCode".to_string()),
                target: None,
                timestamp: chrono::Utc::now().timestamp_millis(),
                duration_ms: None,
                metadata: {
                    let mut m = std::collections::HashMap::new();
                    m.insert("text_length".to_string(), "100".to_string());
                    m
                },
            };
            manager.record_activity(activity);
        }

        let suggestions = manager.get_suggestions();
        assert!(suggestions.len() <= 5);
    }

    #[test]
    fn test_activity_types_coverage() {
        let manager = AwarenessManager::new();

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
            ActivityType::Custom("custom".to_string()),
        ];

        for activity_type in types {
            let activity = UserActivity {
                activity_type,
                description: "Test".to_string(),
                application: None,
                target: None,
                timestamp: chrono::Utc::now().timestamp_millis(),
                duration_ms: None,
                metadata: std::collections::HashMap::new(),
            };
            manager.record_activity(activity);
        }

        let recent = manager.get_recent_activities(20);
        assert_eq!(recent.len(), 14);
    }

    #[test]
    fn test_concurrent_operations() {
        let manager = AwarenessManager::new();

        // Start focus tracking
        manager.start_focus_tracking();

        // Record activity while tracking focus
        let activity = UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Concurrent test".to_string(),
            application: Some("TestApp".to_string()),
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        };
        manager.record_activity(activity);

        // Record focus change
        manager.record_focus_change("App", "app.exe", "Window");

        // Get state (should include both)
        let state = manager.get_state();
        assert!(!state.recent_activities.is_empty());

        manager.stop_focus_tracking();
    }

    #[test]
    fn test_empty_state() {
        let manager = AwarenessManager::new();
        let state = manager.get_state();

        assert!(state.recent_activities.is_empty());
        assert!(state.timestamp > 0);
    }

    #[test]
    fn test_system_state_through_manager() {
        let manager = AwarenessManager::new();
        let system_state = manager.get_system_state();

        // Basic sanity checks
        assert!(system_state.memory_total >= system_state.memory_used);
        assert!(system_state.cpu_usage >= 0.0);
    }

    #[test]
    fn test_focus_tracking_without_starting() {
        let manager = AwarenessManager::new();

        // Recording without starting should be ignored
        manager.record_focus_change("App", "app.exe", "Window");

        assert!(manager.get_current_focus().is_none());
        assert!(manager.get_recent_focus_sessions(10).is_empty());
    }

    #[test]
    fn test_get_recent_activities_limit() {
        let manager = AwarenessManager::new();

        for i in 0..15 {
            let activity = UserActivity {
                activity_type: ActivityType::TextSelection,
                description: format!("Activity {}", i),
                application: None,
                target: None,
                timestamp: chrono::Utc::now().timestamp_millis() + i as i64,
                duration_ms: None,
                metadata: std::collections::HashMap::new(),
            };
            manager.record_activity(activity);
        }

        let five = manager.get_recent_activities(5);
        assert_eq!(five.len(), 5);

        let zero = manager.get_recent_activities(0);
        assert_eq!(zero.len(), 0);
    }

    #[test]
    fn test_app_usage_stats_nonexistent() {
        let manager = AwarenessManager::new();
        let stats = manager.get_app_usage_stats("NonExistentApp");
        assert!(stats.is_none());
    }

    // ============== Extended Methods Tests ==============

    #[test]
    fn test_get_activities_by_type() {
        let manager = AwarenessManager::new();

        // Add activities of different types
        manager.record_activity(UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Selection 1".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        });
        manager.record_activity(UserActivity {
            activity_type: ActivityType::Screenshot,
            description: "Screenshot 1".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        });
        manager.record_activity(UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Selection 2".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        });

        let selections = manager.get_activities_by_type(&ActivityType::TextSelection);
        assert_eq!(selections.len(), 2);

        let screenshots = manager.get_activities_by_type(&ActivityType::Screenshot);
        assert_eq!(screenshots.len(), 1);
    }

    #[test]
    fn test_get_activities_in_range() {
        let manager = AwarenessManager::new();
        let now = chrono::Utc::now().timestamp_millis();

        for i in 0..5 {
            manager.record_activity(UserActivity {
                activity_type: ActivityType::TextSelection,
                description: format!("Activity {}", i),
                application: None,
                target: None,
                timestamp: now + (i * 1000) as i64,
                duration_ms: None,
                metadata: std::collections::HashMap::new(),
            });
        }

        let in_range = manager.get_activities_in_range(now + 1000, now + 3000);
        assert_eq!(in_range.len(), 3);
    }

    #[test]
    fn test_get_activities_by_application() {
        let manager = AwarenessManager::new();

        manager.record_activity(UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "VSCode activity".to_string(),
            application: Some("VSCode".to_string()),
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        });
        manager.record_activity(UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Chrome activity".to_string(),
            application: Some("Chrome".to_string()),
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        });

        let vscode_activities = manager.get_activities_by_application("vscode");
        assert_eq!(vscode_activities.len(), 1);
    }

    #[test]
    fn test_get_activity_stats() {
        let manager = AwarenessManager::new();

        for _ in 0..5 {
            manager.record_activity(UserActivity {
                activity_type: ActivityType::TextSelection,
                description: "Activity".to_string(),
                application: Some("TestApp".to_string()),
                target: None,
                timestamp: chrono::Utc::now().timestamp_millis(),
                duration_ms: None,
                metadata: std::collections::HashMap::new(),
            });
        }

        let stats = manager.get_activity_stats();
        assert_eq!(stats.total_activities, 5);
    }

    #[test]
    fn test_activity_tracking_enabled() {
        let manager = AwarenessManager::new();

        assert!(manager.is_activity_tracking_enabled());

        manager.set_activity_tracking_enabled(false);
        assert!(!manager.is_activity_tracking_enabled());

        manager.set_activity_tracking_enabled(true);
        assert!(manager.is_activity_tracking_enabled());
    }

    #[test]
    fn test_export_import_activity_history() {
        let manager = AwarenessManager::new();

        manager.record_activity(UserActivity {
            activity_type: ActivityType::TextSelection,
            description: "Export test".to_string(),
            application: None,
            target: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: None,
            metadata: std::collections::HashMap::new(),
        });

        let exported = manager.export_activity_history();
        assert!(!exported.is_empty());

        manager.clear_history();
        assert!(manager.get_recent_activities(10).is_empty());

        let imported = manager.import_activity_history(&exported);
        assert!(imported.is_ok());
        assert_eq!(imported.unwrap(), 1);
    }

    #[test]
    fn test_dismiss_suggestion() {
        let manager = AwarenessManager::new();

        assert!(!manager.is_suggestion_dismissed("test_action"));

        manager.dismiss_suggestion("test_action");
        assert!(manager.is_suggestion_dismissed("test_action"));

        let dismissed = manager.get_dismissed_suggestions();
        assert!(dismissed.contains(&"test_action".to_string()));

        manager.clear_dismissed_suggestions();
        assert!(!manager.is_suggestion_dismissed("test_action"));
    }

    #[test]
    fn test_get_all_focus_sessions() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        manager.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.record_focus_change("App2", "app2.exe", "Window 2");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.stop_focus_tracking();

        let all_sessions = manager.get_all_focus_sessions();
        assert_eq!(all_sessions.len(), 2);
    }

    #[test]
    fn test_get_focus_session_count() {
        let manager = AwarenessManager::new();
        manager.start_focus_tracking();

        assert_eq!(manager.get_focus_session_count(), 0);

        manager.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.record_focus_change("App2", "app2.exe", "Window 2");
        std::thread::sleep(std::time::Duration::from_millis(5));
        manager.stop_focus_tracking();

        assert_eq!(manager.get_focus_session_count(), 2);
    }
}
