//! Recording toolbar window management
//!
//! Manages the floating toolbar that appears during screen recording,
//! providing controls for pause/resume, stop, and real-time duration display.

use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio_util::sync::CancellationToken;

use super::window_snap::{SnapEdge, WindowSnap};

/// Recording toolbar window label
pub const RECORDING_TOOLBAR_LABEL: &str = "recording-toolbar";

/// Toolbar dimensions
const TOOLBAR_WIDTH: f64 = 320.0;
const TOOLBAR_HEIGHT: f64 = 56.0;
const COMPACT_WIDTH: f64 = 120.0;
const COMPACT_HEIGHT: f64 = 40.0;

/// Distance from screen edge when docked
const EDGE_PADDING: i32 = 16;

/// Snap threshold in pixels
const SNAP_THRESHOLD: i32 = 20;

/// Toolbar position preset
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ToolbarPosition {
    TopCenter,
    BottomCenter,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Custom { x: i32, y: i32 },
}

impl Default for ToolbarPosition {
    fn default() -> Self {
        Self::TopCenter
    }
}

/// Toolbar configuration for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingToolbarConfig {
    pub position: ToolbarPosition,
    pub auto_dock: bool,
    pub auto_hide: bool,
    pub auto_hide_delay_ms: u64,
    pub show_timer: bool,
    pub compact_mode: bool,
    pub opacity: f32,
    pub remember_position: bool,
}

impl Default for RecordingToolbarConfig {
    fn default() -> Self {
        Self {
            position: ToolbarPosition::TopCenter,
            auto_dock: true,
            auto_hide: false,
            auto_hide_delay_ms: 3000,
            show_timer: true,
            compact_mode: false,
            opacity: 1.0,
            remember_position: true,
        }
    }
}

/// Recording toolbar state
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordingToolbarState {
    pub is_recording: bool,
    pub is_paused: bool,
    pub duration_ms: u64,
    pub formatted_duration: String,
}

impl Default for RecordingToolbarState {
    fn default() -> Self {
        Self {
            is_recording: false,
            is_paused: false,
            duration_ms: 0,
            formatted_duration: "00:00".to_string(),
        }
    }
}

/// Recording toolbar window manager
pub struct RecordingToolbar {
    app_handle: AppHandle,
    is_visible: Arc<AtomicBool>,
    is_hovered: Arc<AtomicBool>,
    position: Arc<RwLock<(i32, i32)>>,
    config: Arc<RwLock<RecordingToolbarConfig>>,
    state: Arc<RwLock<RecordingToolbarState>>,
    snapped_edge: Arc<RwLock<Option<SnapEdge>>>,
    creation_lock: Arc<Mutex<()>>,
    config_path: PathBuf,
    auto_hide_cancel: Arc<RwLock<Option<CancellationToken>>>,
}

impl RecordingToolbar {
    pub fn new(app_handle: AppHandle) -> Self {
        let config_path = app_handle
            .path()
            .app_data_dir()
            .map(|p| p.join("recording_toolbar_config.json"))
            .unwrap_or_else(|_| PathBuf::from("recording_toolbar_config.json"));

        let config = Self::load_config_from_file(&config_path).unwrap_or_default();

        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
            is_hovered: Arc::new(AtomicBool::new(false)),
            position: Arc::new(RwLock::new((0, 0))),
            config: Arc::new(RwLock::new(config)),
            state: Arc::new(RwLock::new(RecordingToolbarState::default())),
            snapped_edge: Arc::new(RwLock::new(None)),
            creation_lock: Arc::new(Mutex::new(())),
            config_path,
            auto_hide_cancel: Arc::new(RwLock::new(None)),
        }
    }

    fn load_config_from_file(path: &PathBuf) -> Option<RecordingToolbarConfig> {
        if path.exists() {
            match std::fs::read_to_string(path) {
                Ok(content) => match serde_json::from_str(&content) {
                    Ok(config) => {
                        log::debug!("[RecordingToolbar] Loaded config from {:?}", path);
                        return Some(config);
                    }
                    Err(e) => log::warn!("[RecordingToolbar] Failed to parse config: {}", e),
                },
                Err(e) => log::warn!("[RecordingToolbar] Failed to read config: {}", e),
            }
        }
        None
    }

    pub fn save_config(&self) -> Result<(), String> {
        let config = self.config.read().clone();
        let content = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        if let Some(parent) = self.config_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        std::fs::write(&self.config_path, content)
            .map_err(|e| format!("Failed to write config: {}", e))?;

        log::debug!("[RecordingToolbar] Config saved to {:?}", self.config_path);
        Ok(())
    }

    pub fn get_config(&self) -> RecordingToolbarConfig {
        self.config.read().clone()
    }

    pub fn update_config(&self, config: RecordingToolbarConfig) {
        *self.config.write() = config;
        if let Err(e) = self.save_config() {
            log::warn!("[RecordingToolbar] Failed to save config: {}", e);
        }
    }

    pub fn get_state(&self) -> RecordingToolbarState {
        self.state.read().clone()
    }

    fn get_toolbar_size(&self) -> (f64, f64) {
        let config = self.config.read();
        if config.compact_mode {
            (COMPACT_WIDTH, COMPACT_HEIGHT)
        } else {
            (TOOLBAR_WIDTH, TOOLBAR_HEIGHT)
        }
    }

    fn calculate_position_for_preset(&self, preset: ToolbarPosition) -> (i32, i32) {
        let (work_w, work_h, work_x, work_y) = self.get_primary_work_area();
        let (width, height) = self.get_toolbar_size();
        let width = width as i32;
        let height = height as i32;

        match preset {
            ToolbarPosition::TopCenter => {
                let x = work_x + (work_w - width) / 2;
                let y = work_y + EDGE_PADDING;
                (x, y)
            }
            ToolbarPosition::BottomCenter => {
                let x = work_x + (work_w - width) / 2;
                let y = work_y + work_h - height - EDGE_PADDING;
                (x, y)
            }
            ToolbarPosition::TopLeft => (work_x + EDGE_PADDING, work_y + EDGE_PADDING),
            ToolbarPosition::TopRight => {
                let x = work_x + work_w - width - EDGE_PADDING;
                let y = work_y + EDGE_PADDING;
                (x, y)
            }
            ToolbarPosition::BottomLeft => {
                let x = work_x + EDGE_PADDING;
                let y = work_y + work_h - height - EDGE_PADDING;
                (x, y)
            }
            ToolbarPosition::BottomRight => {
                let x = work_x + work_w - width - EDGE_PADDING;
                let y = work_y + work_h - height - EDGE_PADDING;
                (x, y)
            }
            ToolbarPosition::Custom { x, y } => (x, y),
        }
    }

    pub fn ensure_window_exists(&self) -> Result<(), String> {
        let _guard = self.creation_lock.lock();

        if self
            .app_handle
            .get_webview_window(RECORDING_TOOLBAR_LABEL)
            .is_some()
        {
            return Ok(());
        }

        log::debug!("[RecordingToolbar] Creating toolbar window");

        let (width, height) = self.get_toolbar_size();

        let window = WebviewWindowBuilder::new(
            &self.app_handle,
            RECORDING_TOOLBAR_LABEL,
            WebviewUrl::App("recording-toolbar".into()),
        )
        .title("")
        .inner_size(width, height)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .focused(false)
        .shadow(false)
        .build()
        .map_err(|e| format!("Failed to create recording toolbar: {}", e))?;

        // Set initial position
        let config = self.config.read().clone();
        let (x, y) = self.calculate_position_for_preset(config.position);
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
        *self.position.write() = (x, y);

        // Set up window event handlers
        let position = self.position.clone();
        let config_arc = self.config.clone();
        let snapped_edge = self.snapped_edge.clone();
        let app_handle = self.app_handle.clone();

        window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Moved(pos) => {
                    *position.write() = (pos.x, pos.y);

                    // Check for edge snapping and apply magnetic snap
                    let config = config_arc.read();
                    if config.auto_dock {
                        if let Some(window) = app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL)
                        {
                            let (work_w, work_h, work_x, work_y) = get_work_area_static();
                            let size = window.outer_size().unwrap_or(tauri::PhysicalSize {
                                width: TOOLBAR_WIDTH as u32,
                                height: TOOLBAR_HEIGHT as u32,
                            });

                            // Use apply_magnetic_snap for automatic snapping behavior
                            let (snap_x, snap_y, edge) = WindowSnap::apply_magnetic_snap(
                                pos.x,
                                pos.y,
                                size.width as i32,
                                size.height as i32,
                                work_x,
                                work_y,
                                work_w,
                                work_h,
                                SNAP_THRESHOLD,
                                EDGE_PADDING,
                            );

                            if let Some(snap_edge) = edge {
                                // Apply the snapped position if within threshold
                                if snap_x != pos.x || snap_y != pos.y {
                                    let _ = window.set_position(tauri::Position::Physical(
                                        tauri::PhysicalPosition {
                                            x: snap_x,
                                            y: snap_y,
                                        },
                                    ));
                                }
                                *snapped_edge.write() = Some(snap_edge);
                                let _ = app_handle.emit(
                                    "recording-toolbar://snapped",
                                    serde_json::json!({ "edge": snap_edge }),
                                );
                            } else {
                                *snapped_edge.write() = None;
                            }
                        }
                    }

                    let _ = app_handle.emit(
                        "recording-toolbar://position-changed",
                        serde_json::json!({
                            "x": pos.x,
                            "y": pos.y
                        }),
                    );
                }
                tauri::WindowEvent::Destroyed => {
                    log::debug!("[RecordingToolbar] Window destroyed");
                }
                _ => {}
            }
        });

        log::info!("[RecordingToolbar] Window created successfully");
        Ok(())
    }

    pub fn show(&self) -> Result<(), String> {
        self.ensure_window_exists()?;

        if let Some(window) = self.app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL) {
            window
                .show()
                .map_err(|e| format!("Failed to show toolbar: {}", e))?;
            let _ = window.set_always_on_top(true);
            self.is_visible.store(true, Ordering::SeqCst);

            let _ = self.app_handle.emit("recording-toolbar://show", ());
            log::info!("[RecordingToolbar] Toolbar shown");

            // Schedule auto-hide if enabled
            self.schedule_auto_hide();
        }
        Ok(())
    }

    pub fn hide(&self) -> Result<(), String> {
        self.cancel_auto_hide();
        if let Some(window) = self.app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL) {
            window
                .hide()
                .map_err(|e| format!("Failed to hide toolbar: {}", e))?;
            self.is_visible.store(false, Ordering::SeqCst);

            let _ = self.app_handle.emit("recording-toolbar://hide", ());
            log::info!("[RecordingToolbar] Toolbar hidden");
        }
        Ok(())
    }

    pub fn is_visible(&self) -> bool {
        self.is_visible.load(Ordering::SeqCst)
    }

    pub fn set_position(&self, x: i32, y: i32) -> Result<(), String> {
        // Clamp position to work area to prevent toolbar from going off-screen
        let (work_w, work_h, work_x, work_y) = self.get_primary_work_area();
        let (width, height) = self.get_toolbar_size();
        let (clamped_x, clamped_y) = WindowSnap::clamp_to_work_area(
            x,
            y,
            width as i32,
            height as i32,
            work_x,
            work_y,
            work_w,
            work_h,
            EDGE_PADDING,
        );

        if let Some(window) = self.app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL) {
            window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: clamped_x,
                    y: clamped_y,
                }))
                .map_err(|e| format!("Failed to set position: {}", e))?;
        }
        *self.position.write() = (clamped_x, clamped_y);

        // Update config if remember_position is enabled
        let mut config = self.config.write();
        if config.remember_position {
            config.position = ToolbarPosition::Custom { x, y };
        }

        Ok(())
    }

    pub fn get_position(&self) -> (i32, i32) {
        *self.position.read()
    }

    pub fn snap_to_edge(&self, edge: SnapEdge) -> Result<(), String> {
        let (work_w, work_h, work_x, work_y) = self.get_primary_work_area();
        let (width, height) = self.get_toolbar_size();
        let width = width as i32;
        let height = height as i32;

        let (x, y) = WindowSnap::calculate_snapped_position(
            edge,
            width,
            height,
            work_x,
            work_y,
            work_w,
            work_h,
            EDGE_PADDING,
        );

        self.set_position(x, y)?;
        *self.snapped_edge.write() = Some(edge);

        let _ = self.app_handle.emit(
            "recording-toolbar://snapped",
            serde_json::json!({ "edge": edge }),
        );
        log::debug!("[RecordingToolbar] Snapped to {:?} at ({}, {})", edge, x, y);

        Ok(())
    }

    pub fn toggle_compact_mode(&self) -> Result<bool, String> {
        let is_compact = {
            let mut config = self.config.write();
            config.compact_mode = !config.compact_mode;
            config.compact_mode
        };

        // Resize window
        if let Some(window) = self.app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL) {
            let (width, height) = self.get_toolbar_size();
            window
                .set_size(tauri::Size::Logical(tauri::LogicalSize { width, height }))
                .map_err(|e| format!("Failed to resize toolbar: {}", e))?;
        }

        let _ = self
            .app_handle
            .emit("recording-toolbar://compact-toggled", is_compact);
        log::debug!("[RecordingToolbar] Compact mode: {}", is_compact);

        Ok(is_compact)
    }

    pub fn update_recording_state(&self, is_recording: bool, is_paused: bool, duration_ms: u64) {
        let formatted = format_duration(duration_ms);

        {
            let mut state = self.state.write();
            state.is_recording = is_recording;
            state.is_paused = is_paused;
            state.duration_ms = duration_ms;
            state.formatted_duration = formatted.clone();
        }

        let _ = self.app_handle.emit(
            "recording-toolbar://state-updated",
            serde_json::json!({
                "isRecording": is_recording,
                "isPaused": is_paused,
                "durationMs": duration_ms,
                "formattedDuration": formatted,
            }),
        );
    }

    pub fn set_hovered(&self, hovered: bool) {
        log::trace!("[RecordingToolbar] set_hovered: {}", hovered);
        self.is_hovered.store(hovered, Ordering::SeqCst);
        if hovered {
            // Cancel any pending auto-hide when mouse enters
            self.cancel_auto_hide();
        } else if self.is_visible() {
            // Restart auto-hide timer when mouse leaves
            self.schedule_auto_hide();
        }
    }

    pub fn is_hovered(&self) -> bool {
        self.is_hovered.load(Ordering::SeqCst)
    }

    fn cancel_auto_hide(&self) {
        if let Some(token) = self.auto_hide_cancel.write().take() {
            log::trace!("[RecordingToolbar] Cancelling auto-hide timer");
            token.cancel();
        }
    }

    fn schedule_auto_hide(&self) {
        let config = self.config.read();
        if !config.auto_hide {
            return;
        }
        let timeout_ms = config.auto_hide_delay_ms;
        drop(config);

        if timeout_ms == 0 {
            return;
        }

        log::trace!(
            "[RecordingToolbar] Scheduling auto-hide in {}ms",
            timeout_ms
        );
        self.cancel_auto_hide();

        let cancel_token = CancellationToken::new();
        *self.auto_hide_cancel.write() = Some(cancel_token.clone());

        let is_visible = self.is_visible.clone();
        let is_hovered = self.is_hovered.clone();
        let app_handle = self.app_handle.clone();
        let auto_hide_cancel = self.auto_hide_cancel.clone();

        tauri::async_runtime::spawn(async move {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    log::trace!("[RecordingToolbar] Auto-hide cancelled");
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(timeout_ms)) => {
                    if is_visible.load(Ordering::SeqCst) && !is_hovered.load(Ordering::SeqCst) {
                        if let Some(window) = app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL) {
                            let _ = window.hide();
                            is_visible.store(false, Ordering::SeqCst);
                            let _ = app_handle.emit("recording-toolbar://auto-hidden", ());
                        }
                        log::debug!("[RecordingToolbar] Auto-hidden after {}ms", timeout_ms);
                    }
                    *auto_hide_cancel.write() = None;
                }
            }
        });
    }

    pub fn destroy(&self) -> Result<(), String> {
        self.cancel_auto_hide();

        if let Err(e) = self.save_config() {
            log::warn!("[RecordingToolbar] Failed to save config on destroy: {}", e);
        }

        if let Some(window) = self.app_handle.get_webview_window(RECORDING_TOOLBAR_LABEL) {
            let _ = window.hide();
            window
                .destroy()
                .map_err(|e| format!("Failed to destroy toolbar: {}", e))?;
        }

        self.is_visible.store(false, Ordering::SeqCst);
        self.is_hovered.store(false, Ordering::SeqCst);
        log::info!("[RecordingToolbar] Toolbar destroyed");
        Ok(())
    }

    fn get_primary_work_area(&self) -> (i32, i32, i32, i32) {
        get_work_area_static()
    }
}

/// Format duration in milliseconds to MM:SS or HH:MM:SS
fn format_duration(duration_ms: u64) -> String {
    let total_seconds = duration_ms / 1000;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    if hours > 0 {
        format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
    } else {
        format!("{:02}:{:02}", minutes, seconds)
    }
}

/// Get work area (static function for use in callbacks)
#[cfg(target_os = "windows")]
fn get_work_area_static() -> (i32, i32, i32, i32) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTOPRIMARY,
    };

    unsafe {
        let point = POINT { x: 0, y: 0 };
        let monitor = MonitorFromPoint(point, MONITOR_DEFAULTTOPRIMARY);

        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };

        if GetMonitorInfoW(monitor, &mut info).as_bool() {
            let rect = info.rcWork;
            return (
                rect.right - rect.left,
                rect.bottom - rect.top,
                rect.left,
                rect.top,
            );
        }
    }

    (1920, 1080, 0, 0)
}

#[cfg(not(target_os = "windows"))]
fn get_work_area_static() -> (i32, i32, i32, i32) {
    (1920, 1080, 0, 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration(0), "00:00");
        assert_eq!(format_duration(1000), "00:01");
        assert_eq!(format_duration(60000), "01:00");
        assert_eq!(format_duration(3661000), "01:01:01");
    }

    #[test]
    fn test_toolbar_config_default() {
        let config = RecordingToolbarConfig::default();
        assert!(config.auto_dock);
        assert!(!config.auto_hide);
        assert!(config.show_timer);
        assert!(!config.compact_mode);
        assert_eq!(config.opacity, 1.0);
    }

    #[test]
    fn test_toolbar_position_default() {
        let pos = ToolbarPosition::default();
        assert_eq!(pos, ToolbarPosition::TopCenter);
    }

    #[test]
    fn test_recording_toolbar_state_default() {
        let state = RecordingToolbarState::default();
        assert!(!state.is_recording);
        assert!(!state.is_paused);
        assert_eq!(state.duration_ms, 0);
        assert_eq!(state.formatted_duration, "00:00");
    }
}
