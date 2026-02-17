//! Input Completion Module
//!
//! Provides AI-powered real-time input completion similar to GitHub Copilot's Tab completion.
//! Features:
//! - IME (Input Method Editor) state detection
//! - Real-time keyboard input capture
//! - AI-powered text completion suggestions
//! - Overlay window for displaying suggestions

mod completion_service;
mod config;
mod ime_state;
mod keyboard_monitor;
pub mod types;

pub use completion_service::CompletionService;
pub use config::{CompletionConfig, InputCaptureMode};
pub use ime_state::{ImeMonitor, ImeState};
// Note: InputMode is used in tests but not re-exported to avoid unused import warning
#[cfg(test)]
use ime_state::InputMode;
pub use keyboard_monitor::{KeyEvent, KeyEventType, KeyboardMonitor};
pub use types::{
    CompletionContext, CompletionFeedback, CompletionMode, CompletionRequestV2, CompletionResult,
    CompletionResultV2, CompletionStatus, CompletionSuggestion, CompletionSuggestionRef,
    CompletionSurface, InputCompletionEvent,
};

use parking_lot::RwLock;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

/// Input Completion Manager
///
/// Coordinates IME state detection, keyboard monitoring, and AI completion.
pub struct InputCompletionManager {
    /// Application handle
    app_handle: AppHandle,
    /// Configuration
    config: Arc<RwLock<CompletionConfig>>,
    /// IME monitor
    ime_monitor: Arc<ImeMonitor>,
    /// Keyboard monitor
    keyboard_monitor: Arc<KeyboardMonitor>,
    /// Completion service
    completion_service: Arc<CompletionService>,
    /// Whether the manager is running
    is_running: Arc<AtomicBool>,
    /// Current input buffer
    input_buffer: Arc<RwLock<String>>,
    /// Current completion suggestion
    current_suggestion: Arc<RwLock<Option<CompletionSuggestion>>>,
    /// Indexed active suggestions for v2 accept/dismiss by suggestion_id
    active_suggestions: Arc<RwLock<HashMap<String, CompletionSuggestion>>>,
    /// Debounce task handle
    debounce_handle: Arc<RwLock<Option<tauri::async_runtime::JoinHandle<()>>>>,
    /// Last key event timestamp (ms) for adaptive debounce typing speed calculation
    last_key_timestamp: Arc<AtomicU64>,
}

impl InputCompletionManager {
    /// Create a new InputCompletionManager
    pub fn new(app_handle: AppHandle) -> Self {
        log::info!("Creating InputCompletionManager");

        let config = Arc::new(RwLock::new(CompletionConfig::default()));
        let ime_monitor = Arc::new(ImeMonitor::new());
        let keyboard_monitor = Arc::new(KeyboardMonitor::new());
        let completion_service = Arc::new(CompletionService::new());

        Self {
            app_handle,
            config,
            ime_monitor,
            keyboard_monitor,
            completion_service,
            is_running: Arc::new(AtomicBool::new(false)),
            input_buffer: Arc::new(RwLock::new(String::new())),
            current_suggestion: Arc::new(RwLock::new(None)),
            active_suggestions: Arc::new(RwLock::new(HashMap::new())),
            debounce_handle: Arc::new(RwLock::new(None)),
            last_key_timestamp: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Start the input completion system
    pub async fn start(&self) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            log::warn!("InputCompletionManager is already running");
            return Ok(());
        }

        let config = self.config.read().clone();
        if !config.enabled {
            log::info!("Input completion is disabled in config");
            return Ok(());
        }

        log::info!("Starting InputCompletionManager");
        self.is_running.store(true, Ordering::SeqCst);

        // Emit started event
        let _ = self
            .app_handle
            .emit("input-completion://event", InputCompletionEvent::Started);

        // Start IME monitoring
        self.ime_monitor.start()?;

        // Spawn IME state event broadcaster so frontend can consume state changes.
        let ime_monitor_for_events = self.ime_monitor.clone();
        let app_handle_for_ime = self.app_handle.clone();
        let is_running_for_ime = self.is_running.clone();
        tauri::async_runtime::spawn(async move {
            let mut last_state: Option<ImeState> = None;
            while is_running_for_ime.load(Ordering::SeqCst) {
                let current_state = ime_monitor_for_events.get_state();
                let changed = last_state.as_ref() != Some(&current_state);
                if changed {
                    let _ = app_handle_for_ime.emit(
                        "input-completion://event",
                        InputCompletionEvent::ImeStateChanged(current_state.clone()),
                    );
                    last_state = Some(current_state);
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(120)).await;
            }
        });

        // Global keyboard capture is now legacy compatibility path.
        if config.trigger.input_capture_mode == InputCaptureMode::GlobalLegacy {
            let (key_tx, mut key_rx) = mpsc::unbounded_channel::<KeyEvent>();
            if let Err(err) = self.keyboard_monitor.start(key_tx) {
                self.ime_monitor.stop();
                self.is_running.store(false, Ordering::SeqCst);
                return Err(err);
            }

            // Spawn event processing task
            let is_running = self.is_running.clone();
            let config = self.config.clone();
            let ime_monitor = self.ime_monitor.clone();
            let input_buffer = self.input_buffer.clone();
            let current_suggestion = self.current_suggestion.clone();
            let active_suggestions = self.active_suggestions.clone();
            let completion_service = self.completion_service.clone();
            let app_handle = self.app_handle.clone();
            let debounce_handle = self.debounce_handle.clone();
            let last_key_timestamp = self.last_key_timestamp.clone();

            tauri::async_runtime::spawn(async move {
                log::info!("Input completion event loop started (legacy global capture)");

                while is_running.load(Ordering::SeqCst) {
                    tokio::select! {
                        Some(key_event) = key_rx.recv() => {
                            log::trace!("Key event at {}: {}", key_event.timestamp, key_event.key);
                            Self::handle_key_event(
                                &key_event,
                                &config,
                                &ime_monitor,
                                &input_buffer,
                                &current_suggestion,
                                &active_suggestions,
                                &completion_service,
                                &app_handle,
                                &debounce_handle,
                                &last_key_timestamp,
                            ).await;
                        }
                        _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                            // Periodic check
                        }
                    }
                }

                log::info!("Input completion event loop stopped");
            });
        } else {
            log::info!("Input completion running in local-only trigger mode");
        }

        Ok(())
    }

    /// Stop the input completion system
    pub fn stop(&self) {
        log::info!("Stopping InputCompletionManager");
        self.is_running.store(false, Ordering::SeqCst);

        // Emit stopped event
        let _ = self
            .app_handle
            .emit("input-completion://event", InputCompletionEvent::Stopped);

        // Stop keyboard monitor with timeout for graceful shutdown
        if self.keyboard_monitor.is_running() {
            self.keyboard_monitor.stop_with_timeout(2000);
        }
        self.ime_monitor.stop();

        // Cancel any pending debounce
        if let Some(handle) = self.debounce_handle.write().take() {
            handle.abort();
        }

        // Clear state
        self.input_buffer.write().clear();
        *self.current_suggestion.write() = None;
        self.active_suggestions.write().clear();
        self.last_key_timestamp.store(0, Ordering::Relaxed);
    }

    /// Compute adaptive debounce delay based on typing speed
    fn compute_adaptive_debounce(
        cfg: &CompletionConfig,
        last_key_timestamp: &Arc<AtomicU64>,
        current_timestamp: u64,
    ) -> u64 {
        let adaptive = &cfg.trigger.adaptive_debounce;
        if !adaptive.enabled {
            return cfg.trigger.debounce_ms;
        }

        let prev_timestamp = last_key_timestamp.load(Ordering::Relaxed);
        if prev_timestamp == 0 {
            return cfg.trigger.debounce_ms;
        }

        let interval_ms = current_timestamp.saturating_sub(prev_timestamp);
        if interval_ms == 0 {
            return adaptive.min_debounce_ms;
        }

        // chars_per_sec = 1000 / interval_ms
        let typing_speed = 1000.0 / interval_ms as f64;

        if typing_speed >= adaptive.fast_typing_threshold {
            // Fast typing: use minimum debounce (wait less, user knows what they're typing)
            adaptive.min_debounce_ms
        } else if typing_speed <= adaptive.slow_typing_threshold {
            // Slow typing: use maximum debounce (give them time to think)
            adaptive.max_debounce_ms
        } else {
            // Interpolate linearly between min and max
            let range = adaptive.fast_typing_threshold - adaptive.slow_typing_threshold;
            let ratio = (typing_speed - adaptive.slow_typing_threshold) / range;
            let debounce_range = adaptive.max_debounce_ms as f64 - adaptive.min_debounce_ms as f64;
            (adaptive.max_debounce_ms as f64 - ratio * debounce_range) as u64
        }
    }

    /// Handle a key event
    #[allow(clippy::too_many_arguments)]
    async fn handle_key_event(
        key_event: &KeyEvent,
        config: &Arc<RwLock<CompletionConfig>>,
        ime_monitor: &Arc<ImeMonitor>,
        input_buffer: &Arc<RwLock<String>>,
        current_suggestion: &Arc<RwLock<Option<CompletionSuggestion>>>,
        active_suggestions: &Arc<RwLock<HashMap<String, CompletionSuggestion>>>,
        completion_service: &Arc<CompletionService>,
        app_handle: &AppHandle,
        debounce_handle: &Arc<RwLock<Option<tauri::async_runtime::JoinHandle<()>>>>,
        last_key_timestamp: &Arc<AtomicU64>,
    ) {
        let cfg = config.read().clone();

        // Skip if IME is composing (user is typing CJK characters)
        let ime_state = ime_monitor.get_state();
        if ime_state.is_composing {
            log::trace!("Skipping completion: IME is composing");
            return;
        }

        match key_event.event_type {
            KeyEventType::KeyPress => {
                // Handle Tab key - accept suggestion
                if key_event.key == "Tab" {
                    if let Some(suggestion) = current_suggestion.read().clone() {
                        log::debug!("Accepting completion suggestion");

                        // Emit accept event using structured event type
                        let _ = app_handle.emit(
                            "input-completion://event",
                            InputCompletionEvent::Accept(suggestion.clone()),
                        );

                        // Clear current suggestion
                        *current_suggestion.write() = None;
                        active_suggestions.write().clear();
                        input_buffer.write().clear();

                        return;
                    }
                }

                // Handle Escape - dismiss suggestion
                if key_event.key == "Escape" && current_suggestion.read().is_some() {
                    log::debug!("Dismissing completion suggestion");
                    *current_suggestion.write() = None;
                    active_suggestions.write().clear();

                    let _ =
                        app_handle.emit("input-completion://event", InputCompletionEvent::Dismiss);
                    return;
                }

                // Handle character input
                if let Some(ch) = key_event.char {
                    // Skip if modifier keys are held and skip_with_modifiers is enabled
                    if cfg.trigger.skip_with_modifiers
                        && (key_event.ctrl || key_event.alt || key_event.shift)
                    {
                        log::trace!("Skipping completion: modifier key held");
                        return;
                    }

                    // Check if character should be skipped
                    if cfg.trigger.skip_chars.contains(&ch) {
                        log::trace!("Skipping completion: skip char '{}'", ch);
                        // Still add to buffer but don't trigger completion
                        let mut buffer = input_buffer.write();
                        buffer.push(ch);
                        if buffer.len() > cfg.trigger.max_context_length {
                            let excess = buffer.len() - cfg.trigger.max_context_length;
                            buffer.drain(0..excess);
                        }
                        // Clear suggestion on skip chars
                        *current_suggestion.write() = None;
                        active_suggestions.write().clear();
                        return;
                    }

                    let mut buffer = input_buffer.write();
                    buffer.push(ch);

                    // Limit buffer size
                    if buffer.len() > cfg.trigger.max_context_length {
                        let excess = buffer.len() - cfg.trigger.max_context_length;
                        buffer.drain(0..excess);
                    }

                    log::trace!("Input buffer updated: {} chars", buffer.len());
                }

                // Handle backspace
                if key_event.key == "Backspace" {
                    let mut buffer = input_buffer.write();
                    buffer.pop();

                    // Clear suggestion on backspace
                    *current_suggestion.write() = None;
                    active_suggestions.write().clear();
                    let _ =
                        app_handle.emit("input-completion://event", InputCompletionEvent::Dismiss);
                }
            }
            KeyEventType::KeyRelease => {
                // Trigger completion after debounce
                let buffer = input_buffer.read();
                let buffer_len = buffer.len();
                let buffer_text = buffer.clone();

                // Check word boundary trigger if enabled
                if cfg.trigger.trigger_on_word_boundary {
                    // Only trigger if the last character is a word boundary
                    if let Some(last_char) = buffer.chars().last() {
                        let is_word_boundary = last_char.is_whitespace()
                            || last_char == '.'
                            || last_char == ','
                            || last_char == ';'
                            || last_char == ':'
                            || last_char == '('
                            || last_char == ')'
                            || last_char == '{'
                            || last_char == '}'
                            || last_char == '['
                            || last_char == ']';

                        if !is_word_boundary {
                            log::trace!("Skipping completion: not at word boundary");
                            drop(buffer);
                            return;
                        }
                    }
                }
                drop(buffer);

                if buffer_len >= cfg.trigger.min_context_length {
                    // Try prefix cache matching first (instant, no API call needed)
                    // If user types characters that match an existing cached suggestion,
                    // return the remaining portion immediately
                    if let Some(prefix_result) =
                        completion_service.get_cached_by_prefix(&buffer_text)
                    {
                        if let Some(suggestion) = prefix_result.suggestions.first() {
                            log::debug!(
                                "Prefix cache hit: {}",
                                suggestion.text.chars().take(50).collect::<String>()
                            );
                            *current_suggestion.write() = Some(suggestion.clone());
                            {
                                let mut suggestions = active_suggestions.write();
                                suggestions.clear();
                                suggestions.insert(suggestion.id.clone(), suggestion.clone());
                            }
                            let _ = app_handle.emit(
                                "input-completion://event",
                                InputCompletionEvent::Suggestion(suggestion.clone()),
                            );
                            // Update timestamp for adaptive debounce
                            last_key_timestamp
                                .store(key_event.timestamp.max(0) as u64, Ordering::Relaxed);
                            return;
                        }
                    }

                    // Cancel previous debounce
                    if let Some(handle) = debounce_handle.write().take() {
                        handle.abort();
                    }

                    // Compute adaptive debounce delay based on typing speed
                    let current_ts = key_event.timestamp.max(0) as u64;
                    let debounce_ms =
                        Self::compute_adaptive_debounce(&cfg, last_key_timestamp, current_ts);

                    // Update last key timestamp for next adaptive debounce calculation
                    last_key_timestamp.store(current_ts, Ordering::Relaxed);

                    let completion_service = completion_service.clone();
                    let current_suggestion = current_suggestion.clone();
                    let active_suggestions = active_suggestions.clone();
                    let app_handle = app_handle.clone();
                    let model_config = cfg.model.clone();
                    let ime_state = ime_state.clone();

                    let handle = tauri::async_runtime::spawn(async move {
                        tokio::time::sleep(tokio::time::Duration::from_millis(debounce_ms)).await;

                        // Request completion
                        let context = CompletionContext {
                            text: buffer_text,
                            cursor_position: None,
                            file_path: None,
                            language: None,
                            ime_state: Some(ime_state),
                            mode: None,
                            surface: Some(CompletionSurface::Generic),
                        };

                        match completion_service
                            .get_completion(&context, &model_config)
                            .await
                        {
                            Ok(result) => {
                                if let Some(suggestion) = result.suggestions.first() {
                                    log::debug!(
                                        "Got completion suggestion: {}",
                                        suggestion.text.chars().take(50).collect::<String>()
                                    );

                                    *current_suggestion.write() = Some(suggestion.clone());
                                    {
                                        let mut suggestions = active_suggestions.write();
                                        suggestions.clear();
                                        for item in &result.suggestions {
                                            suggestions.insert(item.id.clone(), item.clone());
                                        }
                                    }

                                    // Emit suggestion event using structured event type
                                    let _ = app_handle.emit(
                                        "input-completion://event",
                                        InputCompletionEvent::Suggestion(suggestion.clone()),
                                    );
                                }
                            }
                            Err(e) => {
                                log::warn!("Completion request failed: {}", e);
                                let _ = app_handle.emit(
                                    "input-completion://event",
                                    InputCompletionEvent::Error(e),
                                );
                            }
                        }
                    });

                    *debounce_handle.write() = Some(handle);
                }
            }
        }
    }

    /// Get current IME state
    pub fn get_ime_state(&self) -> ImeState {
        self.ime_monitor.get_state()
    }

    /// Get current suggestion
    pub fn get_current_suggestion(&self) -> Option<CompletionSuggestion> {
        self.current_suggestion.read().clone()
    }

    fn set_active_suggestions(&self, suggestions: &[CompletionSuggestion]) {
        let mut active = self.active_suggestions.write();
        active.clear();
        for suggestion in suggestions {
            active.insert(suggestion.id.clone(), suggestion.clone());
        }
    }

    fn clear_suggestions(&self) {
        *self.current_suggestion.write() = None;
        self.active_suggestions.write().clear();
    }

    /// Accept current suggestion
    pub fn accept_suggestion(&self) -> Option<CompletionSuggestion> {
        let suggestion_id = self
            .current_suggestion
            .read()
            .as_ref()
            .map(|item| item.id.clone())
            .unwrap_or_default();
        self.accept_suggestion_v2(CompletionSuggestionRef { suggestion_id })
    }

    /// Accept suggestion by id (v2 API)
    pub fn accept_suggestion_v2(
        &self,
        suggestion_ref: CompletionSuggestionRef,
    ) -> Option<CompletionSuggestion> {
        let accepted = if suggestion_ref.suggestion_id.is_empty() {
            self.current_suggestion.read().clone()
        } else {
            let current = self.current_suggestion.read().clone();
            if current
                .as_ref()
                .is_some_and(|item| item.id == suggestion_ref.suggestion_id)
            {
                current
            } else {
                self.active_suggestions
                    .write()
                    .remove(&suggestion_ref.suggestion_id)
            }
        };

        if let Some(suggestion) = accepted.clone() {
            self.input_buffer.write().clear();
            self.clear_suggestions();
            let _ = self.app_handle.emit(
                "input-completion://event",
                InputCompletionEvent::Accept(suggestion),
            );
        }

        accepted
    }

    /// Dismiss current suggestion
    pub fn dismiss_suggestion(&self) {
        let current_id = self
            .current_suggestion
            .read()
            .as_ref()
            .map(|item| item.id.clone())
            .unwrap_or_default();
        self.dismiss_suggestion_v2(Some(CompletionSuggestionRef {
            suggestion_id: current_id,
        }));
    }

    /// Dismiss suggestion by id (v2 API)
    pub fn dismiss_suggestion_v2(&self, suggestion_ref: Option<CompletionSuggestionRef>) -> bool {
        let should_dismiss = if let Some(suggestion_ref) = suggestion_ref {
            if suggestion_ref.suggestion_id.is_empty() {
                self.current_suggestion.read().is_some()
                    || !self.active_suggestions.read().is_empty()
            } else {
                self.active_suggestions
                    .read()
                    .contains_key(&suggestion_ref.suggestion_id)
                    || self
                        .current_suggestion
                        .read()
                        .as_ref()
                        .is_some_and(|item| item.id == suggestion_ref.suggestion_id)
            }
        } else {
            self.current_suggestion.read().is_some() || !self.active_suggestions.read().is_empty()
        };

        if should_dismiss {
            self.clear_suggestions();
            let _ = self
                .app_handle
                .emit("input-completion://event", InputCompletionEvent::Dismiss);
        }
        should_dismiss
    }

    /// Return true if active suggestion exists by id.
    pub fn has_suggestion_id(&self, suggestion_id: &str) -> bool {
        self.active_suggestions.read().contains_key(suggestion_id)
            || self
                .current_suggestion
                .read()
                .as_ref()
                .is_some_and(|item| item.id == suggestion_id)
    }

    /// Get active suggestion by id.
    pub fn get_suggestion_by_id(&self, suggestion_id: &str) -> Option<CompletionSuggestion> {
        self.active_suggestions.read().get(suggestion_id).cloned()
    }

    /// Get all active suggestions.
    pub fn get_active_suggestions(&self) -> Vec<CompletionSuggestion> {
        self.active_suggestions.read().values().cloned().collect()
    }

    /// Convert v2 request to internal completion context.
    fn request_to_context(&self, request: &CompletionRequestV2) -> CompletionContext {
        CompletionContext {
            text: request.text.clone(),
            cursor_position: request.cursor_position.clone(),
            file_path: request.file_path.clone(),
            language: request.language.clone(),
            ime_state: request
                .ime_state
                .clone()
                .or_else(|| Some(self.ime_monitor.get_state())),
            mode: request.mode.clone(),
            surface: request.surface.clone(),
        }
    }

    /// Manually trigger completion using v2 request payload.
    pub async fn trigger_completion_v2(
        &self,
        request: CompletionRequestV2,
    ) -> Result<CompletionResultV2, String> {
        let config = self.config.read().clone();
        let request_id = request
            .request_id
            .clone()
            .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let surface = request.surface.clone().unwrap_or_default();
        let context = self.request_to_context(&request);
        let mode = CompletionService::resolve_mode(&context);

        let result = self
            .completion_service
            .get_completion(&context, &config.model)
            .await?;

        if let Some(first) = result.suggestions.first() {
            *self.current_suggestion.write() = Some(first.clone());
            self.set_active_suggestions(&result.suggestions);
            let _ = self.app_handle.emit(
                "input-completion://event",
                InputCompletionEvent::Suggestion(first.clone()),
            );
        } else {
            self.clear_suggestions();
        }

        Ok(CompletionResultV2 {
            request_id,
            surface,
            mode,
            suggestions: result.suggestions,
            latency_ms: result.latency_ms,
            model: result.model,
            cached: result.cached,
        })
    }

    /// Manually trigger completion for given text
    pub async fn trigger_completion(&self, text: &str) -> Result<CompletionResult, String> {
        let result = self
            .trigger_completion_v2(CompletionRequestV2 {
                request_id: None,
                text: text.to_string(),
                cursor_position: None,
                file_path: None,
                language: None,
                ime_state: Some(self.ime_monitor.get_state()),
                mode: None,
                surface: Some(CompletionSurface::Generic),
            })
            .await?;

        Ok(CompletionResult {
            suggestions: result.suggestions,
            latency_ms: result.latency_ms,
            model: result.model,
            cached: result.cached,
        })
    }

    /// Trigger completion for current text and surface
    pub async fn trigger_completion_with_surface(
        &self,
        text: &str,
        surface: CompletionSurface,
        mode: Option<CompletionMode>,
    ) -> Result<CompletionResultV2, String> {
        self.trigger_completion_v2(CompletionRequestV2 {
            request_id: None,
            text: text.to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: Some(self.ime_monitor.get_state()),
            mode,
            surface: Some(surface),
        })
        .await
    }

    /// Update configuration
    pub fn update_config(&self, config: CompletionConfig) {
        *self.config.write() = config;
        log::info!("Input completion config updated");
    }

    /// Get current configuration
    pub fn get_config(&self) -> CompletionConfig {
        self.config.read().clone()
    }

    /// Check if manager is running
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    /// Get completion status
    pub fn get_status(&self) -> CompletionStatus {
        CompletionStatus {
            is_running: self.is_running(),
            ime_state: self.get_ime_state(),
            has_suggestion: self.current_suggestion.read().is_some(),
            buffer_length: self.input_buffer.read().len(),
        }
    }

    /// Get completion service statistics
    pub fn get_stats(&self) -> types::CompletionStats {
        self.completion_service.get_stats()
    }

    /// Reset completion service statistics
    pub fn reset_stats(&self) {
        self.completion_service.reset_stats();
    }

    /// Submit quality feedback for a completion suggestion
    pub fn submit_feedback(&self, feedback: CompletionFeedback) {
        self.completion_service.submit_feedback(feedback);
    }

    /// Clear completion cache
    pub fn clear_cache(&self) {
        self.completion_service.clear_cache();
        log::info!("Completion cache cleared");
    }
}

impl Drop for InputCompletionManager {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use config::CompletionProvider;
    use types::CompletionType;

    #[cfg(any())]
    fn create_manager() -> InputCompletionManager {
        let app = tauri::test::mock_app();
        InputCompletionManager::new(app.handle().clone())
    }

    #[test]
    fn test_config_default() {
        let config = CompletionConfig::default();
        assert!(config.enabled);
        assert!(config.trigger.debounce_ms >= 200);
        assert!(config.trigger.min_context_length >= 3);
    }

    #[test]
    fn test_ime_state_default() {
        let state = ImeState::default();
        assert!(!state.is_composing);
        assert!(!state.is_active);
        assert_eq!(state.input_mode, InputMode::English);
    }

    #[test]
    fn test_completion_context_default() {
        let context = CompletionContext::default();
        assert!(context.text.is_empty());
        assert!(context.cursor_position.is_none());
        assert!(context.file_path.is_none());
        assert!(context.language.is_none());
    }

    #[test]
    fn test_completion_result_default() {
        let result = CompletionResult::default();
        assert!(result.suggestions.is_empty());
        assert_eq!(result.latency_ms, 0);
        assert!(!result.cached);
    }

    #[test]
    fn test_completion_suggestion_creation() {
        let suggestion =
            CompletionSuggestion::new("test completion".to_string(), 0.9, CompletionType::Line);

        assert_eq!(suggestion.text, "test completion");
        assert_eq!(suggestion.confidence, 0.9);
        assert!(!suggestion.id.is_empty());
    }

    #[test]
    fn test_completion_status_struct() {
        let status = CompletionStatus {
            is_running: true,
            ime_state: ImeState::default(),
            has_suggestion: false,
            buffer_length: 10,
        };

        assert!(status.is_running);
        assert!(!status.has_suggestion);
        assert_eq!(status.buffer_length, 10);
    }

    #[test]
    fn test_key_event_type() {
        assert_eq!(KeyEventType::KeyPress, KeyEventType::KeyPress);
        assert_ne!(KeyEventType::KeyPress, KeyEventType::KeyRelease);
    }

    #[test]
    fn test_key_event_creation() {
        let event = KeyEvent {
            event_type: KeyEventType::KeyPress,
            key: "A".to_string(),
            char: Some('a'),
            ctrl: false,
            shift: false,
            alt: false,
            timestamp: 12345,
        };

        assert_eq!(event.key, "A");
        assert_eq!(event.char, Some('a'));
    }

    #[test]
    fn test_input_mode_variants() {
        let modes = vec![
            InputMode::English,
            InputMode::Chinese,
            InputMode::Japanese,
            InputMode::Korean,
            InputMode::Other("Thai".to_string()),
        ];

        for mode in modes {
            let json = serde_json::to_string(&mode).unwrap();
            let parsed: InputMode = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, mode);
        }
    }

    #[test]
    fn test_completion_provider_variants() {
        let providers = vec![
            CompletionProvider::Ollama,
            CompletionProvider::OpenAI,
            CompletionProvider::Groq,
            CompletionProvider::Auto,
            CompletionProvider::Custom,
        ];

        for provider in providers {
            let json = serde_json::to_string(&provider).unwrap();
            let parsed: CompletionProvider = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, provider);
        }
    }

    #[test]
    fn test_completion_config_model() {
        let config = CompletionConfig::default();
        assert_eq!(config.model.provider, CompletionProvider::Ollama);
        assert_eq!(config.model.model_id, "qwen2.5-coder:0.5b");
    }

    #[test]
    fn test_completion_config_trigger() {
        let config = CompletionConfig::default();
        assert!(config.trigger.debounce_ms > 0);
        assert!(config.trigger.min_context_length > 0);
        assert!(config.trigger.max_context_length > config.trigger.min_context_length);
    }

    #[test]
    fn test_completion_config_ui() {
        let config = CompletionConfig::default();
        assert!(config.ui.show_inline_preview);
        assert!(config.ui.max_suggestions >= 1);
    }

    #[test]
    fn test_ime_monitor_creation() {
        let monitor = ImeMonitor::new();
        let state = monitor.get_state();
        assert!(!state.is_active);
    }

    #[test]
    fn test_keyboard_monitor_creation() {
        let monitor = KeyboardMonitor::new();
        assert!(!monitor.is_running());
    }

    #[test]
    fn test_completion_service_creation() {
        let service = CompletionService::new();
        // Service should be created successfully
        let _ = service;
    }

    #[test]
    fn test_completion_context_with_language() {
        let context = CompletionContext {
            text: "fn main()".to_string(),
            cursor_position: None,
            file_path: Some("main.rs".to_string()),
            language: Some("rust".to_string()),
            ime_state: None,
            mode: Some(CompletionMode::Code),
            surface: Some(CompletionSurface::Generic),
        };

        assert_eq!(context.language, Some("rust".to_string()));
        assert_eq!(context.file_path, Some("main.rs".to_string()));
    }

    #[test]
    fn test_completion_event_serialization() {
        let events = vec![
            InputCompletionEvent::Started,
            InputCompletionEvent::Stopped,
            InputCompletionEvent::Dismiss,
            InputCompletionEvent::Error("test error".to_string()),
        ];

        for event in events {
            let json = serde_json::to_string(&event).unwrap();
            assert!(!json.is_empty());
        }
    }

    #[test]
    fn test_completion_type_variants() {
        let types = vec![
            CompletionType::Line,
            CompletionType::Block,
            CompletionType::Word,
            CompletionType::Snippet,
        ];

        for t in types {
            let json = serde_json::to_string(&t).unwrap();
            let parsed: CompletionType = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, t);
        }
    }

    #[test]
    fn test_ime_state_with_composition() {
        let state = ImeState {
            is_active: true,
            is_composing: true,
            input_mode: InputMode::Chinese,
            ime_name: Some("Microsoft Pinyin".to_string()),
            composition_string: Some("zhong wen".to_string()),
            candidates: vec!["中文".to_string()],
        };

        assert!(state.is_active);
        assert!(state.is_composing);
        assert_eq!(state.candidates.len(), 1);
    }

    #[test]
    fn test_completion_status_serialization() {
        let status = CompletionStatus {
            is_running: true,
            ime_state: ImeState::default(),
            has_suggestion: true,
            buffer_length: 25,
        };

        let json = serde_json::to_string(&status).unwrap();
        let parsed: CompletionStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.is_running, status.is_running);
        assert_eq!(parsed.buffer_length, status.buffer_length);
    }

    #[test]
    fn test_config_clone() {
        let config = CompletionConfig::default();
        let cloned = config.clone();

        assert_eq!(config.enabled, cloned.enabled);
        assert_eq!(config.model.model_id, cloned.model.model_id);
    }

    #[test]
    fn test_suggestion_clone() {
        let suggestion = CompletionSuggestion::new("test".to_string(), 0.8, CompletionType::Line);
        let cloned = suggestion.clone();

        assert_eq!(suggestion.text, cloned.text);
        assert_eq!(suggestion.id, cloned.id);
    }

    #[cfg(any())]
    #[test]
    fn test_start_local_only_keeps_keyboard_monitor_stopped() {
        let manager = create_manager();
        let mut config = CompletionConfig::default();
        config.trigger.input_capture_mode = InputCaptureMode::LocalOnly;
        manager.update_config(config);

        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("should create runtime")
            .block_on(async { manager.start().await })
            .expect("local-only mode should start");
        std::thread::sleep(std::time::Duration::from_millis(30));
        assert!(!manager.keyboard_monitor.is_running());
        manager.stop();
    }

    #[cfg(any())]
    #[test]
    fn test_accept_suggestion_v2_requires_matching_id() {
        let manager = create_manager();
        let first = CompletionSuggestion::new("first".to_string(), 0.9, CompletionType::Line);
        let second = CompletionSuggestion::new("second".to_string(), 0.85, CompletionType::Line);
        *manager.current_suggestion.write() = Some(first.clone());
        manager.set_active_suggestions(&[first.clone(), second.clone()]);

        let mismatch = manager.accept_suggestion_v2(CompletionSuggestionRef {
            suggestion_id: "unknown-id".to_string(),
        });
        assert!(mismatch.is_none());
        assert!(manager.get_current_suggestion().is_some());

        let accepted = manager.accept_suggestion_v2(CompletionSuggestionRef {
            suggestion_id: second.id.clone(),
        });
        assert_eq!(
            accepted.as_ref().map(|item| item.id.clone()),
            Some(second.id)
        );
        assert!(manager.get_current_suggestion().is_none());
        assert!(manager.get_active_suggestions().is_empty());
    }

    #[cfg(any())]
    #[test]
    fn test_dismiss_suggestion_v2_requires_matching_id() {
        let manager = create_manager();
        let suggestion =
            CompletionSuggestion::new("dismiss".to_string(), 0.7, CompletionType::Line);
        *manager.current_suggestion.write() = Some(suggestion.clone());
        manager.set_active_suggestions(std::slice::from_ref(&suggestion));

        let mismatch = manager.dismiss_suggestion_v2(Some(CompletionSuggestionRef {
            suggestion_id: "not-found".to_string(),
        }));
        assert!(!mismatch);
        assert!(manager.get_current_suggestion().is_some());

        let dismissed = manager.dismiss_suggestion_v2(Some(CompletionSuggestionRef {
            suggestion_id: suggestion.id.clone(),
        }));
        assert!(dismissed);
        assert!(manager.get_current_suggestion().is_none());
        assert!(manager.get_active_suggestions().is_empty());
    }
}
