//! Screen Recording Error Types
//!
//! Provides structured error types for better error handling and user feedback.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Error codes for screen recording operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RecordingErrorCode {
    /// FFmpeg is not installed or not found in PATH
    FfmpegNotFound,
    /// FFmpeg version is too old
    FfmpegVersionTooOld,
    /// FFmpeg process failed to start
    FfmpegStartFailed,
    /// FFmpeg process crashed during recording
    FfmpegCrashed,
    /// FFmpeg process timed out
    FfmpegTimeout,
    /// Monitor not found
    MonitorNotFound,
    /// Window not found
    WindowNotFound,
    /// Invalid region dimensions
    InvalidRegion,
    /// Already recording
    AlreadyRecording,
    /// Not recording (when trying to stop/pause)
    NotRecording,
    /// Not paused (when trying to resume)
    NotPaused,
    /// No save directory configured
    NoSaveDirectory,
    /// Failed to create save directory
    CreateDirectoryFailed,
    /// Insufficient disk space
    InsufficientDiskSpace,
    /// Permission denied
    PermissionDenied,
    /// File write error
    FileWriteError,
    /// Audio capture failed
    AudioCaptureFailed,
    /// Screen capture failed
    ScreenCaptureFailed,
    /// Unknown error
    Unknown,
}

impl fmt::Display for RecordingErrorCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FfmpegNotFound => write!(f, "FFMPEG_NOT_FOUND"),
            Self::FfmpegVersionTooOld => write!(f, "FFMPEG_VERSION_TOO_OLD"),
            Self::FfmpegStartFailed => write!(f, "FFMPEG_START_FAILED"),
            Self::FfmpegCrashed => write!(f, "FFMPEG_CRASHED"),
            Self::FfmpegTimeout => write!(f, "FFMPEG_TIMEOUT"),
            Self::MonitorNotFound => write!(f, "MONITOR_NOT_FOUND"),
            Self::WindowNotFound => write!(f, "WINDOW_NOT_FOUND"),
            Self::InvalidRegion => write!(f, "INVALID_REGION"),
            Self::AlreadyRecording => write!(f, "ALREADY_RECORDING"),
            Self::NotRecording => write!(f, "NOT_RECORDING"),
            Self::NotPaused => write!(f, "NOT_PAUSED"),
            Self::NoSaveDirectory => write!(f, "NO_SAVE_DIRECTORY"),
            Self::CreateDirectoryFailed => write!(f, "CREATE_DIRECTORY_FAILED"),
            Self::InsufficientDiskSpace => write!(f, "INSUFFICIENT_DISK_SPACE"),
            Self::PermissionDenied => write!(f, "PERMISSION_DENIED"),
            Self::FileWriteError => write!(f, "FILE_WRITE_ERROR"),
            Self::AudioCaptureFailed => write!(f, "AUDIO_CAPTURE_FAILED"),
            Self::ScreenCaptureFailed => write!(f, "SCREEN_CAPTURE_FAILED"),
            Self::Unknown => write!(f, "UNKNOWN"),
        }
    }
}

/// Structured error for screen recording operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingError {
    /// Error code for programmatic handling
    pub code: RecordingErrorCode,
    /// Human-readable error message
    pub message: String,
    /// Detailed technical information (for debugging)
    pub details: Option<String>,
    /// Suggested action for the user
    pub suggestion: Option<String>,
}

impl RecordingError {
    /// Create a new RecordingError
    pub fn new(code: RecordingErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
            suggestion: None,
        }
    }

    /// Add details to the error
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    /// Add suggestion to the error
    pub fn with_suggestion(mut self, suggestion: impl Into<String>) -> Self {
        self.suggestion = Some(suggestion.into());
        self
    }

    // Common error constructors

    /// FFmpeg not found error
    pub fn ffmpeg_not_found() -> Self {
        Self::new(
            RecordingErrorCode::FfmpegNotFound,
            "FFmpeg is not installed or not found in system PATH",
        )
        .with_suggestion(
            "Please install FFmpeg from https://ffmpeg.org/download.html and add it to your system PATH",
        )
    }

    /// FFmpeg version too old
    pub fn ffmpeg_version_too_old(version: &str, required: &str) -> Self {
        Self::new(
            RecordingErrorCode::FfmpegVersionTooOld,
            format!(
                "FFmpeg version {} is too old. Version {} or higher is required",
                version, required
            ),
        )
        .with_suggestion("Please update FFmpeg to the latest version")
    }

    /// FFmpeg start failed
    pub fn ffmpeg_start_failed(reason: &str) -> Self {
        Self::new(
            RecordingErrorCode::FfmpegStartFailed,
            "Failed to start FFmpeg recording process",
        )
        .with_details(reason)
        .with_suggestion("Check if FFmpeg is properly installed and has required permissions")
    }

    /// FFmpeg crashed
    pub fn ffmpeg_crashed(exit_code: Option<i32>) -> Self {
        let msg = match exit_code {
            Some(code) => format!("FFmpeg process crashed with exit code {}", code),
            None => "FFmpeg process crashed unexpectedly".to_string(),
        };
        Self::new(RecordingErrorCode::FfmpegCrashed, msg).with_suggestion(
            "Try recording again. If the problem persists, check FFmpeg installation",
        )
    }

    /// FFmpeg timeout
    pub fn ffmpeg_timeout(operation: &str, timeout_secs: u64) -> Self {
        Self::new(
            RecordingErrorCode::FfmpegTimeout,
            format!(
                "FFmpeg {} operation timed out after {} seconds",
                operation, timeout_secs
            ),
        )
        .with_suggestion(
            "The recording may have been saved partially. Try again with a shorter recording",
        )
    }

    /// Monitor not found
    pub fn monitor_not_found(index: usize, available: usize) -> Self {
        Self::new(
            RecordingErrorCode::MonitorNotFound,
            format!(
                "Monitor {} not found. Only {} monitors available",
                index, available
            ),
        )
        .with_suggestion("Select a valid monitor from the available list")
    }

    /// Window not found
    pub fn window_not_found(title: &str) -> Self {
        Self::new(
            RecordingErrorCode::WindowNotFound,
            format!("Window '{}' not found", title),
        )
        .with_suggestion("Make sure the window is open and visible before starting recording")
    }

    /// Invalid region
    pub fn invalid_region(reason: &str) -> Self {
        Self::new(
            RecordingErrorCode::InvalidRegion,
            format!("Invalid recording region: {}", reason),
        )
        .with_suggestion("Select a valid region with positive width and height")
    }

    /// Already recording
    pub fn already_recording(current_id: Option<&str>) -> Self {
        let msg = match current_id {
            Some(id) => format!("Already recording (ID: {})", id),
            None => "Already recording".to_string(),
        };
        Self::new(RecordingErrorCode::AlreadyRecording, msg)
            .with_suggestion("Stop the current recording before starting a new one")
    }

    /// Not recording
    pub fn not_recording() -> Self {
        Self::new(
            RecordingErrorCode::NotRecording,
            "No active recording to stop or pause",
        )
    }

    /// Not paused
    pub fn not_paused() -> Self {
        Self::new(RecordingErrorCode::NotPaused, "Recording is not paused")
            .with_suggestion("Pause the recording first before resuming")
    }

    /// No save directory
    pub fn no_save_directory() -> Self {
        Self::new(
            RecordingErrorCode::NoSaveDirectory,
            "No save directory configured for recordings",
        )
        .with_suggestion("Configure a save directory in settings before recording")
    }

    /// Insufficient disk space
    pub fn insufficient_disk_space(required_mb: u64, available_mb: u64) -> Self {
        Self::new(
            RecordingErrorCode::InsufficientDiskSpace,
            format!(
                "Insufficient disk space. Required: {} MB, Available: {} MB",
                required_mb, available_mb
            ),
        )
        .with_suggestion("Free up disk space or choose a different save location")
    }
}

impl fmt::Display for RecordingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)?;
        if let Some(ref details) = self.details {
            write!(f, " ({})", details)?;
        }
        Ok(())
    }
}

impl std::error::Error for RecordingError {}

/// Convert RecordingError to String for Tauri command results
impl From<RecordingError> for String {
    fn from(err: RecordingError) -> Self {
        // Return JSON serialized error for frontend parsing
        serde_json::to_string(&err).unwrap_or_else(|_| err.message.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_code_display() {
        assert_eq!(
            RecordingErrorCode::FfmpegNotFound.to_string(),
            "FFMPEG_NOT_FOUND"
        );
        assert_eq!(
            RecordingErrorCode::AlreadyRecording.to_string(),
            "ALREADY_RECORDING"
        );
    }

    #[test]
    fn test_recording_error_creation() {
        let err = RecordingError::ffmpeg_not_found();
        assert_eq!(err.code, RecordingErrorCode::FfmpegNotFound);
        assert!(err.suggestion.is_some());
    }

    #[test]
    fn test_recording_error_with_details() {
        let err = RecordingError::new(RecordingErrorCode::Unknown, "Test error")
            .with_details("Some details")
            .with_suggestion("Try again");

        assert_eq!(err.details, Some("Some details".to_string()));
        assert_eq!(err.suggestion, Some("Try again".to_string()));
    }

    #[test]
    fn test_recording_error_serialization() {
        let err = RecordingError::ffmpeg_not_found();
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("FFMPEG_NOT_FOUND"));
    }

    #[test]
    fn test_recording_error_into_string_json() {
        let err = RecordingError::ffmpeg_not_found();
        let encoded: String = err.into();
        let decoded: serde_json::Value = serde_json::from_str(&encoded).unwrap();

        assert_eq!(decoded["code"], "FfmpegNotFound");
        assert!(decoded["message"]
            .as_str()
            .unwrap_or_default()
            .contains("FFmpeg"));
    }
}
