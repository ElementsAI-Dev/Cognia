//! MCP Client implementation
//!
//! High-level client for communicating with MCP servers

use std::collections::HashMap;
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, oneshot, Mutex as TokioMutex};

use crate::mcp::error::{McpError, McpResult};
use crate::mcp::protocol::jsonrpc::{
    methods, JsonRpcNotification, JsonRpcRequest, JsonRpcResponse, MCP_PROTOCOL_VERSION,
};
use crate::mcp::protocol::prompts::{PromptsGetParams, PromptsListResponse};
use crate::mcp::protocol::resources::{ResourcesListResponse, ResourcesReadParams};
use crate::mcp::protocol::tools::{ToolsCallParams, ToolsListResponse};
use crate::mcp::transport::stdio::StdioTransport;
use crate::mcp::transport::sse::SseTransport;
use crate::mcp::transport::Transport;
use crate::mcp::types::*;

/// Pending request awaiting response
struct PendingRequest {
    response_tx: oneshot::Sender<Result<serde_json::Value, McpError>>,
}

/// MCP client for communicating with a single server
pub struct McpClient {
    /// Transport layer
    transport: Arc<dyn Transport>,
    /// Pending requests awaiting responses
    pending_requests: Arc<TokioMutex<HashMap<i64, PendingRequest>>>,
    /// Request ID counter
    request_counter: AtomicI64,
    /// Notification sender
    notification_tx: mpsc::Sender<JsonRpcNotification>,
    /// Server capabilities
    capabilities: TokioMutex<Option<ServerCapabilities>>,
    /// Server info
    server_info: TokioMutex<Option<ServerInfo>>,
    /// Background task handle
    receive_task: TokioMutex<Option<tokio::task::JoinHandle<()>>>,
}

impl McpClient {
    /// Create a new MCP client with stdio transport
    pub async fn connect_stdio(
        command: &str,
        args: &[String],
        env: &HashMap<String, String>,
        notification_tx: mpsc::Sender<JsonRpcNotification>,
    ) -> McpResult<Self> {
        let transport = StdioTransport::spawn(command, args, env, None).await?;
        Self::new(Arc::new(transport), notification_tx)
    }

    /// Create a new MCP client with SSE transport
    pub async fn connect_sse(
        url: &str,
        notification_tx: mpsc::Sender<JsonRpcNotification>,
    ) -> McpResult<Self> {
        let transport = SseTransport::connect(url).await?;
        Self::new(Arc::new(transport), notification_tx)
    }

    /// Create a new client with the given transport
    fn new(
        transport: Arc<dyn Transport>,
        notification_tx: mpsc::Sender<JsonRpcNotification>,
    ) -> McpResult<Self> {
        let pending_requests = Arc::new(TokioMutex::new(HashMap::new()));

        let client = Self {
            transport,
            pending_requests,
            request_counter: AtomicI64::new(0),
            notification_tx,
            capabilities: TokioMutex::new(None),
            server_info: TokioMutex::new(None),
            receive_task: TokioMutex::new(None),
        };

        Ok(client)
    }

    /// Start the background receive loop
    pub async fn start_receive_loop(&self) {
        let transport = self.transport.clone();
        let pending_requests = self.pending_requests.clone();
        let notification_tx = self.notification_tx.clone();

        let handle = tokio::spawn(async move {
            loop {
                match transport.receive().await {
                    Ok(message) => {
                        if message.is_empty() {
                            continue;
                        }

                        // Try to parse as response first
                        if let Ok(response) = serde_json::from_str::<JsonRpcResponse>(&message) {
                            if let Some(id) = match &response.id {
                                crate::mcp::protocol::jsonrpc::RequestId::Number(n) => Some(*n),
                                crate::mcp::protocol::jsonrpc::RequestId::String(_) => None,
                            } {
                                let mut pending = pending_requests.lock().await;
                                if let Some(request) = pending.remove(&id) {
                                    let result = if let Some(error) = response.error {
                                        Err(McpError::from(error))
                                    } else {
                                        Ok(response.result.unwrap_or(serde_json::Value::Null))
                                    };
                                    let _ = request.response_tx.send(result);
                                }
                            }
                            continue;
                        }

                        // Try to parse as notification
                        if let Ok(notification) =
                            serde_json::from_str::<JsonRpcNotification>(&message)
                        {
                            log::debug!("Received notification: {}", notification.method);
                            let _ = notification_tx.send(notification).await;
                            continue;
                        }

                        log::warn!("Unknown message format: {}", message);
                    }
                    Err(e) => {
                        log::error!("Error receiving message: {}", e);
                        if !transport.is_connected() {
                            break;
                        }
                    }
                }
            }
        });

        *self.receive_task.lock().await = Some(handle);
    }

    /// Send a request and wait for response
    async fn send_request(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> McpResult<serde_json::Value> {
        let id = self.request_counter.fetch_add(1, Ordering::SeqCst);

        let request = JsonRpcRequest::new(id, method, params);
        let message = serde_json::to_string(&request)?;

        // Create response channel
        let (tx, rx) = oneshot::channel();

        // Register pending request
        {
            let mut pending = self.pending_requests.lock().await;
            pending.insert(id, PendingRequest { response_tx: tx });
        }

        // Send request
        self.transport.send(&message).await?;

        // Wait for response with timeout
        match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err(McpError::ChannelClosed),
            Err(_) => {
                // Clean up pending request on timeout
                let mut pending = self.pending_requests.lock().await;
                pending.remove(&id);
                Err(McpError::ConnectionTimeout)
            }
        }
    }

    /// Send a notification (no response expected)
    async fn send_notification(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> McpResult<()> {
        let notification = JsonRpcNotification::new(method, params);
        let message = serde_json::to_string(&notification)?;
        self.transport.send(&message).await
    }

    /// Initialize the MCP connection
    pub async fn initialize(&self, client_info: ClientInfo) -> McpResult<InitializeResult> {
        let params = serde_json::json!({
            "protocolVersion": MCP_PROTOCOL_VERSION,
            "capabilities": {
                "sampling": {}
            },
            "clientInfo": client_info
        });

        let result = self.send_request(methods::INITIALIZE, Some(params)).await?;
        let init_result: InitializeResult = serde_json::from_value(result)?;

        // Store capabilities and server info
        *self.capabilities.lock().await = Some(init_result.capabilities.clone());
        *self.server_info.lock().await = init_result.server_info.clone();

        // Send initialized notification
        self.send_notification(methods::INITIALIZED, None).await?;

        log::info!(
            "MCP connection initialized with protocol version: {}",
            init_result.protocol_version
        );

        Ok(init_result)
    }

    /// Get server capabilities
    pub async fn get_capabilities(&self) -> Option<ServerCapabilities> {
        self.capabilities.lock().await.clone()
    }

    /// Get server info
    pub async fn get_server_info(&self) -> Option<ServerInfo> {
        self.server_info.lock().await.clone()
    }

    /// List available tools
    pub async fn list_tools(&self) -> McpResult<Vec<McpTool>> {
        let result = self.send_request(methods::TOOLS_LIST, None).await?;
        let response: ToolsListResponse = serde_json::from_value(result)?;
        Ok(response.tools)
    }

    /// Call a tool
    pub async fn call_tool(
        &self,
        name: &str,
        arguments: serde_json::Value,
    ) -> McpResult<ToolCallResult> {
        let params = ToolsCallParams {
            name: name.to_string(),
            arguments,
        };

        let result = self
            .send_request(methods::TOOLS_CALL, Some(serde_json::to_value(params)?))
            .await?;
        let response: ToolCallResult = serde_json::from_value(result)?;
        Ok(response)
    }

    /// List available resources
    pub async fn list_resources(&self) -> McpResult<Vec<McpResource>> {
        let result = self.send_request(methods::RESOURCES_LIST, None).await?;
        let response: ResourcesListResponse = serde_json::from_value(result)?;
        Ok(response.resources)
    }

    /// Read a resource
    pub async fn read_resource(&self, uri: &str) -> McpResult<ResourceContent> {
        let params = ResourcesReadParams {
            uri: uri.to_string(),
        };

        let result = self
            .send_request(
                methods::RESOURCES_READ,
                Some(serde_json::to_value(params)?),
            )
            .await?;
        let response: ResourceContent = serde_json::from_value(result)?;
        Ok(response)
    }

    /// Subscribe to resource updates
    pub async fn subscribe_resource(&self, uri: &str) -> McpResult<()> {
        let params = serde_json::json!({ "uri": uri });
        self.send_request(methods::RESOURCES_SUBSCRIBE, Some(params))
            .await?;
        Ok(())
    }

    /// Unsubscribe from resource updates
    pub async fn unsubscribe_resource(&self, uri: &str) -> McpResult<()> {
        let params = serde_json::json!({ "uri": uri });
        self.send_request(methods::RESOURCES_UNSUBSCRIBE, Some(params))
            .await?;
        Ok(())
    }

    /// List available prompts
    pub async fn list_prompts(&self) -> McpResult<Vec<McpPrompt>> {
        let result = self.send_request(methods::PROMPTS_LIST, None).await?;
        let response: PromptsListResponse = serde_json::from_value(result)?;
        Ok(response.prompts)
    }

    /// Get a prompt with optional arguments
    pub async fn get_prompt(
        &self,
        name: &str,
        arguments: Option<serde_json::Value>,
    ) -> McpResult<PromptContent> {
        let params = PromptsGetParams {
            name: name.to_string(),
            arguments,
        };

        let result = self
            .send_request(methods::PROMPTS_GET, Some(serde_json::to_value(params)?))
            .await?;
        let response: PromptContent = serde_json::from_value(result)?;
        Ok(response)
    }

    /// Send a ping to check connection
    pub async fn ping(&self) -> McpResult<()> {
        self.send_request(methods::PING, None).await?;
        Ok(())
    }

    /// Close the connection
    pub async fn close(&self) -> McpResult<()> {
        // Cancel receive task
        if let Some(handle) = self.receive_task.lock().await.take() {
            handle.abort();
        }

        // Close transport
        self.transport.close().await?;

        // Clear pending requests
        let mut pending = self.pending_requests.lock().await;
        pending.clear();

        Ok(())
    }

    /// Check if the client is connected
    pub fn is_connected(&self) -> bool {
        self.transport.is_connected()
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        // Note: async drop is not supported, so we can't properly clean up here
        // The transport should handle cleanup in its own Drop impl
    }
}
