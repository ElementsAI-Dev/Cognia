//! Floating toolbar window management
//!
//! Manages the creation, positioning, and visibility of the selection toolbar window.

use parking_lot::RwLock;
use std::sync::Arc;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Toolbar window label
pub const TOOLBAR_WINDOW_LABEL: &str = "selection-toolbar";

/// Toolbar window dimensions
const TOOLBAR_WIDTH: f64 = 240.0;
const TOOLBAR_HEIGHT: f64 = 56.0;

/// Floating toolbar window manager
pub struct ToolbarWindow {
    /// Tauri app handle
    app_handle: AppHandle,
    /// Whether the toolbar is currently visible
    is_visible: Arc<RwLock<bool>>,
    /// Current position
    position: Arc<RwLock<(i32, i32)>>,
    /// Current selected text
    selected_text: Arc<RwLock<Option<String>>>,
}

impl ToolbarWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_visible: Arc::new(RwLock::new(false)),
            position: Arc::new(RwLock::new((0, 0))),
            selected_text: Arc::new(RwLock::new(None)),
        }
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
        {
            let mut pos = self.position.write();
            *pos = (adjusted_x, adjusted_y);
        }
        {
            let mut selected = self.selected_text.write();
            *selected = Some(text.clone());
        }

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

        // Emit event to frontend
        self.app_handle
            .emit(
                "selection-toolbar-show",
                serde_json::json!({
                    "text": text,
                    "x": adjusted_x,
                    "y": adjusted_y,
                }),
            )
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        *self.is_visible.write() = true;
        log::debug!("Toolbar shown at ({}, {})", adjusted_x, adjusted_y);
        Ok(())
    }

    /// Hide the toolbar
    pub fn hide(&self) -> Result<(), String> {
        if !*self.is_visible.read() {
            return Ok(());
        }

        if let Some(window) = self.app_handle.get_webview_window(TOOLBAR_WINDOW_LABEL) {
            window
                .hide()
                .map_err(|e| format!("Failed to hide window: {}", e))?;
        }

        // Emit event to frontend
        let _ = self.app_handle.emit("selection-toolbar-hide", ());

        *self.is_visible.write() = false;
        *self.selected_text.write() = None;
        log::debug!("Toolbar hidden");
        Ok(())
    }

    /// Calculate the best position for the toolbar
    fn calculate_position(&self, mouse_x: i32, mouse_y: i32) -> (i32, i32) {
        // Get screen dimensions
        let (screen_width, screen_height) = self.get_screen_size();

        // Position toolbar above and centered on the mouse cursor
        let toolbar_x = (mouse_x as f64 - TOOLBAR_WIDTH / 2.0) as i32;
        let toolbar_y = mouse_y - TOOLBAR_HEIGHT as i32 - 10; // 10px above cursor

        // Ensure toolbar stays within screen bounds
        let adjusted_x = toolbar_x.max(10).min(screen_width - TOOLBAR_WIDTH as i32 - 10);
        let adjusted_y = if toolbar_y < 10 {
            // If not enough space above, show below
            mouse_y + 20
        } else {
            toolbar_y
        };

        (adjusted_x, adjusted_y.max(10).min(screen_height - TOOLBAR_HEIGHT as i32 - 10))
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
        *self.is_visible.read()
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
