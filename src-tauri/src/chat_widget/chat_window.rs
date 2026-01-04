//! Chat Widget Window Management
//!
//! Manages the floating AI chat assistant window.

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Chat widget window label
pub const CHAT_WIDGET_WINDOW_LABEL: &str = "chat-widget";

/// Default window dimensions
const DEFAULT_WIDTH: f64 = 420.0;
const DEFAULT_HEIGHT: f64 = 600.0;
const MIN_WIDTH: f64 = 320.0;
const MIN_HEIGHT: f64 = 400.0;

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
    size: Arc<RwLock<(f64, f64)>>,
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
            size: Arc::new(RwLock::new((DEFAULT_WIDTH, DEFAULT_HEIGHT))),
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
        if self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL).is_some() {
            log::trace!("[ChatWidgetWindow] Window already exists");
            return Ok(());
        }

        log::debug!("[ChatWidgetWindow] Creating chat widget window");

        let config = self.config.read().clone();
        let (width, height) = (config.width, config.height);

        let mut builder = WebviewWindowBuilder::new(
            &self.app_handle,
            CHAT_WIDGET_WINDOW_LABEL,
            WebviewUrl::App("chat-widget".into()),
        )
        .title("Cognia Assistant")
        .inner_size(width, height)
        .min_inner_size(MIN_WIDTH, MIN_HEIGHT)
        .decorations(false)
        .transparent(true)
        .always_on_top(config.pinned)
        .skip_taskbar(true)
        .resizable(true)
        .visible(false)
        .focused(true)
        .shadow(true);

        // Set position if remembered
        if config.remember_position {
            if let Some((x, y)) = config.x.zip(config.y) {
                builder = builder.position(x as f64, y as f64);
            } else {
                builder = builder.center();
            }
        } else {
            builder = builder.center();
        }

        let window = builder
            .build()
            .map_err(|e| format!("Failed to create chat widget window: {}", e))?;

        // Set up window event handlers
        let is_visible = self.is_visible.clone();
        let position = self.position.clone();
        let size = self.size.clone();
        let app_handle = self.app_handle.clone();

        window.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Moved(pos) => {
                    *position.write() = Some((pos.x, pos.y));
                    log::trace!("[ChatWidgetWindow] Window moved to ({}, {})", pos.x, pos.y);
                }
                tauri::WindowEvent::Resized(s) => {
                    *size.write() = (s.width as f64, s.height as f64);
                    log::trace!("[ChatWidgetWindow] Window resized to {}x{}", s.width, s.height);
                }
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Prevent actual close, just hide
                    api.prevent_close();
                    is_visible.store(false, Ordering::SeqCst);
                    if let Some(w) = app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
                        let _ = w.hide();
                    }
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
                let (w, h) = *self.size.read();
                let mut new_config = config;
                new_config.x = Some(x);
                new_config.y = Some(y);
                new_config.width = w;
                new_config.height = h;
                *self.config.write() = new_config;
                log::trace!("[ChatWidgetWindow] Position saved: ({}, {}), size: {}x{}", x, y, w, h);
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

    /// Adjust position to keep window on screen
    fn adjust_position(&self, x: i32, y: i32) -> (i32, i32) {
        let (screen_width, screen_height) = self.get_screen_size();
        let (width, height) = *self.size.read();

        let max_x = screen_width - width as i32 - SCREEN_EDGE_PADDING;
        let max_y = screen_height - height as i32 - SCREEN_EDGE_PADDING;

        let adjusted_x = x.max(SCREEN_EDGE_PADDING).min(max_x);
        let adjusted_y = y.max(SCREEN_EDGE_PADDING).min(max_y);

        (adjusted_x, adjusted_y)
    }

    /// Get screen size
    fn get_screen_size(&self) -> (i32, i32) {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
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
        let size = *self.size.read();

        let is_focused = if let Some(window) = self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL) {
            window.is_focused().unwrap_or(false)
        } else {
            false
        };

        ChatWidgetStatus {
            exists: self.app_handle.get_webview_window(CHAT_WIDGET_WINDOW_LABEL).is_some(),
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
        log::debug!("[ChatWidgetWindow] send_text() called with {} chars", text.len());
        
        // Show the window first
        self.show()?;

        // Emit event with the text
        self.app_handle
            .emit("chat-widget-send-text", serde_json::json!({
                "text": text,
            }))
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Ok(())
    }
}
