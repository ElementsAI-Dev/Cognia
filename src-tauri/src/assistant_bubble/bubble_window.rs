use parking_lot::{Mutex, RwLock};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// Assistant bubble window label
pub const ASSISTANT_BUBBLE_WINDOW_LABEL: &str = "assistant-bubble";

/// Bubble window size (logical units)
const BUBBLE_SIZE: f64 = 56.0;
/// Distance from screen edge
const BUBBLE_PADDING: i32 = 16;

/// Bubble configuration for persistence
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BubbleConfig {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub auto_hide: bool,
    pub remember_position: bool,
}

impl Default for BubbleConfig {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            auto_hide: false,
            remember_position: true,
        }
    }
}

pub struct AssistantBubbleWindow {
    app_handle: AppHandle,
    is_visible: Arc<AtomicBool>,
    /// Whether the window is minimized (folded)
    is_minimized: Arc<AtomicBool>,
    position: Arc<RwLock<Option<(i32, i32)>>>,
    config: Arc<RwLock<BubbleConfig>>,
    /// Guard to prevent concurrent window creation
    creation_lock: Arc<Mutex<()>>,
    /// Config file path for persistence
    config_path: PathBuf,
}

impl AssistantBubbleWindow {
    pub fn new(app_handle: AppHandle) -> Self {
        // Get config path from app data directory
        let config_path = app_handle
            .path()
            .app_data_dir()
            .map(|p| p.join("bubble_config.json"))
            .unwrap_or_else(|_| PathBuf::from("bubble_config.json"));
        
        // Try to load existing config
        let config = Self::load_config_from_file(&config_path).unwrap_or_default();
        let position = config.x.zip(config.y);
        
        Self {
            app_handle,
            is_visible: Arc::new(AtomicBool::new(false)),
            is_minimized: Arc::new(AtomicBool::new(false)),
            position: Arc::new(RwLock::new(position)),
            config: Arc::new(RwLock::new(config)),
            creation_lock: Arc::new(Mutex::new(())),
            config_path,
        }
    }
    
    /// Load config from file
    fn load_config_from_file(path: &PathBuf) -> Option<BubbleConfig> {
        if path.exists() {
            match std::fs::read_to_string(path) {
                Ok(content) => match serde_json::from_str(&content) {
                    Ok(config) => {
                        log::debug!("[AssistantBubbleWindow] Loaded config from {:?}", path);
                        return Some(config);
                    }
                    Err(e) => log::warn!("[AssistantBubbleWindow] Failed to parse config: {}", e),
                },
                Err(e) => log::warn!("[AssistantBubbleWindow] Failed to read config file: {}", e),
            }
        }
        None
    }
    
    /// Save config to file
    pub fn save_config(&self) -> Result<(), String> {
        let config = self.config.read().clone();
        let content = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        
        std::fs::write(&self.config_path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))?;
        
        log::debug!("[AssistantBubbleWindow] Config saved to {:?}", self.config_path);
        Ok(())
    }

    /// Get bubble configuration
    pub fn get_config(&self) -> BubbleConfig {
        self.config.read().clone()
    }

    /// Update bubble configuration
    pub fn update_config(&self, config: BubbleConfig) {
        *self.config.write() = config;
    }

    /// Set bubble position and optionally persist to config
    pub fn set_position(&self, x: i32, y: i32) -> Result<(), String> {
        // Actually move the window
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
                .map_err(|e| format!("Failed to set bubble position: {}", e))?;
        }
        
        *self.position.write() = Some((x, y));
        
        // Also update config if remember_position is enabled
        let mut config = self.config.write();
        if config.remember_position {
            config.x = Some(x);
            config.y = Some(y);
        }
        
        Ok(())
    }

    pub fn ensure_window_exists(&self) -> Result<(), String> {
        // Acquire lock to prevent concurrent window creation
        let _guard = self.creation_lock.lock();
        
        // Double-check after acquiring lock
        if self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
            .is_some()
        {
            return Ok(());
        }

        // Build window with proper transparency settings for each platform
        let mut builder = WebviewWindowBuilder::new(
            &self.app_handle,
            ASSISTANT_BUBBLE_WINDOW_LABEL,
            WebviewUrl::App("assistant-bubble".into()),
        )
        .title("Cognia")
        .inner_size(BUBBLE_SIZE, BUBBLE_SIZE)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .visible(true)
        .focused(false)
        .shadow(false);

        // On Windows, transparent windows need special handling
        // Using transparent(true) with a proper CSS background works best
        #[cfg(target_os = "windows")]
        {
            builder = builder.transparent(true);
        }

        #[cfg(not(target_os = "windows"))]
        {
            builder = builder.transparent(true);
        }

        let window = builder
            .build()
            .map_err(|e| format!("Failed to create assistant bubble window: {}", e))?;

        // Place bubble at bottom-right of primary work area
        let (x, y) = self.default_position();
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }));
        *self.position.write() = Some((x, y));

        let is_visible = self.is_visible.clone();
        let position = self.position.clone();
        let config = self.config.clone();
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
            tauri::WindowEvent::Moved(pos) => {
                // Track position changes (e.g., user dragging the bubble)
                *position.write() = Some((pos.x, pos.y));
                
                // Persist to config if remember_position is enabled
                let mut cfg = config.write();
                if cfg.remember_position {
                    cfg.x = Some(pos.x);
                    cfg.y = Some(pos.y);
                }
                
                // Emit position changed event
                let _ = app_handle.emit("assistant-bubble-moved", serde_json::json!({
                    "x": pos.x,
                    "y": pos.y
                }));
            }
            tauri::WindowEvent::Destroyed => {
                // Window was destroyed, reset visibility state
                is_visible.store(false, Ordering::SeqCst);
                log::debug!("[AssistantBubbleWindow] Window destroyed");
            }
            tauri::WindowEvent::Focused(_focused) => {
                // No-op; bubble should not interfere with focus management.
            }
            _ => {}
        });
        
        // Restore position from config if available
        let config = self.config.read().clone();
        if config.remember_position {
            if let Some((saved_x, saved_y)) = config.x.zip(config.y) {
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: saved_x,
                    y: saved_y,
                }));
                *self.position.write() = Some((saved_x, saved_y));
                log::debug!("[AssistantBubbleWindow] Restored position to ({}, {})", saved_x, saved_y);
            }
        }

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

    /// Hide the bubble window
    pub fn hide(&self) -> Result<(), String> {
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            window
                .hide()
                .map_err(|e| format!("Failed to hide assistant bubble: {}", e))?;
            self.is_visible.store(false, Ordering::SeqCst);
            
            // Emit visibility changed event
            let _ = self.app_handle.emit("assistant-bubble-visibility-changed", false);
        }
        Ok(())
    }
    
    /// Minimize (fold) the bubble window
    pub fn minimize(&self) -> Result<(), String> {
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            window
                .minimize()
                .map_err(|e| format!("Failed to minimize assistant bubble: {}", e))?;
            self.is_minimized.store(true, Ordering::SeqCst);
            
            // Emit minimized event
            let _ = self.app_handle.emit("assistant-bubble-minimized", true);
            log::debug!("[AssistantBubbleWindow] Window minimized");
        }
        Ok(())
    }
    
    /// Unminimize (unfold) the bubble window
    pub fn unminimize(&self) -> Result<(), String> {
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            window
                .unminimize()
                .map_err(|e| format!("Failed to unminimize assistant bubble: {}", e))?;
            self.is_minimized.store(false, Ordering::SeqCst);
            
            // Emit unminimized event
            let _ = self.app_handle.emit("assistant-bubble-minimized", false);
            log::debug!("[AssistantBubbleWindow] Window unminimized");
        }
        Ok(())
    }
    
    /// Check if bubble is minimized
    pub fn is_minimized(&self) -> bool {
        self.is_minimized.load(Ordering::SeqCst)
    }
    
    /// Toggle minimized state
    pub fn toggle_minimize(&self) -> Result<bool, String> {
        if self.is_minimized() {
            self.unminimize()?;
            Ok(false)
        } else {
            self.minimize()?;
            Ok(true)
        }
    }

    /// Check if bubble is visible
    pub fn is_visible(&self) -> bool {
        self.is_visible.load(Ordering::SeqCst)
    }

    /// Get current bubble position (physical pixels)
    pub fn get_position(&self) -> Option<(i32, i32)> {
        // Try to get live position from window first
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            if let Ok(pos) = window.outer_position() {
                let position = (pos.x, pos.y);
                *self.position.write() = Some(position);
                return Some(position);
            }
        }
        *self.position.read()
    }

    /// Get bubble size (logical pixels)
    pub fn get_size(&self) -> (f64, f64) {
        (BUBBLE_SIZE, BUBBLE_SIZE)
    }

    /// Calculate optimal position for chat widget relative to bubble
    pub fn calculate_chat_widget_position(&self, widget_width: i32, widget_height: i32) -> (i32, i32) {
        let bubble_pos = self.get_position().unwrap_or_else(|| self.default_position());
        let bubble_size = BUBBLE_SIZE as i32;
        let (work_w, work_h, work_x, work_y) = self.get_primary_work_area();
        
        // Gap between bubble and widget
        const GAP: i32 = 12;
        
        // Calculate bubble center
        let bubble_center_x = bubble_pos.0 + bubble_size / 2;
        let bubble_center_y = bubble_pos.1 + bubble_size / 2;
        
        // Determine best position (prefer above-left of bubble)
        let mut x: i32;
        let mut y: i32;
        
        // Check if there's enough space above the bubble
        let space_above = bubble_pos.1 - work_y;
        let space_below = (work_y + work_h) - (bubble_pos.1 + bubble_size);
        let space_left = bubble_pos.0 - work_x;
        let space_right = (work_x + work_w) - (bubble_pos.0 + bubble_size);
        
        // Vertical positioning
        if space_above >= widget_height + GAP {
            // Position above bubble
            y = bubble_pos.1 - widget_height - GAP;
        } else if space_below >= widget_height + GAP {
            // Position below bubble
            y = bubble_pos.1 + bubble_size + GAP;
        } else {
            // Center vertically
            y = bubble_center_y - widget_height / 2;
        }
        
        // Horizontal positioning - align right edge with bubble right edge
        if space_left >= widget_width - bubble_size {
            // Align right edges
            x = bubble_pos.0 + bubble_size - widget_width;
        } else if space_right >= widget_width {
            // Position to the right of bubble
            x = bubble_pos.0;
        } else {
            // Center horizontally on bubble
            x = bubble_center_x - widget_width / 2;
        }
        
        // Ensure window stays within work area
        x = x.max(work_x + 10).min(work_x + work_w - widget_width - 10);
        y = y.max(work_y + 10).min(work_y + work_h - widget_height - 10);
        
        (x, y)
    }

    fn default_position(&self) -> (i32, i32) {
        let (work_w, work_h, work_x, work_y) = self.get_primary_work_area();
        let size = BUBBLE_SIZE as i32;
        let x = work_x + work_w - size - BUBBLE_PADDING;
        let y = work_y + work_h - size - BUBBLE_PADDING;
        (x.max(work_x), y.max(work_y))
    }

    /// Destroy the bubble window and clean up resources
    pub fn destroy(&self) -> Result<(), String> {
        log::debug!("[AssistantBubbleWindow] destroy() called");
        
        // Save config before destroying
        if let Err(e) = self.save_config() {
            log::warn!("[AssistantBubbleWindow] Failed to save config on destroy: {}", e);
        }
        
        if let Some(window) = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
        {
            // Hide first to avoid visual glitch
            let _ = window.hide();
            window
                .destroy()
                .map_err(|e| format!("Failed to destroy bubble window: {}", e))?;
        }
        
        self.is_visible.store(false, Ordering::SeqCst);
        self.is_minimized.store(false, Ordering::SeqCst);
        log::info!("[AssistantBubbleWindow] Window destroyed");
        Ok(())
    }
    
    /// Recreate the window if it was destroyed unexpectedly
    pub fn recreate_if_needed(&self) -> Result<bool, String> {
        if self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
            .is_none()
        {
            log::info!("[AssistantBubbleWindow] Window was destroyed, recreating...");
            self.ensure_window_exists()?;
            Ok(true)
        } else {
            Ok(false)
        }
    }
    
    /// Sync visibility state with actual window state
    /// Call this if you suspect the state might be out of sync
    pub fn sync_visibility(&self) {
        let actual_visible = self
            .app_handle
            .get_webview_window(ASSISTANT_BUBBLE_WINDOW_LABEL)
            .map(|w| w.is_visible().unwrap_or(false))
            .unwrap_or(false);
        
        let stored_visible = self.is_visible.load(Ordering::SeqCst);
        
        if actual_visible != stored_visible {
            log::warn!(
                "[AssistantBubbleWindow] Visibility state mismatch: stored={}, actual={}. Syncing.",
                stored_visible,
                actual_visible
            );
            self.is_visible.store(actual_visible, Ordering::SeqCst);
        }
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
