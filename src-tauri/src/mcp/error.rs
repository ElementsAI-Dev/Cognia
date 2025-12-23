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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_error_display() {
        let error = McpError::ServerNotFound("test_server".to_string());
        assert!(error.to_string().contains("test_server"));
    }

    #[test]
    fn test_mcp_error_not_connected() {
        let error = McpError::NotConnected;
        assert!(!error.to_string().is_empty());
    }

    #[test]
    fn test_mcp_error_missing_url() {
        let error = McpError::MissingUrl;
        assert!(!error.to_string().is_empty());
    }

    #[test]
    fn test_mcp_error_connection_timeout() {
        let error = McpError::ConnectionTimeout;
        assert!(!error.to_string().is_empty());
    }

    #[test]
    fn test_mcp_error_protocol_error() {
        let error = McpError::ProtocolError("Invalid message format".to_string());
        assert!(error.to_string().contains("Invalid message format"));
    }

    #[test]
    fn test_mcp_error_from_jsonrpc_error() {
        let rpc_error = JsonRpcError {
            code: -32601,
            message: "Method not found".to_string(),
            data: None,
        };
        
        let mcp_error: McpError = rpc_error.into();
        assert!(matches!(mcp_error, McpError::RpcError { .. }));
    }

    #[test]
    fn test_mcp_error_io() {
        let io_error = std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "connection refused");
        let mcp_error = McpError::IoError(io_error);
        assert!(mcp_error.to_string().contains("connection refused"));
    }

    #[test]
    fn test_mcp_error_config_path() {
        let error = McpError::ConfigPathError("Invalid configuration".to_string());
        assert!(error.to_string().contains("Invalid configuration"));
    }

    #[test]
    fn test_mcp_result_type() {
        fn returns_ok() -> McpResult<String> {
            Ok("success".to_string())
        }
        
        fn returns_err() -> McpResult<String> {
            Err(McpError::NotConnected)
        }
        
        assert!(returns_ok().is_ok());
        assert!(returns_err().is_err());
    }

    #[test]
    fn test_mcp_error_spawn_failed() {
        let error = McpError::SpawnFailed("command not found".to_string());
        assert!(error.to_string().contains("command not found"));
    }

    #[test]
    fn test_mcp_error_channel_closed() {
        let error = McpError::ChannelClosed;
        assert!(!error.to_string().is_empty());
    }

    #[test]
    fn test_mcp_error_empty_response() {
        let error = McpError::EmptyResponse;
        assert!(!error.to_string().is_empty());
    }
}

