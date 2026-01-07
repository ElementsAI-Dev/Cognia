//! Region selection overlay
//!
//! Provides an interactive overlay for selecting a screen region to capture.

use super::CaptureRegion;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::oneshot;

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
        let _ = app_handle.emit(
            "region-selection-started",
            serde_json::json!({
                "screenX": screen_x,
                "screenY": screen_y,
                "screenWidth": screen_width,
                "screenHeight": screen_height,
            }),
        );

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
        GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN,
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

        CaptureRegion {
            x,
            y,
            width,
            height,
        }
    }

    /// Check if the selection is valid (has non-zero area)
    pub fn is_valid(&self) -> bool {
        let region = self.get_region();
        region.width > 10 && region.height > 10
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== SelectionState Tests ====================

    #[test]
    fn test_selection_state_default() {
        let state = SelectionState::default();

        assert!(!state.is_selecting);
        assert_eq!(state.start_x, 0);
        assert_eq!(state.start_y, 0);
        assert_eq!(state.current_x, 0);
        assert_eq!(state.current_y, 0);
    }

    #[test]
    fn test_selection_state_creation() {
        let state = SelectionState {
            is_selecting: true,
            start_x: 100,
            start_y: 100,
            current_x: 200,
            current_y: 200,
        };

        assert!(state.is_selecting);
        assert_eq!(state.start_x, 100);
        assert_eq!(state.start_y, 100);
        assert_eq!(state.current_x, 200);
        assert_eq!(state.current_y, 200);
    }

    #[test]
    fn test_selection_state_get_region_normal() {
        let state = SelectionState {
            is_selecting: true,
            start_x: 50,
            start_y: 50,
            current_x: 150,
            current_y: 100,
        };

        let region = state.get_region();

        assert_eq!(region.x, 50);
        assert_eq!(region.y, 50);
        assert_eq!(region.width, 100);
        assert_eq!(region.height, 50);
    }

    #[test]
    fn test_selection_state_get_region_reversed_x() {
        // Start from right, drag to left
        let state = SelectionState {
            is_selecting: true,
            start_x: 200,
            start_y: 50,
            current_x: 100,
            current_y: 150,
        };

        let region = state.get_region();

        // Should normalize to top-left origin
        assert_eq!(region.x, 100);
        assert_eq!(region.y, 50);
        assert_eq!(region.width, 100);
        assert_eq!(region.height, 100);
    }

    #[test]
    fn test_selection_state_get_region_reversed_y() {
        // Start from bottom, drag to top
        let state = SelectionState {
            is_selecting: true,
            start_x: 50,
            start_y: 200,
            current_x: 150,
            current_y: 100,
        };

        let region = state.get_region();

        assert_eq!(region.x, 50);
        assert_eq!(region.y, 100);
        assert_eq!(region.width, 100);
        assert_eq!(region.height, 100);
    }

    #[test]
    fn test_selection_state_get_region_reversed_both() {
        // Start from bottom-right, drag to top-left
        let state = SelectionState {
            is_selecting: true,
            start_x: 300,
            start_y: 300,
            current_x: 100,
            current_y: 100,
        };

        let region = state.get_region();

        assert_eq!(region.x, 100);
        assert_eq!(region.y, 100);
        assert_eq!(region.width, 200);
        assert_eq!(region.height, 200);
    }

    #[test]
    fn test_selection_state_get_region_negative_coordinates() {
        let state = SelectionState {
            is_selecting: true,
            start_x: -100,
            start_y: -50,
            current_x: 100,
            current_y: 50,
        };

        let region = state.get_region();

        assert_eq!(region.x, -100);
        assert_eq!(region.y, -50);
        assert_eq!(region.width, 200);
        assert_eq!(region.height, 100);
    }

    #[test]
    fn test_selection_state_get_region_same_point() {
        let state = SelectionState {
            is_selecting: true,
            start_x: 100,
            start_y: 100,
            current_x: 100,
            current_y: 100,
        };

        let region = state.get_region();

        assert_eq!(region.width, 0);
        assert_eq!(region.height, 0);
    }

    #[test]
    fn test_selection_state_is_valid_true() {
        let state = SelectionState {
            is_selecting: true,
            start_x: 0,
            start_y: 0,
            current_x: 100,
            current_y: 100,
        };

        assert!(state.is_valid());
    }

    #[test]
    fn test_selection_state_is_valid_false_small() {
        // Width and height less than 10
        let state = SelectionState {
            is_selecting: true,
            start_x: 0,
            start_y: 0,
            current_x: 5,
            current_y: 5,
        };

        assert!(!state.is_valid());
    }

    #[test]
    fn test_selection_state_is_valid_false_width_only() {
        // Only width is large enough
        let state = SelectionState {
            is_selecting: true,
            start_x: 0,
            start_y: 0,
            current_x: 100,
            current_y: 5,
        };

        assert!(!state.is_valid());
    }

    #[test]
    fn test_selection_state_is_valid_false_height_only() {
        // Only height is large enough
        let state = SelectionState {
            is_selecting: true,
            start_x: 0,
            start_y: 0,
            current_x: 5,
            current_y: 100,
        };

        assert!(!state.is_valid());
    }

    #[test]
    fn test_selection_state_is_valid_boundary() {
        // Exactly at boundary (width = 11, height = 11)
        let state = SelectionState {
            is_selecting: true,
            start_x: 0,
            start_y: 0,
            current_x: 11,
            current_y: 11,
        };

        assert!(state.is_valid());
    }

    #[test]
    fn test_selection_state_is_valid_at_boundary() {
        // Exactly at boundary (width = 10, height = 10) - should be invalid
        let state = SelectionState {
            is_selecting: true,
            start_x: 0,
            start_y: 0,
            current_x: 10,
            current_y: 10,
        };

        assert!(!state.is_valid());
    }

    #[test]
    fn test_selection_state_clone() {
        let state = SelectionState {
            is_selecting: true,
            start_x: 10,
            start_y: 20,
            current_x: 30,
            current_y: 40,
        };
        let cloned = state.clone();

        assert_eq!(state.is_selecting, cloned.is_selecting);
        assert_eq!(state.start_x, cloned.start_x);
        assert_eq!(state.start_y, cloned.start_y);
        assert_eq!(state.current_x, cloned.current_x);
        assert_eq!(state.current_y, cloned.current_y);
    }

    #[test]
    fn test_selection_state_debug() {
        let state = SelectionState {
            is_selecting: true,
            start_x: 100,
            start_y: 200,
            current_x: 300,
            current_y: 400,
        };

        let debug_str = format!("{:?}", state);
        assert!(debug_str.contains("SelectionState"));
        assert!(debug_str.contains("is_selecting: true"));
        assert!(debug_str.contains("100"));
    }

    // ==================== get_virtual_screen_bounds Tests ====================

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_get_virtual_screen_bounds_fallback() {
        let (x, y, width, height) = get_virtual_screen_bounds();

        assert_eq!(x, 0);
        assert_eq!(y, 0);
        assert_eq!(width, 1920);
        assert_eq!(height, 1080);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_get_virtual_screen_bounds_windows() {
        let (x, y, width, height) = get_virtual_screen_bounds();

        // On Windows, should return actual screen dimensions
        // Width and height should be positive
        assert!(width > 0);
        assert!(height > 0);
    }

    // ==================== REGION_SELECTOR_LABEL Tests ====================

    #[test]
    fn test_region_selector_label_constant() {
        assert_eq!(REGION_SELECTOR_LABEL, "region-selector");
    }
}
