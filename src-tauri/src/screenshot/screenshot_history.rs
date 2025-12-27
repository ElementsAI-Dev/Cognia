//! Screenshot history management
//!
//! Tracks screenshot history for easy recall and management.

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use parking_lot::RwLock;

/// Maximum number of screenshots to keep in memory
const MAX_SCREENSHOT_HISTORY: usize = 20;

/// Screenshot history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotHistoryEntry {
    /// Unique ID
    pub id: String,
    /// Timestamp
    pub timestamp: i64,
    /// Image data as base64 (thumbnail only for memory efficiency)
    pub thumbnail_base64: Option<String>,
    /// Full image path if saved to disk
    pub file_path: Option<String>,
    /// Image dimensions
    pub width: u32,
    pub height: u32,
    /// Capture mode
    pub mode: String,
    /// Window title (if window capture)
    pub window_title: Option<String>,
    /// OCR extracted text
    pub ocr_text: Option<String>,
    /// User-defined label
    pub label: Option<String>,
    /// Tags
    pub tags: Vec<String>,
    /// Whether this is pinned
    pub is_pinned: bool,
}

impl ScreenshotHistoryEntry {
    pub fn new(width: u32, height: u32, mode: &str) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            thumbnail_base64: None,
            file_path: None,
            width,
            height,
            mode: mode.to_string(),
            window_title: None,
            ocr_text: None,
            label: None,
            tags: Vec::new(),
            is_pinned: false,
        }
    }

    pub fn with_thumbnail(mut self, thumbnail: String) -> Self {
        self.thumbnail_base64 = Some(thumbnail);
        self
    }

    pub fn with_file_path(mut self, path: String) -> Self {
        self.file_path = Some(path);
        self
    }

    pub fn with_window_title(mut self, title: String) -> Self {
        self.window_title = Some(title);
        self
    }

    pub fn with_ocr_text(mut self, text: String) -> Self {
        self.ocr_text = Some(text);
        self
    }

    pub fn add_tag(&mut self, tag: String) {
        if !self.tags.contains(&tag) {
            self.tags.push(tag);
        }
    }

    pub fn set_label(&mut self, label: String) {
        self.label = Some(label);
    }

    pub fn pin(&mut self) {
        self.is_pinned = true;
    }

    pub fn unpin(&mut self) {
        self.is_pinned = false;
    }
}

/// Screenshot history manager
pub struct ScreenshotHistory {
    entries: Arc<RwLock<VecDeque<ScreenshotHistoryEntry>>>,
    max_size: usize,
}

impl ScreenshotHistory {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(MAX_SCREENSHOT_HISTORY))),
            max_size: MAX_SCREENSHOT_HISTORY,
        }
    }

    /// Add a new entry
    pub fn add(&self, entry: ScreenshotHistoryEntry) {
        let mut entries = self.entries.write();
        entries.push_front(entry);

        // Remove old non-pinned entries if over limit
        while entries.len() > self.max_size {
            if let Some(pos) = entries.iter().rposition(|e| !e.is_pinned) {
                entries.remove(pos);
            } else {
                entries.pop_back();
            }
        }
    }

    /// Get recent entries
    pub fn get_recent(&self, count: usize) -> Vec<ScreenshotHistoryEntry> {
        let entries = self.entries.read();
        entries.iter().take(count).cloned().collect()
    }

    /// Get all entries
    pub fn get_all(&self) -> Vec<ScreenshotHistoryEntry> {
        self.entries.read().iter().cloned().collect()
    }

    /// Get entry by ID
    pub fn get_by_id(&self, id: &str) -> Option<ScreenshotHistoryEntry> {
        let entries = self.entries.read();
        entries.iter().find(|e| e.id == id).cloned()
    }

    /// Search by OCR text
    pub fn search_by_text(&self, query: &str) -> Vec<ScreenshotHistoryEntry> {
        let query_lower = query.to_lowercase();
        let entries = self.entries.read();
        entries
            .iter()
            .filter(|e| {
                e.ocr_text
                    .as_ref()
                    .map(|t| t.to_lowercase().contains(&query_lower))
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Search by label
    pub fn search_by_label(&self, label: &str) -> Vec<ScreenshotHistoryEntry> {
        let label_lower = label.to_lowercase();
        let entries = self.entries.read();
        entries
            .iter()
            .filter(|e| {
                e.label
                    .as_ref()
                    .map(|l| l.to_lowercase().contains(&label_lower))
                    .unwrap_or(false)
            })
            .cloned()
            .collect()
    }

    /// Get pinned entries
    pub fn get_pinned(&self) -> Vec<ScreenshotHistoryEntry> {
        let entries = self.entries.read();
        entries.iter().filter(|e| e.is_pinned).cloned().collect()
    }

    /// Pin an entry
    pub fn pin_entry(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.pin();
            true
        } else {
            false
        }
    }

    /// Unpin an entry
    pub fn unpin_entry(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.unpin();
            true
        } else {
            false
        }
    }

    /// Delete an entry
    pub fn delete_entry(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(pos) = entries.iter().position(|e| e.id == id) {
            entries.remove(pos);
            true
        } else {
            false
        }
    }

    /// Update entry label
    pub fn update_label(&self, id: &str, label: String) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.set_label(label);
            true
        } else {
            false
        }
    }

    /// Add tag to entry
    pub fn add_tag(&self, id: &str, tag: String) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.add_tag(tag);
            true
        } else {
            false
        }
    }

    /// Clear all non-pinned entries
    pub fn clear_unpinned(&self) {
        let mut entries = self.entries.write();
        entries.retain(|e| e.is_pinned);
    }

    /// Clear all entries
    pub fn clear_all(&self) {
        self.entries.write().clear();
    }

    /// Get history size
    pub fn len(&self) -> usize {
        self.entries.read().len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.entries.read().is_empty()
    }
}

impl Default for ScreenshotHistory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_history() {
        let history = ScreenshotHistory::new();
        assert!(history.is_empty());
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_add_entry() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(1920, 1080, "fullscreen");
        
        history.add(entry);
        
        assert_eq!(history.len(), 1);
        let recent = history.get_recent(10);
        assert_eq!(recent[0].width, 1920);
        assert_eq!(recent[0].height, 1080);
        assert_eq!(recent[0].mode, "fullscreen");
    }

    #[test]
    fn test_entry_builder_methods() {
        let entry = ScreenshotHistoryEntry::new(800, 600, "window")
            .with_thumbnail("base64thumbnail".to_string())
            .with_file_path("/path/to/file.png".to_string())
            .with_window_title("Test Window".to_string())
            .with_ocr_text("Extracted text".to_string());
        
        assert_eq!(entry.thumbnail_base64, Some("base64thumbnail".to_string()));
        assert_eq!(entry.file_path, Some("/path/to/file.png".to_string()));
        assert_eq!(entry.window_title, Some("Test Window".to_string()));
        assert_eq!(entry.ocr_text, Some("Extracted text".to_string()));
    }

    #[test]
    fn test_get_by_id() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();
        
        history.add(entry);
        
        let found = history.get_by_id(&id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().mode, "region");
        
        let not_found = history.get_by_id("nonexistent");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_search_by_text() {
        let history = ScreenshotHistory::new();
        
        let entry1 = ScreenshotHistoryEntry::new(100, 100, "region")
            .with_ocr_text("Hello World".to_string());
        let entry2 = ScreenshotHistoryEntry::new(100, 100, "region")
            .with_ocr_text("Goodbye World".to_string());
        let entry3 = ScreenshotHistoryEntry::new(100, 100, "region")
            .with_ocr_text("Hello Rust".to_string());
        
        history.add(entry1);
        history.add(entry2);
        history.add(entry3);
        
        let results = history.search_by_text("hello");
        assert_eq!(results.len(), 2);
        
        let results = history.search_by_text("world");
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_search_by_label() {
        let history = ScreenshotHistory::new();
        
        let mut entry1 = ScreenshotHistoryEntry::new(100, 100, "region");
        entry1.set_label("Important Screenshot".to_string());
        
        let mut entry2 = ScreenshotHistoryEntry::new(100, 100, "region");
        entry2.set_label("Bug Report".to_string());
        
        history.add(entry1);
        history.add(entry2);
        
        let results = history.search_by_label("important");
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_pin_unpin() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();
        
        history.add(entry);
        
        assert!(history.pin_entry(&id));
        let pinned = history.get_pinned();
        assert_eq!(pinned.len(), 1);
        
        assert!(history.unpin_entry(&id));
        let pinned = history.get_pinned();
        assert_eq!(pinned.len(), 0);
    }

    #[test]
    fn test_delete_entry() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();
        
        history.add(entry);
        assert_eq!(history.len(), 1);
        
        assert!(history.delete_entry(&id));
        assert_eq!(history.len(), 0);
        
        assert!(!history.delete_entry("nonexistent"));
    }

    #[test]
    fn test_update_label() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();
        
        history.add(entry);
        
        assert!(history.update_label(&id, "New Label".to_string()));
        
        let found = history.get_by_id(&id).unwrap();
        assert_eq!(found.label, Some("New Label".to_string()));
    }

    #[test]
    fn test_add_tag() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();
        
        history.add(entry);
        
        assert!(history.add_tag(&id, "bug".to_string()));
        assert!(history.add_tag(&id, "ui".to_string()));
        
        let found = history.get_by_id(&id).unwrap();
        assert_eq!(found.tags.len(), 2);
        assert!(found.tags.contains(&"bug".to_string()));
    }

    #[test]
    fn test_clear_unpinned() {
        let history = ScreenshotHistory::new();
        
        let entry1 = ScreenshotHistoryEntry::new(100, 100, "region");
        let id1 = entry1.id.clone();
        history.add(entry1);
        history.pin_entry(&id1);
        
        history.add(ScreenshotHistoryEntry::new(200, 200, "window"));
        history.add(ScreenshotHistoryEntry::new(300, 300, "fullscreen"));
        
        assert_eq!(history.len(), 3);
        
        history.clear_unpinned();
        
        assert_eq!(history.len(), 1);
        let remaining = history.get_all();
        assert!(remaining[0].is_pinned);
    }

    #[test]
    fn test_clear_all() {
        let history = ScreenshotHistory::new();
        
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();
        history.add(entry);
        history.pin_entry(&id);
        
        history.add(ScreenshotHistoryEntry::new(200, 200, "window"));
        
        history.clear_all();
        
        assert!(history.is_empty());
    }

    #[test]
    fn test_max_size_limit() {
        let history = ScreenshotHistory::new();
        
        // Add more than MAX_SCREENSHOT_HISTORY entries
        for i in 0..25 {
            history.add(ScreenshotHistoryEntry::new(i as u32, i as u32, "region"));
        }
        
        // Should be capped at MAX_SCREENSHOT_HISTORY (20)
        assert!(history.len() <= 20);
    }

    #[test]
    fn test_pinned_preserved_on_overflow() {
        let history = ScreenshotHistory::new();
        
        // Add a pinned entry first
        let pinned_entry = ScreenshotHistoryEntry::new(999, 999, "pinned");
        let pinned_id = pinned_entry.id.clone();
        history.add(pinned_entry);
        history.pin_entry(&pinned_id);
        
        // Add many more entries to trigger overflow
        for i in 0..25 {
            history.add(ScreenshotHistoryEntry::new(i as u32, i as u32, "region"));
        }
        
        // Pinned entry should still exist
        let pinned = history.get_pinned();
        assert_eq!(pinned.len(), 1);
        assert_eq!(pinned[0].width, 999);
    }

    #[test]
    fn test_entry_add_tag_no_duplicates() {
        let mut entry = ScreenshotHistoryEntry::new(100, 100, "region");
        
        entry.add_tag("test".to_string());
        entry.add_tag("test".to_string());
        entry.add_tag("test".to_string());
        
        assert_eq!(entry.tags.len(), 1);
    }

    #[test]
    fn test_entry_pin_unpin_methods() {
        let mut entry = ScreenshotHistoryEntry::new(100, 100, "region");
        assert!(!entry.is_pinned);
        
        entry.pin();
        assert!(entry.is_pinned);
        
        entry.unpin();
        assert!(!entry.is_pinned);
    }

    #[test]
    fn test_get_recent() {
        let history = ScreenshotHistory::new();
        
        for i in 0..10 {
            history.add(ScreenshotHistoryEntry::new(i as u32, i as u32, "region"));
        }
        
        let recent = history.get_recent(5);
        assert_eq!(recent.len(), 5);
        
        // Most recent should be first
        assert_eq!(recent[0].width, 9);
    }

    #[test]
    fn test_get_all() {
        let history = ScreenshotHistory::new();
        
        for i in 0..5 {
            history.add(ScreenshotHistoryEntry::new(i as u32, i as u32, "region"));
        }
        
        let all = history.get_all();
        assert_eq!(all.len(), 5);
    }
}
