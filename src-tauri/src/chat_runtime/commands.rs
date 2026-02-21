use serde_json::Value as JsonValue;
use tauri::State;

use crate::chat_runtime::models::{ChatBackupPayload, ChatImportResult, ChatMessagesPage};
use crate::chat_runtime::storage::ChatRuntimeState;

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_upsert_session(
    session: JsonValue,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.upsert_session(session)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_list_sessions(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<Vec<JsonValue>, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.list_sessions()
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_delete_session(
    sessionId: String,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.delete_session(&sessionId)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_clear_sessions(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.clear_sessions()?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_clear_domain_data(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.clear_domain_data()?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_upsert_messages_batch(
    messages: Vec<JsonValue>,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<usize, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.upsert_messages_batch(messages)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_list_messages(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<Vec<JsonValue>, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.list_messages()
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_get_messages_page(
    sessionId: Option<String>,
    branchId: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<ChatMessagesPage, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.get_messages_page(
        sessionId,
        branchId,
        limit.unwrap_or(100),
        offset.unwrap_or(0),
    )
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_delete_messages_by_session(
    sessionId: String,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.delete_messages_by_session(&sessionId)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_upsert_project(
    project: JsonValue,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.upsert_project(project)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_list_projects(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<Vec<JsonValue>, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.list_projects()
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_delete_project(
    projectId: String,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.delete_project(&projectId)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_upsert_knowledge_files_batch(
    knowledgeFiles: Vec<JsonValue>,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<usize, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.upsert_knowledge_files_batch(knowledgeFiles)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_list_knowledge_files(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<Vec<JsonValue>, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.list_knowledge_files()
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_upsert_summary(
    summary: JsonValue,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.upsert_summary(summary)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_list_summaries(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<Vec<JsonValue>, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.list_summaries()
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_delete_summary(
    summaryId: String,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.delete_summary(&summaryId)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_delete_summaries_by_session(
    sessionId: String,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<bool, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.delete_summaries_by_session(&sessionId)?;
    Ok(true)
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_export_backup(
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<ChatBackupPayload, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.export_backup()
}

#[allow(non_snake_case)]
#[tauri::command]
pub async fn chat_db_import_backup(
    payload: ChatBackupPayload,
    schemaVersion: Option<i64>,
    traceId: Option<String>,
    __trace_id: Option<String>,
    runtime_state: State<'_, ChatRuntimeState>,
) -> Result<ChatImportResult, String> {
    let _ = (schemaVersion, traceId, __trace_id);
    runtime_state.import_backup(payload)
}
