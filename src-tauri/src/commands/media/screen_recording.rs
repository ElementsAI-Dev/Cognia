//! Screen Recording Tauri commands

use crate::screen_recording::{
    ffmpeg, AggregatedStorageStatus, AudioDevices, CleanupResult, EncodingSupport, FFmpegInfo,
    FFmpegInstallGuide, HardwareAcceleration, MonitorInfo, RecordingConfig, RecordingHistoryEntry,
    RecordingMetadata, RecordingRegion, RecordingStats, RecordingStatus, RecordingToolbar,
    RecordingToolbarConfig, RecordingToolbarState, ScreenRecordingManager, SnapEdge, StorageConfig,
    StorageFile, StorageFileType, StorageStats, ToolbarPosition, VideoConvertOptions, VideoInfo,
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

/// Pin a recording entry
#[tauri::command]
pub async fn recording_pin(
    manager: State<'_, ScreenRecordingManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.pin_recording(&id))
}

/// Unpin a recording entry
#[tauri::command]
pub async fn recording_unpin(
    manager: State<'_, ScreenRecordingManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.unpin_recording(&id))
}

/// Get a recording by ID
#[tauri::command]
pub async fn recording_get_by_id(
    manager: State<'_, ScreenRecordingManager>,
    id: String,
) -> Result<Option<RecordingHistoryEntry>, String> {
    Ok(manager.get_recording_by_id(&id))
}

/// Search recordings by tag
#[tauri::command]
pub async fn recording_search_by_tag(
    manager: State<'_, ScreenRecordingManager>,
    tag: String,
) -> Result<Vec<RecordingHistoryEntry>, String> {
    Ok(manager.search_by_tag(&tag))
}

/// Add a tag to a recording
#[tauri::command]
pub async fn recording_add_tag(
    manager: State<'_, ScreenRecordingManager>,
    id: String,
    tag: String,
) -> Result<bool, String> {
    Ok(manager.add_tag(&id, tag))
}

/// Remove a tag from a recording
#[tauri::command]
pub async fn recording_remove_tag(
    manager: State<'_, ScreenRecordingManager>,
    id: String,
    tag: String,
) -> Result<bool, String> {
    Ok(manager.remove_tag(&id, &tag))
}

/// Get recording statistics
#[tauri::command]
pub async fn recording_get_stats(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<RecordingStats, String> {
    Ok(manager.get_stats())
}

// ==================== Video Processing Commands ====================

/// Trim a video file
#[tauri::command]
pub async fn video_trim(options: VideoTrimOptions) -> Result<VideoProcessingResult, String> {
    VideoProcessor::trim_video(&options)
}

/// Trim a video file with progress events
#[tauri::command]
pub async fn video_trim_with_progress(
    app_handle: tauri::AppHandle,
    options: VideoTrimOptions,
) -> Result<VideoProcessingResult, String> {
    VideoProcessor::trim_video_with_progress(&options, &app_handle)
}

/// Convert video to different format
#[tauri::command]
pub async fn video_convert(options: VideoConvertOptions) -> Result<VideoProcessingResult, String> {
    VideoProcessor::convert_video(&options)
}

/// Convert video to different format with progress events
#[tauri::command]
pub async fn video_convert_with_progress(
    app_handle: tauri::AppHandle,
    options: VideoConvertOptions,
) -> Result<VideoProcessingResult, String> {
    VideoProcessor::convert_video_with_progress(&options, &app_handle)
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

/// Generate video thumbnail with progress events
#[tauri::command]
pub async fn video_generate_thumbnail_with_progress(
    app_handle: tauri::AppHandle,
    video_path: String,
    output_path: String,
    timestamp_ms: u64,
) -> Result<String, String> {
    VideoProcessor::generate_thumbnail_with_progress(
        &video_path,
        &output_path,
        timestamp_ms,
        &app_handle,
    )
}

/// Check encoding support
#[tauri::command]
pub async fn video_check_encoding_support() -> Result<EncodingSupport, String> {
    Ok(VideoProcessor::check_encoding_support())
}

/// Cancel ongoing video processing
#[tauri::command]
pub async fn video_cancel_processing() -> Result<bool, String> {
    Ok(VideoProcessor::cancel_processing())
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

// ==================== Storage Management Commands ====================

/// Get storage statistics
#[tauri::command]
pub async fn storage_get_stats(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<StorageStats, String> {
    Ok(manager.get_storage_stats())
}

/// Get aggregated storage status (stats + usage + exceeded + config in one call)
#[tauri::command]
pub async fn storage_get_aggregated_status(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<AggregatedStorageStatus, String> {
    Ok(manager.get_aggregated_storage_status())
}

/// Get storage configuration
#[tauri::command]
pub async fn storage_get_config(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<StorageConfig, String> {
    Ok(manager.get_storage_config())
}

/// Update storage configuration
#[tauri::command]
pub async fn storage_update_config(
    manager: State<'_, ScreenRecordingManager>,
    config: StorageConfig,
) -> Result<(), String> {
    manager.update_storage_config(config);
    Ok(())
}

/// Generate filename for a new recording
#[tauri::command]
pub async fn storage_generate_recording_filename(
    manager: State<'_, ScreenRecordingManager>,
    mode: String,
    format: String,
    custom_name: Option<String>,
) -> Result<String, String> {
    Ok(manager.generate_recording_filename(&mode, &format, custom_name.as_deref()))
}

/// Get full path for a recording file
#[tauri::command]
pub async fn storage_get_recording_path(
    manager: State<'_, ScreenRecordingManager>,
    filename: String,
) -> Result<String, String> {
    manager.get_recording_path(&filename)
}

/// Generate filename for a screenshot
#[tauri::command]
pub async fn storage_generate_screenshot_filename(
    manager: State<'_, ScreenRecordingManager>,
    mode: String,
    format: String,
    custom_name: Option<String>,
) -> Result<String, String> {
    Ok(manager.generate_screenshot_filename(&mode, &format, custom_name.as_deref()))
}

/// Get full path for a screenshot file
#[tauri::command]
pub async fn storage_get_screenshot_path(
    manager: State<'_, ScreenRecordingManager>,
    filename: String,
) -> Result<String, String> {
    manager.get_screenshot_path(&filename)
}

/// Check if storage limit is exceeded
#[tauri::command]
pub async fn storage_is_exceeded(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<bool, String> {
    Ok(manager.is_storage_exceeded())
}

/// Get storage usage percentage
#[tauri::command]
pub async fn storage_get_usage_percent(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<f32, String> {
    Ok(manager.get_storage_usage_percent())
}

/// Cleanup old files based on configuration
#[tauri::command]
pub async fn storage_cleanup(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<CleanupResult, String> {
    manager.cleanup_old_files()
}

/// List all storage files (recordings and screenshots)
#[tauri::command]
pub async fn storage_list_files(
    manager: State<'_, ScreenRecordingManager>,
    file_type: Option<StorageFileType>,
) -> Result<Vec<StorageFile>, String> {
    Ok(manager.list_storage_files(file_type))
}

/// Get a single storage file by path
#[tauri::command]
pub async fn storage_get_file(
    manager: State<'_, ScreenRecordingManager>,
    file_path: String,
) -> Result<Option<StorageFile>, String> {
    Ok(manager.get_storage_file(&file_path))
}

/// Get app data directory path
#[tauri::command]
pub async fn recording_get_app_data_dir(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<Option<String>, String> {
    Ok(manager
        .get_app_data_dir()
        .map(|p| p.to_string_lossy().to_string()))
}

/// Get recordings directory path
#[tauri::command]
pub async fn recording_get_recordings_dir(
    manager: State<'_, ScreenRecordingManager>,
) -> Result<Option<String>, String> {
    Ok(manager
        .get_recordings_dir()
        .map(|p| p.to_string_lossy().to_string()))
}

/// Calculate toolbar position coordinates for a given preset
#[tauri::command]
pub async fn recording_calculate_toolbar_position(
    manager: State<'_, ScreenRecordingManager>,
    position: ToolbarPosition,
    monitor_width: u32,
    monitor_height: u32,
    toolbar_width: u32,
    toolbar_height: u32,
) -> Result<(i32, i32), String> {
    Ok(manager.calculate_toolbar_position(
        position,
        monitor_width,
        monitor_height,
        toolbar_width,
        toolbar_height,
    ))
}

// ==================== Recording Toolbar Commands ====================

/// Show the recording toolbar
#[tauri::command]
pub async fn recording_toolbar_show(toolbar: State<'_, RecordingToolbar>) -> Result<(), String> {
    toolbar.show()
}

/// Hide the recording toolbar
#[tauri::command]
pub async fn recording_toolbar_hide(toolbar: State<'_, RecordingToolbar>) -> Result<(), String> {
    toolbar.hide()
}

/// Check if toolbar is visible
#[tauri::command]
pub async fn recording_toolbar_is_visible(
    toolbar: State<'_, RecordingToolbar>,
) -> Result<bool, String> {
    Ok(toolbar.is_visible())
}

/// Set toolbar position
#[tauri::command]
pub async fn recording_toolbar_set_position(
    toolbar: State<'_, RecordingToolbar>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    toolbar.set_position(x, y)
}

/// Get toolbar position
#[tauri::command]
pub async fn recording_toolbar_get_position(
    toolbar: State<'_, RecordingToolbar>,
) -> Result<(i32, i32), String> {
    Ok(toolbar.get_position())
}

/// Snap toolbar to edge
#[tauri::command]
pub async fn recording_toolbar_snap_to_edge(
    toolbar: State<'_, RecordingToolbar>,
    edge: SnapEdge,
) -> Result<(), String> {
    toolbar.snap_to_edge(edge)
}

/// Toggle compact mode
#[tauri::command]
pub async fn recording_toolbar_toggle_compact(
    toolbar: State<'_, RecordingToolbar>,
) -> Result<bool, String> {
    toolbar.toggle_compact_mode()
}

/// Get toolbar configuration
#[tauri::command]
pub async fn recording_toolbar_get_config(
    toolbar: State<'_, RecordingToolbar>,
) -> Result<RecordingToolbarConfig, String> {
    Ok(toolbar.get_config())
}

/// Update toolbar configuration
#[tauri::command]
pub async fn recording_toolbar_update_config(
    toolbar: State<'_, RecordingToolbar>,
    config: RecordingToolbarConfig,
) -> Result<(), String> {
    toolbar.update_config(config);
    Ok(())
}

/// Get toolbar state (recording status, duration, etc.)
#[tauri::command]
pub async fn recording_toolbar_get_state(
    toolbar: State<'_, RecordingToolbar>,
) -> Result<RecordingToolbarState, String> {
    Ok(toolbar.get_state())
}

/// Update toolbar recording state
#[tauri::command]
pub async fn recording_toolbar_update_state(
    toolbar: State<'_, RecordingToolbar>,
    is_recording: bool,
    is_paused: bool,
    duration_ms: u64,
) -> Result<(), String> {
    toolbar.update_recording_state(is_recording, is_paused, duration_ms);
    Ok(())
}

/// Set toolbar hover state
#[tauri::command]
pub async fn recording_toolbar_set_hovered(
    toolbar: State<'_, RecordingToolbar>,
    hovered: bool,
) -> Result<(), String> {
    toolbar.set_hovered(hovered);
    Ok(())
}

/// Get toolbar hover state
#[tauri::command]
pub async fn recording_toolbar_is_hovered(
    toolbar: State<'_, RecordingToolbar>,
) -> Result<bool, String> {
    Ok(toolbar.is_hovered())
}

/// Destroy the toolbar window
#[tauri::command]
pub async fn recording_toolbar_destroy(toolbar: State<'_, RecordingToolbar>) -> Result<(), String> {
    toolbar.destroy()
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
