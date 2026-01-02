//! Clipboard history management
//!
//! Tracks clipboard changes and maintains a searchable history.

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use parking_lot::RwLock;

/// Maximum number of clipboard entries to keep
const MAX_CLIPBOARD_HISTORY: usize = 50;

/// Clipboard content type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ClipboardContentType {
    Text,
    Html,
    Image,
    Files,
    Unknown,
}

/// A single clipboard history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipboardEntry {
    /// Unique ID for this entry
    pub id: String,
    /// Content type
    pub content_type: ClipboardContentType,
    /// Text content (if text)
    pub text: Option<String>,
    /// HTML content (if html)
    pub html: Option<String>,
    /// Image data as base64 (if image)
    pub image_base64: Option<String>,
    /// File paths (if files)
    pub files: Option<Vec<String>>,
    /// Timestamp when copied
    pub timestamp: i64,
    /// Source application
    pub source_app: Option<String>,
    /// Source window title
    pub source_window: Option<String>,
    /// Whether this was pinned by user
    pub is_pinned: bool,
    /// User-defined label
    pub label: Option<String>,
    /// Preview text (truncated for display)
    pub preview: String,
}

impl ClipboardEntry {
    pub fn new_text(text: String) -> Self {
        let preview = if text.len() > 100 {
            format!("{}...", &text[..100])
        } else {
            text.clone()
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content_type: ClipboardContentType::Text,
            text: Some(text),
            html: None,
            image_base64: None,
            files: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            source_window: None,
            is_pinned: false,
            label: None,
            preview,
        }
    }

    pub fn new_html(text: String, html: String) -> Self {
        let preview = if text.len() > 100 {
            format!("{}...", &text[..100])
        } else {
            text.clone()
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content_type: ClipboardContentType::Html,
            text: Some(text),
            html: Some(html),
            image_base64: None,
            files: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            source_window: None,
            is_pinned: false,
            label: None,
            preview,
        }
    }

    pub fn new_image(image_base64: String, width: u32, height: u32) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content_type: ClipboardContentType::Image,
            text: None,
            html: None,
            image_base64: Some(image_base64),
            files: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            source_window: None,
            is_pinned: false,
            label: None,
            preview: format!("Image ({}x{})", width, height),
        }
    }

    pub fn new_files(files: Vec<String>) -> Self {
        let preview = if files.len() == 1 {
            files[0].clone()
        } else {
            format!("{} files", files.len())
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content_type: ClipboardContentType::Files,
            text: None,
            html: None,
            image_base64: None,
            files: Some(files),
            timestamp: chrono::Utc::now().timestamp_millis(),
            source_app: None,
            source_window: None,
            is_pinned: false,
            label: None,
            preview,
        }
    }

    pub fn with_source(mut self, app: Option<String>, window: Option<String>) -> Self {
        self.source_app = app;
        self.source_window = window;
        self
    }

    pub fn pin(&mut self) {
        self.is_pinned = true;
    }

    pub fn unpin(&mut self) {
        self.is_pinned = false;
    }

    pub fn set_label(&mut self, label: String) {
        self.label = Some(label);
    }
}

/// Clipboard history manager
pub struct ClipboardHistory {
    entries: Arc<RwLock<VecDeque<ClipboardEntry>>>,
    max_size: usize,
    /// Last known clipboard content hash for change detection
    last_content_hash: Arc<RwLock<Option<u64>>>,
}

impl ClipboardHistory {
    pub fn new() -> Self {
        log::debug!("[ClipboardHistory] Creating new instance with max_size={}", MAX_CLIPBOARD_HISTORY);
        Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(MAX_CLIPBOARD_HISTORY))),
            max_size: MAX_CLIPBOARD_HISTORY,
            last_content_hash: Arc::new(RwLock::new(None)),
        }
    }

    /// Add a new entry to history
    pub fn add(&self, entry: ClipboardEntry) {
        log::trace!("[ClipboardHistory] add: type={:?}, preview='{}'", entry.content_type, 
            entry.preview.chars().take(50).collect::<String>());
        
        let mut entries = self.entries.write();

        // Check for duplicate based on content
        let is_duplicate = entries.front().map(|e| {
            match (&e.content_type, &entry.content_type) {
                (ClipboardContentType::Text, ClipboardContentType::Text) => {
                    e.text == entry.text
                }
                (ClipboardContentType::Html, ClipboardContentType::Html) => {
                    e.html == entry.html
                }
                (ClipboardContentType::Image, ClipboardContentType::Image) => {
                    e.image_base64 == entry.image_base64
                }
                (ClipboardContentType::Files, ClipboardContentType::Files) => {
                    e.files == entry.files
                }
                _ => false,
            }
        }).unwrap_or(false);

        if is_duplicate {
            log::trace!("[ClipboardHistory] Skipping duplicate entry");
            return;
        }

        entries.push_front(entry);
        let current_len = entries.len();

        // Remove old non-pinned entries if over limit
        let mut removed = 0;
        while entries.len() > self.max_size {
            // Find last non-pinned entry to remove
            if let Some(pos) = entries.iter().rposition(|e| !e.is_pinned) {
                entries.remove(pos);
                removed += 1;
            } else {
                // All entries are pinned, remove oldest anyway
                entries.pop_back();
                removed += 1;
            }
        }
        
        if removed > 0 {
            log::trace!("[ClipboardHistory] Removed {} old entries", removed);
        }
        log::debug!("[ClipboardHistory] Entry added, history_size={}", current_len.min(self.max_size));
    }

    /// Get recent entries
    pub fn get_recent(&self, count: usize) -> Vec<ClipboardEntry> {
        let entries = self.entries.read();
        let result: Vec<_> = entries.iter().take(count).cloned().collect();
        log::trace!("[ClipboardHistory] get_recent({}): returned {} entries", count, result.len());
        result
    }

    /// Get all entries
    pub fn get_all(&self) -> Vec<ClipboardEntry> {
        self.entries.read().iter().cloned().collect()
    }

    /// Get pinned entries
    pub fn get_pinned(&self) -> Vec<ClipboardEntry> {
        let entries = self.entries.read();
        entries.iter().filter(|e| e.is_pinned).cloned().collect()
    }

    /// Search by text content
    pub fn search(&self, query: &str) -> Vec<ClipboardEntry> {
        log::debug!("[ClipboardHistory] search: query='{}'", query);
        let query_lower = query.to_lowercase();
        let entries = self.entries.read();
        let results: Vec<_> = entries
            .iter()
            .filter(|e| {
                e.text
                    .as_ref()
                    .map(|t| t.to_lowercase().contains(&query_lower))
                    .unwrap_or(false)
                    || e.preview.to_lowercase().contains(&query_lower)
            })
            .cloned()
            .collect();
        log::debug!("[ClipboardHistory] search: found {} matches", results.len());
        results
    }

    /// Get entry by ID
    pub fn get_by_id(&self, id: &str) -> Option<ClipboardEntry> {
        let entries = self.entries.read();
        entries.iter().find(|e| e.id == id).cloned()
    }

    /// Pin an entry by ID
    pub fn pin_entry(&self, id: &str) -> bool {
        log::debug!("[ClipboardHistory] pin_entry: id={}", id);
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.pin();
            log::info!("[ClipboardHistory] Entry pinned: {}", id);
            true
        } else {
            log::warn!("[ClipboardHistory] Entry not found for pinning: {}", id);
            false
        }
    }

    /// Unpin an entry by ID
    pub fn unpin_entry(&self, id: &str) -> bool {
        log::debug!("[ClipboardHistory] unpin_entry: id={}", id);
        let mut entries = self.entries.write();
        if let Some(entry) = entries.iter_mut().find(|e| e.id == id) {
            entry.unpin();
            log::info!("[ClipboardHistory] Entry unpinned: {}", id);
            true
        } else {
            log::warn!("[ClipboardHistory] Entry not found for unpinning: {}", id);
            false
        }
    }

    /// Delete an entry by ID
    pub fn delete_entry(&self, id: &str) -> bool {
        log::debug!("[ClipboardHistory] delete_entry: id={}", id);
        let mut entries = self.entries.write();
        if let Some(pos) = entries.iter().position(|e| e.id == id) {
            entries.remove(pos);
            log::info!("[ClipboardHistory] Entry deleted: {}", id);
            true
        } else {
            log::warn!("[ClipboardHistory] Entry not found for deletion: {}", id);
            false
        }
    }

    /// Clear all non-pinned entries
    pub fn clear_unpinned(&self) {
        let mut entries = self.entries.write();
        let before = entries.len();
        entries.retain(|e| e.is_pinned);
        let removed = before - entries.len();
        log::info!("[ClipboardHistory] Cleared {} unpinned entries, {} pinned remain", removed, entries.len());
    }

    /// Clear all entries
    pub fn clear_all(&self) {
        let count = self.entries.read().len();
        self.entries.write().clear();
        log::info!("[ClipboardHistory] Cleared all {} entries", count);
    }

    /// Get history size
    pub fn len(&self) -> usize {
        self.entries.read().len()
    }

    /// Check if history is empty
    pub fn is_empty(&self) -> bool {
        self.entries.read().is_empty()
    }

    /// Check current clipboard and add to history if changed
    pub fn check_and_update(&self) -> Result<bool, String> {
        use arboard::Clipboard;
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        log::trace!("[ClipboardHistory] check_and_update: checking clipboard");
        let mut clipboard = Clipboard::new().map_err(|e| {
            log::warn!("[ClipboardHistory] Failed to access clipboard: {}", e);
            e.to_string()
        })?;

        // Try to get text
        if let Ok(text) = clipboard.get_text() {
            if !text.is_empty() {
                // Calculate hash
                let mut hasher = DefaultHasher::new();
                text.hash(&mut hasher);
                let hash = hasher.finish();

                // Check if changed
                let mut last_hash = self.last_content_hash.write();
                if *last_hash != Some(hash) {
                    log::debug!("[ClipboardHistory] New text content detected ({} chars)", text.len());
                    *last_hash = Some(hash);
                    drop(last_hash);

                    self.add(ClipboardEntry::new_text(text));
                    return Ok(true);
                }
            }
        }

        // Try to get image
        if let Ok(image) = clipboard.get_image() {
            // Calculate hash from image dimensions and first few bytes
            let mut hasher = DefaultHasher::new();
            image.width.hash(&mut hasher);
            image.height.hash(&mut hasher);
            if image.bytes.len() > 100 {
                image.bytes[..100].hash(&mut hasher);
            }
            let hash = hasher.finish();

            let mut last_hash = self.last_content_hash.write();
            if *last_hash != Some(hash) {
                log::debug!("[ClipboardHistory] New image content detected ({}x{})", image.width, image.height);
                *last_hash = Some(hash);
                drop(last_hash);

                // Convert to base64 PNG
                let base64 = base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD,
                    &image.bytes,
                );
                self.add(ClipboardEntry::new_image(
                    base64,
                    image.width as u32,
                    image.height as u32,
                ));
                return Ok(true);
            }
        }

        log::trace!("[ClipboardHistory] check_and_update: no changes detected");
        Ok(false)
    }

    /// Copy entry back to clipboard
    pub fn copy_to_clipboard(&self, id: &str) -> Result<(), String> {
        use arboard::Clipboard;

        log::debug!("[ClipboardHistory] copy_to_clipboard: id={}", id);
        let entry = self.get_by_id(id).ok_or_else(|| {
            log::warn!("[ClipboardHistory] Entry not found: {}", id);
            "Entry not found"
        })?;
        let mut clipboard = Clipboard::new().map_err(|e| {
            log::error!("[ClipboardHistory] Failed to access clipboard: {}", e);
            e.to_string()
        })?;

        match entry.content_type {
            ClipboardContentType::Text | ClipboardContentType::Html => {
                if let Some(text) = entry.text {
                    log::debug!("[ClipboardHistory] Restoring text to clipboard ({} chars)", text.len());
                    clipboard.set_text(text).map_err(|e| {
                        log::error!("[ClipboardHistory] Failed to set clipboard text: {}", e);
                        e.to_string()
                    })?;
                }
            }
            ClipboardContentType::Image => {
                if let Some(base64_data) = entry.image_base64 {
                    let _bytes = base64::Engine::decode(
                        &base64::engine::general_purpose::STANDARD,
                        &base64_data,
                    )
                    .map_err(|e| {
                        log::error!("[ClipboardHistory] Failed to decode image: {}", e);
                        e.to_string()
                    })?;

                    // This is a simplified version - actual implementation would need
                    // to decode the image format properly
                    log::warn!("[ClipboardHistory] Image clipboard restore not fully implemented");
                }
            }
            ClipboardContentType::Files => {
                log::warn!("[ClipboardHistory] File clipboard restore not implemented");
            }
            ClipboardContentType::Unknown => {
                log::trace!("[ClipboardHistory] Unknown content type, nothing to restore");
            }
        }

        log::info!("[ClipboardHistory] Entry {} restored to clipboard", id);
        Ok(())
    }
}

impl Default for ClipboardHistory {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_history() {
        let history = ClipboardHistory::new();
        assert!(history.is_empty());
        assert_eq!(history.len(), 0);
    }

    #[test]
    fn test_add_text_entry() {
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_text("Hello World".to_string());
        
        history.add(entry);
        
        assert_eq!(history.len(), 1);
        let recent = history.get_recent(10);
        assert_eq!(recent[0].text, Some("Hello World".to_string()));
    }

    #[test]
    fn test_add_html_entry() {
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_html(
            "Hello".to_string(),
            "<b>Hello</b>".to_string(),
        );
        
        history.add(entry);
        
        assert_eq!(history.len(), 1);
        let recent = history.get_recent(10);
        assert_eq!(recent[0].content_type, ClipboardContentType::Html);
    }

    #[test]
    fn test_add_image_entry() {
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_image("base64data".to_string(), 100, 200);
        
        history.add(entry);
        
        let recent = history.get_recent(10);
        assert_eq!(recent[0].content_type, ClipboardContentType::Image);
        assert_eq!(recent[0].preview, "Image (100x200)");
    }

    #[test]
    fn test_add_files_entry() {
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_files(vec![
            "/path/to/file1.txt".to_string(),
            "/path/to/file2.txt".to_string(),
        ]);
        
        history.add(entry);
        
        let recent = history.get_recent(10);
        assert_eq!(recent[0].content_type, ClipboardContentType::Files);
        assert_eq!(recent[0].preview, "2 files");
    }

    #[test]
    fn test_duplicate_detection() {
        let history = ClipboardHistory::new();
        
        history.add(ClipboardEntry::new_text("Same text".to_string()));
        history.add(ClipboardEntry::new_text("Same text".to_string()));
        
        // Duplicate should not be added
        assert_eq!(history.len(), 1);
    }

    #[test]
    fn test_search() {
        let history = ClipboardHistory::new();
        
        history.add(ClipboardEntry::new_text("Hello World".to_string()));
        history.add(ClipboardEntry::new_text("Goodbye World".to_string()));
        history.add(ClipboardEntry::new_text("Hello Rust".to_string()));
        
        let results = history.search("hello");
        assert_eq!(results.len(), 2);
        
        let results = history.search("world");
        assert_eq!(results.len(), 2);
        
        let results = history.search("rust");
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_get_by_id() {
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_text("Test".to_string());
        let id = entry.id.clone();
        
        history.add(entry);
        
        let found = history.get_by_id(&id);
        assert!(found.is_some());
        assert_eq!(found.unwrap().text, Some("Test".to_string()));
        
        let not_found = history.get_by_id("nonexistent");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_pin_unpin() {
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_text("Test".to_string());
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
        let history = ClipboardHistory::new();
        let entry = ClipboardEntry::new_text("Test".to_string());
        let id = entry.id.clone();
        
        history.add(entry);
        assert_eq!(history.len(), 1);
        
        assert!(history.delete_entry(&id));
        assert_eq!(history.len(), 0);
        
        assert!(!history.delete_entry("nonexistent"));
    }

    #[test]
    fn test_clear_unpinned() {
        let history = ClipboardHistory::new();
        
        let entry1 = ClipboardEntry::new_text("Pinned".to_string());
        let id1 = entry1.id.clone();
        history.add(entry1);
        history.pin_entry(&id1);
        
        history.add(ClipboardEntry::new_text("Unpinned 1".to_string()));
        history.add(ClipboardEntry::new_text("Unpinned 2".to_string()));
        
        assert_eq!(history.len(), 3);
        
        history.clear_unpinned();
        
        assert_eq!(history.len(), 1);
        let remaining = history.get_all();
        assert_eq!(remaining[0].text, Some("Pinned".to_string()));
    }

    #[test]
    fn test_clear_all() {
        let history = ClipboardHistory::new();
        
        let entry = ClipboardEntry::new_text("Pinned".to_string());
        let id = entry.id.clone();
        history.add(entry);
        history.pin_entry(&id);
        
        history.add(ClipboardEntry::new_text("Unpinned".to_string()));
        
        history.clear_all();
        
        assert!(history.is_empty());
    }

    #[test]
    fn test_max_size_limit() {
        let history = ClipboardHistory::new();
        
        // Add more than MAX_CLIPBOARD_HISTORY entries
        for i in 0..60 {
            history.add(ClipboardEntry::new_text(format!("Entry {}", i)));
        }
        
        // Should be capped at MAX_CLIPBOARD_HISTORY (50)
        assert!(history.len() <= 50);
    }

    #[test]
    fn test_pinned_entries_preserved_on_overflow() {
        let history = ClipboardHistory::new();
        
        // Add a pinned entry first
        let pinned_entry = ClipboardEntry::new_text("Pinned Entry".to_string());
        let pinned_id = pinned_entry.id.clone();
        history.add(pinned_entry);
        history.pin_entry(&pinned_id);
        
        // Add many more entries to trigger overflow
        for i in 0..55 {
            history.add(ClipboardEntry::new_text(format!("Entry {}", i)));
        }
        
        // Pinned entry should still exist
        let pinned = history.get_pinned();
        assert_eq!(pinned.len(), 1);
        assert_eq!(pinned[0].text, Some("Pinned Entry".to_string()));
    }

    #[test]
    fn test_entry_with_source() {
        let entry = ClipboardEntry::new_text("Test".to_string())
            .with_source(Some("VSCode".to_string()), Some("main.rs".to_string()));
        
        assert_eq!(entry.source_app, Some("VSCode".to_string()));
        assert_eq!(entry.source_window, Some("main.rs".to_string()));
    }

    #[test]
    fn test_entry_pin_unpin_methods() {
        let mut entry = ClipboardEntry::new_text("Test".to_string());
        assert!(!entry.is_pinned);
        
        entry.pin();
        assert!(entry.is_pinned);
        
        entry.unpin();
        assert!(!entry.is_pinned);
    }

    #[test]
    fn test_entry_set_label() {
        let mut entry = ClipboardEntry::new_text("Test".to_string());
        assert!(entry.label.is_none());
        
        entry.set_label("My Label".to_string());
        assert_eq!(entry.label, Some("My Label".to_string()));
    }

    #[test]
    fn test_preview_truncation() {
        let long_text = "a".repeat(200);
        let entry = ClipboardEntry::new_text(long_text);
        
        // Preview should be truncated to ~100 chars + "..."
        assert!(entry.preview.len() < 110);
        assert!(entry.preview.ends_with("..."));
    }
}
