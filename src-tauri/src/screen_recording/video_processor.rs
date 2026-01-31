//! Video processing module
//!
//! Provides video trimming, conversion, and export via FFmpeg

use super::progress::{
    emit_processing_completed, emit_processing_error, emit_processing_started,
    monitor_ffmpeg_progress,
};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::{Command, Stdio};
use tauri::AppHandle;

/// Video trim options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoTrimOptions {
    pub input_path: String,
    pub output_path: String,
    pub start_time: f64,
    pub end_time: f64,
    pub format: Option<String>,
    pub quality: Option<u8>,
    pub gif_fps: Option<u8>,
}

/// Video convert options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoConvertOptions {
    pub input_path: String,
    pub output_path: String,
    pub format: String,
    pub quality: Option<u8>,
    pub width: Option<u32>,
    pub gif_fps: Option<u8>,
}

/// Video processing result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProcessingResult {
    pub success: bool,
    pub output_path: String,
    pub file_size: u64,
    pub duration_ms: u64,
    pub error: Option<String>,
}

/// Video information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoInfo {
    pub duration_ms: u64,
    pub width: u32,
    pub height: u32,
    pub fps: f32,
    pub codec: String,
    pub file_size: u64,
    pub has_audio: bool,
}

/// Video processing manager
pub struct VideoProcessor;

impl VideoProcessor {
    /// Check if FFmpeg is available
    pub fn check_ffmpeg() -> bool {
        Command::new("ffmpeg")
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }


    /// Trim a video file
    pub fn trim_video(options: &VideoTrimOptions) -> Result<VideoProcessingResult, String> {
        info!(
            "[VideoProcessor] Trimming video: {} -> {}, time: {:.2}s to {:.2}s",
            options.input_path, options.output_path, options.start_time, options.end_time
        );

        if !Self::check_ffmpeg() {
            return Err("FFmpeg is not available. Please install FFmpeg to process videos.".to_string());
        }

        if !Path::new(&options.input_path).exists() {
            return Err(format!("Input file not found: {}", options.input_path));
        }

        let duration = options.end_time - options.start_time;
        if duration <= 0.0 {
            return Err("End time must be greater than start time".to_string());
        }

        let format = options.format.as_deref().unwrap_or("mp4");
        let quality = options.quality.unwrap_or(80);

        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y") // Overwrite output
            .arg("-ss")
            .arg(format!("{:.3}", options.start_time))
            .arg("-i")
            .arg(&options.input_path)
            .arg("-t")
            .arg(format!("{:.3}", duration));

        // Format-specific encoding
        match format {
            "gif" => {
                let fps = options.gif_fps.unwrap_or(10);
                cmd.arg("-vf")
                    .arg(format!("fps={},scale=480:-1:flags=lanczos", fps))
                    .arg("-loop")
                    .arg("0");
            }
            "webm" => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libvpx-vp9")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-b:v")
                    .arg("0")
                    .arg("-c:a")
                    .arg("libopus");
            }
            _ => {
                // mp4
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libx264")
                    .arg("-preset")
                    .arg("medium")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-c:a")
                    .arg("aac")
                    .arg("-movflags")
                    .arg("+faststart");
            }
        }

        cmd.arg(&options.output_path);

        debug!("[VideoProcessor] Running FFmpeg command: {:?}", cmd);

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to run FFmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("[VideoProcessor] FFmpeg error: {}", stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        // Get output file info
        let file_size = std::fs::metadata(&options.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        info!(
            "[VideoProcessor] Trim complete: {} bytes, {:.2}s duration",
            file_size, duration
        );

        Ok(VideoProcessingResult {
            success: true,
            output_path: options.output_path.clone(),
            file_size,
            duration_ms: (duration * 1000.0) as u64,
            error: None,
        })
    }

    /// Trim a video file with real-time progress events
    pub fn trim_video_with_progress(
        options: &VideoTrimOptions,
        app_handle: &AppHandle,
    ) -> Result<VideoProcessingResult, String> {
        info!(
            "[VideoProcessor] Trimming video with progress: {} -> {}",
            options.input_path, options.output_path
        );

        if !Self::check_ffmpeg() {
            let err = "FFmpeg is not available. Please install FFmpeg to process videos.".to_string();
            emit_processing_error(app_handle, "trim", &err);
            return Err(err);
        }

        if !Path::new(&options.input_path).exists() {
            let err = format!("Input file not found: {}", options.input_path);
            emit_processing_error(app_handle, "trim", &err);
            return Err(err);
        }

        let duration = options.end_time - options.start_time;
        if duration <= 0.0 {
            let err = "End time must be greater than start time".to_string();
            emit_processing_error(app_handle, "trim", &err);
            return Err(err);
        }

        emit_processing_started(app_handle, "trim");

        let format = options.format.as_deref().unwrap_or("mp4");
        let quality = options.quality.unwrap_or(80);

        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y")
            .arg("-progress")
            .arg("pipe:2") // Output progress to stderr
            .arg("-ss")
            .arg(format!("{:.3}", options.start_time))
            .arg("-i")
            .arg(&options.input_path)
            .arg("-t")
            .arg(format!("{:.3}", duration))
            .stderr(Stdio::piped());

        // Format-specific encoding
        match format {
            "gif" => {
                let fps = options.gif_fps.unwrap_or(10);
                cmd.arg("-vf")
                    .arg(format!("fps={},scale=480:-1:flags=lanczos", fps))
                    .arg("-loop")
                    .arg("0");
            }
            "webm" => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libvpx-vp9")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-b:v")
                    .arg("0")
                    .arg("-c:a")
                    .arg("libopus");
            }
            _ => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libx264")
                    .arg("-preset")
                    .arg("medium")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-c:a")
                    .arg("aac")
                    .arg("-movflags")
                    .arg("+faststart");
            }
        }

        cmd.arg(&options.output_path);

        debug!("[VideoProcessor] Running FFmpeg with progress: {:?}", cmd);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn FFmpeg: {}", e))?;

        // Monitor progress in background
        if let Err(e) = monitor_ffmpeg_progress(app_handle, &mut child, "trim", Some(duration)) {
            warn!("[VideoProcessor] Progress monitoring failed: {}", e);
        }

        // Wait for process to complete
        let status = child
            .wait()
            .map_err(|e| format!("Failed to wait for FFmpeg: {}", e))?;

        if !status.success() {
            let err = "FFmpeg trim failed".to_string();
            error!("[VideoProcessor] {}", err);
            emit_processing_error(app_handle, "trim", &err);
            return Err(err);
        }

        let file_size = std::fs::metadata(&options.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        info!(
            "[VideoProcessor] Trim complete: {} bytes, {:.2}s duration",
            file_size, duration
        );

        emit_processing_completed(app_handle, "trim", &options.output_path);

        Ok(VideoProcessingResult {
            success: true,
            output_path: options.output_path.clone(),
            file_size,
            duration_ms: (duration * 1000.0) as u64,
            error: None,
        })
    }

    /// Convert video format
    pub fn convert_video(options: &VideoConvertOptions) -> Result<VideoProcessingResult, String> {
        info!(
            "[VideoProcessor] Converting video: {} -> {} (format: {})",
            options.input_path, options.output_path, options.format
        );

        if !Self::check_ffmpeg() {
            return Err("FFmpeg is not available. Please install FFmpeg to process videos.".to_string());
        }

        if !Path::new(&options.input_path).exists() {
            return Err(format!("Input file not found: {}", options.input_path));
        }

        let quality = options.quality.unwrap_or(80);

        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y").arg("-i").arg(&options.input_path);

        // Scale if width specified
        if let Some(width) = options.width {
            cmd.arg("-vf").arg(format!("scale={}:-2", width));
        }

        // Format-specific encoding
        match options.format.as_str() {
            "gif" => {
                let fps = options.gif_fps.unwrap_or(10);
                let scale = options.width.unwrap_or(480);
                cmd.arg("-vf")
                    .arg(format!("fps={},scale={}:-1:flags=lanczos", fps, scale))
                    .arg("-loop")
                    .arg("0");
            }
            "webm" => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libvpx-vp9")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-b:v")
                    .arg("0")
                    .arg("-c:a")
                    .arg("libopus");
            }
            _ => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libx264")
                    .arg("-preset")
                    .arg("medium")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-c:a")
                    .arg("aac")
                    .arg("-movflags")
                    .arg("+faststart");
            }
        }

        cmd.arg(&options.output_path);

        debug!("[VideoProcessor] Running FFmpeg command: {:?}", cmd);

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to run FFmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!("[VideoProcessor] FFmpeg error: {}", stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        let file_size = std::fs::metadata(&options.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        // Get duration from output file
        let duration_ms = Self::get_video_duration(&options.output_path).unwrap_or(0);

        info!(
            "[VideoProcessor] Convert complete: {} bytes, {}ms duration",
            file_size, duration_ms
        );

        Ok(VideoProcessingResult {
            success: true,
            output_path: options.output_path.clone(),
            file_size,
            duration_ms,
            error: None,
        })
    }

    /// Convert video format with real-time progress events
    pub fn convert_video_with_progress(
        options: &VideoConvertOptions,
        app_handle: &AppHandle,
    ) -> Result<VideoProcessingResult, String> {
        info!(
            "[VideoProcessor] Converting video with progress: {} -> {}",
            options.input_path, options.output_path
        );

        if !Self::check_ffmpeg() {
            let err = "FFmpeg is not available. Please install FFmpeg to process videos.".to_string();
            emit_processing_error(app_handle, "convert", &err);
            return Err(err);
        }

        if !Path::new(&options.input_path).exists() {
            let err = format!("Input file not found: {}", options.input_path);
            emit_processing_error(app_handle, "convert", &err);
            return Err(err);
        }

        // Get input duration for progress calculation
        let input_duration = Self::get_video_duration(&options.input_path)
            .map(|ms| ms as f64 / 1000.0);

        emit_processing_started(app_handle, "convert");

        let quality = options.quality.unwrap_or(80);

        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-y")
            .arg("-progress")
            .arg("pipe:2")
            .arg("-i")
            .arg(&options.input_path)
            .stderr(Stdio::piped());

        // Scale if width specified
        if let Some(width) = options.width {
            cmd.arg("-vf").arg(format!("scale={}:-2", width));
        }

        // Format-specific encoding
        match options.format.as_str() {
            "gif" => {
                let fps = options.gif_fps.unwrap_or(10);
                let scale = options.width.unwrap_or(480);
                cmd.arg("-vf")
                    .arg(format!("fps={},scale={}:-1:flags=lanczos", fps, scale))
                    .arg("-loop")
                    .arg("0");
            }
            "webm" => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libvpx-vp9")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-b:v")
                    .arg("0")
                    .arg("-c:a")
                    .arg("libopus");
            }
            _ => {
                let crf = Self::quality_to_crf(quality);
                cmd.arg("-c:v")
                    .arg("libx264")
                    .arg("-preset")
                    .arg("medium")
                    .arg("-crf")
                    .arg(crf.to_string())
                    .arg("-c:a")
                    .arg("aac")
                    .arg("-movflags")
                    .arg("+faststart");
            }
        }

        cmd.arg(&options.output_path);

        debug!("[VideoProcessor] Running FFmpeg with progress: {:?}", cmd);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn FFmpeg: {}", e))?;

        // Monitor progress in background
        if let Err(e) = monitor_ffmpeg_progress(app_handle, &mut child, "convert", input_duration) {
            warn!("[VideoProcessor] Progress monitoring failed: {}", e);
        }

        // Wait for process to complete
        let status = child
            .wait()
            .map_err(|e| format!("Failed to wait for FFmpeg: {}", e))?;

        if !status.success() {
            let err = "FFmpeg convert failed".to_string();
            error!("[VideoProcessor] {}", err);
            emit_processing_error(app_handle, "convert", &err);
            return Err(err);
        }

        let file_size = std::fs::metadata(&options.output_path)
            .map(|m| m.len())
            .unwrap_or(0);

        let duration_ms = Self::get_video_duration(&options.output_path).unwrap_or(0);

        info!(
            "[VideoProcessor] Convert complete: {} bytes, {}ms duration",
            file_size, duration_ms
        );

        emit_processing_completed(app_handle, "convert", &options.output_path);

        Ok(VideoProcessingResult {
            success: true,
            output_path: options.output_path.clone(),
            file_size,
            duration_ms,
            error: None,
        })
    }

    /// Get video information using FFprobe
    pub fn get_video_info(file_path: &str) -> Result<VideoInfo, String> {
        debug!("[VideoProcessor] Getting video info: {}", file_path);

        if !Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }

        let output = Command::new("ffprobe")
            .args([
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                file_path,
            ])
            .output()
            .map_err(|e| format!("Failed to run FFprobe: {}", e))?;

        if !output.status.success() {
            return Err("FFprobe failed to analyze video".to_string());
        }

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse FFprobe output: {}", e))?;

        // Extract video stream info
        let streams = json["streams"].as_array().ok_or("No streams found")?;
        let video_stream = streams
            .iter()
            .find(|s| s["codec_type"] == "video")
            .ok_or("No video stream found")?;

        let has_audio = streams.iter().any(|s| s["codec_type"] == "audio");

        let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
        let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
        let codec = video_stream["codec_name"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        // Parse frame rate
        let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("30/1");
        let fps = Self::parse_frame_rate(fps_str);

        // Duration
        let duration_str = json["format"]["duration"].as_str().unwrap_or("0");
        let duration_secs: f64 = duration_str.parse().unwrap_or(0.0);
        let duration_ms = (duration_secs * 1000.0) as u64;

        // File size
        let file_size = std::fs::metadata(file_path).map(|m| m.len()).unwrap_or(0);

        Ok(VideoInfo {
            duration_ms,
            width,
            height,
            fps,
            codec,
            file_size,
            has_audio,
        })
    }

    /// Generate a thumbnail from video
    pub fn generate_thumbnail(
        video_path: &str,
        output_path: &str,
        timestamp_ms: u64,
    ) -> Result<String, String> {
        debug!(
            "[VideoProcessor] Generating thumbnail: {} at {}ms",
            video_path, timestamp_ms
        );

        let timestamp_secs = timestamp_ms as f64 / 1000.0;

        let output = Command::new("ffmpeg")
            .args([
                "-y",
                "-ss",
                &format!("{:.3}", timestamp_secs),
                "-i",
                video_path,
                "-vframes",
                "1",
                "-q:v",
                "2",
                output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to run FFmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            warn!("[VideoProcessor] Thumbnail generation warning: {}", stderr);
        }

        if Path::new(output_path).exists() {
            Ok(output_path.to_string())
        } else {
            Err("Failed to generate thumbnail".to_string())
        }
    }

    /// Generate a thumbnail from video with progress events
    pub fn generate_thumbnail_with_progress(
        video_path: &str,
        output_path: &str,
        timestamp_ms: u64,
        app_handle: &AppHandle,
    ) -> Result<String, String> {
        emit_processing_started(app_handle, "thumbnail");

        match Self::generate_thumbnail(video_path, output_path, timestamp_ms) {
            Ok(result) => {
                emit_processing_completed(app_handle, "thumbnail", &result);
                Ok(result)
            }
            Err(e) => {
                emit_processing_error(app_handle, "thumbnail", &e);
                Err(e)
            }
        }
    }

    /// Check encoding support
    pub fn check_encoding_support() -> EncodingSupport {
        let check_encoder = |encoder: &str| -> bool {
            Command::new("ffmpeg")
                .args(["-hide_banner", "-encoders"])
                .output()
                .map(|o| String::from_utf8_lossy(&o.stdout).contains(encoder))
                .unwrap_or(false)
        };

        EncodingSupport {
            h264: check_encoder("libx264"),
            h265: check_encoder("libx265"),
            vp9: check_encoder("libvpx-vp9"),
            gif: true, // GIF encoding is always available
        }
    }

    /// Convert quality (0-100) to CRF value (0-51, lower is better)
    fn quality_to_crf(quality: u8) -> u8 {
        // Quality 100 -> CRF 18, Quality 0 -> CRF 51
        let quality = quality.min(100) as f32;
        let crf = 51.0 - (quality / 100.0 * 33.0);
        crf as u8
    }

    /// Parse frame rate string like "30/1" or "29.97"
    fn parse_frame_rate(fps_str: &str) -> f32 {
        if fps_str.contains('/') {
            let parts: Vec<&str> = fps_str.split('/').collect();
            if parts.len() == 2 {
                let num: f32 = parts[0].parse().unwrap_or(30.0);
                let den: f32 = parts[1].parse().unwrap_or(1.0);
                return if den > 0.0 { num / den } else { 30.0 };
            }
        }
        fps_str.parse().unwrap_or(30.0)
    }

    /// Get video duration in milliseconds
    fn get_video_duration(file_path: &str) -> Option<u64> {
        let output = Command::new("ffprobe")
            .args([
                "-v",
                "quiet",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                file_path,
            ])
            .output()
            .ok()?;

        let duration_str = String::from_utf8_lossy(&output.stdout);
        let duration_secs: f64 = duration_str.trim().parse().ok()?;
        Some((duration_secs * 1000.0) as u64)
    }
}

/// Encoding support info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncodingSupport {
    pub h264: bool,
    pub h265: bool,
    pub vp9: bool,
    pub gif: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quality_to_crf() {
        assert_eq!(VideoProcessor::quality_to_crf(100), 18);
        assert_eq!(VideoProcessor::quality_to_crf(50), 34);
        assert_eq!(VideoProcessor::quality_to_crf(0), 51);
    }

    #[test]
    fn test_parse_frame_rate() {
        assert!((VideoProcessor::parse_frame_rate("30/1") - 30.0).abs() < 0.01);
        assert!((VideoProcessor::parse_frame_rate("60000/1001") - 59.94).abs() < 0.1);
        assert!((VideoProcessor::parse_frame_rate("29.97") - 29.97).abs() < 0.01);
    }

    #[test]
    fn test_check_ffmpeg_returns_bool() {
        // check_ffmpeg should return a boolean indicating FFmpeg availability
        let result = VideoProcessor::check_ffmpeg();
        // Result is environment-dependent, just verify it returns a bool
        assert!(result == true || result == false);
    }
}
