//! Tauri IPC commands for MCP functionality

use tauri::State;

use crate::mcp::manager::McpManager;
use crate::mcp::types::*;

/// Get all MCP servers and their states
#[tauri::command]
pub async fn mcp_get_servers(manager: State<'_, McpManager>) -> Result<Vec<McpServerState>, String> {
    Ok(manager.get_all_servers().await)
}

/// Get a specific MCP server state
#[tauri::command]
pub async fn mcp_get_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<Option<McpServerState>, String> {
    Ok(manager.get_server(&id).await)
}

/// Add a new MCP server
#[tauri::command]
pub async fn mcp_add_server(
    manager: State<'_, McpManager>,
    id: String,
    config: McpServerConfig,
) -> Result<(), String> {
    manager
        .add_server(id, config)
        .await
        .map_err(|e| e.to_string())
}

/// Remove an MCP server
#[tauri::command]
pub async fn mcp_remove_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<(), String> {
    manager.remove_server(&id).await.map_err(|e| e.to_string())
}

/// Update an MCP server configuration
#[tauri::command]
pub async fn mcp_update_server(
    manager: State<'_, McpManager>,
    id: String,
    config: McpServerConfig,
) -> Result<(), String> {
    manager
        .update_server(&id, config)
        .await
        .map_err(|e| e.to_string())
}

/// Connect to an MCP server
#[tauri::command]
pub async fn mcp_connect_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<(), String> {
    manager
        .connect_server(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Disconnect from an MCP server
#[tauri::command]
pub async fn mcp_disconnect_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<(), String> {
    manager
        .disconnect_server(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Call a tool on an MCP server
#[tauri::command]
pub async fn mcp_call_tool(
    manager: State<'_, McpManager>,
    server_id: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResult, String> {
    manager
        .call_tool(&server_id, &tool_name, arguments)
        .await
        .map_err(|e| e.to_string())
}

/// Get all tools from all connected servers
#[tauri::command]
pub async fn mcp_get_all_tools(
    manager: State<'_, McpManager>,
) -> Result<Vec<(String, McpTool)>, String> {
    Ok(manager.get_all_tools().await)
}

/// Read a resource from an MCP server
#[tauri::command]
pub async fn mcp_read_resource(
    manager: State<'_, McpManager>,
    server_id: String,
    uri: String,
) -> Result<ResourceContent, String> {
    manager
        .read_resource(&server_id, &uri)
        .await
        .map_err(|e| e.to_string())
}

/// Get a prompt from an MCP server
#[tauri::command]
pub async fn mcp_get_prompt(
    manager: State<'_, McpManager>,
    server_id: String,
    name: String,
    arguments: Option<serde_json::Value>,
) -> Result<PromptContent, String> {
    manager
        .get_prompt(&server_id, &name, arguments)
        .await
        .map_err(|e| e.to_string())
}

/// Reload MCP configuration from disk
#[tauri::command]
pub async fn mcp_reload_config(manager: State<'_, McpManager>) -> Result<(), String> {
    manager.reload_config().await.map_err(|e| e.to_string())
}

/// Install an npm package (for MCP server installation)
#[tauri::command]
pub async fn mcp_install_npm_package(package_name: String) -> Result<String, String> {
    use tokio::process::Command;

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/c", "npm", "install", "-g", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    #[cfg(not(windows))]
    let output = Command::new("npm")
        .args(["install", "-g", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Install a pip package (for MCP server installation)
#[tauri::command]
pub async fn mcp_install_pip_package(package_name: String) -> Result<String, String> {
    use tokio::process::Command;

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/c", "pip", "install", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    #[cfg(not(windows))]
    let output = Command::new("pip")
        .args(["install", &package_name])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

/// Check if a command exists on the system
#[tauri::command]
pub async fn mcp_check_command_exists(command: String) -> Result<bool, String> {
    use tokio::process::Command;

    #[cfg(windows)]
    let result = Command::new("where")
        .arg(&command)
        .output()
        .await
        .map(|o| o.status.success());

    #[cfg(not(windows))]
    let result = Command::new("which")
        .arg(&command)
        .output()
        .await
        .map(|o| o.status.success());

    result.map_err(|e| e.to_string())
}
