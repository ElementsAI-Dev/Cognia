//! MCP error types
//!
//! This module defines error types for MCP operations with proper
//! serialization support for frontend communication.

use serde::Serialize;
use thiserror::Error;

use crate::mcp::protocol::jsonrpc::JsonRpcError;

/// MCP-specific errors with serialization support
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

/// Serializable error representation for frontend communication
#[derive(Debug, Clone, Serialize)]
pub struct McpErrorInfo {
    /// Error type identifier
    pub error_type: String,
    /// Human-readable error message
    pub message: String,
    /// Optional error code (for RPC errors)
    pub code: Option<i32>,
    /// Optional additional data
    pub data: Option<serde_json::Value>,
}

impl From<&McpError> for McpErrorInfo {
    fn from(err: &McpError) -> Self {
        match err {
            McpError::SpawnFailed(msg) => Self {
                error_type: "spawn_failed".to_string(),
                message: msg.clone(),
                code: None,
                data: None,
            },
            McpError::StdinUnavailable => Self {
                error_type: "stdin_unavailable".to_string(),
                message: "stdin unavailable".to_string(),
                code: None,
                data: None,
            },
            McpError::StdoutUnavailable => Self {
                error_type: "stdout_unavailable".to_string(),
                message: "stdout unavailable".to_string(),
                code: None,
                data: None,
            },
            McpError::IoError(e) => Self {
                error_type: "io_error".to_string(),
                message: e.to_string(),
                code: None,
                data: None,
            },
            McpError::JsonError(e) => Self {
                error_type: "json_error".to_string(),
                message: e.to_string(),
                code: None,
                data: None,
            },
            McpError::ServerNotFound(id) => Self {
                error_type: "server_not_found".to_string(),
                message: format!("Server not found: {}", id),
                code: None,
                data: Some(serde_json::json!({ "server_id": id })),
            },
            McpError::NotConnected => Self {
                error_type: "not_connected".to_string(),
                message: "Not connected to server".to_string(),
                code: None,
                data: None,
            },
            McpError::MissingUrl => Self {
                error_type: "missing_url".to_string(),
                message: "Missing URL for SSE connection".to_string(),
                code: None,
                data: None,
            },
            McpError::RpcError {
                code,
                message,
                data,
            } => Self {
                error_type: "rpc_error".to_string(),
                message: message.clone(),
                code: Some(*code),
                data: data.clone(),
            },
            McpError::ChannelClosed => Self {
                error_type: "channel_closed".to_string(),
                message: "Channel closed".to_string(),
                code: None,
                data: None,
            },
            McpError::EmptyResponse => Self {
                error_type: "empty_response".to_string(),
                message: "Empty response".to_string(),
                code: None,
                data: None,
            },
            McpError::ConfigPathError(msg) => Self {
                error_type: "config_path_error".to_string(),
                message: msg.clone(),
                code: None,
                data: None,
            },
            McpError::ConnectionTimeout => Self {
                error_type: "connection_timeout".to_string(),
                message: "Connection timeout".to_string(),
                code: None,
                data: None,
            },
            McpError::InitializationFailed(msg) => Self {
                error_type: "initialization_failed".to_string(),
                message: msg.clone(),
                code: None,
                data: None,
            },
            McpError::RequestError(e) => Self {
                error_type: "request_error".to_string(),
                message: e.to_string(),
                code: None,
                data: None,
            },
            McpError::InvalidMessageFormat(msg) => Self {
                error_type: "invalid_message_format".to_string(),
                message: msg.clone(),
                code: None,
                data: None,
            },
            McpError::AlreadyConnected => Self {
                error_type: "already_connected".to_string(),
                message: "Server already connected".to_string(),
                code: None,
                data: None,
            },
            McpError::TransportError(msg) => Self {
                error_type: "transport_error".to_string(),
                message: msg.clone(),
                code: None,
                data: None,
            },
            McpError::ProtocolError(msg) => Self {
                error_type: "protocol_error".to_string(),
                message: msg.clone(),
                code: None,
                data: None,
            },
            McpError::UnsupportedCapability(cap) => Self {
                error_type: "unsupported_capability".to_string(),
                message: format!("Unsupported capability: {}", cap),
                code: None,
                data: Some(serde_json::json!({ "capability": cap })),
            },
        }
    }
}

impl McpError {
    /// Convert to serializable error info
    pub fn to_info(&self) -> McpErrorInfo {
        McpErrorInfo::from(self)
    }
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

    // ============================================================================
    // McpError Display Tests
    // ============================================================================

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
        let io_error =
            std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "connection refused");
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

    #[test]
    fn test_mcp_error_stdin_unavailable() {
        let error = McpError::StdinUnavailable;
        assert_eq!(error.to_string(), "stdin unavailable");
    }

    #[test]
    fn test_mcp_error_stdout_unavailable() {
        let error = McpError::StdoutUnavailable;
        assert_eq!(error.to_string(), "stdout unavailable");
    }

    #[test]
    fn test_mcp_error_initialization_failed() {
        let error = McpError::InitializationFailed("handshake failed".to_string());
        assert!(error.to_string().contains("handshake failed"));
    }

    #[test]
    fn test_mcp_error_invalid_message_format() {
        let error = McpError::InvalidMessageFormat("expected JSON object".to_string());
        assert!(error.to_string().contains("expected JSON object"));
    }

    #[test]
    fn test_mcp_error_already_connected() {
        let error = McpError::AlreadyConnected;
        assert_eq!(error.to_string(), "Server already connected");
    }

    #[test]
    fn test_mcp_error_transport_error() {
        let error = McpError::TransportError("connection reset".to_string());
        assert!(error.to_string().contains("connection reset"));
    }

    #[test]
    fn test_mcp_error_unsupported_capability() {
        let error = McpError::UnsupportedCapability("sampling".to_string());
        assert!(error.to_string().contains("sampling"));
    }

    #[test]
    fn test_mcp_error_rpc_error() {
        let error = McpError::RpcError {
            code: -32600,
            message: "Invalid Request".to_string(),
            data: Some(serde_json::json!({"detail": "missing method"})),
        };
        assert!(error.to_string().contains("-32600"));
        assert!(error.to_string().contains("Invalid Request"));
    }

    // ============================================================================
    // McpErrorInfo Conversion Tests
    // ============================================================================

    #[test]
    fn test_error_info_from_spawn_failed() {
        let error = McpError::SpawnFailed("command not found".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "spawn_failed");
        assert_eq!(info.message, "command not found");
        assert!(info.code.is_none());
        assert!(info.data.is_none());
    }

    #[test]
    fn test_error_info_from_stdin_unavailable() {
        let error = McpError::StdinUnavailable;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "stdin_unavailable");
        assert_eq!(info.message, "stdin unavailable");
    }

    #[test]
    fn test_error_info_from_stdout_unavailable() {
        let error = McpError::StdoutUnavailable;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "stdout_unavailable");
        assert_eq!(info.message, "stdout unavailable");
    }

    #[test]
    fn test_error_info_from_io_error() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let error = McpError::IoError(io_error);
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "io_error");
        assert!(info.message.contains("file not found"));
    }

    #[test]
    fn test_error_info_from_json_error() {
        let json_str = "invalid json";
        let json_error = serde_json::from_str::<serde_json::Value>(json_str).unwrap_err();
        let error = McpError::JsonError(json_error);
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "json_error");
    }

    #[test]
    fn test_error_info_from_server_not_found() {
        let error = McpError::ServerNotFound("my-server".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "server_not_found");
        assert!(info.message.contains("my-server"));
        assert!(info.data.is_some());
        assert_eq!(info.data.unwrap()["server_id"], "my-server");
    }

    #[test]
    fn test_error_info_from_not_connected() {
        let error = McpError::NotConnected;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "not_connected");
        assert_eq!(info.message, "Not connected to server");
    }

    #[test]
    fn test_error_info_from_missing_url() {
        let error = McpError::MissingUrl;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "missing_url");
        assert_eq!(info.message, "Missing URL for SSE connection");
    }

    #[test]
    fn test_error_info_from_rpc_error() {
        let error = McpError::RpcError {
            code: -32601,
            message: "Method not found".to_string(),
            data: Some(serde_json::json!({"method": "unknown"})),
        };
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "rpc_error");
        assert_eq!(info.message, "Method not found");
        assert_eq!(info.code, Some(-32601));
        assert!(info.data.is_some());
    }

    #[test]
    fn test_error_info_from_channel_closed() {
        let error = McpError::ChannelClosed;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "channel_closed");
        assert_eq!(info.message, "Channel closed");
    }

    #[test]
    fn test_error_info_from_empty_response() {
        let error = McpError::EmptyResponse;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "empty_response");
        assert_eq!(info.message, "Empty response");
    }

    #[test]
    fn test_error_info_from_config_path_error() {
        let error = McpError::ConfigPathError("invalid path".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "config_path_error");
        assert_eq!(info.message, "invalid path");
    }

    #[test]
    fn test_error_info_from_connection_timeout() {
        let error = McpError::ConnectionTimeout;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "connection_timeout");
        assert_eq!(info.message, "Connection timeout");
    }

    #[test]
    fn test_error_info_from_initialization_failed() {
        let error = McpError::InitializationFailed("protocol mismatch".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "initialization_failed");
        assert_eq!(info.message, "protocol mismatch");
    }

    #[test]
    fn test_error_info_from_invalid_message_format() {
        let error = McpError::InvalidMessageFormat("not JSON-RPC".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "invalid_message_format");
        assert_eq!(info.message, "not JSON-RPC");
    }

    #[test]
    fn test_error_info_from_already_connected() {
        let error = McpError::AlreadyConnected;
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "already_connected");
        assert_eq!(info.message, "Server already connected");
    }

    #[test]
    fn test_error_info_from_transport_error() {
        let error = McpError::TransportError("pipe broken".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "transport_error");
        assert_eq!(info.message, "pipe broken");
    }

    #[test]
    fn test_error_info_from_protocol_error() {
        let error = McpError::ProtocolError("version mismatch".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "protocol_error");
        assert_eq!(info.message, "version mismatch");
    }

    #[test]
    fn test_error_info_from_unsupported_capability() {
        let error = McpError::UnsupportedCapability("logging".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.error_type, "unsupported_capability");
        assert!(info.message.contains("logging"));
        assert!(info.data.is_some());
        assert_eq!(info.data.unwrap()["capability"], "logging");
    }

    // ============================================================================
    // McpError::to_info Tests
    // ============================================================================

    #[test]
    fn test_to_info_method() {
        let error = McpError::NotConnected;
        let info = error.to_info();
        assert_eq!(info.error_type, "not_connected");
    }

    // ============================================================================
    // McpErrorInfo Serialization Tests
    // ============================================================================

    #[test]
    fn test_error_info_serialization() {
        let info = McpErrorInfo {
            error_type: "test_error".to_string(),
            message: "Test message".to_string(),
            code: Some(123),
            data: Some(serde_json::json!({"key": "value"})),
        };

        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["error_type"], "test_error");
        assert_eq!(json["message"], "Test message");
        assert_eq!(json["code"], 123);
        assert_eq!(json["data"]["key"], "value");
    }

    #[test]
    fn test_error_info_serialization_without_optional_fields() {
        let info = McpErrorInfo {
            error_type: "simple_error".to_string(),
            message: "Simple message".to_string(),
            code: None,
            data: None,
        };

        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["error_type"], "simple_error");
        assert_eq!(json["message"], "Simple message");
        // Optional fields should still be present as null in the serialization
    }

    // ============================================================================
    // JsonRpcError Conversion Tests
    // ============================================================================

    #[test]
    fn test_from_jsonrpc_error_with_data() {
        let rpc_error = JsonRpcError {
            code: -32700,
            message: "Parse error".to_string(),
            data: Some(serde_json::json!({"position": 42})),
        };

        let mcp_error: McpError = rpc_error.into();
        if let McpError::RpcError {
            code,
            message,
            data,
        } = mcp_error
        {
            assert_eq!(code, -32700);
            assert_eq!(message, "Parse error");
            assert!(data.is_some());
            assert_eq!(data.unwrap()["position"], 42);
        } else {
            panic!("Expected RpcError variant");
        }
    }

    #[test]
    fn test_from_jsonrpc_error_without_data() {
        let rpc_error = JsonRpcError {
            code: -32602,
            message: "Invalid params".to_string(),
            data: None,
        };

        let mcp_error: McpError = rpc_error.into();
        if let McpError::RpcError {
            code,
            message,
            data,
        } = mcp_error
        {
            assert_eq!(code, -32602);
            assert_eq!(message, "Invalid params");
            assert!(data.is_none());
        } else {
            panic!("Expected RpcError variant");
        }
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_error_with_empty_string() {
        let error = McpError::SpawnFailed(String::new());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.message, "");
    }

    #[test]
    fn test_error_with_unicode_message() {
        let error = McpError::ProtocolError("错误消息 🚀".to_string());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.message, "错误消息 🚀");
    }

    #[test]
    fn test_error_with_long_message() {
        let long_msg = "a".repeat(10000);
        let error = McpError::TransportError(long_msg.clone());
        let info = McpErrorInfo::from(&error);
        assert_eq!(info.message.len(), 10000);
    }

    #[test]
    fn test_rpc_error_with_complex_data() {
        let error = McpError::RpcError {
            code: -32000,
            message: "Server error".to_string(),
            data: Some(serde_json::json!({
                "nested": {
                    "array": [1, 2, 3],
                    "object": {"key": "value"}
                },
                "number": 42,
                "boolean": true,
                "null": null
            })),
        };
        let info = McpErrorInfo::from(&error);
        assert!(info.data.is_some());
        let data = info.data.unwrap();
        assert_eq!(data["nested"]["array"][0], 1);
        assert_eq!(data["nested"]["object"]["key"], "value");
    }
}
