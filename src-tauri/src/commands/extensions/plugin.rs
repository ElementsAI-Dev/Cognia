//! Plugin Commands
//!
//! Tauri commands for plugin management.

use once_cell::sync::Lazy;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::Mutex;
use tauri::{Manager, State};
use tokio::sync::RwLock;

use crate::plugin::{
    api_gateway, PluginApiBatchInvokeRequest, PluginApiBatchInvokeResponse, PluginApiInvokeRequest,
    PluginApiInvokeResponse, PluginCapabilityDescriptor, PluginInstallOptions, PluginManager,
    PluginPermissionMutationRequest, PluginRuntimeSnapshotEntry, PluginScanResult, PluginState,
    PythonPluginInfo, PythonRuntimeInfo, PythonToolRegistration, TableSchema,
};

/// Plugin manager state
pub struct PluginManagerState(pub Arc<RwLock<PluginManager>>);

static PLUGIN_PROCESS_MAP: Lazy<Mutex<HashMap<String, u32>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Initialize Python runtime
#[tauri::command]
pub async fn plugin_python_initialize(
    state: State<'_, PluginManagerState>,
    python_path: Option<String>,
) -> Result<(), String> {
    let mut manager = state.0.write().await;
    manager
        .initialize_python(python_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_get_directory(state: State<'_, PluginManagerState>) -> Result<String, String> {
    let manager = state.0.read().await;
    Ok(manager.plugin_dir().to_string_lossy().to_string())
}

/// Scan plugin directory
#[tauri::command]
pub async fn plugin_scan_directory(
    state: State<'_, PluginManagerState>,
    _directory: String,
) -> Result<Vec<PluginScanResult>, String> {
    let manager = state.0.read().await;
    manager.scan_plugins().await.map_err(|e| e.to_string())
}

/// Install a plugin
#[tauri::command]
pub async fn plugin_install(
    state: State<'_, PluginManagerState>,
    source: String,
    install_type: String,
    plugin_dir: String,
) -> Result<PluginScanResult, String> {
    let manager = state.0.read().await;
    let options = PluginInstallOptions {
        source,
        install_type,
        plugin_dir,
    };
    manager
        .install_plugin(options)
        .await
        .map_err(|e| e.to_string())
}

/// Uninstall a plugin
#[tauri::command]
pub async fn plugin_uninstall(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    plugin_path: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .uninstall_plugin(&plugin_id, &plugin_path)
        .await
        .map_err(|e| e.to_string())
}

/// Load a Python plugin
#[tauri::command]
pub async fn plugin_python_load(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    plugin_path: String,
    main_module: String,
    dependencies: Option<Vec<String>>,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .load_python_plugin(&plugin_id, &plugin_path, &main_module, dependencies)
        .await
        .map_err(|e| e.to_string())
}

/// Get tools from a Python plugin
#[tauri::command]
pub async fn plugin_python_get_tools(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<Vec<PythonToolRegistration>, String> {
    let manager = state.0.read().await;
    manager
        .get_python_tools(&plugin_id)
        .await
        .map_err(|e| e.to_string())
}

/// Call a Python plugin tool
#[tauri::command]
pub async fn plugin_python_call_tool(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    tool_name: String,
    args: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let manager = state.0.read().await;
    manager
        .call_python_tool(&plugin_id, &tool_name, args)
        .await
        .map_err(|e| e.to_string())
}

/// Call a Python function
#[tauri::command]
pub async fn plugin_python_call(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    function_name: String,
    args: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let manager = state.0.read().await;
    manager
        .call_python_function(&plugin_id, &function_name, args)
        .await
        .map_err(|e| e.to_string())
}

/// Evaluate Python code
#[tauri::command]
pub async fn plugin_python_eval(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    code: String,
    locals: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let manager = state.0.read().await;
    manager
        .eval_python(&plugin_id, &code, locals)
        .await
        .map_err(|e| e.to_string())
}

/// Import a Python module
#[tauri::command]
pub async fn plugin_python_import(
    _state: State<'_, PluginManagerState>,
    _plugin_id: String,
    _module_name: String,
) -> Result<(), String> {
    // Module import is handled implicitly when calling functions
    Ok(())
}

/// Call a function on an imported module
#[tauri::command]
pub async fn plugin_python_module_call(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    _module_name: String,
    function_name: String,
    args: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let manager = state.0.read().await;
    manager
        .call_python_function(&plugin_id, &function_name, args)
        .await
        .map_err(|e| e.to_string())
}

/// Get attribute from an imported module
#[tauri::command]
pub async fn plugin_python_module_getattr(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    _module_name: String,
    attr_name: String,
) -> Result<serde_json::Value, String> {
    let manager = state.0.read().await;
    // Use eval to get the attribute
    let code = format!("plugin.{}", attr_name);
    manager
        .eval_python(&plugin_id, &code, serde_json::json!({}))
        .await
        .map_err(|e| e.to_string())
}

/// Get plugin state
#[tauri::command]
pub async fn plugin_get_state(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<Option<PluginState>, String> {
    let manager = state.0.read().await;
    Ok(manager.get_plugin(&plugin_id).await)
}

/// Get all plugins
#[tauri::command]
pub async fn plugin_get_all(
    state: State<'_, PluginManagerState>,
) -> Result<Vec<PluginState>, String> {
    let manager = state.0.read().await;
    Ok(manager.get_all_plugins().await)
}

/// Get aggregated plugin runtime snapshot (state + permissions)
#[tauri::command]
pub async fn plugin_runtime_snapshot(
    state: State<'_, PluginManagerState>,
) -> Result<Vec<PluginRuntimeSnapshotEntry>, String> {
    let manager = state.0.read().await;
    Ok(manager.get_runtime_snapshot().await)
}

/// Get Python runtime info
#[tauri::command]
pub async fn plugin_python_runtime_info(
    state: State<'_, PluginManagerState>,
) -> Result<PythonRuntimeInfo, String> {
    let manager = state.0.read().await;
    manager
        .get_python_runtime_info()
        .await
        .map_err(|e| e.to_string())
}

/// Check if a Python plugin is initialized
#[tauri::command]
pub async fn plugin_python_is_initialized(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<bool, String> {
    let manager = state.0.read().await;
    manager
        .is_python_plugin_initialized(&plugin_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get Python plugin info
#[tauri::command]
pub async fn plugin_python_get_info(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<Option<PythonPluginInfo>, String> {
    let manager = state.0.read().await;
    manager
        .get_python_plugin_info(&plugin_id)
        .await
        .map_err(|e| e.to_string())
}

/// Unload a Python plugin
#[tauri::command]
pub async fn plugin_python_unload(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .unload_python_plugin(&plugin_id)
        .await
        .map_err(|e| e.to_string())
}

/// List loaded Python plugins
#[tauri::command]
pub async fn plugin_python_list(
    state: State<'_, PluginManagerState>,
) -> Result<Vec<String>, String> {
    let manager = state.0.read().await;
    manager
        .list_python_plugins()
        .await
        .map_err(|e| e.to_string())
}

/// Show notification (for plugins)
#[tauri::command]
pub async fn plugin_show_notification(
    _title: String,
    _body: String,
    _icon: Option<String>,
) -> Result<(), String> {
    // TODO: Integrate with system notifications
    Ok(())
}

#[tauri::command]
pub async fn plugin_api_invoke(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    request: PluginApiInvokeRequest,
) -> Result<PluginApiInvokeResponse, String> {
    let manager = state.0.read().await;
    Ok(api_gateway::invoke_api(&app_handle, &manager, request).await)
}

#[tauri::command]
pub async fn plugin_api_batch_invoke(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    request: PluginApiBatchInvokeRequest,
) -> Result<PluginApiBatchInvokeResponse, String> {
    let manager = state.0.read().await;
    Ok(api_gateway::batch_invoke_api(&app_handle, &manager, request).await)
}

#[tauri::command]
pub async fn plugin_get_capabilities() -> Result<Vec<PluginCapabilityDescriptor>, String> {
    Ok(api_gateway::capabilities())
}

#[tauri::command]
pub async fn plugin_permission_grant(
    state: State<'_, PluginManagerState>,
    request: PluginPermissionMutationRequest,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .grant_permission(
            &request.plugin_id,
            &api_gateway::canonicalize_permission(&request.permission),
        )
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_permission_revoke(
    state: State<'_, PluginManagerState>,
    request: PluginPermissionMutationRequest,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .revoke_permission(
            &request.plugin_id,
            &api_gateway::canonicalize_permission(&request.permission),
        )
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_permission_list(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<Vec<String>, String> {
    let manager = state.0.read().await;
    Ok(manager.list_permissions(&plugin_id).await)
}

async fn invoke_legacy_api(
    app_handle: &tauri::AppHandle,
    state: &State<'_, PluginManagerState>,
    plugin_id: String,
    api: &str,
    payload: Value,
) -> Result<Value, String> {
    let request = PluginApiInvokeRequest {
        sdk_version: "1.0.0".to_string(),
        plugin_id,
        request_id: uuid::Uuid::new_v4().to_string(),
        api: api.to_string(),
        payload,
        timeout_ms: None,
        context: None,
    };

    let manager = state.0.read().await;
    let response = api_gateway::invoke_api(app_handle, &manager, request).await;
    if response.success {
        return Ok(response.data.unwrap_or(Value::Null));
    }

    let error = response
        .error
        .map(|error| format!("{:?}: {}", error.code, error.message))
        .unwrap_or_else(|| "Unknown plugin API error".to_string());
    Err(error)
}

#[tauri::command]
pub async fn plugin_network_fetch(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    url: String,
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "network:fetch",
        json!({ "url": url, "options": options.unwrap_or_else(|| json!({})) }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_network_download(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    url: String,
    dest_path: String,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "network:download",
        json!({ "url": url, "destPath": dest_path }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_network_upload(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    url: String,
    file_path: String,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "network:upload",
        json!({ "url": url, "filePath": file_path }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_fs_read_text(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<String, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:readText",
        json!({ "path": path }),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_fs_read_binary(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<Vec<u8>, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:readBinary",
        json!({ "path": path }),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_fs_write_text(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
    content: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:writeText",
        json!({ "path": path, "content": content }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_fs_write_binary(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
    content: Vec<u8>,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:writeBinary",
        json!({ "path": path, "content": content }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_fs_exists(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<bool, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:exists",
        json!({ "path": path }),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_fs_mkdir(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
    recursive: bool,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:mkdir",
        json!({ "path": path, "recursive": recursive }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_fs_remove(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
    recursive: bool,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:remove",
        json!({ "path": path, "recursive": recursive }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_fs_copy(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    src: String,
    dest: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:copy",
        json!({ "src": src, "dest": dest }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_fs_move(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    src: String,
    dest: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:move",
        json!({ "src": src, "dest": dest }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_fs_read_dir(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:readDir",
        json!({ "path": path }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_fs_stat(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "fs:stat",
        json!({ "path": path }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_clipboard_read_text(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<String, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "clipboard:readText",
        json!({}),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_clipboard_write_text(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    text: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "clipboard:writeText",
        json!({ "text": text }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_clipboard_read_image(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<Option<Vec<u8>>, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "clipboard:readImage",
        json!({}),
    )
    .await?;
    if data.is_null() {
        return Ok(None);
    }
    let bytes: Vec<u8> = serde_json::from_value(data).map_err(|error| error.to_string())?;
    Ok(Some(bytes))
}

#[tauri::command]
pub async fn plugin_clipboard_write_image(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    data: Vec<u8>,
    format: Option<String>,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "clipboard:writeImage",
        json!({ "data": data, "format": format }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_clipboard_has_text(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<bool, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "clipboard:hasText",
        json!({}),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_clipboard_has_image(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<bool, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "clipboard:hasImage",
        json!({}),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_clipboard_clear(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    invoke_legacy_api(&app_handle, &state, plugin_id, "clipboard:clear", json!({}))
        .await
        .map(|_| ())
}

#[tauri::command]
pub async fn plugin_shell_execute(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    command: String,
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "shell:execute",
        json!({ "command": command, "options": options.unwrap_or_else(|| json!({})) }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_shell_spawn(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    process_id: String,
    command: String,
    args: Option<Vec<String>>,
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let result = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "shell:spawn",
        json!({ "command": command, "args": args.unwrap_or_default(), "options": options.unwrap_or_else(|| json!({})) }),
    )
    .await?;
    if let Some(pid) = result.get("pid").and_then(Value::as_u64) {
        if let Ok(mut process_map) = PLUGIN_PROCESS_MAP.lock() {
            process_map.insert(process_id, pid as u32);
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn plugin_process_kill(process_id: String, signal: Option<String>) -> Result<(), String> {
    let pid = {
        let mut map = PLUGIN_PROCESS_MAP
            .lock()
            .map_err(|error| error.to_string())?;
        map.remove(&process_id)
    };

    let Some(pid) = pid else {
        return Err(format!("Process not found for id: {process_id}"));
    };

    #[cfg(target_os = "windows")]
    {
        let mut command = std::process::Command::new("taskkill");
        command.args(["/PID", &pid.to_string()]);
        if signal.as_deref() != Some("SIGTERM") {
            command.arg("/F");
        }
        let status = command.status().map_err(|error| error.to_string())?;
        if !status.success() {
            return Err(format!("Failed to kill process {pid}"));
        }
    }

    #[cfg(unix)]
    {
        let sig = match signal.as_deref() {
            Some("SIGTERM") => nix::sys::signal::Signal::SIGTERM,
            Some("SIGINT") => nix::sys::signal::Signal::SIGINT,
            _ => nix::sys::signal::Signal::SIGKILL,
        };
        nix::sys::signal::kill(nix::unistd::Pid::from_raw(pid as i32), sig)
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn plugin_shell_open(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "shell:open",
        json!({ "path": path }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_shell_show_in_folder(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    path: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "shell:showInFolder",
        json!({ "path": path }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_db_query(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:query",
        json!({ "sql": sql, "params": params.unwrap_or_default() }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_db_execute(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<serde_json::Value, String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:execute",
        json!({ "sql": sql, "params": params.unwrap_or_default() }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_db_begin_transaction(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    tx_id: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:beginTransaction",
        json!({ "txId": tx_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_db_tx_query(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    tx_id: String,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<serde_json::Value, String> {
    let plugin_id = tx_id.split(':').next().unwrap_or("__tx__").to_string();
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:txQuery",
        json!({ "txId": tx_id, "sql": sql, "params": params.unwrap_or_default() }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_db_tx_execute(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    tx_id: String,
    sql: String,
    params: Option<Vec<Value>>,
) -> Result<serde_json::Value, String> {
    let plugin_id = tx_id.split(':').next().unwrap_or("__tx__").to_string();
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:txExecute",
        json!({ "txId": tx_id, "sql": sql, "params": params.unwrap_or_default() }),
    )
    .await
}

#[tauri::command]
pub async fn plugin_db_commit(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    tx_id: String,
) -> Result<(), String> {
    let plugin_id = tx_id.split(':').next().unwrap_or("__tx__").to_string();
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:commit",
        json!({ "txId": tx_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_db_rollback(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    tx_id: String,
) -> Result<(), String> {
    let plugin_id = tx_id.split(':').next().unwrap_or("__tx__").to_string();
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:rollback",
        json!({ "txId": tx_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_db_create_table(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    name: String,
    schema: TableSchema,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:createTable",
        json!({ "name": name, "schema": schema }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_db_drop_table(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    name: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:dropTable",
        json!({ "name": name }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_db_table_exists(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    name: String,
) -> Result<bool, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "db:tableExists",
        json!({ "name": name }),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_window_create(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    options: serde_json::Value,
) -> Result<String, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "window:create",
        json!({ "options": options }),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_window_close(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:close",
        json!({ "windowId": window_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_set_title(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
    title: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:setTitle",
        json!({ "windowId": window_id, "title": title }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_set_size(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:setSize",
        json!({ "windowId": window_id, "width": width, "height": height }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_set_position(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
    x: i32,
    y: i32,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:setPosition",
        json!({ "windowId": window_id, "x": x, "y": y }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_center(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:center",
        json!({ "windowId": window_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_show(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:show",
        json!({ "windowId": window_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_hide(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:hide",
        json!({ "windowId": window_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_focus(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    window_id: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        "__window__".to_string(),
        "window:focus",
        json!({ "windowId": window_id }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_window_minimize(
    app_handle: tauri::AppHandle,
    window_id: String,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Window not found: {window_id}"))?;
    window.minimize().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_window_maximize(
    app_handle: tauri::AppHandle,
    window_id: String,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Window not found: {window_id}"))?;
    window.maximize().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_window_unmaximize(
    app_handle: tauri::AppHandle,
    window_id: String,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Window not found: {window_id}"))?;
    window.unmaximize().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_window_set_always_on_top(
    app_handle: tauri::AppHandle,
    window_id: String,
    flag: bool,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&window_id)
        .ok_or_else(|| format!("Window not found: {window_id}"))?;
    window
        .set_always_on_top(flag)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_fs_watch(
    plugin_id: String,
    path: String,
    watch_id: String,
) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: fs watch is not available in gateway v2 yet (pluginId={plugin_id}, path={path}, watchId={watch_id})"
    ))
}

#[tauri::command]
pub async fn plugin_fs_unwatch(watch_id: String) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: fs unwatch is not available in gateway v2 yet (watchId={watch_id})"
    ))
}

#[tauri::command]
pub async fn plugin_shortcut_register(
    plugin_id: String,
    shortcut: String,
    options: Option<serde_json::Value>,
) -> Result<(), String> {
    let _ = options;
    Err(format!(
        "NOT_SUPPORTED: shortcut registration is not available in gateway v2 yet (pluginId={plugin_id}, shortcut={shortcut})"
    ))
}

#[tauri::command]
pub async fn plugin_shortcut_unregister(plugin_id: String, shortcut: String) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: shortcut unregister is not available in gateway v2 yet (pluginId={plugin_id}, shortcut={shortcut})"
    ))
}

#[tauri::command]
pub async fn plugin_context_menu_register(
    plugin_id: String,
    item: serde_json::Value,
) -> Result<(), String> {
    let _ = item;
    Err(format!(
        "NOT_SUPPORTED: context menu registration is not available in gateway v2 yet (pluginId={plugin_id})"
    ))
}

#[tauri::command]
pub async fn plugin_context_menu_unregister(
    plugin_id: String,
    item_id: String,
) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: context menu unregister is not available in gateway v2 yet (pluginId={plugin_id}, itemId={item_id})"
    ))
}

#[tauri::command]
pub async fn plugin_secrets_store(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    key: String,
    value: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "secrets:store",
        json!({ "key": key, "value": value }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_secrets_get(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    key: String,
) -> Result<Option<String>, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "secrets:get",
        json!({ "key": key }),
    )
    .await?;
    if data.is_null() {
        return Ok(None);
    }
    let value: String = serde_json::from_value(data).map_err(|error| error.to_string())?;
    Ok(Some(value))
}

#[tauri::command]
pub async fn plugin_secrets_delete(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    key: String,
) -> Result<(), String> {
    invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "secrets:delete",
        json!({ "key": key }),
    )
    .await
    .map(|_| ())
}

#[tauri::command]
pub async fn plugin_secrets_has(
    app_handle: tauri::AppHandle,
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    key: String,
) -> Result<bool, String> {
    let data = invoke_legacy_api(
        &app_handle,
        &state,
        plugin_id,
        "secrets:has",
        json!({ "key": key }),
    )
    .await?;
    serde_json::from_value(data).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_load(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .set_plugin_status(&plugin_id, crate::plugin::PluginStatus::Loaded)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_unload(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .set_plugin_status(&plugin_id, crate::plugin::PluginStatus::Installed)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_enable(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .set_plugin_status(&plugin_id, crate::plugin::PluginStatus::Enabled)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_disable(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .set_plugin_status(&plugin_id, crate::plugin::PluginStatus::Disabled)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_reload(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager
        .set_plugin_status(&plugin_id, crate::plugin::PluginStatus::Loaded)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_set_state(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    status: String,
) -> Result<(), String> {
    let status = match status.as_str() {
        "installed" => crate::plugin::PluginStatus::Installed,
        "loaded" => crate::plugin::PluginStatus::Loaded,
        "enabled" => crate::plugin::PluginStatus::Enabled,
        "disabled" => crate::plugin::PluginStatus::Disabled,
        "error" => crate::plugin::PluginStatus::Error,
        _ => {
            return Err(format!("INVALID_REQUEST: unsupported status '{status}'"));
        }
    };
    let manager = state.0.read().await;
    manager
        .set_plugin_status(&plugin_id, status)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_invalidate_cache(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    let runtime_dirs = manager
        .ensure_plugin_runtime_dirs(&plugin_id)
        .await
        .map_err(|error| error.to_string())?;
    let cache_dir = PathBuf::from(runtime_dirs.cache);
    if cache_dir.exists() {
        std::fs::remove_dir_all(&cache_dir).map_err(|error| error.to_string())?;
    }
    std::fs::create_dir_all(cache_dir).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_watch_start(paths: Vec<String>) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: plugin watch start is not available in gateway v2 yet (paths={})",
        paths.join(",")
    ))
}

#[tauri::command]
pub async fn plugin_watch_stop() -> Result<(), String> {
    Err("NOT_SUPPORTED: plugin watch stop is not available in gateway v2 yet".to_string())
}

#[tauri::command]
pub async fn plugin_dev_server_stop() -> Result<(), String> {
    Err("NOT_SUPPORTED: plugin dev server controls are not available in gateway v2 yet".to_string())
}

#[tauri::command]
pub async fn plugin_backup_create(
    plugin_id: String,
    source_path: String,
    backup_path: String,
) -> Result<(), String> {
    let _ = plugin_id;
    std::fs::create_dir_all(
        PathBuf::from(&backup_path)
            .parent()
            .unwrap_or_else(|| Path::new(".")),
    )
    .map_err(|error| error.to_string())?;
    std::fs::copy(source_path, backup_path)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_backup_restore(source_path: String, target_path: String) -> Result<(), String> {
    std::fs::copy(source_path, target_path)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_backup_delete(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if target.is_dir() {
        std::fs::remove_dir_all(target).map_err(|error| error.to_string())
    } else {
        std::fs::remove_file(target).map_err(|error| error.to_string())
    }
}

#[tauri::command]
pub async fn plugin_backup_save_index(
    path: String,
    content: serde_json::Value,
) -> Result<(), String> {
    let target = PathBuf::from(path);
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    std::fs::write(
        target,
        serde_json::to_string_pretty(&content).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn plugin_install_update(
    plugin_id: String,
    version: Option<String>,
) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: plugin update install is not available in gateway v2 yet (pluginId={plugin_id}, version={})",
        version.unwrap_or_else(|| "latest".to_string())
    ))
}

#[tauri::command]
pub async fn plugin_install_version(plugin_id: String, version: String) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: plugin install version is not available in gateway v2 yet (pluginId={plugin_id}, version={version})"
    ))
}

#[tauri::command]
pub async fn plugin_set_data(plugin_id: String, data: serde_json::Value) -> Result<(), String> {
    Err(format!(
        "NOT_SUPPORTED: plugin_set_data is not available in gateway v2 yet (pluginId={plugin_id}, keys={})",
        data.as_object().map(|v| v.len()).unwrap_or(0)
    ))
}

/// Create plugin manager state
pub fn create_plugin_manager(app_data_dir: PathBuf) -> PluginManagerState {
    let plugin_dir = app_data_dir.join("plugins");
    let manager = PluginManager::new(plugin_dir);
    PluginManagerState(Arc::new(RwLock::new(manager)))
}
