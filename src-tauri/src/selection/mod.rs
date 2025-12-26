//! Selection toolbar module
//!
//! This module provides functionality for detecting text selection in other applications
//! and displaying a floating toolbar with AI-powered actions.

mod detector;
mod mouse_hook;
mod toolbar_window;

pub use detector::SelectionDetector;
pub use mouse_hook::{MouseHook, MouseEvent};
pub use toolbar_window::ToolbarWindow;

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;
use tauri::Manager;
use tokio::sync::mpsc;

/// Selection event payload sent to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionPayload {
    /// The selected text
    pub text: String,
    /// Mouse X position (screen coordinates)
    pub x: i32,
    /// Mouse Y position (screen coordinates)
    pub y: i32,
    /// Timestamp of the selection
    pub timestamp: i64,
}

/// Selection toolbar configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionConfig {
    /// Whether the selection toolbar is enabled
    pub enabled: bool,
    /// Trigger mode: "auto" or "shortcut"
    pub trigger_mode: String,
    /// Minimum text length to trigger toolbar
    pub min_text_length: usize,
    /// Maximum text length to process
    pub max_text_length: usize,
    /// Delay in milliseconds before showing toolbar
    pub delay_ms: u64,
    /// Default target language for translation
    pub target_language: String,
    /// List of excluded application names
    pub excluded_apps: Vec<String>,
}

impl Default for SelectionConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            trigger_mode: "auto".to_string(),
            min_text_length: 1,
            max_text_length: 5000,
            delay_ms: 200,
            target_language: "zh-CN".to_string(),
            excluded_apps: vec![],
        }
    }
}

/// Selection manager state
pub struct SelectionManager {
    pub config: Arc<RwLock<SelectionConfig>>,
    pub detector: Arc<SelectionDetector>,
    pub mouse_hook: Arc<MouseHook>,
    pub toolbar_window: Arc<ToolbarWindow>,
    pub is_running: Arc<RwLock<bool>>,
    app_handle: tauri::AppHandle,
}

impl SelectionManager {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let config = Arc::new(RwLock::new(SelectionConfig::default()));
        let detector = Arc::new(SelectionDetector::new());
        let mouse_hook = Arc::new(MouseHook::new());
        let toolbar_window = Arc::new(ToolbarWindow::new(app_handle.clone()));

        Self {
            config,
            detector,
            mouse_hook,
            toolbar_window,
            is_running: Arc::new(RwLock::new(false)),
            app_handle,
        }
    }

    /// Start the selection detection service
    pub async fn start(&self) -> Result<(), String> {
        {
            let is_running = self.is_running.read();
            if *is_running {
                return Ok(());
            }
        }

        // Create event channel
        let (tx, mut rx) = mpsc::unbounded_channel::<MouseEvent>();
        self.mouse_hook.set_event_sender(tx);

        // Start mouse hook
        self.mouse_hook.start()?;

        // Clone necessary references for the event loop
        let config = self.config.clone();
        let detector = self.detector.clone();
        let toolbar_window = self.toolbar_window.clone();
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();

        // Spawn event processing task
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                // Check if still running
                if !*is_running.read() {
                    break;
                }

                // Get current config
                let cfg = config.read().clone();
                if !cfg.enabled {
                    continue;
                }

                // Only process in auto mode
                if cfg.trigger_mode != "auto" {
                    continue;
                }

                // Handle mouse event
                match event {
                    MouseEvent::LeftButtonUp { x, y } | 
                    MouseEvent::DoubleClick { x, y } |
                    MouseEvent::TripleClick { x, y } => {
                        // Wait for the configured delay
                        tokio::time::sleep(tokio::time::Duration::from_millis(cfg.delay_ms)).await;

                        // Try to get selected text
                        if let Ok(Some(text)) = detector.get_selected_text() {
                            // Check text length
                            if text.len() >= cfg.min_text_length && text.len() <= cfg.max_text_length {
                                // Show toolbar
                                if let Err(e) = toolbar_window.show(x as i32, y as i32, text.clone()) {
                                    log::error!("Failed to show toolbar: {}", e);
                                    continue;
                                }

                                // Emit event to frontend
                                let payload = SelectionPayload {
                                    text,
                                    x: x as i32,
                                    y: y as i32,
                                    timestamp: chrono::Utc::now().timestamp_millis(),
                                };

                                if let Err(e) = app_handle.emit("selection-detected", &payload) {
                                    log::error!("Failed to emit selection event: {}", e);
                                }
                            }
                        }
                    }
                }
            }
        });

        *self.is_running.write() = true;
        log::info!("Selection manager started");
        Ok(())
    }

    /// Stop the selection detection service
    pub fn stop(&self) -> Result<(), String> {
        {
            let is_running = self.is_running.read();
            if !*is_running {
                return Ok(());
            }
        }

        // Stop mouse hook
        self.mouse_hook.stop()?;

        *self.is_running.write() = false;
        log::info!("Selection manager stopped");
        Ok(())
    }

    /// Update configuration
    pub fn update_config(&self, config: SelectionConfig) {
        let mut current = self.config.write();
        *current = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> SelectionConfig {
        self.config.read().clone()
    }

    /// Manually trigger selection detection
    pub fn trigger(&self) -> Result<Option<SelectionPayload>, String> {
        let cfg = self.config.read().clone();
        if !cfg.enabled {
            return Ok(None);
        }

        // Get selected text
        let text = match self.detector.get_selected_text()? {
            Some(t) if !t.is_empty() => t,
            _ => return Ok(None),
        };

        // Check text length
        if text.len() < cfg.min_text_length || text.len() > cfg.max_text_length {
            return Ok(None);
        }

        // Get mouse position
        let (x, y) = get_mouse_position();

        // Create payload
        let payload = SelectionPayload {
            text: text.clone(),
            x: x as i32,
            y: y as i32,
            timestamp: chrono::Utc::now().timestamp_millis(),
        };

        // Show toolbar
        self.toolbar_window.show(x as i32, y as i32, text)?;

        // Emit event
        self.app_handle
            .emit("selection-detected", &payload)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        Ok(Some(payload))
    }
}

/// Get current mouse position
fn get_mouse_position() -> (f64, f64) {
    match mouse_position::mouse_position::Mouse::get_mouse_position() {
        mouse_position::mouse_position::Mouse::Position { x, y } => (x as f64, y as f64),
        mouse_position::mouse_position::Mouse::Error => (0.0, 0.0),
    }
}
