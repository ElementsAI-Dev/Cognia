//! Assistant Bubble Tauri Commands
//!
//! Commands for controlling the floating assistant bubble window.

use crate::assistant_bubble::{AssistantBubbleWindow, BubbleConfig};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Bubble position and size info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BubbleInfo {
    pub x: i32,
    pub y: i32,
    pub width: f64,
    pub height: f64,
    pub is_visible: bool,
    pub is_minimized: bool,
}

/// Show the assistant bubble window
#[tauri::command]
pub async fn assistant_bubble_show(manager: State<'_, AssistantBubbleWindow>) -> Result<(), String> {
    manager.show()
}

/// Hide the assistant bubble window
#[tauri::command]
pub async fn assistant_bubble_hide(manager: State<'_, AssistantBubbleWindow>) -> Result<(), String> {
    manager.hide()
}

/// Toggle the assistant bubble window visibility
#[tauri::command]
pub async fn assistant_bubble_toggle(manager: State<'_, AssistantBubbleWindow>) -> Result<bool, String> {
    if manager.is_visible() {
        manager.hide()?;
        Ok(false)
    } else {
        manager.show()?;
        Ok(true)
    }
}

/// Check if bubble is visible
#[tauri::command]
pub async fn assistant_bubble_is_visible(manager: State<'_, AssistantBubbleWindow>) -> Result<bool, String> {
    Ok(manager.is_visible())
}

/// Get bubble position and size
#[tauri::command]
pub async fn assistant_bubble_get_info(manager: State<'_, AssistantBubbleWindow>) -> Result<BubbleInfo, String> {
    let (x, y) = manager.get_position().unwrap_or((0, 0));
    let (width, height) = manager.get_size();
    let is_visible = manager.is_visible();
    let is_minimized = manager.is_minimized();
    
    Ok(BubbleInfo {
        x,
        y,
        width,
        height,
        is_visible,
        is_minimized,
    })
}

/// Get bubble configuration
#[tauri::command]
pub async fn assistant_bubble_get_config(manager: State<'_, AssistantBubbleWindow>) -> Result<BubbleConfig, String> {
    Ok(manager.get_config())
}

/// Update bubble configuration
#[tauri::command]
pub async fn assistant_bubble_update_config(
    manager: State<'_, AssistantBubbleWindow>,
    config: BubbleConfig,
) -> Result<(), String> {
    manager.update_config(config);
    Ok(())
}

/// Set bubble position
#[tauri::command]
pub async fn assistant_bubble_set_position(
    manager: State<'_, AssistantBubbleWindow>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    manager.set_position(x, y)
}

/// Minimize (fold) the bubble window
#[tauri::command]
pub async fn assistant_bubble_minimize(manager: State<'_, AssistantBubbleWindow>) -> Result<(), String> {
    manager.minimize()
}

/// Unminimize (unfold) the bubble window
#[tauri::command]
pub async fn assistant_bubble_unminimize(manager: State<'_, AssistantBubbleWindow>) -> Result<(), String> {
    manager.unminimize()
}

/// Toggle minimized state
#[tauri::command]
pub async fn assistant_bubble_toggle_minimize(manager: State<'_, AssistantBubbleWindow>) -> Result<bool, String> {
    manager.toggle_minimize()
}

/// Check if bubble is minimized
#[tauri::command]
pub async fn assistant_bubble_is_minimized(manager: State<'_, AssistantBubbleWindow>) -> Result<bool, String> {
    Ok(manager.is_minimized())
}

/// Save bubble configuration to file
#[tauri::command]
pub async fn assistant_bubble_save_config(manager: State<'_, AssistantBubbleWindow>) -> Result<(), String> {
    manager.save_config()
}

/// Recreate the bubble window if it was destroyed
#[tauri::command]
pub async fn assistant_bubble_recreate(manager: State<'_, AssistantBubbleWindow>) -> Result<bool, String> {
    manager.recreate_if_needed()
}

/// Sync visibility state with actual window state
#[tauri::command]
pub async fn assistant_bubble_sync_state(manager: State<'_, AssistantBubbleWindow>) -> Result<(), String> {
    manager.sync_visibility();
    Ok(())
}

/// Work area info for a monitor
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkAreaInfo {
    pub width: i32,
    pub height: i32,
    pub x: i32,
    pub y: i32,
}

/// Get the work area of the monitor containing the bubble
#[tauri::command]
pub async fn assistant_bubble_get_work_area(
    manager: State<'_, AssistantBubbleWindow>,
) -> Result<WorkAreaInfo, String> {
    let (width, height, x, y) = manager.get_work_area_for_position(None);
    Ok(WorkAreaInfo { width, height, x, y })
}

/// Clamp bubble position to stay within current monitor's work area
#[tauri::command]
pub async fn assistant_bubble_clamp_to_work_area(
    manager: State<'_, AssistantBubbleWindow>,
) -> Result<(), String> {
    manager.clamp_to_work_area()
}
