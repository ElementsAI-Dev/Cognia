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
