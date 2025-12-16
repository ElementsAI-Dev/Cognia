//! Resources protocol handlers

use serde::{Deserialize, Serialize};

use crate::mcp::types::{McpResource, ResourceContent};

/// Request params for resources/list
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResourcesListParams {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
}

/// Response for resources/list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesListResponse {
    pub resources: Vec<McpResource>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

/// Request params for resources/read
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesReadParams {
    pub uri: String,
}

/// Response for resources/read
pub type ResourcesReadResponse = ResourceContent;

/// Request params for resources/subscribe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesSubscribeParams {
    pub uri: String,
}

/// Request params for resources/unsubscribe
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesUnsubscribeParams {
    pub uri: String,
}

/// Resource updated notification params
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUpdatedParams {
    pub uri: String,
}
