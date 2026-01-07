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
use crate::mcp::transport::sse::SseTransport;
use crate::mcp::transport::stdio::StdioTransport;
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
        log::debug!(
            "Creating stdio MCP client: command='{}', args={:?}, env_vars={}",
            command,
            args,
            env.len()
        );
        let transport = StdioTransport::spawn(command, args, env, None).await?;
        log::info!(
            "Stdio transport created successfully for command: {}",
            command
        );
        Self::new(Arc::new(transport), notification_tx)
    }

    /// Create a new MCP client with SSE transport
    pub async fn connect_sse(
        url: &str,
        notification_tx: mpsc::Sender<JsonRpcNotification>,
    ) -> McpResult<Self> {
        log::debug!("Creating SSE MCP client: url='{}'", url);
        let transport = SseTransport::connect(url).await?;
        log::info!("SSE transport connected successfully to: {}", url);
        Self::new(Arc::new(transport), notification_tx)
    }

    /// Create a new client with the given transport
    fn new(
        transport: Arc<dyn Transport>,
        notification_tx: mpsc::Sender<JsonRpcNotification>,
    ) -> McpResult<Self> {
        log::trace!("Initializing MCP client internal state");
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

        log::debug!("MCP client instance created successfully");
        Ok(client)
    }

    /// Start the background receive loop
    pub async fn start_receive_loop(&self) {
        log::debug!("Starting MCP client receive loop");
        let transport = self.transport.clone();
        let pending_requests = self.pending_requests.clone();
        let notification_tx = self.notification_tx.clone();

        let handle = tokio::spawn(async move {
            log::trace!("Receive loop task started");
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
        log::info!("MCP client receive loop started successfully");
    }

    /// Send a request and wait for response
    async fn send_request(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> McpResult<serde_json::Value> {
        let id = self.request_counter.fetch_add(1, Ordering::SeqCst);
        log::debug!("Sending JSON-RPC request: id={}, method='{}'", id, method);
        log::trace!("Request params: {:?}", params);

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
        log::trace!("Waiting for response to request id={} with 30s timeout", id);
        match tokio::time::timeout(std::time::Duration::from_secs(30), rx).await {
            Ok(Ok(result)) => {
                log::debug!(
                    "Received successful response for request id={}, method='{}'",
                    id,
                    method
                );
                log::trace!("Response result: {:?}", result);
                result
            }
            Ok(Err(_)) => {
                log::error!(
                    "Channel closed while waiting for response to request id={}",
                    id
                );
                Err(McpError::ChannelClosed)
            }
            Err(_) => {
                // Clean up pending request on timeout
                log::error!(
                    "Request timeout for id={}, method='{}' after 30s",
                    id,
                    method
                );
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
        log::debug!("Sending JSON-RPC notification: method='{}'", method);
        log::trace!("Notification params: {:?}", params);
        let notification = JsonRpcNotification::new(method, params);
        let message = serde_json::to_string(&notification)?;
        self.transport.send(&message).await
    }

    /// Initialize the MCP connection
    pub async fn initialize(&self, client_info: ClientInfo) -> McpResult<InitializeResult> {
        log::info!(
            "Initializing MCP connection: client='{}' v{}, protocol='{}'",
            client_info.name,
            client_info.version,
            MCP_PROTOCOL_VERSION
        );
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

        if let Some(ref server_info) = init_result.server_info {
            log::info!(
                "Connected to MCP server: '{}' v{}",
                server_info.name,
                server_info.version.as_deref().unwrap_or("unknown")
            );
        }
        log::debug!(
            "Server capabilities: tools={}, resources={}, prompts={}, logging={}",
            init_result.capabilities.tools.is_some(),
            init_result.capabilities.resources.is_some(),
            init_result.capabilities.prompts.is_some(),
            init_result.capabilities.logging.is_some()
        );

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
        log::debug!("Listing available tools from MCP server");
        let result = self.send_request(methods::TOOLS_LIST, None).await?;
        let response: ToolsListResponse = serde_json::from_value(result)?;
        log::info!("Retrieved {} tools from MCP server", response.tools.len());
        for tool in &response.tools {
            log::trace!(
                "  Tool: '{}' - {}",
                tool.name,
                tool.description.as_deref().unwrap_or("(no description)")
            );
        }
        Ok(response.tools)
    }

    /// Call a tool
    pub async fn call_tool(
        &self,
        name: &str,
        arguments: serde_json::Value,
    ) -> McpResult<ToolCallResult> {
        log::info!("Calling MCP tool: '{}'", name);
        log::debug!("Tool arguments: {}", arguments);
        let params = ToolsCallParams {
            name: name.to_string(),
            arguments,
        };

        let start = std::time::Instant::now();
        let result = self
            .send_request(methods::TOOLS_CALL, Some(serde_json::to_value(params)?))
            .await?;
        let response: ToolCallResult = serde_json::from_value(result)?;
        let elapsed = start.elapsed();

        if response.is_error {
            log::warn!("Tool '{}' returned error after {:?}", name, elapsed);
        } else {
            log::info!("Tool '{}' completed successfully in {:?}", name, elapsed);
        }
        log::debug!(
            "Tool '{}' returned {} content items",
            name,
            response.content.len()
        );
        Ok(response)
    }

    /// List available resources
    pub async fn list_resources(&self) -> McpResult<Vec<McpResource>> {
        log::debug!("Listing available resources from MCP server");
        let result = self.send_request(methods::RESOURCES_LIST, None).await?;
        let response: ResourcesListResponse = serde_json::from_value(result)?;
        log::info!(
            "Retrieved {} resources from MCP server",
            response.resources.len()
        );
        for resource in &response.resources {
            log::trace!("  Resource: '{}' ({})", resource.name, resource.uri);
        }
        Ok(response.resources)
    }

    /// Read a resource
    pub async fn read_resource(&self, uri: &str) -> McpResult<ResourceContent> {
        log::info!("Reading MCP resource: '{}'", uri);
        let params = ResourcesReadParams {
            uri: uri.to_string(),
        };

        let start = std::time::Instant::now();
        let result = self
            .send_request(methods::RESOURCES_READ, Some(serde_json::to_value(params)?))
            .await?;
        let response: ResourceContent = serde_json::from_value(result)?;
        let elapsed = start.elapsed();
        log::debug!(
            "Resource '{}' read successfully in {:?}, {} content items",
            uri,
            elapsed,
            response.contents.len()
        );
        Ok(response)
    }

    /// Subscribe to resource updates
    pub async fn subscribe_resource(&self, uri: &str) -> McpResult<()> {
        log::info!("Subscribing to resource updates: '{}'", uri);
        let params = serde_json::json!({ "uri": uri });
        self.send_request(methods::RESOURCES_SUBSCRIBE, Some(params))
            .await?;
        log::debug!("Successfully subscribed to resource: '{}'", uri);
        Ok(())
    }

    /// Unsubscribe from resource updates
    pub async fn unsubscribe_resource(&self, uri: &str) -> McpResult<()> {
        log::info!("Unsubscribing from resource updates: '{}'", uri);
        let params = serde_json::json!({ "uri": uri });
        self.send_request(methods::RESOURCES_UNSUBSCRIBE, Some(params))
            .await?;
        log::debug!("Successfully unsubscribed from resource: '{}'", uri);
        Ok(())
    }

    /// List available prompts
    pub async fn list_prompts(&self) -> McpResult<Vec<McpPrompt>> {
        log::debug!("Listing available prompts from MCP server");
        let result = self.send_request(methods::PROMPTS_LIST, None).await?;
        let response: PromptsListResponse = serde_json::from_value(result)?;
        log::info!(
            "Retrieved {} prompts from MCP server",
            response.prompts.len()
        );
        for prompt in &response.prompts {
            log::trace!(
                "  Prompt: '{}' - {}",
                prompt.name,
                prompt.description.as_deref().unwrap_or("(no description)")
            );
        }
        Ok(response.prompts)
    }

    /// Get a prompt with optional arguments
    pub async fn get_prompt(
        &self,
        name: &str,
        arguments: Option<serde_json::Value>,
    ) -> McpResult<PromptContent> {
        log::info!("Getting MCP prompt: '{}'", name);
        log::debug!("Prompt arguments: {:?}", arguments);
        let params = PromptsGetParams {
            name: name.to_string(),
            arguments,
        };

        let start = std::time::Instant::now();
        let result = self
            .send_request(methods::PROMPTS_GET, Some(serde_json::to_value(params)?))
            .await?;
        let response: PromptContent = serde_json::from_value(result)?;
        let elapsed = start.elapsed();
        log::debug!(
            "Prompt '{}' retrieved in {:?}, {} messages",
            name,
            elapsed,
            response.messages.len()
        );
        Ok(response)
    }

    /// Set log level on the server
    pub async fn set_log_level(&self, level: crate::mcp::types::LogLevel) -> McpResult<()> {
        log::info!("Setting MCP server log level to: {:?}", level);
        let params = serde_json::json!({
            "level": level
        });
        self.send_request(methods::LOGGING_SET_LEVEL, Some(params))
            .await?;
        log::debug!("Server log level set successfully");
        Ok(())
    }

    /// Send a ping to check connection
    pub async fn ping(&self) -> McpResult<()> {
        log::trace!("Sending ping to MCP server");
        let start = std::time::Instant::now();
        self.send_request(methods::PING, None).await?;
        let elapsed = start.elapsed();
        log::trace!("Ping response received in {:?}", elapsed);
        Ok(())
    }

    /// Close the connection
    pub async fn close(&self) -> McpResult<()> {
        log::info!("Closing MCP client connection");

        // Cancel receive task
        if let Some(handle) = self.receive_task.lock().await.take() {
            log::debug!("Aborting receive loop task");
            handle.abort();
        }

        // Close transport
        log::debug!("Closing transport layer");
        self.transport.close().await?;

        // Clear pending requests
        let mut pending = self.pending_requests.lock().await;
        let pending_count = pending.len();
        if pending_count > 0 {
            log::warn!(
                "Clearing {} pending requests on connection close",
                pending_count
            );
        }
        pending.clear();

        log::info!("MCP client connection closed successfully");
        Ok(())
    }

    /// Check if the client is connected
    pub fn is_connected(&self) -> bool {
        let connected = self.transport.is_connected();
        log::trace!("MCP client connection status: {}", connected);
        connected
    }
}

impl Drop for McpClient {
    fn drop(&mut self) {
        // Note: async drop is not supported, so we can't properly clean up here
        // The transport should handle cleanup in its own Drop impl
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::protocol::jsonrpc::{
        methods, JsonRpcNotification, JsonRpcRequest, JsonRpcResponse, RequestId, JSONRPC_VERSION,
    };
    use crate::mcp::protocol::prompts::{PromptsGetParams, PromptsListParams};
    use crate::mcp::protocol::resources::{ResourcesListParams, ResourcesReadParams};
    use crate::mcp::protocol::tools::{ToolsCallParams, ToolsListParams};

    // ============================================================================
    // JSON-RPC Method Constants Tests
    // ============================================================================

    #[test]
    fn test_jsonrpc_method_constants() {
        // Verify all method constants are properly defined
        assert_eq!(methods::INITIALIZE, "initialize");
        assert_eq!(methods::PING, "ping");
        assert_eq!(methods::TOOLS_LIST, "tools/list");
        assert_eq!(methods::TOOLS_CALL, "tools/call");
        assert_eq!(methods::RESOURCES_LIST, "resources/list");
        assert_eq!(methods::RESOURCES_READ, "resources/read");
        assert_eq!(methods::RESOURCES_SUBSCRIBE, "resources/subscribe");
        assert_eq!(methods::RESOURCES_UNSUBSCRIBE, "resources/unsubscribe");
        assert_eq!(methods::PROMPTS_LIST, "prompts/list");
        assert_eq!(methods::PROMPTS_GET, "prompts/get");
        assert_eq!(methods::LOGGING_SET_LEVEL, "logging/setLevel");
    }

    #[test]
    fn test_notification_method_constants() {
        assert_eq!(methods::INITIALIZED, "notifications/initialized");
        assert_eq!(methods::NOTIFICATION_PROGRESS, "notifications/progress");
        assert_eq!(methods::NOTIFICATION_MESSAGE, "notifications/message");
        assert_eq!(
            methods::NOTIFICATION_RESOURCES_UPDATED,
            "notifications/resources/updated"
        );
        assert_eq!(
            methods::NOTIFICATION_RESOURCES_LIST_CHANGED,
            "notifications/resources/list_changed"
        );
        assert_eq!(
            methods::NOTIFICATION_TOOLS_LIST_CHANGED,
            "notifications/tools/list_changed"
        );
        assert_eq!(
            methods::NOTIFICATION_PROMPTS_LIST_CHANGED,
            "notifications/prompts/list_changed"
        );
        assert_eq!(methods::NOTIFICATION_CANCELLED, "notifications/cancelled");
    }

    #[test]
    fn test_sampling_method_constant() {
        assert_eq!(methods::SAMPLING_CREATE_MESSAGE, "sampling/createMessage");
    }

    // ============================================================================
    // ClientInfo Tests
    // ============================================================================

    #[test]
    fn test_client_info_default() {
        let info = ClientInfo::default();
        assert_eq!(info.name, "Cognia");
        assert!(!info.version.is_empty());
    }

    #[test]
    fn test_client_info_serialization() {
        let info = ClientInfo {
            name: "TestClient".to_string(),
            version: "1.0.0".to_string(),
        };

        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["name"], "TestClient");
        assert_eq!(json["version"], "1.0.0");
    }

    #[test]
    fn test_client_info_deserialization() {
        let json = serde_json::json!({
            "name": "CustomClient",
            "version": "2.0.0"
        });

        let info: ClientInfo = serde_json::from_value(json).unwrap();
        assert_eq!(info.name, "CustomClient");
        assert_eq!(info.version, "2.0.0");
    }

    // ============================================================================
    // JsonRpcRequest Tests
    // ============================================================================

    #[test]
    fn test_jsonrpc_request_creation() {
        let request = JsonRpcRequest::new(1i64, "test/method", None);
        assert_eq!(request.jsonrpc, JSONRPC_VERSION);
        assert_eq!(request.id, RequestId::Number(1));
        assert_eq!(request.method, "test/method");
        assert!(request.params.is_none());
    }

    #[test]
    fn test_jsonrpc_request_with_params() {
        let params = serde_json::json!({"key": "value"});
        let request = JsonRpcRequest::new(42i64, "test/method", Some(params.clone()));

        assert_eq!(request.params, Some(params));
    }

    #[test]
    fn test_jsonrpc_request_serialization() {
        let request = JsonRpcRequest::new(1i64, "tools/list", None);
        let json = serde_json::to_value(&request).unwrap();

        assert_eq!(json["jsonrpc"], "2.0");
        assert_eq!(json["id"], 1);
        assert_eq!(json["method"], "tools/list");
    }

    #[test]
    fn test_jsonrpc_request_with_string_id() {
        let request = JsonRpcRequest::new("req-123".to_string(), "test/method", None);
        assert_eq!(request.id, RequestId::String("req-123".to_string()));
    }

    // ============================================================================
    // JsonRpcResponse Tests
    // ============================================================================

    #[test]
    fn test_jsonrpc_response_success() {
        let result = serde_json::json!({"status": "ok"});
        let response = JsonRpcResponse::success(RequestId::Number(1), result.clone());

        assert_eq!(response.jsonrpc, JSONRPC_VERSION);
        assert_eq!(response.result, Some(result));
        assert!(response.error.is_none());
    }

    #[test]
    fn test_jsonrpc_response_error() {
        use crate::mcp::protocol::jsonrpc::JsonRpcError;

        let error = JsonRpcError::method_not_found("unknown");
        let response = JsonRpcResponse::error(RequestId::Number(1), error);

        assert!(response.result.is_none());
        assert!(response.error.is_some());
    }

    // ============================================================================
    // JsonRpcNotification Tests
    // ============================================================================

    #[test]
    fn test_jsonrpc_notification_creation() {
        let notification = JsonRpcNotification::new("notifications/progress", None);
        assert_eq!(notification.jsonrpc, JSONRPC_VERSION);
        assert_eq!(notification.method, "notifications/progress");
        assert!(notification.params.is_none());
    }

    #[test]
    fn test_jsonrpc_notification_with_params() {
        let params = serde_json::json!({"progress": 0.5});
        let notification = JsonRpcNotification::new("notifications/progress", Some(params.clone()));

        assert_eq!(notification.params, Some(params));
    }

    // ============================================================================
    // Protocol Params Tests
    // ============================================================================

    #[test]
    fn test_tools_list_params_default() {
        let params = ToolsListParams::default();
        assert!(params.cursor.is_none());
    }

    #[test]
    fn test_tools_list_params_with_cursor() {
        let params = ToolsListParams {
            cursor: Some("next-page-token".to_string()),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["cursor"], "next-page-token");
    }

    #[test]
    fn test_tools_call_params_serialization() {
        let params = ToolsCallParams {
            name: "my_tool".to_string(),
            arguments: serde_json::json!({"arg1": "value1"}),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["name"], "my_tool");
        assert_eq!(json["arguments"]["arg1"], "value1");
    }

    #[test]
    fn test_resources_list_params_default() {
        let params = ResourcesListParams::default();
        assert!(params.cursor.is_none());
    }

    #[test]
    fn test_resources_read_params_serialization() {
        let params = ResourcesReadParams {
            uri: "file:///test.txt".to_string(),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["uri"], "file:///test.txt");
    }

    #[test]
    fn test_prompts_list_params_default() {
        let params = PromptsListParams::default();
        assert!(params.cursor.is_none());
    }

    #[test]
    fn test_prompts_get_params_serialization() {
        let params = PromptsGetParams {
            name: "code_review".to_string(),
            arguments: Some(serde_json::json!({"code": "fn main() {}"})),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["name"], "code_review");
        assert_eq!(json["arguments"]["code"], "fn main() {}");
    }

    #[test]
    fn test_prompts_get_params_without_arguments() {
        let params = PromptsGetParams {
            name: "simple_prompt".to_string(),
            arguments: None,
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["name"], "simple_prompt");
        assert!(json.get("arguments").is_none());
    }

    // ============================================================================
    // Initialize Request/Response Tests
    // ============================================================================

    #[test]
    fn test_initialize_request_structure() {
        let client_info = ClientInfo::default();
        let params = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "sampling": {}
            },
            "clientInfo": client_info
        });

        let request = JsonRpcRequest::new(0i64, methods::INITIALIZE, Some(params));
        let json = serde_json::to_value(&request).unwrap();

        assert_eq!(json["method"], "initialize");
        assert_eq!(json["params"]["protocolVersion"], "2024-11-05");
        assert!(json["params"]["capabilities"]["sampling"].is_object());
    }

    #[test]
    fn test_initialize_result_deserialization() {
        let json = serde_json::json!({
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {"listChanged": true},
                "resources": {"subscribe": true, "listChanged": true},
                "prompts": {"listChanged": true}
            },
            "serverInfo": {
                "name": "Test Server",
                "version": "1.0.0"
            },
            "instructions": "Use this server for testing"
        });

        let result: InitializeResult = serde_json::from_value(json).unwrap();
        assert_eq!(result.protocol_version, "2024-11-05");
        assert!(result.capabilities.tools.is_some());
        assert!(result.server_info.is_some());
        assert_eq!(result.server_info.unwrap().name, "Test Server");
    }

    // ============================================================================
    // Tool Response Tests
    // ============================================================================

    #[test]
    fn test_tools_list_response_deserialization() {
        use crate::mcp::protocol::tools::ToolsListResponse;

        let json = serde_json::json!({
            "tools": [
                {
                    "name": "read_file",
                    "description": "Read a file from disk",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"}
                        },
                        "required": ["path"]
                    }
                }
            ],
            "nextCursor": "page2"
        });

        let response: ToolsListResponse = serde_json::from_value(json).unwrap();
        assert_eq!(response.tools.len(), 1);
        assert_eq!(response.tools[0].name, "read_file");
        assert_eq!(response.next_cursor, Some("page2".to_string()));
    }

    #[test]
    fn test_tool_call_result_deserialization() {
        let json = serde_json::json!({
            "content": [
                {"type": "text", "text": "File contents here"}
            ],
            "isError": false
        });

        let result: ToolCallResult = serde_json::from_value(json).unwrap();
        assert_eq!(result.content.len(), 1);
        assert!(!result.is_error);
    }

    // ============================================================================
    // Resource Response Tests
    // ============================================================================

    #[test]
    fn test_resources_list_response_deserialization() {
        use crate::mcp::protocol::resources::ResourcesListResponse;

        let json = serde_json::json!({
            "resources": [
                {
                    "uri": "file:///readme.md",
                    "name": "README",
                    "description": "Project documentation",
                    "mimeType": "text/markdown"
                }
            ]
        });

        let response: ResourcesListResponse = serde_json::from_value(json).unwrap();
        assert_eq!(response.resources.len(), 1);
        assert_eq!(response.resources[0].uri, "file:///readme.md");
    }

    #[test]
    fn test_resource_content_deserialization() {
        let json = serde_json::json!({
            "contents": [
                {
                    "uri": "file:///test.txt",
                    "mimeType": "text/plain",
                    "text": "Hello, World!"
                }
            ]
        });

        let content: ResourceContent = serde_json::from_value(json).unwrap();
        assert_eq!(content.contents.len(), 1);
        assert_eq!(content.contents[0].text, Some("Hello, World!".to_string()));
    }

    // ============================================================================
    // Prompt Response Tests
    // ============================================================================

    #[test]
    fn test_prompts_list_response_deserialization() {
        use crate::mcp::protocol::prompts::PromptsListResponse;

        let json = serde_json::json!({
            "prompts": [
                {
                    "name": "explain_code",
                    "description": "Explain code in detail",
                    "arguments": [
                        {"name": "code", "required": true},
                        {"name": "language", "required": false}
                    ]
                }
            ]
        });

        let response: PromptsListResponse = serde_json::from_value(json).unwrap();
        assert_eq!(response.prompts.len(), 1);
        assert_eq!(response.prompts[0].name, "explain_code");
    }

    #[test]
    fn test_prompt_content_deserialization() {
        let json = serde_json::json!({
            "description": "Code explanation prompt",
            "messages": [
                {
                    "role": "user",
                    "content": "Explain this code"
                }
            ]
        });

        let content: PromptContent = serde_json::from_value(json).unwrap();
        assert_eq!(
            content.description,
            Some("Code explanation prompt".to_string())
        );
        assert_eq!(content.messages.len(), 1);
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_empty_tools_list_response() {
        use crate::mcp::protocol::tools::ToolsListResponse;

        let json = serde_json::json!({
            "tools": []
        });

        let response: ToolsListResponse = serde_json::from_value(json).unwrap();
        assert!(response.tools.is_empty());
        assert!(response.next_cursor.is_none());
    }

    #[test]
    fn test_tool_call_with_empty_arguments() {
        let params = ToolsCallParams {
            name: "no_args_tool".to_string(),
            arguments: serde_json::json!({}),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["arguments"], serde_json::json!({}));
    }

    #[test]
    fn test_tool_call_result_with_error() {
        let json = serde_json::json!({
            "content": [
                {"type": "text", "text": "Error: File not found"}
            ],
            "isError": true
        });

        let result: ToolCallResult = serde_json::from_value(json).unwrap();
        assert!(result.is_error);
    }

    #[test]
    fn test_resource_with_blob_content() {
        let json = serde_json::json!({
            "contents": [
                {
                    "uri": "file:///image.png",
                    "mimeType": "image/png",
                    "blob": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                }
            ]
        });

        let content: ResourceContent = serde_json::from_value(json).unwrap();
        assert!(content.contents[0].blob.is_some());
        assert!(content.contents[0].text.is_none());
    }
}
