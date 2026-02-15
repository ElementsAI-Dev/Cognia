//! Clipboard Tauri commands
//!
//! Commands for clipboard history management and context-aware clipboard analysis.

use crate::selection::{
    ClipboardAnalysis, ClipboardEntry, ContentCategory, ContentStats, DetectedLanguage,
    ExtractedEntity, SelectionManager, SuggestedAction,
};
use tauri::State;

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
pub async fn clipboard_clear_unpinned(manager: State<'_, SelectionManager>) -> Result<(), String> {
    manager.clipboard_history.clear_unpinned();
    Ok(())
}

/// Clear all clipboard history
#[tauri::command]
pub async fn clipboard_clear_all(manager: State<'_, SelectionManager>) -> Result<(), String> {
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
pub async fn clipboard_check_update(manager: State<'_, SelectionManager>) -> Result<bool, String> {
    manager.clipboard_history.check_and_update()
}

// ============== Clipboard Context Awareness Commands ==============

/// Analyze clipboard content and return detailed analysis
#[tauri::command]
pub async fn clipboard_analyze_content(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<ClipboardAnalysis, String> {
    Ok(manager.clipboard_analyzer.analyze(&content))
}

/// Get current clipboard content with analysis
#[tauri::command]
pub async fn clipboard_get_current_with_analysis(
    app_handle: tauri::AppHandle,
    manager: State<'_, SelectionManager>,
) -> Result<Option<(String, ClipboardAnalysis)>, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let text = match app_handle.clipboard().read_text() {
        Ok(text) => text,
        Err(_) => return Ok(None),
    };

    if !text.is_empty() {
        let analysis = manager.clipboard_analyzer.analyze(&text);
        return Ok(Some((text, analysis)));
    }

    Ok(None)
}

/// Transform clipboard content based on action
#[tauri::command]
pub async fn clipboard_transform_content(
    manager: State<'_, SelectionManager>,
    content: String,
    action: String,
) -> Result<String, String> {
    manager.clipboard_analyzer.transform(&content, &action)
}

/// Write text to clipboard using Tauri plugin
#[tauri::command]
pub async fn clipboard_write_text(
    app_handle: tauri::AppHandle,
    text: String,
) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app_handle
        .clipboard()
        .write_text(text)
        .map_err(|e| format!("Failed to write to clipboard: {}", e))
}

/// Read text from clipboard using Tauri plugin
#[tauri::command]
pub async fn clipboard_read_text(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app_handle
        .clipboard()
        .read_text()
        .map_err(|e| format!("Failed to read clipboard: {}", e))
}

/// Write HTML to clipboard using Tauri plugin
#[tauri::command]
pub async fn clipboard_write_html(
    app_handle: tauri::AppHandle,
    html: String,
    alt_text: Option<String>,
) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app_handle
        .clipboard()
        .write_html(html, alt_text)
        .map_err(|e| format!("Failed to write HTML to clipboard: {}", e))
}

/// Clear clipboard using Tauri plugin
#[tauri::command]
pub async fn clipboard_clear(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;

    app_handle
        .clipboard()
        .clear()
        .map_err(|e| format!("Failed to clear clipboard: {}", e))
}

/// Get suggested actions for clipboard content
#[tauri::command]
pub async fn clipboard_get_suggested_actions(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<Vec<SuggestedAction>, String> {
    let analysis = manager.clipboard_analyzer.analyze(&content);
    Ok(analysis.suggested_actions)
}

/// Extract entities from clipboard content
#[tauri::command]
pub async fn clipboard_extract_entities(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<Vec<ExtractedEntity>, String> {
    let analysis = manager.clipboard_analyzer.analyze(&content);
    Ok(analysis.entities)
}

/// Check if clipboard content is sensitive
#[tauri::command]
pub async fn clipboard_check_sensitive(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<bool, String> {
    let analysis = manager.clipboard_analyzer.analyze(&content);
    Ok(analysis.is_sensitive)
}

/// Get clipboard content statistics
#[tauri::command]
pub async fn clipboard_get_stats(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<ContentStats, String> {
    let analysis = manager.clipboard_analyzer.analyze(&content);
    Ok(analysis.stats)
}

/// Detect content category
#[tauri::command]
pub async fn clipboard_detect_category(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<(ContentCategory, Vec<ContentCategory>, f32), String> {
    let analysis = manager.clipboard_analyzer.analyze(&content);
    Ok((
        analysis.category,
        analysis.secondary_categories,
        analysis.confidence,
    ))
}

/// Detect programming language in code content
#[tauri::command]
pub async fn clipboard_detect_language(
    manager: State<'_, SelectionManager>,
    content: String,
) -> Result<Option<DetectedLanguage>, String> {
    let analysis = manager.clipboard_analyzer.analyze(&content);
    Ok(analysis.language)
}
