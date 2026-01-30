//! Jupyter Kernel Tauri Commands
//!
//! Provides commands for managing Jupyter kernels in virtual environments.

use crate::jupyter::{
    kernel::{JupyterKernel, KernelConfig},
    session::{JupyterSession, SharedSessionManager},
    ExecutionError, KernelExecutionResult, KernelInfo, VariableInfo,
};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::time::{timeout, Duration};

/// Jupyter state managed by Tauri
/// Uses SharedSessionManager for thread-safe access and automatic cleanup
#[derive(Clone)]
pub struct JupyterState {
    manager: SharedSessionManager,
    config: KernelConfig,
}

impl JupyterState {
    pub fn new() -> Self {
        let config = KernelConfig::default();
        Self {
            manager: SharedSessionManager::new(config.clone()),
            config,
        }
    }

    /// Create with custom configuration
    pub fn with_config(config: KernelConfig) -> Self {
        Self {
            manager: SharedSessionManager::new(config.clone()),
            config,
        }
    }

    /// Perform periodic cleanup of dead and idle kernels
    pub async fn perform_cleanup(&self) {
        self.manager.cleanup_dead_kernels().await;
        // Clean up kernels idle for more than the configured timeout
        self.manager
            .cleanup_idle_kernels(self.config.idle_timeout_secs)
            .await;
    }

    /// Get the current configuration
    pub fn get_config(&self) -> &KernelConfig {
        &self.config
    }
}

impl Default for JupyterState {
    fn default() -> Self {
        Self::new()
    }
}

/// Kernel execution progress event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelProgressEvent {
    #[serde(rename = "kernelId")]
    pub kernel_id: String,
    pub status: String,
    #[serde(rename = "executionCount")]
    pub execution_count: u32,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotebookExecutionOptions {
    #[serde(rename = "stopOnError")]
    pub stop_on_error: Option<bool>,
    pub timeout: Option<u64>,
    #[serde(rename = "clearOutputs")]
    pub clear_outputs: Option<bool>,
}

/// Emit kernel status event to frontend
fn emit_kernel_status(
    app: &AppHandle,
    kernel_id: &str,
    status: &str,
    execution_count: u32,
    message: Option<&str>,
) {
    let event = KernelProgressEvent {
        kernel_id: kernel_id.to_string(),
        status: status.to_string(),
        execution_count,
        message: message.map(String::from),
    };
    let _ = app.emit("jupyter-kernel-status", event);
}

async fn get_kernel_id_for_session(
    state: &State<'_, JupyterState>,
    session_id: &str,
) -> Option<String> {
    state
        .manager
        .list_sessions()
        .await
        .into_iter()
        .find(|s| s.id == session_id)
        .and_then(|s| s.kernel_id)
}

async fn require_kernel_id_for_session(
    state: &State<'_, JupyterState>,
    session_id: &str,
) -> Result<String, String> {
    get_kernel_id_for_session(state, session_id)
        .await
        .ok_or_else(|| "Session not found or has no kernel".to_string())
}

// ==================== Session Commands ====================

/// Create a new Jupyter session with a kernel
#[tauri::command]
pub async fn jupyter_create_session(
    app: AppHandle,
    state: State<'_, JupyterState>,
    name: String,
    env_path: String,
) -> Result<JupyterSession, String> {
    emit_kernel_status(&app, "", "starting", 0, Some("Creating kernel session..."));

    let session = state.manager.create_session(&name, &env_path).await?;

    emit_kernel_status(
        &app,
        session.kernel_id.as_deref().unwrap_or(""),
        "idle",
        0,
        Some("Kernel ready"),
    );

    Ok(session)
}

/// List all active sessions
#[tauri::command]
pub async fn jupyter_list_sessions(
    state: State<'_, JupyterState>,
) -> Result<Vec<JupyterSession>, String> {
    Ok(state.manager.list_sessions().await)
}

/// Get a session by ID
#[tauri::command]
pub async fn jupyter_get_session(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Option<JupyterSession>, String> {
    let sessions = state.manager.list_sessions().await;
    Ok(sessions.into_iter().find(|s| s.id == session_id))
}

/// Delete a session and stop its kernel
#[tauri::command]
pub async fn jupyter_delete_session(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<(), String> {
    let sessions = state.manager.list_sessions().await;
    if let Some(session) = sessions.iter().find(|s| s.id == session_id) {
        if let Some(ref kernel_id) = session.kernel_id {
            emit_kernel_status(&app, kernel_id, "stopping", 0, Some("Stopping kernel..."));
        }
    }

    state.manager.delete_session(&session_id).await?;

    Ok(())
}

// ==================== Kernel Commands ====================

/// List all active kernels
#[tauri::command]
pub async fn jupyter_list_kernels(
    state: State<'_, JupyterState>,
) -> Result<Vec<KernelInfo>, String> {
    Ok(state.manager.list_kernels().await)
}

/// Restart a kernel in a session
#[tauri::command]
pub async fn jupyter_restart_kernel(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<(), String> {
    let kernel_id = require_kernel_id_for_session(&state, &session_id).await?;
    emit_kernel_status(
        &app,
        &kernel_id,
        "restarting",
        0,
        Some("Restarting kernel..."),
    );

    state.manager.restart_kernel(&session_id).await?;

    emit_kernel_status(&app, &kernel_id, "idle", 0, Some("Kernel restarted"));

    Ok(())
}

/// Interrupt a kernel execution
#[tauri::command]
pub async fn jupyter_interrupt_kernel(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<(), String> {
    let kernel_id = require_kernel_id_for_session(&state, &session_id).await?;
    emit_kernel_status(
        &app,
        &kernel_id,
        "interrupting",
        0,
        Some("Interrupting execution..."),
    );

    state.manager.interrupt_kernel(&session_id).await?;

    emit_kernel_status(&app, &kernel_id, "idle", 0, Some("Execution interrupted"));

    Ok(())
}

// ==================== Execution Commands ====================

/// Execute code in a session's kernel
#[tauri::command]
pub async fn jupyter_execute(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
    code: String,
) -> Result<KernelExecutionResult, String> {
    let kernel_id = require_kernel_id_for_session(&state, &session_id).await?;
    emit_kernel_status(&app, &kernel_id, "busy", 0, Some("Executing code..."));

    let result = state.manager.execute(&session_id, &code).await?;

    emit_kernel_status(
        &app,
        &kernel_id,
        "idle",
        result.execution_count,
        Some("Execution complete"),
    );

    // Emit output event for streaming display
    let _ = app.emit("jupyter-output", &result);

    Ok(result)
}

/// Execute code directly in an environment (without session)
#[tauri::command]
pub async fn jupyter_quick_execute(
    app: AppHandle,
    env_path: String,
    code: String,
) -> Result<KernelExecutionResult, String> {
    let config = KernelConfig::default();
    let kernel_id = format!("quick-{}", uuid::Uuid::new_v4());
    let mut kernel = JupyterKernel::new(kernel_id.clone(), env_path, config);

    emit_kernel_status(&app, &kernel_id, "starting", 0, Some("Starting kernel..."));

    kernel.start().await?;

    emit_kernel_status(&app, &kernel_id, "busy", 0, Some("Executing code..."));

    let exec_result = kernel.execute(&code).await;
    let stop_result = kernel.stop().await;

    match exec_result {
        Ok(result) => {
            stop_result?;
            emit_kernel_status(
                &app,
                &kernel_id,
                "idle",
                result.execution_count,
                Some("Execution complete"),
            );
            Ok(result)
        }
        Err(exec_err) => {
            if let Err(stop_err) = stop_result {
                emit_kernel_status(
                    &app,
                    &kernel_id,
                    "error",
                    0,
                    Some("Kernel execution and shutdown failed"),
                );
                return Err(format!("{}; stop error: {}", exec_err, stop_err));
            }

            emit_kernel_status(&app, &kernel_id, "error", 0, Some(&exec_err));
            Err(exec_err)
        }
    }
}

/// Execute a Jupyter notebook cell by index
#[tauri::command]
pub async fn jupyter_execute_cell(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
    cell_index: u32,
    code: String,
) -> Result<KernelExecutionResult, String> {
    let kernel_id = require_kernel_id_for_session(&state, &session_id).await?;
    emit_kernel_status(
        &app,
        &kernel_id,
        "busy",
        0,
        Some(&format!("Executing cell {}...", cell_index)),
    );

    let result = state.manager.execute(&session_id, &code).await?;

    // Emit cell-specific output event
    let _ = app.emit(
        "jupyter-cell-output",
        serde_json::json!({
            "sessionId": &session_id,
            "kernelId": &kernel_id,
            "cellIndex": cell_index,
            "result": result
        }),
    );

    emit_kernel_status(
        &app,
        &kernel_id,
        "idle",
        result.execution_count,
        Some("Cell execution complete"),
    );

    Ok(result)
}

/// Execute all cells in a notebook
#[tauri::command]
pub async fn jupyter_execute_notebook(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
    cells: Vec<String>,
    options: Option<NotebookExecutionOptions>,
) -> Result<Vec<KernelExecutionResult>, String> {
    let mut results: Vec<KernelExecutionResult> = Vec::new();

    let stop_on_error = options.as_ref().and_then(|o| o.stop_on_error).unwrap_or(true);
    let timeout_ms = options.as_ref().and_then(|o| o.timeout).unwrap_or(60_000);
    let clear_outputs = options
        .as_ref()
        .and_then(|o| o.clear_outputs)
        .unwrap_or(false);

    let kernel_id = require_kernel_id_for_session(&state, &session_id).await?;

    if clear_outputs {
        for index in 0..cells.len() {
            let _ = app.emit(
                "jupyter-cell-output",
                serde_json::json!({
                    "sessionId": &session_id,
                    "kernelId": &kernel_id,
                    "cellIndex": index,
                    "result": KernelExecutionResult {
                        success: true,
                        execution_count: 0,
                        stdout: String::new(),
                        stderr: String::new(),
                        display_data: vec![],
                        error: None,
                        execution_time_ms: 0,
                    },
                    "total": cells.len()
                }),
            );
        }
    }

    for (index, code) in cells.iter().enumerate() {
        emit_kernel_status(
            &app,
            &kernel_id,
            "busy",
            0,
            Some(&format!("Executing cell {}/{}...", index + 1, cells.len())),
        );

        let result = match timeout(
            Duration::from_millis(timeout_ms),
            state.manager.execute(&session_id, code),
        )
        .await
        {
            Ok(exec) => exec?,
            Err(_) => KernelExecutionResult {
                success: false,
                execution_count: results.last().map(|r| r.execution_count).unwrap_or(0),
                stdout: String::new(),
                stderr: "Execution timed out".to_string(),
                display_data: vec![],
                error: Some(ExecutionError {
                    ename: "TimeoutError".to_string(),
                    evalue: "Execution timed out".to_string(),
                    traceback: vec![],
                }),
                execution_time_ms: timeout_ms,
            },
        };

        // Emit cell output event
        let _ = app.emit(
            "jupyter-cell-output",
            serde_json::json!({
                "sessionId": &session_id,
                "kernelId": &kernel_id,
                "cellIndex": index,
                "result": result,
                "total": cells.len()
            }),
        );

        results.push(result);

        // Stop on error if needed
        if stop_on_error && results.last().map(|r| !r.success).unwrap_or(false) {
            break;
        }
    }

    emit_kernel_status(
        &app,
        &kernel_id,
        "idle",
        results.last().map(|r| r.execution_count).unwrap_or(0),
        Some("Notebook execution complete"),
    );

    Ok(results)
}

// ==================== Variable Inspection Commands ====================

/// Get variables from a session's kernel namespace
#[tauri::command]
pub async fn jupyter_get_variables(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Vec<VariableInfo>, String> {
    state.manager.get_variables(&session_id).await
}

fn build_inspect_variable_code(variable_name: &str) -> Result<String, String> {
    let variable_name_json = serde_json::to_string(variable_name).map_err(|e| e.to_string())?;

    Ok(format!(
        r#"
import json
try:
    _name = {variable_name_json}
    if _name not in globals():
        raise KeyError(f"Variable not found: {{_name}}")

    val = globals()[_name]
    result = {{
        "name": _name,
        "type": type(val).__name__,
        "value": repr(val),
        "str": str(val)[:1000]
    }}
    if hasattr(val, '__len__'):
        result["length"] = len(val)
    if hasattr(val, 'shape'):
        result["shape"] = str(val.shape)
    if hasattr(val, 'dtype'):
        result["dtype"] = str(val.dtype)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{"error": str(e)}}))
"#
    ))
}

/// Inspect a specific variable
#[tauri::command]
pub async fn jupyter_inspect_variable(
    state: State<'_, JupyterState>,
    session_id: String,
    variable_name: String,
) -> Result<KernelExecutionResult, String> {
    let code = build_inspect_variable_code(&variable_name)?;
    state.manager.execute(&session_id, &code).await
}

// ==================== Utility Commands ====================

/// Check if a kernel can be started for an environment
#[tauri::command]
pub async fn jupyter_check_kernel_available(env_path: String) -> Result<bool, String> {
    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    Ok(std::path::Path::new(&python_path).exists())
}

/// Install ipykernel in an environment if not present
#[tauri::command]
pub async fn jupyter_ensure_kernel(app: AppHandle, env_path: String) -> Result<bool, String> {
    emit_kernel_status(
        &app,
        "",
        "configuring",
        0,
        Some("Checking kernel requirements..."),
    );

    let python_path = if cfg!(target_os = "windows") {
        format!("{}\\Scripts\\python.exe", env_path)
    } else {
        format!("{}/bin/python", env_path)
    };

    // Check if ipykernel is installed
    let check_output = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args([
                "/C",
                &format!("\"{}\" -c \"import ipykernel\"", python_path),
            ])
            .output()
    } else {
        std::process::Command::new(&python_path)
            .args(["-c", "import ipykernel"])
            .output()
    };

    if let Ok(out) = check_output {
        if out.status.success() {
            emit_kernel_status(&app, "", "idle", 0, Some("Kernel ready"));
            return Ok(true);
        }
    }

    // Try to install ipykernel
    emit_kernel_status(&app, "", "installing", 0, Some("Installing ipykernel..."));

    // Try uv first
    let uv_result = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args([
                "/C",
                &format!("uv pip install ipykernel --python \"{}\"", python_path),
            ])
            .output()
    } else {
        std::process::Command::new("sh")
            .args([
                "-c",
                &format!("uv pip install ipykernel --python '{}'", python_path),
            ])
            .output()
    };

    if let Ok(out) = uv_result {
        if out.status.success() {
            emit_kernel_status(&app, "", "idle", 0, Some("ipykernel installed via uv"));
            return Ok(true);
        }
    }

    // Fallback to pip
    let pip_result = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd")
            .args([
                "/C",
                &format!("\"{}\" -m pip install ipykernel", python_path),
            ])
            .output()
    } else {
        std::process::Command::new(&python_path)
            .args(["-m", "pip", "install", "ipykernel"])
            .output()
    };

    match pip_result {
        Ok(out) if out.status.success() => {
            emit_kernel_status(&app, "", "idle", 0, Some("ipykernel installed via pip"));
            Ok(true)
        }
        Ok(out) => {
            let error = String::from_utf8_lossy(&out.stderr).to_string();
            emit_kernel_status(&app, "", "error", 0, Some(&error));
            Err(error)
        }
        Err(e) => {
            emit_kernel_status(&app, "", "error", 0, Some(&e.to_string()));
            Err(e.to_string())
        }
    }
}

/// Shutdown all kernels
#[tauri::command]
pub async fn jupyter_shutdown_all(
    app: AppHandle,
    state: State<'_, JupyterState>,
) -> Result<(), String> {
    emit_kernel_status(&app, "", "stopping", 0, Some("Shutting down all kernels..."));

    state.manager.shutdown_all().await;

    emit_kernel_status(&app, "", "idle", 0, Some("All kernels stopped"));

    Ok(())
}

/// Perform cleanup of dead and idle kernels
#[tauri::command]
pub async fn jupyter_cleanup(state: State<'_, JupyterState>) -> Result<(), String> {
    state.perform_cleanup().await;
    Ok(())
}

/// Get cached variables from kernel
#[tauri::command]
pub async fn jupyter_get_cached_variables(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Vec<VariableInfo>, String> {
    state.manager.get_cached_variables(&session_id).await
}

/// Get kernel status for a session
#[tauri::command]
pub async fn jupyter_get_kernel_status(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Option<String>, String> {
    Ok(state
        .manager
        .get_session_kernel_status(&session_id)
        .await
        .map(|s| s.to_string()))
}

/// Check if session's kernel is alive
#[tauri::command]
pub async fn jupyter_is_kernel_alive(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<bool, String> {
    Ok(state.manager.is_session_kernel_alive(&session_id).await)
}

/// Get a specific session by ID
#[tauri::command]
pub async fn jupyter_get_session_by_id(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Option<JupyterSession>, String> {
    Ok(state.manager.get_session(&session_id).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jupyter_state_creation() {
        let state = JupyterState::new();
        // State should be created without error - the state existing proves success
        let _ = &state;
    }

    #[test]
    fn test_kernel_progress_event_serialization() {
        let event = KernelProgressEvent {
            kernel_id: "test-kernel".to_string(),
            status: "idle".to_string(),
            execution_count: 1,
            message: Some("Ready".to_string()),
        };

        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("kernelId"));
        assert!(json.contains("executionCount"));
        assert!(json.contains("test-kernel"));
    }

    #[test]
    fn test_build_inspect_variable_code_escapes_variable_name() {
        let code = build_inspect_variable_code("a\"b").unwrap();
        assert!(code.contains("_name = \"a\\\"b\""));
        assert!(code.contains("globals()[_name]"));
    }
}
