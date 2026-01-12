//! Selection toolbar window management
//!
//! Manages the floating toolbar that appears when text is selected.

#![allow(dead_code)]

use parking_lot::{Mutex, RwLock};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio_util::sync::CancellationToken;

/// Toolbar window label
pub const TOOLBAR_WINDOW_LABEL: &str = "selection-toolbar";

/// Toolbar window dimensions (production)
const TOOLBAR_WIDTH: f64 = 560.0;
const TOOLBAR_HEIGHT: f64 = 400.0; // Height for toolbar + popup panels

/// Debug mode window dimensions (larger for Next.js debug info)
#[cfg(debug_assertions)]
const DEBUG_TOOLBAR_WIDTH: f64 = 800.0;
#[cfg(debug_assertions)]
const DEBUG_TOOLBAR_HEIGHT: f64 = 700.0; // Extra height for dev overlay

/// Get current toolbar dimensions based on build mode
#[inline]
fn get_current_dimensions() -> (f64, f64) {
    #[cfg(debug_assertions)]
    {
        (DEBUG_TOOLBAR_WIDTH, DEBUG_TOOLBAR_HEIGHT)
    }
    #[cfg(not(debug_assertions))]
    {
        (TOOLBAR_WIDTH, TOOLBAR_HEIGHT)
    }
}

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
    /// Guard to prevent concurrent window creation
    creation_lock: Arc<Mutex<()>>,
}

impl ToolbarWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        log::debug!("[ToolbarWindow] Creating new instance");
        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
            position: Arc::new(RwLock::new((0, 0))),
            selected_text: Arc::new(RwLock::new(None)),
            auto_hide_ms: Arc::new(RwLock::new(DEFAULT_AUTO_HIDE_MS)),
            auto_hide_cancel: Arc::new(RwLock::new(None)),
            last_shown: Arc::new(RwLock::new(None)),
            is_hovered: Arc::new(AtomicBool::new(false)),
            creation_lock: Arc::new(Mutex::new(())),
        }
    }

    /// Set auto-hide timeout (0 to disable)
    pub fn set_auto_hide_timeout(&self, ms: u64) {
        *self.auto_hide_ms.write() = ms;
        log::debug!("[ToolbarWindow] Auto-hide timeout set to {}ms", ms);
    }

    /// Get auto-hide timeout
    pub fn get_auto_hide_timeout(&self) -> u64 {
        *self.auto_hide_ms.read()
    }

    /// Set hover state (called from frontend)
    pub fn set_hovered(&self, hovered: bool) {
        log::trace!("[ToolbarWindow] set_hovered: {}", hovered);
        self.is_hovered.store(hovered, Ordering::SeqCst);
        if hovered {
            // Cancel any pending auto-hide when mouse enters
            log::trace!("[ToolbarWindow] Mouse entered, cancelling auto-hide");
            self.cancel_auto_hide();
        } else if self.is_visible() {
            // Restart auto-hide timer when mouse leaves
            log::trace!("[ToolbarWindow] Mouse left, scheduling auto-hide");
            self.schedule_auto_hide();
        }
    }

    /// Cancel pending auto-hide
    fn cancel_auto_hide(&self) {
        if let Some(token) = self.auto_hide_cancel.write().take() {
            log::trace!("[ToolbarWindow] Cancelling auto-hide timer");
            token.cancel();
        }
    }

    /// Schedule auto-hide if enabled
    fn schedule_auto_hide(&self) {
        let timeout_ms = *self.auto_hide_ms.read();
        if timeout_ms == 0 {
            log::trace!("[ToolbarWindow] Auto-hide disabled (timeout=0)");
            return;
        }

        log::trace!("[ToolbarWindow] Scheduling auto-hide in {}ms", timeout_ms);
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
                        log::debug!("[ToolbarWindow] Auto-hidden after {}ms", timeout_ms);
                    }
                    // Clear the cancel token
                    *auto_hide_cancel.write() = None;
                }
            }
        });
    }

    /// Create the toolbar window if it doesn't exist
    pub fn ensure_window_exists(&self) -> Result<(), String> {
        // Acquire lock to prevent concurrent window creation
        let _guard = self.creation_lock.lock();
        
        // Double-check after acquiring lock
        if self
            .app_handle
            .get_webview_window(TOOLBAR_WINDOW_LABEL)
            .is_some()
        {
            log::trace!("[ToolbarWindow] Window already exists");
            return Ok(());
        }

        log::debug!("[ToolbarWindow] Creating toolbar window");

        // Use larger dimensions in debug mode for Next.js dev overlay
        #[cfg(debug_assertions)]
        let (width, height) = (DEBUG_TOOLBAR_WIDTH, DEBUG_TOOLBAR_HEIGHT);
        #[cfg(not(debug_assertions))]
        let (width, height) = (TOOLBAR_WIDTH, TOOLBAR_HEIGHT);

        let window = WebviewWindowBuilder::new(
            &self.app_handle,
            TOOLBAR_WINDOW_LABEL,
            WebviewUrl::App("selection-toolbar".into()),
        )
        .title("")
        .inner_size(width, height)
        .decorations(false)
        .transparent(true) // Enable transparent window for click-through
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(cfg!(debug_assertions)) // Allow resize in debug mode
        .visible(false)
        .focused(false)
        .shadow(false) // Disable shadow for transparent window
        .build()
        .map_err(|e| format!("Failed to create toolbar window: {}", e))?;

        // Set up window event handlers
        let is_visible = self.is_visible.clone();
        let selected_text = self.selected_text.clone();
        let is_hovered = self.is_hovered.clone();
        let auto_hide_cancel = self.auto_hide_cancel.clone();
        
        window.on_window_event(move |event| match event {
            tauri::WindowEvent::Destroyed => {
                // Window was destroyed, reset state
                is_visible.store(false, Ordering::SeqCst);
                is_hovered.store(false, Ordering::SeqCst);
                *selected_text.write() = None;
                // Cancel any pending auto-hide
                if let Some(token) = auto_hide_cancel.write().take() {
                    token.cancel();
                }
                log::debug!("[ToolbarWindow] Window destroyed");
            }
            _ => {}
        });

        log::info!(
            "[ToolbarWindow] Window created successfully ({}x{})",
            width,
            height
        );
        Ok(())
    }

    /// Show the toolbar at the specified position
    pub fn show(&self, x: i32, y: i32, text: String) -> Result<(), String> {
        let text_len = text.len();
        log::debug!(
            "[ToolbarWindow] show() called at ({}, {}) with {} chars",
            x,
            y,
            text_len
        );

        self.ensure_window_exists()?;

        let window = self
            .app_handle
            .get_webview_window(TOOLBAR_WINDOW_LABEL)
            .ok_or_else(|| {
                log::error!("[ToolbarWindow] Window not found after ensure_window_exists");
                "Toolbar window not found"
            })?;

        // Calculate position (above the mouse cursor with some offset)
        let (adjusted_x, adjusted_y) = self.calculate_position(x, y);
        log::trace!(
            "[ToolbarWindow] Position adjusted: ({}, {}) -> ({}, {})",
            x,
            y,
            adjusted_x,
            adjusted_y
        );

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
            .map_err(|e| {
                log::error!("[ToolbarWindow] Failed to set position: {}", e);
                format!("Failed to set position: {}", e)
            })?;

        window.show().map_err(|e| {
            log::error!("[ToolbarWindow] Failed to show window: {}", e);
            format!("Failed to show window: {}", e)
        })?;

        // Note: We intentionally don't call set_focus() here to avoid stealing focus
        // from the application where text was selected, which would lose the selection.
        // The window is already always_on_top so it will be visible.

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
            .map_err(|e| {
                log::error!("[ToolbarWindow] Failed to emit show event: {}", e);
                format!("Failed to emit event: {}", e)
            })?;

        self.is_visible.store(true, Ordering::SeqCst);

        // Schedule auto-hide if enabled
        self.schedule_auto_hide();

        log::info!(
            "[ToolbarWindow] Shown at ({}, {}) with {} chars",
            adjusted_x,
            adjusted_y,
            text_len
        );
        Ok(())
    }

    /// Update toolbar position without changing text
    pub fn update_position(&self, x: i32, y: i32) -> Result<(), String> {
        if !self.is_visible() {
            log::trace!("[ToolbarWindow] update_position: toolbar not visible, skipping");
            return Ok(());
        }

        log::trace!("[ToolbarWindow] update_position to ({}, {})", x, y);

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
            .map_err(|e| {
                log::error!("[ToolbarWindow] Failed to update position: {}", e);
                format!("Failed to set position: {}", e)
            })?;

        log::trace!(
            "[ToolbarWindow] Position updated to ({}, {})",
            adjusted_x,
            adjusted_y
        );
        Ok(())
    }

    /// Internal hide implementation
    fn hide_internal(&self, reason: &str) -> Result<(), String> {
        if !self.is_visible.load(Ordering::SeqCst) {
            log::trace!("[ToolbarWindow] hide_internal: already hidden");
            return Ok(());
        }

        log::debug!("[ToolbarWindow] Hiding toolbar (reason: {})", reason);
        // Cancel any pending auto-hide
        self.cancel_auto_hide();

        if let Some(window) = self.app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL) {
            window.hide().map_err(|e| {
                log::error!("[ToolbarWindow] Failed to hide window: {}", e);
                format!("Failed to hide window: {}", e)
            })?;
        } else {
            log::trace!("[ToolbarWindow] Window not found, nothing to hide");
        }

        // Get the text that was selected before clearing
        let previous_text = self.selected_text.read().clone();

        // Emit event to frontend with context
        let _ = self.app_handle.emit(
            "selection-toolbar-hide",
            serde_json::json!({
                "reason": reason,
                "hadText": previous_text.is_some(),
            }),
        );

        // Reset state
        self.is_visible.store(false, Ordering::SeqCst);
        *self.selected_text.write() = None;
        self.is_hovered.store(false, Ordering::SeqCst);

        log::info!("[ToolbarWindow] Hidden (reason: {})", reason);
        Ok(())
    }

    /// Hide the toolbar
    pub fn hide(&self) -> Result<(), String> {
        self.hide_internal("manual")
    }

    /// Hide the toolbar with a specific reason
    pub fn hide_with_reason(&self, reason: &str) -> Result<(), String> {
        self.hide_internal(reason)
    }

    /// Calculate the best position for the toolbar
    fn calculate_position(&self, mouse_x: i32, mouse_y: i32) -> (i32, i32) {
        log::trace!(
            "[ToolbarWindow] calculate_position for mouse ({}, {})",
            mouse_x,
            mouse_y
        );
        // Get current window dimensions based on build mode
        let (toolbar_width, toolbar_height) = get_current_dimensions();

        // Get screen dimensions for the monitor containing the cursor
        let (screen_width, screen_height, screen_x, screen_y) =
            self.get_monitor_at_point(mouse_x, mouse_y);
        log::trace!(
            "[ToolbarWindow] Monitor info: size={}x{}, offset=({}, {}), toolbar: {}x{}",
            screen_width,
            screen_height,
            screen_x,
            screen_y,
            toolbar_width,
            toolbar_height
        );

        // Position toolbar above and centered on the mouse cursor
        let toolbar_x = (mouse_x as f64 - toolbar_width / 2.0) as i32;
        let toolbar_y = mouse_y - toolbar_height as i32 - CURSOR_OFFSET_Y;

        // Calculate bounds relative to the current monitor
        let min_x = screen_x + SCREEN_EDGE_PADDING;
        let max_x = screen_x + screen_width - toolbar_width as i32 - SCREEN_EDGE_PADDING;
        let min_y = screen_y + SCREEN_EDGE_PADDING;
        let max_y = screen_y + screen_height - toolbar_height as i32 - SCREEN_EDGE_PADDING;

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
        self.last_shown
            .read()
            .map(|t| t.elapsed().as_millis() as u64)
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
    
    /// Destroy the toolbar window and clean up resources
    pub fn destroy(&self) -> Result<(), String> {
        log::debug!("[ToolbarWindow] destroy() called");
        
        // Cancel any pending auto-hide
        self.cancel_auto_hide();
        
        if let Some(window) = self.app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL) {
            // Hide first to avoid visual glitch
            let _ = window.hide();
            window
                .destroy()
                .map_err(|e| format!("Failed to destroy toolbar window: {}", e))?;
        }
        
        // Reset state
        self.is_visible.store(false, Ordering::SeqCst);
        self.is_hovered.store(false, Ordering::SeqCst);
        *self.selected_text.write() = None;
        
        log::info!("[ToolbarWindow] Window destroyed");
        Ok(())
    }
    
    /// Sync visibility state with actual window state
    pub fn sync_visibility(&self) {
        let actual_visible = self
            .app_handle
            .get_webview_window(TOOLBAR_WINDOW_LABEL)
            .map(|w| w.is_visible().unwrap_or(false))
            .unwrap_or(false);
        
        let stored_visible = self.is_visible.load(Ordering::SeqCst);
        
        if actual_visible != stored_visible {
            log::warn!(
                "[ToolbarWindow] Visibility state mismatch: stored={}, actual={}. Syncing.",
                stored_visible,
                actual_visible
            );
            self.is_visible.store(actual_visible, Ordering::SeqCst);
            
            // If not visible, clear selected text
            if !actual_visible {
                *self.selected_text.write() = None;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toolbar_window_label_constant() {
        assert_eq!(TOOLBAR_WINDOW_LABEL, "selection-toolbar");
    }

    #[test]
    fn test_toolbar_dimensions_constants() {
        // Production dimensions
        assert_eq!(TOOLBAR_WIDTH, 560.0);
        assert_eq!(TOOLBAR_HEIGHT, 380.0);

        // Debug dimensions (only in debug builds)
        #[cfg(debug_assertions)]
        {
            assert_eq!(DEBUG_TOOLBAR_WIDTH, 800.0);
            assert_eq!(DEBUG_TOOLBAR_HEIGHT, 700.0);
        }
    }

    #[test]
    fn test_default_auto_hide_ms_constant() {
        // Default is disabled (0)
        assert_eq!(DEFAULT_AUTO_HIDE_MS, 0);
    }

    #[test]
    fn test_screen_edge_padding_constant() {
        assert_eq!(SCREEN_EDGE_PADDING, 10);
    }

    #[test]
    fn test_cursor_offset_y_constant() {
        assert_eq!(CURSOR_OFFSET_Y, 10);
    }

    // Note: ToolbarWindow requires a Tauri AppHandle which cannot be easily created in unit tests.
    // The following tests would require integration testing with a Tauri runtime.
    // However, we can test the logic patterns and constants.

    #[test]
    fn test_position_calculation_logic() {
        // Test the position calculation formula
        let mouse_x: i32 = 500;
        let mouse_y: i32 = 600;

        // Get current dimensions (varies by build mode)
        let (toolbar_width, toolbar_height) = get_current_dimensions();

        // Calculate expected position (formula from calculate_position)
        let toolbar_x = (mouse_x as f64 - toolbar_width / 2.0) as i32;
        let toolbar_y = mouse_y - toolbar_height as i32 - CURSOR_OFFSET_Y;

        // Toolbar should be centered above cursor
        // In debug: 800/2 = 400, so 500 - 400 = 100
        // In release: 560/2 = 280, so 500 - 280 = 220
        #[cfg(debug_assertions)]
        assert_eq!(toolbar_x, 100);
        #[cfg(not(debug_assertions))]
        assert_eq!(toolbar_x, 220);

        // In debug: 600 - 700 - 10 = -110 (would be clamped)
        // In release: 600 - 380 - 10 = 210
        #[cfg(debug_assertions)]
        assert_eq!(toolbar_y, -110);
        #[cfg(not(debug_assertions))]
        assert_eq!(toolbar_y, 210);
    }

    #[test]
    fn test_position_bounds_logic() {
        // Simulate bounds checking logic
        let screen_width = 1920;
        let screen_height = 1080;
        let screen_x = 0;
        let screen_y = 0;

        // Get current dimensions (varies by build mode)
        let (toolbar_width, toolbar_height) = get_current_dimensions();

        let min_x = screen_x + SCREEN_EDGE_PADDING;
        let max_x = screen_x + screen_width - toolbar_width as i32 - SCREEN_EDGE_PADDING;
        let min_y = screen_y + SCREEN_EDGE_PADDING;
        let max_y = screen_y + screen_height - toolbar_height as i32 - SCREEN_EDGE_PADDING;

        assert_eq!(min_x, 10);
        assert_eq!(min_y, 10);

        // In debug: 1920 - 800 - 10 = 1110
        // In release: 1920 - 560 - 10 = 1350
        #[cfg(debug_assertions)]
        assert_eq!(max_x, 1110);
        #[cfg(not(debug_assertions))]
        assert_eq!(max_x, 1350);

        // In debug: 1080 - 700 - 10 = 370
        // In release: 1080 - 380 - 10 = 690
        #[cfg(debug_assertions)]
        assert_eq!(max_y, 370);
        #[cfg(not(debug_assertions))]
        assert_eq!(max_y, 690);
    }

    #[test]
    fn test_toolbar_below_cursor_when_near_top() {
        // When not enough space above, toolbar should go below cursor
        let (toolbar_width, toolbar_height) = get_current_dimensions();
        let _ = toolbar_width; // Unused but good to verify it's accessible

        // Use a position that would be near top in any build mode
        let mouse_y: i32 = 50;
        let toolbar_y = mouse_y - toolbar_height as i32 - CURSOR_OFFSET_Y;
        let min_y = SCREEN_EDGE_PADDING;

        // toolbar_y would be negative in both modes
        assert!(toolbar_y < min_y);

        // In this case, toolbar should be below cursor (mouse_y + 20)
        let adjusted_y = mouse_y + 20;
        assert_eq!(adjusted_y, 70);
    }

    #[test]
    fn test_position_clamp_left_edge() {
        // Test clamping when toolbar would go off left edge
        let (toolbar_width, _) = get_current_dimensions();

        let mouse_x: i32 = 50;
        let toolbar_x = (mouse_x as f64 - toolbar_width / 2.0) as i32;
        let min_x = SCREEN_EDGE_PADDING;

        // Should be negative regardless of build mode (50 - half of width)
        assert!(toolbar_x < min_x);
        let adjusted_x = toolbar_x.max(min_x);
        assert_eq!(adjusted_x, min_x);
    }

    #[test]
    fn test_position_clamp_right_edge() {
        // Test clamping when toolbar would go off right edge
        let (toolbar_width, _) = get_current_dimensions();

        let screen_width = 1920;
        let mouse_x: i32 = 1900;
        let toolbar_x = (mouse_x as f64 - toolbar_width / 2.0) as i32;
        let max_x = screen_width - toolbar_width as i32 - SCREEN_EDGE_PADDING;

        // Should exceed max_x in both modes
        assert!(toolbar_x > max_x);
        let adjusted_x = toolbar_x.min(max_x);
        assert_eq!(adjusted_x, max_x);
    }

    #[test]
    fn test_atomic_bool_visibility_pattern() {
        // Test the pattern used for is_visible
        let is_visible = Arc::new(AtomicBool::new(false));

        assert!(!is_visible.load(Ordering::SeqCst));

        is_visible.store(true, Ordering::SeqCst);
        assert!(is_visible.load(Ordering::SeqCst));

        is_visible.store(false, Ordering::SeqCst);
        assert!(!is_visible.load(Ordering::SeqCst));
    }

    #[test]
    fn test_atomic_bool_hovered_pattern() {
        // Test the pattern used for is_hovered
        let is_hovered = Arc::new(AtomicBool::new(false));

        assert!(!is_hovered.load(Ordering::SeqCst));

        is_hovered.store(true, Ordering::SeqCst);
        assert!(is_hovered.load(Ordering::SeqCst));
    }

    #[test]
    fn test_position_rwlock_pattern() {
        // Test the pattern used for position storage
        let position: Arc<RwLock<(i32, i32)>> = Arc::new(RwLock::new((0, 0)));

        assert_eq!(*position.read(), (0, 0));

        *position.write() = (100, 200);
        assert_eq!(*position.read(), (100, 200));
    }

    #[test]
    fn test_selected_text_rwlock_pattern() {
        // Test the pattern used for selected_text storage
        let selected_text: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));

        assert!(selected_text.read().is_none());

        *selected_text.write() = Some("test text".to_string());
        assert_eq!(*selected_text.read(), Some("test text".to_string()));

        *selected_text.write() = None;
        assert!(selected_text.read().is_none());
    }

    #[test]
    fn test_auto_hide_ms_rwlock_pattern() {
        // Test the pattern used for auto_hide_ms storage
        let auto_hide_ms: Arc<RwLock<u64>> = Arc::new(RwLock::new(DEFAULT_AUTO_HIDE_MS));

        assert_eq!(*auto_hide_ms.read(), 0);

        *auto_hide_ms.write() = 5000;
        assert_eq!(*auto_hide_ms.read(), 5000);
    }

    #[test]
    fn test_last_shown_instant_pattern() {
        // Test the pattern used for last_shown
        let last_shown: Arc<RwLock<Option<Instant>>> = Arc::new(RwLock::new(None));

        assert!(last_shown.read().is_none());

        let now = Instant::now();
        *last_shown.write() = Some(now);

        assert!(last_shown.read().is_some());

        // Duration since last shown should be small
        let elapsed = last_shown.read().map(|t| t.elapsed().as_millis());
        assert!(elapsed.is_some());
        assert!(elapsed.unwrap() < 1000); // Less than 1 second
    }

    #[test]
    fn test_visible_duration_calculation() {
        // Test duration calculation logic
        let last_shown: Arc<RwLock<Option<Instant>>> = Arc::new(RwLock::new(None));
        let is_visible = Arc::new(AtomicBool::new(false));

        // When not visible, duration should be None
        let duration = if !is_visible.load(Ordering::SeqCst) {
            None
        } else {
            last_shown.read().map(|t| t.elapsed().as_millis() as u64)
        };
        assert!(duration.is_none());

        // When visible with last_shown set
        is_visible.store(true, Ordering::SeqCst);
        *last_shown.write() = Some(Instant::now());

        let duration = if !is_visible.load(Ordering::SeqCst) {
            None
        } else {
            last_shown.read().map(|t| t.elapsed().as_millis() as u64)
        };
        assert!(duration.is_some());
    }

    #[test]
    fn test_toolbar_center_calculation() {
        // Test that toolbar is centered on cursor
        let (toolbar_width, _) = get_current_dimensions();
        let half_width = toolbar_width / 2.0;

        let test_positions = vec![
            (100, (100.0 - half_width) as i32),
            (500, (500.0 - half_width) as i32),
            (1000, (1000.0 - half_width) as i32),
        ];

        for (mouse_x, expected_x) in test_positions {
            let toolbar_x = (mouse_x as f64 - toolbar_width / 2.0) as i32;
            assert_eq!(toolbar_x, expected_x, "Failed for mouse_x={}", mouse_x);
        }
    }

    #[test]
    fn test_json_event_payload_format() {
        // Test the JSON payload format used in events
        let text = "selected text";
        let x = 100;
        let y = 200;

        let payload = serde_json::json!({
            "text": text,
            "x": x,
            "y": y,
            "textLength": text.len(),
        });

        assert_eq!(payload["text"], "selected text");
        assert_eq!(payload["x"], 100);
        assert_eq!(payload["y"], 200);
        assert_eq!(payload["textLength"], 13);
    }

    #[test]
    fn test_hide_event_payload_format() {
        // Test the JSON payload format for hide events
        let reason = "manual";
        let had_text = true;

        let payload = serde_json::json!({
            "reason": reason,
            "hadText": had_text,
        });

        assert_eq!(payload["reason"], "manual");
        assert_eq!(payload["hadText"], true);
    }

    #[test]
    fn test_cancellation_token_pattern() {
        // Test the cancellation token pattern used for auto-hide
        let auto_hide_cancel: Arc<RwLock<Option<CancellationToken>>> = Arc::new(RwLock::new(None));

        // Initially no token
        assert!(auto_hide_cancel.read().is_none());

        // Create and store token
        let token = CancellationToken::new();
        *auto_hide_cancel.write() = Some(token.clone());

        assert!(auto_hide_cancel.read().is_some());

        // Cancel the token
        if let Some(t) = auto_hide_cancel.write().take() {
            t.cancel();
        }

        // Token should be cancelled and removed
        assert!(token.is_cancelled());
        assert!(auto_hide_cancel.read().is_none());
    }

    #[test]
    fn test_multi_monitor_bounds() {
        // Test bounds calculation for multi-monitor setups
        let (toolbar_width, toolbar_height) = get_current_dimensions();

        // Monitor 1: 0,0 to 1920,1080
        // Monitor 2: 1920,0 to 3840,1080

        let scenarios = vec![
            // (screen_x, screen_y, screen_width, screen_height, mouse_x, mouse_y)
            (0, 0, 1920, 1080, 500, 600),     // Primary monitor
            (1920, 0, 1920, 1080, 2500, 600), // Secondary monitor
            (0, 1080, 1920, 1080, 500, 1500), // Monitor below
        ];

        for (screen_x, screen_y, screen_width, screen_height, mouse_x, mouse_y) in scenarios {
            let min_x = screen_x + SCREEN_EDGE_PADDING;
            let max_x = screen_x + screen_width - toolbar_width as i32 - SCREEN_EDGE_PADDING;
            let min_y = screen_y + SCREEN_EDGE_PADDING;
            let max_y = screen_y + screen_height - toolbar_height as i32 - SCREEN_EDGE_PADDING;

            // Mouse should be within screen bounds
            assert!(mouse_x >= screen_x && mouse_x < screen_x + screen_width);
            assert!(mouse_y >= screen_y && mouse_y < screen_y + screen_height);

            // Bounds should be valid
            assert!(min_x < max_x);
            assert!(min_y < max_y);
        }
    }

    #[test]
    #[ignore = "requires tauri test feature"]
    fn test_auto_hide_timeout_roundtrip() {
        // This test requires the tauri "test" feature to be enabled
        // Run with: cargo test --features test
    }

    #[test]
    #[ignore = "requires tauri test feature"]
    fn test_hide_is_noop_when_invisible() {
        // This test requires the tauri "test" feature to be enabled
        // Run with: cargo test --features test
    }
}
