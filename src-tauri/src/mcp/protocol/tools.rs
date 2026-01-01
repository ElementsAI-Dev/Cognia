//! Tools protocol handlers

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::mcp::types::{McpTool, ToolCallResult};

/// Request params for tools/list
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ToolsListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// Response for tools/list
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolsListResponse {
    pub tools: Vec<McpTool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Request params for tools/call
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolsCallParams {
    pub name: String,
    #[serde(default)]
    pub arguments: Value,
}

/// Response for tools/call
pub type ToolsCallResponse = ToolCallResult;

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // ToolsListParams Tests
    // ============================================================================

    #[test]
    fn test_tools_list_params_default() {
        let params = ToolsListParams::default();
        assert!(params.cursor.is_none());
    }

    #[test]
    fn test_tools_list_params_with_cursor() {
        let params = ToolsListParams {
            cursor: Some("page-token-123".to_string()),
        };
        assert_eq!(params.cursor, Some("page-token-123".to_string()));
    }

    #[test]
    fn test_tools_list_params_serialization() {
        let params = ToolsListParams {
            cursor: Some("next".to_string()),
        };
        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["cursor"], "next");
    }

    #[test]
    fn test_tools_list_params_serialization_without_cursor() {
        let params = ToolsListParams::default();
        let json = serde_json::to_string(&params).unwrap();
        // cursor should be skipped when None
        assert!(!json.contains("cursor"));
    }

    #[test]
    fn test_tools_list_params_deserialization() {
        let json = r#"{"cursor": "abc123"}"#;
        let params: ToolsListParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.cursor, Some("abc123".to_string()));
    }

    #[test]
    fn test_tools_list_params_deserialization_empty() {
        let json = r#"{}"#;
        let params: ToolsListParams = serde_json::from_str(json).unwrap();
        assert!(params.cursor.is_none());
    }

    // ============================================================================
    // ToolsListResponse Tests
    // ============================================================================

    #[test]
    fn test_tools_list_response_empty() {
        let response = ToolsListResponse {
            tools: vec![],
            next_cursor: None,
        };
        assert!(response.tools.is_empty());
        assert!(response.next_cursor.is_none());
    }

    #[test]
    fn test_tools_list_response_with_tools() {
        let response = ToolsListResponse {
            tools: vec![
                McpTool {
                    name: "tool1".to_string(),
                    description: Some("First tool".to_string()),
                    input_schema: serde_json::json!({"type": "object"}),
                },
                McpTool {
                    name: "tool2".to_string(),
                    description: None,
                    input_schema: serde_json::json!({}),
                },
            ],
            next_cursor: Some("page2".to_string()),
        };
        assert_eq!(response.tools.len(), 2);
        assert_eq!(response.next_cursor, Some("page2".to_string()));
    }

    #[test]
    fn test_tools_list_response_serialization() {
        let response = ToolsListResponse {
            tools: vec![McpTool {
                name: "test_tool".to_string(),
                description: Some("A test tool".to_string()),
                input_schema: serde_json::json!({
                    "type": "object",
                    "properties": {
                        "input": {"type": "string"}
                    }
                }),
            }],
            next_cursor: None,
        };

        let json = serde_json::to_value(&response).unwrap();
        assert_eq!(json["tools"][0]["name"], "test_tool");
        assert!(json.get("nextCursor").is_none());
    }

    #[test]
    fn test_tools_list_response_deserialization() {
        let json = r#"{
            "tools": [
                {
                    "name": "read_file",
                    "description": "Read file contents",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "path": {"type": "string"}
                        },
                        "required": ["path"]
                    }
                }
            ],
            "nextCursor": "token123"
        }"#;

        let response: ToolsListResponse = serde_json::from_str(json).unwrap();
        assert_eq!(response.tools.len(), 1);
        assert_eq!(response.tools[0].name, "read_file");
        assert_eq!(response.next_cursor, Some("token123".to_string()));
    }

    // ============================================================================
    // ToolsCallParams Tests
    // ============================================================================

    #[test]
    fn test_tools_call_params_creation() {
        let params = ToolsCallParams {
            name: "my_tool".to_string(),
            arguments: serde_json::json!({"arg1": "value1"}),
        };
        assert_eq!(params.name, "my_tool");
    }

    #[test]
    fn test_tools_call_params_with_empty_arguments() {
        let params = ToolsCallParams {
            name: "simple_tool".to_string(),
            arguments: serde_json::json!({}),
        };
        assert_eq!(params.arguments, serde_json::json!({}));
    }

    #[test]
    fn test_tools_call_params_serialization() {
        let params = ToolsCallParams {
            name: "write_file".to_string(),
            arguments: serde_json::json!({
                "path": "/tmp/test.txt",
                "content": "Hello, World!"
            }),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["name"], "write_file");
        assert_eq!(json["arguments"]["path"], "/tmp/test.txt");
        assert_eq!(json["arguments"]["content"], "Hello, World!");
    }

    #[test]
    fn test_tools_call_params_deserialization() {
        let json = r#"{
            "name": "execute_command",
            "arguments": {
                "command": "ls",
                "args": ["-la"]
            }
        }"#;

        let params: ToolsCallParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.name, "execute_command");
        assert_eq!(params.arguments["command"], "ls");
    }

    #[test]
    fn test_tools_call_params_deserialization_default_arguments() {
        let json = r#"{"name": "no_args_tool"}"#;
        let params: ToolsCallParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.name, "no_args_tool");
        // arguments should default to null
        assert!(params.arguments.is_null());
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_tools_call_params_with_complex_arguments() {
        let params = ToolsCallParams {
            name: "complex_tool".to_string(),
            arguments: serde_json::json!({
                "nested": {
                    "array": [1, 2, 3],
                    "object": {"key": "value"}
                },
                "number": 42,
                "boolean": true,
                "null_value": null
            }),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["arguments"]["nested"]["array"][0], 1);
        assert_eq!(json["arguments"]["number"], 42);
        assert_eq!(json["arguments"]["boolean"], true);
        assert!(json["arguments"]["null_value"].is_null());
    }

    #[test]
    fn test_tools_list_response_with_many_tools() {
        let tools: Vec<McpTool> = (0..100)
            .map(|i| McpTool {
                name: format!("tool_{}", i),
                description: Some(format!("Tool number {}", i)),
                input_schema: serde_json::json!({}),
            })
            .collect();

        let response = ToolsListResponse {
            tools,
            next_cursor: None,
        };

        assert_eq!(response.tools.len(), 100);
        assert_eq!(response.tools[50].name, "tool_50");
    }

    #[test]
    fn test_tools_call_params_with_unicode_name() {
        let params = ToolsCallParams {
            name: "工具_🔧".to_string(),
            arguments: serde_json::json!({"input": "测试"}),
        };

        let json = serde_json::to_value(&params).unwrap();
        let deserialized: ToolsCallParams = serde_json::from_value(json).unwrap();
        assert_eq!(deserialized.name, "工具_🔧");
    }

    #[test]
    fn test_tools_list_params_with_empty_cursor() {
        let params = ToolsListParams {
            cursor: Some(String::new()),
        };

        let json = serde_json::to_value(&params).unwrap();
        assert_eq!(json["cursor"], "");
    }
}
