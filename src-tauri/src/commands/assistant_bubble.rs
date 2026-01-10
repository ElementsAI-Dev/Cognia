//! Assistant Bubble Tauri Commands
//!
//! Commands for controlling the floating assistant bubble window.

use crate::assistant_bubble::AssistantBubbleWindow;
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
    
    Ok(BubbleInfo {
        x,
        y,
        width,
        height,
        is_visible,
    })
}
