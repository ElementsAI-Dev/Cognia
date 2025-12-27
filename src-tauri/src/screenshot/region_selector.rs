//! Region selection overlay
//!
//! Provides an interactive overlay for selecting a screen region to capture.

use super::CaptureRegion;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Emitter, Listener};
use tokio::sync::oneshot;
use std::sync::Arc;
use parking_lot::Mutex;

/// Region selector window label
const REGION_SELECTOR_LABEL: &str = "region-selector";

/// Region selector for interactive screen region selection
pub struct RegionSelector;

impl RegionSelector {
    /// Start interactive region selection
    /// Returns the selected region or an error if cancelled
    pub async fn select_region(app_handle: &AppHandle) -> Result<CaptureRegion, String> {
        // Create a channel to receive the selection result
        let (tx, rx) = oneshot::channel::<Result<CaptureRegion, String>>();
        let tx = Arc::new(Mutex::new(Some(tx)));

        // Close any existing selector window
        if let Some(window) = app_handle.get_webview_window(REGION_SELECTOR_LABEL) {
            let _ = window.close();
        }

        // Get virtual screen dimensions (all monitors)
        let (screen_x, screen_y, screen_width, screen_height) = get_virtual_screen_bounds();

        // Create fullscreen transparent overlay window
        let window = WebviewWindowBuilder::new(
            app_handle,
            REGION_SELECTOR_LABEL,
            WebviewUrl::App("region-selector".into()),
        )
        .title("")
        .position(screen_x as f64, screen_y as f64)
        .inner_size(screen_width as f64, screen_height as f64)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .focused(true)
        .build()
        .map_err(|e| format!("Failed to create region selector window: {}", e))?;

        // Set up event listeners
        let tx_clone = tx.clone();
        let app_handle_clone = app_handle.clone();
        
        // Listen for region selection completion
        let _listener = app_handle.listen("region-selected", move |event| {
            let payload_str = event.payload();
            if let Ok(payload) = serde_json::from_str::<CaptureRegion>(payload_str) {
                if let Some(sender) = tx_clone.lock().take() {
                    let _ = sender.send(Ok(payload));
                }
                // Close the selector window
                if let Some(window) = app_handle_clone.get_webview_window(REGION_SELECTOR_LABEL) {
                    let _ = window.close();
                }
            }
        });

        let tx_clone = tx.clone();
        let app_handle_clone = app_handle.clone();
        
        // Listen for cancellation
        let _cancel_listener = app_handle.listen("region-selection-cancelled", move |_| {
            if let Some(sender) = tx_clone.lock().take() {
                let _ = sender.send(Err("Selection cancelled".to_string()));
            }
            if let Some(window) = app_handle_clone.get_webview_window(REGION_SELECTOR_LABEL) {
                let _ = window.close();
            }
        });

        // Emit event to notify frontend that selection is ready
        let _ = app_handle.emit("region-selection-started", serde_json::json!({
            "screenX": screen_x,
            "screenY": screen_y,
            "screenWidth": screen_width,
            "screenHeight": screen_height,
        }));

        // Wait for selection result
        match rx.await {
            Ok(result) => result,
            Err(_) => Err("Selection channel closed unexpectedly".to_string()),
        }
    }
}

/// Get virtual screen bounds (all monitors combined)
#[cfg(target_os = "windows")]
fn get_virtual_screen_bounds() -> (i32, i32, u32, u32) {
    use windows::Win32::UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_XVIRTUALSCREEN, SM_YVIRTUALSCREEN,
        SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN,
    };

    unsafe {
        let x = GetSystemMetrics(SM_XVIRTUALSCREEN);
        let y = GetSystemMetrics(SM_YVIRTUALSCREEN);
        let width = GetSystemMetrics(SM_CXVIRTUALSCREEN) as u32;
        let height = GetSystemMetrics(SM_CYVIRTUALSCREEN) as u32;
        (x, y, width, height)
    }
}

#[cfg(not(target_os = "windows"))]
fn get_virtual_screen_bounds() -> (i32, i32, u32, u32) {
    // Default fallback
    (0, 0, 1920, 1080)
}

/// Mouse tracking state for region selection
#[derive(Debug, Clone, Default)]
pub struct SelectionState {
    /// Whether selection is in progress
    pub is_selecting: bool,
    /// Start point of selection
    pub start_x: i32,
    pub start_y: i32,
    /// Current point of selection
    pub current_x: i32,
    pub current_y: i32,
}

impl SelectionState {
    /// Get the normalized region (handles negative width/height)
    pub fn get_region(&self) -> CaptureRegion {
        let x = self.start_x.min(self.current_x);
        let y = self.start_y.min(self.current_y);
        let width = (self.start_x - self.current_x).unsigned_abs();
        let height = (self.start_y - self.current_y).unsigned_abs();

        CaptureRegion { x, y, width, height }
    }

    /// Check if the selection is valid (has non-zero area)
    pub fn is_valid(&self) -> bool {
        let region = self.get_region();
        region.width > 10 && region.height > 10
    }
}
