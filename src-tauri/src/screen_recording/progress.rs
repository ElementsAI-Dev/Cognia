//! Video Processing Progress Module
//!
//! Provides progress tracking for video processing operations via Tauri events.

use log::{debug, info};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::Child;
use std::sync::mpsc;
use std::thread;
use tauri::{AppHandle, Emitter};

/// Video processing progress event payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProcessingProgress {
    /// Operation type (trim, convert, thumbnail)
    pub operation: String,
    /// Progress percentage (0.0 - 1.0)
    pub progress: f32,
    /// Current processing time in seconds
    pub current_time: f64,
    /// Total duration in seconds (if known)
    pub total_duration: Option<f64>,
    /// Estimated time remaining in seconds
    pub eta_seconds: Option<f64>,
    /// Processing speed (e.g., "2.5x")
    pub speed: Option<String>,
    /// Current bitrate
    pub bitrate: Option<String>,
    /// Is processing complete
    pub complete: bool,
    /// Error message if failed
    pub error: Option<String>,
}

impl Default for VideoProcessingProgress {
    fn default() -> Self {
        Self {
            operation: String::new(),
            progress: 0.0,
            current_time: 0.0,
            total_duration: None,
            eta_seconds: None,
            speed: None,
            bitrate: None,
            complete: false,
            error: None,
        }
    }
}

/// Parse FFmpeg progress output
#[allow(dead_code)]
pub fn parse_ffmpeg_progress(line: &str, total_duration: Option<f64>) -> Option<VideoProcessingProgress> {
    // FFmpeg progress output format:
    // frame=  123 fps=30 q=28.0 size=    1234kB time=00:00:05.12 bitrate=1234.5kbits/s speed=2.5x
    
    let time_regex = Regex::new(r"time=(\d+):(\d+):(\d+\.?\d*)").ok()?;
    let speed_regex = Regex::new(r"speed=\s*(\d+\.?\d*x)").ok()?;
    let bitrate_regex = Regex::new(r"bitrate=\s*(\d+\.?\d*\w+/s)").ok()?;

    // Parse current time
    let current_time = if let Some(caps) = time_regex.captures(line) {
        let hours: f64 = caps.get(1)?.as_str().parse().ok()?;
        let minutes: f64 = caps.get(2)?.as_str().parse().ok()?;
        let seconds: f64 = caps.get(3)?.as_str().parse().ok()?;
        hours * 3600.0 + minutes * 60.0 + seconds
    } else {
        return None;
    };

    // Parse speed
    let speed = speed_regex
        .captures(line)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string());

    // Parse bitrate
    let bitrate = bitrate_regex
        .captures(line)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string());

    // Calculate progress
    let progress = if let Some(total) = total_duration {
        if total > 0.0 {
            (current_time / total).min(1.0) as f32
        } else {
            0.0
        }
    } else {
        0.0
    };

    // Calculate ETA
    let eta_seconds = if let (Some(total), Some(spd)) = (total_duration, &speed) {
        // Parse speed like "2.5x"
        if let Ok(speed_val) = spd.trim_end_matches('x').parse::<f64>() {
            if speed_val > 0.0 {
                let remaining = total - current_time;
                Some(remaining / speed_val)
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };

    Some(VideoProcessingProgress {
        operation: String::new(), // Set by caller
        progress,
        current_time,
        total_duration,
        eta_seconds,
        speed,
        bitrate,
        complete: false,
        error: None,
    })
}

/// Monitor FFmpeg process and emit progress events
#[allow(dead_code)]
pub fn monitor_ffmpeg_progress(
    app_handle: &AppHandle,
    child: &mut Child,
    operation: &str,
    total_duration: Option<f64>,
) -> Result<(), String> {
    let stderr = child.stderr.take().ok_or("Failed to capture FFmpeg stderr")?;
    let reader = BufReader::new(stderr);
    let operation = operation.to_string();
    let app = app_handle.clone();

    // Read FFmpeg output in a separate thread
    let (tx, rx) = mpsc::channel();
    
    thread::spawn(move || {
        for line in reader.lines().map_while(Result::ok) {
            if let Some(mut progress) = parse_ffmpeg_progress(&line, total_duration) {
                progress.operation = operation.clone();
                let _ = tx.send(progress);
            }
        }
        // Send completion
        let _ = tx.send(VideoProcessingProgress {
            operation,
            progress: 1.0,
            current_time: total_duration.unwrap_or(0.0),
            total_duration,
            eta_seconds: Some(0.0),
            speed: None,
            bitrate: None,
            complete: true,
            error: None,
        });
    });

    // Emit progress events
    thread::spawn(move || {
        let mut last_progress = 0.0f32;
        while let Ok(progress) = rx.recv() {
            // Only emit if progress changed significantly or complete
            if progress.complete || (progress.progress - last_progress).abs() > 0.01 {
                last_progress = progress.progress;
                let _ = app.emit("video-processing-progress", &progress);
                debug!("[VideoProcessor] Progress: {:.1}%", progress.progress * 100.0);
            }
            if progress.complete {
                info!("[VideoProcessor] Processing complete");
                break;
            }
        }
    });

    Ok(())
}

/// Emit video processing started event
#[allow(dead_code)]
pub fn emit_processing_started(app_handle: &AppHandle, operation: &str) {
    let progress = VideoProcessingProgress {
        operation: operation.to_string(),
        progress: 0.0,
        current_time: 0.0,
        total_duration: None,
        eta_seconds: None,
        speed: None,
        bitrate: None,
        complete: false,
        error: None,
    };
    let _ = app_handle.emit("video-processing-started", &progress);
}

/// Emit video processing completed event
#[allow(dead_code)]
pub fn emit_processing_completed(app_handle: &AppHandle, operation: &str, output_path: &str) {
    let _ = app_handle.emit("video-processing-completed", serde_json::json!({
        "operation": operation,
        "outputPath": output_path,
    }));
}

/// Emit video processing error event
pub fn emit_processing_error(app_handle: &AppHandle, operation: &str, error: &str) {
    let progress = VideoProcessingProgress {
        operation: operation.to_string(),
        progress: 0.0,
        current_time: 0.0,
        total_duration: None,
        eta_seconds: None,
        speed: None,
        bitrate: None,
        complete: true,
        error: Some(error.to_string()),
    };
    let _ = app_handle.emit("video-processing-error", &progress);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ffmpeg_progress() {
        let line = "frame=  123 fps=30 q=28.0 size=    1234kB time=00:00:05.12 bitrate=1234.5kbits/s speed=2.5x";
        let progress = parse_ffmpeg_progress(line, Some(10.0)).unwrap();
        
        assert!((progress.current_time - 5.12).abs() < 0.01);
        assert!((progress.progress - 0.512).abs() < 0.01);
        assert_eq!(progress.speed, Some("2.5x".to_string()));
    }

    #[test]
    fn test_parse_ffmpeg_progress_no_duration() {
        let line = "time=00:01:30.50 speed=1.0x";
        let progress = parse_ffmpeg_progress(line, None).unwrap();
        
        assert!((progress.current_time - 90.5).abs() < 0.01);
        assert_eq!(progress.progress, 0.0); // No total duration
    }

    #[test]
    fn test_parse_ffmpeg_progress_eta_and_bitrate() {
        let line = "time=00:00:05.00 speed=2.0x bitrate=1000kbits/s";
        let progress = parse_ffmpeg_progress(line, Some(10.0)).unwrap();

        assert_eq!(progress.bitrate, Some("1000kbits/s".to_string()));
        assert!(
            (progress.eta_seconds.unwrap_or_default() - 2.5).abs() < 0.1,
            "ETA should be around 2.5s"
        );
    }
}
