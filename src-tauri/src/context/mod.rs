//! Context awareness module
//!
//! Provides context about the current user environment including
//! active window, application type, file context, and browser context,
//! editor context, and screen content analysis.

mod app_context;
mod browser_context;
mod editor_context;
mod file_context;
mod screen_content;
mod window_info;

pub use app_context::{AppContext, AppType};
pub use browser_context::BrowserContext;
pub use editor_context::EditorContext;
pub use file_context::FileContext;
pub use screen_content::{ScreenContentAnalyzer, UiElement};
pub use window_info::{WindowInfo, WindowManager};

use log::{debug, trace};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

/// Complete context information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullContext {
    /// Active window information
    pub window: Option<WindowInfo>,
    /// Application context
    pub app: Option<AppContext>,
    /// File context (if editing a file)
    pub file: Option<FileContext>,
    /// Browser context (if in a browser)
    pub browser: Option<BrowserContext>,
    /// Editor context (if in a code editor)
    pub editor: Option<EditorContext>,
    /// Timestamp of context capture
    pub timestamp: i64,
}

/// Context manager for gathering and caching context information
pub struct ContextManager {
    window_manager: WindowManager,
    screen_analyzer: ScreenContentAnalyzer,
    last_context: Arc<RwLock<Option<FullContext>>>,
    cache_duration_ms: Arc<RwLock<u64>>,
}

impl ContextManager {
    pub fn new() -> Self {
        debug!("Creating new ContextManager with 500ms cache duration");
        Self {
            window_manager: WindowManager::new(),
            screen_analyzer: ScreenContentAnalyzer::new(),
            last_context: Arc::new(RwLock::new(None)),
            cache_duration_ms: Arc::new(RwLock::new(500)), // Cache for 500ms
        }
    }

    /// Get the screen content analyzer
    pub fn get_screen_analyzer(&self) -> &ScreenContentAnalyzer {
        &self.screen_analyzer
    }

    /// Get current cache duration in milliseconds
    pub fn get_cache_duration(&self) -> u64 {
        *self.cache_duration_ms.read()
    }

    /// Get current full context
    pub fn get_context(&self) -> Result<FullContext, String> {
        trace!("get_context called");

        // Check cache
        {
            let cached = self.last_context.read();
            if let Some(ctx) = cached.as_ref() {
                let now = chrono::Utc::now().timestamp_millis();
                let age_ms = now - ctx.timestamp;
                let cache_duration = *self.cache_duration_ms.read();
                if age_ms < cache_duration as i64 {
                    trace!("Returning cached context (age: {}ms)", age_ms);
                    return Ok(ctx.clone());
                }
                trace!(
                    "Cache expired (age: {}ms, max: {}ms)",
                    age_ms,
                    cache_duration
                );
            }
        }

        // Gather fresh context
        debug!("Gathering fresh context");
        let context = self.gather_context()?;

        // Update cache
        *self.last_context.write() = Some(context.clone());
        trace!("Context cached successfully");

        Ok(context)
    }

    /// Gather all context information
    fn gather_context(&self) -> Result<FullContext, String> {
        trace!("Starting context gathering");

        let window = self.window_manager.get_active_window().ok();
        if let Some(ref w) = window {
            debug!(
                "Active window: '{}' (process: {}, class: {})",
                w.title, w.process_name, w.class_name
            );
        } else {
            trace!("No active window detected");
        }

        let app = window
            .as_ref()
            .and_then(|w| match AppContext::from_window_info(w) {
                Ok(ctx) => {
                    debug!("App context: {:?} - {}", ctx.app_type, ctx.app_name);
                    Some(ctx)
                }
                Err(e) => {
                    trace!("Failed to get app context: {}", e);
                    None
                }
            });

        let file = window
            .as_ref()
            .and_then(|w| match FileContext::from_window_info(w) {
                Ok(ctx) => {
                    if ctx.name.is_some() {
                        debug!(
                            "File context: {:?} (type: {:?}, modified: {})",
                            ctx.name, ctx.file_type, ctx.is_modified
                        );
                    }
                    Some(ctx)
                }
                Err(e) => {
                    trace!("Failed to get file context: {}", e);
                    None
                }
            });

        let browser = window
            .as_ref()
            .and_then(|w| match BrowserContext::from_window_info(w) {
                Ok(ctx) => {
                    debug!(
                        "Browser context: {} - page: {:?} (type: {:?})",
                        ctx.browser, ctx.page_title, ctx.page_type
                    );
                    Some(ctx)
                }
                Err(e) => {
                    trace!("Failed to get browser context (not a browser): {}", e);
                    None
                }
            });

        // Get editor context if this is a code editor
        let editor = if app
            .as_ref()
            .map(|a| a.app_type == AppType::CodeEditor)
            .unwrap_or(false)
        {
            window
                .as_ref()
                .and_then(|w| match EditorContext::from_window_info(w) {
                    Ok(ctx) => {
                        debug!(
                            "Editor context: {} - file: {:?} (lang: {:?}, branch: {:?})",
                            ctx.editor_name, ctx.file_name, ctx.language, ctx.git_branch
                        );
                        Some(ctx)
                    }
                    Err(e) => {
                        trace!("Failed to get editor context: {}", e);
                        None
                    }
                })
        } else {
            None
        };

        trace!("Context gathering complete");
        Ok(FullContext {
            window,
            app,
            file,
            browser,
            editor,
            timestamp: chrono::Utc::now().timestamp_millis(),
        })
    }

    /// Get only window information
    pub fn get_window_info(&self) -> Result<WindowInfo, String> {
        trace!("get_window_info called");
        let result = self.window_manager.get_active_window();
        if let Ok(ref w) = result {
            debug!("Window info retrieved: '{}' ({})", w.title, w.process_name);
        }
        result
    }

    /// Get application context
    pub fn get_app_context(&self) -> Result<AppContext, String> {
        trace!("get_app_context called");
        let window = self.window_manager.get_active_window()?;
        let result = AppContext::from_window_info(&window);
        if let Ok(ref ctx) = result {
            debug!("App context: {:?} - {}", ctx.app_type, ctx.app_name);
        }
        result
    }

    /// Get file context
    pub fn get_file_context(&self) -> Result<FileContext, String> {
        trace!("get_file_context called");
        let window = self.window_manager.get_active_window()?;
        let result = FileContext::from_window_info(&window);
        if let Ok(ref ctx) = result {
            debug!("File context: {:?} (type: {:?})", ctx.name, ctx.file_type);
        }
        result
    }

    /// Get browser context
    pub fn get_browser_context(&self) -> Result<BrowserContext, String> {
        trace!("get_browser_context called");
        let window = self.window_manager.get_active_window()?;
        let result = BrowserContext::from_window_info(&window);
        if let Ok(ref ctx) = result {
            debug!("Browser context: {} - {:?}", ctx.browser, ctx.page_title);
        }
        result
    }

    /// Get editor context
    pub fn get_editor_context(&self) -> Result<EditorContext, String> {
        trace!("get_editor_context called");
        let window = self.window_manager.get_active_window()?;
        let result = EditorContext::from_window_info(&window);
        if let Ok(ref ctx) = result {
            debug!("Editor context: {} - {:?}", ctx.editor_name, ctx.file_name);
        }
        result
    }

    /// Set cache duration
    pub fn set_cache_duration(&self, ms: u64) {
        let old_duration = *self.cache_duration_ms.read();
        debug!(
            "Cache duration changed: {}ms -> {}ms",
            old_duration, ms
        );
        *self.cache_duration_ms.write() = ms;
    }

    /// Clear context cache
    pub fn clear_cache(&self) {
        debug!("Context cache cleared");
        *self.last_context.write() = None;
    }

    /// Get list of all windows
    pub fn get_all_windows(&self) -> Result<Vec<WindowInfo>, String> {
        trace!("get_all_windows called");
        let result = self.window_manager.get_all_windows();
        if let Ok(ref windows) = result {
            debug!("Retrieved {} windows", windows.len());
        }
        result
    }

    /// Find windows by title
    pub fn find_windows_by_title(&self, pattern: &str) -> Result<Vec<WindowInfo>, String> {
        debug!("Finding windows by title pattern: '{}'", pattern);
        let result = self.window_manager.find_windows_by_title(pattern);
        if let Ok(ref windows) = result {
            debug!(
                "Found {} windows matching title '{}'",
                windows.len(),
                pattern
            );
        }
        result
    }

    /// Find windows by process name
    pub fn find_windows_by_process(&self, process_name: &str) -> Result<Vec<WindowInfo>, String> {
        debug!("Finding windows by process: '{}'", process_name);
        let result = self.window_manager.find_windows_by_process(process_name);
        if let Ok(ref windows) = result {
            debug!(
                "Found {} windows for process '{}'",
                windows.len(),
                process_name
            );
        }
        result
    }
}

impl Default for ContextManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_manager() {
        let manager = ContextManager::new();
        assert_eq!(manager.get_cache_duration(), 500);
    }

    #[test]
    fn test_default_trait() {
        let manager = ContextManager::default();
        assert_eq!(manager.get_cache_duration(), 500);
    }

    #[test]
    fn test_set_cache_duration() {
        let manager = ContextManager::new();
        manager.set_cache_duration(1000);
        assert_eq!(manager.get_cache_duration(), 1000);
    }

    #[test]
    fn test_clear_cache() {
        let manager = ContextManager::new();

        // Try to get context (may fail on non-Windows or without active window)
        let _ = manager.get_context();

        // Clear cache should not panic
        manager.clear_cache();

        // Cache should be empty
        assert!(manager.last_context.read().is_none());
    }

    #[test]
    fn test_full_context_serialization() {
        let context = FullContext {
            window: None,
            app: None,
            file: None,
            browser: None,
            editor: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        };

        let json = serde_json::to_string(&context);
        assert!(json.is_ok());

        let parsed: Result<FullContext, _> = serde_json::from_str(&json.unwrap());
        assert!(parsed.is_ok());
    }

    #[test]
    fn test_full_context_with_window() {
        let window = WindowInfo {
            handle: 12345,
            title: "Test Window".to_string(),
            class_name: "TestClass".to_string(),
            process_id: 1234,
            process_name: "test.exe".to_string(),
            exe_path: Some("C:\\test.exe".to_string()),
            x: 0,
            y: 0,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        let context = FullContext {
            window: Some(window),
            app: None,
            file: None,
            browser: None,
            editor: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
        };

        let json = serde_json::to_string(&context);
        assert!(json.is_ok());

        let parsed: FullContext = serde_json::from_str(&json.unwrap()).unwrap();
        assert!(parsed.window.is_some());
        assert_eq!(parsed.window.unwrap().title, "Test Window");
    }

    #[test]
    fn test_window_info_serialization() {
        let window = WindowInfo {
            handle: 12345,
            title: "Test".to_string(),
            class_name: "Class".to_string(),
            process_id: 100,
            process_name: "proc.exe".to_string(),
            exe_path: None,
            x: 10,
            y: 20,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: true,
            is_focused: true,
            is_visible: true,
        };

        let json = serde_json::to_string(&window);
        assert!(json.is_ok());

        let parsed: WindowInfo = serde_json::from_str(&json.unwrap()).unwrap();
        assert_eq!(parsed.handle, 12345);
        assert_eq!(parsed.width, 800);
        assert!(parsed.is_maximized);
    }

    #[test]
    fn test_window_manager_new() {
        let manager = WindowManager::new();
        let default_manager = WindowManager::default();

        // Both should be valid instances
        let _ = manager;
        let _ = default_manager;
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_non_windows_fallbacks() {
        let manager = WindowManager::new();

        // On non-Windows, these should return errors or empty results
        assert!(manager.get_active_window().is_err());
        assert!(manager.get_all_windows().unwrap().is_empty());
        assert!(manager.find_windows_by_title("test").unwrap().is_empty());
        assert!(manager.find_windows_by_process("test").unwrap().is_empty());
    }
}
