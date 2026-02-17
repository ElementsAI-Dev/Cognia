use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRuntimeConfig {
    pub provider: Option<String>,
    pub model: Option<String>,
    pub timeout_ms: Option<u64>,
    pub retry: Option<u32>,
    pub tool_bridge: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, JsonValue>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunOptions {
    pub trigger_id: Option<String>,
    pub is_replay: Option<bool>,
    pub timeout_ms: Option<u64>,
    pub request_id: Option<String>,
    pub runtime_config: Option<WorkflowRuntimeConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunRequest {
    pub definition: WorkflowDefinition,
    #[serde(default)]
    pub input: HashMap<String, JsonValue>,
    pub options: Option<WorkflowRunOptions>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowDefinition {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub steps: Vec<WorkflowStepDefinition>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowIOSchema {
    #[serde(default)]
    pub default: Option<JsonValue>,
    #[serde(flatten)]
    pub extra: HashMap<String, JsonValue>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStepDefinition {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(rename = "type")]
    pub step_type: String,
    #[serde(default, alias = "toolName", alias = "tool_name")]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub metadata: HashMap<String, JsonValue>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub inputs: HashMap<String, WorkflowIOSchema>,
    pub optional: Option<bool>,
    pub retry_count: Option<u32>,
    pub continue_on_fail: Option<bool>,
    pub error_branch: Option<String>,
    pub fallback_output: Option<JsonValue>,
    pub condition: Option<String>,
    pub code: Option<String>,
    pub language: Option<String>,
    pub expression: Option<String>,
    pub transform_type: Option<String>,
    pub loop_type: Option<String>,
    pub iterator_variable: Option<String>,
    pub collection: Option<String>,
    pub max_iterations: Option<u64>,
    pub delay_type: Option<String>,
    pub delay_ms: Option<u64>,
    pub until_time: Option<String>,
    pub cron_expression: Option<String>,
    pub webhook_url: Option<String>,
    pub method: Option<String>,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub retries: Option<u32>,
    pub allow_internal_network: Option<bool>,
    pub merge_strategy: Option<String>,
    pub timeout: Option<u64>,
    #[serde(default)]
    pub code_sandbox: Option<WorkflowCodeSandboxOptions>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WorkflowCodeRuntime {
    Auto,
    Docker,
    Podman,
    Native,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowCodeSandboxOptions {
    pub runtime: Option<WorkflowCodeRuntime>,
    pub timeout_ms: Option<u64>,
    pub memory_limit_mb: Option<u64>,
    pub network_enabled: Option<bool>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
    pub files: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowExecutionStatus {
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowStepStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Skipped,
    WaitingApproval,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowStepState {
    pub step_id: String,
    pub status: WorkflowStepStatus,
    pub input: Option<HashMap<String, JsonValue>>,
    pub output: Option<HashMap<String, JsonValue>>,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub retry_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowExecutionRecord {
    pub execution_id: String,
    pub workflow_id: String,
    pub status: WorkflowExecutionStatus,
    pub request_id: Option<String>,
    pub input: HashMap<String, JsonValue>,
    pub output: Option<HashMap<String, JsonValue>>,
    pub step_states: Vec<WorkflowStepState>,
    #[serde(default)]
    pub logs: Vec<WorkflowRuntimeLogEntry>,
    pub error: Option<String>,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub trigger_id: Option<String>,
    pub is_replay: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRunResult {
    pub execution_id: String,
    pub status: WorkflowExecutionStatus,
    pub output: Option<HashMap<String, JsonValue>>,
    pub step_states: Vec<WorkflowStepState>,
    pub error: Option<String>,
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowRuntimeEventType {
    ExecutionStarted,
    ExecutionProgress,
    StepStarted,
    StepCompleted,
    StepFailed,
    ExecutionLog,
    ExecutionCompleted,
    ExecutionFailed,
    ExecutionCancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowRuntimeLogLevel {
    Trace,
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRuntimeLogEntry {
    pub event_id: String,
    pub level: WorkflowRuntimeLogLevel,
    pub code: Option<String>,
    pub request_id: Option<String>,
    pub execution_id: String,
    pub workflow_id: String,
    pub step_id: Option<String>,
    pub trace_id: Option<String>,
    pub timestamp: String,
    pub message: Option<String>,
    pub error: Option<String>,
    pub data: Option<JsonValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowRuntimeEventPayload {
    #[serde(rename = "type")]
    pub event_type: WorkflowRuntimeEventType,
    pub event_id: Option<String>,
    pub level: Option<WorkflowRuntimeLogLevel>,
    pub code: Option<String>,
    pub trace_id: Option<String>,
    pub request_id: Option<String>,
    pub execution_id: String,
    pub workflow_id: String,
    pub timestamp: String,
    pub progress: Option<f64>,
    pub step_id: Option<String>,
    pub message: Option<String>,
    pub error: Option<String>,
    pub data: Option<JsonValue>,
}
