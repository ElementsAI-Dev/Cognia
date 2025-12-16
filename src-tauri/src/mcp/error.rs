//! MCP error types

use thiserror::Error;

use crate::mcp::protocol::jsonrpc::JsonRpcError;

/// MCP-specific errors
#[derive(Error, Debug)]
pub enum McpError {
    #[error("Failed to spawn process: {0}")]
    SpawnFailed(String),

    #[error("stdin unavailable")]
    StdinUnavailable,

    #[error("stdout unavailable")]
    StdoutUnavailable,

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("Server not found: {0}")]
    ServerNotFound(String),

    #[error("Not connected to server")]
    NotConnected,

    #[error("Missing URL for SSE connection")]
    MissingUrl,

    #[error("RPC error: code={code}, message={message}")]
    RpcError {
        code: i32,
        message: String,
        data: Option<serde_json::Value>,
    },

    #[error("Channel closed")]
    ChannelClosed,

    #[error("Empty response")]
    EmptyResponse,

    #[error("Config path error: {0}")]
    ConfigPathError(String),

    #[error("Connection timeout")]
    ConnectionTimeout,

    #[error("Initialization failed: {0}")]
    InitializationFailed(String),

    #[error("Request error: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("Invalid message format: {0}")]
    InvalidMessageFormat(String),

    #[error("Server already connected")]
    AlreadyConnected,

    #[error("Transport error: {0}")]
    TransportError(String),

    #[error("Protocol error: {0}")]
    ProtocolError(String),

    #[error("Unsupported capability: {0}")]
    UnsupportedCapability(String),
}

impl From<JsonRpcError> for McpError {
    fn from(err: JsonRpcError) -> Self {
        McpError::RpcError {
            code: err.code,
            message: err.message,
            data: err.data,
        }
    }
}

/// Result type alias for MCP operations
pub type McpResult<T> = Result<T, McpError>;
