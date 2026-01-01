//! Screen Recording module
//!
//! Provides screen recording functionality including:
//! - Full screen recording
//! - Window recording
//! - Region recording
//! - Audio capture (system and microphone)

mod recorder;
mod history;

pub use recorder::ScreenRecorder;
pub use history::{RecordingHistory, RecordingHistoryEntry};

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;
use tauri::AppHandle;

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
    #[allow(dead_code)]
    app_handle: AppHandle,
}

impl ScreenRecordingManager {
    pub fn new(app_handle: AppHandle) -> Self {
        // Get app data directory for recordings
        let recordings_dir = app_handle
            .path()
            .app_data_dir()
            .ok()
            .map(|p| p.join("recordings"));

        // Create recordings directory if it doesn't exist
        if let Some(ref dir) = recordings_dir {
            let _ = std::fs::create_dir_all(dir);
        }

        let config = RecordingConfig {
            save_directory: recordings_dir.map(|p| p.to_string_lossy().to_string()),
            ..Default::default()
        };

        Self {
            config: Arc::new(RwLock::new(config)),
            recorder: ScreenRecorder::new(app_handle.clone()),
            history: RecordingHistory::new(),
            app_handle,
        }
    }

    /// Update configuration
    pub fn update_config(&self, config: RecordingConfig) {
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
        let config = self.config.read().clone();
        self.recorder.start_fullscreen(monitor_index, config).await
    }

    /// Start recording a window
    pub async fn start_window(&self, window_title: Option<String>) -> Result<String, String> {
        let config = self.config.read().clone();
        self.recorder.start_window(window_title, config).await
    }

    /// Start recording a region
    pub async fn start_region(&self, region: RecordingRegion) -> Result<String, String> {
        let config = self.config.read().clone();
        self.recorder.start_region(region, config).await
    }

    /// Pause recording
    pub fn pause(&self) -> Result<(), String> {
        self.recorder.pause()
    }

    /// Resume recording
    pub fn resume(&self) -> Result<(), String> {
        self.recorder.resume()
    }

    /// Stop recording
    pub async fn stop(&self) -> Result<RecordingMetadata, String> {
        let metadata = self.recorder.stop().await?;
        
        // Add to history
        let entry = RecordingHistoryEntry::from_metadata(&metadata);
        self.history.add(entry);
        
        Ok(metadata)
    }

    /// Cancel recording (discard without saving)
    pub fn cancel(&self) -> Result<(), String> {
        self.recorder.cancel()
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
        self.history.delete(id)
    }

    /// Clear recording history
    pub fn clear_history(&self) {
        self.history.clear()
    }

    /// Get available monitors
    pub fn get_monitors(&self) -> Vec<MonitorInfo> {
        self.recorder.get_monitors()
    }

    /// Check if FFmpeg is available
    pub fn check_ffmpeg(&self) -> bool {
        self.recorder.check_ffmpeg()
    }

    /// Get available audio devices
    pub fn get_audio_devices(&self) -> AudioDevices {
        self.recorder.get_audio_devices()
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
