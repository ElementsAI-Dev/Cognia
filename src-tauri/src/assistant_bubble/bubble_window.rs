use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Assistant bubble window label
pub const ASSISTANT_BUBBLE_WINDOW_LABEL: &str = "assistant-bubble";

/// Bubble window size (logical units)
const BUBBLE_SIZE: f64 = 56.0;
/// Distance from screen edge
const BUBBLE_PADDING: i32 = 16;

pub struct AssistantBubbleWindow {
    app_handle: AppHandle,
    is_visible: Arc<AtomicBool>,
    position: Arc<RwLock<Option<(i32, i32)>>>,
}

impl AssistantBubbleWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
            position: Arc::new(RwLock::new(None)),
        }
    }

    pub fn ensure_window_exists(&self) -> Result<(), String> {
        if self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
            .is_some()
        {
            return Ok(());
        }

        let window = WebviewWindowBuilder::new(
            &self.app_handle,
            ASSISTANT_BUBBLE_WINDOW_LABEL,
            WebviewUrl::App("assistant-bubble".into()),
        )
        .title("Cognia")
        .inner_size(BUBBLE_SIZE, BUBBLE_SIZE)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(true)
        .focused(false)
        .shadow(false)
        .build()
        .map_err(|e| format!("Failed to create assistant bubble window: {}", e))?;

        // Place bubble at bottom-right of primary work area
        let (x, y) = self.default_position();
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
        *self.position.write() = Some((x, y));

        let is_visible = self.is_visible.clone();
        let app_handle = self.app_handle.clone();
        window.on_window_event(move |event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // Keep the bubble alive for long-term use.
                api.prevent_close();
                // If a platform requests close anyway, re-show.
                if let Some(w) = app_handle.get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL) {
                    let _ = w.show();
                }
                is_visible.store(true, Ordering::SeqCst);
            }
            tauri::WindowEvent::Focused(_focused) => {
                // No-op; bubble should not interfere with focus management.
            }
            _ => {}
        });

        self.is_visible.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn show(&self) -> Result<(), String> {
        self.ensure_window_exists()?;
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            window
                .show()
                .map_err(|e| format!("Failed to show assistant bubble: {}", e))?;
            self.is_visible.store(true, Ordering::SeqCst);
        }
        Ok(())
    }

    fn default_position(&self) -> (i32, i32) {
        let (work_w, work_h, work_x, work_y) = self.get_primary_work_area();
        let size = BUBBLE_SIZE as i32;
        let x = work_x + work_w - size - BUBBLE_PADDING;
        let y = work_y + work_h - size - BUBBLE_PADDING;
        (x.max(work_x), y.max(work_y))
    }

    fn get_primary_work_area(&self) -> (i32, i32, i32, i32) {
        #[cfg(target_os = "windows")]
        {
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
                    let rect = info.rcWork; // excludes taskbar
                    return (
                        rect.right - rect.left,
                        rect.bottom - rect.top,
                        rect.left,
                        rect.top,
                    );
                }
            }
        }

        // Fallback
        (1920, 1080, 0, 0)
    }
}
