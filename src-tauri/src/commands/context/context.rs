//! Context awareness Tauri commands
//!
//! Commands for gathering context about the user's current activity.

use crate::context::{
    AppContext, BrowserContext, ContextManager, EditorContext, FileContext, FullContext,
    ScreenContent, UiElement, WindowInfo,
};
use crate::commands::media::ocr::OcrState;
use crate::screenshot::ocr_provider::DocumentHint;
use crate::screenshot::{OcrOptions, OcrProviderType, ScreenshotCapture, UnifiedOcrResult};
use log::warn;
use tauri::State;

async fn extract_ocr_result(
    ocr_state: &State<'_, OcrState>,
    image_data: &[u8],
    language: Option<String>,
    provider: Option<OcrProviderType>,
) -> Option<UnifiedOcrResult> {
    let options = OcrOptions {
        language,
        document_hint: Some(DocumentHint::Screenshot),
        word_level: false,
        ..Default::default()
    };

    let manager = ocr_state.manager.read().clone();

    let ocr_result = if let Some(provider) = provider {
        manager.extract_text(Some(provider), image_data, &options).await
    } else {
        manager
            .extract_text_with_fallback(
                image_data,
                &options,
                &[OcrProviderType::WindowsOcr, OcrProviderType::Tesseract],
            )
            .await
    };

    match ocr_result {
        Ok(result) => Some(result),
        Err(error) => {
            warn!("Screen OCR failed, continuing with UIA-only analysis: {}", error);
            None
        }
    }
}

/// Get full context information
#[tauri::command]
pub async fn context_get_full(manager: State<'_, ContextManager>) -> Result<FullContext, String> {
    manager.get_context()
}

/// Get active window information
#[tauri::command]
pub async fn context_get_window(manager: State<'_, ContextManager>) -> Result<WindowInfo, String> {
    manager.get_window_info()
}

/// Get application context
#[tauri::command]
pub async fn context_get_app(manager: State<'_, ContextManager>) -> Result<AppContext, String> {
    manager.get_app_context()
}

/// Get file context
#[tauri::command]
pub async fn context_get_file(manager: State<'_, ContextManager>) -> Result<FileContext, String> {
    manager.get_file_context()
}

/// Get browser context
#[tauri::command]
pub async fn context_get_browser(
    manager: State<'_, ContextManager>,
) -> Result<BrowserContext, String> {
    manager.get_browser_context()
}

/// Get suggested actions for the current browser page
#[tauri::command]
pub async fn context_get_browser_suggested_actions(
    manager: State<'_, ContextManager>,
) -> Result<Vec<String>, String> {
    let browser_context = manager.get_browser_context()?;
    Ok(browser_context.get_suggested_actions().to_vec())
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
pub async fn context_clear_cache(manager: State<'_, ContextManager>) -> Result<(), String> {
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

/// Check if the current context is a code editor
#[tauri::command]
pub async fn context_is_code_editor(manager: State<'_, ContextManager>) -> Result<bool, String> {
    match manager.get_editor_context() {
        Ok(ctx) => Ok(ctx.is_code_editor()),
        Err(_) => Ok(false),
    }
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

/// Set cache duration in milliseconds
#[tauri::command]
pub async fn context_set_cache_duration(
    manager: State<'_, ContextManager>,
    ms: u64,
) -> Result<(), String> {
    manager.set_cache_duration(ms);
    Ok(())
}

/// Get current cache duration in milliseconds
#[tauri::command]
pub async fn context_get_cache_duration(manager: State<'_, ContextManager>) -> Result<u64, String> {
    Ok(manager.get_cache_duration())
}

/// Analyze UI using Windows UI Automation
#[tauri::command]
pub async fn context_analyze_ui_automation(
    manager: State<'_, ContextManager>,
) -> Result<Vec<UiElement>, String> {
    manager.get_screen_analyzer().analyze_ui_automation()
}

/// Get text at specific screen coordinates
#[tauri::command]
pub async fn context_get_text_at(
    manager: State<'_, ContextManager>,
    x: i32,
    y: i32,
) -> Result<Option<String>, String> {
    Ok(manager.get_screen_analyzer().get_text_at(x, y))
}

/// Get UI element at specific screen coordinates
#[tauri::command]
pub async fn context_get_element_at(
    manager: State<'_, ContextManager>,
    x: i32,
    y: i32,
) -> Result<Option<UiElement>, String> {
    Ok(manager.get_screen_analyzer().get_element_at(x, y))
}

/// Analyze screen content from image data
#[tauri::command]
pub async fn context_analyze_screen(
    manager: State<'_, ContextManager>,
    ocr_state: State<'_, OcrState>,
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    provider: Option<OcrProviderType>,
    language: Option<String>,
) -> Result<ScreenContent, String> {
    let ocr_result = extract_ocr_result(&ocr_state, &image_data, language, provider).await;
    manager
        .get_screen_analyzer()
        .analyze_with_ocr_result(width, height, ocr_result.as_ref())
}

/// Capture active window and analyze screen content without screenshot side effects
#[tauri::command]
pub async fn context_capture_and_analyze_active_window(
    manager: State<'_, ContextManager>,
    ocr_state: State<'_, OcrState>,
    provider: Option<OcrProviderType>,
    language: Option<String>,
) -> Result<ScreenContent, String> {
    let capture = ScreenshotCapture::new();
    let screenshot = capture.capture_active_window()?;

    let ocr_result = extract_ocr_result(&ocr_state, &screenshot.image_data, language, provider).await;
    manager.get_screen_analyzer().analyze_with_ocr_result(
        screenshot.metadata.width,
        screenshot.metadata.height,
        ocr_result.as_ref(),
    )
}

/// Clear screen content analysis cache
#[tauri::command]
pub async fn context_clear_screen_cache(manager: State<'_, ContextManager>) -> Result<(), String> {
    manager.get_screen_analyzer().clear_cache();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::context::AppType;

    #[test]
    fn test_window_info_struct() {
        let info = WindowInfo {
            handle: 12345,
            title: "Test Window".to_string(),
            class_name: "TestClass".to_string(),
            process_id: 1234,
            process_name: "test.exe".to_string(),
            exe_path: Some("/path/to/test.exe".to_string()),
            x: 100,
            y: 200,
            width: 800,
            height: 600,
            is_minimized: false,
            is_maximized: false,
            is_focused: true,
            is_visible: true,
        };

        assert_eq!(info.handle, 12345);
        assert_eq!(info.title, "Test Window");
        assert_eq!(info.process_id, 1234);
        assert!(info.is_focused);
        assert!(info.is_visible);
    }

    #[test]
    fn test_window_info_serialization() {
        let info = WindowInfo {
            handle: 999,
            title: "Serialization Test".to_string(),
            class_name: "TestWnd".to_string(),
            process_id: 5678,
            process_name: "app.exe".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_minimized: true,
            is_maximized: false,
            is_focused: false,
            is_visible: false,
        };

        let serialized = serde_json::to_string(&info).unwrap();
        assert!(serialized.contains("\"title\":\"Serialization Test\""));
        assert!(serialized.contains("\"is_minimized\":true"));

        let deserialized: WindowInfo = serde_json::from_str(&serialized).unwrap();
        assert_eq!(info.handle, deserialized.handle);
        assert_eq!(info.title, deserialized.title);
        assert_eq!(info.is_minimized, deserialized.is_minimized);
    }

    #[test]
    fn test_app_type_enum() {
        assert_eq!(AppType::Browser, AppType::Browser);
        assert_eq!(AppType::CodeEditor, AppType::CodeEditor);
        assert_ne!(AppType::Browser, AppType::Terminal);
    }

    #[test]
    fn test_app_type_serialization() {
        let app_type = AppType::CodeEditor;
        let serialized = serde_json::to_string(&app_type).unwrap();
        let deserialized: AppType = serde_json::from_str(&serialized).unwrap();
        assert_eq!(app_type, deserialized);
    }

    #[test]
    fn test_full_context_empty() {
        let context = FullContext {
            window: None,
            app: None,
            file: None,
            browser: None,
            editor: None,
            timestamp: 1704067200000,
        };

        assert!(context.window.is_none());
        assert!(context.app.is_none());
        assert!(context.file.is_none());
        assert!(context.browser.is_none());
        assert!(context.editor.is_none());
        assert_eq!(context.timestamp, 1704067200000);
    }

    #[test]
    fn test_full_context_serialization() {
        let context = FullContext {
            window: None,
            app: None,
            file: None,
            browser: None,
            editor: None,
            timestamp: 1704067200000,
        };

        let serialized = serde_json::to_string(&context).unwrap();
        assert!(serialized.contains("\"timestamp\":1704067200000"));

        let deserialized: FullContext = serde_json::from_str(&serialized).unwrap();
        assert_eq!(context.timestamp, deserialized.timestamp);
    }

    #[test]
    fn test_full_context_with_window() {
        let window = WindowInfo {
            handle: 1,
            title: "Test".to_string(),
            class_name: "Test".to_string(),
            process_id: 1,
            process_name: "test".to_string(),
            exe_path: None,
            x: 0,
            y: 0,
            width: 100,
            height: 100,
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
            timestamp: 1704067200000,
        };

        assert!(context.window.is_some());
        let w = context.window.unwrap();
        assert_eq!(w.title, "Test");
        assert!(w.is_focused);
    }
}
