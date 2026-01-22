//! Screen Recording module
//!
//! Provides screen recording functionality including:
//! - Full screen recording
//! - Window recording
//! - Region recording
//! - Audio capture (system and microphone)
//! - Video trimming and export

pub mod error;
pub mod ffmpeg;
mod history;
pub mod progress;
mod recorder;
pub mod storage;
mod video_processor;

#[allow(unused_imports)]
pub use error::{RecordingError, RecordingErrorCode};
pub use ffmpeg::{FFmpegInfo, FFmpegInstallGuide, HardwareAcceleration};
#[allow(unused_imports)]
pub use progress::VideoProcessingProgress;
pub use storage::{CleanupResult, StorageConfig, StorageManager, StorageStats};
#[allow(unused_imports)]
pub use storage::{StorageFile, StorageFileType};
pub use history::{RecordingHistory, RecordingHistoryEntry};
pub use recorder::ScreenRecorder;
pub use video_processor::{
    EncodingSupport, VideoConvertOptions, VideoInfo, VideoProcessingResult, VideoProcessor,
    VideoTrimOptions,
};

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::AppHandle;

/// Recording statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStats {
    /// Total size of all recordings in bytes
    pub total_size: u64,
    /// Total duration of all recordings in milliseconds
    pub total_duration_ms: u64,
    /// Total number of recording entries
    pub total_entries: usize,
    /// Number of pinned entries
    pub pinned_count: usize,
}

/// Screen recording configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingConfig {
    /// Default save directory
    pub save_directory: Option<String>,
    /// Video format (mp4, webm, mkv)
    pub format: String,
    /// Video codec (h264, h265, vp9)
    pub codec: String,
    /// Frame rate (fps)
    pub frame_rate: u32,
    /// Video quality (1-100)
    pub quality: u8,
    /// Video bitrate in kbps (0 = auto)
    pub bitrate: u32,
    /// Whether to capture system audio
    pub capture_system_audio: bool,
    /// Whether to capture microphone
    pub capture_microphone: bool,
    /// Whether to show cursor
    pub show_cursor: bool,
    /// Whether to highlight cursor clicks
    pub highlight_clicks: bool,
    /// Countdown seconds before recording (0-10)
    pub countdown_seconds: u8,
    /// Whether to show recording indicator
    pub show_indicator: bool,
    /// Maximum recording duration in seconds (0 = unlimited)
    pub max_duration: u64,
    /// Whether to pause when window is minimized
    pub pause_on_minimize: bool,
}

impl Default for RecordingConfig {
    fn default() -> Self {
        Self {
            save_directory: None,
            format: "mp4".to_string(),
            codec: "h264".to_string(),
            frame_rate: 30,
            quality: 80,
            bitrate: 0, // Auto
            capture_system_audio: true,
            capture_microphone: false,
            show_cursor: true,
            highlight_clicks: false,
            countdown_seconds: 3,
            show_indicator: true,
            max_duration: 0, // Unlimited
            pause_on_minimize: false,
        }
    }
}

/// Recording metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingMetadata {
    /// Recording ID
    pub id: String,
    /// Start timestamp
    pub start_time: i64,
    /// End timestamp
    pub end_time: Option<i64>,
    /// Duration in milliseconds
    pub duration_ms: u64,
    /// Video width
    pub width: u32,
    /// Video height
    pub height: u32,
    /// Recording mode
    pub mode: String,
    /// Monitor index (for fullscreen)
    pub monitor_index: Option<usize>,
    /// Window title (for window recording)
    pub window_title: Option<String>,
    /// Region coordinates (for region recording)
    pub region: Option<RecordingRegion>,
    /// File path
    pub file_path: Option<String>,
    /// File size in bytes
    pub file_size: u64,
    /// Whether audio was captured
    pub has_audio: bool,
    /// Thumbnail base64
    pub thumbnail: Option<String>,
}

/// Recording region coordinates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Recording status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RecordingStatus {
    Idle,
    Countdown,
    Recording,
    Paused,
    Processing,
    Error(String),
}

impl Default for RecordingStatus {
    fn default() -> Self {
        Self::Idle
    }
}

/// Screen recording manager
pub struct ScreenRecordingManager {
    config: Arc<RwLock<RecordingConfig>>,
    recorder: ScreenRecorder,
    history: RecordingHistory,
    storage: StorageManager,
    #[allow(dead_code)]
    app_handle: AppHandle,
}

impl ScreenRecordingManager {
    pub fn new(app_handle: AppHandle) -> Self {
        info!("[ScreenRecording] Initializing ScreenRecordingManager");

        // Get app data directory for recordings
        let recordings_dir = app_handle
            .path()
            .app_data_dir()
            .ok()
            .map(|p| p.join("recordings"));

        // Get screenshots directory
        let screenshots_dir = app_handle
            .path()
            .app_data_dir()
            .ok()
            .map(|p| p.join("screenshots"));

        // Create recordings directory if it doesn't exist
        if let Some(ref dir) = recordings_dir {
            match std::fs::create_dir_all(dir) {
                Ok(_) => info!(
                    "[ScreenRecording] Recordings directory created/verified: {:?}",
                    dir
                ),
                Err(e) => warn!(
                    "[ScreenRecording] Failed to create recordings directory: {}",
                    e
                ),
            }
        } else {
            warn!("[ScreenRecording] Could not determine app data directory for recordings");
        }

        // Create screenshots directory if it doesn't exist
        if let Some(ref dir) = screenshots_dir {
            match std::fs::create_dir_all(dir) {
                Ok(_) => debug!(
                    "[ScreenRecording] Screenshots directory created/verified: {:?}",
                    dir
                ),
                Err(e) => warn!(
                    "[ScreenRecording] Failed to create screenshots directory: {}",
                    e
                ),
            }
        }

        let config = RecordingConfig {
            save_directory: recordings_dir.as_ref().map(|p| p.to_string_lossy().to_string()),
            ..Default::default()
        };

        // Initialize storage manager
        let storage_config = StorageConfig {
            recordings_dir: recordings_dir.clone().unwrap_or_else(|| PathBuf::from("recordings")),
            screenshots_dir: screenshots_dir.unwrap_or_else(|| PathBuf::from("screenshots")),
            organize_by_date: true,
            max_storage_gb: 10.0,
            auto_cleanup_days: 30,
            preserve_pinned: true,
            semantic_naming: true,
        };

        debug!(
            "[ScreenRecording] Default config: format={}, codec={}, fps={}, quality={}",
            config.format, config.codec, config.frame_rate, config.quality
        );

        Self {
            config: Arc::new(RwLock::new(config.clone())),
            recorder: ScreenRecorder::new(app_handle.clone()),
            history: RecordingHistory::new(),
            storage: StorageManager::new(storage_config),
            app_handle,
        }
    }

    /// Update configuration
    pub fn update_config(&self, config: RecordingConfig) {
        info!("[ScreenRecording] Updating configuration: format={}, codec={}, fps={}, quality={}, audio={}, mic={}",
            config.format, config.codec, config.frame_rate, config.quality,
            config.capture_system_audio, config.capture_microphone);
        debug!("[ScreenRecording] Full config update: {:?}", config);
        *self.config.write() = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> RecordingConfig {
        self.config.read().clone()
    }

    /// Get current recording status
    pub fn get_status(&self) -> RecordingStatus {
        self.recorder.get_status()
    }

    /// Start recording fullscreen
    pub async fn start_fullscreen(&self, monitor_index: Option<usize>) -> Result<String, String> {
        info!(
            "[ScreenRecording] Starting fullscreen recording, monitor_index={:?}",
            monitor_index
        );
        let config = self.config.read().clone();
        match self.recorder.start_fullscreen(monitor_index, config).await {
            Ok(id) => {
                info!(
                    "[ScreenRecording] Fullscreen recording started successfully, id={}",
                    id
                );
                Ok(id)
            }
            Err(e) => {
                error!(
                    "[ScreenRecording] Failed to start fullscreen recording: {}",
                    e
                );
                Err(e)
            }
        }
    }

    /// Start recording a window
    pub async fn start_window(&self, window_title: Option<String>) -> Result<String, String> {
        info!(
            "[ScreenRecording] Starting window recording, title={:?}",
            window_title
        );
        let config = self.config.read().clone();
        match self.recorder.start_window(window_title, config).await {
            Ok(id) => {
                info!(
                    "[ScreenRecording] Window recording started successfully, id={}",
                    id
                );
                Ok(id)
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to start window recording: {}", e);
                Err(e)
            }
        }
    }

    /// Start recording a region
    pub async fn start_region(&self, region: RecordingRegion) -> Result<String, String> {
        info!(
            "[ScreenRecording] Starting region recording: x={}, y={}, {}x{}",
            region.x, region.y, region.width, region.height
        );
        let config = self.config.read().clone();
        match self.recorder.start_region(region, config).await {
            Ok(id) => {
                info!(
                    "[ScreenRecording] Region recording started successfully, id={}",
                    id
                );
                Ok(id)
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to start region recording: {}", e);
                Err(e)
            }
        }
    }

    /// Pause recording
    pub fn pause(&self) -> Result<(), String> {
        info!("[ScreenRecording] Pausing recording");
        match self.recorder.pause() {
            Ok(_) => {
                info!("[ScreenRecording] Recording paused successfully");
                Ok(())
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to pause recording: {}", e);
                Err(e)
            }
        }
    }

    /// Resume recording
    pub fn resume(&self) -> Result<(), String> {
        info!("[ScreenRecording] Resuming recording");
        match self.recorder.resume() {
            Ok(_) => {
                info!("[ScreenRecording] Recording resumed successfully");
                Ok(())
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to resume recording: {}", e);
                Err(e)
            }
        }
    }

    /// Stop recording
    pub async fn stop(&self) -> Result<RecordingMetadata, String> {
        info!("[ScreenRecording] Stopping recording");
        match self.recorder.stop().await {
            Ok(metadata) => {
                info!("[ScreenRecording] Recording stopped successfully: id={}, duration={}ms, size={} bytes, path={:?}",
                    metadata.id, metadata.duration_ms, metadata.file_size, metadata.file_path);

                // Add to history
                let entry = RecordingHistoryEntry::from_metadata(&metadata);
                self.history.add(entry);
                debug!("[ScreenRecording] Recording added to history");

                Ok(metadata)
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to stop recording: {}", e);
                Err(e)
            }
        }
    }

    /// Cancel recording (discard without saving)
    pub fn cancel(&self) -> Result<(), String> {
        info!("[ScreenRecording] Cancelling recording");
        match self.recorder.cancel() {
            Ok(_) => {
                info!("[ScreenRecording] Recording cancelled successfully");
                Ok(())
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to cancel recording: {}", e);
                Err(e)
            }
        }
    }

    /// Get current recording duration in milliseconds
    pub fn get_duration(&self) -> u64 {
        self.recorder.get_duration()
    }

    /// Get recording history
    pub fn get_history(&self, count: usize) -> Vec<RecordingHistoryEntry> {
        self.history.get_recent(count)
    }

    /// Delete recording from history
    pub fn delete_recording(&self, id: &str) -> Result<(), String> {
        info!(
            "[ScreenRecording] Deleting recording from history: id={}",
            id
        );
        match self.history.delete(id) {
            Ok(_) => {
                info!(
                    "[ScreenRecording] Recording deleted successfully: id={}",
                    id
                );
                Ok(())
            }
            Err(e) => {
                error!("[ScreenRecording] Failed to delete recording: {}", e);
                Err(e)
            }
        }
    }

    /// Clear recording history
    pub fn clear_history(&self) {
        info!("[ScreenRecording] Clearing recording history");
        self.history.clear();
        info!("[ScreenRecording] Recording history cleared");
    }

    /// Pin a recording entry
    pub fn pin_recording(&self, id: &str) -> bool {
        info!("[ScreenRecording] Pinning recording: id={}", id);
        let result = self.history.pin(id);
        if result {
            info!("[ScreenRecording] Recording pinned successfully: id={}", id);
        } else {
            warn!("[ScreenRecording] Failed to pin recording (not found): id={}", id);
        }
        result
    }

    /// Unpin a recording entry
    pub fn unpin_recording(&self, id: &str) -> bool {
        info!("[ScreenRecording] Unpinning recording: id={}", id);
        let result = self.history.unpin(id);
        if result {
            info!("[ScreenRecording] Recording unpinned successfully: id={}", id);
        } else {
            warn!("[ScreenRecording] Failed to unpin recording (not found): id={}", id);
        }
        result
    }

    /// Get a recording by ID
    pub fn get_recording_by_id(&self, id: &str) -> Option<RecordingHistoryEntry> {
        debug!("[ScreenRecording] Getting recording by id: {}", id);
        self.history.get_by_id(id)
    }

    /// Search recordings by tag
    pub fn search_by_tag(&self, tag: &str) -> Vec<RecordingHistoryEntry> {
        debug!("[ScreenRecording] Searching recordings by tag: {}", tag);
        self.history.search_by_tag(tag)
    }

    /// Add a tag to a recording
    pub fn add_tag(&self, id: &str, tag: String) -> bool {
        info!("[ScreenRecording] Adding tag '{}' to recording: id={}", tag, id);
        let result = self.history.add_tag(id, tag.clone());
        if result {
            info!("[ScreenRecording] Tag '{}' added successfully: id={}", tag, id);
        } else {
            warn!("[ScreenRecording] Failed to add tag (recording not found): id={}", id);
        }
        result
    }

    /// Remove a tag from a recording
    pub fn remove_tag(&self, id: &str, tag: &str) -> bool {
        info!("[ScreenRecording] Removing tag '{}' from recording: id={}", tag, id);
        let result = self.history.remove_tag(id, tag);
        if result {
            info!("[ScreenRecording] Tag '{}' removed successfully: id={}", tag, id);
        } else {
            warn!("[ScreenRecording] Failed to remove tag (recording not found): id={}", id);
        }
        result
    }

    /// Get recording statistics
    pub fn get_stats(&self) -> RecordingStats {
        debug!("[ScreenRecording] Getting recording statistics");
        let entries = self.history.get_all();
        let total_size = self.history.get_total_size();
        let total_duration_ms = self.history.get_total_duration();
        let pinned_count = entries.iter().filter(|e| e.is_pinned).count();
        
        let stats = RecordingStats {
            total_size,
            total_duration_ms,
            total_entries: entries.len(),
            pinned_count,
        };
        debug!("[ScreenRecording] Stats: {:?}", stats);
        stats
    }

    /// Get available monitors
    pub fn get_monitors(&self) -> Vec<MonitorInfo> {
        self.recorder.get_monitors()
    }

    /// Check if FFmpeg is available
    pub fn check_ffmpeg(&self) -> bool {
        let available = self.recorder.check_ffmpeg();
        if available {
            info!("[ScreenRecording] FFmpeg is available");
        } else {
            warn!("[ScreenRecording] FFmpeg is NOT available - screen recording will not work");
        }
        available
    }

    /// Get available audio devices
    pub fn get_audio_devices(&self) -> AudioDevices {
        self.recorder.get_audio_devices()
    }

    // ==================== Storage Management Methods ====================

    /// Get storage statistics
    pub fn get_storage_stats(&self) -> StorageStats {
        debug!("[ScreenRecording] Getting storage statistics");
        self.storage.get_stats()
    }

    /// Get storage configuration
    pub fn get_storage_config(&self) -> StorageConfig {
        self.storage.get_config()
    }

    /// Update storage configuration
    pub fn update_storage_config(&mut self, config: StorageConfig) {
        info!("[ScreenRecording] Updating storage configuration");
        self.storage.update_config(config);
    }

    /// Generate filename for a new recording
    pub fn generate_recording_filename(&self, mode: &str, format: &str, custom_name: Option<&str>) -> String {
        self.storage.generate_recording_filename(mode, format, custom_name)
    }

    /// Get full path for a recording file
    pub fn get_recording_path(&self, filename: &str) -> Result<String, String> {
        self.storage.get_recording_path(filename)
            .map(|p| p.to_string_lossy().to_string())
    }

    /// Generate filename for a screenshot
    pub fn generate_screenshot_filename(&self, mode: &str, format: &str, custom_name: Option<&str>) -> String {
        self.storage.generate_screenshot_filename(mode, format, custom_name)
    }

    /// Get full path for a screenshot file
    pub fn get_screenshot_path(&self, filename: &str) -> Result<String, String> {
        self.storage.get_screenshot_path(filename)
            .map(|p| p.to_string_lossy().to_string())
    }

    /// Check if storage limit is exceeded
    pub fn is_storage_exceeded(&self) -> bool {
        self.storage.is_storage_exceeded()
    }

    /// Get storage usage percentage
    pub fn get_storage_usage_percent(&self) -> f32 {
        self.storage.get_storage_usage_percent()
    }

    /// Cleanup old files based on configuration
    pub fn cleanup_old_files(&self) -> Result<CleanupResult, String> {
        info!("[ScreenRecording] Running storage cleanup");
        let pinned_ids: Vec<String> = self.history
            .get_all()
            .iter()
            .filter(|e| e.is_pinned)
            .map(|e| e.id.clone())
            .collect();
        
        self.storage.cleanup_old_files(&pinned_ids)
    }
}

/// Monitor information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub scale_factor: f64,
}

/// Available audio devices
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AudioDevices {
    pub system_audio_available: bool,
    pub microphones: Vec<AudioDevice>,
}

/// Audio device information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

use log::{debug, error, info, warn};
use tauri::Manager;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recording_config_default() {
        let config = RecordingConfig::default();

        assert_eq!(config.format, "mp4");
        assert_eq!(config.codec, "h264");
        assert_eq!(config.frame_rate, 30);
        assert_eq!(config.quality, 80);
        assert!(config.capture_system_audio);
        assert!(!config.capture_microphone);
        assert!(config.show_cursor);
        assert_eq!(config.countdown_seconds, 3);
    }

    #[test]
    fn test_recording_config_serialization() {
        let config = RecordingConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: RecordingConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config.format, deserialized.format);
        assert_eq!(config.frame_rate, deserialized.frame_rate);
    }

    #[test]
    fn test_recording_region() {
        let region = RecordingRegion {
            x: 100,
            y: 200,
            width: 800,
            height: 600,
        };

        assert_eq!(region.x, 100);
        assert_eq!(region.width, 800);
    }

    #[test]
    fn test_recording_status_default() {
        let status = RecordingStatus::default();
        assert_eq!(status, RecordingStatus::Idle);
    }
}
