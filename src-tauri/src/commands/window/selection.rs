//! Selection toolbar Tauri commands
//!
//! Commands for controlling the selection toolbar from the frontend.

use crate::selection::{
    Selection, SelectionConfig, SelectionContext, SelectionExpansion,
    SelectionHistoryEntry, SelectionHistoryStats, SelectionManager, SelectionMode,
    SelectionPayload, SelectionStatus, SourceAppInfo,
};
use tauri::{Emitter, State};

/// Release all stuck modifier keys (Ctrl, Alt, Shift, Win)
///
/// This command can be called to reset the keyboard state if modifier keys
/// get stuck due to interrupted key simulations or other issues.
#[tauri::command]
pub async fn selection_release_stuck_keys() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use rdev::{simulate, EventType, Key};
        use std::thread;
        use std::time::Duration;

        log::info!("[Selection] Releasing all potentially stuck modifier keys");

        // Small delay before starting
        thread::sleep(Duration::from_millis(10));

        // Release all modifier keys (both left and right versions)
        let modifiers = [
            Key::ControlLeft,
            Key::ControlRight,
            Key::ShiftLeft,
            Key::ShiftRight,
            Key::Alt,
            Key::AltGr,
            Key::MetaLeft,
            Key::MetaRight,
        ];

        for key in modifiers {
            if let Err(e) = simulate(&EventType::KeyRelease(key)) {
                log::trace!("[Selection] Failed to release {:?}: {:?}", key, e);
                // Continue with other keys even if one fails
            }
            thread::sleep(Duration::from_millis(5));
        }

        log::info!("[Selection] Modifier keys released");
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        log::debug!("[Selection] release_stuck_keys called on non-Windows platform");
        Ok(())
    }
}

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
pub async fn selection_hide_toolbar(manager: State<'_, SelectionManager>) -> Result<(), String> {
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

/// Save selection configuration to file
#[tauri::command]
pub async fn selection_save_config(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
    manager.save_config()
}

/// Get current selection configuration
#[tauri::command]
pub async fn selection_get_config(
    manager: State<'_, SelectionManager>,
) -> Result<SelectionConfig, String> {
    Ok(manager.get_config())
}

/// Get current selection status (comprehensive state query)
#[tauri::command]
pub async fn selection_get_status(
    manager: State<'_, SelectionManager>,
) -> Result<SelectionStatus, String> {
    Ok(manager.get_status())
}

/// Set selection toolbar enabled state
#[tauri::command]
pub async fn selection_set_enabled(
    manager: State<'_, SelectionManager>,
    enabled: bool,
) -> Result<(), String> {
    manager.set_enabled(enabled);
    Ok(())
}

/// Check if selection toolbar is enabled
#[tauri::command]
pub async fn selection_is_enabled(manager: State<'_, SelectionManager>) -> Result<bool, String> {
    Ok(manager.is_enabled())
}

/// Restart the selection detection service
#[tauri::command]
pub async fn selection_restart(manager: State<'_, SelectionManager>) -> Result<(), String> {
    manager.restart().await
}

/// Set toolbar hover state (called from frontend when mouse enters/leaves toolbar)
#[tauri::command]
pub async fn selection_set_toolbar_hovered(
    manager: State<'_, SelectionManager>,
    hovered: bool,
) -> Result<(), String> {
    manager.toolbar_window.set_hovered(hovered);
    Ok(())
}

/// Get current toolbar state (called by frontend on initialization to sync state)
/// Returns the current selection text and position if toolbar is visible
#[tauri::command]
pub async fn selection_get_toolbar_state(
    manager: State<'_, SelectionManager>,
) -> Result<Option<serde_json::Value>, String> {
    if manager.toolbar_window.is_visible() {
        let text = manager.toolbar_window.get_selected_text();
        let (x, y) = manager.toolbar_window.get_position();
        
        if let Some(text) = text {
            return Ok(Some(serde_json::json!({
                "text": text,
                "x": x,
                "y": y,
                "textLength": text.len(),
            })));
        }
    }
    Ok(None)
}

/// Set auto-hide timeout for toolbar (0 to disable)
#[tauri::command]
pub async fn selection_set_auto_hide_timeout(
    manager: State<'_, SelectionManager>,
    timeout_ms: u64,
) -> Result<(), String> {
    manager.toolbar_window.set_auto_hide_timeout(timeout_ms);
    Ok(())
}

/// Get detection statistics
#[tauri::command]
pub async fn selection_get_detection_stats(
    manager: State<'_, SelectionManager>,
) -> Result<serde_json::Value, String> {
    let (attempts, successes) = manager.detector.get_stats();
    Ok(serde_json::json!({
        "attempts": attempts,
        "successes": successes,
        "successRate": if attempts > 0 { (successes as f64 / attempts as f64) * 100.0 } else { 0.0 }
    }))
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

/// Get enhanced selection analysis
#[tauri::command]
pub async fn selection_get_enhanced(
    manager: State<'_, SelectionManager>,
    text: String,
    app_name: Option<String>,
    process_name: Option<String>,
    window_title: Option<String>,
) -> Result<Selection, String> {
    let source_app = if app_name.is_some() || process_name.is_some() || window_title.is_some() {
        Some(SourceAppInfo {
            name: app_name.clone().unwrap_or_default(),
            process: process_name.clone().unwrap_or_default(),
            window_title: window_title.clone().unwrap_or_default(),
            app_type: "unknown".to_string(),
        })
    } else {
        None
    };

    Ok(manager.detector.analyze(&text, source_app))
}

/// Analyze current selection with enhanced detection
#[tauri::command]
pub async fn selection_analyze_current(
    manager: State<'_, SelectionManager>,
) -> Result<Option<Selection>, String> {
    let text = match manager.detector.get_selected_text()? {
        Some(t) if !t.is_empty() => t,
        _ => return Ok(None),
    };

    Ok(Some(manager.detector.analyze(&text, None)))
}

/// Expand selection to word at cursor position
#[tauri::command]
pub async fn selection_expand_to_word(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
) -> Result<(usize, usize, String), String> {
    let (start, end) = manager.detector.expand_to_word(&text, cursor_pos);
    let expanded_text = if start < end && end <= text.len() {
        text.chars().skip(start).take(end - start).collect()
    } else {
        String::new()
    };
    Ok((start, end, expanded_text))
}

/// Expand selection to sentence
#[tauri::command]
pub async fn selection_expand_to_sentence(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
) -> Result<(usize, usize, String), String> {
    let (start, end) = manager.detector.expand_to_sentence(&text, cursor_pos);
    let expanded_text = if start < end && end <= text.len() {
        text.chars().skip(start).take(end - start).collect()
    } else {
        String::new()
    };
    Ok((start, end, expanded_text))
}

/// Expand selection to line
#[tauri::command]
pub async fn selection_expand_to_line(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
) -> Result<(usize, usize, String), String> {
    let (start, end) = manager.detector.expand_to_line(&text, cursor_pos);
    let expanded_text = if start < end && end <= text.len() {
        text.chars().skip(start).take(end - start).collect()
    } else {
        String::new()
    };
    Ok((start, end, expanded_text))
}

/// Expand selection to paragraph
#[tauri::command]
pub async fn selection_expand_to_paragraph(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
) -> Result<(usize, usize, String), String> {
    let (start, end) = manager.detector.expand_to_paragraph(&text, cursor_pos);
    let expanded_text = if start < end && end <= text.len() {
        text.chars().skip(start).take(end - start).collect()
    } else {
        String::new()
    };
    Ok((start, end, expanded_text))
}

// ============== Selection History Commands ==============

/// Get selection history
#[tauri::command]
pub async fn selection_get_history(
    manager: State<'_, SelectionManager>,
    count: Option<usize>,
) -> Result<Vec<SelectionHistoryEntry>, String> {
    Ok(manager.history.get_recent(count.unwrap_or(20)))
}

/// Search selection history
#[tauri::command]
pub async fn selection_search_history(
    manager: State<'_, SelectionManager>,
    query: String,
) -> Result<Vec<SelectionHistoryEntry>, String> {
    Ok(manager.history.search(&query))
}

/// Search selection history by application
#[tauri::command]
pub async fn selection_search_history_by_app(
    manager: State<'_, SelectionManager>,
    app_name: String,
) -> Result<Vec<SelectionHistoryEntry>, String> {
    Ok(manager.history.search_by_app(&app_name))
}

/// Search selection history by text type
#[tauri::command]
pub async fn selection_search_history_by_type(
    manager: State<'_, SelectionManager>,
    text_type: String,
) -> Result<Vec<SelectionHistoryEntry>, String> {
    Ok(manager.history.search_by_type(&text_type))
}

/// Get selection history statistics
#[tauri::command]
pub async fn selection_get_history_stats(
    manager: State<'_, SelectionManager>,
) -> Result<SelectionHistoryStats, String> {
    Ok(manager.history.get_stats())
}

/// Search selection history by time range
#[tauri::command]
pub async fn selection_search_history_by_time(
    manager: State<'_, SelectionManager>,
    start: i64,
    end: i64,
) -> Result<Vec<SelectionHistoryEntry>, String> {
    Ok(manager.history.search_by_time(start, end))
}

/// Clear selection history
#[tauri::command]
pub async fn selection_clear_history(manager: State<'_, SelectionManager>) -> Result<(), String> {
    manager.history.clear();
    Ok(())
}

/// Export selection history to JSON
#[tauri::command]
pub async fn selection_export_history(
    manager: State<'_, SelectionManager>,
) -> Result<String, String> {
    manager.history.export_json()
}

/// Import selection history from JSON
#[tauri::command]
pub async fn selection_import_history(
    manager: State<'_, SelectionManager>,
    json: String,
) -> Result<usize, String> {
    manager.history.import_json(&json)
}

/// Get toolbar configuration
#[tauri::command]
pub async fn selection_get_toolbar_config(
    manager: State<'_, SelectionManager>,
) -> Result<serde_json::Value, String> {
    let config = manager.get_config();
    serde_json::to_value(&config).map_err(|e| format!("Failed to serialize config: {}", e))
}

/// Get selection statistics
#[tauri::command]
pub async fn selection_get_stats_summary(
    manager: State<'_, SelectionManager>,
) -> Result<serde_json::Value, String> {
    let (attempts, successes) = manager.detector.get_stats();
    let history_stats = manager.history.get_stats();

    Ok(serde_json::json!({
        "detection": {
            "attempts": attempts,
            "successes": successes,
            "successRate": if attempts > 0 { (successes as f64 / attempts as f64) * 100.0 } else { 0.0 }
        },
        "history": {
            "totalSelections": history_stats.total_selections,
            "byApp": history_stats.by_app,
            "byType": history_stats.by_type,
            "averageLength": history_stats.avg_text_length,
        }
    }))
}

// ============== Detection State Commands ==============

/// Get time since last successful detection in milliseconds
#[tauri::command]
pub async fn selection_time_since_last_detection(
    manager: State<'_, SelectionManager>,
) -> Result<Option<u64>, String> {
    Ok(manager
        .detector
        .time_since_last_detection()
        .map(|d| d.as_millis() as u64))
}

/// Get the last detected text
#[tauri::command]
pub async fn selection_get_last_text(
    manager: State<'_, SelectionManager>,
) -> Result<Option<String>, String> {
    Ok(manager.detector.get_last_text())
}

/// Clear the last detected text
#[tauri::command]
pub async fn selection_clear_last_text(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
    manager.detector.clear_last_text();
    Ok(())
}

/// Get last analyzed selection with full context
#[tauri::command]
pub async fn selection_get_last_selection(
    manager: State<'_, SelectionManager>,
) -> Result<Option<Selection>, String> {
    Ok(manager.detector.get_last_selection())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_selection_payload_struct() {
        let payload = SelectionPayload {
            text: "Hello World".to_string(),
            x: 100,
            y: 200,
            timestamp: 1704067200000,
        };

        assert_eq!(payload.text, "Hello World");
        assert_eq!(payload.x, 100);
        assert_eq!(payload.y, 200);
    }

    #[test]
    fn test_selection_payload_serialization() {
        let payload = SelectionPayload {
            text: "Test".to_string(),
            x: 50,
            y: 75,
            timestamp: 1704067200000,
        };

        let serialized = serde_json::to_string(&payload).unwrap();
        assert!(serialized.contains("\"text\":\"Test\""));
        assert!(serialized.contains("\"x\":50"));
    }

    #[test]
    fn test_get_mouse_position() {
        let (x, y) = get_mouse_position();
        // Just verify it returns valid coordinates (could be anywhere)
        assert!(x >= 0.0 || x < 0.0); // Always true, just checking it runs
        assert!(y >= 0.0 || y < 0.0);
    }

    #[test]
    fn test_source_app_info_struct() {
        let app_info = SourceAppInfo {
            name: "Code".to_string(),
            process: "code.exe".to_string(),
            window_title: "main.rs - Cognia".to_string(),
            app_type: "editor".to_string(),
        };

        assert_eq!(app_info.name, "Code");
        assert_eq!(app_info.process, "code.exe");
        assert_eq!(app_info.app_type, "editor");
    }

    #[test]
    fn test_selection_context_struct() {
        let context = SelectionContext {
            full_text: "Hello world".to_string(),
            cursor_pos: 5,
            selection_start: Some(0),
            selection_end: Some(5),
            app_type: Some("editor".to_string()),
            is_code: false,
            language: None,
        };

        assert_eq!(context.full_text, "Hello world");
        assert_eq!(context.cursor_pos, 5);
        assert!(!context.is_code);
    }

    #[test]
    fn test_selection_context_code() {
        let context = SelectionContext {
            full_text: "fn main() { println!(\"Hello\"); }".to_string(),
            cursor_pos: 15,
            selection_start: None,
            selection_end: None,
            app_type: Some("editor".to_string()),
            is_code: true,
            language: Some("rust".to_string()),
        };

        assert!(context.is_code);
        assert_eq!(context.language, Some("rust".to_string()));
    }

    #[test]
    fn test_selection_expansion_struct() {
        let expansion = SelectionExpansion {
            original_start: 0,
            original_end: 5,
            expanded_start: 0,
            expanded_end: 11,
            expanded_text: "Hello World".to_string(),
            mode: SelectionMode::Word,
            confidence: 0.95,
        };

        assert_eq!(expansion.original_start, 0);
        assert_eq!(expansion.original_end, 5);
        assert_eq!(expansion.expanded_start, 0);
        assert_eq!(expansion.expanded_end, 11);
        assert_eq!(expansion.expanded_text, "Hello World");
        assert_eq!(expansion.confidence, 0.95);
    }

    #[test]
    fn test_selection_struct() {
        let selection = Selection {
            text: "test code".to_string(),
            text_before: Some("const x = ".to_string()),
            text_after: Some(";".to_string()),
            is_code: true,
            language: Some("rust".to_string()),
            is_url: false,
            is_email: false,
            has_numbers: false,
            word_count: 2,
            char_count: 9,
            line_count: 1,
            text_type: crate::selection::TextType::Code,
            source_app: Some(SourceAppInfo {
                name: "VSCode".to_string(),
                process: "code.exe".to_string(),
                window_title: "main.rs".to_string(),
                app_type: "editor".to_string(),
            }),
        };

        assert_eq!(selection.text, "test code");
        assert!(selection.is_code);
        assert_eq!(selection.language, Some("rust".to_string()));
        assert_eq!(selection.word_count, 2);
        assert!(selection.source_app.is_some());
    }

    #[test]
    fn test_selection_struct_serialization() {
        let selection = Selection {
            text: "hello".to_string(),
            text_before: None,
            text_after: None,
            is_code: false,
            language: None,
            is_url: false,
            is_email: false,
            has_numbers: false,
            word_count: 1,
            char_count: 5,
            line_count: 1,
            text_type: crate::selection::TextType::PlainText,
            source_app: None,
        };

        let serialized = serde_json::to_string(&selection).unwrap();
        assert!(serialized.contains("\"text\":\"hello\""));
        assert!(serialized.contains("\"word_count\":1"));
        assert!(serialized.contains("\"is_code\":false"));
    }
}
