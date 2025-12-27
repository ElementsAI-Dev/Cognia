//! Context awareness Tauri commands
//!
//! Commands for gathering context about the user's current activity.

use crate::context::{
    AppContext, BrowserContext, ContextManager, FileContext, FullContext, WindowInfo,
    EditorContext,
};
use tauri::State;

/// Get full context information
#[tauri::command]
pub async fn context_get_full(
    manager: State<'_, ContextManager>,
) -> Result<FullContext, String> {
    manager.get_context()
}

/// Get active window information
#[tauri::command]
pub async fn context_get_window(
    manager: State<'_, ContextManager>,
) -> Result<WindowInfo, String> {
    manager.get_window_info()
}

/// Get application context
#[tauri::command]
pub async fn context_get_app(
    manager: State<'_, ContextManager>,
) -> Result<AppContext, String> {
    manager.get_app_context()
}

/// Get file context
#[tauri::command]
pub async fn context_get_file(
    manager: State<'_, ContextManager>,
) -> Result<FileContext, String> {
    manager.get_file_context()
}

/// Get browser context
#[tauri::command]
pub async fn context_get_browser(
    manager: State<'_, ContextManager>,
) -> Result<BrowserContext, String> {
    manager.get_browser_context()
}

/// Get all visible windows
#[tauri::command]
pub async fn context_get_all_windows(
    manager: State<'_, ContextManager>,
) -> Result<Vec<WindowInfo>, String> {
    manager.get_all_windows()
}

/// Clear context cache
#[tauri::command]
pub async fn context_clear_cache(
    manager: State<'_, ContextManager>,
) -> Result<(), String> {
    manager.clear_cache();
    Ok(())
}

/// Get editor context
#[tauri::command]
pub async fn context_get_editor(
    manager: State<'_, ContextManager>,
) -> Result<EditorContext, String> {
    manager.get_editor_context()
}

/// Find windows by title pattern
#[tauri::command]
pub async fn context_find_windows_by_title(
    manager: State<'_, ContextManager>,
    pattern: String,
) -> Result<Vec<WindowInfo>, String> {
    manager.find_windows_by_title(&pattern)
}

/// Find windows by process name
#[tauri::command]
pub async fn context_find_windows_by_process(
    manager: State<'_, ContextManager>,
    process_name: String,
) -> Result<Vec<WindowInfo>, String> {
    manager.find_windows_by_process(&process_name)
}
