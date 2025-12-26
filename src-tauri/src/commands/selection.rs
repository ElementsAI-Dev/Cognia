//! Selection toolbar Tauri commands
//!
//! Commands for controlling the selection toolbar from the frontend.

use crate::selection::{SelectionConfig, SelectionManager, SelectionPayload};
use tauri::State;

/// Start the selection detection service
#[tauri::command]
pub async fn selection_start(manager: State<'_, SelectionManager>) -> Result<(), String> {
    manager.start().await
}

/// Stop the selection detection service
#[tauri::command]
pub async fn selection_stop(manager: State<'_, SelectionManager>) -> Result<(), String> {
    manager.stop()
}

/// Get selected text from the focused application
#[tauri::command]
pub async fn selection_get_text(
    manager: State<'_, SelectionManager>,
) -> Result<Option<String>, String> {
    manager.detector.get_selected_text()
}

/// Show the selection toolbar at the specified position
#[tauri::command]
pub async fn selection_show_toolbar(
    manager: State<'_, SelectionManager>,
    x: i32,
    y: i32,
    text: String,
) -> Result<(), String> {
    manager.toolbar_window.show(x, y, text)
}

/// Hide the selection toolbar
#[tauri::command]
pub async fn selection_hide_toolbar(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
    manager.toolbar_window.hide()
}

/// Check if the toolbar is currently visible
#[tauri::command]
pub async fn selection_is_toolbar_visible(
    manager: State<'_, SelectionManager>,
) -> Result<bool, String> {
    Ok(manager.toolbar_window.is_visible())
}

/// Get the current selected text in the toolbar
#[tauri::command]
pub async fn selection_get_toolbar_text(
    manager: State<'_, SelectionManager>,
) -> Result<Option<String>, String> {
    Ok(manager.toolbar_window.get_selected_text())
}

/// Update selection configuration
#[tauri::command]
pub async fn selection_update_config(
    manager: State<'_, SelectionManager>,
    config: SelectionConfig,
) -> Result<(), String> {
    manager.update_config(config);
    Ok(())
}

/// Get current selection configuration
#[tauri::command]
pub async fn selection_get_config(
    manager: State<'_, SelectionManager>,
) -> Result<SelectionConfig, String> {
    Ok(manager.get_config())
}

/// Trigger selection detection manually (for shortcut mode)
#[tauri::command]
pub async fn selection_trigger(
    manager: State<'_, SelectionManager>,
    app_handle: tauri::AppHandle,
) -> Result<Option<SelectionPayload>, String> {
    // Get selected text
    let text = match manager.detector.get_selected_text()? {
        Some(t) if !t.is_empty() => t,
        _ => return Ok(None),
    };

    // Check text length limits
    let config = manager.get_config();
    if text.len() < config.min_text_length || text.len() > config.max_text_length {
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
    manager.toolbar_window.show(x as i32, y as i32, text)?;

    // Emit event
    app_handle
        .emit("selection-detected", &payload)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(Some(payload))
}

/// Get current mouse position
fn get_mouse_position() -> (f64, f64) {
    match mouse_position::mouse_position::Mouse::get_mouse_position() {
        mouse_position::mouse_position::Mouse::Position { x, y } => (x as f64, y as f64),
        mouse_position::mouse_position::Mouse::Error => (0.0, 0.0),
    }
}
