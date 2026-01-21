//! Screen Recording Tauri commands

use crate::screen_recording::{
    ffmpeg, AudioDevices, EncodingSupport, FFmpegInfo, FFmpegInstallGuide, HardwareAcceleration,
    MonitorInfo, RecordingConfig, RecordingHistoryEntry, RecordingMetadata, RecordingRegion,
    RecordingStatus, ScreenRecordingManager, VideoConvertOptions, VideoInfo,
    VideoProcessingResult, VideoProcessor, VideoTrimOptions,
};
use tauri::State;

/// Get current recording status
#[tauri::command]
pub async fn recording_get_status(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<RecordingStatus, String> {
    Ok(manager.get_status())
}

/// Get current recording duration in milliseconds
#[tauri::command]
pub async fn recording_get_duration(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<u64, String> {
    Ok(manager.get_duration())
}

/// Start fullscreen recording
#[tauri::command]
pub async fn recording_start_fullscreen(
    manager: State<'_, ScreenRecordingManager>,
    monitor_index: Option<usize>,
) -> Result<String, String> {
    manager.start_fullscreen(monitor_index).await
}

/// Start window recording
#[tauri::command]
pub async fn recording_start_window(
    manager: State<'_, ScreenRecordingManager>,
    window_title: Option<String>,
) -> Result<String, String> {
    manager.start_window(window_title).await
}

/// Start region recording
#[tauri::command]
pub async fn recording_start_region(
    manager: State<'_, ScreenRecordingManager>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let region = RecordingRegion {
        x,
        y,
        width,
        height,
    };
    manager.start_region(region).await
}

/// Pause recording
#[tauri::command]
pub async fn recording_pause(manager: State<'_, ScreenRecordingManager>) -> Result<(), String> {
    manager.pause()
}

/// Resume recording
#[tauri::command]
pub async fn recording_resume(manager: State<'_, ScreenRecordingManager>) -> Result<(), String> {
    manager.resume()
}

/// Stop recording and save
#[tauri::command]
pub async fn recording_stop(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<RecordingMetadata, String> {
    manager.stop().await
}

/// Cancel recording without saving
#[tauri::command]
pub async fn recording_cancel(manager: State<'_, ScreenRecordingManager>) -> Result<(), String> {
    manager.cancel()
}

/// Get recording configuration
#[tauri::command]
pub async fn recording_get_config(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<RecordingConfig, String> {
    Ok(manager.get_config())
}

/// Update recording configuration
#[tauri::command]
pub async fn recording_update_config(
    manager: State<'_, ScreenRecordingManager>,
    config: RecordingConfig,
) -> Result<(), String> {
    manager.update_config(config);
    Ok(())
}

/// Get available monitors
#[tauri::command]
pub async fn recording_get_monitors(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<Vec<MonitorInfo>, String> {
    Ok(manager.get_monitors())
}

/// Check if FFmpeg is available
#[tauri::command]
pub async fn recording_check_ffmpeg(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<bool, String> {
    Ok(manager.check_ffmpeg())
}

/// Get available audio devices
#[tauri::command]
pub async fn recording_get_audio_devices(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<AudioDevices, String> {
    Ok(manager.get_audio_devices())
}

/// Get recording history
#[tauri::command]
pub async fn recording_get_history(
    manager: State<'_, ScreenRecordingManager>,
    count: Option<usize>,
) -> Result<Vec<RecordingHistoryEntry>, String> {
    Ok(manager.get_history(count.unwrap_or(20)))
}

/// Delete recording from history
#[tauri::command]
pub async fn recording_delete(
    manager: State<'_, ScreenRecordingManager>,
    id: String,
) -> Result<(), String> {
    manager.delete_recording(&id)
}

/// Clear recording history
#[tauri::command]
pub async fn recording_clear_history(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<(), String> {
    manager.clear_history();
    Ok(())
}

// ==================== Video Processing Commands ====================

/// Trim a video file
#[tauri::command]
pub async fn video_trim(options: VideoTrimOptions) -> Result<VideoProcessingResult, String> {
    VideoProcessor::trim_video(&options)
}

/// Convert video to different format
#[tauri::command]
pub async fn video_convert(options: VideoConvertOptions) -> Result<VideoProcessingResult, String> {
    VideoProcessor::convert_video(&options)
}

/// Get video information
#[tauri::command]
pub async fn video_get_info(file_path: String) -> Result<VideoInfo, String> {
    VideoProcessor::get_video_info(&file_path)
}

/// Generate video thumbnail
#[tauri::command]
pub async fn video_generate_thumbnail(
    video_path: String,
    output_path: String,
    timestamp_ms: u64,
) -> Result<String, String> {
    VideoProcessor::generate_thumbnail(&video_path, &output_path, timestamp_ms)
}

/// Check encoding support
#[tauri::command]
pub async fn video_check_encoding_support() -> Result<EncodingSupport, String> {
    Ok(VideoProcessor::check_encoding_support())
}

// ==================== FFmpeg Commands ====================

/// Get detailed FFmpeg information
#[tauri::command]
pub async fn ffmpeg_get_info() -> Result<FFmpegInfo, String> {
    Ok(ffmpeg::get_ffmpeg_info())
}

/// Get FFmpeg installation guide for current platform
#[tauri::command]
pub async fn ffmpeg_get_install_guide() -> Result<FFmpegInstallGuide, String> {
    Ok(ffmpeg::get_install_guide())
}

/// Check hardware acceleration availability
#[tauri::command]
pub async fn ffmpeg_check_hardware_acceleration() -> Result<HardwareAcceleration, String> {
    Ok(ffmpeg::check_hardware_acceleration())
}

/// Check if FFmpeg meets minimum version requirements
#[tauri::command]
pub async fn ffmpeg_check_version() -> Result<bool, String> {
    let info = ffmpeg::get_ffmpeg_info();
    Ok(info.available && info.version_ok)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recording_region_struct() {
        let region = RecordingRegion {
            x: 100,
            y: 200,
            width: 800,
            height: 600,
        };

        assert_eq!(region.x, 100);
        assert_eq!(region.y, 200);
        assert_eq!(region.width, 800);
        assert_eq!(region.height, 600);
    }

    #[test]
    fn test_recording_config_serialization() {
        let config = RecordingConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: RecordingConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(config.format, deserialized.format);
        assert_eq!(config.frame_rate, deserialized.frame_rate);
    }
}
