//! Prompts protocol handlers

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::mcp::types::{McpPrompt, PromptContent};

/// Request params for prompts/list
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PromptsListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// Response for prompts/list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptsListResponse {
    pub prompts: Vec<McpPrompt>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Request params for prompts/get
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptsGetParams {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub arguments: Option<Value>,
}

/// Response for prompts/get
pub type PromptsGetResponse = PromptContent;
