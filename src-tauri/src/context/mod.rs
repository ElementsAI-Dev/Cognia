//! Context awareness module
//!
//! Provides context about the current user environment including
//! active window, application type, file context, and browser context,
//! editor context, and screen content analysis.

#![allow(dead_code)]
#![allow(unused_imports)]

mod window_info;
mod app_context;
mod file_context;
mod browser_context;
mod editor_context;
mod screen_content;

pub use window_info::{WindowInfo, WindowManager};
pub use app_context::{AppContext, AppType};
pub use file_context::FileContext;
pub use browser_context::BrowserContext;
pub use editor_context::EditorContext;
pub use screen_content::{ScreenContentAnalyzer, ScreenContent, TextBlock, UiElement, UiElementType};

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::RwLock;

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
    last_context: Arc<RwLock<Option<FullContext>>>,
    cache_duration_ms: u64,
}

impl ContextManager {
    pub fn new() -> Self {
        Self {
            window_manager: WindowManager::new(),
            last_context: Arc::new(RwLock::new(None)),
            cache_duration_ms: 500, // Cache for 500ms
        }
    }

    /// Get current full context
    pub fn get_context(&self) -> Result<FullContext, String> {
        // Check cache
        {
            let cached = self.last_context.read();
            if let Some(ctx) = cached.as_ref() {
                let now = chrono::Utc::now().timestamp_millis();
                if now - ctx.timestamp < self.cache_duration_ms as i64 {
                    return Ok(ctx.clone());
                }
            }
        }

        // Gather fresh context
        let context = self.gather_context()?;
        
        // Update cache
        *self.last_context.write() = Some(context.clone());
        
        Ok(context)
    }

    /// Gather all context information
    fn gather_context(&self) -> Result<FullContext, String> {
        let window = self.window_manager.get_active_window().ok();
        
        let app = window.as_ref().and_then(|w| {
            AppContext::from_window_info(w).ok()
        });

        let file = window.as_ref().and_then(|w| {
            FileContext::from_window_info(w).ok()
        });

        let browser = window.as_ref().and_then(|w| {
            BrowserContext::from_window_info(w).ok()
        });

        // Get editor context if this is a code editor
        let editor = if app.as_ref().map(|a| a.app_type == AppType::CodeEditor).unwrap_or(false) {
            window.as_ref().and_then(|w| EditorContext::from_window_info(w).ok())
        } else {
            None
        };

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
        self.window_manager.get_active_window()
    }

    /// Get application context
    pub fn get_app_context(&self) -> Result<AppContext, String> {
        let window = self.window_manager.get_active_window()?;
        AppContext::from_window_info(&window)
    }

    /// Get file context
    pub fn get_file_context(&self) -> Result<FileContext, String> {
        let window = self.window_manager.get_active_window()?;
        FileContext::from_window_info(&window)
    }

    /// Get browser context
    pub fn get_browser_context(&self) -> Result<BrowserContext, String> {
        let window = self.window_manager.get_active_window()?;
        BrowserContext::from_window_info(&window)
    }

    /// Get editor context
    pub fn get_editor_context(&self) -> Result<EditorContext, String> {
        let window = self.window_manager.get_active_window()?;
        EditorContext::from_window_info(&window)
    }

    /// Set cache duration
    pub fn set_cache_duration(&mut self, ms: u64) {
        self.cache_duration_ms = ms;
    }

    /// Clear context cache
    pub fn clear_cache(&self) {
        *self.last_context.write() = None;
    }

    /// Get list of all windows
    pub fn get_all_windows(&self) -> Result<Vec<WindowInfo>, String> {
        self.window_manager.get_all_windows()
    }

    /// Find windows by title
    pub fn find_windows_by_title(&self, pattern: &str) -> Result<Vec<WindowInfo>, String> {
        self.window_manager.find_windows_by_title(pattern)
    }

    /// Find windows by process name
    pub fn find_windows_by_process(&self, process_name: &str) -> Result<Vec<WindowInfo>, String> {
        self.window_manager.find_windows_by_process(process_name)
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
        assert_eq!(manager.cache_duration_ms, 500);
    }

    #[test]
    fn test_default_trait() {
        let manager = ContextManager::default();
        assert_eq!(manager.cache_duration_ms, 500);
    }

    #[test]
    fn test_set_cache_duration() {
        let mut manager = ContextManager::new();
        manager.set_cache_duration(1000);
        assert_eq!(manager.cache_duration_ms, 1000);
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
