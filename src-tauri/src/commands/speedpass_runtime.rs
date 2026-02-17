//! SpeedPass runtime Tauri commands.

use tauri::State;

use crate::speedpass_runtime::{
    ExtractTextbookRequest, ExtractTextbookResult, SpeedPassImportLegacySnapshotRequest,
    SpeedPassRuntimeSnapshot, SpeedPassRuntimeState, SpeedPassSaveSnapshotRequest,
    TeacherKeyPointMatchCommandRequest, TeacherKeyPointMatchResult,
};

#[tauri::command]
pub async fn speedpass_runtime_load_snapshot(
    user_id: Option<String>,
    runtime_state: State<'_, SpeedPassRuntimeState>,
) -> Result<Option<SpeedPassRuntimeSnapshot>, String> {
    runtime_state.load_snapshot(user_id)
}

#[tauri::command]
pub async fn speedpass_runtime_save_snapshot(
    request: SpeedPassSaveSnapshotRequest,
    runtime_state: State<'_, SpeedPassRuntimeState>,
) -> Result<SpeedPassRuntimeSnapshot, String> {
    runtime_state.save_snapshot(request)
}

#[tauri::command]
pub async fn speedpass_runtime_import_legacy_snapshot(
    request: SpeedPassImportLegacySnapshotRequest,
    runtime_state: State<'_, SpeedPassRuntimeState>,
) -> Result<SpeedPassRuntimeSnapshot, String> {
    runtime_state.import_legacy_snapshot(request)
}

#[tauri::command]
pub async fn speedpass_runtime_extract_textbook_content(
    request: ExtractTextbookRequest,
    runtime_state: State<'_, SpeedPassRuntimeState>,
) -> Result<ExtractTextbookResult, String> {
    runtime_state.extract_textbook_content(request).await
}

#[tauri::command]
pub async fn speedpass_runtime_match_teacher_keypoints(
    request: TeacherKeyPointMatchCommandRequest,
    runtime_state: State<'_, SpeedPassRuntimeState>,
) -> Result<TeacherKeyPointMatchResult, String> {
    runtime_state.match_teacher_keypoints(request.user_id, request.request)
}
