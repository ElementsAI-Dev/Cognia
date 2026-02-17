//! Workflow runtime Tauri commands.

use tauri::{AppHandle, State};

use crate::sandbox::SandboxState;
use crate::screen_recording::ScreenRecordingManager;
use crate::workflow_runtime::{
    cancel_execution, get_execution, list_executions, pause_execution, resume_execution,
    run_definition, WorkflowRunRequest, WorkflowRunResult, WorkflowRuntimeState,
};

#[tauri::command]
pub async fn workflow_run_definition(
    request: WorkflowRunRequest,
    runtime_state: State<'_, WorkflowRuntimeState>,
    sandbox_state: State<'_, SandboxState>,
    screen_recording_manager: State<'_, ScreenRecordingManager>,
    app_handle: AppHandle,
) -> Result<WorkflowRunResult, String> {
    run_definition(
        &runtime_state,
        &sandbox_state,
        request,
        Some(&screen_recording_manager),
        Some(&app_handle),
    )
    .await
}

#[tauri::command]
pub async fn workflow_cancel_execution(
    execution_id: String,
    runtime_state: State<'_, WorkflowRuntimeState>,
) -> Result<bool, String> {
    Ok(cancel_execution(&runtime_state, &execution_id).await)
}

#[tauri::command]
pub async fn workflow_pause_execution(
    execution_id: String,
    runtime_state: State<'_, WorkflowRuntimeState>,
) -> Result<bool, String> {
    Ok(pause_execution(&runtime_state, &execution_id).await)
}

#[tauri::command]
pub async fn workflow_resume_execution(
    execution_id: String,
    runtime_state: State<'_, WorkflowRuntimeState>,
) -> Result<bool, String> {
    Ok(resume_execution(&runtime_state, &execution_id).await)
}

#[tauri::command]
pub async fn workflow_get_execution(
    execution_id: String,
    runtime_state: State<'_, WorkflowRuntimeState>,
) -> Result<Option<crate::workflow_runtime::WorkflowExecutionRecord>, String> {
    Ok(get_execution(&runtime_state, &execution_id).await)
}

#[tauri::command]
pub async fn workflow_list_executions(
    workflow_id: Option<String>,
    limit: Option<usize>,
    runtime_state: State<'_, WorkflowRuntimeState>,
) -> Result<Vec<crate::workflow_runtime::WorkflowExecutionRecord>, String> {
    Ok(list_executions(&runtime_state, workflow_id.as_deref(), limit).await)
}
