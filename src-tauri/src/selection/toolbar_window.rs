//! Selection toolbar window management
//!
//! Manages the floating toolbar that appears when text is selected.

#![allow(dead_code)]

use parking_lot::RwLock;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Instant;
use tauri::{AppHandle, Manager, Emitter, WebviewUrl, WebviewWindowBuilder};
use tokio_util::sync::CancellationToken;

/// Toolbar window label
pub const TOOLBAR_WINDOW_LABEL: &str = "selection-toolbar";

/// Toolbar window dimensions
const TOOLBAR_WIDTH: f64 = 280.0;
const TOOLBAR_HEIGHT: f64 = 56.0;

/// Default auto-hide timeout in milliseconds (0 = disabled)
const DEFAULT_AUTO_HIDE_MS: u64 = 0;

/// Minimum distance from screen edge
const SCREEN_EDGE_PADDING: i32 = 10;

/// Offset above cursor
const CURSOR_OFFSET_Y: i32 = 10;

/// Floating toolbar window manager
pub struct ToolbarWindow {
    /// Tauri app handle
    app_handle: AppHandle,
    /// Whether the toolbar is currently visible
    is_visible: Arc<AtomicBool>,
    /// Current position
    position: Arc<RwLock<(i32, i32)>>,
    /// Current selected text
    selected_text: Arc<RwLock<Option<String>>>,
    /// Auto-hide timeout in milliseconds (0 = disabled)
    auto_hide_ms: Arc<RwLock<u64>>,
    /// Cancellation token for auto-hide task
    auto_hide_cancel: Arc<RwLock<Option<CancellationToken>>>,
    /// Time when toolbar was last shown
    last_shown: Arc<RwLock<Option<Instant>>>,
    /// Whether mouse is hovering over toolbar (prevents auto-hide)
    is_hovered: Arc<AtomicBool>,
}

impl ToolbarWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
            position: Arc::new(RwLock::new((0, 0))),
            selected_text: Arc::new(RwLock::new(None)),
            auto_hide_ms: Arc::new(RwLock::new(DEFAULT_AUTO_HIDE_MS)),
            auto_hide_cancel: Arc::new(RwLock::new(None)),
            last_shown: Arc::new(RwLock::new(None)),
            is_hovered: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Set auto-hide timeout (0 to disable)
    pub fn set_auto_hide_timeout(&self, ms: u64) {
        *self.auto_hide_ms.write() = ms;
        log::debug!("Auto-hide timeout set to {}ms", ms);
    }

    /// Get auto-hide timeout
    pub fn get_auto_hide_timeout(&self) -> u64 {
        *self.auto_hide_ms.read()
    }

    /// Set hover state (called from frontend)
    pub fn set_hovered(&self, hovered: bool) {
        self.is_hovered.store(hovered, Ordering::SeqCst);
        if hovered {
            // Cancel any pending auto-hide when mouse enters
            self.cancel_auto_hide();
        } else if self.is_visible() {
            // Restart auto-hide timer when mouse leaves
            self.schedule_auto_hide();
        }
    }

    /// Cancel pending auto-hide
    fn cancel_auto_hide(&self) {
        if let Some(token) = self.auto_hide_cancel.write().take() {
            token.cancel();
        }
    }

    /// Schedule auto-hide if enabled
    fn schedule_auto_hide(&self) {
        let timeout_ms = *self.auto_hide_ms.read();
        if timeout_ms == 0 {
            return;
        }

        // Cancel any existing timer
        self.cancel_auto_hide();

        let cancel_token = CancellationToken::new();
        *self.auto_hide_cancel.write() = Some(cancel_token.clone());

        let is_visible = self.is_visible.clone();
        let is_hovered = self.is_hovered.clone();
        let app_handle = self.app_handle.clone();
        let auto_hide_cancel = self.auto_hide_cancel.clone();
        let selected_text = self.selected_text.clone();

        tauri::async_runtime::spawn(async move {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    // Timer was cancelled
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(timeout_ms)) => {
                    // Check if still visible and not hovered
                    if is_visible.load(Ordering::SeqCst) && !is_hovered.load(Ordering::SeqCst) {
                        // Hide the toolbar
                        if let Some(window) = app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL) {
                            let _ = window.hide();
                        }
                        is_visible.store(false, Ordering::SeqCst);
                        *selected_text.write() = None;
                        let _ = app_handle.emit("selection-toolbar-auto-hidden", ());
                        log::debug!("Toolbar auto-hidden after {}ms", timeout_ms);
                    }
                    // Clear the cancel token
                    *auto_hide_cancel.write() = None;
                }
            }
        });
    }

    /// Create the toolbar window if it doesn't exist
    pub fn ensure_window_exists(&self) -> Result<(), String> {
        if self.app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL).is_some() {
            return Ok(());
        }

        let window = WebviewWindowBuilder::new(
            &self.app_handle,
            TOOLBAR_WINDOW_LABEL,
            WebviewUrl::App("selection-toolbar".into()),
        )
        .title("")
        .inner_size(TOOLBAR_WIDTH, TOOLBAR_HEIGHT)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(false)
        .focused(false)
        .shadow(false)
        .build()
        .map_err(|e| format!("Failed to create toolbar window: {}", e))?;

        // Note: Window styling is handled by Tauri's window builder options
        // The decorations(false), skip_taskbar(true), and focused(false) options
        // provide the necessary behavior for a floating toolbar
        let _ = window;

        log::info!("Toolbar window created");
        Ok(())
    }

    /// Show the toolbar at the specified position
    pub fn show(&self, x: i32, y: i32, text: String) -> Result<(), String> {
        self.ensure_window_exists()?;

        let window = self
            .app_handle
            .get_webview_window(TOOLBAR_WINDOW_LABEL)
            .ok_or("Toolbar window not found")?;

        // Calculate position (above the mouse cursor with some offset)
        let (adjusted_x, adjusted_y) = self.calculate_position(x, y);

        // Update state
        *self.position.write() = (adjusted_x, adjusted_y);
        *self.selected_text.write() = Some(text.clone());
        *self.last_shown.write() = Some(Instant::now());

        // Move and show window
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: adjusted_x,
                y: adjusted_y,
            }))
            .map_err(|e| format!("Failed to set position: {}", e))?;

        window
            .show()
            .map_err(|e| format!("Failed to show window: {}", e))?;

        // Bring to front
        let _ = window.set_focus();

        // Emit event to frontend with more details
        self.app_handle
            .emit(
                "selection-toolbar-show",
                serde_json::json!({
                    "text": text,
                    "x": adjusted_x,
                    "y": adjusted_y,
                    "textLength": text.len(),
                }),
            )
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        self.is_visible.store(true, Ordering::SeqCst);
        
        // Schedule auto-hide if enabled
        self.schedule_auto_hide();
        
        log::debug!("Toolbar shown at ({}, {}) with {} chars", adjusted_x, adjusted_y, text.len());
        Ok(())
    }

    /// Update toolbar position without changing text
    pub fn update_position(&self, x: i32, y: i32) -> Result<(), String> {
        if !self.is_visible() {
            return Ok(());
        }

        let window = self
            .app_handle
            .get_webview_window(TOOLBAR_WINDOW_LABEL)
            .ok_or("Toolbar window not found")?;

        let (adjusted_x, adjusted_y) = self.calculate_position(x, y);
        *self.position.write() = (adjusted_x, adjusted_y);

        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: adjusted_x,
                y: adjusted_y,
            }))
            .map_err(|e| format!("Failed to set position: {}", e))?;

        Ok(())
    }

    /// Hide the toolbar
    pub fn hide(&self) -> Result<(), String> {
        if !self.is_visible.load(Ordering::SeqCst) {
            return Ok(());
        }

        // Cancel any pending auto-hide
        self.cancel_auto_hide();

        if let Some(window) = self.app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL) {
            window
                .hide()
                .map_err(|e| format!("Failed to hide window: {}", e))?;
        }

        // Get the text that was selected before clearing
        let previous_text = self.selected_text.read().clone();

        // Emit event to frontend with context
        let _ = self.app_handle.emit("selection-toolbar-hide", serde_json::json!({
            "reason": "manual",
            "hadText": previous_text.is_some(),
        }));

        self.is_visible.store(false, Ordering::SeqCst);
        *self.selected_text.write() = None;
        self.is_hovered.store(false, Ordering::SeqCst);
        
        log::debug!("Toolbar hidden");
        Ok(())
    }

    /// Hide the toolbar with a specific reason
    pub fn hide_with_reason(&self, reason: &str) -> Result<(), String> {
        if !self.is_visible.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.cancel_auto_hide();

        if let Some(window) = self.app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL) {
            window
                .hide()
                .map_err(|e| format!("Failed to hide window: {}", e))?;
        }

        let previous_text = self.selected_text.read().clone();
        let _ = self.app_handle.emit("selection-toolbar-hide", serde_json::json!({
            "reason": reason,
            "hadText": previous_text.is_some(),
        }));

        self.is_visible.store(false, Ordering::SeqCst);
        *self.selected_text.write() = None;
        self.is_hovered.store(false, Ordering::SeqCst);
        
        log::debug!("Toolbar hidden (reason: {})", reason);
        Ok(())
    }

    /// Calculate the best position for the toolbar
    fn calculate_position(&self, mouse_x: i32, mouse_y: i32) -> (i32, i32) {
        // Get screen dimensions for the monitor containing the cursor
        let (screen_width, screen_height, screen_x, screen_y) = self.get_monitor_at_point(mouse_x, mouse_y);

        // Position toolbar above and centered on the mouse cursor
        let toolbar_x = (mouse_x as f64 - TOOLBAR_WIDTH / 2.0) as i32;
        let toolbar_y = mouse_y - TOOLBAR_HEIGHT as i32 - CURSOR_OFFSET_Y;

        // Calculate bounds relative to the current monitor
        let min_x = screen_x + SCREEN_EDGE_PADDING;
        let max_x = screen_x + screen_width - TOOLBAR_WIDTH as i32 - SCREEN_EDGE_PADDING;
        let min_y = screen_y + SCREEN_EDGE_PADDING;
        let max_y = screen_y + screen_height - TOOLBAR_HEIGHT as i32 - SCREEN_EDGE_PADDING;

        // Ensure toolbar stays within screen bounds
        let adjusted_x = toolbar_x.max(min_x).min(max_x);
        let adjusted_y = if toolbar_y < min_y {
            // If not enough space above, show below the cursor
            mouse_y + 20
        } else {
            toolbar_y
        };

        (adjusted_x, adjusted_y.max(min_y).min(max_y))
    }

    /// Get monitor info at a specific point (for multi-monitor support)
    fn get_monitor_at_point(&self, x: i32, y: i32) -> (i32, i32, i32, i32) {
        #[cfg(target_os = "windows")]
        {
            use windows::Win32::Foundation::POINT;
            use windows::Win32::Graphics::Gdi::{
                MonitorFromPoint, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTONEAREST,
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
                        rect.right - rect.left,  // width
                        rect.bottom - rect.top,  // height
                        rect.left,               // x offset
                        rect.top,                // y offset
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
            use windows::Win32::UI::WindowsAndMessaging::{GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
            unsafe {
                let width = GetSystemMetrics(SM_CXSCREEN);
                let height = GetSystemMetrics(SM_CYSCREEN);
                return (width, height);
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            // Default fallback
            (1920, 1080)
        }
    }

    /// Check if toolbar is visible
    pub fn is_visible(&self) -> bool {
        self.is_visible.load(Ordering::SeqCst)
    }

    /// Get time since toolbar was shown (in milliseconds)
    pub fn get_visible_duration_ms(&self) -> Option<u64> {
        if !self.is_visible() {
            return None;
        }
        self.last_shown.read().map(|t| t.elapsed().as_millis() as u64)
    }

    /// Check if mouse is hovering over toolbar
    pub fn is_hovered(&self) -> bool {
        self.is_hovered.load(Ordering::SeqCst)
    }

    /// Get current selected text
    pub fn get_selected_text(&self) -> Option<String> {
        self.selected_text.read().clone()
    }

    /// Get current position
    pub fn get_position(&self) -> (i32, i32) {
        *self.position.read()
    }
}
