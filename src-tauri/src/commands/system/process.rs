//! Process Management Tauri commands
//!
//! Exposes process management functionality to the frontend.

use tauri::State;

use crate::process::{
    ProcessFilter, ProcessInfo, ProcessManager, ProcessManagerConfig, ProcessOperation,
    ProcessSortField, StartProcessBatchRequest, StartProcessBatchResult, StartProcessRequest,
    StartProcessResult, TerminateProcessBatchRequest, TerminateProcessBatchResult,
    TerminateProcessRequest, TerminateProcessResult,
};

/// List running processes
#[tauri::command]
pub async fn process_list(
    filter: Option<ProcessFilter>,
    state: State<'_, ProcessManager>,
) -> Result<Vec<ProcessInfo>, String> {
    state
        .list_processes(filter)
        .await
        .map_err(|e| e.to_string())
}

/// Get process by PID
#[tauri::command]
pub async fn process_get(
    pid: u32,
    state: State<'_, ProcessManager>,
) -> Result<Option<ProcessInfo>, String> {
    state.get_process(pid).await.map_err(|e| e.to_string())
}

/// Start a new process
#[tauri::command]
pub async fn process_start(
    request: StartProcessRequest,
    state: State<'_, ProcessManager>,
) -> Result<StartProcessResult, String> {
    log::info!("Starting process: {} {:?}", request.program, request.args);
    state
        .start_process(request)
        .await
        .map_err(|e| e.to_string())
}

/// Terminate a process
#[tauri::command]
pub async fn process_terminate(
    request: TerminateProcessRequest,
    state: State<'_, ProcessManager>,
) -> Result<TerminateProcessResult, String> {
    log::info!(
        "Terminating process: {} (force: {})",
        request.pid,
        request.force
    );
    state
        .terminate_process(request)
        .await
        .map_err(|e| e.to_string())
}

/// Start multiple processes in parallel
#[tauri::command]
pub async fn process_start_batch(
    request: StartProcessBatchRequest,
    state: State<'_, ProcessManager>,
) -> Result<StartProcessBatchResult, String> {
    log::info!(
        "Starting process batch: {} requests (maxConcurrency={:?})",
        request.requests.len(),
        request.max_concurrency
    );
    state
        .start_process_batch(request)
        .await
        .map_err(|e| e.to_string())
}

/// Terminate multiple processes in parallel
#[tauri::command]
pub async fn process_terminate_batch(
    request: TerminateProcessBatchRequest,
    state: State<'_, ProcessManager>,
) -> Result<TerminateProcessBatchResult, String> {
    log::info!(
        "Terminating process batch: {} requests (maxConcurrency={:?})",
        request.requests.len(),
        request.max_concurrency
    );
    state
        .terminate_process_batch(request)
        .await
        .map_err(|e| e.to_string())
}

/// Submit async start batch operation
#[tauri::command]
pub async fn process_start_batch_async(
    request: StartProcessBatchRequest,
    state: State<'_, ProcessManager>,
) -> Result<ProcessOperation, String> {
    state
        .start_process_batch_async(request)
        .await
        .map_err(|e| e.to_string())
}

/// Submit async terminate batch operation
#[tauri::command]
pub async fn process_terminate_batch_async(
    request: TerminateProcessBatchRequest,
    state: State<'_, ProcessManager>,
) -> Result<ProcessOperation, String> {
    state
        .terminate_process_batch_async(request)
        .await
        .map_err(|e| e.to_string())
}

/// Get async operation by ID
#[tauri::command]
pub async fn process_get_operation(
    operation_id: String,
    state: State<'_, ProcessManager>,
) -> Result<Option<ProcessOperation>, String> {
    Ok(state.get_operation(&operation_id).await)
}

/// List async operations (most recent first)
#[tauri::command]
pub async fn process_list_operations(
    limit: Option<usize>,
    state: State<'_, ProcessManager>,
) -> Result<Vec<ProcessOperation>, String> {
    Ok(state.list_operations(limit).await)
}

/// Get process manager configuration
#[tauri::command]
pub async fn process_get_config(
    state: State<'_, ProcessManager>,
) -> Result<ProcessManagerConfig, String> {
    Ok(state.get_config().await)
}

/// Update process manager configuration
#[tauri::command]
pub async fn process_update_config(
    config: ProcessManagerConfig,
    state: State<'_, ProcessManager>,
) -> Result<(), String> {
    log::info!(
        "Updating process manager config: enabled={}",
        config.enabled
    );
    state.update_config(config).await.map_err(|e| e.to_string())
}

/// Check if a program is allowed
#[tauri::command]
pub async fn process_is_allowed(
    program: String,
    state: State<'_, ProcessManager>,
) -> Result<bool, String> {
    Ok(state.is_program_allowed(&program).await)
}

/// Get tracked processes (those started by this app)
#[tauri::command]
pub async fn process_get_tracked(state: State<'_, ProcessManager>) -> Result<Vec<u32>, String> {
    Ok(state.get_tracked_processes().await)
}

/// Check if process management is enabled
#[tauri::command]
pub async fn process_is_enabled(state: State<'_, ProcessManager>) -> Result<bool, String> {
    Ok(state.get_config().await.enabled)
}

/// Enable or disable process management
#[tauri::command]
pub async fn process_set_enabled(
    enabled: bool,
    state: State<'_, ProcessManager>,
) -> Result<(), String> {
    let mut config = state.get_config().await;
    config.enabled = enabled;
    state.update_config(config).await.map_err(|e| e.to_string())
}

/// Search processes by name
#[tauri::command]
pub async fn process_search(
    name: String,
    limit: Option<usize>,
    state: State<'_, ProcessManager>,
) -> Result<Vec<ProcessInfo>, String> {
    let filter = ProcessFilter {
        name: Some(name),
        limit,
        ..Default::default()
    };
    state
        .list_processes(Some(filter))
        .await
        .map_err(|e| e.to_string())
}

/// Get processes sorted by memory usage
#[tauri::command]
pub async fn process_top_memory(
    limit: Option<usize>,
    state: State<'_, ProcessManager>,
) -> Result<Vec<ProcessInfo>, String> {
    let filter = ProcessFilter {
        limit,
        sort_by: Some(ProcessSortField::Memory),
        sort_desc: Some(true),
        ..Default::default()
    };
    state
        .list_processes(Some(filter))
        .await
        .map_err(|e| e.to_string())
}
