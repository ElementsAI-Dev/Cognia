//! Recording history management

use super::RecordingMetadata;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

const MAX_HISTORY_SIZE: usize = 100;

/// Recording history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingHistoryEntry {
    pub id: String,
    pub timestamp: i64,
    pub duration_ms: u64,
    pub width: u32,
    pub height: u32,
    pub mode: String,
    pub file_path: Option<String>,
    pub file_size: u64,
    pub thumbnail: Option<String>,
    pub is_pinned: bool,
    pub tags: Vec<String>,
}

impl RecordingHistoryEntry {
    pub fn from_metadata(metadata: &RecordingMetadata) -> Self {
        Self {
            id: metadata.id.clone(),
            timestamp: metadata.start_time,
            duration_ms: metadata.duration_ms,
            width: metadata.width,
            height: metadata.height,
            mode: metadata.mode.clone(),
            file_path: metadata.file_path.clone(),
            file_size: metadata.file_size,
            thumbnail: metadata.thumbnail.clone(),
            is_pinned: false,
            tags: Vec::new(),
        }
    }

    #[allow(dead_code)]
    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }
}

/// Recording history storage
pub struct RecordingHistory {
    entries: RwLock<VecDeque<RecordingHistoryEntry>>,
}

impl RecordingHistory {
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(VecDeque::new()),
        }
    }

    /// Add a new entry to history
    pub fn add(&self, entry: RecordingHistoryEntry) {
        let mut entries = self.entries.write();
        entries.push_front(entry);
        
        // Remove old unpinned entries if over limit
        while entries.len() > MAX_HISTORY_SIZE {
            if let Some(pos) = entries.iter().rposition(|e| !e.is_pinned) {
                entries.remove(pos);
            } else {
                break;
            }
        }
    }

    /// Get recent entries
    pub fn get_recent(&self, count: usize) -> Vec<RecordingHistoryEntry> {
        let entries = self.entries.read();
        entries.iter().take(count).cloned().collect()
    }

    /// Get all entries
    #[allow(dead_code)]
    pub fn get_all(&self) -> Vec<RecordingHistoryEntry> {
        self.entries.read().iter().cloned().collect()
    }

    /// Get entry by ID
    #[allow(dead_code)]
    pub fn get_by_id(&self, id: &str) -> Option<RecordingHistoryEntry> {
        self.entries.read().iter().find(|e| e.id == id).cloned()
    }

    /// Pin entry
    #[allow(dead_code)]
    pub fn pin(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.is_pinned = true;
            true
        } else {
            false
        }
    }

    /// Unpin entry
    #[allow(dead_code)]
    pub fn unpin(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.is_pinned = false;
            true
        } else {
            false
        }
    }

    /// Delete entry and associated file
    pub fn delete(&self, id: &str) -> Result<(), String> {
        let mut entries = self.entries.write();
        if let Some(pos) = entries.iter().position(|e| e.id == id) {
            let entry = entries.remove(pos).unwrap();
            
            // Delete the file if it exists
            if let Some(path) = entry.file_path {
                if std::path::Path::new(&path).exists() {
                    std::fs::remove_file(&path)
                        .map_err(|e| format!("Failed to delete file: {}", e))?;
                }
            }
        }
        Ok(())
    }

    /// Clear all unpinned entries
    pub fn clear(&self) {
        let mut entries = self.entries.write();
        
        // Delete files for unpinned entries
        for entry in entries.iter().filter(|e| !e.is_pinned) {
            if let Some(ref path) = entry.file_path {
                let _ = std::fs::remove_file(path);
            }
        }
        
        entries.retain(|e| e.is_pinned);
    }

    /// Search entries by tag
    #[allow(dead_code)]
    pub fn search_by_tag(&self, tag: &str) -> Vec<RecordingHistoryEntry> {
        let tag_lower = tag.to_lowercase();
        self.entries
            .read()
            .iter()
            .filter(|e| e.tags.iter().any(|t| t.to_lowercase().contains(&tag_lower)))
            .cloned()
            .collect()
    }

    /// Add tag to entry
    #[allow(dead_code)]
    pub fn add_tag(&self, id: &str, tag: String) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            if !entry.tags.contains(&tag) {
                entry.tags.push(tag);
            }
            true
        } else {
            false
        }
    }

    /// Remove tag from entry
    #[allow(dead_code)]
    pub fn remove_tag(&self, id: &str, tag: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.tags.retain(|t| t != tag);
            true
        } else {
            false
        }
    }

    /// Get total size of all recordings
    #[allow(dead_code)]
    pub fn get_total_size(&self) -> u64 {
        self.entries.read().iter().map(|e| e.file_size).sum()
    }

    /// Get total duration of all recordings
    #[allow(dead_code)]
    pub fn get_total_duration(&self) -> u64 {
        self.entries.read().iter().map(|e| e.duration_ms).sum()
    }
}

impl Default for RecordingHistory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_entry(id: &str) -> RecordingHistoryEntry {
        RecordingHistoryEntry {
            id: id.to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: 60000,
            width: 1920,
            height: 1080,
            mode: "fullscreen".to_string(),
            file_path: None,
            file_size: 1024 * 1024,
            thumbnail: None,
            is_pinned: false,
            tags: Vec::new(),
        }
    }

    #[test]
    fn test_history_add_and_get() {
        let history = RecordingHistory::new();
        let entry = create_test_entry("test-1");
        
        history.add(entry.clone());
        
        let recent = history.get_recent(10);
        assert_eq!(recent.len(), 1);
        assert_eq!(recent[0].id, "test-1");
    }

    #[test]
    fn test_history_pin_unpin() {
        let history = RecordingHistory::new();
        let entry = create_test_entry("test-1");
        
        history.add(entry);
        
        assert!(history.pin("test-1"));
        let entry = history.get_by_id("test-1").unwrap();
        assert!(entry.is_pinned);
        
        assert!(history.unpin("test-1"));
        let entry = history.get_by_id("test-1").unwrap();
        assert!(!entry.is_pinned);
    }

    #[test]
    fn test_history_tags() {
        let history = RecordingHistory::new();
        let entry = create_test_entry("test-1");
        
        history.add(entry);
        
        assert!(history.add_tag("test-1", "important".to_string()));
        
        let results = history.search_by_tag("important");
        assert_eq!(results.len(), 1);
        
        assert!(history.remove_tag("test-1", "important"));
        let results = history.search_by_tag("important");
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_history_stats() {
        let history = RecordingHistory::new();
        
        let mut entry1 = create_test_entry("test-1");
        entry1.duration_ms = 30000;
        entry1.file_size = 1000;
        
        let mut entry2 = create_test_entry("test-2");
        entry2.duration_ms = 60000;
        entry2.file_size = 2000;
        
        history.add(entry1);
        history.add(entry2);
        
        assert_eq!(history.get_total_duration(), 90000);
        assert_eq!(history.get_total_size(), 3000);
    }
}
