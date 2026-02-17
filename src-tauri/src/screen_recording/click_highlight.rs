//! Recording click highlight overlay window management.
//!
//! Shows a transparent overlay during recording and emits click highlight events
//! that the frontend renders as transient ripple animations.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Click highlight overlay window label.
pub const RECORDING_CLICK_OVERLAY_LABEL: &str = "recording-click-overlay";

/// Overlay manager for recording click highlights.
pub struct RecordingClickOverlay {
    app_handle: AppHandle,
    is_visible: Arc<AtomicBool>,
}

impl RecordingClickOverlay {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
        }
    }

    fn ensure_window_exists(&self) -> Result<(), String> {
        if self
            .app_handle
            .get_webview_window(RECORDING_CLICK_OVERLAY_LABEL)
            .is_some()
        {
            return Ok(());
        }

        let window = WebviewWindowBuilder::new(
            &self.app_handle,
            RECORDING_CLICK_OVERLAY_LABEL,
            WebviewUrl::App("recording-click-overlay".into()),
        )
        .title("")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .focused(false)
        .visible(false)
        .shadow(false)
        .build()
        .map_err(|e| format!("Failed to create recording click overlay: {}", e))?;

        let _ = window.set_ignore_cursor_events(true);
        Ok(())
    }

    pub fn show(&self) -> Result<(), String> {
        self.ensure_window_exists()?;
        if let Some(window) = self
            .app_handle
            .get_webview_window(RECORDING_CLICK_OVERLAY_LABEL)
        {
            window
                .show()
                .map_err(|e| format!("Failed to show recording click overlay: {}", e))?;
            let _ = window.set_always_on_top(true);
            let _ = window.set_ignore_cursor_events(true);
            self.is_visible.store(true, Ordering::SeqCst);
            let _ = self.app_handle.emit("recording-click-highlight://show", ());
        }
        Ok(())
    }

    pub fn hide(&self) -> Result<(), String> {
        if let Some(window) = self
            .app_handle
            .get_webview_window(RECORDING_CLICK_OVERLAY_LABEL)
        {
            window
                .hide()
                .map_err(|e| format!("Failed to hide recording click overlay: {}", e))?;
        }
        self.is_visible.store(false, Ordering::SeqCst);
        let _ = self.app_handle.emit("recording-click-highlight://hide", ());
        Ok(())
    }

    pub fn is_visible(&self) -> bool {
        self.is_visible.load(Ordering::SeqCst)
    }

    pub fn emit_click(&self, x: f64, y: f64) {
        let _ = self.app_handle.emit(
            "recording-click-highlight://click",
            serde_json::json!({
                "x": x,
                "y": y,
                "timestamp": chrono::Utc::now().timestamp_millis(),
            }),
        );
    }

    pub fn destroy(&self) -> Result<(), String> {
        if let Some(window) = self
            .app_handle
            .get_webview_window(RECORDING_CLICK_OVERLAY_LABEL)
        {
            window
                .destroy()
                .map_err(|e| format!("Failed to destroy recording click overlay: {}", e))?;
        }
        self.is_visible.store(false, Ordering::SeqCst);
        Ok(())
    }
}
