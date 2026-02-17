//! Screenshot Tauri commands
//!
//! Commands for capturing screenshots and performing OCR.

use crate::screenshot::{
    Annotation, CaptureRegion, ElementInfo, MonitorInfo, ScreenshotAnnotator, ScreenshotConfig,
    ScreenshotHistoryEntry, ScreenshotManager, ScreenshotMetadata, SelectionSnapResult,
    SelectionState, SnapConfig, SnapResult, WinOcrResult, WindowInfo,
};
use tauri::State;
use base64::Engine;

fn into_frontend_result(result: crate::screenshot::ScreenshotResult) -> ScreenshotResult {
    ScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&result.image_data),
        metadata: result.metadata,
    }
}

/// Capture full screen screenshot
#[tauri::command]
pub async fn screenshot_capture_fullscreen(
    manager: State<'_, ScreenshotManager>,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_fullscreen(monitor_index).await?;
    Ok(into_frontend_result(result))
}

// ============== Annotation Commands ==============

#[derive(serde::Serialize, serde::Deserialize)]
pub struct AnnotatedScreenshotResult {
    pub image_base64: String,
}

/// Apply annotations to a screenshot and return updated base64 image
#[tauri::command]
pub async fn screenshot_apply_annotations(
    image_base64: String,
    annotations: Vec<Annotation>,
) -> Result<AnnotatedScreenshotResult, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let decoder = png::Decoder::new(std::io::Cursor::new(&image_data));
    let mut reader = decoder.read_info().map_err(|e| e.to_string())?;
    let mut buf = vec![0; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).map_err(|e| e.to_string())?;
    let pixels = &buf[..info.buffer_size()];

    let mut rgba_pixels = match info.color_type {
        png::ColorType::Rgba => pixels.to_vec(),
        png::ColorType::Rgb => pixels
            .chunks(3)
            .flat_map(|chunk| [chunk[0], chunk[1], chunk[2], 255])
            .collect(),
        png::ColorType::Grayscale => pixels.iter().flat_map(|v| [*v, *v, *v, 255]).collect(),
        png::ColorType::GrayscaleAlpha => pixels
            .chunks(2)
            .flat_map(|chunk| [chunk[0], chunk[0], chunk[0], chunk[1]])
            .collect(),
        _ => return Err(format!("Unsupported color type: {:?}", info.color_type)),
    };

    let mut annotator = ScreenshotAnnotator::new(info.width, info.height);
    for annotation in annotations {
        annotator.add_annotation(annotation);
    }
    annotator.apply_to_image(&mut rgba_pixels)?;

    let mut png_data = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut png_data, info.width, info.height);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
        writer
            .write_image_data(&rgba_pixels)
            .map_err(|e| e.to_string())?;
    }

    Ok(AnnotatedScreenshotResult {
        image_base64: base64::engine::general_purpose::STANDARD.encode(&png_data),
    })
}

/// Capture active window screenshot
#[tauri::command]
pub async fn screenshot_capture_window(
    manager: State<'_, ScreenshotManager>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_window().await?;
    Ok(into_frontend_result(result))
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
    let region = CaptureRegion {
        x,
        y,
        width,
        height,
    };
    let result = manager.capture_region(region).await?;
    Ok(into_frontend_result(result))
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
pub async fn screenshot_clear_history(manager: State<'_, ScreenshotManager>) -> Result<(), String> {
    manager.clear_history();
    Ok(())
}

/// Add tag to screenshot
#[tauri::command]
pub async fn screenshot_add_tag(
    manager: State<'_, ScreenshotManager>,
    id: String,
    tag: String,
) -> Result<bool, String> {
    Ok(manager.add_tag(&id, tag))
}

/// Remove tag from screenshot
#[tauri::command]
pub async fn screenshot_remove_tag(
    manager: State<'_, ScreenshotManager>,
    id: String,
    tag: String,
) -> Result<bool, String> {
    Ok(manager.remove_tag(&id, &tag))
}

/// Set label for screenshot
#[tauri::command]
pub async fn screenshot_set_label(
    manager: State<'_, ScreenshotManager>,
    id: String,
    label: String,
) -> Result<bool, String> {
    Ok(manager.set_label(&id, label))
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

/// Get available OCR languages installed on the system
#[tauri::command]
pub async fn screenshot_get_ocr_languages(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<String>, String> {
    Ok(manager.get_ocr_languages())
}

/// Check if OCR is available on this system
#[tauri::command]
pub async fn screenshot_ocr_is_available() -> Result<bool, String> {
    use crate::screenshot::WindowsOcr;
    Ok(WindowsOcr::is_available())
}

/// Check if a specific OCR language is available
#[tauri::command]
pub async fn screenshot_ocr_is_language_available(language: String) -> Result<bool, String> {
    use crate::screenshot::WindowsOcr;
    Ok(WindowsOcr::is_language_available(&language))
}

/// Extract text using Windows OCR with language parameter
#[tauri::command]
pub async fn screenshot_ocr_with_language(
    _manager: State<'_, ScreenshotManager>,
    image_base64: String,
    language: Option<String>,
) -> Result<WinOcrResult, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // Create a temporary OCR engine with the specified language
    let mut ocr = crate::screenshot::WindowsOcr::new();
    if let Some(lang) = language {
        ocr.set_language(&lang);
    }

    ocr.extract_text(&image_data)
}

/// Set Windows OCR language used by the screenshot manager
#[tauri::command]
pub async fn screenshot_set_ocr_language(
    manager: State<'_, ScreenshotManager>,
    language: String,
) -> Result<(), String> {
    manager.set_ocr_language(&language);
    Ok(())
}

// ============== Capture with History Commands ==============

/// Capture fullscreen and add to history
#[tauri::command]
pub async fn screenshot_capture_fullscreen_with_history(
    manager: State<'_, ScreenshotManager>,
    monitor_index: Option<usize>,
) -> Result<ScreenshotResult, String> {
    let result = manager
        .capture_fullscreen_with_history(monitor_index)
        .await?;
    Ok(into_frontend_result(result))
}

/// Capture window and add to history
#[tauri::command]
pub async fn screenshot_capture_window_with_history(
    manager: State<'_, ScreenshotManager>,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_window_with_history().await?;
    Ok(into_frontend_result(result))
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
    let region = CaptureRegion {
        x,
        y,
        width,
        height,
    };
    let result = manager.capture_region_with_history(region).await?;
    Ok(into_frontend_result(result))
}

/// Screenshot result for frontend
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ScreenshotResult {
    pub image_base64: String,
    pub metadata: ScreenshotMetadata,
}

// ============== Window Management Commands ==============

/// Get list of all visible windows
#[tauri::command]
pub async fn screenshot_get_windows(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<WindowInfo>, String> {
    Ok(manager.get_windows())
}

/// Get list of all visible windows with thumbnails
#[tauri::command]
pub async fn screenshot_get_windows_with_thumbnails(
    manager: State<'_, ScreenshotManager>,
    thumbnail_size: Option<u32>,
) -> Result<Vec<WindowInfo>, String> {
    Ok(manager.get_windows_with_thumbnails(thumbnail_size.unwrap_or(160)))
}

/// Capture a specific window by its HWND
#[tauri::command]
pub async fn screenshot_capture_window_by_hwnd(
    manager: State<'_, ScreenshotManager>,
    hwnd: isize,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_window_by_hwnd(hwnd)?;
    Ok(into_frontend_result(result))
}

/// Capture a specific window by HWND and add to history
#[tauri::command]
pub async fn screenshot_capture_window_by_hwnd_with_history(
    manager: State<'_, ScreenshotManager>,
    hwnd: isize,
) -> Result<ScreenshotResult, String> {
    let result = manager.capture_window_by_hwnd_with_history(hwnd).await?;
    Ok(into_frontend_result(result))
}

/// Calculate snap position for window movement
#[tauri::command]
pub async fn screenshot_calculate_snap(
    manager: State<'_, ScreenshotManager>,
    window_hwnd: isize,
    proposed_x: i32,
    proposed_y: i32,
    window_width: u32,
    window_height: u32,
) -> Result<SnapResult, String> {
    Ok(manager.calculate_snap_position(
        window_hwnd,
        proposed_x,
        proposed_y,
        window_width,
        window_height,
    ))
}

/// Get current snap configuration
#[tauri::command]
pub async fn screenshot_get_snap_config(
    manager: State<'_, ScreenshotManager>,
) -> Result<SnapConfig, String> {
    Ok(manager.get_snap_config())
}

/// Update snap configuration
#[tauri::command]
pub async fn screenshot_set_snap_config(
    manager: State<'_, ScreenshotManager>,
    config: SnapConfig,
) -> Result<(), String> {
    manager.set_snap_config(config);
    Ok(())
}

// ============== Window Auto-Detection Commands ==============

/// Get the window at a specific screen point (for auto-detection during selection)
#[tauri::command]
pub async fn screenshot_get_window_at_point(
    manager: State<'_, ScreenshotManager>,
    x: i32,
    y: i32,
) -> Result<Option<WindowInfo>, String> {
    Ok(manager.get_window_at_point(x, y))
}

/// Get child elements of a window (for element-level detection)
#[tauri::command]
pub async fn screenshot_get_child_elements(
    manager: State<'_, ScreenshotManager>,
    hwnd: isize,
    max_depth: Option<u32>,
) -> Result<Vec<ElementInfo>, String> {
    Ok(manager.get_child_elements(hwnd, max_depth.unwrap_or(1)))
}

/// Calculate snapped selection rectangle during region selection
#[tauri::command]
pub async fn screenshot_calculate_selection_snap(
    manager: State<'_, ScreenshotManager>,
    selection_x: i32,
    selection_y: i32,
    selection_width: u32,
    selection_height: u32,
) -> Result<SelectionSnapResult, String> {
    Ok(manager.calculate_selection_snap(
        selection_x,
        selection_y,
        selection_width,
        selection_height,
    ))
}

/// Get pixel color at screen coordinates (for color picker)
#[tauri::command]
pub async fn screenshot_get_pixel_color(
    manager: State<'_, ScreenshotManager>,
    x: i32,
    y: i32,
) -> Result<Option<String>, String> {
    Ok(manager.get_pixel_color(x, y))
}

// ============== Selection State Commands ==============

#[derive(serde::Serialize, serde::Deserialize)]
pub struct SelectionValidationResult {
    pub region: CaptureRegion,
    pub is_valid: bool,
}

/// Validate selection state and normalize region
#[tauri::command]
pub async fn screenshot_validate_selection(
    start_x: i32,
    start_y: i32,
    current_x: i32,
    current_y: i32,
) -> Result<SelectionValidationResult, String> {
    let state = SelectionState {
        is_selecting: true,
        start_x,
        start_y,
        current_x,
        current_y,
    };

    let region = state.get_region();
    let is_valid = state.is_valid();

    Ok(SelectionValidationResult { region, is_valid })
}

// ============== History Extended Commands ==============

/// Get all screenshot history
#[tauri::command]
pub async fn screenshot_get_all_history(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<ScreenshotHistoryEntry>, String> {
    Ok(manager.get_all_history())
}

/// Search screenshot history by label
#[tauri::command]
pub async fn screenshot_search_history_by_label(
    manager: State<'_, ScreenshotManager>,
    label: String,
) -> Result<Vec<ScreenshotHistoryEntry>, String> {
    Ok(manager.search_history_by_label(&label))
}

/// Get pinned screenshot history
#[tauri::command]
pub async fn screenshot_get_pinned_history(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<ScreenshotHistoryEntry>, String> {
    Ok(manager.get_pinned_history())
}

/// Clear all screenshot history
#[tauri::command]
pub async fn screenshot_clear_all_history(
    manager: State<'_, ScreenshotManager>,
) -> Result<(), String> {
    manager.clear_all_history();
    Ok(())
}

/// Get history stats (count, is_empty)
#[tauri::command]
pub async fn screenshot_get_history_stats(
    manager: State<'_, ScreenshotManager>,
) -> Result<(usize, bool), String> {
    Ok(manager.get_history_stats())
}

// ============== Annotator Management Commands ==============

/// Initialize annotator for a specific image size
#[tauri::command]
pub async fn screenshot_annotator_init(
    manager: State<'_, ScreenshotManager>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    manager.init_annotator(width, height);
    Ok(())
}

/// Add annotation to current annotator session
#[tauri::command]
pub async fn screenshot_annotator_add(
    manager: State<'_, ScreenshotManager>,
    annotation: Annotation,
) -> Result<(), String> {
    manager.add_annotation(annotation);
    Ok(())
}

/// Undo last annotation
#[tauri::command]
pub async fn screenshot_annotator_undo(
    manager: State<'_, ScreenshotManager>,
) -> Result<Option<Annotation>, String> {
    Ok(manager.annotator_undo())
}

/// Clear all annotations
#[tauri::command]
pub async fn screenshot_annotator_clear(
    manager: State<'_, ScreenshotManager>,
) -> Result<(), String> {
    manager.annotator_clear();
    Ok(())
}

/// Get all current annotations
#[tauri::command]
pub async fn screenshot_annotator_get_all(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<Annotation>, String> {
    Ok(manager.get_annotations())
}

/// Export annotations as JSON
#[tauri::command]
pub async fn screenshot_annotator_export(
    manager: State<'_, ScreenshotManager>,
) -> Result<String, String> {
    Ok(manager.export_annotations())
}

/// Import annotations from JSON
#[tauri::command]
pub async fn screenshot_annotator_import(
    manager: State<'_, ScreenshotManager>,
    json: String,
) -> Result<(), String> {
    manager.import_annotations(&json)
}

// ============== Detailed OCR Commands ==============

/// Extract text with detailed results (lines, bounds, confidence)
#[tauri::command]
pub async fn screenshot_ocr_extract_detailed(
    manager: State<'_, ScreenshotManager>,
    image_base64: String,
) -> Result<crate::screenshot::LegacyOcrResult, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    manager.extract_text_detailed(&image_data).await
}

/// Get current OCR language setting
#[tauri::command]
pub async fn screenshot_get_current_ocr_language(
    manager: State<'_, ScreenshotManager>,
) -> Result<String, String> {
    Ok(manager.get_current_ocr_language())
}

/// Check if OCR engine is available on this system
#[tauri::command]
pub async fn screenshot_is_ocr_available(
    manager: State<'_, ScreenshotManager>,
) -> Result<bool, String> {
    Ok(manager.is_ocr_available())
}

/// Get available OCR engine languages
#[tauri::command]
pub async fn screenshot_get_ocr_engine_languages(
    manager: State<'_, ScreenshotManager>,
) -> Result<Vec<String>, String> {
    Ok(manager.get_ocr_engine_languages())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::screenshot::{OcrBounds, OcrLine, OcrWord};

    #[test]
    fn test_screenshot_result_struct() {
        let result = ScreenshotResult {
            image_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==".to_string(),
            metadata: ScreenshotMetadata {
                timestamp: 1704067200000,
                width: 100,
                height: 100,
                mode: "fullscreen".to_string(),
                monitor_index: Some(0),
                window_title: None,
                region: None,
                file_path: None,
                ocr_text: None,
            },
        };

        assert!(!result.image_base64.is_empty());
        assert_eq!(result.metadata.width, 100);
        assert_eq!(result.metadata.height, 100);
    }

    #[test]
    fn test_into_frontend_result_encodes_image_and_preserves_metadata() {
        let native_result = crate::screenshot::ScreenshotResult {
            image_data: vec![1, 2, 3, 4],
            metadata: ScreenshotMetadata {
                timestamp: 1704067200000,
                width: 100,
                height: 50,
                mode: "region".to_string(),
                monitor_index: None,
                window_title: None,
                region: Some(CaptureRegion {
                    x: 10,
                    y: 20,
                    width: 100,
                    height: 50,
                }),
                file_path: Some("C:/shots/a.png".to_string()),
                ocr_text: Some("hello".to_string()),
            },
        };

        let converted = into_frontend_result(native_result);
        assert_eq!(
            converted.image_base64,
            base64::engine::general_purpose::STANDARD.encode([1, 2, 3, 4])
        );
        assert_eq!(converted.metadata.file_path, Some("C:/shots/a.png".to_string()));
        assert_eq!(converted.metadata.ocr_text, Some("hello".to_string()));
    }

    #[test]
    fn test_screenshot_result_serialization() {
        let result = ScreenshotResult {
            image_base64: "base64data".to_string(),
            metadata: ScreenshotMetadata {
                timestamp: 1704067200000,
                width: 1920,
                height: 1080,
                mode: "fullscreen".to_string(),
                monitor_index: Some(0),
                window_title: None,
                region: None,
                file_path: Some("/path/to/screenshot.png".to_string()),
                ocr_text: None,
            },
        };

        let serialized = serde_json::to_string(&result).unwrap();
        assert!(serialized.contains("\"image_base64\":\"base64data\""));
        assert!(serialized.contains("\"width\":1920"));

        let deserialized: ScreenshotResult = serde_json::from_str(&serialized).unwrap();
        assert_eq!(result.image_base64, deserialized.image_base64);
        assert_eq!(result.metadata.width, deserialized.metadata.width);
    }

    #[test]
    fn test_capture_region_struct() {
        let region = CaptureRegion {
            x: 100,
            y: 200,
            width: 800,
            height: 600,
        };

        assert_eq!(region.x, 100);
        assert_eq!(region.y, 200);
        assert_eq!(region.width, 800);
        assert_eq!(region.height, 600);
    }

    #[test]
    fn test_capture_region_serialization() {
        let region = CaptureRegion {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };

        let serialized = serde_json::to_string(&region).unwrap();
        let deserialized: CaptureRegion = serde_json::from_str(&serialized).unwrap();

        assert_eq!(region.x, deserialized.x);
        assert_eq!(region.y, deserialized.y);
        assert_eq!(region.width, deserialized.width);
        assert_eq!(region.height, deserialized.height);
    }

    #[test]
    fn test_capture_region_negative_coords() {
        let region = CaptureRegion {
            x: -100,
            y: -50,
            width: 500,
            height: 300,
        };

        assert_eq!(region.x, -100);
        assert_eq!(region.y, -50);
    }

    #[test]
    fn test_monitor_info_struct() {
        let monitor = MonitorInfo {
            index: 0,
            name: "Primary Monitor".to_string(),
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_primary: true,
            scale_factor: 1.0,
        };

        assert_eq!(monitor.index, 0);
        assert!(monitor.is_primary);
        assert_eq!(monitor.scale_factor, 1.0);
    }

    #[test]
    fn test_monitor_info_high_dpi() {
        let monitor = MonitorInfo {
            index: 1,
            name: "Retina Display".to_string(),
            x: 1920,
            y: 0,
            width: 2560,
            height: 1440,
            is_primary: false,
            scale_factor: 2.0,
        };

        assert_eq!(monitor.scale_factor, 2.0);
        assert!(!monitor.is_primary);
    }

    #[test]
    fn test_screenshot_config_default() {
        let config = ScreenshotConfig::default();

        assert_eq!(config.format, "png");
        assert_eq!(config.quality, 95);
        assert!(!config.include_cursor);
    }

    #[test]
    fn test_screenshot_config_custom() {
        let config = ScreenshotConfig {
            save_directory: Some("/custom/path".to_string()),
            format: "jpg".to_string(),
            quality: 80,
            include_cursor: true,
            delay_ms: 500,
            copy_to_clipboard: false,
            show_notification: false,
            ocr_language: "chi_sim".to_string(),
            auto_save: true,
            filename_template: "custom_{mode}_{timestamp}".to_string(),
        };

        assert_eq!(config.save_directory, Some("/custom/path".to_string()));
        assert_eq!(config.format, "jpg");
        assert_eq!(config.quality, 80);
        assert!(config.include_cursor);
    }

    #[test]
    fn test_screenshot_config_struct() {
        let config = ScreenshotConfig {
            save_directory: Some("/screenshots".to_string()),
            format: "png".to_string(),
            quality: 90,
            include_cursor: false,
            delay_ms: 0,
            copy_to_clipboard: true,
            show_notification: true,
            ocr_language: "en".to_string(),
            auto_save: false,
            filename_template: "screenshot_{timestamp}".to_string(),
        };

        assert_eq!(config.format, "png");
        assert_eq!(config.quality, 90);
        assert!(!config.include_cursor);
        assert!(config.copy_to_clipboard);
    }

    #[test]
    fn test_screenshot_config_serialization() {
        let config = ScreenshotConfig {
            save_directory: None,
            format: "jpeg".to_string(),
            quality: 80,
            include_cursor: true,
            delay_ms: 500,
            copy_to_clipboard: false,
            show_notification: false,
            ocr_language: "zh-CN".to_string(),
            auto_save: true,
            filename_template: "shot_{mode}_{timestamp}".to_string(),
        };

        let serialized = serde_json::to_string(&config).unwrap();
        let deserialized: ScreenshotConfig = serde_json::from_str(&serialized).unwrap();

        assert_eq!(config.format, deserialized.format);
        assert_eq!(config.quality, deserialized.quality);
        assert_eq!(config.ocr_language, deserialized.ocr_language);
        assert_eq!(config.auto_save, deserialized.auto_save);
        assert_eq!(config.filename_template, deserialized.filename_template);
    }

    #[test]
    fn test_screenshot_metadata_struct() {
        let metadata = ScreenshotMetadata {
            timestamp: 1704067200000,
            width: 1920,
            height: 1080,
            mode: "window".to_string(),
            monitor_index: None,
            window_title: Some("Test Window".to_string()),
            region: None,
            file_path: None,
            ocr_text: None,
        };

        assert_eq!(metadata.width, 1920);
        assert_eq!(metadata.mode, "window");
        assert_eq!(metadata.window_title, Some("Test Window".to_string()));
    }

    #[test]
    fn test_screenshot_history_entry_struct() {
        let entry = ScreenshotHistoryEntry::new(800, 600, "region")
            .with_thumbnail("thumb_data".to_string())
            .with_ocr_text("Extracted text".to_string());

        assert!(!entry.id.is_empty());
        assert!(!entry.is_pinned);
        assert_eq!(entry.width, 800);
        assert_eq!(entry.height, 600);
        assert_eq!(entry.ocr_text, Some("Extracted text".to_string()));
    }

    #[test]
    fn test_win_ocr_result_struct() {
        let result = WinOcrResult {
            text: "Hello World".to_string(),
            confidence: 0.95,
            lines: vec![OcrLine {
                text: "Hello World".to_string(),
                words: vec![
                    OcrWord {
                        text: "Hello".to_string(),
                        bounds: OcrBounds {
                            x: 0.0,
                            y: 0.0,
                            width: 50.0,
                            height: 20.0,
                        },
                        confidence: 0.95,
                    },
                    OcrWord {
                        text: "World".to_string(),
                        bounds: OcrBounds {
                            x: 55.0,
                            y: 0.0,
                            width: 50.0,
                            height: 20.0,
                        },
                        confidence: 0.95,
                    },
                ],
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 105.0,
                    height: 20.0,
                },
            }],
            language: Some("en".to_string()),
        };

        assert_eq!(result.text, "Hello World");
        assert_eq!(result.confidence, 0.95);
        assert_eq!(result.lines.len(), 1);
    }

    #[test]
    fn test_win_ocr_result_empty() {
        let result = WinOcrResult {
            text: String::new(),
            confidence: 0.0,
            lines: vec![],
            language: None,
        };

        assert!(result.text.is_empty());
        assert!(result.lines.is_empty());
        assert!(result.language.is_none());
    }

    #[test]
    fn test_ocr_bounds_struct() {
        let bounds = OcrBounds {
            x: 10.0,
            y: 20.0,
            width: 100.0,
            height: 30.0,
        };

        assert_eq!(bounds.x, 10.0);
        assert_eq!(bounds.y, 20.0);
        assert_eq!(bounds.width, 100.0);
        assert_eq!(bounds.height, 30.0);
    }
}
