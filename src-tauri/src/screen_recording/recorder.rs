//! Screen recorder implementation
//!
//! Uses FFmpeg for cross-platform screen recording

use super::{
    click_highlight::RecordingClickOverlay, ffmpeg, AudioDevice, AudioDevices, MonitorInfo,
    RecordingConfig, RecordingError, RecordingMetadata, RecordingRegion, RecordingStatus,
    RecordingToolbar,
};
use crate::selection::{MouseEvent, MouseHook};
use log::{debug, error, info, trace, warn};
use parking_lot::RwLock;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
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
    pub has_audio: bool,
    pub show_indicator: bool,
    pub max_duration: u64,
    pub pause_on_minimize: bool,
    pub highlight_clicks: bool,
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
            has_audio: false,
            show_indicator: true,
            max_duration: 0,
            pause_on_minimize: false,
            highlight_clicks: false,
        }
    }
}

struct RecordingSession {
    pub countdown_cancel: CancellationToken,
    pub lifecycle_cancel: CancellationToken,
    pub click_hook: Option<Arc<MouseHook>>,
}

impl RecordingSession {
    fn new(_recording_id: String) -> Self {
        Self {
            countdown_cancel: CancellationToken::new(),
            lifecycle_cancel: CancellationToken::new(),
            click_hook: None,
        }
    }

    fn cancel_all(&self) {
        self.countdown_cancel.cancel();
        self.lifecycle_cancel.cancel();
        if let Some(ref hook) = self.click_hook {
            let _ = hook.stop();
        }
    }
}

struct RecordingAudioPlan {
    input_args: Vec<String>,
    filter_args: Vec<String>,
    map_args: Vec<String>,
    has_audio: bool,
}

enum RecordingVideoInput {
    Fullscreen {
        window_title: Option<String>,
        width: u32,
        height: u32,
    },
    Region(RecordingRegion),
}

/// Timeout constants for recording operations
const FFMPEG_STOP_TIMEOUT_SECS: u64 = 30;

/// Screen recorder
pub struct ScreenRecorder {
    state: Arc<RwLock<RecordingState>>,
    ffmpeg_process: Arc<RwLock<Option<Child>>>,
    app_handle: AppHandle,
    session: Arc<RwLock<Option<RecordingSession>>>,
    /// Flag to indicate if recorder is being dropped
    is_dropping: Arc<AtomicBool>,
}

impl ScreenRecorder {
    pub fn new(app_handle: AppHandle) -> Self {
        debug!("[ScreenRecorder] Creating new ScreenRecorder instance");
        Self {
            state: Arc::new(RwLock::new(RecordingState::default())),
            ffmpeg_process: Arc::new(RwLock::new(None)),
            app_handle,
            session: Arc::new(RwLock::new(None)),
            is_dropping: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Force kill FFmpeg process - used during cleanup
    fn force_kill_ffmpeg(&self) {
        let mut process = self.ffmpeg_process.write();
        if let Some(ref mut child) = *process {
            let pid = child.id();
            warn!(
                "[ScreenRecorder] Force killing FFmpeg process (PID: {:?})",
                pid
            );

            if let Err(e) = child.kill() {
                error!("[ScreenRecorder] Failed to kill FFmpeg process: {}", e);
            }

            // Wait briefly for process to terminate
            match child.try_wait() {
                Ok(Some(status)) => {
                    info!(
                        "[ScreenRecorder] FFmpeg process terminated with status: {:?}",
                        status
                    );
                }
                Ok(None) => {
                    warn!("[ScreenRecorder] FFmpeg process still running after kill signal");
                }
                Err(e) => {
                    error!(
                        "[ScreenRecorder] Error checking FFmpeg process status: {}",
                        e
                    );
                }
            }
        }
        *process = None;
    }

    fn init_session(&self, recording_id: &str) {
        self.clear_session();
        *self.session.write() = Some(RecordingSession::new(recording_id.to_string()));
    }

    fn clear_session(&self) {
        if let Some(session) = self.session.write().take() {
            session.cancel_all();
        }
        if let Some(overlay) = self.app_handle.try_state::<RecordingClickOverlay>() {
            let _ = overlay.hide();
        }
    }

    fn emit_recording_error(&self, error_value: &str) {
        let parsed = serde_json::from_str::<serde_json::Value>(error_value).ok();
        let payload = if let Some(json) = parsed {
            let code = json
                .get("code")
                .and_then(|v| v.as_str())
                .unwrap_or("UNKNOWN")
                .to_string();
            let message = json
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or(error_value)
                .to_string();
            let details = json
                .get("details")
                .and_then(|v| v.as_str())
                .map(|v| v.to_string());
            let suggestion = json
                .get("suggestion")
                .and_then(|v| v.as_str())
                .map(|v| v.to_string());

            serde_json::json!({
                "error": message,
                "code": code,
                "details": details,
                "suggestion": suggestion,
            })
        } else {
            serde_json::json!({
                "error": error_value,
                "code": "UNKNOWN",
            })
        };

        let _ = self.app_handle.emit("recording-error", payload);
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

    /// Common countdown, state transition, and recording start logic
    async fn run_countdown_and_start<F>(
        &self,
        config: &RecordingConfig,
        recording_id: &str,
        _output_path: &str,
        start_ffmpeg: F,
    ) -> Result<(), String>
    where
        F: FnOnce() -> Result<bool, String>,
    {
        let countdown_cancel = self
            .session
            .read()
            .as_ref()
            .map(|s| s.countdown_cancel.clone())
            .unwrap_or_default();

        // Emit countdown event
        self.emit_status_change();

        // Wait for countdown
        if config.countdown_seconds > 0 {
            info!(
                "[ScreenRecorder] Starting countdown: {} seconds",
                config.countdown_seconds
            );
            for i in (1..=config.countdown_seconds).rev() {
                if countdown_cancel.is_cancelled() {
                    info!("[ScreenRecorder] Countdown cancelled before start");
                    return Err(String::from(RecordingError::not_recording()));
                }
                debug!("[ScreenRecorder] Countdown: {}", i);
                let _ = self.app_handle.emit("recording-countdown", i);
                tokio::select! {
                    _ = countdown_cancel.cancelled() => {
                        info!("[ScreenRecorder] Countdown cancelled during wait");
                        return Err(String::from(RecordingError::not_recording()));
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(1)) => {}
                }
            }
        }

        {
            let state = self.state.read();
            if state.status != RecordingStatus::Countdown
                || state.recording_id.as_deref() != Some(recording_id)
            {
                return Err(String::from(RecordingError::not_recording()));
            }
        }

        // Start FFmpeg
        info!("[ScreenRecorder] Starting FFmpeg recording process");
        let has_audio = match start_ffmpeg() {
            Ok(value) => value,
            Err(error_msg) => {
                error!("[ScreenRecorder] Failed to start FFmpeg: {}", error_msg);
                self.clear_session();
                {
                    let mut state = self.state.write();
                    *state = RecordingState::default();
                }
                self.emit_status_change();
                self.emit_recording_error(&error_msg);
                return Err(error_msg);
            }
        };

        // Update state to recording
        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Recording;
            state.start_time = Some(chrono::Utc::now().timestamp_millis());
            state.has_audio = has_audio;
            info!(
                "[ScreenRecorder] Recording started at timestamp: {:?}, id={}",
                state.start_time, recording_id
            );
        }

        self.start_recording_watchdogs(recording_id.to_string(), config.clone());
        self.emit_status_change();
        Ok(())
    }

    /// Start fullscreen recording
    pub async fn start_fullscreen(
        &self,
        monitor_index: Option<usize>,
        config: RecordingConfig,
    ) -> Result<String, String> {
        info!(
            "[ScreenRecorder] start_fullscreen called, monitor_index={:?}",
            monitor_index
        );
        if let Err(err) = self.check_not_recording() {
            self.emit_recording_error(&err);
            return Err(err);
        }

        let monitors = self.get_monitors();
        debug!("[ScreenRecorder] Found {} monitors", monitors.len());

        let monitor = monitor_index
            .and_then(|i| monitors.get(i))
            .or_else(|| monitors.iter().find(|m| m.is_primary))
            .ok_or_else(|| {
                let err =
                    RecordingError::monitor_not_found(monitor_index.unwrap_or(0), monitors.len());
                String::from(err)
            })?;

        info!(
            "[ScreenRecorder] Selected monitor: index={}, name={}, {}x{}, primary={}",
            monitor.index, monitor.name, monitor.width, monitor.height, monitor.is_primary
        );

        let recording_id = Uuid::new_v4().to_string();
        let output_path = self.generate_output_path(&config, &recording_id)?;
        info!(
            "[ScreenRecorder] Recording ID: {}, output path: {}",
            recording_id, output_path
        );

        // Update state
        self.init_session(&recording_id);
        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Countdown;
            state.recording_id = Some(recording_id.clone());
            state.output_path = Some(output_path.clone());
            state.mode = Some("fullscreen".to_string());
            state.monitor_index = Some(monitor.index);
            state.width = monitor.width;
            state.height = monitor.height;
            state.show_indicator = config.show_indicator;
            state.max_duration = config.max_duration;
            state.pause_on_minimize = config.pause_on_minimize;
            state.highlight_clicks = config.highlight_clicks;
            debug!("[ScreenRecorder] State updated to Countdown");
        }

        let w = monitor.width;
        let h = monitor.height;
        self.run_countdown_and_start(&config, &recording_id, &output_path, || {
            self.start_ffmpeg_recording(&config, &output_path, w, h, None)
        })
        .await?;

        Ok(recording_id)
    }

    /// Start window recording
    pub async fn start_window(
        &self,
        window_title: Option<String>,
        config: RecordingConfig,
    ) -> Result<String, String> {
        info!(
            "[ScreenRecorder] start_window called, window_title={:?}",
            window_title
        );
        if let Err(err) = self.check_not_recording() {
            self.emit_recording_error(&err);
            return Err(err);
        }

        let recording_id = Uuid::new_v4().to_string();
        let output_path = self.generate_output_path(&config, &recording_id)?;
        info!(
            "[ScreenRecorder] Recording ID: {}, output path: {}",
            recording_id, output_path
        );

        // Get actual window dimensions if window title is specified
        let (rec_width, rec_height) = if let Some(ref title) = window_title {
            Self::get_window_dimensions_by_title(title).unwrap_or_else(|| {
                debug!("[ScreenRecorder] Could not get window dimensions for '{}', falling back to primary monitor", title);
                let monitors = self.get_monitors();
                monitors
                    .iter()
                    .find(|m| m.is_primary)
                    .map(|m| (m.width, m.height))
                    .unwrap_or((1920, 1080))
            })
        } else {
            // No specific window - use primary monitor (captures desktop)
            let monitors = self.get_monitors();
            monitors
                .iter()
                .find(|m| m.is_primary)
                .map(|m| (m.width, m.height))
                .unwrap_or((1920, 1080))
        };
        debug!(
            "[ScreenRecorder] Recording dimensions: {}x{}",
            rec_width, rec_height
        );

        {
            self.init_session(&recording_id);
            let mut state = self.state.write();
            state.status = RecordingStatus::Countdown;
            state.recording_id = Some(recording_id.clone());
            state.output_path = Some(output_path.clone());
            state.mode = Some("window".to_string());
            state.window_title = window_title.clone();
            state.width = rec_width;
            state.height = rec_height;
            state.show_indicator = config.show_indicator;
            state.max_duration = config.max_duration;
            state.pause_on_minimize = config.pause_on_minimize;
            state.highlight_clicks = config.highlight_clicks;
            debug!("[ScreenRecorder] State updated to Countdown for window recording");
        }

        self.run_countdown_and_start(&config, &recording_id, &output_path, || {
            self.start_ffmpeg_recording(
                &config,
                &output_path,
                rec_width,
                rec_height,
                window_title.as_deref(),
            )
        })
        .await?;

        Ok(recording_id)
    }

    /// Start region recording
    pub async fn start_region(
        &self,
        region: RecordingRegion,
        config: RecordingConfig,
    ) -> Result<String, String> {
        info!(
            "[ScreenRecorder] start_region called: x={}, y={}, {}x{}",
            region.x, region.y, region.width, region.height
        );
        if let Err(err) = self.check_not_recording() {
            self.emit_recording_error(&err);
            return Err(err);
        }

        let recording_id = Uuid::new_v4().to_string();
        let output_path = self.generate_output_path(&config, &recording_id)?;
        info!(
            "[ScreenRecorder] Recording ID: {}, output path: {}",
            recording_id, output_path
        );

        {
            self.init_session(&recording_id);
            let mut state = self.state.write();
            state.status = RecordingStatus::Countdown;
            state.recording_id = Some(recording_id.clone());
            state.output_path = Some(output_path.clone());
            state.mode = Some("region".to_string());
            state.region = Some(region.clone());
            state.width = region.width;
            state.height = region.height;
            state.show_indicator = config.show_indicator;
            state.max_duration = config.max_duration;
            state.pause_on_minimize = config.pause_on_minimize;
            state.highlight_clicks = config.highlight_clicks;
            debug!("[ScreenRecorder] State updated to Countdown for region recording");
        }

        self.run_countdown_and_start(&config, &recording_id, &output_path, || {
            self.start_ffmpeg_recording_region(&config, &output_path, &region)
        })
        .await?;

        Ok(recording_id)
    }

    /// Pause recording - suspends the FFmpeg process (cross-platform)
    pub fn pause(&self) -> Result<(), String> {
        info!("[ScreenRecorder] pause called");
        let mut state = self.state.write();
        if state.status != RecordingStatus::Recording {
            warn!(
                "[ScreenRecorder] Cannot pause - not in Recording state, current: {:?}",
                state.status
            );
            let err = String::from(RecordingError::not_recording());
            self.emit_recording_error(&err);
            return Err(err);
        }

        // Suspend the FFmpeg process to actually pause recording
        let process = self.ffmpeg_process.read();
        if let Some(ref child) = *process {
            let pid = child.id();
            if let Err(e) = suspend_process(pid) {
                warn!("[ScreenRecorder] Failed to suspend FFmpeg process: {}", e);
                // Continue anyway - state tracking still works for duration calculation
            }
        }
        drop(process);

        state.status = RecordingStatus::Paused;
        state.pause_time = Some(chrono::Utc::now().timestamp_millis());
        info!(
            "[ScreenRecorder] Recording paused at timestamp: {:?}",
            state.pause_time
        );
        drop(state);

        self.emit_status_change();
        Ok(())
    }

    /// Resume recording - resumes the FFmpeg process (cross-platform)
    pub fn resume(&self) -> Result<(), String> {
        info!("[ScreenRecorder] resume called");
        let mut state = self.state.write();
        if state.status != RecordingStatus::Paused {
            warn!(
                "[ScreenRecorder] Cannot resume - not in Paused state, current: {:?}",
                state.status
            );
            let err = String::from(RecordingError::not_paused());
            self.emit_recording_error(&err);
            return Err(err);
        }

        // Resume the FFmpeg process
        let process = self.ffmpeg_process.read();
        if let Some(ref child) = *process {
            let pid = child.id();
            if let Err(e) = resume_process(pid) {
                warn!("[ScreenRecorder] Failed to resume FFmpeg process: {}", e);
            }
        }
        drop(process);

        if let Some(pause_time) = state.pause_time {
            let now = chrono::Utc::now().timestamp_millis();
            let paused_duration = (now - pause_time) as u64;
            state.total_paused_ms += paused_duration;
            info!(
                "[ScreenRecorder] Recording resumed, paused for {}ms, total paused: {}ms",
                paused_duration, state.total_paused_ms
            );
        }

        state.status = RecordingStatus::Recording;
        state.pause_time = None;
        drop(state);

        self.emit_status_change();
        Ok(())
    }

    /// Stop recording and save
    pub async fn stop(&self) -> Result<RecordingMetadata, String> {
        info!("[ScreenRecorder] stop called");
        let state = self.state.read();
        if state.status != RecordingStatus::Recording && state.status != RecordingStatus::Paused {
            warn!(
                "[ScreenRecorder] Cannot stop - not in Recording or Paused state, current: {:?}",
                state.status
            );
            let err = String::from(RecordingError::not_recording());
            self.emit_recording_error(&err);
            return Err(err);
        }
        let recording_id = state.recording_id.clone();
        drop(state);

        // Update status to processing
        {
            let mut state = self.state.write();
            state.status = RecordingStatus::Processing;
            info!(
                "[ScreenRecorder] Status changed to Processing for recording: {:?}",
                recording_id
            );
        }
        self.emit_status_change();

        // Stop FFmpeg process
        info!("[ScreenRecorder] Stopping FFmpeg process");
        if let Err(err) = self.stop_ffmpeg() {
            self.emit_recording_error(&err);
            return Err(err);
        }

        // Get metadata
        info!("[ScreenRecorder] Creating recording metadata");
        let metadata = match self.create_metadata() {
            Ok(metadata) => metadata,
            Err(err) => {
                self.emit_recording_error(&err);
                return Err(err);
            }
        };
        info!(
            "[ScreenRecorder] Recording metadata created: id={}, duration={}ms, size={} bytes",
            metadata.id, metadata.duration_ms, metadata.file_size
        );

        // Reset state
        {
            let mut state = self.state.write();
            *state = RecordingState::default();
            debug!("[ScreenRecorder] State reset to default");
        }
        self.clear_session();
        self.emit_status_change();

        // Emit completion event
        info!("[ScreenRecorder] Emitting recording-completed event");
        let _ = self.app_handle.emit("recording-completed", &metadata);

        Ok(metadata)
    }

    /// Cancel recording without saving
    pub fn cancel(&self) -> Result<(), String> {
        info!("[ScreenRecorder] cancel called");
        let state = self.state.read();
        if state.status == RecordingStatus::Idle {
            warn!("[ScreenRecorder] Cannot cancel - already in Idle state");
            let err = String::from(RecordingError::not_recording());
            self.emit_recording_error(&err);
            return Err(err);
        }
        if state.status == RecordingStatus::Countdown {
            if let Some(session) = self.session.read().as_ref() {
                session.countdown_cancel.cancel();
            }
        }
        let output_path = state.output_path.clone();
        let recording_id = state.recording_id.clone();
        drop(state);

        info!("[ScreenRecorder] Cancelling recording: {:?}", recording_id);

        // Stop FFmpeg
        info!("[ScreenRecorder] Stopping FFmpeg process for cancellation");
        if let Err(e) = self.stop_ffmpeg() {
            warn!(
                "[ScreenRecorder] Error stopping FFmpeg during cancel: {}",
                e
            );
        }

        // Delete partial file
        if let Some(ref path) = output_path {
            info!("[ScreenRecorder] Deleting partial recording file: {}", path);
            match std::fs::remove_file(path) {
                Ok(_) => debug!("[ScreenRecorder] Partial file deleted successfully"),
                Err(e) => warn!("[ScreenRecorder] Failed to delete partial file: {}", e),
            }
        }

        // Reset state
        {
            let mut state = self.state.write();
            *state = RecordingState::default();
            debug!("[ScreenRecorder] State reset to default after cancel");
        }
        self.clear_session();
        self.emit_status_change();

        info!("[ScreenRecorder] Emitting recording-cancelled event");
        let _ = self.app_handle.emit("recording-cancelled", ());
        Ok(())
    }

    /// Check if FFmpeg is available
    pub fn check_ffmpeg(&self) -> bool {
        debug!("[ScreenRecorder] Checking FFmpeg availability");
        let result = Command::new("ffmpeg")
            .arg("-version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();

        match result {
            Ok(status) => {
                let available = status.success();
                if available {
                    debug!("[ScreenRecorder] FFmpeg check passed");
                } else {
                    warn!(
                        "[ScreenRecorder] FFmpeg check failed with status: {:?}",
                        status.code()
                    );
                }
                available
            }
            Err(e) => {
                error!(
                    "[ScreenRecorder] FFmpeg check failed - command error: {}",
                    e
                );
                false
            }
        }
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
        use windows::Win32::Foundation::{BOOL, LPARAM, RECT};
        use windows::Win32::Graphics::Gdi::{
            EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
        };

        debug!("[ScreenRecorder] Enumerating Windows monitors");
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
                    &info.szDevice[..info
                        .szDevice
                        .iter()
                        .position(|&c| c == 0)
                        .unwrap_or(info.szDevice.len())],
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
            warn!("[ScreenRecorder] No monitors detected, using fallback");
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

        debug!("[ScreenRecorder] Found {} monitors", monitors.len());
        for (i, m) in monitors.iter().enumerate() {
            debug!(
                "[ScreenRecorder]   Monitor {}: {} - {}x{} at ({}, {}), primary={}",
                i, m.name, m.width, m.height, m.x, m.y, m.is_primary
            );
        }

        monitors
    }

    /// Get available audio devices by querying FFmpeg
    pub fn get_audio_devices(&self) -> AudioDevices {
        debug!("[ScreenRecorder] Getting audio devices");

        let mut microphones = Vec::new();
        let system_audio_available;

        #[cfg(target_os = "windows")]
        {
            system_audio_available = true;
            // Use FFmpeg to enumerate DirectShow audio devices
            let ffmpeg = "ffmpeg".to_string();
            match Command::new(&ffmpeg)
                .args(["-list_devices", "true", "-f", "dshow", "-i", "dummy"])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                .output()
            {
                Ok(output) => {
                    // FFmpeg outputs device list to stderr
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    let mut in_audio_section = false;
                    let mut device_index = 0u32;

                    for line in stderr.lines() {
                        if line.contains("DirectShow audio devices") {
                            in_audio_section = true;
                            continue;
                        }
                        if in_audio_section && line.contains("DirectShow video devices") {
                            break;
                        }
                        if in_audio_section {
                            // Lines like: [dshow @ ...] "Device Name" (audio)
                            if let Some(start) = line.find('"') {
                                if let Some(end) = line[start + 1..].find('"') {
                                    let name = line[start + 1..start + 1 + end].to_string();
                                    // Skip alternative name lines
                                    if !line.contains("Alternative name") {
                                        microphones.push(AudioDevice {
                                            id: format!("dshow_{}", device_index),
                                            name,
                                            is_default: device_index == 0,
                                        });
                                        device_index += 1;
                                    }
                                }
                            }
                        }
                    }
                    debug!(
                        "[ScreenRecorder] FFmpeg enumerated {} audio devices",
                        microphones.len()
                    );
                }
                Err(e) => {
                    warn!(
                        "[ScreenRecorder] Failed to enumerate audio devices via FFmpeg: {}",
                        e
                    );
                }
            }

            // Fallback: if FFmpeg enumeration returned nothing, add a default device
            if microphones.is_empty() {
                microphones.push(AudioDevice {
                    id: "default".to_string(),
                    name: "Default Microphone".to_string(),
                    is_default: true,
                });
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            system_audio_available = false;
            microphones.push(AudioDevice {
                id: "default".to_string(),
                name: "Default Microphone".to_string(),
                is_default: true,
            });
        }

        let devices = AudioDevices {
            system_audio_available,
            microphones,
        };
        debug!(
            "[ScreenRecorder] Audio devices: system_audio={}, microphones={}",
            devices.system_audio_available,
            devices.microphones.len()
        );
        devices
    }

    // Private helper methods

    fn start_recording_watchdogs(&self, recording_id: String, config: RecordingConfig) {
        debug!(
            "[ScreenRecorder] Starting recording watchdogs for recording_id={}",
            recording_id
        );
        let lifecycle_cancel = self
            .session
            .read()
            .as_ref()
            .map(|session| session.lifecycle_cancel.clone())
            .unwrap_or_default();

        if config.highlight_clicks {
            self.start_click_highlight_service(lifecycle_cancel.clone());
        }

        if config.max_duration > 0 {
            let app_handle = self.app_handle.clone();
            let max_duration_ms = config.max_duration.saturating_mul(1000);
            let recording_id_for_log = recording_id.clone();
            let lifecycle_cancel_for_duration = lifecycle_cancel.clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    tokio::select! {
                        _ = lifecycle_cancel_for_duration.cancelled() => {
                            break;
                        }
                        _ = tokio::time::sleep(Duration::from_millis(250)) => {}
                    }

                    let Some(manager) =
                        app_handle.try_state::<crate::screen_recording::ScreenRecordingManager>()
                    else {
                        break;
                    };
                    let status = manager.get_status();
                    if status != RecordingStatus::Recording && status != RecordingStatus::Paused {
                        break;
                    }

                    let duration = manager.get_duration();
                    if duration >= max_duration_ms {
                        info!(
                            "[ScreenRecorder] max_duration reached for recording {} ({}ms >= {}ms), auto stopping",
                            recording_id_for_log, duration, max_duration_ms
                        );
                        let app_handle_for_stop = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Some(manager) = app_handle_for_stop
                                .try_state::<crate::screen_recording::ScreenRecordingManager>()
                            {
                                if let Err(err) = manager.stop().await {
                                    error!("[ScreenRecorder] Failed to auto-stop recording: {}", err);
                                }
                            }
                        });
                        break;
                    }
                }
            });
        }

        if config.pause_on_minimize {
            let app_handle = self.app_handle.clone();
            let lifecycle_cancel_for_minimize = lifecycle_cancel.clone();
            tauri::async_runtime::spawn(async move {
                let mut paused_by_minimize = false;

                loop {
                    tokio::select! {
                        _ = lifecycle_cancel_for_minimize.cancelled() => {
                            break;
                        }
                        _ = tokio::time::sleep(Duration::from_millis(300)) => {}
                    }

                    let Some(manager) =
                        app_handle.try_state::<crate::screen_recording::ScreenRecordingManager>()
                    else {
                        break;
                    };
                    let status = manager.get_status();
                    if status == RecordingStatus::Idle || status == RecordingStatus::Processing {
                        break;
                    }

                    let minimized = app_handle
                        .get_webview_window("main")
                        .and_then(|window| window.is_minimized().ok())
                        .unwrap_or(false);

                    if minimized && status == RecordingStatus::Recording {
                        if manager.pause().is_ok() {
                            paused_by_minimize = true;
                            info!("[ScreenRecorder] Auto-paused recording because main window minimized");
                        }
                    } else if !minimized && paused_by_minimize && status == RecordingStatus::Paused {
                        if manager.resume().is_ok() {
                            paused_by_minimize = false;
                            info!("[ScreenRecorder] Auto-resumed recording after main window restore");
                        }
                    } else if status == RecordingStatus::Recording {
                        paused_by_minimize = false;
                    }
                }
            });
        }
    }

    fn start_click_highlight_service(&self, lifecycle_cancel: CancellationToken) {
        let Some(overlay) = self.app_handle.try_state::<RecordingClickOverlay>() else {
            warn!("[ScreenRecorder] RecordingClickOverlay state not found");
            return;
        };

        if let Err(err) = overlay.show() {
            warn!("[ScreenRecorder] Failed to show click highlight overlay: {}", err);
            return;
        }

        let (tx, mut rx) = mpsc::unbounded_channel::<MouseEvent>();
        let hook = Arc::new(MouseHook::new());
        hook.set_event_sender(tx);
        if let Err(err) = hook.start() {
            warn!("[ScreenRecorder] Failed to start click highlight mouse hook: {}", err);
            let _ = overlay.hide();
            return;
        }

        if let Some(session) = self.session.write().as_mut() {
            session.click_hook = Some(hook.clone());
        }

        let app_handle = self.app_handle.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                tokio::select! {
                    _ = lifecycle_cancel.cancelled() => {
                        break;
                    }
                    maybe_event = rx.recv() => {
                        let Some(event) = maybe_event else {
                            break;
                        };
                        let (x, y) = match event {
                            MouseEvent::LeftButtonUp { x, y } => (x, y),
                            MouseEvent::DoubleClick { x, y } => (x, y),
                            MouseEvent::TripleClick { x, y } => (x, y),
                            MouseEvent::DragEnd { x, y, .. } => (x, y),
                        };

                        if let Some(overlay) = app_handle.try_state::<RecordingClickOverlay>() {
                            overlay.emit_click(x, y);
                        }
                    }
                }
            }

            if let Some(overlay) = app_handle.try_state::<RecordingClickOverlay>() {
                let _ = overlay.hide();
            }
            let _ = hook.stop();
        });
    }

    /// Get window dimensions by title on Windows
    #[cfg(target_os = "windows")]
    fn get_window_dimensions_by_title(title: &str) -> Option<(u32, u32)> {
        use std::ffi::CString;

        extern "system" {
            fn FindWindowA(class: *const u8, title: *const u8) -> isize;
            fn GetClientRect(hwnd: isize, rect: *mut [i32; 4]) -> i32;
        }

        unsafe {
            let c_title = CString::new(title).ok()?;
            let hwnd = FindWindowA(std::ptr::null(), c_title.as_ptr() as *const u8);
            if hwnd == 0 {
                debug!(
                    "[ScreenRecorder] Window '{}' not found via FindWindowA",
                    title
                );
                return None;
            }

            let mut rect = [0i32; 4]; // left, top, right, bottom
            if GetClientRect(hwnd, &mut rect) != 0 {
                let width = (rect[2] - rect[0]) as u32;
                let height = (rect[3] - rect[1]) as u32;
                if width > 0 && height > 0 {
                    debug!(
                        "[ScreenRecorder] Window '{}' dimensions: {}x{}",
                        title, width, height
                    );
                    return Some((width, height));
                }
            }
            debug!(
                "[ScreenRecorder] GetClientRect failed for window '{}'",
                title
            );
            None
        }
    }

    #[cfg(not(target_os = "windows"))]
    fn get_window_dimensions_by_title(_title: &str) -> Option<(u32, u32)> {
        None
    }

    fn check_not_recording(&self) -> Result<(), String> {
        let state = self.state.read();
        if state.status != RecordingStatus::Idle {
            warn!(
                "[ScreenRecorder] check_not_recording failed - current status: {:?}",
                state.status
            );
            let err = RecordingError::already_recording(state.recording_id.as_deref());
            return Err(String::from(err));
        }
        trace!("[ScreenRecorder] check_not_recording passed - status is Idle");
        Ok(())
    }

    fn generate_output_path(
        &self,
        config: &RecordingConfig,
        recording_id: &str,
    ) -> Result<String, String> {
        let dir = config.save_directory.clone().ok_or_else(|| {
            error!("[ScreenRecorder] No save directory configured");
            "No save directory configured".to_string()
        })?;
        let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        let filename = format!(
            "recording_{}_{}.{}",
            timestamp,
            &recording_id[..8],
            config.format
        );
        let path = std::path::Path::new(&dir)
            .join(&filename)
            .to_string_lossy()
            .to_string();
        debug!("[ScreenRecorder] Generated output path: {}", path);
        Ok(path)
    }

    /// Select the best available encoder based on hardware acceleration and config
    fn select_best_encoder(config: &RecordingConfig) -> (String, Vec<String>) {
        // If user specified a preferred encoder, use it
        if let Some(ref preferred) = config.preferred_encoder {
            info!("[ScreenRecorder] Using preferred encoder: {}", preferred);
            return (preferred.clone(), Vec::new());
        }

        // If hardware acceleration is disabled, use software encoder
        if !config.use_hardware_acceleration {
            debug!("[ScreenRecorder] Hardware acceleration disabled, using software encoder");
            return Self::software_encoder_for_codec(&config.codec);
        }

        // Auto-detect hardware acceleration
        let hw = ffmpeg::check_hardware_acceleration();
        debug!(
            "[ScreenRecorder] Hardware acceleration: nvidia={}, qsv={}, amf={}",
            hw.nvidia, hw.intel_qsv, hw.amd_amf
        );

        match config.codec.as_str() {
            "h264" | _ if config.codec != "h265" && config.codec != "vp9" => {
                if hw.nvidia {
                    info!("[ScreenRecorder] Using NVENC hardware encoder");
                    (
                        "h264_nvenc".into(),
                        vec![
                            "-preset".into(),
                            "p4".into(),
                            "-tune".into(),
                            "ll".into(),
                            "-rc".into(),
                            "vbr".into(),
                        ],
                    )
                } else if hw.intel_qsv {
                    info!("[ScreenRecorder] Using Intel QSV hardware encoder");
                    ("h264_qsv".into(), vec!["-preset".into(), "veryfast".into()])
                } else if hw.amd_amf {
                    info!("[ScreenRecorder] Using AMD AMF hardware encoder");
                    ("h264_amf".into(), vec!["-quality".into(), "speed".into()])
                } else {
                    debug!("[ScreenRecorder] No hardware encoder available, using libx264");
                    ("libx264".into(), vec!["-preset".into(), "ultrafast".into()])
                }
            }
            "h265" => {
                if hw.nvidia {
                    (
                        "hevc_nvenc".into(),
                        vec!["-preset".into(), "p4".into(), "-tune".into(), "ll".into()],
                    )
                } else if hw.intel_qsv {
                    ("hevc_qsv".into(), vec!["-preset".into(), "veryfast".into()])
                } else if hw.amd_amf {
                    ("hevc_amf".into(), vec!["-quality".into(), "speed".into()])
                } else {
                    ("libx265".into(), vec!["-preset".into(), "ultrafast".into()])
                }
            }
            "vp9" => {
                // VP9 has limited hardware acceleration; use software
                (
                    "libvpx-vp9".into(),
                    vec![
                        "-deadline".into(),
                        "realtime".into(),
                        "-cpu-used".into(),
                        "8".into(),
                    ],
                )
            }
            _ => Self::software_encoder_for_codec(&config.codec),
        }
    }

    fn software_encoder_for_codec(codec: &str) -> (String, Vec<String>) {
        match codec {
            "h265" => ("libx265".into(), vec!["-preset".into(), "ultrafast".into()]),
            "vp9" => (
                "libvpx-vp9".into(),
                vec![
                    "-deadline".into(),
                    "realtime".into(),
                    "-cpu-used".into(),
                    "8".into(),
                ],
            ),
            _ => ("libx264".into(), vec!["-preset".into(), "ultrafast".into()]),
        }
    }

    fn build_audio_plan(config: &RecordingConfig) -> RecordingAudioPlan {
        let mut sources: Vec<String> = Vec::new();

        #[cfg(target_os = "windows")]
        {
            if config.capture_system_audio {
                sources.push(
                    config
                        .system_audio_device
                        .clone()
                        .unwrap_or_else(|| "virtual-audio-capturer".to_string()),
                );
            }
            if config.capture_microphone {
                sources.push(
                    config
                        .microphone_device
                        .clone()
                        .unwrap_or_else(|| "default".to_string()),
                );
            }
        }

        #[cfg(target_os = "linux")]
        {
            if config.capture_system_audio {
                sources.push(
                    config
                        .system_audio_device
                        .clone()
                        .unwrap_or_else(|| "default".to_string()),
                );
            }
            if config.capture_microphone {
                sources.push(
                    config
                        .microphone_device
                        .clone()
                        .unwrap_or_else(|| "default".to_string()),
                );
            }
        }

        #[cfg(target_os = "macos")]
        {
            if config.capture_system_audio || config.capture_microphone {
                warn!(
                    "[ScreenRecorder] Audio capture on macOS is not configured in this build; recording will be video-only"
                );
            }
        }

        let mut input_args: Vec<String> = Vec::new();
        #[cfg(target_os = "windows")]
        for source in &sources {
            input_args.extend([
                "-f".to_string(),
                "dshow".to_string(),
                "-i".to_string(),
                format!("audio={source}"),
            ]);
        }
        #[cfg(target_os = "linux")]
        for source in &sources {
            input_args.extend([
                "-f".to_string(),
                "pulse".to_string(),
                "-i".to_string(),
                source.clone(),
            ]);
        }

        let mut filter_args: Vec<String> = Vec::new();
        let mut map_args: Vec<String> = vec!["-map".to_string(), "0:v:0".to_string()];
        let has_audio = !sources.is_empty();
        if sources.is_empty() {
            map_args.push("-an".to_string());
        } else if sources.len() == 1 {
            map_args.extend(["-map".to_string(), "1:a:0".to_string()]);
        } else {
            let mut filter = String::new();
            for index in 1..=sources.len() {
                filter.push_str(&format!("[{index}:a]"));
            }
            filter.push_str(&format!(
                "amix=inputs={}:duration=longest:dropout_transition=2[aout]",
                sources.len()
            ));
            filter_args.extend(["-filter_complex".to_string(), filter]);
            map_args.extend(["-map".to_string(), "[aout]".to_string()]);
        }

        RecordingAudioPlan {
            input_args,
            filter_args,
            map_args,
            has_audio,
        }
    }

    fn build_video_input_args(config: &RecordingConfig, input: &RecordingVideoInput) -> Vec<String> {
        let mut args = Vec::new();
        match input {
            RecordingVideoInput::Fullscreen {
                window_title,
                width,
                height,
            } => {
                let _ = (width, height);
                #[cfg(target_os = "windows")]
                {
                    args.extend([
                        "-f".to_string(),
                        "gdigrab".to_string(),
                        "-framerate".to_string(),
                        config.frame_rate.to_string(),
                        "-draw_mouse".to_string(),
                        if config.show_cursor { "1" } else { "0" }.to_string(),
                    ]);
                    if let Some(title) = window_title {
                        args.extend(["-i".to_string(), format!("title={title}")]);
                    } else {
                        args.extend(["-i".to_string(), "desktop".to_string()]);
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    let _ = (width, height);
                    args.extend([
                        "-f".to_string(),
                        "avfoundation".to_string(),
                        "-framerate".to_string(),
                        config.frame_rate.to_string(),
                        "-i".to_string(),
                        "1:none".to_string(),
                    ]);
                }
                #[cfg(target_os = "linux")]
                {
                    args.extend([
                        "-f".to_string(),
                        "x11grab".to_string(),
                        "-framerate".to_string(),
                        config.frame_rate.to_string(),
                        "-draw_mouse".to_string(),
                        if config.show_cursor { "1" } else { "0" }.to_string(),
                        "-video_size".to_string(),
                        format!("{width}x{height}"),
                        "-i".to_string(),
                        ":0.0".to_string(),
                    ]);
                }
            }
            RecordingVideoInput::Region(region) => {
                #[cfg(target_os = "windows")]
                {
                    args.extend([
                        "-f".to_string(),
                        "gdigrab".to_string(),
                        "-framerate".to_string(),
                        config.frame_rate.to_string(),
                        "-draw_mouse".to_string(),
                        if config.show_cursor { "1" } else { "0" }.to_string(),
                        "-offset_x".to_string(),
                        region.x.to_string(),
                        "-offset_y".to_string(),
                        region.y.to_string(),
                        "-video_size".to_string(),
                        format!("{}x{}", region.width, region.height),
                        "-i".to_string(),
                        "desktop".to_string(),
                    ]);
                }
                #[cfg(target_os = "macos")]
                {
                    args.extend([
                        "-f".to_string(),
                        "avfoundation".to_string(),
                        "-framerate".to_string(),
                        config.frame_rate.to_string(),
                        "-i".to_string(),
                        "1:none".to_string(),
                        "-vf".to_string(),
                        format!(
                            "crop={}:{}:{}:{}",
                            region.width, region.height, region.x, region.y
                        ),
                    ]);
                }
                #[cfg(target_os = "linux")]
                {
                    args.extend([
                        "-f".to_string(),
                        "x11grab".to_string(),
                        "-framerate".to_string(),
                        config.frame_rate.to_string(),
                        "-draw_mouse".to_string(),
                        if config.show_cursor { "1" } else { "0" }.to_string(),
                        "-video_size".to_string(),
                        format!("{}x{}", region.width, region.height),
                        "-i".to_string(),
                        format!(":0.0+{},{}", region.x, region.y),
                    ]);
                }
            }
        }
        args
    }

    fn build_recording_args(
        config: &RecordingConfig,
        output_path: &str,
        video_input: &RecordingVideoInput,
    ) -> (Vec<String>, bool) {
        let mut args = Self::build_video_input_args(config, video_input);
        let audio_plan = Self::build_audio_plan(config);
        args.extend(audio_plan.input_args.clone());

        if !audio_plan.filter_args.is_empty() {
            args.extend(audio_plan.filter_args.clone());
        }

        let (encoder, encoder_extra_args) = Self::select_best_encoder(config);
        args.extend(audio_plan.map_args.clone());
        args.extend(["-c:v".to_string(), encoder.clone()]);
        args.extend(encoder_extra_args);

        if config.bitrate > 0 {
            args.extend(["-b:v".to_string(), format!("{}k", config.bitrate)]);
        } else if encoder.contains("nvenc") {
            args.extend(["-cq".to_string(), ((100 - config.quality) / 2).to_string()]);
        } else if encoder.contains("qsv") {
            args.extend([
                "-global_quality".to_string(),
                ((100 - config.quality) / 2).to_string(),
            ]);
        } else if encoder.contains("amf") {
            args.extend([
                "-rc".to_string(),
                "cqp".to_string(),
                "-qp".to_string(),
                ((100 - config.quality) / 2).to_string(),
            ]);
        } else {
            args.extend(["-crf".to_string(), ((100 - config.quality) / 2).to_string()]);
        }

        args.extend(["-pix_fmt".to_string(), "yuv420p".to_string()]);
        if config.format == "mp4" {
            args.extend(["-movflags".to_string(), "+faststart".to_string()]);
        }
        args.extend(["-y".to_string(), output_path.to_string()]);
        (args, audio_plan.has_audio)
    }

    fn spawn_ffmpeg(&self, args: Vec<String>) -> Result<(), String> {
        info!(
            "[ScreenRecorder] Spawning FFmpeg process with {} arguments",
            args.len()
        );
        debug!("[ScreenRecorder] FFmpeg command: ffmpeg {}", args.join(" "));

        let mut command = Command::new("ffmpeg");
        command
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());
        #[cfg(target_os = "windows")]
        {
            command.creation_flags(0x08000000);
        }

        let mut child = command.spawn().map_err(|e| {
            error!("[ScreenRecorder] Failed to spawn FFmpeg process: {}", e);
            String::from(RecordingError::ffmpeg_start_failed(&e.to_string()))
        })?;

        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    match line {
                        Ok(content) => {
                            if !content.trim().is_empty() {
                                debug!("[ScreenRecorder][ffmpeg] {}", content);
                            }
                        }
                        Err(err) => {
                            warn!("[ScreenRecorder] Failed to read FFmpeg stderr: {}", err);
                            break;
                        }
                    }
                }
            });
        }

        info!(
            "[ScreenRecorder] FFmpeg process spawned successfully, PID: {:?}",
            child.id()
        );
        *self.ffmpeg_process.write() = Some(child);
        Ok(())
    }

    fn start_ffmpeg_recording(
        &self,
        config: &RecordingConfig,
        output_path: &str,
        width: u32,
        height: u32,
        window_title: Option<&str>,
    ) -> Result<bool, String> {
        let input = RecordingVideoInput::Fullscreen {
            window_title: window_title.map(str::to_string),
            width,
            height,
        };
        let (args, has_audio) = Self::build_recording_args(config, output_path, &input);
        self.spawn_ffmpeg(args)?;
        Ok(has_audio)
    }

    fn start_ffmpeg_recording_region(
        &self,
        config: &RecordingConfig,
        output_path: &str,
        region: &RecordingRegion,
    ) -> Result<bool, String> {
        let input = RecordingVideoInput::Region(region.clone());
        let (args, has_audio) = Self::build_recording_args(config, output_path, &input);
        self.spawn_ffmpeg(args)?;
        Ok(has_audio)
    }

    fn stop_ffmpeg(&self) -> Result<(), String> {
        self.stop_ffmpeg_with_timeout(Duration::from_secs(FFMPEG_STOP_TIMEOUT_SECS))
    }

    fn stop_ffmpeg_with_timeout(&self, timeout: Duration) -> Result<(), String> {
        info!(
            "[ScreenRecorder] Stopping FFmpeg process with timeout: {:?}",
            timeout
        );
        let mut process = self.ffmpeg_process.write();
        if let Some(ref mut child) = *process {
            let pid = child.id();
            debug!(
                "[ScreenRecorder] Sending 'q' to FFmpeg process (PID: {:?})",
                pid
            );

            // Send 'q' to gracefully stop FFmpeg
            if let Some(ref mut stdin) = child.stdin {
                use std::io::Write;
                match stdin.write_all(b"q") {
                    Ok(_) => debug!("[ScreenRecorder] Successfully sent quit signal to FFmpeg"),
                    Err(e) => warn!(
                        "[ScreenRecorder] Failed to send quit signal to FFmpeg: {}",
                        e
                    ),
                }
                // Flush and drop stdin to signal EOF
                let _ = stdin.flush();
            } else {
                warn!("[ScreenRecorder] FFmpeg stdin not available, cannot send quit signal");
            }

            // Wait for process to finish with timeout
            debug!(
                "[ScreenRecorder] Waiting for FFmpeg process to exit (timeout: {:?})",
                timeout
            );
            let start = std::time::Instant::now();
            let poll_interval = Duration::from_millis(100);

            loop {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        info!(
                            "[ScreenRecorder] FFmpeg process exited with status: {:?}",
                            status
                        );
                        break;
                    }
                    Ok(None) => {
                        // Process still running
                        if start.elapsed() > timeout {
                            warn!("[ScreenRecorder] FFmpeg process did not exit within timeout, force killing");
                            if let Err(e) = child.kill() {
                                error!("[ScreenRecorder] Failed to kill FFmpeg process: {}", e);
                            }
                            // Wait a bit more for kill to take effect
                            std::thread::sleep(Duration::from_millis(500));
                            break;
                        }
                        std::thread::sleep(poll_interval);
                    }
                    Err(e) => {
                        warn!("[ScreenRecorder] Error waiting for FFmpeg process: {}", e);
                        break;
                    }
                }
            }
        } else {
            debug!("[ScreenRecorder] No FFmpeg process to stop");
        }
        *process = None;
        info!("[ScreenRecorder] FFmpeg process stopped");
        Ok(())
    }

    fn create_metadata(&self) -> Result<RecordingMetadata, String> {
        debug!("[ScreenRecorder] Creating recording metadata");
        let state = self.state.read();

        let recording_id = state.recording_id.clone().ok_or_else(|| {
            error!("[ScreenRecorder] Cannot create metadata - no recording ID");
            "No recording ID".to_string()
        })?;
        let start_time = state.start_time.ok_or_else(|| {
            error!("[ScreenRecorder] Cannot create metadata - no start time");
            "No start time".to_string()
        })?;
        let end_time = chrono::Utc::now().timestamp_millis();
        let duration_ms = ((end_time - start_time).max(0) as u64).saturating_sub(state.total_paused_ms);

        debug!(
            "[ScreenRecorder] Metadata: id={}, start={}, end={}, duration={}ms (paused: {}ms)",
            recording_id, start_time, end_time, duration_ms, state.total_paused_ms
        );

        let file_path = state.output_path.clone();
        let file_size = file_path
            .as_ref()
            .and_then(|p| match std::fs::metadata(p) {
                Ok(m) => {
                    debug!("[ScreenRecorder] Output file size: {} bytes", m.len());
                    Some(m)
                }
                Err(e) => {
                    warn!("[ScreenRecorder] Cannot read output file metadata: {}", e);
                    None
                }
            })
            .map(|m| m.len())
            .unwrap_or(0);

        if file_size == 0 {
            warn!(
                "[ScreenRecorder] Output file has zero size or does not exist: {:?}",
                file_path
            );
        }

        let metadata = RecordingMetadata {
            id: recording_id.clone(),
            start_time,
            end_time: Some(end_time),
            duration_ms,
            width: state.width,
            height: state.height,
            mode: state.mode.clone().unwrap_or_default(),
            monitor_index: state.monitor_index,
            window_title: state.window_title.clone(),
            region: state.region.clone(),
            file_path: file_path.clone(),
            file_size,
            has_audio: state.has_audio,
            thumbnail: None, // Thumbnail generated separately via video_generate_thumbnail
        };

        info!("[ScreenRecorder] Metadata created: id={}, mode={}, {}x{}, duration={}ms, size={} bytes, path={:?}",
            metadata.id, metadata.mode, metadata.width, metadata.height,
            metadata.duration_ms, metadata.file_size, metadata.file_path);

        Ok(metadata)
    }

    fn emit_status_change(&self) {
        let state = self.state.read();
        let duration = self.get_duration();
        let status = state.status.clone();
        let recording_id = state.recording_id.clone();
        let show_indicator = state.show_indicator;
        let highlight_clicks = state.highlight_clicks;
        debug!(
            "[ScreenRecorder] Emitting status change: {:?}, recording_id={:?}, duration={}ms",
            status, recording_id, duration
        );
        drop(state);

        let _ = self.app_handle.emit(
            "recording-status-changed",
            serde_json::json!({
                "status": status.clone(),
                "recording_id": recording_id,
                "duration_ms": duration,
            }),
        );

        if let Some(toolbar) = self.app_handle.try_state::<RecordingToolbar>() {
            let should_show = show_indicator && status != RecordingStatus::Idle;
            if should_show {
                if !toolbar.is_visible() {
                    let _ = toolbar.show();
                }
                toolbar.update_recording_state(
                    status == RecordingStatus::Recording || status == RecordingStatus::Paused,
                    status == RecordingStatus::Paused,
                    duration,
                );
            } else if toolbar.is_visible() {
                let _ = toolbar.hide();
            }
        }

        if let Some(overlay) = self.app_handle.try_state::<RecordingClickOverlay>() {
            let keep_overlay = highlight_clicks
                && (status == RecordingStatus::Recording
                    || status == RecordingStatus::Paused
                    || status == RecordingStatus::Countdown);
            if !keep_overlay && overlay.is_visible() {
                let _ = overlay.hide();
            }
        }
    }
}

/// Implement Drop to ensure FFmpeg process is cleaned up
impl Drop for ScreenRecorder {
    fn drop(&mut self) {
        info!("[ScreenRecorder] Dropping ScreenRecorder instance");
        self.is_dropping.store(true, Ordering::SeqCst);

        // Check if there's an active recording
        let state = self.state.read();
        let has_active_recording = matches!(
            state.status,
            RecordingStatus::Recording | RecordingStatus::Paused | RecordingStatus::Countdown
        );
        let output_path = state.output_path.clone();
        drop(state);

        if has_active_recording {
            warn!("[ScreenRecorder] Dropping with active recording - cleaning up");

            // Force kill FFmpeg process with short timeout
            self.force_kill_ffmpeg();

            // Delete partial file if exists
            if let Some(ref path) = output_path {
                info!(
                    "[ScreenRecorder] Cleaning up partial recording file: {}",
                    path
                );
                if let Err(e) = std::fs::remove_file(path) {
                    warn!(
                        "[ScreenRecorder] Failed to delete partial file during cleanup: {}",
                        e
                    );
                }
            }
        } else {
            // Still ensure FFmpeg is cleaned up
            self.force_kill_ffmpeg();
        }

        info!("[ScreenRecorder] ScreenRecorder dropped successfully");
    }
}

// ============== Cross-Platform Process Suspend/Resume ==============

/// Suspend a process by PID (cross-platform)
fn suspend_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        suspend_process_windows(pid)
    }
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        suspend_process_unix(pid)
    }
}

/// Resume a suspended process by PID (cross-platform)
fn resume_process(pid: u32) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        resume_process_windows(pid)
    }
    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        resume_process_unix(pid)
    }
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn suspend_process_unix(pid: u32) -> Result<(), String> {
    use std::process::Command;
    let output = Command::new("kill")
        .args(["-STOP", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to send SIGSTOP: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "kill -STOP failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    debug!("[ScreenRecorder] Process {} suspended via SIGSTOP", pid);
    Ok(())
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn resume_process_unix(pid: u32) -> Result<(), String> {
    use std::process::Command;
    let output = Command::new("kill")
        .args(["-CONT", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to send SIGCONT: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "kill -CONT failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    debug!("[ScreenRecorder] Process {} resumed via SIGCONT", pid);
    Ok(())
}

#[cfg(target_os = "windows")]
fn suspend_process_windows(pid: u32) -> Result<(), String> {
    use std::ffi::CString;

    type FarProc = unsafe extern "system" fn() -> isize;
    type NtSuspendProcessFn = unsafe extern "system" fn(isize) -> i32;

    extern "system" {
        fn LoadLibraryA(name: *const u8) -> isize;
        fn GetProcAddress(module: isize, name: *const u8) -> Option<FarProc>;
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        fn CloseHandle(handle: isize) -> i32;
    }

    unsafe {
        let lib_name = CString::new("ntdll.dll").unwrap();
        let module = LoadLibraryA(lib_name.as_ptr() as *const u8);
        if module == 0 {
            return Err("Failed to load ntdll.dll".to_string());
        }

        let func_name = CString::new("NtSuspendProcess").unwrap();
        let func = GetProcAddress(module, func_name.as_ptr() as *const u8);
        let func = func.ok_or("Failed to get NtSuspendProcess")?;

        let handle = OpenProcess(0x0800, 0, pid); // PROCESS_SUSPEND_RESUME
        if handle == 0 {
            return Err(format!("Failed to open process {}", pid));
        }

        let nt_suspend: NtSuspendProcessFn = std::mem::transmute(func);
        let status = nt_suspend(handle);
        CloseHandle(handle);

        if status != 0 {
            return Err(format!("NtSuspendProcess failed with status {}", status));
        }
    }

    debug!("[ScreenRecorder] Process {} suspended", pid);
    Ok(())
}

#[cfg(target_os = "windows")]
fn resume_process_windows(pid: u32) -> Result<(), String> {
    use std::ffi::CString;

    type FarProc = unsafe extern "system" fn() -> isize;
    type NtResumeProcessFn = unsafe extern "system" fn(isize) -> i32;

    extern "system" {
        fn LoadLibraryA(name: *const u8) -> isize;
        fn GetProcAddress(module: isize, name: *const u8) -> Option<FarProc>;
        fn OpenProcess(access: u32, inherit: i32, pid: u32) -> isize;
        fn CloseHandle(handle: isize) -> i32;
    }

    unsafe {
        let lib_name = CString::new("ntdll.dll").unwrap();
        let module = LoadLibraryA(lib_name.as_ptr() as *const u8);
        if module == 0 {
            return Err("Failed to load ntdll.dll".to_string());
        }

        let func_name = CString::new("NtResumeProcess").unwrap();
        let func = GetProcAddress(module, func_name.as_ptr() as *const u8);
        let func = func.ok_or("Failed to get NtResumeProcess")?;

        let handle = OpenProcess(0x0800, 0, pid); // PROCESS_SUSPEND_RESUME
        if handle == 0 {
            return Err(format!("Failed to open process {}", pid));
        }

        let nt_resume: NtResumeProcessFn = std::mem::transmute(func);
        let status = nt_resume(handle);
        CloseHandle(handle);

        if status != 0 {
            return Err(format!("NtResumeProcess failed with status {}", status));
        }
    }

    debug!("[ScreenRecorder] Process {} resumed", pid);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_config() -> RecordingConfig {
        RecordingConfig {
            capture_system_audio: false,
            capture_microphone: false,
            system_audio_device: None,
            microphone_device: None,
            ..RecordingConfig::default()
        }
    }

    #[test]
    fn test_recording_state_default() {
        let state = RecordingState::default();
        assert_eq!(state.status, RecordingStatus::Idle);
        assert!(state.recording_id.is_none());
    }

    #[test]
    fn test_timeout_constants() {
        // Compile-time check: FFMPEG_STOP_TIMEOUT_SECS must be positive
        const _: () = assert!(FFMPEG_STOP_TIMEOUT_SECS > 0);
    }

    #[test]
    fn build_audio_plan_without_audio_sources_adds_an() {
        let config = base_config();
        let plan = ScreenRecorder::build_audio_plan(&config);

        assert!(!plan.has_audio);
        assert!(plan.input_args.is_empty());
        assert!(plan.filter_args.is_empty());
        assert_eq!(plan.map_args, vec!["-map", "0:v:0", "-an"]);
    }

    #[test]
    fn build_audio_plan_single_audio_source_maps_direct_input() {
        let mut config = base_config();
        config.capture_microphone = true;
        config.microphone_device = Some("test-mic".to_string());

        let plan = ScreenRecorder::build_audio_plan(&config);
        assert!(plan.has_audio);
        assert!(plan.filter_args.is_empty());
        assert_eq!(plan.map_args, vec!["-map", "0:v:0", "-map", "1:a:0"]);
    }

    #[cfg(not(target_os = "macos"))]
    #[test]
    fn build_audio_plan_two_audio_sources_uses_amix() {
        let mut config = base_config();
        config.capture_system_audio = true;
        config.capture_microphone = true;
        config.system_audio_device = Some("test-system".to_string());
        config.microphone_device = Some("test-mic".to_string());

        let plan = ScreenRecorder::build_audio_plan(&config);
        assert!(plan.has_audio);
        assert!(
            plan.filter_args
                .iter()
                .any(|item| item.contains("amix=inputs=2")),
            "expected amix filter for two audio sources, got: {:?}",
            plan.filter_args
        );
        assert_eq!(plan.map_args, vec!["-map", "0:v:0", "-map", "[aout]"]);
    }
}
