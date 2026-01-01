//! Jupyter Message Protocol
//!
//! Simplified implementation of the Jupyter messaging protocol for kernel communication.
//! Based on: https://jupyter-client.readthedocs.io/en/stable/messaging.html

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Jupyter message header
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageHeader {
    pub msg_id: String,
    pub msg_type: String,
    pub session: String,
    pub username: String,
    pub date: String,
    pub version: String,
}

impl MessageHeader {
    pub fn new(msg_type: &str, session: &str) -> Self {
        Self {
            msg_id: uuid::Uuid::new_v4().to_string(),
            msg_type: msg_type.to_string(),
            session: session.to_string(),
            username: "cognia".to_string(),
            date: chrono::Utc::now().to_rfc3339(),
            version: "5.3".to_string(),
        }
    }
}

/// Generic Jupyter message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelMessage<T> {
    pub header: MessageHeader,
    pub parent_header: Option<MessageHeader>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub content: T,
    pub buffers: Vec<Vec<u8>>,
}

/// Execute request content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteRequest {
    pub code: String,
    pub silent: bool,
    pub store_history: bool,
    pub user_expressions: HashMap<String, String>,
    pub allow_stdin: bool,
    pub stop_on_error: bool,
}

impl ExecuteRequest {
    pub fn new(code: String) -> Self {
        Self {
            code,
            silent: false,
            store_history: true,
            user_expressions: HashMap::new(),
            allow_stdin: false,
            stop_on_error: true,
        }
    }
}

/// Execute reply content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteReply {
    pub status: String,
    pub execution_count: u32,
    #[serde(default)]
    pub user_expressions: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub payload: Vec<serde_json::Value>,
}

/// Stream output message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamMessage {
    pub name: String, // "stdout" or "stderr"
    pub text: String,
}

/// Display data message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayDataMessage {
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub transient: Option<HashMap<String, serde_json::Value>>,
}

/// Execute result message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecuteResultMessage {
    pub execution_count: u32,
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Error message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorMessage {
    pub ename: String,
    pub evalue: String,
    pub traceback: Vec<String>,
}

/// Kernel status message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusMessage {
    pub execution_state: String, // "busy", "idle", "starting"
}

/// Kernel info reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KernelInfoReply {
    pub protocol_version: String,
    pub implementation: String,
    pub implementation_version: String,
    pub language_info: LanguageInfo,
    pub banner: String,
    pub debugger: bool,
    pub help_links: Vec<HelpLink>,
}

/// Language info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageInfo {
    pub name: String,
    pub version: String,
    pub mimetype: String,
    pub file_extension: String,
    pub pygments_lexer: String,
    pub codemirror_mode: serde_json::Value,
    pub nbconvert_exporter: String,
}

/// Help link
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelpLink {
    pub text: String,
    pub url: String,
}

/// Output data representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputData {
    #[serde(rename = "outputType")]
    pub output_type: OutputType,
    pub content: OutputContent,
}

/// Output type enum
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutputType {
    Stream,
    DisplayData,
    ExecuteResult,
    Error,
}

/// Output content variants
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum OutputContent {
    Stream {
        name: String,
        text: String,
    },
    DisplayData {
        data: HashMap<String, String>,
        metadata: HashMap<String, serde_json::Value>,
    },
    ExecuteResult {
        execution_count: u32,
        data: HashMap<String, String>,
    },
    Error {
        ename: String,
        evalue: String,
        traceback: Vec<String>,
    },
}

/// Inspect request (for variable inspection)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectRequest {
    pub code: String,
    pub cursor_pos: u32,
    pub detail_level: u32,
}

/// Inspect reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectReply {
    pub status: String,
    pub found: bool,
    pub data: HashMap<String, String>,
    pub metadata: HashMap<String, serde_json::Value>,
}

/// Complete request (for autocomplete)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteRequest {
    pub code: String,
    pub cursor_pos: u32,
}

/// Complete reply
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteReply {
    pub status: String,
    pub matches: Vec<String>,
    pub cursor_start: u32,
    pub cursor_end: u32,
    pub metadata: HashMap<String, serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_message_header_creation() {
        let header = MessageHeader::new("execute_request", "test-session");
        assert_eq!(header.msg_type, "execute_request");
        assert_eq!(header.session, "test-session");
        assert_eq!(header.version, "5.3");
    }

    #[test]
    fn test_execute_request_creation() {
        let request = ExecuteRequest::new("print('hello')".to_string());
        assert_eq!(request.code, "print('hello')");
        assert!(!request.silent);
        assert!(request.store_history);
    }

    #[test]
    fn test_execute_request_serialization() {
        let request = ExecuteRequest::new("x = 1".to_string());
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("x = 1"));
    }

    #[test]
    fn test_stream_message_serialization() {
        let stream = StreamMessage {
            name: "stdout".to_string(),
            text: "Hello, World!".to_string(),
        };
        let json = serde_json::to_string(&stream).unwrap();
        assert!(json.contains("stdout"));
        assert!(json.contains("Hello, World!"));
    }

    #[test]
    fn test_error_message_serialization() {
        let error = ErrorMessage {
            ename: "ValueError".to_string(),
            evalue: "invalid value".to_string(),
            traceback: vec!["line 1".to_string(), "line 2".to_string()],
        };
        let json = serde_json::to_string(&error).unwrap();
        assert!(json.contains("ValueError"));
    }
}
