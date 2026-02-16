//! Tray Commands
//!
//! Commands for system tray configuration and control.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};

use crate::tray::{refresh_tray_menu, set_tray_busy, update_tray_tooltip, TRAY_STATE};

/// Tray display mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TrayDisplayMode {
    Full,
    Compact,
}

/// Tray configuration from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayConfig {
    pub display_mode: TrayDisplayMode,
    pub visible_items: Vec<String>,
    pub item_order: Vec<String>,
    pub show_shortcuts: bool,
    pub show_icons: bool,
    pub compact_mode_items: Option<Vec<String>>,
}

/// Tray state response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayStateResponse {
    pub is_busy: bool,
    pub is_recording: bool,
    pub status_message: String,
}

/// Managed tray configuration state
pub struct TrayConfigState {
    pub config: parking_lot::RwLock<TrayConfig>,
}

impl Default for TrayConfigState {
    fn default() -> Self {
        Self {
            config: parking_lot::RwLock::new(TrayConfig {
                display_mode: TrayDisplayMode::Full,
                visible_items: vec![],
                item_order: vec![],
                show_shortcuts: true,
                show_icons: true,
                compact_mode_items: None,
            }),
        }
    }
}

/// Get current tray state
#[tauri::command]
pub fn tray_get_state() -> TrayStateResponse {
    let state = TRAY_STATE.read();
    TrayStateResponse {
        is_busy: state.is_busy,
        is_recording: state.is_recording,
        status_message: state.status_message.clone(),
    }
}

/// Get current tray configuration
#[tauri::command]
pub fn tray_get_config(state: State<'_, TrayConfigState>) -> TrayConfig {
    state.config.read().clone()
}

/// Set tray configuration
#[tauri::command]
pub fn tray_set_config(
    app: AppHandle,
    state: State<'_, TrayConfigState>,
    config: TrayConfig,
) -> Result<(), String> {
    // Update stored config
    {
        let mut stored = state.config.write();
        *stored = config;
    }

    // Refresh the tray menu
    refresh_tray_menu(&app);

    // Emit event to notify frontend
    let _ = app.emit("tray-config-changed", ());

    log::info!("Tray configuration updated");
    Ok(())
}

/// Set tray display mode
#[tauri::command]
pub fn tray_set_display_mode(
    app: AppHandle,
    state: State<'_, TrayConfigState>,
    mode: TrayDisplayMode,
) -> Result<(), String> {
    {
        let mut config = state.config.write();
        config.display_mode = mode;
    }

    // Refresh the tray menu
    refresh_tray_menu(&app);

    log::info!("Tray display mode set to {:?}", mode);
    Ok(())
}

/// Toggle tray display mode between full and compact
#[tauri::command]
pub fn tray_toggle_display_mode(
    app: AppHandle,
    state: State<'_, TrayConfigState>,
) -> Result<TrayDisplayMode, String> {
    let new_mode = {
        let mut config = state.config.write();
        config.display_mode = match config.display_mode {
            TrayDisplayMode::Full => TrayDisplayMode::Compact,
            TrayDisplayMode::Compact => TrayDisplayMode::Full,
        };
        config.display_mode
    };

    // Refresh the tray menu
    refresh_tray_menu(&app);

    log::info!("Tray display mode toggled to {:?}", new_mode);
    Ok(new_mode)
}

/// Set item visibility
#[tauri::command]
pub fn tray_set_item_visibility(
    app: AppHandle,
    state: State<'_, TrayConfigState>,
    item_id: String,
    visible: bool,
) -> Result<(), String> {
    {
        let mut config = state.config.write();
        if visible {
            if !config.visible_items.contains(&item_id) {
                config.visible_items.push(item_id.clone());
            }
        } else {
            config.visible_items.retain(|id| id != &item_id);
        }
    }

    // Refresh the tray menu
    refresh_tray_menu(&app);

    log::debug!("Tray item '{}' visibility set to {}", item_id, visible);
    Ok(())
}

/// Set compact mode items
#[tauri::command]
pub fn tray_set_compact_items(
    app: AppHandle,
    state: State<'_, TrayConfigState>,
    items: Vec<String>,
) -> Result<(), String> {
    {
        let mut config = state.config.write();
        config.compact_mode_items = Some(items);
    }

    // Refresh the tray menu if in compact mode
    let is_compact = {
        let config = state.config.read();
        config.display_mode == TrayDisplayMode::Compact
    };

    if is_compact {
        refresh_tray_menu(&app);
    }

    log::info!("Compact mode items updated");
    Ok(())
}

/// Update tray tooltip
#[tauri::command]
pub fn tray_update_tooltip(app: AppHandle, message: String) -> Result<(), String> {
    update_tray_tooltip(&app, &message);
    Ok(())
}

/// Set tray busy state
#[tauri::command]
pub fn tray_set_busy(app: AppHandle, busy: bool, message: Option<String>) -> Result<(), String> {
    set_tray_busy(&app, busy, message.as_deref());
    Ok(())
}

/// Refresh tray menu
#[tauri::command]
pub fn tray_refresh_menu(app: AppHandle) -> Result<(), String> {
    refresh_tray_menu(&app);
    Ok(())
}

/// Get default compact mode items
#[tauri::command]
pub fn tray_get_default_compact_items() -> Vec<String> {
    vec![
        "toggle-chat-widget".to_string(),
        "screenshot-region".to_string(),
        "clipboard-history".to_string(),
        "open-settings".to_string(),
        "quit".to_string(),
    ]
}

/// Get all available menu item IDs
#[tauri::command]
pub fn tray_get_all_item_ids() -> Vec<String> {
    vec![
        // Window controls
        "show-window".to_string(),
        "hide-window".to_string(),
        "toggle-chat-widget".to_string(),
        "bubble-show".to_string(),
        "bubble-hide".to_string(),
        "bubble-toggle-minimize".to_string(),
        // Screenshot
        "screenshot-menu".to_string(),
        "screenshot-fullscreen".to_string(),
        "screenshot-region".to_string(),
        "screenshot-window".to_string(),
        "screenshot-ocr".to_string(),
        // Recording
        "recording-menu".to_string(),
        "recording-start".to_string(),
        "recording-stop".to_string(),
        "recording-pause".to_string(),
        // Selection
        "selection-menu".to_string(),
        "selection-enabled".to_string(),
        "selection-trigger".to_string(),
        "selection-hide-toolbar".to_string(),
        "selection-restart".to_string(),
        // Clipboard
        "clipboard-menu".to_string(),
        "clipboard-history".to_string(),
        "clipboard-clear".to_string(),
        // Settings
        "settings-menu".to_string(),
        "autostart-enabled".to_string(),
        "open-settings".to_string(),
        "open-logs".to_string(),
        // Help
        "check-update".to_string(),
        "open-help".to_string(),
        "about".to_string(),
        // Exit
        "quit".to_string(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tray_display_mode_serialize() {
        assert_eq!(
            serde_json::to_string(&TrayDisplayMode::Full).unwrap(),
            "\"full\""
        );
        assert_eq!(
            serde_json::to_string(&TrayDisplayMode::Compact).unwrap(),
            "\"compact\""
        );
    }

    #[test]
    fn test_tray_config_state_default() {
        let state = TrayConfigState::default();
        let config = state.config.read();
        assert_eq!(config.display_mode, TrayDisplayMode::Full);
        assert!(config.show_shortcuts);
        assert!(config.show_icons);
    }

    #[test]
    fn test_get_default_compact_items() {
        let items = tray_get_default_compact_items();
        assert_eq!(items.len(), 5);
        assert!(items.contains(&"toggle-chat-widget".to_string()));
        assert!(items.contains(&"quit".to_string()));
    }

    #[test]
    fn test_get_all_item_ids() {
        let items = tray_get_all_item_ids();
        assert!(items.len() > 20);
        assert!(items.contains(&"show-window".to_string()));
        assert!(items.contains(&"quit".to_string()));
    }
}
