//! Screen recorder implementation
//!
//! Uses FFmpeg for cross-platform screen recording

use super::{
    AudioDevices, AudioDevice, MonitorInfo, RecordingConfig, RecordingMetadata, 
    RecordingRegion, RecordingStatus,
};
use parking_lot::RwLock;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

/// Recording state
pub struct RecordingState {
    pub status: RecordingStatus,
    pub recording_id: Option<String>,
    pub start_time: Option<i64>,
    pub pause_time: Option<i64>,
    pub total_paused_ms: u64,
    pub output_path: Option<String>,
    pub mode: Option<String>,
    pub monitor_index: Option<usize>,
    pub window_title: Option<String>,
    pub region: Option<RecordingRegion>,
    pub width: u32,
    pub height: u32,
}

impl Default for RecordingState {
    fn default() -> Self {
        Self {
            status: RecordingStatus::Idle,
            recording_id: None,
            start_time: None,
            pause_time: None,
            total_paused_ms: 0,
            output_path: None,
            mode: None,
            monitor_index: None,
            window_title: None,
            region: None,
            width: 0,
            height: 0,
        }
    }
}

/// Screen recorder
pub struct ScreenRecorder {
    state: Arc<RwLock<RecordingState>>,
    ffmpeg_process: Arc<RwLock<Option<Child>>>,
    app_handle: AppHandle,
}

impl ScreenRecorder {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            state: Arc::new(RwLock::new(RecordingState::default())),
            ffmpeg_process: Arc::new(RwLock::new(None)),
            app_handle,
        }
    }

    /// Get current recording status
    pub fn get_status(&self) -> RecordingStatus {
        self.state.read().status.clone()
    }

    /// Get current recording duration in milliseconds
    pub fn get_duration(&self) -> u64 {
        let state = self.state.read();
        if let Some(start) = state.start_time {
            let now = chrono::Utc::now().timestamp_millis();
            let elapsed = (now - start) as u64;
            
            // Subtract paused time
            let paused = if state.status == RecordingStatus::Paused {
                if let Some(pause_time) = state.pause_time {
                    state.total_paused_ms + (now - pause_time) as u64
                } else {
                    state.total_paused_ms
                }
            } else {
                state.total_paused_ms
            };
            
            elapsed.saturating_sub(paused)
        } else {
            0
        }
    }

    /// Start fullscreen recording
    pub async fn start_fullscreen(
        &self,
        monitor_index: Option<usize>,
        config: RecordingConfig,
    ) -> Result<String, String> {
        self.check_not_recording()?;
        
        let monitors = self.get_monitors();
        let monitor = monitor_index
            .and_then(|i| monitors.get(i))
            .or_else(|| monitors.iter().find(|m| m.is_primary))
            .ok_or("No monitor found")?;

        let recording_id = Uuid::new_v4().to_string();
        let output_path = self.generate_output_path(&config, &recording_id)?;

        // Update state
        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Countdown;
            state.recording_id = Some(recording_id.clone());
            state.output_path = Some(output_path.clone());
            state.mode = Some("fullscreen".to_string());
            state.monitor_index = Some(monitor.index);
            state.width = monitor.width;
            state.height = monitor.height;
        }

        // Emit countdown event
        self.emit_status_change();

        // Wait for countdown
        if config.countdown_seconds > 0 {
            for i in (1..=config.countdown_seconds).rev() {
                let _ = self.app_handle.emit("recording-countdown", i);
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }

        // Start FFmpeg recording
        self.start_ffmpeg_recording(&config, &output_path, monitor.width, monitor.height, None)?;

        // Update state to recording
        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Recording;
            state.start_time = Some(chrono::Utc::now().timestamp_millis());
        }

        self.emit_status_change();
        Ok(recording_id)
    }

    /// Start window recording
    pub async fn start_window(
        &self,
        window_title: Option<String>,
        config: RecordingConfig,
    ) -> Result<String, String> {
        self.check_not_recording()?;

        let recording_id = Uuid::new_v4().to_string();
        let output_path = self.generate_output_path(&config, &recording_id)?;

        // Get window dimensions (simplified - use primary monitor for now)
        let monitors = self.get_monitors();
        let monitor = monitors.iter().find(|m| m.is_primary).ok_or("No monitor found")?;

        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Countdown;
            state.recording_id = Some(recording_id.clone());
            state.output_path = Some(output_path.clone());
            state.mode = Some("window".to_string());
            state.window_title = window_title.clone();
            state.width = monitor.width;
            state.height = monitor.height;
        }

        self.emit_status_change();

        // Countdown
        if config.countdown_seconds > 0 {
            for i in (1..=config.countdown_seconds).rev() {
                let _ = self.app_handle.emit("recording-countdown", i);
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }

        // Start recording
        self.start_ffmpeg_recording(&config, &output_path, monitor.width, monitor.height, window_title.as_deref())?;

        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Recording;
            state.start_time = Some(chrono::Utc::now().timestamp_millis());
        }

        self.emit_status_change();
        Ok(recording_id)
    }

    /// Start region recording
    pub async fn start_region(
        &self,
        region: RecordingRegion,
        config: RecordingConfig,
    ) -> Result<String, String> {
        self.check_not_recording()?;

        let recording_id = Uuid::new_v4().to_string();
        let output_path = self.generate_output_path(&config, &recording_id)?;

        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Countdown;
            state.recording_id = Some(recording_id.clone());
            state.output_path = Some(output_path.clone());
            state.mode = Some("region".to_string());
            state.region = Some(region.clone());
            state.width = region.width;
            state.height = region.height;
        }

        self.emit_status_change();

        // Countdown
        if config.countdown_seconds > 0 {
            for i in (1..=config.countdown_seconds).rev() {
                let _ = self.app_handle.emit("recording-countdown", i);
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            }
        }

        // Start recording with region
        self.start_ffmpeg_recording_region(&config, &output_path, &region)?;

        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Recording;
            state.start_time = Some(chrono::Utc::now().timestamp_millis());
        }

        self.emit_status_change();
        Ok(recording_id)
    }

    /// Pause recording
    pub fn pause(&self) -> Result<(), String> {
        let mut state = self.state.write();
        if state.status != RecordingStatus::Recording {
            return Err("Not recording".to_string());
        }

        state.status = RecordingStatus::Paused;
        state.pause_time = Some(chrono::Utc::now().timestamp_millis());
        drop(state);

        self.emit_status_change();
        Ok(())
    }

    /// Resume recording
    pub fn resume(&self) -> Result<(), String> {
        let mut state = self.state.write();
        if state.status != RecordingStatus::Paused {
            return Err("Not paused".to_string());
        }

        if let Some(pause_time) = state.pause_time {
            let now = chrono::Utc::now().timestamp_millis();
            state.total_paused_ms += (now - pause_time) as u64;
        }

        state.status = RecordingStatus::Recording;
        state.pause_time = None;
        drop(state);

        self.emit_status_change();
        Ok(())
    }

    /// Stop recording and save
    pub async fn stop(&self) -> Result<RecordingMetadata, String> {
        let state = self.state.read();
        if state.status != RecordingStatus::Recording && state.status != RecordingStatus::Paused {
            return Err("Not recording".to_string());
        }
        drop(state);

        // Update status to processing
        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Processing;
        }
        self.emit_status_change();

        // Stop FFmpeg process
        self.stop_ffmpeg()?;

        // Get metadata
        let metadata = self.create_metadata()?;

        // Reset state
        {
            let mut state = self.state.write();
            *state = RecordingState::default();
        }
        self.emit_status_change();

        // Emit completion event
        let _ = self.app_handle.emit("recording-completed", &metadata);

        Ok(metadata)
    }

    /// Cancel recording without saving
    pub fn cancel(&self) -> Result<(), String> {
        let state = self.state.read();
        if state.status == RecordingStatus::Idle {
            return Err("Not recording".to_string());
        }
        let output_path = state.output_path.clone();
        drop(state);

        // Stop FFmpeg
        let _ = self.stop_ffmpeg();

        // Delete partial file
        if let Some(path) = output_path {
            let _ = std::fs::remove_file(&path);
        }

        // Reset state
        {
            let mut state = self.state.write();
            *state = RecordingState::default();
        }
        self.emit_status_change();

        let _ = self.app_handle.emit("recording-cancelled", ());
        Ok(())
    }

    /// Check if FFmpeg is available
    pub fn check_ffmpeg(&self) -> bool {
        Command::new("ffmpeg")
            .arg("-version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }

    /// Get available monitors
    pub fn get_monitors(&self) -> Vec<MonitorInfo> {
        #[cfg(target_os = "windows")]
        {
            self.get_monitors_windows()
        }
        #[cfg(not(target_os = "windows"))]
        {
            vec![MonitorInfo {
                index: 0,
                name: "Primary".to_string(),
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
                is_primary: true,
                scale_factor: 1.0,
            }]
        }
    }

    #[cfg(target_os = "windows")]
    fn get_monitors_windows(&self) -> Vec<MonitorInfo> {
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayMonitors, GetMonitorInfoW, MONITORINFOEXW, HDC, HMONITOR,
        };
        use windows::Win32::Foundation::{BOOL, LPARAM, RECT};

        let mut monitors = Vec::new();

        unsafe extern "system" fn enum_callback(
            hmonitor: HMONITOR,
            _hdc: HDC,
            _lprect: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            let monitors = &mut *(lparam.0 as *mut Vec<MonitorInfo>);
            
            let mut info: MONITORINFOEXW = std::mem::zeroed();
            info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;
            
            if GetMonitorInfoW(hmonitor, &mut info.monitorInfo).as_bool() {
                let rect = info.monitorInfo.rcMonitor;
                let name = String::from_utf16_lossy(
                    &info.szDevice[..info.szDevice.iter().position(|&c| c == 0).unwrap_or(info.szDevice.len())]
                );
                
                monitors.push(MonitorInfo {
                    index: monitors.len(),
                    name,
                    x: rect.left,
                    y: rect.top,
                    width: (rect.right - rect.left) as u32,
                    height: (rect.bottom - rect.top) as u32,
                    is_primary: (info.monitorInfo.dwFlags & 1) != 0,
                    scale_factor: 1.0,
                });
            }
            
            BOOL(1)
        }

        unsafe {
            let _ = EnumDisplayMonitors(
                HDC::default(),
                None,
                Some(enum_callback),
                LPARAM(&mut monitors as *mut _ as isize),
            );
        }

        if monitors.is_empty() {
            monitors.push(MonitorInfo {
                index: 0,
                name: "Primary".to_string(),
                x: 0,
                y: 0,
                width: 1920,
                height: 1080,
                is_primary: true,
                scale_factor: 1.0,
            });
        }

        monitors
    }

    /// Get available audio devices
    pub fn get_audio_devices(&self) -> AudioDevices {
        // Simplified - actual implementation would query system audio devices
        AudioDevices {
            system_audio_available: cfg!(target_os = "windows"),
            microphones: vec![
                AudioDevice {
                    id: "default".to_string(),
                    name: "Default Microphone".to_string(),
                    is_default: true,
                },
            ],
        }
    }

    // Private helper methods

    fn check_not_recording(&self) -> Result<(), String> {
        let state = self.state.read();
        if state.status != RecordingStatus::Idle {
            return Err("Already recording".to_string());
        }
        Ok(())
    }

    fn generate_output_path(&self, config: &RecordingConfig, recording_id: &str) -> Result<String, String> {
        let dir = config.save_directory.clone().ok_or("No save directory configured")?;
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let filename = format!("recording_{}_{}.{}", timestamp, &recording_id[..8], config.format);
        Ok(std::path::Path::new(&dir).join(filename).to_string_lossy().to_string())
    }

    fn start_ffmpeg_recording(
        &self,
        config: &RecordingConfig,
        output_path: &str,
        _width: u32,
        _height: u32,
        window_title: Option<&str>,
    ) -> Result<(), String> {
        let mut args = Vec::new();

        // Input source (platform-specific)
        #[cfg(target_os = "windows")]
        {
            args.extend(["-f", "gdigrab"]);
            if let Some(title) = window_title {
                let title_arg = format!("title={}", title);
                args.push("-i");
                args.push(Box::leak(title_arg.into_boxed_str()));
            } else {
                args.extend(["-i", "desktop"]);
            }
        }

        #[cfg(target_os = "macos")]
        {
            args.extend(["-f", "avfoundation", "-i", "1:none"]);
        }

        #[cfg(target_os = "linux")]
        {
            args.extend(["-f", "x11grab", "-i", ":0.0"]);
        }

        // Video settings
        let frame_rate_str = config.frame_rate.to_string();
        args.extend(["-framerate", &frame_rate_str]);
        
        // Codec
        match config.codec.as_str() {
            "h265" => args.extend(["-c:v", "libx265"]),
            "vp9" => args.extend(["-c:v", "libvpx-vp9"]),
            _ => args.extend(["-c:v", "libx264"]),
        }

        // Quality/bitrate
        let bitrate_str = format!("{}k", config.bitrate);
        let crf_str = ((100 - config.quality) / 2).to_string();
        if config.bitrate > 0 {
            args.extend(["-b:v", &bitrate_str]);
        } else {
            args.extend(["-crf", &crf_str]);
        }

        // Cursor
        if config.show_cursor {
            args.extend(["-draw_mouse", "1"]);
        } else {
            args.extend(["-draw_mouse", "0"]);
        }

        // Audio
        #[cfg(target_os = "windows")]
        if config.capture_system_audio {
            args.extend(["-f", "dshow", "-i", "audio=virtual-audio-capturer"]);
        }

        // Output
        args.extend(["-y", output_path]);

        let child = Command::new("ffmpeg")
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;

        *self.ffmpeg_process.write() = Some(child);
        Ok(())
    }

    fn start_ffmpeg_recording_region(
        &self,
        config: &RecordingConfig,
        output_path: &str,
        region: &RecordingRegion,
    ) -> Result<(), String> {
        let mut args = Vec::new();

        let offset_x_str = region.x.to_string();
        let offset_y_str = region.y.to_string();
        let video_size_str = format!("{}x{}", region.width, region.height);
        let frame_rate_str = config.frame_rate.to_string();
        let crf_str = ((100 - config.quality) / 2).to_string();

        #[cfg(target_os = "windows")]
        {
            args.extend([
                "-f", "gdigrab",
                "-offset_x", &offset_x_str,
                "-offset_y", &offset_y_str,
                "-video_size", &video_size_str,
                "-i", "desktop",
            ]);
        }

        #[cfg(not(target_os = "windows"))]
        {
            let input_str = format!(":0.0+{},{}", region.x, region.y);
            args.extend([
                "-f", "x11grab",
                "-video_size", &video_size_str,
                "-i", &input_str,
            ]);
        }

        args.extend(["-framerate", &frame_rate_str]);
        args.extend(["-c:v", "libx264"]);
        args.extend(["-crf", &crf_str]);
        args.extend(["-y", output_path]);

        let child = Command::new("ffmpeg")
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;

        *self.ffmpeg_process.write() = Some(child);
        Ok(())
    }

    fn stop_ffmpeg(&self) -> Result<(), String> {
        let mut process = self.ffmpeg_process.write();
        if let Some(ref mut child) = *process {
            // Send 'q' to gracefully stop FFmpeg
            if let Some(ref mut stdin) = child.stdin {
                use std::io::Write;
                let _ = stdin.write_all(b"q");
            }
            
            // Wait for process to finish
            let _ = child.wait();
        }
        *process = None;
        Ok(())
    }

    fn create_metadata(&self) -> Result<RecordingMetadata, String> {
        let state = self.state.read();
        
        let recording_id = state.recording_id.clone().ok_or("No recording ID")?;
        let start_time = state.start_time.ok_or("No start time")?;
        let end_time = chrono::Utc::now().timestamp_millis();
        let duration_ms = (end_time - start_time) as u64 - state.total_paused_ms;
        
        let file_path = state.output_path.clone();
        let file_size = file_path
            .as_ref()
            .and_then(|p| std::fs::metadata(p).ok())
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(RecordingMetadata {
            id: recording_id,
            start_time,
            end_time: Some(end_time),
            duration_ms,
            width: state.width,
            height: state.height,
            mode: state.mode.clone().unwrap_or_default(),
            monitor_index: state.monitor_index,
            window_title: state.window_title.clone(),
            region: state.region.clone(),
            file_path,
            file_size,
            has_audio: false, // TODO: Detect from config
            thumbnail: None, // TODO: Generate thumbnail
        })
    }

    fn emit_status_change(&self) {
        let state = self.state.read();
        let _ = self.app_handle.emit("recording-status-changed", serde_json::json!({
            "status": state.status,
            "recording_id": state.recording_id,
            "duration_ms": self.get_duration(),
        }));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_recording_state_default() {
        let state = RecordingState::default();
        assert_eq!(state.status, RecordingStatus::Idle);
        assert!(state.recording_id.is_none());
    }
}
