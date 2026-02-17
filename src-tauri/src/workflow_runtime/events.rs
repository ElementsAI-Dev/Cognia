use serde_json::Value as JsonValue;
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use super::constants::WORKFLOW_RUNTIME_EVENT_CHANNEL;
use super::utils::now_iso;
use super::{
    WorkflowRuntimeEventPayload, WorkflowRuntimeEventType, WorkflowRuntimeLogEntry,
    WorkflowRuntimeLogLevel,
};

pub(crate) fn emit_runtime_event(
    app_handle: Option<&AppHandle>,
    payload: WorkflowRuntimeEventPayload,
) {
    if let Some(app_handle) = app_handle {
        if let Err(error) = app_handle.emit(WORKFLOW_RUNTIME_EVENT_CHANNEL, payload) {
            log::debug!("[workflow-runtime] emit event failed: {error}");
        }
    }
}

fn default_level_for_event(event_type: &WorkflowRuntimeEventType) -> WorkflowRuntimeLogLevel {
    match event_type {
        WorkflowRuntimeEventType::ExecutionStarted
        | WorkflowRuntimeEventType::ExecutionProgress
        | WorkflowRuntimeEventType::StepStarted
        | WorkflowRuntimeEventType::StepCompleted
        | WorkflowRuntimeEventType::ExecutionCompleted => WorkflowRuntimeLogLevel::Info,
        WorkflowRuntimeEventType::ExecutionLog => WorkflowRuntimeLogLevel::Info,
        WorkflowRuntimeEventType::StepFailed | WorkflowRuntimeEventType::ExecutionFailed => {
            WorkflowRuntimeLogLevel::Error
        }
        WorkflowRuntimeEventType::ExecutionCancelled => WorkflowRuntimeLogLevel::Warn,
    }
}

fn default_code_for_event(event_type: &WorkflowRuntimeEventType) -> &'static str {
    match event_type {
        WorkflowRuntimeEventType::ExecutionStarted => "workflow.execution.started",
        WorkflowRuntimeEventType::ExecutionProgress => "workflow.execution.progress",
        WorkflowRuntimeEventType::StepStarted => "workflow.step.started",
        WorkflowRuntimeEventType::StepCompleted => "workflow.step.completed",
        WorkflowRuntimeEventType::StepFailed => "workflow.step.failed",
        WorkflowRuntimeEventType::ExecutionLog => "workflow.execution.log",
        WorkflowRuntimeEventType::ExecutionCompleted => "workflow.execution.completed",
        WorkflowRuntimeEventType::ExecutionFailed => "workflow.execution.failed",
        WorkflowRuntimeEventType::ExecutionCancelled => "workflow.execution.cancelled",
    }
}

fn emit_execution_event_inner(
    app_handle: Option<&AppHandle>,
    event_type: WorkflowRuntimeEventType,
    request_id: Option<&str>,
    execution_id: &str,
    workflow_id: &str,
    progress: Option<f64>,
    step_id: Option<&str>,
    message: Option<String>,
    error: Option<String>,
    data: Option<JsonValue>,
    level: WorkflowRuntimeLogLevel,
    code: Option<String>,
    trace_id: Option<&str>,
) -> WorkflowRuntimeLogEntry {
    let timestamp = now_iso();
    let event_id = Uuid::new_v4().to_string();
    let resolved_code = code.unwrap_or_else(|| default_code_for_event(&event_type).to_string());
    let request_id_owned = request_id.map(str::to_string);
    let step_id_owned = step_id.map(str::to_string);
    let trace_id_owned = trace_id
        .map(str::to_string)
        .or_else(|| request_id_owned.clone());

    emit_runtime_event(
        app_handle,
        WorkflowRuntimeEventPayload {
            event_type,
            event_id: Some(event_id.clone()),
            level: Some(level.clone()),
            code: Some(resolved_code.clone()),
            trace_id: trace_id_owned.clone(),
            request_id: request_id_owned.clone(),
            execution_id: execution_id.to_string(),
            workflow_id: workflow_id.to_string(),
            timestamp: timestamp.clone(),
            progress,
            step_id: step_id_owned.clone(),
            message: message.clone(),
            error: error.clone(),
            data: data.clone(),
        },
    );

    WorkflowRuntimeLogEntry {
        event_id,
        level,
        code: Some(resolved_code),
        request_id: request_id_owned,
        execution_id: execution_id.to_string(),
        workflow_id: workflow_id.to_string(),
        step_id: step_id_owned,
        trace_id: trace_id_owned,
        timestamp,
        message,
        error,
        data,
    }
}

pub(crate) fn emit_execution_event(
    app_handle: Option<&AppHandle>,
    event_type: WorkflowRuntimeEventType,
    request_id: Option<&str>,
    execution_id: &str,
    workflow_id: &str,
    progress: Option<f64>,
    step_id: Option<&str>,
    message: Option<String>,
    error: Option<String>,
    data: Option<JsonValue>,
) -> WorkflowRuntimeLogEntry {
    let level = default_level_for_event(&event_type);
    emit_execution_event_inner(
        app_handle,
        event_type,
        request_id,
        execution_id,
        workflow_id,
        progress,
        step_id,
        message,
        error,
        data,
        level,
        None,
        None,
    )
}

pub(crate) fn emit_execution_log(
    app_handle: Option<&AppHandle>,
    request_id: Option<&str>,
    execution_id: &str,
    workflow_id: &str,
    progress: Option<f64>,
    step_id: Option<&str>,
    level: WorkflowRuntimeLogLevel,
    code: &str,
    message: Option<String>,
    error: Option<String>,
    data: Option<JsonValue>,
) -> WorkflowRuntimeLogEntry {
    emit_execution_event_inner(
        app_handle,
        WorkflowRuntimeEventType::ExecutionLog,
        request_id,
        execution_id,
        workflow_id,
        progress,
        step_id,
        message,
        error,
        data,
        level,
        Some(code.to_string()),
        None,
    )
}
