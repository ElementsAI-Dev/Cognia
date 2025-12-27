//! Focus tracking module
//!
//! Tracks application focus changes and usage statistics.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;

/// Focus session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSession {
    /// Application name
    pub app_name: String,
    /// Process name
    pub process_name: String,
    /// Window title
    pub window_title: String,
    /// Session start timestamp
    pub start_time: i64,
    /// Session end timestamp (None if still active)
    pub end_time: Option<i64>,
    /// Duration in milliseconds
    pub duration_ms: u64,
    /// Whether this is the current active session
    pub is_active: bool,
}

/// Application usage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUsageStats {
    /// Application name
    pub app_name: String,
    /// Total time spent in milliseconds
    pub total_time_ms: u64,
    /// Number of focus sessions
    pub session_count: usize,
    /// Average session duration
    pub avg_session_ms: u64,
    /// Last used timestamp
    pub last_used: i64,
    /// Most common window titles
    pub common_titles: Vec<String>,
}

/// Daily usage summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyUsageSummary {
    /// Date (YYYY-MM-DD)
    pub date: String,
    /// Total active time in milliseconds
    pub total_active_ms: u64,
    /// Usage by application
    pub by_app: HashMap<String, u64>,
    /// Most used applications (sorted by time)
    pub top_apps: Vec<(String, u64)>,
    /// Number of app switches
    pub switch_count: usize,
}

/// Focus tracker
pub struct FocusTracker {
    /// Current focus session
    current_session: Arc<RwLock<Option<FocusSession>>>,
    /// Recent focus sessions
    sessions: Arc<RwLock<Vec<FocusSession>>>,
    /// Maximum sessions to keep
    max_sessions: usize,
    /// Whether tracking is enabled
    is_tracking: Arc<std::sync::atomic::AtomicBool>,
}

impl FocusTracker {
    pub fn new() -> Self {
        Self {
            current_session: Arc::new(RwLock::new(None)),
            sessions: Arc::new(RwLock::new(Vec::new())),
            max_sessions: 1000,
            is_tracking: Arc::new(std::sync::atomic::AtomicBool::new(false)),
        }
    }

    /// Start tracking focus changes
    pub fn start_tracking(&self) {
        use std::sync::atomic::Ordering;
        self.is_tracking.store(true, Ordering::SeqCst);
        log::info!("Focus tracking started");
    }

    /// Stop tracking focus changes
    pub fn stop_tracking(&self) {
        use std::sync::atomic::Ordering;
        self.is_tracking.store(false, Ordering::SeqCst);
        
        // End current session
        self.end_current_session();
        log::info!("Focus tracking stopped");
    }

    /// Check if tracking is enabled
    pub fn is_tracking(&self) -> bool {
        use std::sync::atomic::Ordering;
        self.is_tracking.load(Ordering::SeqCst)
    }

    /// Record a focus change
    pub fn record_focus_change(&self, app_name: &str, process_name: &str, window_title: &str) {
        if !self.is_tracking() {
            return;
        }

        let now = chrono::Utc::now().timestamp_millis();

        // End current session
        self.end_current_session();

        // Start new session
        let session = FocusSession {
            app_name: app_name.to_string(),
            process_name: process_name.to_string(),
            window_title: window_title.to_string(),
            start_time: now,
            end_time: None,
            duration_ms: 0,
            is_active: true,
        };

        *self.current_session.write() = Some(session);
    }

    /// End the current focus session
    fn end_current_session(&self) {
        let now = chrono::Utc::now().timestamp_millis();
        
        let mut current = self.current_session.write();
        if let Some(mut session) = current.take() {
            session.end_time = Some(now);
            session.duration_ms = (now - session.start_time) as u64;
            session.is_active = false;

            // Add to history
            let mut sessions = self.sessions.write();
            sessions.push(session);

            // Trim if needed
            while sessions.len() > self.max_sessions {
                sessions.remove(0);
            }
        }
    }

    /// Get current focus session
    pub fn get_current_session(&self) -> Option<FocusSession> {
        let current = self.current_session.read();
        current.as_ref().map(|s| {
            let mut session = s.clone();
            // Update duration for active session
            let now = chrono::Utc::now().timestamp_millis();
            session.duration_ms = (now - session.start_time) as u64;
            session
        })
    }

    /// Get recent focus sessions
    pub fn get_recent_sessions(&self, count: usize) -> Vec<FocusSession> {
        let sessions = self.sessions.read();
        sessions.iter().rev().take(count).cloned().collect()
    }

    /// Get all sessions
    pub fn get_all_sessions(&self) -> Vec<FocusSession> {
        self.sessions.read().clone()
    }

    /// Get usage statistics for an application
    pub fn get_app_stats(&self, app_name: &str) -> Option<AppUsageStats> {
        let sessions = self.sessions.read();
        let app_sessions: Vec<_> = sessions
            .iter()
            .filter(|s| s.app_name.to_lowercase() == app_name.to_lowercase())
            .collect();

        if app_sessions.is_empty() {
            return None;
        }

        let total_time: u64 = app_sessions.iter().map(|s| s.duration_ms).sum();
        let session_count = app_sessions.len();
        let avg_session = total_time / session_count as u64;
        let last_used = app_sessions.iter().map(|s| s.start_time).max().unwrap_or(0);

        // Get common titles
        let mut title_counts: HashMap<String, usize> = HashMap::new();
        for session in &app_sessions {
            *title_counts.entry(session.window_title.clone()).or_insert(0) += 1;
        }
        let mut titles: Vec<_> = title_counts.into_iter().collect();
        titles.sort_by(|a, b| b.1.cmp(&a.1));
        let common_titles: Vec<String> = titles.into_iter().take(5).map(|(t, _)| t).collect();

        Some(AppUsageStats {
            app_name: app_name.to_string(),
            total_time_ms: total_time,
            session_count,
            avg_session_ms: avg_session,
            last_used,
            common_titles,
        })
    }

    /// Get all application statistics
    pub fn get_all_app_stats(&self) -> Vec<AppUsageStats> {
        let sessions = self.sessions.read();
        
        // Group by app
        let mut app_sessions: HashMap<String, Vec<&FocusSession>> = HashMap::new();
        for session in sessions.iter() {
            app_sessions
                .entry(session.app_name.clone())
                .or_insert_with(Vec::new)
                .push(session);
        }

        let mut stats: Vec<AppUsageStats> = app_sessions
            .into_iter()
            .map(|(app_name, sessions)| {
                let total_time: u64 = sessions.iter().map(|s| s.duration_ms).sum();
                let session_count = sessions.len();
                let avg_session = if session_count > 0 {
                    total_time / session_count as u64
                } else {
                    0
                };
                let last_used = sessions.iter().map(|s| s.start_time).max().unwrap_or(0);

                // Get common titles
                let mut title_counts: HashMap<String, usize> = HashMap::new();
                for session in &sessions {
                    *title_counts.entry(session.window_title.clone()).or_insert(0) += 1;
                }
                let mut titles: Vec<_> = title_counts.into_iter().collect();
                titles.sort_by(|a, b| b.1.cmp(&a.1));
                let common_titles: Vec<String> = titles.into_iter().take(5).map(|(t, _)| t).collect();

                AppUsageStats {
                    app_name,
                    total_time_ms: total_time,
                    session_count,
                    avg_session_ms: avg_session,
                    last_used,
                    common_titles,
                }
            })
            .collect();

        // Sort by total time
        stats.sort_by(|a, b| b.total_time_ms.cmp(&a.total_time_ms));
        stats
    }

    /// Get daily usage summary
    pub fn get_daily_summary(&self, date: &str) -> DailyUsageSummary {
        let sessions = self.sessions.read();
        
        // Parse date to get start/end timestamps
        let date_start = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
            .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp_millis())
            .unwrap_or(0);
        let date_end = date_start + 86400000; // +24 hours

        // Filter sessions for this date
        let day_sessions: Vec<_> = sessions
            .iter()
            .filter(|s| s.start_time >= date_start && s.start_time < date_end)
            .collect();

        let total_active: u64 = day_sessions.iter().map(|s| s.duration_ms).sum();
        let switch_count = day_sessions.len().saturating_sub(1);

        // Group by app
        let mut by_app: HashMap<String, u64> = HashMap::new();
        for session in &day_sessions {
            *by_app.entry(session.app_name.clone()).or_insert(0) += session.duration_ms;
        }

        // Get top apps
        let mut top_apps: Vec<_> = by_app.iter().map(|(k, v)| (k.clone(), *v)).collect();
        top_apps.sort_by(|a, b| b.1.cmp(&a.1));
        top_apps.truncate(10);

        DailyUsageSummary {
            date: date.to_string(),
            total_active_ms: total_active,
            by_app,
            top_apps,
            switch_count,
        }
    }

    /// Get today's summary
    pub fn get_today_summary(&self) -> DailyUsageSummary {
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        self.get_daily_summary(&today)
    }

    /// Clear all sessions
    pub fn clear(&self) {
        self.sessions.write().clear();
        *self.current_session.write() = None;
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        self.sessions.read().len()
    }
}

impl Default for FocusTracker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_tracker() {
        let tracker = FocusTracker::new();
        assert!(!tracker.is_tracking());
        assert_eq!(tracker.session_count(), 0);
    }

    #[test]
    fn test_start_stop_tracking() {
        let tracker = FocusTracker::new();
        
        tracker.start_tracking();
        assert!(tracker.is_tracking());
        
        tracker.stop_tracking();
        assert!(!tracker.is_tracking());
    }

    #[test]
    fn test_record_focus_change() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        tracker.record_focus_change("VSCode", "code.exe", "main.rs - Project");
        
        let current = tracker.get_current_session();
        assert!(current.is_some());
        
        let session = current.unwrap();
        assert_eq!(session.app_name, "VSCode");
        assert_eq!(session.process_name, "code.exe");
        assert!(session.is_active);
    }

    #[test]
    fn test_record_focus_change_when_not_tracking() {
        let tracker = FocusTracker::new();
        
        tracker.record_focus_change("VSCode", "code.exe", "main.rs");
        
        assert!(tracker.get_current_session().is_none());
    }

    #[test]
    fn test_multiple_focus_changes() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        tracker.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(10));
        tracker.record_focus_change("App2", "app2.exe", "Window 2");
        
        let current = tracker.get_current_session();
        assert!(current.is_some());
        assert_eq!(current.unwrap().app_name, "App2");
        
        // Previous session should be in history
        assert_eq!(tracker.session_count(), 1);
    }

    #[test]
    fn test_get_recent_sessions() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        for i in 0..5 {
            tracker.record_focus_change(
                &format!("App{}", i),
                &format!("app{}.exe", i),
                &format!("Window {}", i),
            );
            std::thread::sleep(std::time::Duration::from_millis(5));
        }
        
        let recent = tracker.get_recent_sessions(3);
        assert_eq!(recent.len(), 3);
    }

    #[test]
    fn test_get_app_stats() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        tracker.record_focus_change("VSCode", "code.exe", "file1.rs");
        std::thread::sleep(std::time::Duration::from_millis(10));
        tracker.record_focus_change("Chrome", "chrome.exe", "Google");
        std::thread::sleep(std::time::Duration::from_millis(10));
        tracker.record_focus_change("VSCode", "code.exe", "file2.rs");
        std::thread::sleep(std::time::Duration::from_millis(10));
        tracker.stop_tracking();
        
        let stats = tracker.get_app_stats("vscode");
        assert!(stats.is_some());
        
        let stats = stats.unwrap();
        assert_eq!(stats.session_count, 2);
    }

    #[test]
    fn test_get_all_app_stats() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        tracker.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(5));
        tracker.record_focus_change("App2", "app2.exe", "Window 2");
        std::thread::sleep(std::time::Duration::from_millis(5));
        tracker.stop_tracking();
        
        let all_stats = tracker.get_all_app_stats();
        assert_eq!(all_stats.len(), 2);
    }

    #[test]
    fn test_get_daily_summary() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        tracker.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(5));
        tracker.record_focus_change("App2", "app2.exe", "Window 2");
        std::thread::sleep(std::time::Duration::from_millis(5));
        tracker.stop_tracking();
        
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let summary = tracker.get_daily_summary(&today);
        
        assert_eq!(summary.date, today);
        assert!(summary.total_active_ms > 0 || summary.by_app.len() > 0);
    }

    #[test]
    fn test_get_today_summary() {
        let tracker = FocusTracker::new();
        let summary = tracker.get_today_summary();
        
        let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
        assert_eq!(summary.date, today);
    }

    #[test]
    fn test_clear() {
        let tracker = FocusTracker::new();
        tracker.start_tracking();
        
        tracker.record_focus_change("App1", "app1.exe", "Window 1");
        std::thread::sleep(std::time::Duration::from_millis(5));
        tracker.record_focus_change("App2", "app2.exe", "Window 2");
        
        tracker.clear();
        
        assert_eq!(tracker.session_count(), 0);
        assert!(tracker.get_current_session().is_none());
    }
}
