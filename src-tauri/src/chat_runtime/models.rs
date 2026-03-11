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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSchemaDiagnostics {
    pub compatible: bool,
    pub expected_schema_version: Option<i64>,
    pub actual_schema_version: Option<i64>,
    pub reason_code: Option<String>,
    pub reason: Option<String>,
}

impl ChatSchemaDiagnostics {
    pub fn compatible(expected_schema_version: Option<i64>, actual_schema_version: i64) -> Self {
        Self {
            compatible: true,
            expected_schema_version,
            actual_schema_version: Some(actual_schema_version),
            reason_code: None,
            reason: None,
        }
    }

    pub fn mismatch(expected_schema_version: i64, actual_schema_version: i64) -> Self {
        Self {
            compatible: false,
            expected_schema_version: Some(expected_schema_version),
            actual_schema_version: Some(actual_schema_version),
            reason_code: Some("schema-mismatch".to_string()),
            reason: Some(format!(
                "expected schema version {expected_schema_version}, got {actual_schema_version}"
            )),
        }
    }

    pub fn read_failed(expected_schema_version: Option<i64>, message: String) -> Self {
        Self {
            compatible: false,
            expected_schema_version,
            actual_schema_version: None,
            reason_code: Some("schema-read-failed".to_string()),
            reason: Some(message),
        }
    }
}
