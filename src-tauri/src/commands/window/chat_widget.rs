//! Chat Widget Tauri Commands
//!
//! Commands for controlling the AI chat widget floating window.

use crate::chat_widget::{ChatWidgetConfig, ChatWidgetStatus, ChatWidgetWindow};
use tauri::State;

/// Show the chat widget window
#[tauri::command]
pub async fn chat_widget_show(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.show()
}

/// Hide the chat widget window
#[tauri::command]
pub async fn chat_widget_hide(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.hide()
}

/// Toggle the chat widget window visibility
#[tauri::command]
pub async fn chat_widget_toggle(manager: State<'_, ChatWidgetWindow>) -> Result<bool, String> {
    manager.toggle()
}

/// Check if chat widget is visible
#[tauri::command]
pub async fn chat_widget_is_visible(manager: State<'_, ChatWidgetWindow>) -> Result<bool, String> {
    Ok(manager.is_visible())
}

/// Get chat widget status
#[tauri::command]
pub async fn chat_widget_get_status(
    manager: State<'_, ChatWidgetWindow>,
) -> Result<ChatWidgetStatus, String> {
    Ok(manager.get_status())
}

/// Get chat widget configuration
#[tauri::command]
pub async fn chat_widget_get_config(
    manager: State<'_, ChatWidgetWindow>,
) -> Result<ChatWidgetConfig, String> {
    Ok(manager.get_config())
}

/// Update chat widget configuration
#[tauri::command]
pub async fn chat_widget_update_config(
    manager: State<'_, ChatWidgetWindow>,
    config: ChatWidgetConfig,
) -> Result<(), String> {
    manager.update_config(config);
    Ok(())
}

/// Set chat widget pinned state (always on top)
#[tauri::command]
pub async fn chat_widget_set_pinned(
    manager: State<'_, ChatWidgetWindow>,
    pinned: bool,
) -> Result<(), String> {
    manager.set_pinned(pinned)
}

/// Set chat widget position
#[tauri::command]
pub async fn chat_widget_set_position(
    manager: State<'_, ChatWidgetWindow>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    manager.set_position(x, y)
}

/// Focus the input field in chat widget
#[tauri::command]
pub async fn chat_widget_focus_input(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.focus_input()
}

/// Send text to chat widget
#[tauri::command]
pub async fn chat_widget_send_text(
    manager: State<'_, ChatWidgetWindow>,
    text: String,
) -> Result<(), String> {
    manager.send_text(text)
}

/// Destroy the chat widget window
#[tauri::command]
pub async fn chat_widget_destroy(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.destroy()
}

/// Minimize (fold) the chat widget window
#[tauri::command]
pub async fn chat_widget_minimize(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.minimize()
}

/// Unminimize (unfold) the chat widget window
#[tauri::command]
pub async fn chat_widget_unminimize(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.unminimize()
}

/// Toggle minimized state
#[tauri::command]
pub async fn chat_widget_toggle_minimize(manager: State<'_, ChatWidgetWindow>) -> Result<bool, String> {
    manager.toggle_minimize()
}

/// Check if widget is minimized
#[tauri::command]
pub async fn chat_widget_is_minimized(manager: State<'_, ChatWidgetWindow>) -> Result<bool, String> {
    Ok(manager.is_minimized())
}

/// Save chat widget configuration to file
#[tauri::command]
pub async fn chat_widget_save_config(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.save_config()
}

/// Recreate the chat widget window if it was destroyed
#[tauri::command]
pub async fn chat_widget_recreate(manager: State<'_, ChatWidgetWindow>) -> Result<bool, String> {
    manager.recreate_if_needed()
}

/// Sync visibility state with actual window state
#[tauri::command]
pub async fn chat_widget_sync_state(manager: State<'_, ChatWidgetWindow>) -> Result<(), String> {
    manager.sync_visibility();
    Ok(())
}
