//! Tauri IPC commands for MCP functionality

use tauri::State;

use crate::mcp::error::McpErrorInfo;
use crate::mcp::manager::McpManager;
use crate::mcp::types::*;

/// Get all MCP servers and their states
#[tauri::command]
pub async fn mcp_get_servers(
    manager: State<'_, McpManager>,
) -> Result<Vec<McpServerState>, McpErrorInfo> {
    Ok(manager.get_all_servers().await)
}

/// Get a specific MCP server state
#[tauri::command]
pub async fn mcp_get_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<Option<McpServerState>, McpErrorInfo> {
    Ok(manager.get_server(&id).await)
}

/// Add a new MCP server
#[tauri::command]
pub async fn mcp_add_server(
    manager: State<'_, McpManager>,
    id: String,
    config: McpServerConfig,
) -> Result<(), McpErrorInfo> {
    manager
        .add_server(id, config)
        .await
        .map_err(|e| (&e).into())
}

/// Remove an MCP server
#[tauri::command]
pub async fn mcp_remove_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<(), McpErrorInfo> {
    manager.remove_server(&id).await.map_err(|e| (&e).into())
}

/// Update an MCP server configuration
#[tauri::command]
pub async fn mcp_update_server(
    manager: State<'_, McpManager>,
    id: String,
    config: McpServerConfig,
) -> Result<(), McpErrorInfo> {
    manager
        .update_server(&id, config)
        .await
        .map_err(|e| (&e).into())
}

/// Connect to an MCP server
#[tauri::command]
pub async fn mcp_connect_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<(), McpErrorInfo> {
    manager.connect_server(&id).await.map_err(|e| (&e).into())
}

/// Disconnect from an MCP server
#[tauri::command]
pub async fn mcp_disconnect_server(
    manager: State<'_, McpManager>,
    id: String,
) -> Result<(), McpErrorInfo> {
    manager
        .disconnect_server(&id)
        .await
        .map_err(|e| (&e).into())
}

/// Call a tool on an MCP server
#[tauri::command]
pub async fn mcp_call_tool(
    manager: State<'_, McpManager>,
    server_id: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResult, McpErrorInfo> {
    manager
        .call_tool(&server_id, &tool_name, arguments)
        .await
        .map_err(|e| (&e).into())
}

/// Get all tools from all connected servers
#[tauri::command]
pub async fn mcp_get_all_tools(
    manager: State<'_, McpManager>,
) -> Result<Vec<(String, McpTool)>, McpErrorInfo> {
    Ok(manager.get_all_tools().await)
}

/// Read a resource from an MCP server
#[tauri::command]
pub async fn mcp_read_resource(
    manager: State<'_, McpManager>,
    server_id: String,
    uri: String,
) -> Result<ResourceContent, McpErrorInfo> {
    manager
        .read_resource(&server_id, &uri)
        .await
        .map_err(|e| (&e).into())
}

/// Get a prompt from an MCP server
#[tauri::command]
pub async fn mcp_get_prompt(
    manager: State<'_, McpManager>,
    server_id: String,
    name: String,
    arguments: Option<serde_json::Value>,
) -> Result<PromptContent, McpErrorInfo> {
    manager
        .get_prompt(&server_id, &name, arguments)
        .await
        .map_err(|e| (&e).into())
}

/// Reload MCP configuration from disk
#[tauri::command]
pub async fn mcp_reload_config(manager: State<'_, McpManager>) -> Result<(), McpErrorInfo> {
    manager.reload_config().await.map_err(|e| (&e).into())
}

/// Install an npm package (for MCP server installation)
#[tauri::command]
pub async fn mcp_install_npm_package(package_name: String) -> Result<String, McpErrorInfo> {
    use tokio::process::Command;

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/c", "npm", "install", "-g", &package_name])
        .output()
        .await
        .map_err(|e| McpErrorInfo {
            error_type: "io_error".to_string(),
            message: e.to_string(),
            code: None,
            data: None,
        })?;

    #[cfg(not(windows))]
    let output = Command::new("npm")
        .args(["install", "-g", &package_name])
        .output()
        .await
        .map_err(|e| McpErrorInfo {
            error_type: "io_error".to_string(),
            message: e.to_string(),
            code: None,
            data: None,
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(McpErrorInfo {
            error_type: "install_failed".to_string(),
            message: String::from_utf8_lossy(&output.stderr).to_string(),
            code: None,
            data: None,
        })
    }
}

/// Install a pip package (for MCP server installation)
#[tauri::command]
pub async fn mcp_install_pip_package(package_name: String) -> Result<String, McpErrorInfo> {
    use tokio::process::Command;

    #[cfg(windows)]
    let output = Command::new("cmd")
        .args(["/c", "pip", "install", &package_name])
        .output()
        .await
        .map_err(|e| McpErrorInfo {
            error_type: "io_error".to_string(),
            message: e.to_string(),
            code: None,
            data: None,
        })?;

    #[cfg(not(windows))]
    let output = Command::new("pip")
        .args(["install", &package_name])
        .output()
        .await
        .map_err(|e| McpErrorInfo {
            error_type: "io_error".to_string(),
            message: e.to_string(),
            code: None,
            data: None,
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(McpErrorInfo {
            error_type: "install_failed".to_string(),
            message: String::from_utf8_lossy(&output.stderr).to_string(),
            code: None,
            data: None,
        })
    }
}

/// Check if a command exists on the system
#[tauri::command]
pub async fn mcp_check_command_exists(command: String) -> Result<bool, McpErrorInfo> {
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

    result.map_err(|e| McpErrorInfo {
        error_type: "io_error".to_string(),
        message: e.to_string(),
        code: None,
        data: None,
    })
}

/// Test MCP server connection
#[tauri::command]
pub async fn mcp_test_connection(
    manager: State<'_, McpManager>,
    server_id: String,
) -> Result<bool, McpErrorInfo> {
    let servers = manager.get_all_servers().await;
    let server = servers.iter().find(|s| s.id == server_id);
    Ok(server
        .map(|s| matches!(s.status, McpServerStatus::Connected))
        .unwrap_or(false))
}

/// Ping an MCP server to check connectivity and measure latency
#[tauri::command]
pub async fn mcp_ping_server(
    manager: State<'_, McpManager>,
    server_id: String,
) -> Result<u64, McpErrorInfo> {
    log::debug!("Command: mcp_ping_server, server='{}'", server_id);
    manager
        .ping_server(&server_id)
        .await
        .map_err(|e| (&e).into())
}

/// Set MCP server log level
#[tauri::command]
pub async fn mcp_set_log_level(
    manager: State<'_, McpManager>,
    server_id: String,
    level: LogLevel,
) -> Result<(), McpErrorInfo> {
    manager
        .set_log_level(&server_id, level)
        .await
        .map_err(|e| (&e).into())
}

/// Subscribe to resource updates
#[tauri::command]
pub async fn mcp_subscribe_resource(
    manager: State<'_, McpManager>,
    server_id: String,
    uri: String,
) -> Result<(), McpErrorInfo> {
    manager
        .subscribe_resource(&server_id, &uri)
        .await
        .map_err(|e| (&e).into())
}

/// Unsubscribe from resource updates  
#[tauri::command]
pub async fn mcp_unsubscribe_resource(
    manager: State<'_, McpManager>,
    server_id: String,
    uri: String,
) -> Result<(), McpErrorInfo> {
    manager
        .unsubscribe_resource(&server_id, &uri)
        .await
        .map_err(|e| (&e).into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_mcp_server_status_variants() {
        let disconnected = McpServerStatus::Disconnected;
        let connecting = McpServerStatus::Connecting;
        let connected = McpServerStatus::Connected;
        let error = McpServerStatus::Error("Connection failed".to_string());

        assert!(matches!(disconnected, McpServerStatus::Disconnected));
        assert!(matches!(connecting, McpServerStatus::Connecting));
        assert!(matches!(connected, McpServerStatus::Connected));
        assert!(matches!(error, McpServerStatus::Error(_)));
    }

    #[test]
    fn test_mcp_tool_struct() {
        let tool = McpTool {
            name: "read_file".to_string(),
            description: Some("Read a file from disk".to_string()),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string"}
                }
            }),
        };

        assert_eq!(tool.name, "read_file");
        assert!(tool.description.is_some());
    }

    #[test]
    fn test_content_item_text() {
        let content = ContentItem::Text {
            text: "Hello World".to_string(),
        };

        if let ContentItem::Text { text } = content {
            assert_eq!(text, "Hello World");
        } else {
            panic!("Expected Text variant");
        }
    }

    #[test]
    fn test_tool_call_result_struct() {
        let result = ToolCallResult {
            content: vec![ContentItem::Text {
                text: "Success".to_string(),
            }],
            is_error: false,
        };

        assert!(!result.is_error);
        assert_eq!(result.content.len(), 1);
    }

    #[test]
    fn test_tool_call_result_error() {
        let result = ToolCallResult {
            content: vec![ContentItem::Text {
                text: "Error".to_string(),
            }],
            is_error: true,
        };

        assert!(result.is_error);
    }
}
