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
        log::info!("Creating MCP manager with data dir: {:?}", app_data_dir);
        let config_manager = Arc::new(McpConfigManager::new(app_data_dir));

        let reconnect_config = ReconnectConfig::default();
        log::debug!(
            "Reconnect config: enabled={}, max_attempts={}, initial_delay={}ms, max_delay={}ms",
            reconnect_config.enabled,
            reconnect_config.max_attempts,
            reconnect_config.initial_delay_ms,
            reconnect_config.max_delay_ms
        );

        Self {
            config_manager,
            servers: Arc::new(RwLock::new(HashMap::new())),
            app_handle,
            reconnect_config,
        }
    }

    // ==================== Helper Methods ====================

    /// Create a client based on connection type
    async fn create_client(
        config: &McpServerConfig,
        notification_tx: mpsc::Sender<JsonRpcNotification>,
    ) -> McpResult<McpClient> {
        log::debug!(
            "Creating MCP client: type={:?}, name='{}'",
            config.connection_type,
            config.name
        );
        match config.connection_type {
            McpConnectionType::Stdio => {
                log::trace!(
                    "Using stdio transport: command='{}', args={:?}",
                    config.command,
                    config.args
                );
                McpClient::connect_stdio(
                    &config.command,
                    &config.args,
                    &config.env,
                    notification_tx,
                )
                .await
            }
            McpConnectionType::Sse => {
                let url = config.url.as_ref().ok_or_else(|| {
                    log::error!(
                        "SSE connection requires URL but none provided for server '{}'",
                        config.name
                    );
                    McpError::MissingUrl
                })?;
                log::trace!("Using SSE transport: url='{}'", url);
                McpClient::connect_sse(url, notification_tx).await
            }
        }
    }

    /// Update server state on connection error
    async fn handle_connection_error(
        servers: &Arc<RwLock<HashMap<String, ServerInstance>>>,
        server_id: &str,
        error: &McpError,
    ) {
        log::warn!("Connection error for server '{}': {}", server_id, error);
        let mut servers_lock = servers.write().await;
        if let Some(instance) = servers_lock.get_mut(server_id) {
            instance.state.status = McpServerStatus::Error(error.to_string());
            instance.state.error_message = Some(error.to_string());
            instance.state.reconnect_attempts += 1;
            log::debug!(
                "Server '{}' error state updated, reconnect attempts: {}",
                server_id,
                instance.state.reconnect_attempts
            );
        }
    }

    /// Update server state on successful connection
    #[allow(clippy::too_many_arguments)]
    async fn handle_connection_success(
        servers: &Arc<RwLock<HashMap<String, ServerInstance>>>,
        server_id: &str,
        client: McpClient,
        init_result: InitializeResult,
        tools: Vec<McpTool>,
        resources: Vec<McpResource>,
        prompts: Vec<McpPrompt>,
        stop_tx: mpsc::Sender<()>,
    ) {
        log::info!(
            "Server '{}' connected successfully: {} tools, {} resources, {} prompts",
            server_id,
            tools.len(),
            resources.len(),
            prompts.len()
        );
        log::debug!(
            "Server '{}' protocol version: {}",
            server_id,
            init_result.protocol_version
        );

        let mut servers_lock = servers.write().await;
        if let Some(instance) = servers_lock.get_mut(server_id) {
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

    /// Emit server state update to frontend
    async fn emit_server_state(
        app_handle: &AppHandle,
        servers: &Arc<RwLock<HashMap<String, ServerInstance>>>,
        server_id: &str,
    ) {
        let servers_lock = servers.read().await;
        if let Some(instance) = servers_lock.get(server_id) {
            log::trace!(
                "Emitting server state update for '{}': status={:?}",
                server_id,
                instance.state.status
            );
            let _ = app_handle.emit(events::SERVER_UPDATE, &instance.state);
        }
    }

    /// Initialize the manager - load config and start auto-start servers
    pub async fn initialize(&self) -> McpResult<()> {
        log::info!("Initializing MCP manager");

        // Load configuration
        log::debug!("Loading MCP server configurations");
        self.config_manager.load().await?;

        // Initialize server states from config
        let configs = self.config_manager.get_all_servers();
        log::info!("Found {} MCP servers in configuration", configs.len());
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
        log::info!("Auto-starting {} MCP servers", auto_start.len());
        for (id, config) in auto_start {
            log::info!("Auto-starting MCP server: '{}' ({})", id, config.name);
            if let Err(e) = self.connect_server(&id).await {
                log::error!("Failed to auto-start server '{}': {}", id, e);
            }
        }

        log::info!("MCP manager initialization completed");
        Ok(())
    }

    /// Reload configuration from disk
    pub async fn reload_config(&self) -> McpResult<()> {
        log::info!("Reloading MCP configuration from disk");
        self.config_manager.load().await?;

        // Update server states
        let configs = self.config_manager.get_all_servers();
        let mut servers = self.servers.write().await;

        let current_count = servers.len();
        let config_count = configs.len();
        log::debug!(
            "Current servers: {}, config servers: {}",
            current_count,
            config_count
        );

        // Add new servers
        for (id, config) in &configs {
            if !servers.contains_key(id) {
                log::info!("Adding new server from config: '{}' ({})", id, config.name);
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
        let removed: Vec<_> = servers
            .keys()
            .filter(|id| !configs.contains_key(*id))
            .cloned()
            .collect();
        for id in &removed {
            log::info!("Removing server no longer in config: '{}'", id);
        }
        servers.retain(|id, _| configs.contains_key(id));

        drop(servers);

        log::info!("Configuration reload completed");
        self.emit_servers_changed().await;
        Ok(())
    }

    /// Add a new server
    pub async fn add_server(&self, id: String, config: McpServerConfig) -> McpResult<()> {
        log::info!("Adding new MCP server: id='{}', name='{}'", id, config.name);
        log::debug!(
            "Server details: type={:?}, command='{}', enabled={}, auto_start={}",
            config.connection_type,
            config.command,
            config.enabled,
            config.auto_start
        );

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

        log::info!("Server '{}' added successfully", id);
        self.emit_servers_changed().await;
        Ok(())
    }

    /// Remove a server
    pub async fn remove_server(&self, id: &str) -> McpResult<()> {
        log::info!("Removing MCP server: '{}'", id);

        // Disconnect first if connected
        log::debug!("Disconnecting server '{}' before removal", id);
        self.disconnect_server(id).await.ok();

        // Remove from config
        self.config_manager.remove_server(id);
        self.config_manager.save().await?;

        // Remove from runtime state
        let mut servers = self.servers.write().await;
        servers.remove(id);

        drop(servers);

        log::info!("Server '{}' removed successfully", id);
        self.emit_servers_changed().await;
        Ok(())
    }

    /// Update a server configuration
    pub async fn update_server(&self, id: &str, config: McpServerConfig) -> McpResult<()> {
        log::info!("Updating MCP server configuration: '{}'", id);

        // Check if server exists
        if !self.config_manager.has_server(id) {
            log::error!("Cannot update server '{}': not found", id);
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
            log::debug!("Disconnecting server '{}' before update", id);
            self.disconnect_server(id).await.ok();
        }

        // Update config
        self.config_manager
            .set_server(id.to_string(), config.clone());
        self.config_manager.save().await?;

        // Update runtime state
        let mut servers = self.servers.write().await;
        if let Some(instance) = servers.get_mut(id) {
            instance.state.config = config.clone();
            instance.state.name = config.name;
        }

        drop(servers);

        log::info!("Server '{}' configuration updated successfully", id);
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
        log::debug!("Setting server '{}' status to Connecting", id);
        {
            let mut servers = self.servers.write().await;
            if let Some(instance) = servers.get_mut(id) {
                instance.state.status = McpServerStatus::Connecting;
            }
        }
        self.emit_server_update(id).await;

        // Create notification channel
        log::trace!("Creating notification channel for server '{}'", id);
        let (notification_tx, notification_rx) = mpsc::channel(100);

        // Create client using helper method
        log::debug!("Creating MCP client for server '{}'", id);
        let client = match Self::create_client(&config, notification_tx).await {
            Ok(c) => c,
            Err(e) => {
                log::error!("Failed to create client for server '{}': {}", id, e);
                Self::handle_connection_error(&self.servers, id, &e).await;
                self.emit_server_update(id).await;
                self.schedule_reconnection(id.to_string()).await;
                return Err(e);
            }
        };

        // Start receive loop
        log::debug!("Starting receive loop for server '{}'", id);
        client.start_receive_loop().await;

        // Initialize connection
        log::debug!("Initializing MCP connection for server '{}'", id);
        let init_result = match client.initialize(ClientInfo::default()).await {
            Ok(r) => r,
            Err(e) => {
                log::error!("Failed to initialize connection to server '{}': {}", id, e);
                client.close().await.ok();
                Self::handle_connection_error(&self.servers, id, &e).await;
                self.emit_server_update(id).await;
                self.schedule_reconnection(id.to_string()).await;
                return Err(e);
            }
        };

        // Fetch tools, resources, prompts
        log::debug!("Fetching capabilities from server '{}'", id);
        let tools = client.list_tools().await.unwrap_or_default();
        let resources = client.list_resources().await.unwrap_or_default();
        let prompts = client.list_prompts().await.unwrap_or_default();
        log::debug!(
            "Server '{}' capabilities: {} tools, {} resources, {} prompts",
            id,
            tools.len(),
            resources.len(),
            prompts.len()
        );

        // Create stop channel for background tasks
        let (stop_tx, stop_rx) = mpsc::channel(1);

        // Update state using helper method
        Self::handle_connection_success(
            &self.servers,
            id,
            client,
            init_result,
            tools,
            resources,
            prompts,
            stop_tx,
        )
        .await;

        self.emit_server_update(id).await;

        // Start notification handler
        self.spawn_notification_handler(id.to_string(), notification_rx, stop_rx)
            .await;

        log::info!("Connected to MCP server: {}", id);
        Ok(())
    }

    /// Disconnect from a server
    pub async fn disconnect_server(&self, id: &str) -> McpResult<()> {
        log::info!("Disconnecting from MCP server: '{}'", id);

        let mut servers = self.servers.write().await;
        let instance = servers.get_mut(id).ok_or_else(|| {
            log::error!("Cannot disconnect server '{}': not found", id);
            McpError::ServerNotFound(id.to_string())
        })?;

        // Send stop signal to background tasks
        if let Some(stop_tx) = instance.stop_tx.take() {
            log::debug!(
                "Sending stop signal to background tasks for server '{}'",
                id
            );
            let _ = stop_tx.send(()).await;
        }

        // Abort background tasks
        if let Some(task) = instance.notification_task.take() {
            log::trace!("Aborting notification task for server '{}'", id);
            task.abort();
        }
        if let Some(task) = instance.health_task.take() {
            log::trace!("Aborting health check task for server '{}'", id);
            task.abort();
        }
        if let Some(task) = instance.reconnect_task.take() {
            log::trace!("Aborting reconnect task for server '{}'", id);
            task.abort();
        }

        // Close client if connected
        if let Some(client) = instance.client.take() {
            log::debug!("Closing client connection for server '{}'", id);
            client.close().await.ok();
        }

        // Update state
        log::trace!("Clearing server '{}' state", id);
        instance.state.status = McpServerStatus::Disconnected;
        instance.state.connected_at = None;
        instance.state.tools.clear();
        instance.state.resources.clear();
        instance.state.prompts.clear();

        drop(servers);

        self.emit_server_update(id).await;

        log::info!("Disconnected from MCP server '{}' successfully", id);
        Ok(())
    }

    /// Call a tool on a connected server with progress tracking
    pub async fn call_tool(
        &self,
        server_id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> McpResult<ToolCallResult> {
        log::info!("Calling tool '{}' on server '{}'", tool_name, server_id);
        log::debug!("Tool arguments: {}", arguments);

        let call_id = uuid::Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().timestamp_millis();
        log::trace!("Tool call ID: {}", call_id);

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
        let instance = servers.get(server_id).ok_or_else(|| {
            log::error!("Tool call failed: server '{}' not found", server_id);
            McpError::ServerNotFound(server_id.to_string())
        })?;

        let client = instance.client.as_ref().ok_or_else(|| {
            log::error!("Tool call failed: server '{}' not connected", server_id);
            McpError::NotConnected
        })?;

        let result = client.call_tool(tool_name, arguments).await;
        let ended_at = chrono::Utc::now().timestamp_millis();
        let duration_ms = ended_at - started_at;

        // Emit progress end
        let progress = ToolCallProgress {
            server_id: server_id.to_string(),
            tool_name: tool_name.to_string(),
            call_id: call_id.clone(),
            state: if result.is_ok() {
                ToolCallState::Completed
            } else {
                ToolCallState::Failed
            },
            progress: Some(1.0),
            message: None,
            error: result.as_ref().err().map(|e| e.to_string()),
            started_at,
            ended_at: Some(ended_at),
        };
        let _ = self.app_handle.emit(events::TOOL_CALL_PROGRESS, &progress);

        match &result {
            Ok(res) => {
                log::info!(
                    "Tool '{}' on server '{}' completed in {}ms, {} content items",
                    tool_name,
                    server_id,
                    duration_ms,
                    res.content.len()
                );
            }
            Err(e) => {
                log::error!(
                    "Tool '{}' on server '{}' failed after {}ms: {}",
                    tool_name,
                    server_id,
                    duration_ms,
                    e
                );
            }
        }

        result
    }

    /// Read a resource from a connected server
    pub async fn read_resource(&self, server_id: &str, uri: &str) -> McpResult<ResourceContent> {
        log::info!("Reading resource '{}' from server '{}'", uri, server_id);

        let servers = self.servers.read().await;
        let instance = servers.get(server_id).ok_or_else(|| {
            log::error!("Resource read failed: server '{}' not found", server_id);
            McpError::ServerNotFound(server_id.to_string())
        })?;

        let client = instance.client.as_ref().ok_or_else(|| {
            log::error!("Resource read failed: server '{}' not connected", server_id);
            McpError::NotConnected
        })?;

        let result = client.read_resource(uri).await;
        match &result {
            Ok(content) => {
                log::debug!(
                    "Resource '{}' read successfully from server '{}', {} items",
                    uri,
                    server_id,
                    content.contents.len()
                );
            }
            Err(e) => {
                log::error!(
                    "Failed to read resource '{}' from server '{}': {}",
                    uri,
                    server_id,
                    e
                );
            }
        }
        result
    }

    /// Get a prompt from a connected server
    pub async fn get_prompt(
        &self,
        server_id: &str,
        name: &str,
        arguments: Option<serde_json::Value>,
    ) -> McpResult<PromptContent> {
        log::info!("Getting prompt '{}' from server '{}'", name, server_id);
        log::debug!("Prompt arguments: {:?}", arguments);

        let servers = self.servers.read().await;
        let instance = servers.get(server_id).ok_or_else(|| {
            log::error!("Prompt get failed: server '{}' not found", server_id);
            McpError::ServerNotFound(server_id.to_string())
        })?;

        let client = instance.client.as_ref().ok_or_else(|| {
            log::error!("Prompt get failed: server '{}' not connected", server_id);
            McpError::NotConnected
        })?;

        let result = client.get_prompt(name, arguments).await;
        match &result {
            Ok(content) => {
                log::debug!(
                    "Prompt '{}' retrieved from server '{}', {} messages",
                    name,
                    server_id,
                    content.messages.len()
                );
            }
            Err(e) => {
                log::error!(
                    "Failed to get prompt '{}' from server '{}': {}",
                    name,
                    server_id,
                    e
                );
            }
        }
        result
    }

    /// Ping a connected server
    pub async fn ping_server(&self, server_id: &str) -> McpResult<u64> {
        log::trace!("Pinging server '{}'", server_id);
        let start = std::time::Instant::now();

        let servers = self.servers.read().await;
        let instance = servers.get(server_id).ok_or_else(|| {
            log::warn!("Ping failed: server '{}' not found", server_id);
            McpError::ServerNotFound(server_id.to_string())
        })?;

        let client = instance.client.as_ref().ok_or_else(|| {
            log::warn!("Ping failed: server '{}' not connected", server_id);
            McpError::NotConnected
        })?;

        client.ping().await?;
        let latency = start.elapsed().as_millis() as u64;
        log::debug!("Server '{}' ping latency: {}ms", server_id, latency);

        Ok(latency)
    }

    /// Set log level for a connected server
    pub async fn set_log_level(&self, server_id: &str, level: LogLevel) -> McpResult<()> {
        log::info!(
            "Setting log level to {:?} for server '{}'",
            level,
            server_id
        );

        let servers = self.servers.read().await;
        let instance = servers.get(server_id).ok_or_else(|| {
            log::error!("Set log level failed: server '{}' not found", server_id);
            McpError::ServerNotFound(server_id.to_string())
        })?;

        let client = instance.client.as_ref().ok_or_else(|| {
            log::error!("Set log level failed: server '{}' not connected", server_id);
            McpError::NotConnected
        })?;

        let result = client.set_log_level(level).await;
        if result.is_ok() {
            log::debug!("Log level set successfully for server '{}'", server_id);
        }
        result
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
        log::trace!("Getting all tools from connected servers");
        let servers = self.servers.read().await;
        let mut all_tools = Vec::new();

        for (server_id, instance) in servers.iter() {
            if matches!(instance.state.status, McpServerStatus::Connected) {
                for tool in &instance.state.tools {
                    all_tools.push((server_id.clone(), tool.clone()));
                }
            }
        }

        log::debug!(
            "Found {} total tools across all connected servers",
            all_tools.len()
        );
        all_tools
    }

    /// Spawn a notification handler for a server
    async fn spawn_notification_handler(
        &self,
        server_id: String,
        mut notification_rx: mpsc::Receiver<JsonRpcNotification>,
        mut stop_rx: mpsc::Receiver<()>,
    ) {
        log::debug!("Spawning notification handler for server '{}'", server_id);
        let app_handle = self.app_handle.clone();
        let servers = self.servers.clone();
        let server_id_clone = server_id.clone();

        let task = tokio::spawn(async move {
            log::trace!(
                "Notification handler task started for server '{}'",
                server_id
            );
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
        log::debug!(
            "Received notification from {}: {}",
            server_id,
            notification.method
        );

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
                            let _ = app_handle.emit(
                                events::LOG_MESSAGE,
                                &serde_json::json!({
                                    "serverId": server_id,
                                    "message": msg
                                }),
                            );
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
        let _ = app_handle.emit(
            events::NOTIFICATION,
            &serde_json::json!({
                "serverId": server_id,
                "notification": mcp_notification
            }),
        );
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
        if self.reconnect_config.max_attempts > 0 && attempts >= self.reconnect_config.max_attempts
        {
            log::warn!(
                "Max reconnection attempts reached for server: {}",
                server_id
            );
            return;
        }

        // Calculate delay with exponential backoff
        let delay_ms = std::cmp::min(
            (self.reconnect_config.initial_delay_ms as f64
                * self
                    .reconnect_config
                    .backoff_multiplier
                    .powi(attempts as i32)) as u64,
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

            // Create notification channel and client
            let (notification_tx, notification_rx) = mpsc::channel(100);

            let client = match Self::create_client(&config, notification_tx).await {
                Ok(c) => c,
                Err(e) => {
                    log::error!("Reconnection failed for {}: {}", server_id, e);
                    Self::handle_connection_error(&servers, &server_id, &e).await;
                    Self::emit_server_state(&app_handle, &servers, &server_id).await;
                    return;
                }
            };

            client.start_receive_loop().await;

            let init_result = match client.initialize(ClientInfo::default()).await {
                Ok(r) => r,
                Err(e) => {
                    client.close().await.ok();
                    log::error!(
                        "Reconnection initialization failed for {}: {}",
                        server_id,
                        e
                    );
                    Self::handle_connection_error(&servers, &server_id, &e).await;
                    Self::emit_server_state(&app_handle, &servers, &server_id).await;
                    return;
                }
            };

            // Fetch capabilities
            let tools = client.list_tools().await.unwrap_or_default();
            let resources = client.list_resources().await.unwrap_or_default();
            let prompts = client.list_prompts().await.unwrap_or_default();

            let (stop_tx, stop_rx) = mpsc::channel(1);

            // Update state
            Self::handle_connection_success(
                &servers,
                &server_id,
                client,
                init_result,
                tools,
                resources,
                prompts,
                stop_tx,
            )
            .await;

            Self::emit_server_state(&app_handle, &servers, &server_id).await;
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
            let _ = self.app_handle.emit(events::SERVER_UPDATE, &instance.state);
        }
    }

    /// Emit a servers changed event
    async fn emit_servers_changed(&self) {
        let servers = self.get_all_servers().await;
        let _ = self.app_handle.emit(events::SERVERS_CHANGED, &servers);
    }

    /// Shutdown the MCP manager - disconnect all servers and cleanup resources
    pub async fn shutdown(&self) {
        log::info!("Shutting down MCP manager...");

        // Get all server IDs
        let server_ids: Vec<String> = {
            let servers = self.servers.read().await;
            servers.keys().cloned().collect()
        };

        // Disconnect all servers
        for id in server_ids {
            if let Err(e) = self.disconnect_server(&id).await {
                log::warn!("Failed to disconnect server {} during shutdown: {}", id, e);
            }
        }

        log::info!("MCP manager shutdown completed");
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

    // ============================================================================
    // ReconnectConfig Tests
    // ============================================================================

    #[test]
    fn test_reconnect_config_default() {
        let config = ReconnectConfig::default();
        assert!(config.enabled);
        assert!(config.max_attempts > 0);
        assert!(config.initial_delay_ms > 0);
        assert!(config.max_delay_ms >= config.initial_delay_ms);
        assert!(config.backoff_multiplier >= 1.0);
    }

    #[test]
    fn test_reconnect_config_disabled() {
        let config = ReconnectConfig {
            enabled: false,
            max_attempts: 5,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
        };
        assert!(!config.enabled);
    }

    #[test]
    fn test_reconnect_config_serialization() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 3,
            initial_delay_ms: 500,
            max_delay_ms: 10000,
            backoff_multiplier: 1.5,
        };

        let json = serde_json::to_value(&config).unwrap();
        assert_eq!(json["enabled"], true);
        assert_eq!(json["maxAttempts"], 3);
        assert_eq!(json["initialDelayMs"], 500);
        assert_eq!(json["maxDelayMs"], 10000);
        assert_eq!(json["backoffMultiplier"], 1.5);
    }

    #[test]
    fn test_reconnect_config_deserialization() {
        let json = serde_json::json!({
            "enabled": false,
            "maxAttempts": 10,
            "initialDelayMs": 2000,
            "maxDelayMs": 60000,
            "backoffMultiplier": 2.5
        });

        let config: ReconnectConfig = serde_json::from_value(json).unwrap();
        assert!(!config.enabled);
        assert_eq!(config.max_attempts, 10);
        assert_eq!(config.initial_delay_ms, 2000);
        assert_eq!(config.max_delay_ms, 60000);
        assert_eq!(config.backoff_multiplier, 2.5);
    }

    // ============================================================================
    // Event Constants Tests
    // ============================================================================

    #[test]
    fn test_all_event_constants_are_unique() {
        use std::collections::HashSet;
        let mut event_names = HashSet::new();

        assert!(event_names.insert(events::SERVER_UPDATE));
        assert!(event_names.insert(events::SERVERS_CHANGED));
        assert!(event_names.insert(events::NOTIFICATION));
        assert!(event_names.insert(events::TOOL_CALL_PROGRESS));
        assert!(event_names.insert(events::SERVER_HEALTH));
        assert!(event_names.insert(events::LOG_MESSAGE));
    }

    #[test]
    fn test_event_constants_values() {
        assert_eq!(events::SERVER_UPDATE, "mcp:server-update");
        assert_eq!(events::SERVERS_CHANGED, "mcp:servers-changed");
        assert_eq!(events::NOTIFICATION, "mcp:notification");
        assert_eq!(events::TOOL_CALL_PROGRESS, "mcp:tool-call-progress");
        assert_eq!(events::SERVER_HEALTH, "mcp:server-health");
        assert_eq!(events::LOG_MESSAGE, "mcp:log-message");
    }

    // ============================================================================
    // Delay Calculation Edge Cases
    // ============================================================================

    #[test]
    fn test_delay_calculation_caps_at_max() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 100,
            initial_delay_ms: 1000,
            max_delay_ms: 5000,
            backoff_multiplier: 10.0,
        };

        // With high multiplier, delay should cap at max
        let delay = std::cmp::min(
            (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(5)) as u64,
            config.max_delay_ms,
        );
        assert_eq!(delay, 5000); // Capped at max
    }

    #[test]
    fn test_delay_calculation_with_fractional_multiplier() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 10,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 1.5,
        };

        let delay_0 = (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(0)) as u64;
        let delay_1 = (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(1)) as u64;
        let delay_2 = (config.initial_delay_ms as f64 * config.backoff_multiplier.powi(2)) as u64;

        assert_eq!(delay_0, 1000);
        assert_eq!(delay_1, 1500);
        assert_eq!(delay_2, 2250);
    }
}
