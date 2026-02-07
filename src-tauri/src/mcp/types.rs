//! MCP type definitions
//!
//! Core types for MCP protocol entities and configuration

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Connection type for MCP server
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum McpConnectionType {
    #[default]
    Stdio,
    Sse,
}

/// MCP server configuration (compatible with Claude Desktop format)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    /// Display name of the server
    pub name: String,

    /// Command to execute (for stdio)
    #[serde(default)]
    pub command: String,

    /// Command arguments
    #[serde(default)]
    pub args: Vec<String>,

    /// Environment variables
    #[serde(default)]
    pub env: HashMap<String, String>,

    /// Connection type (stdio or sse)
    #[serde(default)]
    pub connection_type: McpConnectionType,

    /// URL for SSE connections
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,

    /// Message endpoint URL for SSE (optional, defaults to url)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_url: Option<String>,

    /// Whether the server is enabled
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// Whether to auto-start on application launch
    #[serde(default)]
    pub auto_start: bool,
}

fn default_true() -> bool {
    true
}

impl Default for McpServerConfig {
    fn default() -> Self {
        Self {
            name: String::new(),
            command: String::new(),
            args: Vec::new(),
            env: HashMap::new(),
            connection_type: McpConnectionType::Stdio,
            url: None,
            message_url: None,
            enabled: true,
            auto_start: false,
        }
    }
}

/// Server runtime status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", content = "message")]
pub enum McpServerStatus {
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "connecting")]
    Connecting,
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "error")]
    Error(String),
    #[serde(rename = "reconnecting")]
    Reconnecting,
}

impl Default for McpServerStatus {
    fn default() -> Self {
        Self::Disconnected
    }
}

/// Runtime state for a server (sent to frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServerState {
    /// Unique identifier
    pub id: String,

    /// Display name
    pub name: String,

    /// Server configuration
    pub config: McpServerConfig,

    /// Current status
    pub status: McpServerStatus,

    /// Server capabilities (from initialize response)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<ServerCapabilities>,

    /// Available tools
    #[serde(default)]
    pub tools: Vec<McpTool>,

    /// Available resources
    #[serde(default)]
    pub resources: Vec<McpResource>,

    /// Available prompts
    #[serde(default)]
    pub prompts: Vec<McpPrompt>,

    /// Error message if status is Error
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,

    /// Timestamp when connected
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connected_at: Option<i64>,

    /// Number of reconnection attempts
    #[serde(default)]
    pub reconnect_attempts: u32,
}

impl McpServerState {
    pub fn new(id: String, config: McpServerConfig) -> Self {
        Self {
            id,
            name: config.name.clone(),
            config,
            status: McpServerStatus::Disconnected,
            capabilities: None,
            tools: Vec::new(),
            resources: Vec::new(),
            prompts: Vec::new(),
            error_message: None,
            connected_at: None,
            reconnect_attempts: 0,
        }
    }
}

/// MCP Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpTool {
    /// Tool name (unique within server)
    pub name: String,

    /// Human-readable description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// JSON Schema for input parameters
    pub input_schema: serde_json::Value,
}

/// MCP Resource definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpResource {
    /// Resource URI
    pub uri: String,

    /// Human-readable name
    pub name: String,

    /// Description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// MIME type
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
}

/// MCP Prompt definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpPrompt {
    /// Prompt name
    pub name: String,

    /// Description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Arguments the prompt accepts
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Vec<PromptArgument>>,
}

/// Prompt argument definition
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptArgument {
    /// Argument name
    pub name: String,

    /// Description
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Whether the argument is required
    #[serde(default)]
    pub required: bool,
}

/// Server capabilities from initialize response
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ServerCapabilities {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<ToolsCapability>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub resources: Option<ResourcesCapability>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompts: Option<PromptsCapability>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub sampling: Option<SamplingCapability>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub logging: Option<LoggingCapability>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ToolsCapability {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResourcesCapability {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscribe: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PromptsCapability {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SamplingCapability {}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LoggingCapability {}

/// Client info sent during initialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientInfo {
    pub name: String,
    pub version: String,
}

impl Default for ClientInfo {
    fn default() -> Self {
        Self {
            name: "Cognia".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

/// Server info from initialize response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub name: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

/// Initialize result from server
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitializeResult {
    pub protocol_version: String,

    pub capabilities: ServerCapabilities,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_info: Option<ServerInfo>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
}

/// Tool call result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallResult {
    pub content: Vec<ContentItem>,

    #[serde(default)]
    pub is_error: bool,
}

/// Content item in tool results or messages
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentItem {
    #[serde(rename = "text")]
    Text { text: String },

    #[serde(rename = "image", rename_all = "camelCase")]
    Image { data: String, mime_type: String },

    #[serde(rename = "resource")]
    Resource { resource: EmbeddedResource },
}

/// Embedded resource in content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedResource {
    pub uri: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub blob: Option<String>,
}

/// Resource content from read_resource
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceContent {
    pub contents: Vec<ResourceContentItem>,
}

/// Individual resource content item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceContentItem {
    pub uri: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub blob: Option<String>,
}

/// Prompt content from get_prompt
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    pub messages: Vec<PromptMessage>,
}

/// Message in prompt content
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptMessage {
    pub role: PromptRole,
    pub content: PromptMessageContent,
}

/// Role in prompt message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PromptRole {
    User,
    Assistant,
}

/// Content of prompt message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum PromptMessageContent {
    Text(String),
    Items(Vec<ContentItem>),
}

/// Sampling request (for reverse AI calls)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SamplingRequest {
    pub messages: Vec<SamplingMessage>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_preferences: Option<ModelPreferences>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub include_context: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop_sequences: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

/// Message in sampling request
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SamplingMessage {
    pub role: SamplingRole,
    pub content: SamplingContent,
}

/// Role in sampling message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SamplingRole {
    User,
    Assistant,
}

/// Content of sampling message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SamplingContent {
    Text(String),
    Items(Vec<ContentItem>),
}

/// Model preferences for sampling
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelPreferences {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hints: Option<Vec<ModelHint>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_priority: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub speed_priority: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub intelligence_priority: Option<f64>,
}

/// Model hint in preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelHint {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// Sampling result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SamplingResult {
    pub role: SamplingRole,
    pub content: SamplingContent,
    pub model: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop_reason: Option<String>,
}
// ============================================================================
// Notification and Progress Types
// ============================================================================

/// Progress notification params
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressNotification {
    /// Progress token to associate with request
    pub progress_token: String,

    /// Progress value (0.0 to 1.0 or absolute)
    pub progress: f64,

    /// Total value if known
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<f64>,

    /// Optional message describing current progress
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Log message notification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogMessage {
    /// Log level
    pub level: LogLevel,

    /// Log message
    pub message: String,

    /// Logger name/source
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logger: Option<String>,

    /// Associated data
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

/// Log level enum
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Notice,
    Warning,
    Error,
    Critical,
    Alert,
    Emergency,
}

impl Default for LogLevel {
    fn default() -> Self {
        Self::Info
    }
}

/// Resource list changed notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceListChanged {}

/// Resource updated notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUpdated {
    pub uri: String,
}

/// Tools list changed notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolsListChanged {}

/// Prompts list changed notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptsListChanged {}

/// Cancelled notification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelledNotification {
    /// Request ID that was cancelled
    pub request_id: serde_json::Value,

    /// Reason for cancellation
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

/// MCP notification payload - sent to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum McpNotification {
    /// Progress update
    Progress(ProgressNotification),

    /// Log message from server
    LogMessage(LogMessage),

    /// Resource list has changed
    ResourceListChanged(ResourceListChanged),

    /// A specific resource was updated
    ResourceUpdated(ResourceUpdated),

    /// Tools list has changed
    ToolsListChanged(ToolsListChanged),

    /// Prompts list has changed
    PromptsListChanged(PromptsListChanged),

    /// Request was cancelled
    Cancelled(CancelledNotification),

    /// Unknown notification
    Unknown {
        method: String,
        params: Option<serde_json::Value>,
    },
}

// ============================================================================
// Tool Call Progress Tracking
// ============================================================================

/// Tool call progress event (sent to frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallProgress {
    /// Server ID
    pub server_id: String,

    /// Tool name being called
    pub tool_name: String,

    /// Unique call ID
    pub call_id: String,

    /// Current state
    pub state: ToolCallState,

    /// Progress (0.0 to 1.0) if available
    #[serde(skip_serializing_if = "Option::is_none")]
    pub progress: Option<f64>,

    /// Progress message if available
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    /// Error message if failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,

    /// Start timestamp (ms)
    pub started_at: i64,

    /// End timestamp (ms) if completed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_at: Option<i64>,
}

/// Tool call state
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ToolCallState {
    /// Tool call is pending/queued
    Pending,
    /// Tool call is in progress
    Running,
    /// Tool call completed successfully
    Completed,
    /// Tool call failed with error
    Failed,
    /// Tool call was cancelled
    Cancelled,
}

// ============================================================================
// Reconnection Configuration
// ============================================================================

/// Reconnection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReconnectConfig {
    /// Whether auto-reconnect is enabled
    #[serde(default = "default_true")]
    pub enabled: bool,

    /// Maximum number of reconnection attempts (0 = infinite)
    #[serde(default = "default_max_attempts")]
    pub max_attempts: u32,

    /// Initial delay between attempts in milliseconds
    #[serde(default = "default_initial_delay")]
    pub initial_delay_ms: u64,

    /// Maximum delay between attempts in milliseconds
    #[serde(default = "default_max_delay")]
    pub max_delay_ms: u64,

    /// Backoff multiplier
    #[serde(default = "default_backoff_multiplier")]
    pub backoff_multiplier: f64,
}

fn default_max_attempts() -> u32 {
    5
}

fn default_initial_delay() -> u64 {
    1000
}

fn default_max_delay() -> u64 {
    30000
}

fn default_backoff_multiplier() -> f64 {
    2.0
}

impl Default for ReconnectConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            max_attempts: default_max_attempts(),
            initial_delay_ms: default_initial_delay(),
            max_delay_ms: default_max_delay(),
            backoff_multiplier: default_backoff_multiplier(),
        }
    }
}

/// A root directory that the client exposes to the server
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Root {
    /// URI of the root (e.g. file:///path/to/dir)
    pub uri: String,
    /// Human-readable name for the root
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// Server health status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerHealth {
    /// Server ID
    pub server_id: String,

    /// Whether server is healthy (responding to pings)
    pub is_healthy: bool,

    /// Last successful ping timestamp
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_ping_at: Option<i64>,

    /// Round-trip time in milliseconds
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ping_latency_ms: Option<u64>,

    /// Number of consecutive failed pings
    pub failed_pings: u32,
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;
    use std::collections::HashMap;

    // ============================================================================
    // LogLevel Tests
    // ============================================================================

    #[test]
    fn test_log_level_serialization() {
        assert_eq!(
            serde_json::to_string(&LogLevel::Debug).unwrap(),
            "\"debug\""
        );
        assert_eq!(serde_json::to_string(&LogLevel::Info).unwrap(), "\"info\"");
        assert_eq!(
            serde_json::to_string(&LogLevel::Warning).unwrap(),
            "\"warning\""
        );
        assert_eq!(
            serde_json::to_string(&LogLevel::Error).unwrap(),
            "\"error\""
        );
    }

    #[test]
    fn test_log_level_deserialization() {
        assert_eq!(
            serde_json::from_str::<LogLevel>("\"debug\"").unwrap(),
            LogLevel::Debug
        );
        assert_eq!(
            serde_json::from_str::<LogLevel>("\"info\"").unwrap(),
            LogLevel::Info
        );
        assert_eq!(
            serde_json::from_str::<LogLevel>("\"warning\"").unwrap(),
            LogLevel::Warning
        );
        assert_eq!(
            serde_json::from_str::<LogLevel>("\"error\"").unwrap(),
            LogLevel::Error
        );
    }

    #[test]
    fn test_log_level_default() {
        assert_eq!(LogLevel::default(), LogLevel::Info);
    }

    // ============================================================================
    // ProgressNotification Tests
    // ============================================================================

    #[test]
    fn test_progress_notification_serialization() {
        let progress = ProgressNotification {
            progress_token: "token123".to_string(),
            progress: 0.5,
            total: Some(100.0),
            message: Some("Processing...".to_string()),
        };

        let json = serde_json::to_value(&progress).unwrap();
        assert_eq!(json["progressToken"], "token123");
        assert_eq!(json["progress"], 0.5);
        assert_eq!(json["total"], 100.0);
        assert_eq!(json["message"], "Processing...");
    }

    #[test]
    fn test_progress_notification_optional_fields() {
        let progress = ProgressNotification {
            progress_token: "token123".to_string(),
            progress: 0.75,
            total: None,
            message: None,
        };

        let json = serde_json::to_value(&progress).unwrap();
        assert_eq!(json["progressToken"], "token123");
        assert_eq!(json["progress"], 0.75);
        assert!(json.get("total").is_none());
        assert!(json.get("message").is_none());
    }

    // ============================================================================
    // LogMessage Tests
    // ============================================================================

    #[test]
    fn test_log_message_serialization() {
        let msg = LogMessage {
            level: LogLevel::Warning,
            message: "Test warning".to_string(),
            logger: Some("test_logger".to_string()),
            data: Some(serde_json::json!({"key": "value"})),
        };

        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["level"], "warning");
        assert_eq!(json["message"], "Test warning");
        assert_eq!(json["logger"], "test_logger");
        assert_eq!(json["data"]["key"], "value");
    }

    // ============================================================================
    // ToolCallState Tests
    // ============================================================================

    #[test]
    fn test_tool_call_state_serialization() {
        assert_eq!(
            serde_json::to_string(&ToolCallState::Pending).unwrap(),
            "\"pending\""
        );
        assert_eq!(
            serde_json::to_string(&ToolCallState::Running).unwrap(),
            "\"running\""
        );
        assert_eq!(
            serde_json::to_string(&ToolCallState::Completed).unwrap(),
            "\"completed\""
        );
        assert_eq!(
            serde_json::to_string(&ToolCallState::Failed).unwrap(),
            "\"failed\""
        );
        assert_eq!(
            serde_json::to_string(&ToolCallState::Cancelled).unwrap(),
            "\"cancelled\""
        );
    }

    // ============================================================================
    // ToolCallProgress Tests
    // ============================================================================

    #[test]
    fn test_tool_call_progress_serialization() {
        let progress = ToolCallProgress {
            server_id: "server1".to_string(),
            tool_name: "test_tool".to_string(),
            call_id: "call123".to_string(),
            state: ToolCallState::Running,
            progress: Some(0.5),
            message: Some("In progress".to_string()),
            error: None,
            started_at: 1234567890,
            ended_at: None,
        };

        let json = serde_json::to_value(&progress).unwrap();
        assert_eq!(json["serverId"], "server1");
        assert_eq!(json["toolName"], "test_tool");
        assert_eq!(json["callId"], "call123");
        assert_eq!(json["state"], "running");
        assert_eq!(json["progress"], 0.5);
        assert_eq!(json["message"], "In progress");
        assert!(json.get("error").is_none());
        assert_eq!(json["startedAt"], 1234567890);
        assert!(json.get("endedAt").is_none());
    }

    #[test]
    fn test_tool_call_progress_failed_state() {
        let progress = ToolCallProgress {
            server_id: "server1".to_string(),
            tool_name: "test_tool".to_string(),
            call_id: "call123".to_string(),
            state: ToolCallState::Failed,
            progress: Some(1.0),
            message: None,
            error: Some("Connection timeout".to_string()),
            started_at: 1234567890,
            ended_at: Some(1234567900),
        };

        let json = serde_json::to_value(&progress).unwrap();
        assert_eq!(json["state"], "failed");
        assert_eq!(json["error"], "Connection timeout");
        assert_eq!(json["endedAt"], 1234567900);
    }

    // ============================================================================
    // ReconnectConfig Tests
    // ============================================================================

    #[test]
    fn test_reconnect_config_default() {
        let config = ReconnectConfig::default();
        assert!(config.enabled);
        assert_eq!(config.max_attempts, 5);
        assert_eq!(config.initial_delay_ms, 1000);
        assert_eq!(config.max_delay_ms, 30000);
        assert_eq!(config.backoff_multiplier, 2.0);
    }

    #[test]
    fn test_reconnect_config_serialization() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: 10,
            initial_delay_ms: 500,
            max_delay_ms: 60000,
            backoff_multiplier: 1.5,
        };

        let json = serde_json::to_value(&config).unwrap();
        assert_eq!(json["enabled"], true);
        assert_eq!(json["maxAttempts"], 10);
        assert_eq!(json["initialDelayMs"], 500);
        assert_eq!(json["maxDelayMs"], 60000);
        assert_eq!(json["backoffMultiplier"], 1.5);
    }

    #[test]
    fn test_reconnect_config_deserialization() {
        let json = serde_json::json!({
            "enabled": false,
            "maxAttempts": 3,
            "initialDelayMs": 2000,
            "maxDelayMs": 15000,
            "backoffMultiplier": 3.0
        });

        let config: ReconnectConfig = serde_json::from_value(json).unwrap();
        assert!(!config.enabled);
        assert_eq!(config.max_attempts, 3);
        assert_eq!(config.initial_delay_ms, 2000);
        assert_eq!(config.max_delay_ms, 15000);
        assert_eq!(config.backoff_multiplier, 3.0);
    }

    // ============================================================================
    // ServerHealth Tests
    // ============================================================================

    #[test]
    fn test_server_health_serialization() {
        let health = ServerHealth {
            server_id: "test_server".to_string(),
            is_healthy: true,
            last_ping_at: Some(1234567890),
            ping_latency_ms: Some(50),
            failed_pings: 0,
        };

        let json = serde_json::to_value(&health).unwrap();
        assert_eq!(json["serverId"], "test_server");
        assert_eq!(json["isHealthy"], true);
        assert_eq!(json["lastPingAt"], 1234567890);
        assert_eq!(json["pingLatencyMs"], 50);
        assert_eq!(json["failedPings"], 0);
    }

    #[test]
    fn test_server_health_unhealthy() {
        let health = ServerHealth {
            server_id: "test_server".to_string(),
            is_healthy: false,
            last_ping_at: None,
            ping_latency_ms: None,
            failed_pings: 5,
        };

        let json = serde_json::to_value(&health).unwrap();
        assert_eq!(json["isHealthy"], false);
        assert!(json.get("lastPingAt").is_none());
        assert!(json.get("pingLatencyMs").is_none());
        assert_eq!(json["failedPings"], 5);
    }

    // ============================================================================
    // McpNotification Tests
    // ============================================================================

    #[test]
    fn test_mcp_notification_progress() {
        let notification = McpNotification::Progress(ProgressNotification {
            progress_token: "token".to_string(),
            progress: 0.5,
            total: None,
            message: None,
        });

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "progress");
    }

    #[test]
    fn test_mcp_notification_log_message() {
        let notification = McpNotification::LogMessage(LogMessage {
            level: LogLevel::Info,
            message: "Test".to_string(),
            logger: None,
            data: None,
        });

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "logMessage");
    }

    #[test]
    fn test_mcp_notification_resource_list_changed() {
        let notification = McpNotification::ResourceListChanged(ResourceListChanged {});

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "resourceListChanged");
    }

    #[test]
    fn test_mcp_notification_tools_list_changed() {
        let notification = McpNotification::ToolsListChanged(ToolsListChanged {});

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "toolsListChanged");
    }

    #[test]
    fn test_mcp_notification_prompts_list_changed() {
        let notification = McpNotification::PromptsListChanged(PromptsListChanged {});

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "promptsListChanged");
    }

    #[test]
    fn test_mcp_notification_cancelled() {
        let notification = McpNotification::Cancelled(CancelledNotification {
            request_id: serde_json::json!(123),
            reason: Some("User cancelled".to_string()),
        });

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "cancelled");
    }

    #[test]
    fn test_mcp_notification_unknown() {
        let notification = McpNotification::Unknown {
            method: "custom/method".to_string(),
            params: Some(serde_json::json!({"foo": "bar"})),
        };

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "unknown");
        assert_eq!(json["method"], "custom/method");
    }

    // ============================================================================
    // CancelledNotification Tests
    // ============================================================================

    #[test]
    fn test_cancelled_notification_serialization() {
        let cancelled = CancelledNotification {
            request_id: serde_json::json!("req-123"),
            reason: Some("Timeout".to_string()),
        };

        let json = serde_json::to_value(&cancelled).unwrap();
        assert_eq!(json["requestId"], "req-123");
        assert_eq!(json["reason"], "Timeout");
    }

    #[test]
    fn test_cancelled_notification_without_reason() {
        let cancelled = CancelledNotification {
            request_id: serde_json::json!(456),
            reason: None,
        };

        let json = serde_json::to_value(&cancelled).unwrap();
        assert_eq!(json["requestId"], 456);
        assert!(json.get("reason").is_none());
    }

    // ============================================================================
    // ResourceUpdated Tests
    // ============================================================================

    #[test]
    fn test_resource_updated_serialization() {
        let updated = ResourceUpdated {
            uri: "file:///path/to/resource".to_string(),
        };

        let json = serde_json::to_value(&updated).unwrap();
        assert_eq!(json["uri"], "file:///path/to/resource");
    }

    // ============================================================================
    // Error Handling Edge Cases
    // ============================================================================

    #[test]
    fn test_log_level_invalid_deserialization() {
        let result = serde_json::from_str::<LogLevel>("\"invalid_level\"");
        assert!(result.is_err());
    }

    #[test]
    fn test_tool_call_state_invalid_deserialization() {
        let result = serde_json::from_str::<ToolCallState>("\"unknown_state\"");
        assert!(result.is_err());
    }

    #[test]
    fn test_progress_notification_boundary_values() {
        // Test with 0% progress
        let progress_zero = ProgressNotification {
            progress_token: "token".to_string(),
            progress: 0.0,
            total: Some(100.0),
            message: None,
        };
        let json = serde_json::to_value(&progress_zero).unwrap();
        assert_eq!(json["progress"], 0.0);

        // Test with 100% progress
        let progress_full = ProgressNotification {
            progress_token: "token".to_string(),
            progress: 1.0,
            total: Some(1.0),
            message: None,
        };
        let json = serde_json::to_value(&progress_full).unwrap();
        assert_eq!(json["progress"], 1.0);

        // Test with negative progress (edge case)
        let progress_negative = ProgressNotification {
            progress_token: "token".to_string(),
            progress: -0.1,
            total: None,
            message: None,
        };
        let json = serde_json::to_value(&progress_negative).unwrap();
        assert_eq!(json["progress"], -0.1);

        // Test with progress > 1.0 (edge case)
        let progress_over = ProgressNotification {
            progress_token: "token".to_string(),
            progress: 1.5,
            total: Some(100.0),
            message: None,
        };
        let json = serde_json::to_value(&progress_over).unwrap();
        assert_eq!(json["progress"], 1.5);
    }

    #[test]
    fn test_tool_call_progress_with_empty_strings() {
        let progress = ToolCallProgress {
            server_id: "".to_string(),
            tool_name: "".to_string(),
            call_id: "".to_string(),
            state: ToolCallState::Pending,
            progress: None,
            message: Some("".to_string()),
            error: Some("".to_string()),
            started_at: 0,
            ended_at: Some(0),
        };

        let json = serde_json::to_value(&progress).unwrap();
        assert_eq!(json["serverId"], "");
        assert_eq!(json["toolName"], "");
        assert_eq!(json["callId"], "");
        assert_eq!(json["message"], "");
        assert_eq!(json["error"], "");
    }

    #[test]
    fn test_reconnect_config_zero_values() {
        let config = ReconnectConfig {
            enabled: false,
            max_attempts: 0, // Infinite attempts
            initial_delay_ms: 0,
            max_delay_ms: 0,
            backoff_multiplier: 0.0,
        };

        let json = serde_json::to_value(&config).unwrap();
        assert_eq!(json["enabled"], false);
        assert_eq!(json["maxAttempts"], 0);
        assert_eq!(json["initialDelayMs"], 0);
        assert_eq!(json["maxDelayMs"], 0);
        assert_eq!(json["backoffMultiplier"], 0.0);
    }

    #[test]
    fn test_reconnect_config_max_values() {
        let config = ReconnectConfig {
            enabled: true,
            max_attempts: u32::MAX,
            initial_delay_ms: u64::MAX,
            max_delay_ms: u64::MAX,
            backoff_multiplier: f64::MAX,
        };

        let json = serde_json::to_value(&config).unwrap();
        assert_eq!(json["maxAttempts"], u32::MAX);
    }

    #[test]
    fn test_server_health_max_failed_pings() {
        let health = ServerHealth {
            server_id: "server".to_string(),
            is_healthy: false,
            last_ping_at: None,
            ping_latency_ms: None,
            failed_pings: u32::MAX,
        };

        let json = serde_json::to_value(&health).unwrap();
        assert_eq!(json["failedPings"], u32::MAX);
    }

    #[test]
    fn test_log_message_with_complex_data() {
        let msg = LogMessage {
            level: LogLevel::Debug,
            message: "Complex data test".to_string(),
            logger: Some("test".to_string()),
            data: Some(serde_json::json!({
                "nested": {
                    "array": [1, 2, 3],
                    "object": {"key": "value"},
                    "null": null,
                    "bool": true
                }
            })),
        };

        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["data"]["nested"]["array"][0], 1);
        assert_eq!(json["data"]["nested"]["object"]["key"], "value");
        assert!(json["data"]["nested"]["null"].is_null());
        assert_eq!(json["data"]["nested"]["bool"], true);
    }

    #[test]
    fn test_cancelled_notification_with_various_request_ids() {
        // Numeric ID
        let cancelled_num = CancelledNotification {
            request_id: serde_json::json!(12345),
            reason: None,
        };
        let json = serde_json::to_value(&cancelled_num).unwrap();
        assert_eq!(json["requestId"], 12345);

        // String ID
        let cancelled_str = CancelledNotification {
            request_id: serde_json::json!("request-uuid-123"),
            reason: None,
        };
        let json = serde_json::to_value(&cancelled_str).unwrap();
        assert_eq!(json["requestId"], "request-uuid-123");

        // Null ID (edge case)
        let cancelled_null = CancelledNotification {
            request_id: serde_json::Value::Null,
            reason: None,
        };
        let json = serde_json::to_value(&cancelled_null).unwrap();
        assert!(json["requestId"].is_null());
    }

    #[test]
    fn test_mcp_notification_unknown_with_null_params() {
        let notification = McpNotification::Unknown {
            method: "unknown/method".to_string(),
            params: None,
        };

        let json = serde_json::to_value(&notification).unwrap();
        assert_eq!(json["type"], "unknown");
        assert_eq!(json["method"], "unknown/method");
        assert!(json.get("params").map(|v| v.is_null()).unwrap_or(true));
    }

    #[test]
    fn test_tool_call_progress_timestamp_boundaries() {
        // Test with minimum timestamp
        let progress_min = ToolCallProgress {
            server_id: "s".to_string(),
            tool_name: "t".to_string(),
            call_id: "c".to_string(),
            state: ToolCallState::Completed,
            progress: Some(1.0),
            message: None,
            error: None,
            started_at: i64::MIN,
            ended_at: Some(i64::MAX),
        };

        let json = serde_json::to_value(&progress_min).unwrap();
        assert_eq!(json["startedAt"], i64::MIN);
        assert_eq!(json["endedAt"], i64::MAX);
    }

    // ============================================================================
    // McpConnectionType Tests
    // ============================================================================

    #[test]
    fn test_connection_type_default() {
        let conn_type = McpConnectionType::default();
        assert_eq!(conn_type, McpConnectionType::Stdio);
    }

    #[test]
    fn test_connection_type_serialization() {
        assert_eq!(
            serde_json::to_string(&McpConnectionType::Stdio).unwrap(),
            "\"stdio\""
        );
        assert_eq!(
            serde_json::to_string(&McpConnectionType::Sse).unwrap(),
            "\"sse\""
        );
    }

    #[test]
    fn test_connection_type_deserialization() {
        assert_eq!(
            serde_json::from_str::<McpConnectionType>("\"stdio\"").unwrap(),
            McpConnectionType::Stdio
        );
        assert_eq!(
            serde_json::from_str::<McpConnectionType>("\"sse\"").unwrap(),
            McpConnectionType::Sse
        );
    }

    // ============================================================================
    // McpServerConfig Tests
    // ============================================================================

    #[test]
    fn test_server_config_default() {
        let config = McpServerConfig::default();
        assert!(config.name.is_empty());
        assert!(config.command.is_empty());
        assert!(config.args.is_empty());
        assert!(config.env.is_empty());
        assert_eq!(config.connection_type, McpConnectionType::Stdio);
        assert!(config.url.is_none());
        assert!(config.enabled);
        assert!(!config.auto_start);
    }

    #[test]
    fn test_server_config_serialization() {
        let config = McpServerConfig {
            name: "Test Server".to_string(),
            command: "npx".to_string(),
            args: vec!["-y".to_string(), "test-server".to_string()],
            env: HashMap::from([("KEY".to_string(), "VALUE".to_string())]),
            connection_type: McpConnectionType::Stdio,
            url: None,
            message_url: None,
            enabled: true,
            auto_start: true,
        };

        let json = serde_json::to_value(&config).unwrap();
        assert_eq!(json["name"], "Test Server");
        assert_eq!(json["command"], "npx");
        assert_eq!(json["args"][0], "-y");
        assert_eq!(json["env"]["KEY"], "VALUE");
        assert_eq!(json["connectionType"], "stdio");
        assert_eq!(json["enabled"], true);
        assert_eq!(json["autoStart"], true);
    }

    #[test]
    fn test_server_config_deserialization() {
        let json = serde_json::json!({
            "name": "My Server",
            "command": "node",
            "args": ["server.js"],
            "connectionType": "sse",
            "url": "http://localhost:8080/sse"
        });

        let config: McpServerConfig = serde_json::from_value(json).unwrap();
        assert_eq!(config.name, "My Server");
        assert_eq!(config.command, "node");
        assert_eq!(config.args, vec!["server.js"]);
        assert_eq!(config.connection_type, McpConnectionType::Sse);
        assert_eq!(config.url, Some("http://localhost:8080/sse".to_string()));
        assert!(config.enabled); // default true
        assert!(!config.auto_start); // default false
    }

    // ============================================================================
    // McpServerStatus Tests
    // ============================================================================

    #[test]
    fn test_server_status_default() {
        let status = McpServerStatus::default();
        assert_eq!(status, McpServerStatus::Disconnected);
    }

    #[test]
    fn test_server_status_serialization() {
        let statuses = [
            (McpServerStatus::Disconnected, "disconnected"),
            (McpServerStatus::Connecting, "connecting"),
            (McpServerStatus::Connected, "connected"),
            (McpServerStatus::Reconnecting, "reconnecting"),
        ];

        for (status, expected_type) in statuses {
            let json = serde_json::to_value(&status).unwrap();
            assert_eq!(json["type"], expected_type);
        }
    }

    #[test]
    fn test_server_status_error_serialization() {
        let status = McpServerStatus::Error("Connection refused".to_string());
        let json = serde_json::to_value(&status).unwrap();
        assert_eq!(json["type"], "error");
        assert_eq!(json["message"], "Connection refused");
    }

    // ============================================================================
    // McpServerState Tests
    // ============================================================================

    #[test]
    fn test_server_state_new() {
        let config = McpServerConfig {
            name: "Test".to_string(),
            ..Default::default()
        };

        let state = McpServerState::new("test-id".to_string(), config);
        assert_eq!(state.id, "test-id");
        assert_eq!(state.name, "Test");
        assert_eq!(state.status, McpServerStatus::Disconnected);
        assert!(state.capabilities.is_none());
        assert!(state.tools.is_empty());
        assert!(state.resources.is_empty());
        assert!(state.prompts.is_empty());
        assert!(state.error_message.is_none());
        assert!(state.connected_at.is_none());
        assert_eq!(state.reconnect_attempts, 0);
    }

    #[test]
    fn test_server_state_serialization() {
        let config = McpServerConfig {
            name: "Test".to_string(),
            ..Default::default()
        };

        let mut state = McpServerState::new("test-id".to_string(), config);
        state.status = McpServerStatus::Connected;
        state.connected_at = Some(1234567890);

        let json = serde_json::to_value(&state).unwrap();
        assert_eq!(json["id"], "test-id");
        assert_eq!(json["name"], "Test");
        assert_eq!(json["status"]["type"], "connected");
        assert_eq!(json["connectedAt"], 1234567890);
    }

    // ============================================================================
    // McpTool Tests
    // ============================================================================

    #[test]
    fn test_mcp_tool_serialization() {
        let tool = McpTool {
            name: "my_tool".to_string(),
            description: Some("A test tool".to_string()),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "param1": {"type": "string"}
                }
            }),
        };

        let json = serde_json::to_value(&tool).unwrap();
        assert_eq!(json["name"], "my_tool");
        assert_eq!(json["description"], "A test tool");
        assert_eq!(json["inputSchema"]["type"], "object");
    }

    #[test]
    fn test_mcp_tool_without_description() {
        let tool = McpTool {
            name: "simple_tool".to_string(),
            description: None,
            input_schema: serde_json::json!({}),
        };

        let json = serde_json::to_value(&tool).unwrap();
        assert_eq!(json["name"], "simple_tool");
        assert!(json.get("description").is_none());
    }

    // ============================================================================
    // McpResource Tests
    // ============================================================================

    #[test]
    fn test_mcp_resource_serialization() {
        let resource = McpResource {
            uri: "file:///test.txt".to_string(),
            name: "Test File".to_string(),
            description: Some("A test file resource".to_string()),
            mime_type: Some("text/plain".to_string()),
        };

        let json = serde_json::to_value(&resource).unwrap();
        assert_eq!(json["uri"], "file:///test.txt");
        assert_eq!(json["name"], "Test File");
        assert_eq!(json["description"], "A test file resource");
        assert_eq!(json["mimeType"], "text/plain");
    }

    #[test]
    fn test_mcp_resource_minimal() {
        let resource = McpResource {
            uri: "http://example.com".to_string(),
            name: "Web Resource".to_string(),
            description: None,
            mime_type: None,
        };

        let json = serde_json::to_value(&resource).unwrap();
        assert_eq!(json["uri"], "http://example.com");
        assert!(json.get("description").is_none());
        assert!(json.get("mimeType").is_none());
    }

    // ============================================================================
    // McpPrompt Tests
    // ============================================================================

    #[test]
    fn test_mcp_prompt_serialization() {
        let prompt = McpPrompt {
            name: "code_review".to_string(),
            description: Some("Review code for issues".to_string()),
            arguments: Some(vec![
                PromptArgument {
                    name: "code".to_string(),
                    description: Some("Code to review".to_string()),
                    required: true,
                },
                PromptArgument {
                    name: "language".to_string(),
                    description: None,
                    required: false,
                },
            ]),
        };

        let json = serde_json::to_value(&prompt).unwrap();
        assert_eq!(json["name"], "code_review");
        assert_eq!(json["arguments"][0]["name"], "code");
        assert_eq!(json["arguments"][0]["required"], true);
        assert_eq!(json["arguments"][1]["required"], false);
    }

    // ============================================================================
    // ContentItem Tests
    // ============================================================================

    #[test]
    fn test_content_item_text() {
        let content = ContentItem::Text {
            text: "Hello, world!".to_string(),
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["type"], "text");
        assert_eq!(json["text"], "Hello, world!");
    }

    #[test]
    fn test_content_item_image() {
        let content = ContentItem::Image {
            data: "base64data".to_string(),
            mime_type: "image/png".to_string(),
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["type"], "image");
        assert_eq!(json["data"], "base64data");
        assert_eq!(json["mimeType"], "image/png");
    }

    #[test]
    fn test_content_item_resource() {
        let content = ContentItem::Resource {
            resource: EmbeddedResource {
                uri: "file:///test.txt".to_string(),
                mime_type: Some("text/plain".to_string()),
                text: Some("File content".to_string()),
                blob: None,
            },
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["type"], "resource");
        assert_eq!(json["resource"]["uri"], "file:///test.txt");
    }

    // ============================================================================
    // ToolCallResult Tests
    // ============================================================================

    #[test]
    fn test_tool_call_result_success() {
        let result = ToolCallResult {
            content: vec![ContentItem::Text {
                text: "Success".to_string(),
            }],
            is_error: false,
        };

        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["isError"], false);
        assert_eq!(json["content"][0]["text"], "Success");
    }

    #[test]
    fn test_tool_call_result_error() {
        let result = ToolCallResult {
            content: vec![ContentItem::Text {
                text: "Error occurred".to_string(),
            }],
            is_error: true,
        };

        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["isError"], true);
    }

    // ============================================================================
    // ServerCapabilities Tests
    // ============================================================================

    #[test]
    fn test_server_capabilities_default() {
        let caps = ServerCapabilities::default();
        assert!(caps.tools.is_none());
        assert!(caps.resources.is_none());
        assert!(caps.prompts.is_none());
        assert!(caps.sampling.is_none());
        assert!(caps.logging.is_none());
    }

    #[test]
    fn test_server_capabilities_full() {
        let caps = ServerCapabilities {
            tools: Some(ToolsCapability {
                list_changed: Some(true),
            }),
            resources: Some(ResourcesCapability {
                subscribe: Some(true),
                list_changed: Some(true),
            }),
            prompts: Some(PromptsCapability {
                list_changed: Some(true),
            }),
            sampling: Some(SamplingCapability {}),
            logging: Some(LoggingCapability {}),
        };

        let json = serde_json::to_value(&caps).unwrap();
        assert_eq!(json["tools"]["listChanged"], true);
        assert_eq!(json["resources"]["subscribe"], true);
    }

    // ============================================================================
    // InitializeResult Tests
    // ============================================================================

    #[test]
    fn test_initialize_result_serialization() {
        let result = InitializeResult {
            protocol_version: "2024-11-05".to_string(),
            capabilities: ServerCapabilities::default(),
            server_info: Some(ServerInfo {
                name: "Test Server".to_string(),
                version: Some("1.0.0".to_string()),
            }),
            instructions: Some("Use this server for testing".to_string()),
        };

        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["protocolVersion"], "2024-11-05");
        assert_eq!(json["serverInfo"]["name"], "Test Server");
        assert_eq!(json["serverInfo"]["version"], "1.0.0");
        assert_eq!(json["instructions"], "Use this server for testing");
    }

    // ============================================================================
    // Sampling Types Tests
    // ============================================================================

    #[test]
    fn test_sampling_role_serialization() {
        assert_eq!(
            serde_json::to_string(&SamplingRole::User).unwrap(),
            "\"user\""
        );
        assert_eq!(
            serde_json::to_string(&SamplingRole::Assistant).unwrap(),
            "\"assistant\""
        );
    }

    #[test]
    fn test_sampling_message_serialization() {
        let msg = SamplingMessage {
            role: SamplingRole::User,
            content: SamplingContent::Text("Hello".to_string()),
        };

        let json = serde_json::to_value(&msg).unwrap();
        assert_eq!(json["role"], "user");
        assert_eq!(json["content"], "Hello");
    }

    #[test]
    fn test_sampling_request_full() {
        let request = SamplingRequest {
            messages: vec![SamplingMessage {
                role: SamplingRole::User,
                content: SamplingContent::Text("Test".to_string()),
            }],
            model_preferences: Some(ModelPreferences {
                hints: Some(vec![ModelHint {
                    name: Some("gpt-4".to_string()),
                }]),
                cost_priority: Some(0.5),
                speed_priority: Some(0.3),
                intelligence_priority: Some(0.8),
            }),
            system_prompt: Some("You are helpful".to_string()),
            include_context: Some("all".to_string()),
            temperature: Some(0.7),
            max_tokens: Some(1000),
            stop_sequences: Some(vec!["STOP".to_string()]),
            metadata: Some(serde_json::json!({"key": "value"})),
        };

        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["messages"][0]["role"], "user");
        assert_eq!(json["modelPreferences"]["hints"][0]["name"], "gpt-4");
        assert_eq!(json["temperature"], 0.7);
        assert_eq!(json["maxTokens"], 1000);
    }

    #[test]
    fn test_sampling_result_serialization() {
        let result = SamplingResult {
            role: SamplingRole::Assistant,
            content: SamplingContent::Text("Response".to_string()),
            model: "gpt-4".to_string(),
            stop_reason: Some("end_turn".to_string()),
        };

        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["role"], "assistant");
        assert_eq!(json["model"], "gpt-4");
        assert_eq!(json["stopReason"], "end_turn");
    }

    // ============================================================================
    // PromptContent Tests
    // ============================================================================

    #[test]
    fn test_prompt_content_serialization() {
        let content = PromptContent {
            description: Some("Test prompt".to_string()),
            messages: vec![PromptMessage {
                role: PromptRole::User,
                content: PromptMessageContent::Text("Hello".to_string()),
            }],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["description"], "Test prompt");
        assert_eq!(json["messages"][0]["role"], "user");
    }

    #[test]
    fn test_prompt_role_serialization() {
        assert_eq!(
            serde_json::to_string(&PromptRole::User).unwrap(),
            "\"user\""
        );
        assert_eq!(
            serde_json::to_string(&PromptRole::Assistant).unwrap(),
            "\"assistant\""
        );
    }

    // ============================================================================
    // ResourceContent Tests
    // ============================================================================

    #[test]
    fn test_resource_content_serialization() {
        let content = ResourceContent {
            contents: vec![ResourceContentItem {
                uri: "file:///test.txt".to_string(),
                mime_type: Some("text/plain".to_string()),
                text: Some("File contents here".to_string()),
                blob: None,
            }],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["contents"][0]["uri"], "file:///test.txt");
        assert_eq!(json["contents"][0]["text"], "File contents here");
    }

    #[test]
    fn test_resource_content_with_blob() {
        let content = ResourceContent {
            contents: vec![ResourceContentItem {
                uri: "file:///image.png".to_string(),
                mime_type: Some("image/png".to_string()),
                text: None,
                blob: Some("base64encodeddata".to_string()),
            }],
        };

        let json = serde_json::to_value(&content).unwrap();
        assert_eq!(json["contents"][0]["blob"], "base64encodeddata");
        assert!(json["contents"][0].get("text").is_none());
    }

    // ============================================================================
    // EmbeddedResource Tests
    // ============================================================================

    #[test]
    fn test_embedded_resource_serialization() {
        let resource = EmbeddedResource {
            uri: "file:///resource.json".to_string(),
            mime_type: Some("application/json".to_string()),
            text: Some("{\"key\": \"value\"}".to_string()),
            blob: None,
        };

        let json = serde_json::to_value(&resource).unwrap();
        assert_eq!(json["uri"], "file:///resource.json");
        assert_eq!(json["mimeType"], "application/json");
    }
}
