//! Screenshot Tauri commands
//!
//! Commands for capturing screenshots and performing OCR.

use crate::screenshot::{
    CaptureRegion, MonitorInfo, ScreenshotConfig, ScreenshotManager, ScreenshotMetadata,
    ScreenshotHistoryEntry, WinOcrResult,
};
use tauri::State;

/// Capture full screen screenshot
#[tauri::command]
pub async fn screenshot_capture_fullscreen(
    manager: State<'_, ScreenshotManager>,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_fullscreen(monitor_index).await?;
    Ok(ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    })
}

/// Capture active window screenshot
#[tauri::command]
pub async fn screenshot_capture_window(
    manager: State<'_, ScreenshotManager>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_window().await?;
    Ok(ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    })
}

/// Capture region screenshot
#[tauri::command]
pub async fn screenshot_capture_region(
    manager: State<'_, ScreenshotManager>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<ScreenshotResult, String> {
    let region = CaptureRegion { x, y, width, height };
    let result = manager.capture_region(region).await?;
    Ok(ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    })
}

/// Start interactive region selection
#[tauri::command]
pub async fn screenshot_start_region_selection(
    manager: State<'_, ScreenshotManager>,
) -> Result<CaptureRegion, String> {
    manager.start_region_selection().await
}

/// Extract text from image using OCR
#[tauri::command]
pub async fn screenshot_ocr(
    manager: State<'_, ScreenshotManager>,
    image_base64: String,
) -> Result<String, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    
    manager.extract_text(&image_data)
}

/// Get list of available monitors
#[tauri::command]
pub async fn screenshot_get_monitors(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<MonitorInfo>, String> {
    Ok(manager.get_monitors())
}

/// Update screenshot configuration
#[tauri::command]
pub async fn screenshot_update_config(
    manager: State<'_, ScreenshotManager>,
    config: ScreenshotConfig,
) -> Result<(), String> {
    manager.update_config(config);
    Ok(())
}

/// Get current screenshot configuration
#[tauri::command]
pub async fn screenshot_get_config(
    manager: State<'_, ScreenshotManager>,
) -> Result<ScreenshotConfig, String> {
    Ok(manager.get_config())
}

/// Save screenshot to file
#[tauri::command]
pub async fn screenshot_save(
    manager: State<'_, ScreenshotManager>,
    image_base64: String,
    path: String,
) -> Result<String, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    
    manager.save_to_file(&image_data, &path)
}

// ============== Screenshot History Commands ==============

/// Get screenshot history
#[tauri::command]
pub async fn screenshot_get_history(
    manager: State<'_, ScreenshotManager>,
    count: Option<usize>,
) -> Result<Vec<ScreenshotHistoryEntry>, String> {
    Ok(manager.get_history(count.unwrap_or(20)))
}

/// Search screenshot history by OCR text
#[tauri::command]
pub async fn screenshot_search_history(
    manager: State<'_, ScreenshotManager>,
    query: String,
) -> Result<Vec<ScreenshotHistoryEntry>, String> {
    Ok(manager.search_history_by_text(&query))
}

/// Get screenshot by ID
#[tauri::command]
pub async fn screenshot_get_by_id(
    manager: State<'_, ScreenshotManager>,
    id: String,
) -> Result<Option<ScreenshotHistoryEntry>, String> {
    Ok(manager.get_screenshot_by_id(&id))
}

/// Pin screenshot
#[tauri::command]
pub async fn screenshot_pin(
    manager: State<'_, ScreenshotManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.pin_screenshot(&id))
}

/// Unpin screenshot
#[tauri::command]
pub async fn screenshot_unpin(
    manager: State<'_, ScreenshotManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.unpin_screenshot(&id))
}

/// Delete screenshot from history
#[tauri::command]
pub async fn screenshot_delete(
    manager: State<'_, ScreenshotManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.delete_screenshot(&id))
}

/// Clear screenshot history
#[tauri::command]
pub async fn screenshot_clear_history(
    manager: State<'_, ScreenshotManager>,
) -> Result<(), String> {
    manager.clear_history();
    Ok(())
}

// ============== Windows OCR Commands ==============

/// Extract text using Windows OCR
#[tauri::command]
pub async fn screenshot_ocr_windows(
    manager: State<'_, ScreenshotManager>,
    image_base64: String,
) -> Result<WinOcrResult, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;
    
    manager.extract_text_windows(&image_data)
}

/// Get available OCR languages
#[tauri::command]
pub async fn screenshot_get_ocr_languages(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<String>, String> {
    Ok(manager.get_ocr_languages())
}

// ============== Capture with History Commands ==============

/// Capture fullscreen and add to history
#[tauri::command]
pub async fn screenshot_capture_fullscreen_with_history(
    manager: State<'_, ScreenshotManager>,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_fullscreen_with_history(monitor_index).await?;
    Ok(ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    })
}

/// Capture window and add to history
#[tauri::command]
pub async fn screenshot_capture_window_with_history(
    manager: State<'_, ScreenshotManager>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_window_with_history().await?;
    Ok(ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    })
}

/// Capture region and add to history
#[tauri::command]
pub async fn screenshot_capture_region_with_history(
    manager: State<'_, ScreenshotManager>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<ScreenshotResult, String> {
    let region = CaptureRegion { x, y, width, height };
    let result = manager.capture_region_with_history(region).await?;
    Ok(ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    })
}

/// Screenshot result for frontend
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ScreenshotResult {
    pub image_base64: String,
    pub metadata: ScreenshotMetadata,
}

use base64::Engine;
