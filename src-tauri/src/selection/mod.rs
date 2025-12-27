//! Selection toolbar module
//!
//! This module provides functionality for detecting text selection in other applications
//! and displaying a floating toolbar with AI-powered actions.

#![allow(dead_code)]
#![allow(unused_imports)]

mod detector;
mod enhanced_detector;
mod mouse_hook;
mod toolbar_window;
mod history;
mod clipboard_history;
mod smart_selection;

pub use detector::SelectionDetector;
pub use enhanced_detector::{EnhancedSelection, EnhancedSelectionDetector, TextType, SourceAppInfo};
pub use mouse_hook::{MouseHook, MouseEvent};
pub use toolbar_window::ToolbarWindow;
pub use history::{SelectionHistory, SelectionHistoryEntry, SelectionHistoryStats};
pub use clipboard_history::{ClipboardHistory, ClipboardEntry, ClipboardContentType};
pub use smart_selection::{SmartSelection, SelectionMode, SelectionExpansion, SelectionContext};

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;
use tauri::Emitter;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

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

/// Selection manager status for frontend queries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionStatus {
    /// Whether the selection service is running
    pub is_running: bool,
    /// Whether the toolbar is currently visible
    pub toolbar_visible: bool,
    /// Current toolbar position (if visible)
    pub toolbar_position: Option<(i32, i32)>,
    /// Current selected text (if any)
    pub selected_text: Option<String>,
    /// Last selection timestamp
    pub last_selection_timestamp: Option<i64>,
    /// Current configuration
    pub config: SelectionConfig,
}

/// Selection manager state
pub struct SelectionManager {
    pub config: Arc<RwLock<SelectionConfig>>,
    pub detector: Arc<SelectionDetector>,
    pub enhanced_detector: Arc<EnhancedSelectionDetector>,
    pub mouse_hook: Arc<MouseHook>,
    pub toolbar_window: Arc<ToolbarWindow>,
    pub is_running: Arc<RwLock<bool>>,
    /// Cancellation token for the event loop task
    cancellation_token: Arc<RwLock<Option<CancellationToken>>>,
    /// Last selection timestamp
    last_selection_timestamp: Arc<RwLock<Option<i64>>>,
    /// Selection history
    pub history: Arc<SelectionHistory>,
    /// Clipboard history
    pub clipboard_history: Arc<ClipboardHistory>,
    /// Smart selection engine
    pub smart_selection: Arc<SmartSelection>,
    app_handle: tauri::AppHandle,
}

impl SelectionManager {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        let config = Arc::new(RwLock::new(SelectionConfig::default()));
        let detector = Arc::new(SelectionDetector::new());
        let enhanced_detector = Arc::new(EnhancedSelectionDetector::new());
        let mouse_hook = Arc::new(MouseHook::new());
        let toolbar_window = Arc::new(ToolbarWindow::new(app_handle.clone()));
        let history = Arc::new(SelectionHistory::new());
        let clipboard_history = Arc::new(ClipboardHistory::new());
        let smart_selection = Arc::new(SmartSelection::new());

        Self {
            config,
            detector,
            enhanced_detector,
            mouse_hook,
            toolbar_window,
            is_running: Arc::new(RwLock::new(false)),
            cancellation_token: Arc::new(RwLock::new(None)),
            last_selection_timestamp: Arc::new(RwLock::new(None)),
            history,
            clipboard_history,
            smart_selection,
            app_handle,
        }
    }

    /// Start the selection detection service
    pub async fn start(&self) -> Result<(), String> {
        {
            let is_running = self.is_running.read();
            if *is_running {
                log::warn!("Selection manager already running");
                return Ok(());
            }
        }

        // Create cancellation token for this session
        let cancel_token = CancellationToken::new();
        *self.cancellation_token.write() = Some(cancel_token.clone());

        // Create event channel
        let (tx, mut rx) = mpsc::unbounded_channel::<MouseEvent>();
        self.mouse_hook.set_event_sender(tx);

        // Start mouse hook
        self.mouse_hook.start()?;

        // Clone necessary references for the event loop
        let config = self.config.clone();
        let detector = self.detector.clone();
        let enhanced_detector = self.enhanced_detector.clone();
        let toolbar_window = self.toolbar_window.clone();
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();
        let last_selection_timestamp = self.last_selection_timestamp.clone();
        let history = self.history.clone();

        // Spawn event processing task with cancellation support
        tauri::async_runtime::spawn(async move {
            log::info!("Selection event loop started");
            
            loop {
                tokio::select! {
                    // Check for cancellation
                    _ = cancel_token.cancelled() => {
                        log::info!("Selection event loop cancelled");
                        break;
                    }
                    // Process mouse events
                    event = rx.recv() => {
                        let Some(event) = event else {
                            log::info!("Selection event channel closed");
                            break;
                        };

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

                        // Extract position from event
                        let (x, y) = match &event {
                            MouseEvent::LeftButtonUp { x, y } => (*x, *y),
                            MouseEvent::DoubleClick { x, y } => (*x, *y),
                            MouseEvent::TripleClick { x, y } => (*x, *y),
                            MouseEvent::DragEnd { x, y, .. } => (*x, *y),
                        };

                        // Wait for the configured delay (allows selection to complete)
                        tokio::time::sleep(tokio::time::Duration::from_millis(cfg.delay_ms)).await;

                        // Try to get selected text
                        match detector.get_selected_text() {
                            Ok(Some(text)) if !text.is_empty() => {
                                // Check text length
                                if text.len() < cfg.min_text_length || text.len() > cfg.max_text_length {
                                    log::debug!("Text length {} outside bounds [{}, {}]", 
                                        text.len(), cfg.min_text_length, cfg.max_text_length);
                                    continue;
                                }

                                let timestamp = chrono::Utc::now().timestamp_millis();
                                
                                // Update last selection timestamp
                                *last_selection_timestamp.write() = Some(timestamp);

                                // Analyze text and record to history
                                let analysis = enhanced_detector.analyze(&text, None);
                                let mut history_entry = SelectionHistoryEntry::new(text.clone(), x as i32, y as i32);
                                history_entry = history_entry.with_type_info(
                                    Some(format!("{:?}", analysis.text_type)),
                                    analysis.language.clone(),
                                );
                                history.add(history_entry);

                                // Show toolbar
                                if let Err(e) = toolbar_window.show(x as i32, y as i32, text.clone()) {
                                    log::error!("Failed to show toolbar: {}", e);
                                    // Emit error event to frontend
                                    let _ = app_handle.emit("selection-error", serde_json::json!({
                                        "error": e,
                                        "type": "toolbar_show_failed"
                                    }));
                                    continue;
                                }

                                // Emit event to frontend
                                let payload = SelectionPayload {
                                    text,
                                    x: x as i32,
                                    y: y as i32,
                                    timestamp,
                                };

                                if let Err(e) = app_handle.emit("selection-detected", &payload) {
                                    log::error!("Failed to emit selection event: {}", e);
                                }
                            }
                            Ok(_) => {
                                // No text selected or empty, hide toolbar if visible
                                if toolbar_window.is_visible() {
                                    let _ = toolbar_window.hide();
                                }
                            }
                            Err(e) => {
                                log::debug!("Failed to get selected text: {}", e);
                            }
                        }
                    }
                }
            }
            
            log::info!("Selection event loop exited");
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
                log::debug!("Selection manager already stopped");
                return Ok(());
            }
        }

        // Cancel the event loop task
        if let Some(token) = self.cancellation_token.read().as_ref() {
            token.cancel();
        }
        *self.cancellation_token.write() = None;

        // Stop mouse hook
        self.mouse_hook.stop()?;

        // Hide toolbar if visible
        let _ = self.toolbar_window.hide();

        *self.is_running.write() = false;
        log::info!("Selection manager stopped");
        Ok(())
    }

    /// Restart the selection detection service
    pub async fn restart(&self) -> Result<(), String> {
        self.stop()?;
        // Small delay to ensure cleanup
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        self.start().await
    }

    /// Update configuration
    pub fn update_config(&self, new_config: SelectionConfig) {
        let old_config = self.config.read().clone();
        
        // Update config
        {
            let mut current = self.config.write();
            *current = new_config.clone();
        }

        // Emit config change event
        let _ = self.app_handle.emit("selection-config-changed", &new_config);

        // Handle enable/disable state change
        if old_config.enabled != new_config.enabled {
            if !new_config.enabled {
                // Hide toolbar when disabled
                let _ = self.toolbar_window.hide();
            }
            log::info!("Selection toolbar {}", if new_config.enabled { "enabled" } else { "disabled" });
        }

        log::debug!("Selection config updated");
    }

    /// Set enabled state
    pub fn set_enabled(&self, enabled: bool) {
        let mut config = self.config.write();
        if config.enabled != enabled {
            config.enabled = enabled;
            if !enabled {
                drop(config); // Release lock before hiding
                let _ = self.toolbar_window.hide();
            }
            let _ = self.app_handle.emit("selection-enabled-changed", enabled);
            log::info!("Selection toolbar {}", if enabled { "enabled" } else { "disabled" });
        }
    }

    /// Check if enabled
    pub fn is_enabled(&self) -> bool {
        self.config.read().enabled
    }

    /// Get current status
    pub fn get_status(&self) -> SelectionStatus {
        let config = self.config.read().clone();
        SelectionStatus {
            is_running: *self.is_running.read(),
            toolbar_visible: self.toolbar_window.is_visible(),
            toolbar_position: if self.toolbar_window.is_visible() {
                Some(self.toolbar_window.get_position())
            } else {
                None
            },
            selected_text: self.toolbar_window.get_selected_text(),
            last_selection_timestamp: *self.last_selection_timestamp.read(),
            config,
        }
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
