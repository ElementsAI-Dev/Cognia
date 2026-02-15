//! Jupyter Message Protocol
//!
//! Simplified implementation of the Jupyter messaging protocol for kernel communication.
//! Based on: https://jupyter-client.readthedocs.io/en/stable/messaging.html

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
    /// Create a new message header for Jupyter protocol messages
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
}
