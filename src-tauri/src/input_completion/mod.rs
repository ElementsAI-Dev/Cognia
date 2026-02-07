//! Input Completion Module
//!
//! Provides AI-powered real-time input completion similar to GitHub Copilot's Tab completion.
//! Features:
//! - IME (Input Method Editor) state detection
//! - Real-time keyboard input capture
//! - AI-powered text completion suggestions
//! - Overlay window for displaying suggestions

mod config;
mod completion_service;
mod ime_state;
mod keyboard_monitor;
pub mod types;

pub use config::CompletionConfig;
pub use completion_service::CompletionService;
pub use ime_state::{ImeState, ImeMonitor};
// Note: InputMode is used in tests but not re-exported to avoid unused import warning
#[cfg(test)]
use ime_state::InputMode;
pub use keyboard_monitor::{KeyboardMonitor, KeyEvent, KeyEventType};
pub use types::{
    CompletionContext, CompletionFeedback, CompletionResult, CompletionSuggestion,
    CompletionStatus, InputCompletionEvent,
};

use parking_lot::RwLock;
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
        let _ = self.app_handle.emit("input-completion://event", InputCompletionEvent::Started);

        // Start keyboard monitoring
        let (key_tx, mut key_rx) = mpsc::unbounded_channel::<KeyEvent>();
        self.keyboard_monitor.start(key_tx)?;

        // Start IME monitoring
        self.ime_monitor.start()?;

        // Spawn event processing task
        let is_running = self.is_running.clone();
        let config = self.config.clone();
        let ime_monitor = self.ime_monitor.clone();
        let input_buffer = self.input_buffer.clone();
        let current_suggestion = self.current_suggestion.clone();
        let completion_service = self.completion_service.clone();
        let app_handle = self.app_handle.clone();
        let debounce_handle = self.debounce_handle.clone();
        let last_key_timestamp = self.last_key_timestamp.clone();

        tauri::async_runtime::spawn(async move {
            log::info!("Input completion event loop started");

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

        Ok(())
    }

    /// Stop the input completion system
    pub fn stop(&self) {
        log::info!("Stopping InputCompletionManager");
        self.is_running.store(false, Ordering::SeqCst);
        
        // Emit stopped event
        let _ = self.app_handle.emit("input-completion://event", InputCompletionEvent::Stopped);
        
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
    async fn handle_key_event(
        key_event: &KeyEvent,
        config: &Arc<RwLock<CompletionConfig>>,
        ime_monitor: &Arc<ImeMonitor>,
        input_buffer: &Arc<RwLock<String>>,
        current_suggestion: &Arc<RwLock<Option<CompletionSuggestion>>>,
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
                        let _ = app_handle.emit("input-completion://event", InputCompletionEvent::Accept(suggestion.clone()));
                        
                        // Clear current suggestion
                        *current_suggestion.write() = None;
                        input_buffer.write().clear();
                        
                        return;
                    }
                }

                // Handle Escape - dismiss suggestion
                if key_event.key == "Escape" {
                    if current_suggestion.read().is_some() {
                        log::debug!("Dismissing completion suggestion");
                        *current_suggestion.write() = None;
                        
                        let _ = app_handle.emit("input-completion://event", InputCompletionEvent::Dismiss);
                        return;
                    }
                }

                // Handle character input
                if let Some(ch) = key_event.char {
                    // Skip if modifier keys are held and skip_with_modifiers is enabled
                    if cfg.trigger.skip_with_modifiers && (key_event.ctrl || key_event.alt || key_event.shift) {
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
                    let _ = app_handle.emit("input-completion://event", InputCompletionEvent::Dismiss);
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
                    if let Some(prefix_result) = completion_service.get_cached_by_prefix(&buffer_text) {
                        if let Some(suggestion) = prefix_result.suggestions.first() {
                            log::debug!("Prefix cache hit: {}", suggestion.text.chars().take(50).collect::<String>());
                            *current_suggestion.write() = Some(suggestion.clone());
                            let _ = app_handle.emit("input-completion://event", InputCompletionEvent::Suggestion(suggestion.clone()));
                            // Update timestamp for adaptive debounce
                            last_key_timestamp.store(key_event.timestamp.max(0) as u64, Ordering::Relaxed);
                            return;
                        }
                    }

                    // Cancel previous debounce
                    if let Some(handle) = debounce_handle.write().take() {
                        handle.abort();
                    }

                    // Compute adaptive debounce delay based on typing speed
                    let current_ts = key_event.timestamp.max(0) as u64;
                    let debounce_ms = Self::compute_adaptive_debounce(
                        &cfg,
                        last_key_timestamp,
                        current_ts,
                    );
                    
                    // Update last key timestamp for next adaptive debounce calculation
                    last_key_timestamp.store(current_ts, Ordering::Relaxed);

                    let completion_service = completion_service.clone();
                    let current_suggestion = current_suggestion.clone();
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
                        };

                        match completion_service.get_completion(&context, &model_config).await {
                            Ok(result) => {
                                if let Some(suggestion) = result.suggestions.first() {
                                    log::debug!("Got completion suggestion: {}", suggestion.text.chars().take(50).collect::<String>());
                                    
                                    *current_suggestion.write() = Some(suggestion.clone());
                                    
                                    // Emit suggestion event using structured event type
                                    let _ = app_handle.emit("input-completion://event", InputCompletionEvent::Suggestion(suggestion.clone()));
                                }
                            }
                            Err(e) => {
                                log::warn!("Completion request failed: {}", e);
                                let _ = app_handle.emit("input-completion://event", InputCompletionEvent::Error(e));
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

    /// Accept current suggestion
    pub fn accept_suggestion(&self) -> Option<CompletionSuggestion> {
        let suggestion = self.current_suggestion.write().take();
        if suggestion.is_some() {
            self.input_buffer.write().clear();
        }
        suggestion
    }

    /// Dismiss current suggestion
    pub fn dismiss_suggestion(&self) {
        *self.current_suggestion.write() = None;
        let _ = self.app_handle.emit("input-completion://event", InputCompletionEvent::Dismiss);
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

    /// Manually trigger completion for given text
    pub async fn trigger_completion(&self, text: &str) -> Result<CompletionResult, String> {
        let config = self.config.read().clone();
        
        let context = CompletionContext {
            text: text.to_string(),
            cursor_position: None,
            file_path: None,
            language: None,
            ime_state: Some(self.ime_monitor.get_state()),
        };

        self.completion_service.get_completion(&context, &config.model).await
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
        let suggestion = CompletionSuggestion::new(
            "test completion".to_string(),
            0.9,
            CompletionType::Line,
        );
        
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
        let suggestion = CompletionSuggestion::new(
            "test".to_string(),
            0.8,
            CompletionType::Line,
        );
        let cloned = suggestion.clone();
        
        assert_eq!(suggestion.text, cloned.text);
        assert_eq!(suggestion.id, cloned.id);
    }
}
