//! Selection toolbar module
//!
//! This module provides functionality for detecting text selection in other applications
//! and displaying a floating toolbar with AI-powered actions.
//!
//! # Public API
//!
//! This module exports several types for external use. Some types are used internally
//! by `SelectionManager` and composed into higher-level abstractions, while others
//! are exposed for direct use by consumers of this API.

mod analyzer;
mod clipboard_context;
mod clipboard_history;
mod detector;
mod expander;
mod extractor;
mod history;
mod mouse_hook;
mod smart_selection;
mod toolbar_window;
mod types;

// Re-export internal components for potential external use
// These are used internally by SelectionDetector but exposed for direct access if needed
pub use analyzer::TextAnalyzer;
#[allow(unused_imports)]
pub use expander::SelectionExpander;
#[allow(unused_imports)]
pub use extractor::TextExtractor;

// Clipboard context analysis types - actively used in Tauri commands
pub use clipboard_context::{
    ClipboardAnalysis, ClipboardContextAnalyzer, ContentCategory, ContentStats, DetectedLanguage,
    ExtractedEntity, SuggestedAction,
};
// FormattingHints is part of ClipboardAnalysis but not directly referenced
#[allow(unused_imports)]
pub use clipboard_context::FormattingHints;

// Clipboard history types - actively used in Tauri commands
pub use clipboard_history::{ClipboardEntry, ClipboardHistory};
// ClipboardContentType is part of ClipboardEntry but not directly referenced in commands
#[allow(unused_imports)]
pub use clipboard_history::ClipboardContentType;

// Core types - actively used
pub use detector::SelectionDetector;
pub use history::{SelectionHistory, SelectionHistoryEntry, SelectionHistoryStats};
pub use mouse_hook::{MouseEvent, MouseHook};
pub use smart_selection::{SelectionContext, SelectionExpansion, SelectionMode, SmartSelection};
pub use toolbar_window::ToolbarWindow;
pub use types::{Selection, SourceAppInfo};
// TextType is used in Selection struct but not directly referenced in commands
#[allow(unused_imports)]
pub use types::TextType;

use crate::context::WindowManager;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

const ERROR_KIND_EXTRACT_FAILED: &str = "extract_failed";
const ERROR_KIND_TOOLBAR_SHOW_FAILED: &str = "toolbar_show_failed";
const ERROR_KIND_CONFIG_SYNC_FAILED: &str = "config_sync_failed";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TriggerMode {
    Auto,
    Shortcut,
    Both,
}

fn parse_trigger_mode(mode: &str) -> TriggerMode {
    match mode.trim().to_ascii_lowercase().as_str() {
        "auto" => TriggerMode::Auto,
        "shortcut" | "manual" => TriggerMode::Shortcut,
        "both" => TriggerMode::Both,
        _ => TriggerMode::Auto,
    }
}

fn trigger_mode_supports_auto(mode: &str) -> bool {
    matches!(parse_trigger_mode(mode), TriggerMode::Auto | TriggerMode::Both)
}

fn trigger_mode_supports_manual(mode: &str) -> bool {
    matches!(
        parse_trigger_mode(mode),
        TriggerMode::Auto | TriggerMode::Shortcut | TriggerMode::Both
    )
}

fn is_effectively_empty_selection(text: &str) -> bool {
    text.trim().is_empty()
}

/// Selection event payload sent to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionPayload {
    /// Correlation ID for linking lifecycle and action/history events
    pub event_id: Option<String>,
    /// The selected text
    pub text: String,
    /// Mouse X position (screen coordinates)
    pub x: i32,
    /// Mouse Y position (screen coordinates)
    pub y: i32,
    /// Timestamp of the selection
    pub timestamp: i64,
    /// Source application name (if available)
    pub source_app: Option<String>,
    /// Source process name (if available)
    pub source_process: Option<String>,
    /// Source window title (if available)
    pub source_window_title: Option<String>,
    /// Detected text type (if available)
    pub text_type: Option<String>,
    /// Detection mode that produced this payload (`auto` or `manual`)
    pub detection_mode: Option<String>,
}

/// Selection toolbar configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionConfig {
    /// Whether the selection toolbar is enabled
    pub enabled: bool,
    /// Trigger mode: "auto", "shortcut", or "both"
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
    /// Clipboard context analyzer
    pub clipboard_analyzer: Arc<ClipboardContextAnalyzer>,
    app_handle: tauri::AppHandle,
    /// Config file path for persistence
    config_path: PathBuf,
}

impl SelectionManager {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        log::info!("[SelectionManager] Creating new instance");

        // Get config path from app data directory
        let config_path = app_handle
            .path()
            .app_data_dir()
            .map(|p| p.join("selection_config.json"))
            .unwrap_or_else(|_| PathBuf::from("selection_config.json"));

        // Try to load existing config
        let config = Self::load_config_from_file(&config_path).unwrap_or_default();
        log::debug!(
            "[SelectionManager] Config loaded: enabled={}, trigger_mode={}",
            config.enabled,
            config.trigger_mode
        );

        let config = Arc::new(RwLock::new(config));
        let detector = Arc::new(SelectionDetector::new());
        let mouse_hook = Arc::new(MouseHook::new());
        let toolbar_window = Arc::new(ToolbarWindow::new(app_handle.clone()));
        let history = Arc::new(SelectionHistory::new());
        let clipboard_history = Arc::new(ClipboardHistory::new());
        let smart_selection = Arc::new(SmartSelection::new());
        let clipboard_analyzer = Arc::new(ClipboardContextAnalyzer::new());

        log::debug!("[SelectionManager] All components initialized");
        Self {
            config,
            detector,
            mouse_hook,
            toolbar_window,
            is_running: Arc::new(RwLock::new(false)),
            cancellation_token: Arc::new(RwLock::new(None)),
            last_selection_timestamp: Arc::new(RwLock::new(None)),
            history,
            clipboard_history,
            smart_selection,
            clipboard_analyzer,
            app_handle,
            config_path,
        }
    }

    /// Load config from file
    fn load_config_from_file(path: &PathBuf) -> Option<SelectionConfig> {
        if path.exists() {
            match std::fs::read_to_string(path) {
                Ok(content) => match serde_json::from_str(&content) {
                    Ok(config) => {
                        log::debug!("[SelectionManager] Loaded config from {:?}", path);
                        return Some(config);
                    }
                    Err(e) => log::warn!("[SelectionManager] Failed to parse config: {}", e),
                },
                Err(e) => log::warn!("[SelectionManager] Failed to read config file: {}", e),
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

        log::debug!("[SelectionManager] Config saved to {:?}", self.config_path);
        Ok(())
    }

    fn get_active_source_app_info() -> Option<SourceAppInfo> {
        let window = WindowManager::new().get_active_window().ok()?;
        Some(SourceAppInfo {
            name: window.process_name.clone(),
            process: window.process_name,
            window_title: window.title,
            app_type: "unknown".to_string(),
        })
    }

    fn is_excluded_app(cfg: &SelectionConfig, source_app: Option<&SourceAppInfo>) -> bool {
        let Some(source_app) = source_app else {
            return false;
        };

        if cfg.excluded_apps.is_empty() {
            return false;
        }

        let app_name = source_app.name.to_ascii_lowercase();
        let process = source_app.process.to_ascii_lowercase();
        let window_title = source_app.window_title.to_ascii_lowercase();

        cfg.excluded_apps.iter().any(|pattern| {
            let p = pattern.trim().to_ascii_lowercase();
            if p.is_empty() {
                return false;
            }
            app_name == p
                || process == p
                || process.ends_with(&p)
                || app_name.contains(&p)
                || process.contains(&p)
                || window_title.contains(&p)
        })
    }

    fn is_text_within_limits(text: &str, cfg: &SelectionConfig) -> bool {
        let text_len = text.chars().count();
        text_len >= cfg.min_text_length && text_len <= cfg.max_text_length
    }

    fn emit_selection_error(
        app_handle: &tauri::AppHandle,
        kind: &str,
        stage: &str,
        message: &str,
        details: serde_json::Value,
    ) {
        let payload = serde_json::json!({
            "kind": kind,
            "stage": stage,
            "message": message,
            "timestamp": chrono::Utc::now().timestamp_millis(),
            "details": details,
        });
        if let Err(err) = app_handle.emit("selection-error", payload) {
            log::error!("[SelectionManager] Failed to emit selection-error event: {}", err);
        }
    }

    /// Start the selection detection service
    pub async fn start(&self) -> Result<(), String> {
        log::debug!("[SelectionManager] start() called");
        {
            let is_running = self.is_running.read();
            if *is_running {
                log::warn!("[SelectionManager] Already running, skipping start");
                return Ok(());
            }
        }

        // Create cancellation token for this session
        log::trace!("[SelectionManager] Creating cancellation token");
        let cancel_token = CancellationToken::new();
        *self.cancellation_token.write() = Some(cancel_token.clone());

        // Create event channel
        log::trace!("[SelectionManager] Creating event channel");
        let (tx, mut rx) = mpsc::unbounded_channel::<MouseEvent>();
        self.mouse_hook.set_event_sender(tx);

        // Start mouse hook
        log::debug!("[SelectionManager] Starting mouse hook");
        self.mouse_hook.reset();
        self.mouse_hook.start()?;

        // Clone necessary references for the event loop
        let config = self.config.clone();
        let detector = self.detector.clone();
        let toolbar_window = self.toolbar_window.clone();
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();
        let last_selection_timestamp = self.last_selection_timestamp.clone();
        let history = self.history.clone();

        // Spawn event processing task with cancellation support
        log::debug!("[SelectionManager] Spawning event processing task");
        tauri::async_runtime::spawn(async move {
            log::info!("[SelectionManager] Event loop started");

            loop {
                tokio::select! {
                    // Check for cancellation
                    _ = cancel_token.cancelled() => {
                        log::info!("[SelectionManager] Event loop cancelled by token");
                        break;
                    }
                    // Process mouse events
                    event = rx.recv() => {
                        let Some(event) = event else {
                            log::info!("[SelectionManager] Event channel closed");
                            break;
                        };
                        log::trace!("[SelectionManager] Received mouse event: {:?}", event);

                        // Check if still running
                        if !*is_running.read() {
                            break;
                        }

                        // Get current config
                        let cfg = config.read().clone();
                        if !cfg.enabled {
                            continue;
                        }

                        // Process auto-detection only when trigger mode supports auto
                        if !trigger_mode_supports_auto(&cfg.trigger_mode) {
                            log::trace!(
                                "[SelectionManager] Skipping auto event: trigger_mode={}",
                                cfg.trigger_mode
                            );
                            continue;
                        }

                        // Extract position from event and determine if this is a selection action
                        // Simple LeftButtonUp (single click) should only be used to HIDE toolbar
                        // when selection is cleared, not to SHOW a new toolbar
                        let (x, y, is_selection_action) = match &event {
                            MouseEvent::LeftButtonUp { x, y } => {
                                // Simple left button up - only used to detect selection clearing
                                (*x, *y, false)
                            }
                            MouseEvent::DoubleClick { x, y } => (*x, *y, true),
                            MouseEvent::TripleClick { x, y } => (*x, *y, true),
                            MouseEvent::DragEnd { x, y, .. } => (*x, *y, true),
                        };

                        // Wait for the configured delay (allows selection to complete)
                        tokio::time::sleep(tokio::time::Duration::from_millis(cfg.delay_ms)).await;

                        let source_app = SelectionManager::get_active_source_app_info();
                        if SelectionManager::is_excluded_app(&cfg, source_app.as_ref()) {
                            log::trace!(
                                "[SelectionManager] Skipping selection in excluded app: {:?}",
                                source_app.as_ref().map(|app| (&app.name, &app.process))
                            );
                            if toolbar_window.is_visible() {
                                let _ = toolbar_window.hide();
                            }
                            continue;
                        }

                        // Try to get selected text
                        match detector.get_selected_text() {
                            Ok(Some(text)) if !is_effectively_empty_selection(&text) => {
                                // For simple clicks (not selection actions), don't show new toolbar
                                // This prevents false triggers when clicking to position cursor
                                if !is_selection_action {
                                    log::trace!("[SelectionManager] Simple click with existing selection, ignoring");
                                    continue;
                                }

                                // Check text length
                                if !SelectionManager::is_text_within_limits(&text, &cfg) {
                                    log::debug!(
                                        "[SelectionManager] Text length {} outside bounds [{}, {}]",
                                        text.chars().count(),
                                        cfg.min_text_length,
                                        cfg.max_text_length
                                    );
                                    continue;
                                }

                                log::debug!("[SelectionManager] Processing selection: {} chars at ({}, {})",
                                    text.len(), x, y);

                                let timestamp = chrono::Utc::now().timestamp_millis();

                                // Update last selection timestamp
                                *last_selection_timestamp.write() = Some(timestamp);

                                // Analyze text and record to history
                                let event_id = Uuid::new_v4().to_string();
                                let analysis = detector.analyze(&text, source_app.clone());
                                let mut history_entry =
                                    SelectionHistoryEntry::new(text.clone(), x as i32, y as i32)
                                        .with_event_id(Some(event_id.clone()))
                                        .with_source_app(source_app.as_ref());
                                history_entry = history_entry.with_type_info(
                                    Some(format!("{:?}", analysis.text_type)),
                                    analysis.language.clone(),
                                );
                                history_entry.is_manual = false;
                                history.add(history_entry);

                                // Show toolbar
                                if let Err(e) = toolbar_window.show(x as i32, y as i32, text.clone()) {
                                    log::error!("[SelectionManager] Failed to show toolbar: {}", e);
                                    SelectionManager::emit_selection_error(
                                        &app_handle,
                                        ERROR_KIND_TOOLBAR_SHOW_FAILED,
                                        "toolbar_show",
                                        &e,
                                        serde_json::json!({
                                            "x": x,
                                            "y": y,
                                            "triggerMode": cfg.trigger_mode,
                                        }),
                                    );
                                    continue;
                                }

                                // Emit event to frontend
                                let payload = SelectionPayload {
                                    event_id: Some(event_id),
                                    text,
                                    x: x as i32,
                                    y: y as i32,
                                    timestamp,
                                    source_app: source_app.as_ref().map(|app| app.name.clone()),
                                    source_process: source_app.as_ref().map(|app| app.process.clone()),
                                    source_window_title: source_app
                                        .as_ref()
                                        .map(|app| app.window_title.clone()),
                                    text_type: Some(format!("{:?}", analysis.text_type)),
                                    detection_mode: Some("auto".to_string()),
                                };

                                if let Err(e) = app_handle.emit("selection-detected", &payload) {
                                    log::error!("[SelectionManager] Failed to emit selection event: {}", e);
                                } else {
                                    log::trace!("[SelectionManager] Selection event emitted successfully");
                                }
                            }
                            Ok(_) => {
                                // No text selected or empty, hide toolbar if visible
                                if toolbar_window.is_visible() {
                                    log::trace!("[SelectionManager] No text selected, hiding toolbar");
                                    let _ = toolbar_window.hide();
                                }
                            }
                            Err(e) => {
                                log::debug!("[SelectionManager] Failed to get selected text: {}", e);
                                SelectionManager::emit_selection_error(
                                    &app_handle,
                                    ERROR_KIND_EXTRACT_FAILED,
                                    "extract_selection_auto",
                                    &e,
                                    serde_json::json!({
                                        "triggerMode": cfg.trigger_mode,
                                        "selectionAction": is_selection_action,
                                    }),
                                );
                            }
                        }
                    }
                }
            }

            log::info!("[SelectionManager] Event loop exited");
        });

        *self.is_running.write() = true;
        log::info!("[SelectionManager] Started successfully");
        Ok(())
    }

    /// Stop the selection detection service
    pub fn stop(&self) -> Result<(), String> {
        log::debug!("[SelectionManager] stop() called");
        {
            let is_running = self.is_running.read();
            if !*is_running {
                log::debug!("[SelectionManager] Already stopped");
                return Ok(());
            }
        }

        // Cancel the event loop task
        log::trace!("[SelectionManager] Cancelling event loop");
        if let Some(token) = self.cancellation_token.read().as_ref() {
            token.cancel();
        }
        *self.cancellation_token.write() = None;

        // Stop mouse hook
        log::trace!("[SelectionManager] Stopping mouse hook");
        self.mouse_hook.stop()?;
        self.mouse_hook.reset();

        // Hide toolbar if visible
        log::trace!("[SelectionManager] Hiding toolbar");
        let _ = self.toolbar_window.hide();

        *self.is_running.write() = false;
        log::info!("[SelectionManager] Stopped successfully");
        Ok(())
    }

    /// Restart the selection detection service
    pub async fn restart(&self) -> Result<(), String> {
        log::info!("[SelectionManager] Restarting service");
        self.stop()?;
        // Small delay to ensure cleanup
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        self.start().await
    }

    /// Update configuration
    pub fn update_config(&self, new_config: SelectionConfig) {
        log::debug!("[SelectionManager] update_config called");
        let old_config = self.config.read().clone();
        let requested_trigger_mode = new_config.trigger_mode.clone();
        let mut normalized_config = new_config;
        normalized_config.trigger_mode = match parse_trigger_mode(&normalized_config.trigger_mode) {
            TriggerMode::Auto => "auto".to_string(),
            TriggerMode::Shortcut => "shortcut".to_string(),
            TriggerMode::Both => "both".to_string(),
        };
        if requested_trigger_mode != normalized_config.trigger_mode {
            SelectionManager::emit_selection_error(
                &self.app_handle,
                ERROR_KIND_CONFIG_SYNC_FAILED,
                "normalize_trigger_mode",
                "Unsupported trigger mode provided; falling back to normalized mode",
                serde_json::json!({
                    "requested": requested_trigger_mode,
                    "normalized": normalized_config.trigger_mode,
                }),
            );
        }

        // Update config
        {
            let mut current = self.config.write();
            *current = normalized_config.clone();
        }

        // Emit config change event
        let _ = self
            .app_handle
            .emit("selection-config-changed", &normalized_config);

        // Handle enable/disable state change
        if old_config.enabled != normalized_config.enabled {
            if !normalized_config.enabled {
                // Hide toolbar when disabled
                let _ = self.toolbar_window.hide();
            }
            log::info!(
                "[SelectionManager] Selection toolbar {}",
                if normalized_config.enabled {
                    "enabled"
                } else {
                    "disabled"
                }
            );
        }

        log::debug!(
            "[SelectionManager] Config updated: enabled={}, trigger_mode={}, delay={}ms",
            normalized_config.enabled,
            normalized_config.trigger_mode,
            normalized_config.delay_ms
        );
    }

    /// Set enabled state
    pub fn set_enabled(&self, enabled: bool) {
        log::debug!("[SelectionManager] set_enabled({})", enabled);
        let changed;
        {
            let mut config = self.config.write();
            changed = config.enabled != enabled;
            if changed {
                config.enabled = enabled;
            }
        }

        if changed {
            if !enabled {
                let _ = self.toolbar_window.hide();
            }
            let _ = self.app_handle.emit("selection-enabled-changed", enabled);
            log::info!(
                "[SelectionManager] Selection toolbar {}",
                if enabled { "enabled" } else { "disabled" }
            );
        } else {
            log::trace!("[SelectionManager] Enabled state unchanged ({})", enabled);
        }
    }

    /// Check if enabled
    pub fn is_enabled(&self) -> bool {
        self.config.read().enabled
    }

    /// Get current status
    pub fn get_status(&self) -> SelectionStatus {
        let config = self.config.read().clone();
        let is_running = *self.is_running.read() && self.mouse_hook.is_running();
        SelectionStatus {
            is_running,
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
        log::debug!("[SelectionManager] trigger() called");
        let cfg = self.config.read().clone();
        if !cfg.enabled {
            log::debug!("[SelectionManager] Trigger ignored: selection disabled");
            return Ok(None);
        }
        if !trigger_mode_supports_manual(&cfg.trigger_mode) {
            log::trace!(
                "[SelectionManager] Trigger ignored: mode does not support manual trigger ({})",
                cfg.trigger_mode
            );
            return Ok(None);
        }

        let source_app = Self::get_active_source_app_info();
        if Self::is_excluded_app(&cfg, source_app.as_ref()) {
            log::trace!(
                "[SelectionManager] Manual trigger ignored for excluded app: {:?}",
                source_app.as_ref().map(|app| (&app.name, &app.process))
            );
            return Ok(None);
        }

        // Get selected text
        log::trace!("[SelectionManager] Getting selected text");
        let text = match self.detector.get_selected_text()? {
            Some(t) if !is_effectively_empty_selection(&t) => t,
            _ => {
                log::debug!("[SelectionManager] Trigger: no text selected");
                return Ok(None);
            }
        };

        // Check text length
        if !Self::is_text_within_limits(&text, &cfg) {
            log::debug!(
                "[SelectionManager] Trigger: text length {} outside bounds",
                text.chars().count()
            );
            return Ok(None);
        }

        // Get mouse position
        let (x, y) = get_mouse_position();
        log::debug!(
            "[SelectionManager] Manual trigger: {} chars at ({}, {})",
            text.len(),
            x,
            y
        );

        let event_id = Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_millis();
        *self.last_selection_timestamp.write() = Some(timestamp);

        let analysis = self.detector.analyze(&text, source_app.clone());
        let mut history_entry = SelectionHistoryEntry::new(text.clone(), x as i32, y as i32)
            .with_event_id(Some(event_id.clone()))
            .with_source_app(source_app.as_ref());
        history_entry = history_entry.with_type_info(
            Some(format!("{:?}", analysis.text_type)),
            analysis.language.clone(),
        );
        history_entry.is_manual = true;
        self.history.add(history_entry);

        // Create payload
        let payload = SelectionPayload {
            event_id: Some(event_id),
            text: text.clone(),
            x: x as i32,
            y: y as i32,
            timestamp,
            source_app: source_app.as_ref().map(|app| app.name.clone()),
            source_process: source_app.as_ref().map(|app| app.process.clone()),
            source_window_title: source_app
                .as_ref()
                .map(|app| app.window_title.clone()),
            text_type: Some(format!("{:?}", analysis.text_type)),
            detection_mode: Some("manual".to_string()),
        };

        // Show toolbar
        self.toolbar_window.show(x as i32, y as i32, text)?;

        // Emit event
        self.app_handle
            .emit("selection-detected", &payload)
            .map_err(|e| format!("Failed to emit event: {}", e))?;

        log::info!("[SelectionManager] Manual trigger successful");
        Ok(Some(payload))
    }
}

/// Get current mouse position
#[cfg(not(mobile))]
fn get_mouse_position() -> (f64, f64) {
    match mouse_position::mouse_position::Mouse::get_mouse_position() {
        mouse_position::mouse_position::Mouse::Position { x, y } => (x as f64, y as f64),
        mouse_position::mouse_position::Mouse::Error => (0.0, 0.0),
    }
}

#[cfg(mobile)]
fn get_mouse_position() -> (f64, f64) {
    (0.0, 0.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn build_test_payload(text: &str, x: i32, y: i32, timestamp: i64) -> SelectionPayload {
        SelectionPayload {
            event_id: None,
            text: text.to_string(),
            x,
            y,
            timestamp,
            source_app: None,
            source_process: None,
            source_window_title: None,
            text_type: None,
            detection_mode: None,
        }
    }

    // SelectionPayload tests
    #[test]
    fn test_selection_payload_creation() {
        let payload = build_test_payload("test text", 100, 200, 1234567890);

        assert_eq!(payload.text, "test text");
        assert_eq!(payload.x, 100);
        assert_eq!(payload.y, 200);
        assert_eq!(payload.timestamp, 1234567890);
    }

    #[test]
    fn test_selection_payload_clone() {
        let payload = build_test_payload("test", 50, 75, 999);

        let cloned = payload.clone();
        assert_eq!(cloned.text, payload.text);
        assert_eq!(cloned.x, payload.x);
        assert_eq!(cloned.y, payload.y);
        assert_eq!(cloned.timestamp, payload.timestamp);
    }

    #[test]
    fn test_selection_payload_debug() {
        let payload = build_test_payload("debug test", 10, 20, 123);

        let debug_str = format!("{:?}", payload);
        assert!(debug_str.contains("SelectionPayload"));
        assert!(debug_str.contains("debug test"));
    }

    #[test]
    fn test_selection_payload_serialize() {
        let payload = build_test_payload("serialize test", 100, 200, 1000);

        let json = serde_json::to_string(&payload);
        assert!(json.is_ok());

        let json_str = json.unwrap();
        assert!(json_str.contains("serialize test"));
        assert!(json_str.contains("100"));
        assert!(json_str.contains("200"));
    }

    #[test]
    fn test_selection_payload_deserialize() {
        let json = r#"{"text":"deserialized","x":50,"y":60,"timestamp":2000}"#;
        let payload: Result<SelectionPayload, _> = serde_json::from_str(json);

        assert!(payload.is_ok());
        let payload = payload.unwrap();
        assert_eq!(payload.text, "deserialized");
        assert_eq!(payload.x, 50);
        assert_eq!(payload.y, 60);
        assert_eq!(payload.timestamp, 2000);
    }

    // SelectionConfig tests
    #[test]
    fn test_selection_config_default() {
        let config = SelectionConfig::default();

        assert!(config.enabled);
        assert_eq!(config.trigger_mode, "auto");
        assert_eq!(config.min_text_length, 1);
        assert_eq!(config.max_text_length, 5000);
        assert_eq!(config.delay_ms, 200);
        assert_eq!(config.target_language, "zh-CN");
        assert!(config.excluded_apps.is_empty());
    }

    #[test]
    fn test_selection_config_custom() {
        let config = SelectionConfig {
            enabled: false,
            trigger_mode: "shortcut".to_string(),
            min_text_length: 5,
            max_text_length: 1000,
            delay_ms: 100,
            target_language: "en-US".to_string(),
            excluded_apps: vec!["notepad.exe".to_string(), "calc.exe".to_string()],
        };

        assert!(!config.enabled);
        assert_eq!(config.trigger_mode, "shortcut");
        assert_eq!(config.min_text_length, 5);
        assert_eq!(config.max_text_length, 1000);
        assert_eq!(config.delay_ms, 100);
        assert_eq!(config.target_language, "en-US");
        assert_eq!(config.excluded_apps.len(), 2);
    }

    #[test]
    fn test_selection_config_clone() {
        let config = SelectionConfig::default();
        let cloned = config.clone();

        assert_eq!(cloned.enabled, config.enabled);
        assert_eq!(cloned.trigger_mode, config.trigger_mode);
        assert_eq!(cloned.min_text_length, config.min_text_length);
        assert_eq!(cloned.max_text_length, config.max_text_length);
    }

    #[test]
    fn test_selection_config_serialize() {
        let config = SelectionConfig::default();
        let json = serde_json::to_string(&config);

        assert!(json.is_ok());
        let json_str = json.unwrap();
        assert!(json_str.contains("enabled"));
        assert!(json_str.contains("trigger_mode"));
        assert!(json_str.contains("auto"));
    }

    #[test]
    fn test_selection_config_deserialize() {
        let json = r#"{
            "enabled": true,
            "trigger_mode": "manual",
            "min_text_length": 10,
            "max_text_length": 2000,
            "delay_ms": 300,
            "target_language": "ja-JP",
            "excluded_apps": ["app1", "app2"]
        }"#;

        let config: Result<SelectionConfig, _> = serde_json::from_str(json);
        assert!(config.is_ok());

        let config = config.unwrap();
        assert!(config.enabled);
        assert_eq!(config.trigger_mode, "manual");
        assert_eq!(config.min_text_length, 10);
        assert_eq!(config.max_text_length, 2000);
        assert_eq!(config.delay_ms, 300);
        assert_eq!(config.target_language, "ja-JP");
        assert_eq!(config.excluded_apps, vec!["app1", "app2"]);
    }

    // SelectionStatus tests
    #[test]
    fn test_selection_status_creation() {
        let status = SelectionStatus {
            is_running: true,
            toolbar_visible: false,
            toolbar_position: None,
            selected_text: None,
            last_selection_timestamp: None,
            config: SelectionConfig::default(),
        };

        assert!(status.is_running);
        assert!(!status.toolbar_visible);
        assert!(status.toolbar_position.is_none());
        assert!(status.selected_text.is_none());
        assert!(status.last_selection_timestamp.is_none());
    }

    #[test]
    fn test_selection_status_with_toolbar_visible() {
        let status = SelectionStatus {
            is_running: true,
            toolbar_visible: true,
            toolbar_position: Some((100, 200)),
            selected_text: Some("selected".to_string()),
            last_selection_timestamp: Some(1234567890),
            config: SelectionConfig::default(),
        };

        assert!(status.toolbar_visible);
        assert_eq!(status.toolbar_position, Some((100, 200)));
        assert_eq!(status.selected_text, Some("selected".to_string()));
        assert_eq!(status.last_selection_timestamp, Some(1234567890));
    }

    #[test]
    fn test_selection_status_clone() {
        let status = SelectionStatus {
            is_running: true,
            toolbar_visible: true,
            toolbar_position: Some((50, 75)),
            selected_text: Some("text".to_string()),
            last_selection_timestamp: Some(999),
            config: SelectionConfig::default(),
        };

        let cloned = status.clone();
        assert_eq!(cloned.is_running, status.is_running);
        assert_eq!(cloned.toolbar_visible, status.toolbar_visible);
        assert_eq!(cloned.toolbar_position, status.toolbar_position);
        assert_eq!(cloned.selected_text, status.selected_text);
    }

    #[test]
    fn test_selection_status_serialize() {
        let status = SelectionStatus {
            is_running: false,
            toolbar_visible: false,
            toolbar_position: None,
            selected_text: None,
            last_selection_timestamp: None,
            config: SelectionConfig::default(),
        };

        let json = serde_json::to_string(&status);
        assert!(json.is_ok());

        let json_str = json.unwrap();
        assert!(json_str.contains("is_running"));
        assert!(json_str.contains("toolbar_visible"));
        assert!(json_str.contains("config"));
    }

    #[test]
    fn test_selection_status_deserialize() {
        let json = r#"{
            "is_running": true,
            "toolbar_visible": true,
            "toolbar_position": [100, 200],
            "selected_text": "hello",
            "last_selection_timestamp": 12345,
            "config": {
                "enabled": true,
                "trigger_mode": "auto",
                "min_text_length": 1,
                "max_text_length": 5000,
                "delay_ms": 200,
                "target_language": "zh-CN",
                "excluded_apps": []
            }
        }"#;

        let status: Result<SelectionStatus, _> = serde_json::from_str(json);
        assert!(status.is_ok());

        let status = status.unwrap();
        assert!(status.is_running);
        assert!(status.toolbar_visible);
        assert_eq!(status.toolbar_position, Some((100, 200)));
        assert_eq!(status.selected_text, Some("hello".to_string()));
    }

    // Edge case tests
    #[test]
    fn test_selection_payload_empty_text() {
        let payload = build_test_payload("", 0, 0, 0);

        assert!(payload.text.is_empty());
    }

    #[test]
    fn test_selection_payload_unicode_text() {
        let payload = build_test_payload("你好世界 🌍 émoji", 100, 200, 1000);

        assert_eq!(payload.text, "你好世界 🌍 émoji");

        // Should serialize correctly
        let json = serde_json::to_string(&payload);
        assert!(json.is_ok());
    }

    #[test]
    fn test_selection_payload_negative_coordinates() {
        // Negative coordinates are valid (multi-monitor setups)
        let payload = build_test_payload("test", -100, -50, 1000);

        assert_eq!(payload.x, -100);
        assert_eq!(payload.y, -50);
    }

    #[test]
    fn test_selection_config_zero_values() {
        let config = SelectionConfig {
            enabled: true,
            trigger_mode: "auto".to_string(),
            min_text_length: 0,
            max_text_length: 0,
            delay_ms: 0,
            target_language: "".to_string(),
            excluded_apps: vec![],
        };

        assert_eq!(config.min_text_length, 0);
        assert_eq!(config.max_text_length, 0);
        assert_eq!(config.delay_ms, 0);
    }

    #[test]
    fn test_selection_config_large_values() {
        let config = SelectionConfig {
            enabled: true,
            trigger_mode: "auto".to_string(),
            min_text_length: usize::MAX,
            max_text_length: usize::MAX,
            delay_ms: u64::MAX,
            target_language: "test".to_string(),
            excluded_apps: vec![],
        };

        assert_eq!(config.min_text_length, usize::MAX);
        assert_eq!(config.max_text_length, usize::MAX);
        assert_eq!(config.delay_ms, u64::MAX);
    }

    #[test]
    fn test_selection_config_many_excluded_apps() {
        let excluded: Vec<String> = (0..100).map(|i| format!("app{}.exe", i)).collect();

        let config = SelectionConfig {
            enabled: true,
            trigger_mode: "auto".to_string(),
            min_text_length: 1,
            max_text_length: 5000,
            delay_ms: 200,
            target_language: "en-US".to_string(),
            excluded_apps: excluded.clone(),
        };

        assert_eq!(config.excluded_apps.len(), 100);
        assert_eq!(config.excluded_apps[0], "app0.exe");
        assert_eq!(config.excluded_apps[99], "app99.exe");
    }

    #[test]
    fn test_selection_status_debug() {
        let status = SelectionStatus {
            is_running: true,
            toolbar_visible: false,
            toolbar_position: None,
            selected_text: None,
            last_selection_timestamp: None,
            config: SelectionConfig::default(),
        };

        let debug_str = format!("{:?}", status);
        assert!(debug_str.contains("SelectionStatus"));
        assert!(debug_str.contains("is_running"));
    }

    // Integration-like tests (testing struct relationships)
    #[test]
    fn test_status_contains_config() {
        let config = SelectionConfig {
            enabled: false,
            trigger_mode: "shortcut".to_string(),
            min_text_length: 10,
            max_text_length: 100,
            delay_ms: 500,
            target_language: "de-DE".to_string(),
            excluded_apps: vec!["test.exe".to_string()],
        };

        let status = SelectionStatus {
            is_running: true,
            toolbar_visible: false,
            toolbar_position: None,
            selected_text: None,
            last_selection_timestamp: None,
            config: config.clone(),
        };

        assert_eq!(status.config.enabled, config.enabled);
        assert_eq!(status.config.trigger_mode, config.trigger_mode);
        assert_eq!(status.config.excluded_apps, config.excluded_apps);
    }

    #[test]
    fn test_payload_timestamp_is_recent() {
        let now = chrono::Utc::now().timestamp_millis();
        let payload = build_test_payload("test", 0, 0, now);

        // Timestamp should be very close to now
        let diff = (payload.timestamp - now).abs();
        assert!(diff < 1000); // Within 1 second
    }

    #[test]
    fn test_config_text_length_validation_logic() {
        let config = SelectionConfig::default();

        // Test text length validation logic that would be used elsewhere
        let short_text = "ab";
        let valid_text = "abc";
        let long_text = "a".repeat(6000);

        assert!(short_text.len() >= config.min_text_length);
        assert!(valid_text.len() >= config.min_text_length);
        assert!(valid_text.len() <= config.max_text_length);
        assert!(long_text.len() > config.max_text_length);
    }

    #[test]
    fn test_config_trigger_mode_values() {
        // Test that both supported trigger modes work
        let auto_config = SelectionConfig {
            trigger_mode: "auto".to_string(),
            ..SelectionConfig::default()
        };

        let shortcut_config = SelectionConfig {
            trigger_mode: "shortcut".to_string(),
            ..SelectionConfig::default()
        };

        assert_eq!(auto_config.trigger_mode, "auto");
        assert_eq!(shortcut_config.trigger_mode, "shortcut");
    }

    #[test]
    fn test_parse_trigger_mode_aliases() {
        assert_eq!(parse_trigger_mode("auto"), TriggerMode::Auto);
        assert_eq!(parse_trigger_mode("manual"), TriggerMode::Shortcut);
        assert_eq!(parse_trigger_mode("shortcut"), TriggerMode::Shortcut);
        assert_eq!(parse_trigger_mode("both"), TriggerMode::Both);
        assert_eq!(parse_trigger_mode("unknown"), TriggerMode::Auto);
    }

    #[test]
    fn test_trigger_mode_support_flags() {
        assert!(trigger_mode_supports_auto("auto"));
        assert!(trigger_mode_supports_auto("both"));
        assert!(!trigger_mode_supports_auto("manual"));

        assert!(trigger_mode_supports_manual("auto"));
        assert!(trigger_mode_supports_manual("manual"));
        assert!(trigger_mode_supports_manual("both"));
    }

    #[test]
    fn test_empty_selection_detection() {
        assert!(is_effectively_empty_selection(""));
        assert!(is_effectively_empty_selection("   \n\t "));
        assert!(!is_effectively_empty_selection("hello"));
    }

    #[test]
    fn test_excluded_app_matching() {
        let cfg = SelectionConfig {
            enabled: true,
            trigger_mode: "auto".to_string(),
            min_text_length: 1,
            max_text_length: 5000,
            delay_ms: 200,
            target_language: "zh-CN".to_string(),
            excluded_apps: vec!["notepad.exe".to_string()],
        };

        let source = SourceAppInfo {
            name: "Notepad.exe".to_string(),
            process: "notepad.exe".to_string(),
            window_title: "Notes".to_string(),
            app_type: "editor".to_string(),
        };

        assert!(SelectionManager::is_excluded_app(&cfg, Some(&source)));
        assert!(!SelectionManager::is_excluded_app(&cfg, None));
    }

    #[test]
    fn test_round_trip_serialization() {
        // Test that serialization and deserialization are consistent
        let original_config = SelectionConfig {
            enabled: true,
            trigger_mode: "auto".to_string(),
            min_text_length: 5,
            max_text_length: 1000,
            delay_ms: 150,
            target_language: "fr-FR".to_string(),
            excluded_apps: vec!["app1.exe".to_string(), "app2.exe".to_string()],
        };

        let json = serde_json::to_string(&original_config).unwrap();
        let restored: SelectionConfig = serde_json::from_str(&json).unwrap();

        assert_eq!(original_config.enabled, restored.enabled);
        assert_eq!(original_config.trigger_mode, restored.trigger_mode);
        assert_eq!(original_config.min_text_length, restored.min_text_length);
        assert_eq!(original_config.max_text_length, restored.max_text_length);
        assert_eq!(original_config.delay_ms, restored.delay_ms);
        assert_eq!(original_config.target_language, restored.target_language);
        assert_eq!(original_config.excluded_apps, restored.excluded_apps);
    }
}
