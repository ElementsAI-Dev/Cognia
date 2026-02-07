//! Recording history management

use super::RecordingMetadata;
use log::{debug, error, info, warn};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::path::PathBuf;

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
}

/// Recording history storage with optional disk persistence
pub struct RecordingHistory {
    entries: RwLock<VecDeque<RecordingHistoryEntry>>,
    persist_path: Option<PathBuf>,
}

impl RecordingHistory {
    pub fn new() -> Self {
        debug!("[RecordingHistory] Creating new RecordingHistory instance (in-memory)");
        Self {
            entries: RwLock::new(VecDeque::new()),
            persist_path: None,
        }
    }

    /// Create a new RecordingHistory with disk persistence
    pub fn new_persistent(data_dir: &std::path::Path) -> Self {
        let persist_path = data_dir.join("recording_history.json");
        info!("[RecordingHistory] Creating persistent history at: {:?}", persist_path);

        let entries = if persist_path.exists() {
            match std::fs::read_to_string(&persist_path) {
                Ok(data) => match serde_json::from_str::<Vec<RecordingHistoryEntry>>(&data) {
                    Ok(loaded) => {
                        info!("[RecordingHistory] Loaded {} entries from disk", loaded.len());
                        VecDeque::from(loaded)
                    }
                    Err(e) => {
                        error!("[RecordingHistory] Failed to parse history file: {}", e);
                        VecDeque::new()
                    }
                },
                Err(e) => {
                    error!("[RecordingHistory] Failed to read history file: {}", e);
                    VecDeque::new()
                }
            }
        } else {
            debug!("[RecordingHistory] No existing history file found");
            VecDeque::new()
        };

        Self {
            entries: RwLock::new(entries),
            persist_path: Some(persist_path),
        }
    }

    /// Save history to disk if persistence is enabled
    fn save_to_disk(&self) {
        if let Some(ref path) = self.persist_path {
            let entries = self.entries.read();
            let data: Vec<&RecordingHistoryEntry> = entries.iter().collect();
            match serde_json::to_string_pretty(&data) {
                Ok(json) => {
                    if let Some(parent) = path.parent() {
                        let _ = std::fs::create_dir_all(parent);
                    }
                    if let Err(e) = std::fs::write(path, json) {
                        error!("[RecordingHistory] Failed to save history to disk: {}", e);
                    } else {
                        debug!("[RecordingHistory] Saved {} entries to disk", entries.len());
                    }
                }
                Err(e) => {
                    error!("[RecordingHistory] Failed to serialize history: {}", e);
                }
            }
        }
    }

    /// Add a new entry to history
    pub fn add(&self, entry: RecordingHistoryEntry) {
        info!(
            "[RecordingHistory] Adding entry: id={}, mode={}, duration={}ms, size={} bytes",
            entry.id, entry.mode, entry.duration_ms, entry.file_size
        );
        let mut entries = self.entries.write();
        entries.push_front(entry);

        let initial_len = entries.len();
        // Remove old unpinned entries if over limit
        while entries.len() > MAX_HISTORY_SIZE {
            if let Some(pos) = entries.iter().rposition(|e| !e.is_pinned) {
                let removed = entries.remove(pos);
                if let Some(removed_entry) = removed {
                    debug!(
                        "[RecordingHistory] Removed old entry due to size limit: id={}",
                        removed_entry.id
                    );
                }
            } else {
                debug!("[RecordingHistory] Cannot remove more entries - all are pinned");
                break;
            }
        }

        if initial_len != entries.len() {
            debug!(
                "[RecordingHistory] History trimmed from {} to {} entries",
                initial_len,
                entries.len()
            );
        }
        debug!(
            "[RecordingHistory] History now contains {} entries",
            entries.len()
        );
        drop(entries);
        self.save_to_disk();
    }

    /// Get recent entries
    pub fn get_recent(&self, count: usize) -> Vec<RecordingHistoryEntry> {
        let entries = self.entries.read();
        let result: Vec<_> = entries.iter().take(count).cloned().collect();
        debug!(
            "[RecordingHistory] get_recent({}) returned {} entries (total: {})",
            count,
            result.len(),
            entries.len()
        );
        result
    }

    /// Get all entries
    pub fn get_all(&self) -> Vec<RecordingHistoryEntry> {
        let entries = self.entries.read();
        debug!(
            "[RecordingHistory] get_all() returning {} entries",
            entries.len()
        );
        entries.iter().cloned().collect()
    }

    /// Get entry by ID
    pub fn get_by_id(&self, id: &str) -> Option<RecordingHistoryEntry> {
        let result = self.entries.read().iter().find(|e| e.id == id).cloned();
        if result.is_some() {
            debug!("[RecordingHistory] get_by_id({}) found entry", id);
        } else {
            debug!("[RecordingHistory] get_by_id({}) - entry not found", id);
        }
        result
    }

    /// Pin entry
    pub fn pin(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.is_pinned = true;
            info!("[RecordingHistory] Pinned entry: id={}", id);
            drop(entries);
            self.save_to_disk();
            true
        } else {
            warn!("[RecordingHistory] Cannot pin - entry not found: id={}", id);
            false
        }
    }

    /// Unpin entry
    pub fn unpin(&self, id: &str) -> bool {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.is_pinned = false;
            info!("[RecordingHistory] Unpinned entry: id={}", id);
            drop(entries);
            self.save_to_disk();
            true
        } else {
            warn!(
                "[RecordingHistory] Cannot unpin - entry not found: id={}",
                id
            );
            false
        }
    }

    /// Delete entry and associated file
    pub fn delete(&self, id: &str) -> Result<(), String> {
        info!("[RecordingHistory] Deleting entry: id={}", id);
        let mut entries = self.entries.write();
        if let Some(pos) = entries.iter().position(|e| e.id == id) {
            let entry = entries.remove(pos).unwrap();
            debug!(
                "[RecordingHistory] Entry removed from history: id={}, mode={}",
                entry.id, entry.mode
            );

            // Delete the file if it exists
            if let Some(path) = entry.file_path {
                if std::path::Path::new(&path).exists() {
                    info!("[RecordingHistory] Deleting recording file: {}", path);
                    std::fs::remove_file(&path).map_err(|e| {
                        let err = format!("Failed to delete file: {}", e);
                        warn!("[RecordingHistory] {}", err);
                        err
                    })?;
                    debug!("[RecordingHistory] Recording file deleted successfully");
                } else {
                    debug!(
                        "[RecordingHistory] Recording file does not exist, skipping deletion: {}",
                        path
                    );
                }
            } else {
                debug!("[RecordingHistory] Entry has no file path associated");
            }
            info!("[RecordingHistory] Entry deleted successfully: id={}", id);
            drop(entries);
            self.save_to_disk();
        } else {
            warn!("[RecordingHistory] Entry not found for deletion: id={}", id);
        }
        Ok(())
    }

    /// Clear all unpinned entries
    pub fn clear(&self) {
        info!("[RecordingHistory] Clearing all unpinned entries");
        let mut entries = self.entries.write();
        let initial_count = entries.len();
        let pinned_count = entries.iter().filter(|e| e.is_pinned).count();

        debug!(
            "[RecordingHistory] Before clear: {} total, {} pinned, {} to be removed",
            initial_count,
            pinned_count,
            initial_count - pinned_count
        );

        // Delete files for unpinned entries
        let mut deleted_files = 0;
        let mut failed_deletions = 0;
        for entry in entries.iter().filter(|e| !e.is_pinned) {
            if let Some(ref path) = entry.file_path {
                debug!(
                    "[RecordingHistory] Deleting file for entry {}: {}",
                    entry.id, path
                );
                match std::fs::remove_file(path) {
                    Ok(_) => deleted_files += 1,
                    Err(e) => {
                        warn!("[RecordingHistory] Failed to delete file {}: {}", path, e);
                        failed_deletions += 1;
                    }
                }
            }
        }

        entries.retain(|e| e.is_pinned);

        info!("[RecordingHistory] Clear completed: removed {} entries, deleted {} files, {} deletion failures, {} pinned entries retained",
            initial_count - entries.len(), deleted_files, failed_deletions, entries.len());
        drop(entries);
        self.save_to_disk();
    }

    /// Search entries by tag
    pub fn search_by_tag(&self, tag: &str) -> Vec<RecordingHistoryEntry> {
        debug!("[RecordingHistory] Searching entries by tag: {}", tag);
        let tag_lower = tag.to_lowercase();
        let results: Vec<_> = self
            .entries
            .read()
            .iter()
            .filter(|e| e.tags.iter().any(|t| t.to_lowercase().contains(&tag_lower)))
            .cloned()
            .collect();
        debug!(
            "[RecordingHistory] search_by_tag({}) found {} entries",
            tag,
            results.len()
        );
        results
    }

    /// Add tag to entry
    pub fn add_tag(&self, id: &str, tag: String) -> bool {
        debug!(
            "[RecordingHistory] Adding tag '{}' to entry: id={}",
            tag, id
        );
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            if !entry.tags.contains(&tag) {
                entry.tags.push(tag.clone());
                info!("[RecordingHistory] Tag '{}' added to entry: id={}", tag, id);
                drop(entries);
                self.save_to_disk();
            } else {
                debug!(
                    "[RecordingHistory] Tag '{}' already exists on entry: id={}",
                    tag, id
                );
            }
            true
        } else {
            warn!(
                "[RecordingHistory] Cannot add tag - entry not found: id={}",
                id
            );
            false
        }
    }

    /// Remove tag from entry
    pub fn remove_tag(&self, id: &str, tag: &str) -> bool {
        debug!(
            "[RecordingHistory] Removing tag '{}' from entry: id={}",
            tag, id
        );
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            let before_len = entry.tags.len();
            entry.tags.retain(|t| t != tag);
            if entry.tags.len() < before_len {
                info!(
                    "[RecordingHistory] Tag '{}' removed from entry: id={}",
                    tag, id
                );
                drop(entries);
                self.save_to_disk();
            } else {
                debug!(
                    "[RecordingHistory] Tag '{}' not found on entry: id={}",
                    tag, id
                );
            }
            true
        } else {
            warn!(
                "[RecordingHistory] Cannot remove tag - entry not found: id={}",
                id
            );
            false
        }
    }

    /// Get total size of all recordings
    pub fn get_total_size(&self) -> u64 {
        let total = self.entries.read().iter().map(|e| e.file_size).sum();
        debug!(
            "[RecordingHistory] Total size of all recordings: {} bytes",
            total
        );
        total
    }

    /// Get total duration of all recordings
    pub fn get_total_duration(&self) -> u64 {
        let total = self.entries.read().iter().map(|e| e.duration_ms).sum();
        debug!(
            "[RecordingHistory] Total duration of all recordings: {}ms",
            total
        );
        total
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
    use std::fs;
    use tempfile::tempdir;

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

    #[test]
    fn test_history_delete_removes_file() {
        let history = RecordingHistory::new();
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("recording.mp4");
        fs::write(&file_path, vec![1, 2, 3, 4]).unwrap();

        let entry = RecordingHistoryEntry {
            id: "delete-test".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: 1000,
            width: 1280,
            height: 720,
            mode: "fullscreen".to_string(),
            file_path: Some(file_path.to_string_lossy().to_string()),
            file_size: 4,
            thumbnail: None,
            is_pinned: false,
            tags: Vec::new(),
        };

        history.add(entry);
        history.delete("delete-test").unwrap();

        assert!(!file_path.exists());
        assert!(history.get_by_id("delete-test").is_none());
    }

    #[test]
    fn test_history_clear_preserves_pinned_files() {
        let history = RecordingHistory::new();
        let dir = tempdir().unwrap();

        let pinned_path = dir.path().join("pinned.mp4");
        let unpinned_path = dir.path().join("unpinned.mp4");
        fs::write(&pinned_path, vec![1]).unwrap();
        fs::write(&unpinned_path, vec![1]).unwrap();

        let pinned_entry = RecordingHistoryEntry {
            id: "pinned".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: 1000,
            width: 1280,
            height: 720,
            mode: "fullscreen".to_string(),
            file_path: Some(pinned_path.to_string_lossy().to_string()),
            file_size: 1,
            thumbnail: None,
            is_pinned: false,
            tags: Vec::new(),
        };
        let unpinned_entry = RecordingHistoryEntry {
            id: "unpinned".to_string(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            duration_ms: 1000,
            width: 1280,
            height: 720,
            mode: "fullscreen".to_string(),
            file_path: Some(unpinned_path.to_string_lossy().to_string()),
            file_size: 1,
            thumbnail: None,
            is_pinned: false,
            tags: Vec::new(),
        };

        history.add(pinned_entry);
        history.add(unpinned_entry);
        history.pin("pinned");

        history.clear();

        assert!(pinned_path.exists());
        assert!(!unpinned_path.exists());
        assert!(history.get_by_id("pinned").is_some());
        assert!(history.get_by_id("unpinned").is_none());
    }
}
