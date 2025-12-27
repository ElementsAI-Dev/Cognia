//! Selection history management
//!
//! Tracks selection history across applications for easy recall and analysis.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use parking_lot::RwLock;

/// Maximum number of history entries to keep
const MAX_HISTORY_SIZE: usize = 100;

/// A single selection history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionHistoryEntry {
    /// The selected text
    pub text: String,
    /// Timestamp of selection
    pub timestamp: i64,
    /// Source application name
    pub app_name: Option<String>,
    /// Source window title
    pub window_title: Option<String>,
    /// Source process name
    pub process_name: Option<String>,
    /// Mouse position when selected
    pub position: (i32, i32),
    /// Text before selection (context)
    pub context_before: Option<String>,
    /// Text after selection (context)
    pub context_after: Option<String>,
    /// Whether this was a manual or auto selection
    pub is_manual: bool,
    /// Tags for categorization
    pub tags: Vec<String>,
    /// Detected text type
    pub text_type: Option<String>,
    /// Detected language (for code)
    pub language: Option<String>,
}

impl SelectionHistoryEntry {
    pub fn new(text: String, x: i32, y: i32) -> Self {
        Self {
            text,
            timestamp: chrono::Utc::now().timestamp_millis(),
            app_name: None,
            window_title: None,
            process_name: None,
            position: (x, y),
            context_before: None,
            context_after: None,
            is_manual: false,
            tags: Vec::new(),
            text_type: None,
            language: None,
        }
    }

    pub fn with_app_info(mut self, app_name: Option<String>, window_title: Option<String>, process_name: Option<String>) -> Self {
        self.app_name = app_name;
        self.window_title = window_title;
        self.process_name = process_name;
        self
    }

    pub fn with_context(mut self, before: Option<String>, after: Option<String>) -> Self {
        self.context_before = before;
        self.context_after = after;
        self
    }

    pub fn with_type_info(mut self, text_type: Option<String>, language: Option<String>) -> Self {
        self.text_type = text_type;
        self.language = language;
        self
    }

    pub fn add_tag(&mut self, tag: String) {
        if !self.tags.contains(&tag) {
            self.tags.push(tag);
        }
    }
}

/// Selection history statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionHistoryStats {
    /// Total number of selections
    pub total_selections: usize,
    /// Selections by application
    pub by_app: std::collections::HashMap<String, usize>,
    /// Selections by text type
    pub by_type: std::collections::HashMap<String, usize>,
    /// Average text length
    pub avg_text_length: f64,
    /// Most common words
    pub common_words: Vec<(String, usize)>,
    /// Time range
    pub earliest_timestamp: Option<i64>,
    pub latest_timestamp: Option<i64>,
}

/// Selection history manager
pub struct SelectionHistory {
    entries: Arc<RwLock<VecDeque<SelectionHistoryEntry>>>,
    max_size: usize,
}

impl SelectionHistory {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(MAX_HISTORY_SIZE))),
            max_size: MAX_HISTORY_SIZE,
        }
    }

    pub fn with_max_size(max_size: usize) -> Self {
        Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(max_size))),
            max_size,
        }
    }

    /// Add a new entry to history
    pub fn add(&self, entry: SelectionHistoryEntry) {
        let mut entries = self.entries.write();
        
        // Check for duplicate (same text within last 5 seconds)
        if let Some(last) = entries.front() {
            if last.text == entry.text && 
               (entry.timestamp - last.timestamp).abs() < 5000 {
                return; // Skip duplicate
            }
        }

        entries.push_front(entry);
        
        // Trim to max size
        while entries.len() > self.max_size {
            entries.pop_back();
        }
    }

    /// Get recent entries
    pub fn get_recent(&self, count: usize) -> Vec<SelectionHistoryEntry> {
        let entries = self.entries.read();
        entries.iter().take(count).cloned().collect()
    }

    /// Get all entries
    pub fn get_all(&self) -> Vec<SelectionHistoryEntry> {
        self.entries.read().iter().cloned().collect()
    }

    /// Search history by text content
    pub fn search(&self, query: &str) -> Vec<SelectionHistoryEntry> {
        let query_lower = query.to_lowercase();
        let entries = self.entries.read();
        entries
            .iter()
            .filter(|e| e.text.to_lowercase().contains(&query_lower))
            .cloned()
            .collect()
    }

    /// Search by application
    pub fn search_by_app(&self, app_name: &str) -> Vec<SelectionHistoryEntry> {
        let app_lower = app_name.to_lowercase();
        let entries = self.entries.read();
        entries
            .iter()
            .filter(|e| {
                e.app_name
                    .as_ref()
                    .map(|n| n.to_lowercase().contains(&app_lower))
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Search by text type
    pub fn search_by_type(&self, text_type: &str) -> Vec<SelectionHistoryEntry> {
        let entries = self.entries.read();
        entries
            .iter()
            .filter(|e| {
                e.text_type
                    .as_ref()
                    .map(|t| t == text_type)
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Search by time range
    pub fn search_by_time(&self, start: i64, end: i64) -> Vec<SelectionHistoryEntry> {
        let entries = self.entries.read();
        entries
            .iter()
            .filter(|e| e.timestamp >= start && e.timestamp <= end)
            .cloned()
            .collect()
    }

    /// Get entry by index
    pub fn get(&self, index: usize) -> Option<SelectionHistoryEntry> {
        self.entries.read().get(index).cloned()
    }

    /// Get the most recent entry
    pub fn get_latest(&self) -> Option<SelectionHistoryEntry> {
        self.entries.read().front().cloned()
    }

    /// Clear all history
    pub fn clear(&self) {
        self.entries.write().clear();
    }

    /// Get history size
    pub fn len(&self) -> usize {
        self.entries.read().len()
    }

    /// Check if history is empty
    pub fn is_empty(&self) -> bool {
        self.entries.read().is_empty()
    }

    /// Get statistics about selection history
    pub fn get_stats(&self) -> SelectionHistoryStats {
        let entries = self.entries.read();
        
        let mut by_app: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        let mut by_type: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        let mut word_counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
        let mut total_length: usize = 0;
        let mut earliest: Option<i64> = None;
        let mut latest: Option<i64> = None;

        for entry in entries.iter() {
            // Count by app
            if let Some(ref app) = entry.app_name {
                *by_app.entry(app.clone()).or_insert(0) += 1;
            }

            // Count by type
            if let Some(ref text_type) = entry.text_type {
                *by_type.entry(text_type.clone()).or_insert(0) += 1;
            }

            // Count words
            for word in entry.text.split_whitespace() {
                let word_lower = word.to_lowercase();
                if word_lower.len() >= 3 {
                    *word_counts.entry(word_lower).or_insert(0) += 1;
                }
            }

            total_length += entry.text.len();

            // Track time range
            if earliest.is_none() || entry.timestamp < earliest.unwrap() {
                earliest = Some(entry.timestamp);
            }
            if latest.is_none() || entry.timestamp > latest.unwrap() {
                latest = Some(entry.timestamp);
            }
        }

        // Get top 10 common words
        let mut common_words: Vec<_> = word_counts.into_iter().collect();
        common_words.sort_by(|a, b| b.1.cmp(&a.1));
        common_words.truncate(10);

        SelectionHistoryStats {
            total_selections: entries.len(),
            by_app,
            by_type,
            avg_text_length: if entries.is_empty() {
                0.0
            } else {
                total_length as f64 / entries.len() as f64
            },
            common_words,
            earliest_timestamp: earliest,
            latest_timestamp: latest,
        }
    }

    /// Export history to JSON
    pub fn export_json(&self) -> Result<String, String> {
        let entries = self.get_all();
        serde_json::to_string_pretty(&entries).map_err(|e| e.to_string())
    }

    /// Import history from JSON
    pub fn import_json(&self, json: &str) -> Result<usize, String> {
        let imported: Vec<SelectionHistoryEntry> = 
            serde_json::from_str(json).map_err(|e| e.to_string())?;
        
        let count = imported.len();
        let mut entries = self.entries.write();
        
        for entry in imported {
            entries.push_back(entry);
        }

        // Trim to max size
        while entries.len() > self.max_size {
            entries.pop_back();
        }

        Ok(count)
    }
}

impl Default for SelectionHistory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_and_get() {
        let history = SelectionHistory::new();
        let entry = SelectionHistoryEntry::new("test text".to_string(), 100, 200);
        history.add(entry);
        
        assert_eq!(history.len(), 1);
        let retrieved = history.get_latest().unwrap();
        assert_eq!(retrieved.text, "test text");
    }

    #[test]
    fn test_search() {
        let history = SelectionHistory::new();
        history.add(SelectionHistoryEntry::new("hello world".to_string(), 0, 0));
        history.add(SelectionHistoryEntry::new("goodbye world".to_string(), 0, 0));
        history.add(SelectionHistoryEntry::new("hello rust".to_string(), 0, 0));

        let results = history.search("hello");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_max_size() {
        let history = SelectionHistory::with_max_size(5);
        for i in 0..10 {
            // Add small delay to avoid duplicate detection
            let mut entry = SelectionHistoryEntry::new(format!("text {}", i), 0, 0);
            entry.timestamp += i as i64 * 10000; // Different timestamps
            history.add(entry);
        }
        
        assert_eq!(history.len(), 5);
    }

    #[test]
    fn test_duplicate_detection() {
        let history = SelectionHistory::new();
        
        let entry1 = SelectionHistoryEntry::new("same text".to_string(), 0, 0);
        let mut entry2 = SelectionHistoryEntry::new("same text".to_string(), 0, 0);
        entry2.timestamp = entry1.timestamp + 1000; // Within 5 seconds
        
        history.add(entry1);
        history.add(entry2);
        
        // Duplicate within 5 seconds should be skipped
        assert_eq!(history.len(), 1);
    }

    #[test]
    fn test_search_by_app() {
        let history = SelectionHistory::new();
        
        let mut entry1 = SelectionHistoryEntry::new("text1".to_string(), 0, 0);
        entry1.app_name = Some("VSCode".to_string());
        
        let mut entry2 = SelectionHistoryEntry::new("text2".to_string(), 0, 0);
        entry2.app_name = Some("Chrome".to_string());
        entry2.timestamp += 10000;
        
        let mut entry3 = SelectionHistoryEntry::new("text3".to_string(), 0, 0);
        entry3.app_name = Some("VSCode Editor".to_string());
        entry3.timestamp += 20000;
        
        history.add(entry1);
        history.add(entry2);
        history.add(entry3);
        
        let results = history.search_by_app("vscode");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_by_type() {
        let history = SelectionHistory::new();
        
        let mut entry1 = SelectionHistoryEntry::new("text1".to_string(), 0, 0);
        entry1.text_type = Some("Code".to_string());
        
        let mut entry2 = SelectionHistoryEntry::new("text2".to_string(), 0, 0);
        entry2.text_type = Some("PlainText".to_string());
        entry2.timestamp += 10000;
        
        let mut entry3 = SelectionHistoryEntry::new("text3".to_string(), 0, 0);
        entry3.text_type = Some("Code".to_string());
        entry3.timestamp += 20000;
        
        history.add(entry1);
        history.add(entry2);
        history.add(entry3);
        
        let results = history.search_by_type("Code");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_by_time() {
        let history = SelectionHistory::new();
        let now = chrono::Utc::now().timestamp_millis();
        
        let mut entry1 = SelectionHistoryEntry::new("old".to_string(), 0, 0);
        entry1.timestamp = now - 100000;
        
        let mut entry2 = SelectionHistoryEntry::new("recent".to_string(), 0, 0);
        entry2.timestamp = now - 50000;
        
        let mut entry3 = SelectionHistoryEntry::new("newest".to_string(), 0, 0);
        entry3.timestamp = now;
        
        history.add(entry1);
        history.add(entry2);
        history.add(entry3);
        
        let results = history.search_by_time(now - 60000, now);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_get_by_index() {
        let history = SelectionHistory::new();
        
        let mut entry1 = SelectionHistoryEntry::new("first".to_string(), 0, 0);
        let mut entry2 = SelectionHistoryEntry::new("second".to_string(), 0, 0);
        entry2.timestamp += 10000;
        
        history.add(entry1);
        history.add(entry2);
        
        let first = history.get(0);
        assert!(first.is_some());
        assert_eq!(first.unwrap().text, "second"); // Most recent first
        
        let none = history.get(10);
        assert!(none.is_none());
    }

    #[test]
    fn test_get_latest() {
        let history = SelectionHistory::new();
        assert!(history.get_latest().is_none());
        
        let mut entry1 = SelectionHistoryEntry::new("first".to_string(), 0, 0);
        let mut entry2 = SelectionHistoryEntry::new("second".to_string(), 0, 0);
        entry2.timestamp += 10000;
        
        history.add(entry1);
        history.add(entry2);
        
        let latest = history.get_latest();
        assert!(latest.is_some());
        assert_eq!(latest.unwrap().text, "second");
    }

    #[test]
    fn test_is_empty() {
        let history = SelectionHistory::new();
        assert!(history.is_empty());
        
        history.add(SelectionHistoryEntry::new("test".to_string(), 0, 0));
        assert!(!history.is_empty());
    }

    #[test]
    fn test_get_stats() {
        let history = SelectionHistory::new();
        
        let mut entry1 = SelectionHistoryEntry::new("hello world".to_string(), 0, 0);
        entry1.app_name = Some("App1".to_string());
        entry1.text_type = Some("PlainText".to_string());
        
        let mut entry2 = SelectionHistoryEntry::new("foo bar baz".to_string(), 0, 0);
        entry2.app_name = Some("App1".to_string());
        entry2.text_type = Some("Code".to_string());
        entry2.timestamp += 10000;
        
        history.add(entry1);
        history.add(entry2);
        
        let stats = history.get_stats();
        assert_eq!(stats.total_selections, 2);
        assert!(stats.by_app.contains_key("App1"));
        assert_eq!(*stats.by_app.get("App1").unwrap(), 2);
    }

    #[test]
    fn test_export_import_json() {
        let history = SelectionHistory::new();
        
        let mut entry = SelectionHistoryEntry::new("test export".to_string(), 100, 200);
        entry.app_name = Some("TestApp".to_string());
        history.add(entry);
        
        let json = history.export_json();
        assert!(json.is_ok());
        
        let new_history = SelectionHistory::new();
        let result = new_history.import_json(&json.unwrap());
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 1);
        
        let imported = new_history.get_latest().unwrap();
        assert_eq!(imported.text, "test export");
        assert_eq!(imported.app_name, Some("TestApp".to_string()));
    }

    #[test]
    fn test_entry_builder_methods() {
        let entry = SelectionHistoryEntry::new("test".to_string(), 0, 0)
            .with_app_info(
                Some("App".to_string()),
                Some("Window".to_string()),
                Some("process.exe".to_string()),
            )
            .with_context(Some("before".to_string()), Some("after".to_string()))
            .with_type_info(Some("Code".to_string()), Some("rust".to_string()));
        
        assert_eq!(entry.app_name, Some("App".to_string()));
        assert_eq!(entry.window_title, Some("Window".to_string()));
        assert_eq!(entry.process_name, Some("process.exe".to_string()));
        assert_eq!(entry.context_before, Some("before".to_string()));
        assert_eq!(entry.context_after, Some("after".to_string()));
        assert_eq!(entry.text_type, Some("Code".to_string()));
        assert_eq!(entry.language, Some("rust".to_string()));
    }

    #[test]
    fn test_entry_add_tag() {
        let mut entry = SelectionHistoryEntry::new("test".to_string(), 0, 0);
        
        entry.add_tag("tag1".to_string());
        entry.add_tag("tag2".to_string());
        entry.add_tag("tag1".to_string()); // Duplicate
        
        assert_eq!(entry.tags.len(), 2);
        assert!(entry.tags.contains(&"tag1".to_string()));
        assert!(entry.tags.contains(&"tag2".to_string()));
    }
}
