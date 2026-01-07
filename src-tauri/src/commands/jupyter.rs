//! Jupyter Kernel Tauri Commands
//!
//! Provides commands for managing Jupyter kernels in virtual environments.

use crate::jupyter::{
    kernel::{JupyterKernel, KernelConfig},
    session::{JupyterSession, SessionManager},
    KernelExecutionResult, KernelInfo, VariableInfo,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;

/// Jupyter state managed by Tauri
pub struct JupyterState {
    manager: Arc<RwLock<SessionManager>>,
}

impl JupyterState {
    pub fn new() -> Self {
        Self {
            manager: Arc::new(RwLock::new(SessionManager::default())),
        }
    }

    #[allow(dead_code)]
    pub fn with_config(config: KernelConfig) -> Self {
        Self {
            manager: Arc::new(RwLock::new(SessionManager::new(config))),
        }
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
    pub execution_count: u32,
    pub message: Option<String>,
}

/// Emit kernel status event to frontend
fn emit_kernel_status(app: &AppHandle, kernel_id: &str, status: &str, message: Option<&str>) {
    let event = KernelProgressEvent {
        kernel_id: kernel_id.to_string(),
        status: status.to_string(),
        execution_count: 0,
        message: message.map(String::from),
    };
    let _ = app.emit("jupyter-kernel-status", event);
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
    emit_kernel_status(&app, "", "starting", Some("Creating kernel session..."));

    let mut manager = state.manager.write().await;
    let session = manager.create_session(&name, &env_path).await?;

    emit_kernel_status(
        &app,
        session.kernel_id.as_deref().unwrap_or(""),
        "idle",
        Some("Kernel ready"),
    );

    Ok(session)
}

/// List all active sessions
#[tauri::command]
pub async fn jupyter_list_sessions(
    state: State<'_, JupyterState>,
) -> Result<Vec<JupyterSession>, String> {
    let manager = state.manager.read().await;
    Ok(manager.list_sessions())
}

/// Get a session by ID
#[tauri::command]
pub async fn jupyter_get_session(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Option<JupyterSession>, String> {
    let manager = state.manager.read().await;
    Ok(manager.get_session(&session_id).cloned())
}

/// Delete a session and stop its kernel
#[tauri::command]
pub async fn jupyter_delete_session(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<(), String> {
    let mut manager = state.manager.write().await;

    if let Some(session) = manager.get_session(&session_id) {
        if let Some(ref kernel_id) = session.kernel_id {
            emit_kernel_status(&app, kernel_id, "stopping", Some("Stopping kernel..."));
        }
    }

    manager.delete_session(&session_id).await?;

    Ok(())
}

// ==================== Kernel Commands ====================

/// List all active kernels
#[tauri::command]
pub async fn jupyter_list_kernels(
    state: State<'_, JupyterState>,
) -> Result<Vec<KernelInfo>, String> {
    let manager = state.manager.read().await;
    Ok(manager.list_kernels())
}

/// Restart a kernel in a session
#[tauri::command]
pub async fn jupyter_restart_kernel(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<(), String> {
    emit_kernel_status(&app, "", "restarting", Some("Restarting kernel..."));

    let mut manager = state.manager.write().await;
    manager.restart_kernel(&session_id).await?;

    emit_kernel_status(&app, "", "idle", Some("Kernel restarted"));

    Ok(())
}

/// Interrupt a kernel execution
#[tauri::command]
pub async fn jupyter_interrupt_kernel(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<(), String> {
    emit_kernel_status(&app, "", "interrupting", Some("Interrupting execution..."));

    let mut manager = state.manager.write().await;
    manager.interrupt_kernel(&session_id).await?;

    emit_kernel_status(&app, "", "idle", Some("Execution interrupted"));

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
    emit_kernel_status(&app, "", "busy", Some("Executing code..."));

    let mut manager = state.manager.write().await;
    let result = manager.execute(&session_id, &code).await?;

    emit_kernel_status(&app, "", "idle", Some("Execution complete"));

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
    emit_kernel_status(&app, "", "busy", Some("Executing code..."));

    let config = KernelConfig::default();
    let mut kernel =
        JupyterKernel::new(format!("quick-{}", uuid::Uuid::new_v4()), env_path, config);

    kernel.start().await?;
    let result = kernel.execute(&code).await?;
    kernel.stop().await?;

    emit_kernel_status(&app, "", "idle", Some("Execution complete"));

    Ok(result)
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
    emit_kernel_status(
        &app,
        "",
        "busy",
        Some(&format!("Executing cell {}...", cell_index)),
    );

    let mut manager = state.manager.write().await;
    let result = manager.execute(&session_id, &code).await?;

    // Emit cell-specific output event
    let _ = app.emit(
        "jupyter-cell-output",
        serde_json::json!({
            "cellIndex": cell_index,
            "result": result
        }),
    );

    emit_kernel_status(&app, "", "idle", Some("Cell execution complete"));

    Ok(result)
}

/// Execute all cells in a notebook
#[tauri::command]
pub async fn jupyter_execute_notebook(
    app: AppHandle,
    state: State<'_, JupyterState>,
    session_id: String,
    cells: Vec<String>,
) -> Result<Vec<KernelExecutionResult>, String> {
    let mut results = Vec::new();

    for (index, code) in cells.iter().enumerate() {
        emit_kernel_status(
            &app,
            "",
            "busy",
            Some(&format!("Executing cell {}/{}...", index + 1, cells.len())),
        );

        let mut manager = state.manager.write().await;
        let result = manager.execute(&session_id, code).await?;

        // Emit cell output event
        let _ = app.emit(
            "jupyter-cell-output",
            serde_json::json!({
                "cellIndex": index,
                "result": result,
                "total": cells.len()
            }),
        );

        results.push(result);

        // Stop on error if needed
        if results.last().map(|r| !r.success).unwrap_or(false) {
            break;
        }
    }

    emit_kernel_status(&app, "", "idle", Some("Notebook execution complete"));

    Ok(results)
}

// ==================== Variable Inspection Commands ====================

/// Get variables from a session's kernel namespace
#[tauri::command]
pub async fn jupyter_get_variables(
    state: State<'_, JupyterState>,
    session_id: String,
) -> Result<Vec<VariableInfo>, String> {
    let mut manager = state.manager.write().await;
    manager.get_variables(&session_id).await
}

/// Inspect a specific variable
#[tauri::command]
pub async fn jupyter_inspect_variable(
    state: State<'_, JupyterState>,
    session_id: String,
    variable_name: String,
) -> Result<KernelExecutionResult, String> {
    let code = format!(
        r#"
import json
try:
    val = {}
    result = {{
        "name": "{}",
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
"#,
        variable_name, variable_name
    );

    let mut manager = state.manager.write().await;
    manager.execute(&session_id, &code).await
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
            emit_kernel_status(&app, "", "idle", Some("Kernel ready"));
            return Ok(true);
        }
    }

    // Try to install ipykernel
    emit_kernel_status(&app, "", "installing", Some("Installing ipykernel..."));

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
            emit_kernel_status(&app, "", "idle", Some("ipykernel installed via uv"));
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
            emit_kernel_status(&app, "", "idle", Some("ipykernel installed via pip"));
            Ok(true)
        }
        Ok(out) => {
            let error = String::from_utf8_lossy(&out.stderr).to_string();
            emit_kernel_status(&app, "", "error", Some(&error));
            Err(error)
        }
        Err(e) => {
            emit_kernel_status(&app, "", "error", Some(&e.to_string()));
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
    emit_kernel_status(&app, "", "stopping", Some("Shutting down all kernels..."));

    let mut manager = state.manager.write().await;
    manager.shutdown_all().await;

    emit_kernel_status(&app, "", "idle", Some("All kernels stopped"));

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jupyter_state_creation() {
        let state = JupyterState::new();
        // State should be created without error - verify manager Arc is valid
        assert!(Arc::strong_count(&state.manager) == 1);
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
        assert!(json.contains("test-kernel"));
    }
}
