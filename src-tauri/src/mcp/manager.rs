//! MCP Server Manager
//!
//! Manages the lifecycle of MCP servers including connection, disconnection,
//! and state management.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

use tauri::{AppHandle, Emitter, Manager};

use crate::mcp::client::McpClient;
use crate::mcp::config::McpConfigManager;
use crate::mcp::error::{McpError, McpResult};
use crate::mcp::protocol::jsonrpc::JsonRpcNotification;
use crate::mcp::types::*;

/// Event names for frontend communication
pub mod events {
    pub const SERVER_UPDATE: &str = "mcp:server-update";
    pub const SERVERS_CHANGED: &str = "mcp:servers-changed";
    pub const NOTIFICATION: &str = "mcp:notification";
    pub const TOOL_CALL_PROGRESS: &str = "mcp:tool-call-progress";
}

/// Internal state for a connected server
struct ServerInstance {
    /// Server state (sent to frontend)
    state: McpServerState,
    /// Active client connection
    client: Option<McpClient>,
    /// Notification receiver channel
    _notification_rx: Option<mpsc::Receiver<JsonRpcNotification>>,
}

/// MCP Manager - manages all MCP server connections
pub struct McpManager {
    /// Configuration manager
    config_manager: Arc<McpConfigManager>,
    /// Connected server instances
    servers: RwLock<HashMap<String, ServerInstance>>,
    /// Tauri app handle for emitting events
    app_handle: AppHandle,
}

impl McpManager {
    /// Create a new MCP manager
    pub fn new(app_handle: AppHandle, app_data_dir: std::path::PathBuf) -> Self {
        let config_manager = Arc::new(McpConfigManager::new(app_data_dir));

        Self {
            config_manager,
            servers: RwLock::new(HashMap::new()),
            app_handle,
        }
    }

    /// Initialize the manager - load config and start auto-start servers
    pub async fn initialize(&self) -> McpResult<()> {
        // Load configuration
        self.config_manager.load().await?;

        // Initialize server states from config
        let configs = self.config_manager.get_all_servers();
        let mut servers = self.servers.write().await;

        for (id, config) in configs {
            let state = McpServerState::new(id.clone(), config);
            servers.insert(
                id,
                ServerInstance {
                    state,
                    client: None,
                    _notification_rx: None,
                },
            );
        }

        drop(servers);

        // Auto-connect servers marked for auto-start
        let auto_start = self.config_manager.get_auto_start_servers();
        for (id, _) in auto_start {
            log::info!("Auto-starting MCP server: {}", id);
            if let Err(e) = self.connect_server(&id).await {
                log::error!("Failed to auto-start server {}: {}", id, e);
            }
        }

        Ok(())
    }

    /// Reload configuration from disk
    pub async fn reload_config(&self) -> McpResult<()> {
        self.config_manager.load().await?;

        // Update server states
        let configs = self.config_manager.get_all_servers();
        let mut servers = self.servers.write().await;

        // Add new servers
        for (id, config) in &configs {
            if !servers.contains_key(id) {
                let state = McpServerState::new(id.clone(), config.clone());
                servers.insert(
                    id.clone(),
                    ServerInstance {
                        state,
                        client: None,
                        _notification_rx: None,
                    },
                );
            }
        }

        // Remove servers no longer in config
        servers.retain(|id, _| configs.contains_key(id));

        drop(servers);

        self.emit_servers_changed().await;
        Ok(())
    }

    /// Add a new server
    pub async fn add_server(&self, id: String, config: McpServerConfig) -> McpResult<()> {
        // Add to config
        self.config_manager.set_server(id.clone(), config.clone());
        self.config_manager.save().await?;

        // Add to runtime state
        let state = McpServerState::new(id.clone(), config);
        let mut servers = self.servers.write().await;
        servers.insert(
            id.clone(),
            ServerInstance {
                state,
                client: None,
                _notification_rx: None,
            },
        );

        drop(servers);

        self.emit_servers_changed().await;
        Ok(())
    }

    /// Remove a server
    pub async fn remove_server(&self, id: &str) -> McpResult<()> {
        // Disconnect first if connected
        self.disconnect_server(id).await.ok();

        // Remove from config
        self.config_manager.remove_server(id);
        self.config_manager.save().await?;

        // Remove from runtime state
        let mut servers = self.servers.write().await;
        servers.remove(id);

        drop(servers);

        self.emit_servers_changed().await;
        Ok(())
    }

    /// Update a server configuration
    pub async fn update_server(&self, id: &str, config: McpServerConfig) -> McpResult<()> {
        // Check if server exists
        if !self.config_manager.has_server(id) {
            return Err(McpError::ServerNotFound(id.to_string()));
        }

        // Disconnect if currently connected
        let was_connected = {
            let servers = self.servers.read().await;
            servers
                .get(id)
                .map(|s| matches!(s.state.status, McpServerStatus::Connected))
                .unwrap_or(false)
        };

        if was_connected {
            self.disconnect_server(id).await.ok();
        }

        // Update config
        self.config_manager.set_server(id.to_string(), config.clone());
        self.config_manager.save().await?;

        // Update runtime state
        let mut servers = self.servers.write().await;
        if let Some(instance) = servers.get_mut(id) {
            instance.state.config = config.clone();
            instance.state.name = config.name;
        }

        drop(servers);

        self.emit_server_update(id).await;
        Ok(())
    }

    /// Connect to a server
    pub async fn connect_server(&self, id: &str) -> McpResult<()> {
        // Get config
        let config = self
            .config_manager
            .get_server(id)
            .ok_or_else(|| McpError::ServerNotFound(id.to_string()))?;

        if !config.enabled {
            return Err(McpError::ProtocolError("Server is disabled".to_string()));
        }

        // Update status to connecting
        {
            let mut servers = self.servers.write().await;
            if let Some(instance) = servers.get_mut(id) {
                instance.state.status = McpServerStatus::Connecting;
            }
        }
        self.emit_server_update(id).await;

        // Create notification channel
        let (notification_tx, notification_rx) = mpsc::channel(100);

        // Create client based on connection type
        let client_result = match config.connection_type {
            McpConnectionType::Stdio => {
                McpClient::connect_stdio(&config.command, &config.args, &config.env, notification_tx)
                    .await
            }
            McpConnectionType::Sse => {
                let url = config
                    .url
                    .as_ref()
                    .ok_or(McpError::MissingUrl)?;
                McpClient::connect_sse(url, notification_tx).await
            }
        };

        let client = match client_result {
            Ok(c) => c,
            Err(e) => {
                // Update status to error
                let mut servers = self.servers.write().await;
                if let Some(instance) = servers.get_mut(id) {
                    instance.state.status = McpServerStatus::Error(e.to_string());
                    instance.state.error_message = Some(e.to_string());
                }
                drop(servers);
                self.emit_server_update(id).await;
                return Err(e);
            }
        };

        // Start receive loop
        client.start_receive_loop().await;

        // Initialize connection
        let init_result = match client.initialize(ClientInfo::default()).await {
            Ok(r) => r,
            Err(e) => {
                client.close().await.ok();
                let mut servers = self.servers.write().await;
                if let Some(instance) = servers.get_mut(id) {
                    instance.state.status = McpServerStatus::Error(e.to_string());
                    instance.state.error_message = Some(e.to_string());
                }
                drop(servers);
                self.emit_server_update(id).await;
                return Err(e);
            }
        };

        // Fetch tools, resources, prompts
        let tools = client.list_tools().await.unwrap_or_default();
        let resources = client.list_resources().await.unwrap_or_default();
        let prompts = client.list_prompts().await.unwrap_or_default();

        // Update state
        {
            let mut servers = self.servers.write().await;
            if let Some(instance) = servers.get_mut(id) {
                instance.state.status = McpServerStatus::Connected;
                instance.state.capabilities = Some(init_result.capabilities);
                instance.state.tools = tools;
                instance.state.resources = resources;
                instance.state.prompts = prompts;
                instance.state.error_message = None;
                instance.state.connected_at = Some(chrono::Utc::now().timestamp());
                instance.state.reconnect_attempts = 0;
                instance.client = Some(client);
                instance._notification_rx = Some(notification_rx);
            }
        }

        self.emit_server_update(id).await;

        // Start notification handler
        self.spawn_notification_handler(id.to_string()).await;

        log::info!("Connected to MCP server: {}", id);
        Ok(())
    }

    /// Disconnect from a server
    pub async fn disconnect_server(&self, id: &str) -> McpResult<()> {
        let mut servers = self.servers.write().await;
        let instance = servers
            .get_mut(id)
            .ok_or_else(|| McpError::ServerNotFound(id.to_string()))?;

        // Close client if connected
        if let Some(client) = instance.client.take() {
            client.close().await.ok();
        }

        // Update state
        instance.state.status = McpServerStatus::Disconnected;
        instance.state.connected_at = None;
        instance.state.tools.clear();
        instance.state.resources.clear();
        instance.state.prompts.clear();
        instance._notification_rx = None;

        drop(servers);

        self.emit_server_update(id).await;

        log::info!("Disconnected from MCP server: {}", id);
        Ok(())
    }

    /// Call a tool on a connected server
    pub async fn call_tool(
        &self,
        server_id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> McpResult<ToolCallResult> {
        let servers = self.servers.read().await;
        let instance = servers
            .get(server_id)
            .ok_or_else(|| McpError::ServerNotFound(server_id.to_string()))?;

        let client = instance.client.as_ref().ok_or(McpError::NotConnected)?;

        client.call_tool(tool_name, arguments).await
    }

    /// Read a resource from a connected server
    pub async fn read_resource(
        &self,
        server_id: &str,
        uri: &str,
    ) -> McpResult<ResourceContent> {
        let servers = self.servers.read().await;
        let instance = servers
            .get(server_id)
            .ok_or_else(|| McpError::ServerNotFound(server_id.to_string()))?;

        let client = instance.client.as_ref().ok_or(McpError::NotConnected)?;

        client.read_resource(uri).await
    }

    /// Get a prompt from a connected server
    pub async fn get_prompt(
        &self,
        server_id: &str,
        name: &str,
        arguments: Option<serde_json::Value>,
    ) -> McpResult<PromptContent> {
        let servers = self.servers.read().await;
        let instance = servers
            .get(server_id)
            .ok_or_else(|| McpError::ServerNotFound(server_id.to_string()))?;

        let client = instance.client.as_ref().ok_or(McpError::NotConnected)?;

        client.get_prompt(name, arguments).await
    }

    /// Get all server states
    pub async fn get_all_servers(&self) -> Vec<McpServerState> {
        let servers = self.servers.read().await;
        servers.values().map(|i| i.state.clone()).collect()
    }

    /// Get a specific server state
    pub async fn get_server(&self, id: &str) -> Option<McpServerState> {
        let servers = self.servers.read().await;
        servers.get(id).map(|i| i.state.clone())
    }

    /// Get all tools from all connected servers
    pub async fn get_all_tools(&self) -> Vec<(String, McpTool)> {
        let servers = self.servers.read().await;
        let mut all_tools = Vec::new();

        for (server_id, instance) in servers.iter() {
            if matches!(instance.state.status, McpServerStatus::Connected) {
                for tool in &instance.state.tools {
                    all_tools.push((server_id.clone(), tool.clone()));
                }
            }
        }

        all_tools
    }

    /// Spawn a notification handler for a server
    async fn spawn_notification_handler(&self, _server_id: String) {
        // TODO: Implement notification handling
        // This would forward notifications to the frontend via Tauri events
    }

    /// Emit a server update event
    async fn emit_server_update(&self, id: &str) {
        let servers = self.servers.read().await;
        if let Some(instance) = servers.get(id) {
            let _ = self
                .app_handle
                .emit(events::SERVER_UPDATE, &instance.state);
        }
    }

    /// Emit a servers changed event
    async fn emit_servers_changed(&self) {
        let servers = self.get_all_servers().await;
        let _ = self.app_handle.emit(events::SERVERS_CHANGED, &servers);
    }
}
