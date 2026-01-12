//! Window diagnostics commands
//!
//! This module provides commands for diagnosing and querying the state of all
//! application windows, useful for debugging and monitoring.

use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::assistant_bubble::AssistantBubbleWindow;
use crate::chat_widget::ChatWidgetWindow;
use crate::selection::SelectionManager;

/// Window state information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowState {
    /// Window label/identifier
    pub label: String,
    /// Whether the window exists
    pub exists: bool,
    /// Whether the window is visible
    pub is_visible: bool,
    /// Whether the window is minimized
    pub is_minimized: bool,
    /// Whether the window is focused
    pub is_focused: bool,
    /// Window position (x, y) in physical pixels
    pub position: Option<(i32, i32)>,
    /// Window size (width, height) in physical pixels
    pub size: Option<(u32, u32)>,
}

/// All windows diagnostic report
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsDiagnostics {
    /// Main window state
    pub main_window: Option<WindowState>,
    /// Assistant bubble window state
    pub bubble_window: Option<WindowState>,
    /// Chat widget window state
    pub chat_widget: Option<WindowState>,
    /// Selection toolbar window state
    pub toolbar_window: Option<WindowState>,
    /// Splashscreen window state (if any)
    pub splashscreen: Option<WindowState>,
    /// Total number of windows
    pub total_windows: usize,
    /// Timestamp of the diagnostic
    pub timestamp: i64,
}

/// Get state of a specific window by label
fn get_window_state(app: &tauri::AppHandle, label: &str) -> Option<WindowState> {
    app.get_webview_window(label).map(|window| {
        let position = window
            .outer_position()
            .ok()
            .map(|p| (p.x, p.y));
        let size = window
            .outer_size()
            .ok()
            .map(|s| (s.width, s.height));
        let is_visible = window.is_visible().unwrap_or(false);
        let is_minimized = window.is_minimized().unwrap_or(false);
        let is_focused = window.is_focused().unwrap_or(false);

        WindowState {
            label: label.to_string(),
            exists: true,
            is_visible,
            is_minimized,
            is_focused,
            position,
            size,
        }
    })
}

/// Get comprehensive diagnostics for all windows
#[tauri::command]
pub async fn window_get_diagnostics(
    app: tauri::AppHandle,
) -> Result<WindowsDiagnostics, String> {
    let main_window = get_window_state(&app, "main");
    let bubble_window = get_window_state(&app, "assistant-bubble");
    let chat_widget = get_window_state(&app, "chat-widget");
    let toolbar_window = get_window_state(&app, "selection-toolbar");
    let splashscreen = get_window_state(&app, "splashscreen");

    // Count total existing windows
    let total_windows = [
        &main_window,
        &bubble_window,
        &chat_widget,
        &toolbar_window,
        &splashscreen,
    ]
    .iter()
    .filter(|w| w.is_some())
    .count();

    // Sync manager states if available
    if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
        manager.sync_visibility();
    }
    if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
        manager.sync_visibility();
    }
    if let Some(manager) = app.try_state::<SelectionManager>() {
        manager.toolbar_window.sync_visibility();
    }

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    Ok(WindowsDiagnostics {
        main_window,
        bubble_window,
        chat_widget,
        toolbar_window,
        splashscreen,
        total_windows,
        timestamp,
    })
}

/// Get state of a specific window
#[tauri::command]
pub async fn window_get_state(
    app: tauri::AppHandle,
    label: String,
) -> Result<Option<WindowState>, String> {
    Ok(get_window_state(&app, &label))
}

/// Check if a window exists
#[tauri::command]
pub async fn window_exists(
    app: tauri::AppHandle,
    label: String,
) -> Result<bool, String> {
    Ok(app.get_webview_window(&label).is_some())
}

/// Force sync all window manager states with actual window states
#[tauri::command]
pub async fn window_sync_all_states(
    app: tauri::AppHandle,
) -> Result<(), String> {
    if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
        manager.sync_visibility();
        log::debug!("[WindowDiagnostics] Synced bubble window state");
    }
    if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
        manager.sync_visibility();
        log::debug!("[WindowDiagnostics] Synced chat widget state");
    }
    if let Some(manager) = app.try_state::<SelectionManager>() {
        manager.toolbar_window.sync_visibility();
        log::debug!("[WindowDiagnostics] Synced toolbar window state");
    }
    log::info!("[WindowDiagnostics] All window states synced");
    Ok(())
}

/// Save all window configurations to disk
#[tauri::command]
pub async fn window_save_all_configs(
    app: tauri::AppHandle,
) -> Result<(), String> {
    let mut errors = Vec::new();

    if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
        if let Err(e) = manager.save_config() {
            errors.push(format!("Bubble: {}", e));
        }
    }
    if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
        if let Err(e) = manager.save_config() {
            errors.push(format!("ChatWidget: {}", e));
        }
    }
    if let Some(manager) = app.try_state::<SelectionManager>() {
        if let Err(e) = manager.save_config() {
            errors.push(format!("Selection: {}", e));
        }
    }

    if errors.is_empty() {
        log::info!("[WindowDiagnostics] All configs saved successfully");
        Ok(())
    } else {
        let error_msg = errors.join("; ");
        log::error!("[WindowDiagnostics] Config save errors: {}", error_msg);
        Err(error_msg)
    }
}

/// Attempt to recreate any destroyed windows
#[tauri::command]
pub async fn window_recreate_destroyed(
    app: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    let mut recreated = Vec::new();

    if let Some(manager) = app.try_state::<AssistantBubbleWindow>() {
        if manager.recreate_if_needed()? {
            recreated.push("assistant-bubble".to_string());
        }
    }
    if let Some(manager) = app.try_state::<ChatWidgetWindow>() {
        if manager.recreate_if_needed()? {
            recreated.push("chat-widget".to_string());
        }
    }

    if !recreated.is_empty() {
        log::info!("[WindowDiagnostics] Recreated windows: {:?}", recreated);
    }
    Ok(recreated)
}
