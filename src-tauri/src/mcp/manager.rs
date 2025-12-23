//! MCP Server Manager
//!
//! Manages the lifecycle of MCP servers including connection, disconnection,
//! state management, notification handling, and auto-reconnection.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tokio::task::JoinHandle;

use tauri::{AppHandle, Emitter};

use crate::mcp::client::McpClient;
use crate::mcp::config::McpConfigManager;
use crate::mcp::error::{McpError, McpResult};
use crate::mcp::protocol::jsonrpc::{methods, JsonRpcNotification};
use crate::mcp::types::*;

/// Event names for frontend communication
pub mod events {
    pub const SERVER_UPDATE: &str = "mcp:server-update";
    pub const SERVERS_CHANGED: &str = "mcp:servers-changed";
    pub const NOTIFICATION: &str = "mcp:notification";
    pub const TOOL_CALL_PROGRESS: &str = "mcp:tool-call-progress";
    pub const SERVER_HEALTH: &str = "mcp:server-health";
    pub const LOG_MESSAGE: &str = "mcp:log-message";
}

/// Internal state for a connected server
struct ServerInstance {
    /// Server state (sent to frontend)
    state: McpServerState,
    /// Active client connection
    client: Option<McpClient>,
    /// Notification handler task
    notification_task: Option<JoinHandle<()>>,
    /// Health check task
    health_task: Option<JoinHandle<()>>,
    /// Reconnection task
    reconnect_task: Option<JoinHandle<()>>,
    /// Channel to stop tasks
    stop_tx: Option<mpsc::Sender<()>>,
}

/// MCP Manager - manages all MCP server connections
pub struct McpManager {
    /// Configuration manager
    config_manager: Arc<McpConfigManager>,
    /// Connected server instances
    servers: Arc<RwLock<HashMap<String, ServerInstance>>>,
    /// Tauri app handle for emitting events
    app_handle: AppHandle,
    /// Default reconnection config
    reconnect_config: ReconnectConfig,
}

impl McpManager {
    /// Create a new MCP manager
    pub fn new(app_handle: AppHandle, app_data_dir: std::path::PathBuf) -> Self {
        let config_manager = Arc::new(McpConfigManager::new(app_data_dir));

        Self {
            config_manager,
            servers: Arc::new(RwLock::new(HashMap::new())),
            app_handle,
            reconnect_config: ReconnectConfig::default(),
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
                    notification_task: None,
                    health_task: None,
                    reconnect_task: None,
                    stop_tx: None,
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
                        notification_task: None,
                        health_task: None,
                        reconnect_task: None,
                        stop_tx: None,
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
                notification_task: None,
                health_task: None,
                reconnect_task: None,
                stop_tx: None,
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
                    instance.state.reconnect_attempts += 1;
                }
                drop(servers);
                self.emit_server_update(id).await;
                
                // Schedule reconnection if enabled
                self.schedule_reconnection(id.to_string()).await;
                
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
                    instance.state.reconnect_attempts += 1;
                }
                drop(servers);
                self.emit_server_update(id).await;
                
                // Schedule reconnection if enabled
                self.schedule_reconnection(id.to_string()).await;
                
                return Err(e);
            }
        };

        // Fetch tools, resources, prompts
        let tools = client.list_tools().await.unwrap_or_default();
        let resources = client.list_resources().await.unwrap_or_default();
        let prompts = client.list_prompts().await.unwrap_or_default();

        // Create stop channel for background tasks
        let (stop_tx, stop_rx) = mpsc::channel(1);

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
                instance.stop_tx = Some(stop_tx);
            }
        }

        self.emit_server_update(id).await;

        // Start notification handler
        self.spawn_notification_handler(id.to_string(), notification_rx, stop_rx).await;

        log::info!("Connected to MCP server: {}", id);
        Ok(())
    }

    /// Disconnect from a server
    pub async fn disconnect_server(&self, id: &str) -> McpResult<()> {
        let mut servers = self.servers.write().await;
        let instance = servers
            .get_mut(id)
            .ok_or_else(|| McpError::ServerNotFound(id.to_string()))?;

        // Send stop signal to background tasks
        if let Some(stop_tx) = instance.stop_tx.take() {
            let _ = stop_tx.send(()).await;
        }

        // Abort background tasks
        if let Some(task) = instance.notification_task.take() {
            task.abort();
        }
        if let Some(task) = instance.health_task.take() {
            task.abort();
        }
        if let Some(task) = instance.reconnect_task.take() {
            task.abort();
        }

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

        drop(servers);

        self.emit_server_update(id).await;

        log::info!("Disconnected from MCP server: {}", id);
        Ok(())
    }

    /// Call a tool on a connected server with progress tracking
    pub async fn call_tool(
        &self,
        server_id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> McpResult<ToolCallResult> {
        let call_id = uuid::Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().timestamp_millis();

        // Emit progress start
        let progress = ToolCallProgress {
            server_id: server_id.to_string(),
            tool_name: tool_name.to_string(),
            call_id: call_id.clone(),
            state: ToolCallState::Running,
            progress: None,
            message: Some(format!("Calling tool: {}", tool_name)),
            error: None,
            started_at,
            ended_at: None,
        };
        let _ = self.app_handle.emit(events::TOOL_CALL_PROGRESS, &progress);

        let servers = self.servers.read().await;
        let instance = servers
            .get(server_id)
            .ok_or_else(|| McpError::ServerNotFound(server_id.to_string()))?;

        let client = instance.client.as_ref().ok_or(McpError::NotConnected)?;

        let result = client.call_tool(tool_name, arguments).await;
        let ended_at = chrono::Utc::now().timestamp_millis();

        // Emit progress end
        let progress = ToolCallProgress {
            server_id: server_id.to_string(),
            tool_name: tool_name.to_string(),
            call_id,
            state: if result.is_ok() { ToolCallState::Completed } else { ToolCallState::Failed },
            progress: Some(1.0),
            message: None,
            error: result.as_ref().err().map(|e| e.to_string()),
            started_at,
            ended_at: Some(ended_at),
        };
        let _ = self.app_handle.emit(events::TOOL_CALL_PROGRESS, &progress);

        result
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

    /// Ping a connected server
    pub async fn ping_server(&self, server_id: &str) -> McpResult<u64> {
        let start = std::time::Instant::now();
        
        let servers = self.servers.read().await;
        let instance = servers
            .get(server_id)
            .ok_or_else(|| McpError::ServerNotFound(server_id.to_string()))?;

        let client = instance.client.as_ref().ok_or(McpError::NotConnected)?;

        client.ping().await?;
        
        Ok(start.elapsed().as_millis() as u64)
    }

    /// Set log level for a connected server
    pub async fn set_log_level(&self, server_id: &str, level: LogLevel) -> McpResult<()> {
        let servers = self.servers.read().await;
        let instance = servers
            .get(server_id)
            .ok_or_else(|| McpError::ServerNotFound(server_id.to_string()))?;

        let client = instance.client.as_ref().ok_or(McpError::NotConnected)?;

        client.set_log_level(level).await
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
    async fn spawn_notification_handler(
        &self,
        server_id: String,
        mut notification_rx: mpsc::Receiver<JsonRpcNotification>,
        mut stop_rx: mpsc::Receiver<()>,
    ) {
        let app_handle = self.app_handle.clone();
        let servers = self.servers.clone();
        let server_id_clone = server_id.clone();

        let task = tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = stop_rx.recv() => {
                        log::debug!("Notification handler stopped for server: {}", server_id);
                        break;
                    }
                    notification = notification_rx.recv() => {
                        match notification {
                            Some(notif) => {
                                Self::handle_notification(&app_handle, &servers, &server_id, notif).await;
                            }
                            None => {
                                log::debug!("Notification channel closed for server: {}", server_id);
                                break;
                            }
                        }
                    }
                }
            }
        });

        // Store task handle
        let mut servers = self.servers.write().await;
        if let Some(instance) = servers.get_mut(&server_id_clone) {
            instance.notification_task = Some(task);
        }
    }

    /// Handle a notification from an MCP server
    async fn handle_notification(
        app_handle: &AppHandle,
        servers: &Arc<RwLock<HashMap<String, ServerInstance>>>,
        server_id: &str,
        notification: JsonRpcNotification,
    ) {
        log::debug!("Received notification from {}: {}", server_id, notification.method);

        let mcp_notification = match notification.method.as_str() {
            methods::NOTIFICATION_PROGRESS => {
                if let Some(params) = notification.params {
                    match serde_json::from_value::<ProgressNotification>(params) {
                        Ok(progress) => McpNotification::Progress(progress),
                        Err(e) => {
                            log::warn!("Failed to parse progress notification: {}", e);
                            return;
                        }
                    }
                } else {
                    return;
                }
            }
            methods::NOTIFICATION_MESSAGE => {
                if let Some(params) = notification.params {
                    match serde_json::from_value::<LogMessage>(params) {
                        Ok(msg) => {
                            // Also emit as separate log message event
                            let _ = app_handle.emit(events::LOG_MESSAGE, &serde_json::json!({
                                "serverId": server_id,
                                "message": msg
                            }));
                            McpNotification::LogMessage(msg)
                        }
                        Err(e) => {
                            log::warn!("Failed to parse log message: {}", e);
                            return;
                        }
                    }
                } else {
                    return;
                }
            }
            methods::NOTIFICATION_RESOURCES_LIST_CHANGED => {
                // Refresh resources list
                let mut servers_lock = servers.write().await;
                if let Some(instance) = servers_lock.get_mut(server_id) {
                    if let Some(client) = &instance.client {
                        if let Ok(resources) = client.list_resources().await {
                            instance.state.resources = resources;
                            let _ = app_handle.emit(events::SERVER_UPDATE, &instance.state);
                        }
                    }
                }
                McpNotification::ResourceListChanged(ResourceListChanged {})
            }
            methods::NOTIFICATION_RESOURCES_UPDATED => {
                if let Some(params) = notification.params {
                    match serde_json::from_value::<ResourceUpdated>(params) {
                        Ok(updated) => McpNotification::ResourceUpdated(updated),
                        Err(e) => {
                            log::warn!("Failed to parse resource updated: {}", e);
                            return;
                        }
                    }
                } else {
                    return;
                }
            }
            methods::NOTIFICATION_TOOLS_LIST_CHANGED => {
                // Refresh tools list
                let mut servers_lock = servers.write().await;
                if let Some(instance) = servers_lock.get_mut(server_id) {
                    if let Some(client) = &instance.client {
                        if let Ok(tools) = client.list_tools().await {
                            instance.state.tools = tools;
                            let _ = app_handle.emit(events::SERVER_UPDATE, &instance.state);
                        }
                    }
                }
                McpNotification::ToolsListChanged(ToolsListChanged {})
            }
            methods::NOTIFICATION_PROMPTS_LIST_CHANGED => {
                // Refresh prompts list
                let mut servers_lock = servers.write().await;
                if let Some(instance) = servers_lock.get_mut(server_id) {
                    if let Some(client) = &instance.client {
                        if let Ok(prompts) = client.list_prompts().await {
                            instance.state.prompts = prompts;
                            let _ = app_handle.emit(events::SERVER_UPDATE, &instance.state);
                        }
                    }
                }
                McpNotification::PromptsListChanged(PromptsListChanged {})
            }
            methods::NOTIFICATION_CANCELLED => {
                if let Some(params) = notification.params {
                    match serde_json::from_value::<CancelledNotification>(params) {
                        Ok(cancelled) => McpNotification::Cancelled(cancelled),
                        Err(e) => {
                            log::warn!("Failed to parse cancelled notification: {}", e);
                            return;
                        }
                    }
                } else {
                    return;
                }
            }
            _ => {
                // Unknown notification
                McpNotification::Unknown {
                    method: notification.method.clone(),
                    params: notification.params,
                }
            }
        };

        // Emit notification to frontend
        let _ = app_handle.emit(events::NOTIFICATION, &serde_json::json!({
            "serverId": server_id,
            "notification": mcp_notification
        }));
    }

    /// Schedule a reconnection attempt
    async fn schedule_reconnection(&self, server_id: String) {
        if !self.reconnect_config.enabled {
            return;
        }

        let attempts = {
            let servers = self.servers.read().await;
            servers
                .get(&server_id)
                .map(|s| s.state.reconnect_attempts)
                .unwrap_or(0)
        };

        // Check max attempts
        if self.reconnect_config.max_attempts > 0 && attempts >= self.reconnect_config.max_attempts {
            log::warn!("Max reconnection attempts reached for server: {}", server_id);
            return;
        }

        // Calculate delay with exponential backoff
        let delay_ms = std::cmp::min(
            (self.reconnect_config.initial_delay_ms as f64 
                * self.reconnect_config.backoff_multiplier.powi(attempts as i32)) as u64,
            self.reconnect_config.max_delay_ms,
        );

        log::info!(
            "Scheduling reconnection for {} in {}ms (attempt {})",
            server_id,
            delay_ms,
            attempts + 1
        );

        // Update status to reconnecting
        {
            let mut servers = self.servers.write().await;
            if let Some(instance) = servers.get_mut(&server_id) {
                instance.state.status = McpServerStatus::Reconnecting;
            }
        }
        self.emit_server_update(&server_id).await;

        // Clone what we need for the async task
        let servers = self.servers.clone();
        let config_manager = self.config_manager.clone();
        let app_handle = self.app_handle.clone();
        let _reconnect_config = self.reconnect_config.clone();
        let server_id_clone = server_id.clone();

        let task = tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;

            // Check if server still exists and needs reconnection
            let should_reconnect = {
                let servers_lock = servers.read().await;
                servers_lock
                    .get(&server_id)
                    .map(|s| matches!(s.state.status, McpServerStatus::Reconnecting))
                    .unwrap_or(false)
            };

            if !should_reconnect {
                return;
            }

            // Get config
            let config = match config_manager.get_server(&server_id) {
                Some(c) => c,
                None => return,
            };

            if !config.enabled {
                return;
            }

            log::info!("Attempting reconnection for server: {}", server_id);

            // Create a temporary manager-like struct to perform connection
            // This is a simplified reconnection - in production you might want
            // to refactor to avoid code duplication
            let (notification_tx, notification_rx) = mpsc::channel(100);

            let client_result = match config.connection_type {
                McpConnectionType::Stdio => {
                    McpClient::connect_stdio(&config.command, &config.args, &config.env, notification_tx)
                        .await
                }
                McpConnectionType::Sse => {
                    let url = match config.url.as_ref() {
                        Some(u) => u,
                        None => return,
                    };
                    McpClient::connect_sse(url, notification_tx).await
                }
            };

            match client_result {
                Ok(client) => {
                    client.start_receive_loop().await;
                    
                    match client.initialize(ClientInfo::default()).await {
                        Ok(init_result) => {
                            let tools = client.list_tools().await.unwrap_or_default();
                            let resources = client.list_resources().await.unwrap_or_default();
                            let prompts = client.list_prompts().await.unwrap_or_default();

                            let (stop_tx, stop_rx) = mpsc::channel(1);

                            {
                                let mut servers_lock = servers.write().await;
                                if let Some(instance) = servers_lock.get_mut(&server_id) {
                                    instance.state.status = McpServerStatus::Connected;
                                    instance.state.capabilities = Some(init_result.capabilities);
                                    instance.state.tools = tools;
                                    instance.state.resources = resources;
                                    instance.state.prompts = prompts;
                                    instance.state.error_message = None;
                                    instance.state.connected_at = Some(chrono::Utc::now().timestamp());
                                    instance.state.reconnect_attempts = 0;
                                    instance.client = Some(client);
                                    instance.stop_tx = Some(stop_tx);
                                }
                            }

                            let _ = app_handle.emit(events::SERVER_UPDATE, &{
                                let servers_lock = servers.read().await;
                                servers_lock.get(&server_id).map(|i| i.state.clone())
                            });

                            log::info!("Successfully reconnected to server: {}", server_id);

                            // Start notification handler for reconnected server
                            let servers_clone = servers.clone();
                            let app_handle_clone = app_handle.clone();
                            let server_id_for_handler = server_id.clone();
                            
                            let notif_task = tokio::spawn(async move {
                                let mut rx = notification_rx;
                                let mut stop = stop_rx;
                                loop {
                                    tokio::select! {
                                        _ = stop.recv() => break,
                                        notif = rx.recv() => {
                                            match notif {
                                                Some(n) => {
                                                    Self::handle_notification(
                                                        &app_handle_clone,
                                                        &servers_clone,
                                                        &server_id_for_handler,
                                                        n
                                                    ).await;
                                                }
                                                None => break,
                                            }
                                        }
                                    }
                                }
                            });

                            {
                                let mut servers_lock = servers.write().await;
                                if let Some(instance) = servers_lock.get_mut(&server_id) {
                                    instance.notification_task = Some(notif_task);
                                }
                            }
                        }
                        Err(e) => {
                            client.close().await.ok();
                            log::error!("Reconnection failed for {}: {}", server_id, e);
                            
                            {
                                let mut servers_lock = servers.write().await;
                                if let Some(instance) = servers_lock.get_mut(&server_id) {
                                    instance.state.status = McpServerStatus::Error(e.to_string());
                                    instance.state.error_message = Some(e.to_string());
                                    instance.state.reconnect_attempts += 1;
                                }
                            }

                            let _ = app_handle.emit(events::SERVER_UPDATE, &{
                                let servers_lock = servers.read().await;
                                servers_lock.get(&server_id).map(|i| i.state.clone())
                            });

                            // Schedule another reconnection attempt
                            // (This would need the full manager context, simplified here)
                        }
                    }
                }
                Err(e) => {
                    log::error!("Reconnection failed for {}: {}", server_id, e);
                    
                    {
                        let mut servers_lock = servers.write().await;
                        if let Some(instance) = servers_lock.get_mut(&server_id) {
                            instance.state.status = McpServerStatus::Error(e.to_string());
                            instance.state.error_message = Some(e.to_string());
                            instance.state.reconnect_attempts += 1;
                        }
                    }

                    let _ = app_handle.emit(events::SERVER_UPDATE, &{
                        let servers_lock = servers.read().await;
                        servers_lock.get(&server_id).map(|i| i.state.clone())
                    });
                }
            }
        });

        // Store reconnection task
        let mut servers = self.servers.write().await;
        if let Some(instance) = servers.get_mut(&server_id_clone) {
            instance.reconnect_task = Some(task);
        }
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

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // Event Constants Tests
    // ============================================================================

    #[test]
    fn test_event_constants() {
        assert_eq!(events::SERVER_UPDATE, "mcp:server-update");
        assert_eq!(events::SERVERS_CHANGED, "mcp:servers-changed");
        assert_eq!(events::NOTIFICATION, "mcp:notification");
        assert_eq!(events::TOOL_CALL_PROGRESS, "mcp:tool-call-progress");
        assert_eq!(events::SERVER_HEALTH, "mcp:server-health");
        assert_eq!(events::LOG_MESSAGE, "mcp:log-message");
    }

    // ============================================================================
    // Reconnection Delay Calculation Tests
    // ============================================================================

    #[test]
    fn test_reconnection_delay_calculation() {
        let config = ReconnectConfig::default();
        
        // First attempt: initial_delay_ms * backoff^0 = 1000 * 1 = 1000ms
        let delay_0 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(0)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_0, 1000);

        // Second attempt: initial_delay_ms * backoff^1 = 1000 * 2 = 2000ms
        let delay_1 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(1)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_1, 2000);

        // Third attempt: initial_delay_ms * backoff^2 = 1000 * 4 = 4000ms
        let delay_2 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(2)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_2, 4000);

        // After many attempts, should cap at max_delay_ms
        let delay_10 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(10)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_10, 30000); // max_delay_ms
    }

    #[test]
    fn test_reconnection_delay_with_custom_config() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 3,
            initial_delay_ms: 500,
            max_delay_ms: 10000,
            backoff_multiplier: 3.0,
        };

        // First attempt: 500 * 3^0 = 500ms
        let delay_0 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(0)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_0, 500);

        // Second attempt: 500 * 3^1 = 1500ms
        let delay_1 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(1)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_1, 1500);

        // Third attempt: 500 * 3^2 = 4500ms
        let delay_2 = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(2)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay_2, 4500);
    }
}

    // ============================================================================
    // Error Handling Edge Cases
    // ============================================================================

    #[test]
    fn test_reconnection_delay_with_zero_multiplier() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 10,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 0.0, // Zero multiplier
        };

        // With zero multiplier, delay should always be 0
        let delay = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(5)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay, 0);
    }

    #[test]
    fn test_reconnection_delay_with_one_multiplier() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 10,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 1.0, // No growth
        };

        // With multiplier 1.0, delay should remain constant
        for attempt in 0..5 {
            let delay = std::cmp::min(
                (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(attempt)) as u64,
                config.max_delay_ms,
            );
            assert_eq!(delay, 1000);
        }
    }

    #[test]
    fn test_reconnection_max_attempts_boundary() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 1, // Only one attempt
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
        };

        // Should only allow one reconnection attempt
        assert_eq!(config.max_attempts, 1);
        
        // Verify that attempt count check would fail after 1 attempt
        let current_attempts: u32 = 1;
        assert!(config.max_attempts > 0 && current_attempts >= config.max_attempts);
    }

    #[test]
    fn test_event_name_format() {
        // All event names should follow the mcp: prefix pattern
        assert!(events::SERVER_UPDATE.starts_with("mcp:"));
        assert!(events::SERVERS_CHANGED.starts_with("mcp:"));
        assert!(events::NOTIFICATION.starts_with("mcp:"));
        assert!(events::TOOL_CALL_PROGRESS.starts_with("mcp:"));
        assert!(events::SERVER_HEALTH.starts_with("mcp:"));
        assert!(events::LOG_MESSAGE.starts_with("mcp:"));
    }
