//! Chat Widget Window Management
//!
//! Manages the floating AI chat assistant window.
//!
//! This module handles window creation, lifecycle management, and content rendering
//! for the floating AI assistant. Key features include:
//! - Opaque background configuration for reliable content visibility
//! - Mode-specific sizing (debug vs production)
//! - Proper window lifecycle management with event handling

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Chat widget window label
pub const CHAT_WIDGET_WINDOW_LABEL: &str = "chat-widget";

/// Default window dimensions (production)
const DEFAULT_WIDTH: f64 = 420.0;
const DEFAULT_HEIGHT: f64 = 600.0;
const MIN_WIDTH: f64 = 320.0;
const MIN_HEIGHT: f64 = 400.0;

/// Debug mode window dimensions (larger for Next.js debug info)
#[cfg(debug_assertions)]
const DEBUG_WIDTH: f64 = 520.0;
#[cfg(debug_assertions)]
const DEBUG_HEIGHT: f64 = 750.0;

/// Minimum distance from screen edge
const SCREEN_EDGE_PADDING: i32 = 20;

/// Chat widget window configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatWidgetConfig {
    /// Window width
    pub width: f64,
    /// Window height
    pub height: f64,
    /// Last X position (None for center)
    pub x: Option<i32>,
    /// Last Y position (None for center)
    pub y: Option<i32>,
    /// Whether to remember position
    pub remember_position: bool,
    /// Whether to start minimized
    pub start_minimized: bool,
    /// Opacity (0.0 to 1.0)
    pub opacity: f64,
    /// Global shortcut to toggle window
    pub shortcut: String,
    /// Whether the widget is pinned (always on top)
    pub pinned: bool,
    /// Background color for opaque rendering (hex format, e.g., "#ffffff")
    #[serde(default = "default_background_color")]
    pub background_color: String,
}

/// Default background color for the chat widget window
fn default_background_color() -> String {
    "#ffffff".to_string()
}

impl Default for ChatWidgetConfig {
    fn default() -> Self {
        Self {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            x: None,
            y: None,
            remember_position: true,
            start_minimized: false,
            opacity: 1.0,
            shortcut: "CommandOrControl+Shift+Space".to_string(),
            pinned: true,
            background_color: default_background_color(),
        }
    }
}

/// Chat widget window status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatWidgetStatus {
    /// Whether the window exists
    pub exists: bool,
    /// Whether the window is visible
    pub is_visible: bool,
    /// Whether the window is focused
    pub is_focused: bool,
    /// Current position
    pub position: Option<(i32, i32)>,
    /// Current size
    pub size: Option<(f64, f64)>,
    /// Current configuration
    pub config: ChatWidgetConfig,
}

/// Chat widget window manager
pub struct ChatWidgetWindow {
    /// Tauri app handle
    app_handle: AppHandle,
    /// Whether the window is currently visible
    is_visible: Arc<AtomicBool>,
    /// Current position
    position: Arc<RwLock<Option<(i32, i32)>>>,
    /// Current size
    size_physical: Arc<RwLock<(u32, u32)>>,
    size_logical: Arc<RwLock<(f64, f64)>>,
    /// Configuration
    config: Arc<RwLock<ChatWidgetConfig>>,
}

impl ChatWidgetWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        log::debug!("[ChatWidgetWindow] Creating new instance");
        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
            position: Arc::new(RwLock::new(None)),
            size_physical: Arc::new(RwLock::new((DEFAULT_WIDTH as u32, DEFAULT_HEIGHT as u32))),
            size_logical: Arc::new(RwLock::new((DEFAULT_WIDTH, DEFAULT_HEIGHT))),
            config: Arc::new(RwLock::new(ChatWidgetConfig::default())),
        }
    }

    /// Get current configuration
    pub fn get_config(&self) -> ChatWidgetConfig {
        self.config.read().clone()
    }

    /// Update configuration
    pub fn update_config(&self, config: ChatWidgetConfig) {
        log::debug!("[ChatWidgetWindow] Updating config: {:?}", config);
        *self.config.write() = config;
    }

    /// Ensure the chat widget window exists
    pub fn ensure_window_exists(&self) -> Result<(), String> {
        if self
            .app_handle
            .get_webview_window(CHAT_WIDGET_WINDOW_LABEL)
            .is_some()
        {
            log::trace!("[ChatWidgetWindow] Window already exists");
            return Ok(());
        }

        log::debug!("[ChatWidgetWindow] Creating chat widget window");

        let config = self.config.read().clone();

        // Use config dimensions, with larger defaults for debug mode
        #[cfg(debug_assertions)]
        let (width, height) = (DEBUG_WIDTH, DEBUG_HEIGHT);
        #[cfg(not(debug_assertions))]
        let (width, height) = (config.width, config.height);

        // Build the window with opaque background for content visibility
        // Key insight: Using transparent: false ensures content is always visible
        // The background_color is set to ensure proper rendering even before CSS loads
        let mut builder = WebviewWindowBuilder::new(
            &self.app_handle,
            CHAT_WIDGET_WINDOW_LABEL,
            WebviewUrl::App("chat-widget".into()),
        )
        .title("Cognia Assistant")
        .inner_size(width, height)
        .min_inner_size(MIN_WIDTH, MIN_HEIGHT)
        .decorations(false)
        .transparent(false) // CRITICAL: Use opaque window for reliable content visibility
        .always_on_top(config.pinned)
        .skip_taskbar(true)
        .resizable(true)
        .visible(false) // Start hidden, show after content is ready
        .focused(true)
        .shadow(true);

        // Always create centered first; then set a Physical position after build.
        // This avoids logical/physical mismatches on Windows DPI scaling.
        builder = builder.center();

        let window = builder
            .build()
            .map_err(|e| format!("Failed to create chat widget window: {}", e))?;

        // Apply remembered position as a Physical position (DPI-safe)
        if config.remember_position {
            if let Some((x, y)) = config.x.zip(config.y) {
                let adjusted = self.adjust_position(x, y);
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: adjusted.0,
                    y: adjusted.1,
                }));
                *self.position.write() = Some(adjusted);
            }
        }

        // Emit event to notify frontend that window is ready for content rendering
        let _ = self.app_handle.emit("chat-widget-window-created", ());

        // Set up window event handlers
        let is_visible = self.is_visible.clone();
        let position = self.position.clone();
        let size_physical = self.size_physical.clone();
        let size_logical = self.size_logical.clone();
        let config_for_events = self.config.clone();
        let app_handle = self.app_handle.clone();

        let window_for_events = window.clone();

        window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Moved(pos) => {
                    *position.write() = Some((pos.x, pos.y));
                    log::trace!("[ChatWidgetWindow] Window moved to ({}, {})", pos.x, pos.y);
                }
                tauri::WindowEvent::Resized(s) => {
                    *size_physical.write() = (s.width, s.height);

                    let scale = window_for_events.scale_factor().unwrap_or(1.0);
                    let logical_w = (s.width as f64) / scale;
                    let logical_h = (s.height as f64) / scale;
                    *size_logical.write() = (logical_w, logical_h);

                    log::trace!(
                        "[ChatWidgetWindow] Window resized to {}x{}",
                        s.width,
                        s.height
                    );
                }
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Prevent actual close, just hide
                    api.prevent_close();
                    is_visible.store(false, Ordering::SeqCst);
                    if let Some(w) = app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
                        let _ = w.hide();
                    }

                    // Persist latest position/size into config and notify frontend.
                    // Note: position is tracked in physical pixels (DPI-safe); size is stored logically.
                    {
                        let current = config_for_events.read().clone();
                        if current.remember_position {
                            if let Some((x, y)) = *position.read() {
                                let (w, h) = *size_logical.read();
                                let mut next = current;
                                next.x = Some(x);
                                next.y = Some(y);
                                next.width = w;
                                next.height = h;
                                *config_for_events.write() = next;
                            }
                        }
                    }

                    let cfg = config_for_events.read().clone();
                    let _ = app_handle.emit("chat-widget-config-changed", cfg);
                    let _ = app_handle.emit("chat-widget-hidden", ());
                    log::debug!("[ChatWidgetWindow] Close prevented, window hidden");
                }
                tauri::WindowEvent::Focused(focused) => {
                    log::trace!("[ChatWidgetWindow] Focus changed: {}", focused);
                    let _ = app_handle.emit("chat-widget-focus-changed", focused);
                }
                _ => {}
            }
        });

        log::info!(
            "[ChatWidgetWindow] Window created successfully ({}x{})",
            width,
            height
        );
        Ok(())
    }

    /// Show the chat widget window
    pub fn show(&self) -> Result<(), String> {
        log::debug!("[ChatWidgetWindow] show() called");
        self.ensure_window_exists()?;

        let window = self
            .app_handle
            .get_webview_window(CHAT_WIDGET_WINDOW_LABEL)
            .ok_or("Chat widget window not found")?;

        window
            .show()
            .map_err(|e| format!("Failed to show window: {}", e))?;

        window
            .set_focus()
            .map_err(|e| format!("Failed to focus window: {}", e))?;

        self.is_visible.store(true, Ordering::SeqCst);

        self.app_handle
            .emit("chat-widget-shown", ())
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        log::info!("[ChatWidgetWindow] Window shown");
        Ok(())
    }

    /// Hide the chat widget window
    pub fn hide(&self) -> Result<(), String> {
        log::debug!("[ChatWidgetWindow] hide() called");

        if !self.is_visible.load(Ordering::SeqCst) {
            log::trace!("[ChatWidgetWindow] Already hidden");
            return Ok(());
        }

        // Save position before hiding
        self.save_position();

        if let Some(window) = self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
            window
                .hide()
                .map_err(|e| format!("Failed to hide window: {}", e))?;
        }

        self.is_visible.store(false, Ordering::SeqCst);

        self.app_handle
            .emit("chat-widget-hidden", ())
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        // Also notify that config (size/position) may have changed.
        let cfg = self.get_config();
        let _ = self.app_handle.emit("chat-widget-config-changed", cfg);

        log::info!("[ChatWidgetWindow] Window hidden");
        Ok(())
    }

    /// Toggle window visibility
    pub fn toggle(&self) -> Result<bool, String> {
        log::debug!("[ChatWidgetWindow] toggle() called");
        if self.is_visible() {
            self.hide()?;
            Ok(false)
        } else {
            self.show()?;
            Ok(true)
        }
    }

    /// Check if window is visible
    pub fn is_visible(&self) -> bool {
        self.is_visible.load(Ordering::SeqCst)
    }

    /// Save current position to config
    fn save_position(&self) {
        let config = self.config.read().clone();
        if config.remember_position {
            if let Some((x, y)) = *self.position.read() {
                let (w, h) = *self.size_logical.read();
                let mut new_config = config;
                new_config.x = Some(x);
                new_config.y = Some(y);
                new_config.width = w;
                new_config.height = h;
                *self.config.write() = new_config;
                log::trace!(
                    "[ChatWidgetWindow] Position saved: ({}, {}), size: {}x{}",
                    x,
                    y,
                    w,
                    h
                );
            }
        }
    }

    /// Set always on top
    pub fn set_pinned(&self, pinned: bool) -> Result<(), String> {
        log::debug!("[ChatWidgetWindow] set_pinned({})", pinned);

        if let Some(window) = self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
            window
                .set_always_on_top(pinned)
                .map_err(|e| format!("Failed to set always on top: {}", e))?;
        }

        {
            let mut config = self.config.write();
            config.pinned = pinned;
        }

        self.app_handle
            .emit("chat-widget-pinned-changed", pinned)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        log::info!("[ChatWidgetWindow] Pinned state set to {}", pinned);
        Ok(())
    }

    /// Set window position
    pub fn set_position(&self, x: i32, y: i32) -> Result<(), String> {
        log::debug!("[ChatWidgetWindow] set_position({}, {})", x, y);

        let adjusted = self.adjust_position(x, y);

        if let Some(window) = self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
            window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: adjusted.0,
                    y: adjusted.1,
                }))
                .map_err(|e| format!("Failed to set position: {}", e))?;
        }

        *self.position.write() = Some(adjusted);
        Ok(())
    }

    /// Adjust position to keep window on screen (with multi-monitor support)
    fn adjust_position(&self, x: i32, y: i32) -> (i32, i32) {
        // Get monitor info at the target position
        let (screen_width, screen_height, screen_x, screen_y) = self.get_monitor_at_point(x, y);
        let (width, height) = *self.size_physical.read();

        let min_x = screen_x + SCREEN_EDGE_PADDING;
        let max_x = screen_x + screen_width - width as i32 - SCREEN_EDGE_PADDING;
        let min_y = screen_y + SCREEN_EDGE_PADDING;
        let max_y = screen_y + screen_height - height as i32 - SCREEN_EDGE_PADDING;

        let adjusted_x = x.max(min_x).min(max_x);
        let adjusted_y = y.max(min_y).min(max_y);

        (adjusted_x, adjusted_y)
    }

    /// Get monitor info at a specific point (for multi-monitor support)
    fn get_monitor_at_point(&self, x: i32, y: i32) -> (i32, i32, i32, i32) {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::POINT;
            use windows::Win32::Graphics::Gdi::{
                GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST,
            };

            unsafe {
                let point = POINT { x, y };
                let monitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);

                let mut info = MONITORINFO {
                    cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                    ..Default::default()
                };

                if GetMonitorInfoW(monitor, &mut info).as_bool() {
                    let rect = info.rcWork; // Use work area (excludes taskbar)
                    return (
                        rect.right - rect.left, // width
                        rect.bottom - rect.top, // height
                        rect.left,              // x offset
                        rect.top,               // y offset
                    );
                }
            }

            // Fallback to primary screen
            let (w, h) = self.get_screen_size();
            (w, h, 0, 0)
        }

        #[cfg(not(target_os = "windows"))]
        {
            let (w, h) = self.get_screen_size();
            (w, h, 0, 0)
        }
    }

    /// Get screen size
    fn get_screen_size(&self) -> (i32, i32) {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{
                GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN,
            };
            unsafe {
                let width = GetSystemMetrics(SM_CXSCREEN);
                let height = GetSystemMetrics(SM_CYSCREEN);
                (width, height)
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            (1920, 1080)
        }
    }

    /// Get current status
    pub fn get_status(&self) -> ChatWidgetStatus {
        let config = self.config.read().clone();
        let is_visible = self.is_visible();
        let position = *self.position.read();
        let size = *self.size_logical.read();

        let is_focused =
            if let Some(window) = self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
                window.is_focused().unwrap_or(false)
            } else {
                false
            };

        ChatWidgetStatus {
            exists: self
                .app_handle
                .get_webview_window(CHAT_WIDGET_WINDOW_LABEL)
                .is_some(),
            is_visible,
            is_focused,
            position,
            size: Some(size),
            config,
        }
    }

    /// Close and destroy the window
    pub fn destroy(&self) -> Result<(), String> {
        log::debug!("[ChatWidgetWindow] destroy() called");

        // Save position before destroying
        self.save_position();

        if let Some(window) = self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
            window
                .destroy()
                .map_err(|e| format!("Failed to destroy window: {}", e))?;
        }

        self.is_visible.store(false, Ordering::SeqCst);
        log::info!("[ChatWidgetWindow] Window destroyed");
        Ok(())
    }

    /// Focus the input field in the chat widget
    pub fn focus_input(&self) -> Result<(), String> {
        log::debug!("[ChatWidgetWindow] focus_input() called");

        self.app_handle
            .emit("chat-widget-focus-input", ())
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Ok(())
    }

    /// Send initial text to chat widget
    pub fn send_text(&self, text: String) -> Result<(), String> {
        log::debug!(
            "[ChatWidgetWindow] send_text() called with {} chars",
            text.len()
        );

        // Show the window first
        self.show()?;

        // Emit event with the text
        self.app_handle
            .emit(
                "chat-widget-send-text",
                serde_json::json!({
                    "text": text,
                }),
            )
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Ok(())
    }
}
