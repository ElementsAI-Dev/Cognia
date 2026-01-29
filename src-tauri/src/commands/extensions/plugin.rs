//! Plugin Commands
//!
//! Tauri commands for plugin management.

use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

use crate::plugin::{
    PluginManager, PluginScanResult, PluginInstallOptions, PluginState,
    PythonToolRegistration,
};

/// Plugin manager state
pub struct PluginManagerState(pub Arc<RwLock<PluginManager>>);

/// Initialize Python runtime
#[tauri::command]
pub async fn plugin_python_initialize(
    state: State<'_, PluginManagerState>,
    python_path: Option<String>,
) -> Result<(), String> {
    let mut manager = state.0.write().await;
    manager.initialize_python(python_path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn plugin_get_directory(
    state: State<'_, PluginManagerState>,
) -> Result<String, String> {
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
    manager.install_plugin(options).await.map_err(|e| e.to_string())
}

/// Uninstall a plugin
#[tauri::command]
pub async fn plugin_uninstall(
    state: State<'_, PluginManagerState>,
    plugin_id: String,
    plugin_path: String,
) -> Result<(), String> {
    let manager = state.0.read().await;
    manager.uninstall_plugin(&plugin_id, &plugin_path).await.map_err(|e| e.to_string())
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
    manager.load_python_plugin(&plugin_id, &plugin_path, &main_module, dependencies)
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
    manager.get_python_tools(&plugin_id).await.map_err(|e| e.to_string())
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
    manager.call_python_tool(&plugin_id, &tool_name, args)
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
    manager.call_python_function(&plugin_id, &function_name, args)
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
    manager.eval_python(&plugin_id, &code, locals)
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
    manager.call_python_function(&plugin_id, &function_name, args)
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
    manager.eval_python(&plugin_id, &code, serde_json::json!({}))
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

/// Create plugin manager state
pub fn create_plugin_manager(app_data_dir: PathBuf) -> PluginManagerState {
    let plugin_dir = app_data_dir.join("plugins");
    let manager = PluginManager::new(plugin_dir);
    PluginManagerState(Arc::new(RwLock::new(manager)))
}
