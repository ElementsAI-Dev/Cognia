//! Screenshot history management
//!
//! Tracks screenshot history for easy recall and management.

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::path::PathBuf;
use std::sync::Arc;

/// Maximum number of screenshots to keep in history
const MAX_SCREENSHOT_HISTORY: usize = 100;

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
    persist_path: Option<PathBuf>,
}

impl ScreenshotHistory {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(MAX_SCREENSHOT_HISTORY))),
            max_size: MAX_SCREENSHOT_HISTORY,
            persist_path: None,
        }
    }

    /// Create with file persistence. Loads existing history from disk.
    pub fn new_with_persistence(path: PathBuf) -> Self {
        let mut hist = Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(MAX_SCREENSHOT_HISTORY))),
            max_size: MAX_SCREENSHOT_HISTORY,
            persist_path: Some(path),
        };
        hist.load_from_disk();
        hist
    }

    /// Save history to disk as JSON
    fn save_to_disk(&self) {
        if let Some(ref path) = self.persist_path {
            let entries = self.entries.read();
            let data: Vec<&ScreenshotHistoryEntry> = entries.iter().collect();
            match serde_json::to_string(&data) {
                Ok(json) => {
                    if let Some(parent) = path.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    if let Err(e) = std::fs::write(path, json) {
                        log::warn!("Failed to persist screenshot history: {}", e);
                    }
                }
                Err(e) => log::warn!("Failed to serialize screenshot history: {}", e),
            }
        }
    }

    /// Load history from disk
    fn load_from_disk(&mut self) {
        if let Some(ref path) = self.persist_path {
            if path.exists() {
                match std::fs::read_to_string(path) {
                    Ok(json) => match serde_json::from_str::<Vec<ScreenshotHistoryEntry>>(&json) {
                        Ok(loaded) => {
                            let mut entries = self.entries.write();
                            entries.clear();
                            for entry in loaded {
                                entries.push_back(entry);
                            }
                            log::info!("Loaded {} screenshot history entries", entries.len());
                        }
                        Err(e) => log::warn!("Failed to parse screenshot history: {}", e),
                    },
                    Err(e) => log::warn!("Failed to read screenshot history file: {}", e),
                }
            }
        }
    }

    /// Add a new entry
    pub fn add(&self, entry: ScreenshotHistoryEntry) {
        {
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
        self.save_to_disk();
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
        let result = {
            let mut entries = self.entries.write();
            if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
                entry.pin();
                true
            } else {
                false
            }
        };
        if result { self.save_to_disk(); }
        result
    }

    /// Unpin an entry
    pub fn unpin_entry(&self, id: &str) -> bool {
        let result = {
            let mut entries = self.entries.write();
            if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
                entry.unpin();
            true
        } else {
            false
        }
        };
        if result { self.save_to_disk(); }
        result
    }

    /// Delete an entry
    pub fn delete_entry(&self, id: &str) -> bool {
        let result = {
            let mut entries = self.entries.write();
            if let Some(pos) = entries.iter().position(|e| e.id == id) {
                entries.remove(pos);
                true
            } else {
                false
            }
        };
        if result { self.save_to_disk(); }
        result
    }

    /// Update entry label
    pub fn update_label(&self, id: &str, label: String) -> bool {
        let result = {
            let mut entries = self.entries.write();
            if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
                entry.set_label(label);
                true
            } else {
                false
            }
        };
        if result { self.save_to_disk(); }
        result
    }

    /// Add tag to entry
    pub fn add_tag(&self, id: &str, tag: String) -> bool {
        let result = {
            let mut entries = self.entries.write();
            if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
                entry.add_tag(tag);
                true
            } else {
                false
            }
        };
        if result { self.save_to_disk(); }
        result
    }

    /// Remove tag from entry
    pub fn remove_tag(&self, id: &str, tag: &str) -> bool {
        let result = {
            let mut entries = self.entries.write();
            if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
                entry.tags.retain(|t| t != tag);
                true
            } else {
                false
            }
        };
        if result { self.save_to_disk(); }
        result
    }

    /// Clear all non-pinned entries
    pub fn clear_unpinned(&self) {
        {
            let mut entries = self.entries.write();
            entries.retain(|e| e.is_pinned);
        }
        self.save_to_disk();
    }

    /// Clear all entries
    pub fn clear_all(&self) {
        self.entries.write().clear();
        self.save_to_disk();
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
        let entry3 =
            ScreenshotHistoryEntry::new(100, 100, "region").with_ocr_text("Hello Rust".to_string());

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
    fn test_remove_tag() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();

        history.add(entry);

        assert!(history.add_tag(&id, "bug".to_string()));
        assert!(history.add_tag(&id, "ui".to_string()));
        
        let found = history.get_by_id(&id).unwrap();
        assert_eq!(found.tags.len(), 2);

        assert!(history.remove_tag(&id, "bug"));
        
        let found = history.get_by_id(&id).unwrap();
        assert_eq!(found.tags.len(), 1);
        assert!(found.tags.contains(&"ui".to_string()));
        assert!(!found.tags.contains(&"bug".to_string()));
    }

    #[test]
    fn test_remove_tag_nonexistent() {
        let history = ScreenshotHistory::new();
        let entry = ScreenshotHistoryEntry::new(100, 100, "region");
        let id = entry.id.clone();

        history.add(entry);
        assert!(history.add_tag(&id, "test".to_string()));

        // Try to remove a tag that doesn't exist
        assert!(history.remove_tag(&id, "nonexistent"));
        
        let found = history.get_by_id(&id).unwrap();
        assert_eq!(found.tags.len(), 1);
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
        for i in 0..110 {
            history.add(ScreenshotHistoryEntry::new(i as u32, i as u32, "region"));
        }

        // Should be capped at MAX_SCREENSHOT_HISTORY (100)
        assert!(history.len() <= MAX_SCREENSHOT_HISTORY);
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
        for i in 0..110 {
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

    #[test]
    fn test_persistence_save_and_load() {
        let dir = std::env::temp_dir().join(format!("cognia-test-{}", uuid::Uuid::new_v4()));
        let path = dir.join("screenshot-history.json");

        // Create history with persistence and add entries
        {
            let history = ScreenshotHistory::new_with_persistence(path.clone());
            let entry1 = ScreenshotHistoryEntry::new(1920, 1080, "fullscreen")
                .with_window_title("Test Window".to_string());
            let id1 = entry1.id.clone();
            history.add(entry1);

            let entry2 = ScreenshotHistoryEntry::new(800, 600, "region");
            history.add(entry2);

            history.pin_entry(&id1);

            assert_eq!(history.len(), 2);
            assert!(path.exists(), "History file should be created on disk");
        }

        // Load history from disk in a new instance
        {
            let history = ScreenshotHistory::new_with_persistence(path.clone());
            assert_eq!(history.len(), 2, "Should load 2 entries from disk");

            let pinned = history.get_pinned();
            assert_eq!(pinned.len(), 1, "Pinned state should persist");
            assert_eq!(pinned[0].width, 1920);
            assert_eq!(pinned[0].window_title, Some("Test Window".to_string()));
        }

        // Cleanup
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_persistence_missing_file() {
        let path = std::env::temp_dir().join(format!("cognia-nonexistent-{}.json", uuid::Uuid::new_v4()));

        // Should not panic when file doesn't exist
        let history = ScreenshotHistory::new_with_persistence(path);
        assert!(history.is_empty());
    }

    #[test]
    fn test_persistence_corrupt_file() {
        let dir = std::env::temp_dir().join(format!("cognia-test-corrupt-{}", uuid::Uuid::new_v4()));
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join("screenshot-history.json");

        // Write invalid JSON
        std::fs::write(&path, "not valid json{{").unwrap();

        // Should not panic, just start with empty history
        let history = ScreenshotHistory::new_with_persistence(path);
        assert!(history.is_empty());

        // Cleanup
        let _ = std::fs::remove_dir_all(&dir);
    }
}
