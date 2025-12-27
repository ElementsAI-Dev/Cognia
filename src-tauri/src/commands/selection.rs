//! Selection toolbar Tauri commands
//!
//! Commands for controlling the selection toolbar from the frontend.

use crate::selection::{
    SelectionConfig, SelectionManager, SelectionPayload, SelectionStatus, 
    EnhancedSelection, SourceAppInfo, SelectionHistoryEntry, SelectionHistoryStats,
    ClipboardEntry, SelectionMode, SelectionExpansion, SelectionContext,
};
use tauri::{State, Emitter};

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
pub async fn selection_is_enabled(
    manager: State<'_, SelectionManager>,
) -> Result<bool, String> {
    Ok(manager.is_enabled())
}

/// Restart the selection detection service
#[tauri::command]
pub async fn selection_restart(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
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
) -> Result<EnhancedSelection, String> {
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

    Ok(manager.enhanced_detector.analyze(&text, source_app))
}

/// Analyze current selection with enhanced detection
#[tauri::command]
pub async fn selection_analyze_current(
    manager: State<'_, SelectionManager>,
) -> Result<Option<EnhancedSelection>, String> {
    let text = match manager.detector.get_selected_text()? {
        Some(t) if !t.is_empty() => t,
        _ => return Ok(None),
    };

    Ok(Some(manager.enhanced_detector.analyze(&text, None)))
}

/// Expand selection to word at cursor position
#[tauri::command]
pub async fn selection_expand_to_word(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
) -> Result<(usize, usize, String), String> {
    let (start, end) = manager.enhanced_detector.expand_to_word(&text, cursor_pos);
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
    let (start, end) = manager.enhanced_detector.expand_to_sentence(&text, cursor_pos);
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
    let (start, end) = manager.enhanced_detector.expand_to_line(&text, cursor_pos);
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
    let (start, end) = manager.enhanced_detector.expand_to_paragraph(&text, cursor_pos);
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

/// Clear selection history
#[tauri::command]
pub async fn selection_clear_history(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
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

// ============== Clipboard History Commands ==============

/// Get clipboard history
#[tauri::command]
pub async fn clipboard_get_history(
    manager: State<'_, SelectionManager>,
    count: Option<usize>,
) -> Result<Vec<ClipboardEntry>, String> {
    Ok(manager.clipboard_history.get_recent(count.unwrap_or(20)))
}

/// Search clipboard history
#[tauri::command]
pub async fn clipboard_search_history(
    manager: State<'_, SelectionManager>,
    query: String,
) -> Result<Vec<ClipboardEntry>, String> {
    Ok(manager.clipboard_history.search(&query))
}

/// Get pinned clipboard entries
#[tauri::command]
pub async fn clipboard_get_pinned(
    manager: State<'_, SelectionManager>,
) -> Result<Vec<ClipboardEntry>, String> {
    Ok(manager.clipboard_history.get_pinned())
}

/// Pin a clipboard entry
#[tauri::command]
pub async fn clipboard_pin_entry(
    manager: State<'_, SelectionManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.clipboard_history.pin_entry(&id))
}

/// Unpin a clipboard entry
#[tauri::command]
pub async fn clipboard_unpin_entry(
    manager: State<'_, SelectionManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.clipboard_history.unpin_entry(&id))
}

/// Delete a clipboard entry
#[tauri::command]
pub async fn clipboard_delete_entry(
    manager: State<'_, SelectionManager>,
    id: String,
) -> Result<bool, String> {
    Ok(manager.clipboard_history.delete_entry(&id))
}

/// Clear unpinned clipboard history
#[tauri::command]
pub async fn clipboard_clear_unpinned(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
    manager.clipboard_history.clear_unpinned();
    Ok(())
}

/// Clear all clipboard history
#[tauri::command]
pub async fn clipboard_clear_all(
    manager: State<'_, SelectionManager>,
) -> Result<(), String> {
    manager.clipboard_history.clear_all();
    Ok(())
}

/// Copy clipboard entry back to clipboard
#[tauri::command]
pub async fn clipboard_copy_entry(
    manager: State<'_, SelectionManager>,
    id: String,
) -> Result<(), String> {
    manager.clipboard_history.copy_to_clipboard(&id)
}

/// Check and update clipboard history
#[tauri::command]
pub async fn clipboard_check_update(
    manager: State<'_, SelectionManager>,
) -> Result<bool, String> {
    manager.clipboard_history.check_and_update()
}

// ============== Smart Selection Commands ==============

/// Smart expand selection based on mode
#[tauri::command]
pub async fn selection_smart_expand(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
    mode: String,
    is_code: Option<bool>,
    language: Option<String>,
) -> Result<SelectionExpansion, String> {
    let context = SelectionContext {
        full_text: text,
        cursor_pos,
        selection_start: None,
        selection_end: None,
        app_type: None,
        is_code: is_code.unwrap_or(false),
        language,
    };

    let selection_mode = match mode.as_str() {
        "word" => SelectionMode::Word,
        "line" => SelectionMode::Line,
        "sentence" => SelectionMode::Sentence,
        "paragraph" => SelectionMode::Paragraph,
        "code_block" => SelectionMode::CodeBlock,
        "function" => SelectionMode::Function,
        "bracket" => SelectionMode::BracketMatch,
        "quote" => SelectionMode::QuoteMatch,
        "url" => SelectionMode::Url,
        "email" => SelectionMode::Email,
        "file_path" => SelectionMode::FilePath,
        _ => SelectionMode::Word,
    };

    Ok(manager.smart_selection.expand(&context, selection_mode))
}

/// Auto-detect best expansion mode and expand
#[tauri::command]
pub async fn selection_auto_expand(
    manager: State<'_, SelectionManager>,
    text: String,
    cursor_pos: usize,
    is_code: Option<bool>,
    language: Option<String>,
) -> Result<SelectionExpansion, String> {
    let context = SelectionContext {
        full_text: text,
        cursor_pos,
        selection_start: None,
        selection_end: None,
        app_type: None,
        is_code: is_code.unwrap_or(false),
        language,
    };

    Ok(manager.smart_selection.auto_expand(&context))
}

/// Get available selection modes
#[tauri::command]
pub async fn selection_get_modes() -> Result<Vec<String>, String> {
    Ok(vec![
        "word".to_string(),
        "line".to_string(),
        "sentence".to_string(),
        "paragraph".to_string(),
        "code_block".to_string(),
        "function".to_string(),
        "bracket".to_string(),
        "quote".to_string(),
        "url".to_string(),
        "email".to_string(),
        "file_path".to_string(),
    ])
}
