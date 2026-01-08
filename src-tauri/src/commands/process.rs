//! Process Management Tauri commands
//!
//! Exposes process management functionality to the frontend.

use tauri::State;

use crate::process::{
    ProcessFilter, ProcessInfo, ProcessManager, ProcessManagerConfig,
    ProcessSortField, StartProcessRequest, StartProcessResult, TerminateProcessRequest,
    TerminateProcessResult,
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
    log::info!("Updating process manager config: enabled={}", config.enabled);
    state
        .update_config(config)
        .await
        .map_err(|e| e.to_string())
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
    state
        .update_config(config)
        .await
        .map_err(|e| e.to_string())
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
