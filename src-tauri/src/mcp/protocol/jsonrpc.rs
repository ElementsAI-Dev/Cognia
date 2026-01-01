//! JSON-RPC 2.0 protocol implementation for MCP

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// JSON-RPC version constant
pub const JSONRPC_VERSION: &str = "2.0";

/// MCP protocol version
pub const MCP_PROTOCOL_VERSION: &str = "2024-11-05";

/// JSON-RPC request ID
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(untagged)]
pub enum RequestId {
    Number(i64),
    String(String),
}

impl From<i64> for RequestId {
    fn from(n: i64) -> Self {
        RequestId::Number(n)
    }
}

impl From<String> for RequestId {
    fn from(s: String) -> Self {
        RequestId::String(s)
    }
}

/// JSON-RPC request message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: RequestId,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Value>,
}

impl JsonRpcRequest {
    pub fn new(id: impl Into<RequestId>, method: impl Into<String>, params: Option<Value>) -> Self {
        Self {
            jsonrpc: JSONRPC_VERSION.to_string(),
            id: id.into(),
            method: method.into(),
            params,
        }
    }
}

/// JSON-RPC response message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: RequestId,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

impl JsonRpcResponse {
    pub fn success(id: RequestId, result: Value) -> Self {
        Self {
            jsonrpc: JSONRPC_VERSION.to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: RequestId, error: JsonRpcError) -> Self {
        Self {
            jsonrpc: JSONRPC_VERSION.to_string(),
            id,
            result: None,
            error: Some(error),
        }
    }
}

/// JSON-RPC error object
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

impl JsonRpcError {
    pub fn new(code: i32, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            data: None,
        }
    }

    pub fn with_data(code: i32, message: impl Into<String>, data: Value) -> Self {
        Self {
            code,
            message: message.into(),
            data: Some(data),
        }
    }

    pub fn parse_error() -> Self {
        Self::new(error_codes::PARSE_ERROR, "Parse error")
    }

    pub fn invalid_request() -> Self {
        Self::new(error_codes::INVALID_REQUEST, "Invalid request")
    }

    pub fn method_not_found(method: &str) -> Self {
        Self::new(
            error_codes::METHOD_NOT_FOUND,
            format!("Method not found: {}", method),
        )
    }

    pub fn invalid_params(message: impl Into<String>) -> Self {
        Self::new(error_codes::INVALID_PARAMS, message)
    }

    pub fn internal_error(message: impl Into<String>) -> Self {
        Self::new(error_codes::INTERNAL_ERROR, message)
    }
}

/// JSON-RPC notification message (no id, no response expected)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcNotification {
    pub jsonrpc: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<Value>,
}

impl JsonRpcNotification {
    pub fn new(method: impl Into<String>, params: Option<Value>) -> Self {
        Self {
            jsonrpc: JSONRPC_VERSION.to_string(),
            method: method.into(),
            params,
        }
    }
}

/// Represents any JSON-RPC message
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum JsonRpcMessage {
    Request(JsonRpcRequest),
    Response(JsonRpcResponse),
    Notification(JsonRpcNotification),
}

impl JsonRpcMessage {
    /// Try to parse a JSON string into a JSON-RPC message
    pub fn parse(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }

    /// Check if this message is a notification
    pub fn is_notification(&self) -> bool {
        matches!(self, JsonRpcMessage::Notification(_))
    }

    /// Check if this message is a request
    pub fn is_request(&self) -> bool {
        matches!(self, JsonRpcMessage::Request(_))
    }

    /// Check if this message is a response
    pub fn is_response(&self) -> bool {
        matches!(self, JsonRpcMessage::Response(_))
    }
}

/// Standard JSON-RPC error codes
pub mod error_codes {
    /// Invalid JSON was received
    pub const PARSE_ERROR: i32 = -32700;

    /// The JSON sent is not a valid Request object
    pub const INVALID_REQUEST: i32 = -32600;

    /// The method does not exist / is not available
    pub const METHOD_NOT_FOUND: i32 = -32601;

    /// Invalid method parameter(s)
    pub const INVALID_PARAMS: i32 = -32602;

    /// Internal JSON-RPC error
    pub const INTERNAL_ERROR: i32 = -32603;
}

/// MCP-specific methods
pub mod methods {
    // Lifecycle
    pub const INITIALIZE: &str = "initialize";
    pub const INITIALIZED: &str = "notifications/initialized";
    pub const PING: &str = "ping";

    // Tools
    pub const TOOLS_LIST: &str = "tools/list";
    pub const TOOLS_CALL: &str = "tools/call";

    // Resources
    pub const RESOURCES_LIST: &str = "resources/list";
    pub const RESOURCES_READ: &str = "resources/read";
    pub const RESOURCES_SUBSCRIBE: &str = "resources/subscribe";
    pub const RESOURCES_UNSUBSCRIBE: &str = "resources/unsubscribe";

    // Prompts
    pub const PROMPTS_LIST: &str = "prompts/list";
    pub const PROMPTS_GET: &str = "prompts/get";

    // Sampling
    pub const SAMPLING_CREATE_MESSAGE: &str = "sampling/createMessage";

    // Logging
    pub const LOGGING_SET_LEVEL: &str = "logging/setLevel";

    // Notifications
    pub const NOTIFICATION_PROGRESS: &str = "notifications/progress";
    pub const NOTIFICATION_MESSAGE: &str = "notifications/message";
    pub const NOTIFICATION_RESOURCES_UPDATED: &str = "notifications/resources/updated";
    pub const NOTIFICATION_RESOURCES_LIST_CHANGED: &str = "notifications/resources/list_changed";
    pub const NOTIFICATION_TOOLS_LIST_CHANGED: &str = "notifications/tools/list_changed";
    pub const NOTIFICATION_PROMPTS_LIST_CHANGED: &str = "notifications/prompts/list_changed";
    pub const NOTIFICATION_CANCELLED: &str = "notifications/cancelled";
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // Constants Tests
    // ============================================================================

    #[test]
    fn test_jsonrpc_version_constant() {
        assert_eq!(JSONRPC_VERSION, "2.0");
    }

    #[test]
    fn test_mcp_protocol_version_constant() {
        assert_eq!(MCP_PROTOCOL_VERSION, "2024-11-05");
    }

    // ============================================================================
    // RequestId Tests
    // ============================================================================

    #[test]
    fn test_request_id_from_number() {
        let id: RequestId = 42i64.into();
        assert_eq!(id, RequestId::Number(42));
    }

    #[test]
    fn test_request_id_from_string() {
        let id: RequestId = "req-123".to_string().into();
        assert_eq!(id, RequestId::String("req-123".to_string()));
    }

    #[test]
    fn test_request_id_serialization_number() {
        let id = RequestId::Number(123);
        let json = serde_json::to_value(&id).unwrap();
        assert_eq!(json, 123);
    }

    #[test]
    fn test_request_id_serialization_string() {
        let id = RequestId::String("abc".to_string());
        let json = serde_json::to_value(&id).unwrap();
        assert_eq!(json, "abc");
    }

    #[test]
    fn test_request_id_deserialization_number() {
        let id: RequestId = serde_json::from_str("456").unwrap();
        assert_eq!(id, RequestId::Number(456));
    }

    #[test]
    fn test_request_id_deserialization_string() {
        let id: RequestId = serde_json::from_str("\"xyz\"").unwrap();
        assert_eq!(id, RequestId::String("xyz".to_string()));
    }

    #[test]
    fn test_request_id_equality() {
        let id1 = RequestId::Number(1);
        let id2 = RequestId::Number(1);
        let id3 = RequestId::Number(2);
        
        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
    }

    #[test]
    fn test_request_id_hash() {
        use std::collections::HashSet;
        let mut set = HashSet::new();
        set.insert(RequestId::Number(1));
        set.insert(RequestId::String("a".to_string()));
        
        assert!(set.contains(&RequestId::Number(1)));
        assert!(set.contains(&RequestId::String("a".to_string())));
        assert!(!set.contains(&RequestId::Number(2)));
    }

    // ============================================================================
    // JsonRpcRequest Tests
    // ============================================================================

    #[test]
    fn test_request_creation() {
        let request = JsonRpcRequest::new(1i64, "test/method", None);
        assert_eq!(request.jsonrpc, "2.0");
        assert_eq!(request.id, RequestId::Number(1));
        assert_eq!(request.method, "test/method");
        assert!(request.params.is_none());
    }

    #[test]
    fn test_request_with_params() {
        let params = serde_json::json!({"key": "value"});
        let request = JsonRpcRequest::new(1i64, "test", Some(params.clone()));
        assert_eq!(request.params, Some(params));
    }

    #[test]
    fn test_request_serialization() {
        let request = JsonRpcRequest::new(1i64, "test_method", Some(serde_json::json!({"key": "value"})));
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("\"jsonrpc\":\"2.0\""));
        assert!(json.contains("\"method\":\"test_method\""));
    }

    #[test]
    fn test_request_deserialization() {
        let json = r#"{"jsonrpc":"2.0","id":42,"method":"test","params":{"a":1}}"#;
        let request: JsonRpcRequest = serde_json::from_str(json).unwrap();
        
        assert_eq!(request.jsonrpc, "2.0");
        assert_eq!(request.id, RequestId::Number(42));
        assert_eq!(request.method, "test");
        assert!(request.params.is_some());
    }

    #[test]
    fn test_request_without_params_serialization() {
        let request = JsonRpcRequest::new(1i64, "test", None);
        let json = serde_json::to_string(&request).unwrap();
        
        // params should be skipped when None
        assert!(!json.contains("params"));
    }

    // ============================================================================
    // JsonRpcResponse Tests
    // ============================================================================

    #[test]
    fn test_response_success() {
        let response = JsonRpcResponse::success(RequestId::Number(1), serde_json::json!({"result": "ok"}));
        assert!(response.result.is_some());
        assert!(response.error.is_none());
    }

    #[test]
    fn test_response_error() {
        let response = JsonRpcResponse::error(
            RequestId::Number(1),
            JsonRpcError::method_not_found("unknown"),
        );
        assert!(response.result.is_none());
        assert!(response.error.is_some());
    }

    #[test]
    fn test_response_serialization_success() {
        let response = JsonRpcResponse::success(RequestId::Number(1), serde_json::json!("ok"));
        let json = serde_json::to_value(&response).unwrap();
        
        assert_eq!(json["jsonrpc"], "2.0");
        assert_eq!(json["id"], 1);
        assert_eq!(json["result"], "ok");
        assert!(json.get("error").is_none());
    }

    #[test]
    fn test_response_serialization_error() {
        let response = JsonRpcResponse::error(
            RequestId::Number(1),
            JsonRpcError::new(-32600, "Invalid Request"),
        );
        let json = serde_json::to_value(&response).unwrap();
        
        assert_eq!(json["jsonrpc"], "2.0");
        assert_eq!(json["id"], 1);
        assert!(json.get("result").is_none());
        assert_eq!(json["error"]["code"], -32600);
    }

    #[test]
    fn test_response_deserialization() {
        let json = r#"{"jsonrpc":"2.0","id":1,"result":{"status":"ok"}}"#;
        let response: JsonRpcResponse = serde_json::from_str(json).unwrap();
        
        assert_eq!(response.id, RequestId::Number(1));
        assert!(response.result.is_some());
        assert!(response.error.is_none());
    }

    // ============================================================================
    // JsonRpcError Tests
    // ============================================================================

    #[test]
    fn test_error_new() {
        let error = JsonRpcError::new(-32600, "Invalid Request");
        assert_eq!(error.code, -32600);
        assert_eq!(error.message, "Invalid Request");
        assert!(error.data.is_none());
    }

    #[test]
    fn test_error_with_data() {
        let error = JsonRpcError::with_data(-32000, "Server error", serde_json::json!({"detail": "info"}));
        assert_eq!(error.code, -32000);
        assert!(error.data.is_some());
        assert_eq!(error.data.unwrap()["detail"], "info");
    }

    #[test]
    fn test_error_parse_error() {
        let error = JsonRpcError::parse_error();
        assert_eq!(error.code, error_codes::PARSE_ERROR);
        assert_eq!(error.message, "Parse error");
    }

    #[test]
    fn test_error_invalid_request() {
        let error = JsonRpcError::invalid_request();
        assert_eq!(error.code, error_codes::INVALID_REQUEST);
        assert_eq!(error.message, "Invalid request");
    }

    #[test]
    fn test_error_method_not_found() {
        let error = JsonRpcError::method_not_found("test/method");
        assert_eq!(error.code, error_codes::METHOD_NOT_FOUND);
        assert!(error.message.contains("test/method"));
    }

    #[test]
    fn test_error_invalid_params() {
        let error = JsonRpcError::invalid_params("missing required field");
        assert_eq!(error.code, error_codes::INVALID_PARAMS);
        assert_eq!(error.message, "missing required field");
    }

    #[test]
    fn test_error_internal_error() {
        let error = JsonRpcError::internal_error("unexpected failure");
        assert_eq!(error.code, error_codes::INTERNAL_ERROR);
        assert_eq!(error.message, "unexpected failure");
    }

    #[test]
    fn test_error_serialization() {
        let error = JsonRpcError::with_data(-32000, "Error", serde_json::json!({"key": "value"}));
        let json = serde_json::to_value(&error).unwrap();
        
        assert_eq!(json["code"], -32000);
        assert_eq!(json["message"], "Error");
        assert_eq!(json["data"]["key"], "value");
    }

    // ============================================================================
    // JsonRpcNotification Tests
    // ============================================================================

    #[test]
    fn test_notification_creation() {
        let notification = JsonRpcNotification::new("notifications/test", None);
        assert_eq!(notification.jsonrpc, "2.0");
        assert_eq!(notification.method, "notifications/test");
        assert!(notification.params.is_none());
    }

    #[test]
    fn test_notification_with_params() {
        let params = serde_json::json!({"progress": 0.5});
        let notification = JsonRpcNotification::new("notifications/progress", Some(params.clone()));
        assert_eq!(notification.params, Some(params));
    }

    #[test]
    fn test_notification_serialization() {
        let notification = JsonRpcNotification::new("test", Some(serde_json::json!({"a": 1})));
        let json = serde_json::to_value(&notification).unwrap();
        
        assert_eq!(json["jsonrpc"], "2.0");
        assert_eq!(json["method"], "test");
        assert_eq!(json["params"]["a"], 1);
    }

    #[test]
    fn test_notification_deserialization() {
        let json = r#"{"jsonrpc":"2.0","method":"notifications/test","params":{"key":"value"}}"#;
        let notification: JsonRpcNotification = serde_json::from_str(json).unwrap();
        
        assert_eq!(notification.method, "notifications/test");
        assert!(notification.params.is_some());
    }

    // ============================================================================
    // JsonRpcMessage Tests
    // ============================================================================

    #[test]
    fn test_message_parse_request() {
        let json = r#"{"jsonrpc":"2.0","id":1,"method":"test"}"#;
        let message = JsonRpcMessage::parse(json).unwrap();
        
        assert!(message.is_request());
        assert!(!message.is_response());
        assert!(!message.is_notification());
    }

    #[test]
    fn test_message_parse_response() {
        let json = r#"{"jsonrpc":"2.0","id":1,"result":"ok"}"#;
        let message = JsonRpcMessage::parse(json).unwrap();
        
        assert!(!message.is_request());
        assert!(message.is_response());
        assert!(!message.is_notification());
    }

    #[test]
    fn test_message_parse_notification() {
        let json = r#"{"jsonrpc":"2.0","method":"notifications/test"}"#;
        let message = JsonRpcMessage::parse(json).unwrap();
        
        assert!(!message.is_request());
        assert!(!message.is_response());
        assert!(message.is_notification());
    }

    #[test]
    fn test_message_parse_invalid() {
        let json = "not valid json";
        let result = JsonRpcMessage::parse(json);
        assert!(result.is_err());
    }

    // ============================================================================
    // Error Codes Tests
    // ============================================================================

    #[test]
    fn test_error_codes() {
        assert_eq!(error_codes::PARSE_ERROR, -32700);
        assert_eq!(error_codes::INVALID_REQUEST, -32600);
        assert_eq!(error_codes::METHOD_NOT_FOUND, -32601);
        assert_eq!(error_codes::INVALID_PARAMS, -32602);
        assert_eq!(error_codes::INTERNAL_ERROR, -32603);
    }

    // ============================================================================
    // Method Constants Tests
    // ============================================================================

    #[test]
    fn test_lifecycle_methods() {
        assert_eq!(methods::INITIALIZE, "initialize");
        assert_eq!(methods::INITIALIZED, "notifications/initialized");
        assert_eq!(methods::PING, "ping");
    }

    #[test]
    fn test_tools_methods() {
        assert_eq!(methods::TOOLS_LIST, "tools/list");
        assert_eq!(methods::TOOLS_CALL, "tools/call");
    }

    #[test]
    fn test_resources_methods() {
        assert_eq!(methods::RESOURCES_LIST, "resources/list");
        assert_eq!(methods::RESOURCES_READ, "resources/read");
        assert_eq!(methods::RESOURCES_SUBSCRIBE, "resources/subscribe");
        assert_eq!(methods::RESOURCES_UNSUBSCRIBE, "resources/unsubscribe");
    }

    #[test]
    fn test_prompts_methods() {
        assert_eq!(methods::PROMPTS_LIST, "prompts/list");
        assert_eq!(methods::PROMPTS_GET, "prompts/get");
    }

    #[test]
    fn test_sampling_methods() {
        assert_eq!(methods::SAMPLING_CREATE_MESSAGE, "sampling/createMessage");
    }

    #[test]
    fn test_logging_methods() {
        assert_eq!(methods::LOGGING_SET_LEVEL, "logging/setLevel");
    }

    #[test]
    fn test_notification_methods() {
        assert_eq!(methods::NOTIFICATION_PROGRESS, "notifications/progress");
        assert_eq!(methods::NOTIFICATION_MESSAGE, "notifications/message");
        assert_eq!(methods::NOTIFICATION_RESOURCES_UPDATED, "notifications/resources/updated");
        assert_eq!(methods::NOTIFICATION_RESOURCES_LIST_CHANGED, "notifications/resources/list_changed");
        assert_eq!(methods::NOTIFICATION_TOOLS_LIST_CHANGED, "notifications/tools/list_changed");
        assert_eq!(methods::NOTIFICATION_PROMPTS_LIST_CHANGED, "notifications/prompts/list_changed");
        assert_eq!(methods::NOTIFICATION_CANCELLED, "notifications/cancelled");
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_request_with_negative_id() {
        let request = JsonRpcRequest::new(-1i64, "test", None);
        assert_eq!(request.id, RequestId::Number(-1));
    }

    #[test]
    fn test_request_with_zero_id() {
        let request = JsonRpcRequest::new(0i64, "test", None);
        assert_eq!(request.id, RequestId::Number(0));
    }

    #[test]
    fn test_request_with_empty_method() {
        let request = JsonRpcRequest::new(1i64, "", None);
        assert_eq!(request.method, "");
    }

    #[test]
    fn test_error_with_empty_message() {
        let error = JsonRpcError::new(-1, "");
        assert_eq!(error.message, "");
    }

    #[test]
    fn test_error_with_unicode_message() {
        let error = JsonRpcError::new(-1, "错误信息 🚨");
        assert_eq!(error.message, "错误信息 🚨");
    }

    #[test]
    fn test_notification_with_empty_method() {
        let notification = JsonRpcNotification::new("", None);
        assert_eq!(notification.method, "");
    }

    #[test]
    fn test_request_id_with_max_i64() {
        let id = RequestId::Number(i64::MAX);
        let json = serde_json::to_value(&id).unwrap();
        let deserialized: RequestId = serde_json::from_value(json).unwrap();
        assert_eq!(id, deserialized);
    }
}
