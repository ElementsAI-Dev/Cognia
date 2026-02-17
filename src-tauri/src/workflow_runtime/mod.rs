//! Workflow runtime bridge.
//!
//! Provides a Rust-side workflow execution runtime used by Tauri commands and scheduler bridge.

mod constants;
mod control;
mod events;
mod expression;
mod model;
mod orchestrator;
mod runtime_state;
mod steps;
mod storage;
mod utils;

#[cfg(test)]
mod tests;

pub use control::{
    cancel_execution, get_execution, list_executions, pause_execution, resume_execution,
};
#[allow(unused_imports)]
pub use model::{
    WorkflowCodeRuntime, WorkflowCodeSandboxOptions, WorkflowDefinition, WorkflowExecutionRecord,
    WorkflowExecutionStatus, WorkflowIOSchema, WorkflowRunOptions, WorkflowRunRequest,
    WorkflowRunResult, WorkflowRuntimeConfig, WorkflowRuntimeEventPayload,
    WorkflowRuntimeEventType, WorkflowRuntimeLogEntry, WorkflowRuntimeLogLevel,
    WorkflowStepDefinition, WorkflowStepState, WorkflowStepStatus,
};
pub use orchestrator::run_definition;
#[allow(unused_imports)]
pub use runtime_state::{WorkflowRuntimeManager, WorkflowRuntimeState};
pub use storage::WorkflowRuntimeStorage;

#[cfg(test)]
pub(crate) use constants::WORKFLOW_RUNTIME_RETENTION_LIMIT;
#[cfg(test)]
pub(crate) use steps::{
    execute_delay_step, execute_merge_step, execute_webhook_step, map_workflow_code_runtime,
    resolve_code_step_timeout_secs,
};
#[cfg(test)]
pub(crate) use utils::now_iso;
