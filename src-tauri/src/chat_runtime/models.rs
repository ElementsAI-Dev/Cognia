use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChatBackupPayload {
    #[serde(default)]
    pub sessions: Vec<JsonValue>,
    #[serde(default)]
    pub messages: Vec<JsonValue>,
    #[serde(default)]
    pub projects: Vec<JsonValue>,
    #[serde(default)]
    pub knowledge_files: Vec<JsonValue>,
    #[serde(default)]
    pub summaries: Vec<JsonValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatImportResult {
    pub imported_sessions: usize,
    pub imported_messages: usize,
    pub imported_projects: usize,
    pub imported_knowledge_files: usize,
    pub imported_summaries: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessagesPage {
    pub items: Vec<JsonValue>,
    pub limit: usize,
    pub offset: usize,
    pub total: usize,
    pub has_more: bool,
}
