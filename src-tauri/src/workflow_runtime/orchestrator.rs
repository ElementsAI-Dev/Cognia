use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};

use serde_json::Value as JsonValue;
use tauri::AppHandle;
use uuid::Uuid;

use crate::sandbox::SandboxState;
use crate::screen_recording::ScreenRecordingManager;
use crate::workflow_runtime::events::{
    emit_execution_event, emit_execution_log, ExecutionEventArgs, ExecutionLogArgs,
};
use crate::workflow_runtime::runtime_state::{
    clear_execution_flags, is_cancelled, is_paused, persist_execution,
};
use crate::workflow_runtime::steps::{build_step_input, execute_single_step};
use crate::workflow_runtime::utils::{
    is_terminal_status, map_from_json_object, now_iso, to_json_object, workflow_progress,
};
use crate::workflow_runtime::{
    WorkflowExecutionRecord, WorkflowExecutionStatus, WorkflowRunRequest, WorkflowRunResult,
    WorkflowRuntimeEventType, WorkflowRuntimeLogLevel, WorkflowRuntimeState,
    WorkflowStepDefinition, WorkflowStepState, WorkflowStepStatus,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum StepErrorBranch {
    Stop,
    Continue,
    Fallback,
}

fn resolve_step_error_branch(step: &WorkflowStepDefinition) -> StepErrorBranch {
    if let Some(branch) = step.error_branch.as_deref() {
        return match branch {
            "continue" => StepErrorBranch::Continue,
            "fallback" => StepErrorBranch::Fallback,
            _ => StepErrorBranch::Stop,
        };
    }
    if step.continue_on_fail.unwrap_or(false) {
        StepErrorBranch::Continue
    } else {
        StepErrorBranch::Stop
    }
}

fn fallback_output(step: &WorkflowStepDefinition) -> HashMap<String, JsonValue> {
    step.fallback_output
        .clone()
        .map(map_from_json_object)
        .unwrap_or_default()
}

pub async fn run_definition(
    state: &WorkflowRuntimeState,
    sandbox: &SandboxState,
    request: WorkflowRunRequest,
    recording_manager: Option<&ScreenRecordingManager>,
    app_handle: Option<&AppHandle>,
) -> Result<WorkflowRunResult, String> {
    let execution_id = Uuid::new_v4().to_string();
    let started_at = now_iso();
    let request_id = request
        .options
        .as_ref()
        .and_then(|options| options.request_id.clone());
    let timeout_ms = request
        .options
        .as_ref()
        .and_then(|options| options.timeout_ms);
    let started_instant = Instant::now();

    let mut step_states = request
        .definition
        .steps
        .iter()
        .map(|step| WorkflowStepState {
            step_id: step.id.clone(),
            status: WorkflowStepStatus::Pending,
            input: None,
            output: None,
            error: None,
            started_at: None,
            completed_at: None,
            retry_count: 0,
        })
        .collect::<Vec<_>>();

    let mut record = WorkflowExecutionRecord {
        execution_id: execution_id.clone(),
        workflow_id: request.definition.id.clone(),
        status: WorkflowExecutionStatus::Running,
        request_id: request_id.clone(),
        input: request.input.clone(),
        output: None,
        step_states: step_states.clone(),
        logs: vec![],
        error: None,
        started_at: started_at.clone(),
        completed_at: None,
        trigger_id: request
            .options
            .as_ref()
            .and_then(|options| options.trigger_id.clone()),
        is_replay: request
            .options
            .as_ref()
            .and_then(|options| options.is_replay),
    };
    persist_execution(state, record.clone()).await;

    record.logs.push(emit_execution_event(ExecutionEventArgs {
        app_handle,
        event_type: WorkflowRuntimeEventType::ExecutionStarted,
        request_id: request_id.as_deref(),
        execution_id: &execution_id,
        workflow_id: &request.definition.id,
        progress: Some(0.0),
        step_id: None,
        message: Some("workflow execution started".to_string()),
        error: None,
        data: None,
    }));
    persist_execution(state, record.clone()).await;

    let mut outputs_by_step: HashMap<String, HashMap<String, JsonValue>> = HashMap::new();
    let mut completed_or_skipped: HashSet<String> = HashSet::new();
    let mut failed = false;
    let mut workflow_error: Option<String> = None;

    'main_loop: loop {
        if let Some(timeout_ms) = timeout_ms {
            if started_instant.elapsed() > Duration::from_millis(timeout_ms) {
                failed = true;
                workflow_error = Some(format!("workflow timeout exceeded after {timeout_ms}ms"));
                break;
            }
        }

        if is_cancelled(state, &execution_id).await {
            record.status = WorkflowExecutionStatus::Cancelled;
            record.completed_at = Some(now_iso());
            record.step_states = step_states.clone();
            persist_execution(state, record.clone()).await;
            record.logs.push(emit_execution_event(ExecutionEventArgs {
                app_handle,
                event_type: WorkflowRuntimeEventType::ExecutionCancelled,
                request_id: request_id.as_deref(),
                execution_id: &execution_id,
                workflow_id: &request.definition.id,
                progress: Some(workflow_progress(&step_states)),
                step_id: None,
                message: Some("workflow execution cancelled".to_string()),
                error: None,
                data: None,
            }));
            persist_execution(state, record.clone()).await;
            clear_execution_flags(state, &execution_id).await;
            return Ok(WorkflowRunResult {
                execution_id,
                status: WorkflowExecutionStatus::Cancelled,
                output: record.output,
                step_states: record.step_states,
                error: None,
                started_at: Some(started_at),
                completed_at: record.completed_at,
            });
        }

        if is_paused(state, &execution_id).await {
            if record.status != WorkflowExecutionStatus::Paused {
                record.status = WorkflowExecutionStatus::Paused;
                record.step_states = step_states.clone();
                persist_execution(state, record.clone()).await;
                record.logs.push(emit_execution_log(ExecutionLogArgs {
                    app_handle,
                    request_id: request_id.as_deref(),
                    execution_id: &execution_id,
                    workflow_id: &request.definition.id,
                    progress: Some(workflow_progress(&step_states)),
                    step_id: None,
                    level: WorkflowRuntimeLogLevel::Info,
                    code: "workflow.execution.paused",
                    message: Some("workflow execution paused".to_string()),
                    error: None,
                    data: None,
                }));
                persist_execution(state, record.clone()).await;
            }
            tokio::time::sleep(Duration::from_millis(150)).await;
            continue;
        }

        if record.status == WorkflowExecutionStatus::Paused {
            record.status = WorkflowExecutionStatus::Running;
            record.step_states = step_states.clone();
            persist_execution(state, record.clone()).await;
            record.logs.push(emit_execution_log(ExecutionLogArgs {
                app_handle,
                request_id: request_id.as_deref(),
                execution_id: &execution_id,
                workflow_id: &request.definition.id,
                progress: Some(workflow_progress(&step_states)),
                step_id: None,
                level: WorkflowRuntimeLogLevel::Info,
                code: "workflow.execution.resumed",
                message: Some("workflow execution resumed".to_string()),
                error: None,
                data: None,
            }));
            persist_execution(state, record.clone()).await;
        }

        let mut progressed = false;

        for (index, step) in request.definition.steps.iter().enumerate() {
            if step_states[index].status != WorkflowStepStatus::Pending {
                continue;
            }
            if let Some(timeout_ms) = timeout_ms {
                if started_instant.elapsed() > Duration::from_millis(timeout_ms) {
                    failed = true;
                    workflow_error =
                        Some(format!("workflow timeout exceeded after {timeout_ms}ms"));
                    break 'main_loop;
                }
            }

            let dependency_failed = step.dependencies.iter().any(|dependency| {
                step_states.iter().any(|state| {
                    state.step_id == *dependency && state.status == WorkflowStepStatus::Failed
                })
            });

            if dependency_failed {
                progressed = true;
                if step.optional.unwrap_or(false) {
                    step_states[index].status = WorkflowStepStatus::Skipped;
                    step_states[index].completed_at = Some(now_iso());
                    step_states[index].error =
                        Some("optional step skipped because dependency failed".to_string());
                    completed_or_skipped.insert(step.id.clone());
                    record.step_states = step_states.clone();
                    persist_execution(state, record.clone()).await;
                    emit_execution_event(ExecutionEventArgs {
                        app_handle,
                        event_type: WorkflowRuntimeEventType::StepCompleted,
                        request_id: request_id.as_deref(),
                        execution_id: &execution_id,
                        workflow_id: &request.definition.id,
                        progress: Some(workflow_progress(&step_states)),
                        step_id: Some(&step.id),
                        message: Some("optional step skipped".to_string()),
                        error: None,
                        data: Some(JsonValue::Object(
                            [("skipped".to_string(), JsonValue::Bool(true))]
                                .into_iter()
                                .collect(),
                        )),
                    });
                    emit_execution_event(ExecutionEventArgs {
                        app_handle,
                        event_type: WorkflowRuntimeEventType::ExecutionProgress,
                        request_id: request_id.as_deref(),
                        execution_id: &execution_id,
                        workflow_id: &request.definition.id,
                        progress: Some(workflow_progress(&step_states)),
                        step_id: None,
                        message: None,
                        error: None,
                        data: None,
                    });
                    continue;
                }

                let dep_error = format!("step {} blocked by failed dependency", step.id);
                step_states[index].status = WorkflowStepStatus::Failed;
                step_states[index].completed_at = Some(now_iso());
                step_states[index].error = Some(dep_error.clone());
                step_states[index].retry_count += 1;
                emit_execution_event(ExecutionEventArgs {
                    app_handle,
                    event_type: WorkflowRuntimeEventType::StepFailed,
                    request_id: request_id.as_deref(),
                    execution_id: &execution_id,
                    workflow_id: &request.definition.id,
                    progress: Some(workflow_progress(&step_states)),
                    step_id: Some(&step.id),
                    message: None,
                    error: Some(dep_error.clone()),
                    data: None,
                });

                match resolve_step_error_branch(step) {
                    StepErrorBranch::Fallback => {
                        let fallback = fallback_output(step);
                        step_states[index].status = WorkflowStepStatus::Completed;
                        step_states[index].output = Some(fallback.clone());
                        step_states[index].error = None;
                        outputs_by_step.insert(step.id.clone(), fallback.clone());
                        completed_or_skipped.insert(step.id.clone());
                        record.logs.push(emit_execution_log(ExecutionLogArgs {
                            app_handle,
                            request_id: request_id.as_deref(),
                            execution_id: &execution_id,
                            workflow_id: &request.definition.id,
                            progress: Some(workflow_progress(&step_states)),
                            step_id: Some(&step.id),
                            level: WorkflowRuntimeLogLevel::Warn,
                            code: "workflow.step.dependency_fallback_applied",
                            message: Some("dependency failed, fallbackOutput applied".to_string()),
                            error: None,
                            data: None,
                        }));
                        emit_execution_event(ExecutionEventArgs {
                            app_handle,
                            event_type: WorkflowRuntimeEventType::StepCompleted,
                            request_id: request_id.as_deref(),
                            execution_id: &execution_id,
                            workflow_id: &request.definition.id,
                            progress: Some(workflow_progress(&step_states)),
                            step_id: Some(&step.id),
                            message: Some("fallback output applied".to_string()),
                            error: None,
                            data: Some(to_json_object(&fallback)),
                        });
                    }
                    StepErrorBranch::Continue => {
                        completed_or_skipped.insert(step.id.clone());
                    }
                    StepErrorBranch::Stop => {
                        workflow_error = Some(dep_error);
                        failed = true;
                        record.step_states = step_states.clone();
                        persist_execution(state, record.clone()).await;
                        break;
                    }
                }

                record.step_states = step_states.clone();
                persist_execution(state, record.clone()).await;
                emit_execution_event(ExecutionEventArgs {
                    app_handle,
                    event_type: WorkflowRuntimeEventType::ExecutionProgress,
                    request_id: request_id.as_deref(),
                    execution_id: &execution_id,
                    workflow_id: &request.definition.id,
                    progress: Some(workflow_progress(&step_states)),
                    step_id: None,
                    message: None,
                    error: None,
                    data: None,
                });
                continue;
            }

            let ready = step
                .dependencies
                .iter()
                .all(|dependency| completed_or_skipped.contains(dependency));
            if !ready {
                continue;
            }

            progressed = true;
            step_states[index].status = WorkflowStepStatus::Running;
            step_states[index].started_at = Some(now_iso());
            let step_input = build_step_input(step, &request.input, &outputs_by_step);
            step_states[index].input = Some(step_input.clone());
            record.step_states = step_states.clone();
            persist_execution(state, record.clone()).await;
            emit_execution_event(ExecutionEventArgs {
                app_handle,
                event_type: WorkflowRuntimeEventType::StepStarted,
                request_id: request_id.as_deref(),
                execution_id: &execution_id,
                workflow_id: &request.definition.id,
                progress: Some(workflow_progress(&step_states)),
                step_id: Some(&step.id),
                message: None,
                error: None,
                data: None,
            });

            let max_retries = step.retry_count.unwrap_or(0);
            let mut last_error: Option<String> = None;
            let mut output: Option<HashMap<String, JsonValue>> = None;

            for retry_index in 0..=max_retries {
                match execute_single_step(
                    &execution_id,
                    step,
                    &step_input,
                    sandbox,
                    recording_manager,
                )
                .await
                {
                    Ok(step_output) => {
                        output = Some(step_output);
                        break;
                    }
                    Err(error) => {
                        step_states[index].retry_count += 1;
                        last_error = Some(error.clone());
                        if retry_index < max_retries {
                            record.logs.push(emit_execution_log(ExecutionLogArgs {
                                app_handle,
                                request_id: request_id.as_deref(),
                                execution_id: &execution_id,
                                workflow_id: &request.definition.id,
                                progress: Some(workflow_progress(&step_states)),
                                step_id: Some(&step.id),
                                level: WorkflowRuntimeLogLevel::Warn,
                                code: "workflow.step.retrying",
                                message: Some(format!(
                                    "retrying step (attempt {}/{})",
                                    retry_index + 1,
                                    max_retries
                                )),
                                error: Some(error),
                                data: None,
                            }));
                        }
                    }
                }
            }

            if let Some(step_output) = output {
                step_states[index].status = WorkflowStepStatus::Completed;
                step_states[index].output = Some(step_output.clone());
                step_states[index].error = None;
                step_states[index].completed_at = Some(now_iso());
                outputs_by_step.insert(step.id.clone(), step_output.clone());
                completed_or_skipped.insert(step.id.clone());
                emit_execution_event(ExecutionEventArgs {
                    app_handle,
                    event_type: WorkflowRuntimeEventType::StepCompleted,
                    request_id: request_id.as_deref(),
                    execution_id: &execution_id,
                    workflow_id: &request.definition.id,
                    progress: Some(workflow_progress(&step_states)),
                    step_id: Some(&step.id),
                    message: None,
                    error: None,
                    data: Some(to_json_object(&step_output)),
                });
            } else {
                let error = last_error
                    .unwrap_or_else(|| format!("step {} failed without error details", step.id));
                step_states[index].status = WorkflowStepStatus::Failed;
                step_states[index].error = Some(error.clone());
                step_states[index].completed_at = Some(now_iso());
                emit_execution_event(ExecutionEventArgs {
                    app_handle,
                    event_type: WorkflowRuntimeEventType::StepFailed,
                    request_id: request_id.as_deref(),
                    execution_id: &execution_id,
                    workflow_id: &request.definition.id,
                    progress: Some(workflow_progress(&step_states)),
                    step_id: Some(&step.id),
                    message: None,
                    error: Some(error.clone()),
                    data: None,
                });

                match resolve_step_error_branch(step) {
                    StepErrorBranch::Fallback => {
                        let fallback = fallback_output(step);
                        step_states[index].status = WorkflowStepStatus::Completed;
                        step_states[index].output = Some(fallback.clone());
                        step_states[index].error = None;
                        outputs_by_step.insert(step.id.clone(), fallback.clone());
                        completed_or_skipped.insert(step.id.clone());
                        record.logs.push(emit_execution_log(ExecutionLogArgs {
                            app_handle,
                            request_id: request_id.as_deref(),
                            execution_id: &execution_id,
                            workflow_id: &request.definition.id,
                            progress: Some(workflow_progress(&step_states)),
                            step_id: Some(&step.id),
                            level: WorkflowRuntimeLogLevel::Warn,
                            code: "workflow.step.failure_fallback_applied",
                            message: Some("fallbackOutput applied after failure".to_string()),
                            error: None,
                            data: None,
                        }));
                        emit_execution_event(ExecutionEventArgs {
                            app_handle,
                            event_type: WorkflowRuntimeEventType::StepCompleted,
                            request_id: request_id.as_deref(),
                            execution_id: &execution_id,
                            workflow_id: &request.definition.id,
                            progress: Some(workflow_progress(&step_states)),
                            step_id: Some(&step.id),
                            message: Some("fallback output applied".to_string()),
                            error: None,
                            data: Some(to_json_object(&fallback)),
                        });
                    }
                    StepErrorBranch::Continue => {
                        completed_or_skipped.insert(step.id.clone());
                        workflow_error.get_or_insert(format!("step {} failed: {error}", step.id));
                    }
                    StepErrorBranch::Stop => {
                        workflow_error = Some(format!("step {} failed: {error}", step.id));
                        failed = true;
                    }
                }
            }

            record.step_states = step_states.clone();
            persist_execution(state, record.clone()).await;
            emit_execution_event(ExecutionEventArgs {
                app_handle,
                event_type: WorkflowRuntimeEventType::ExecutionProgress,
                request_id: request_id.as_deref(),
                execution_id: &execution_id,
                workflow_id: &request.definition.id,
                progress: Some(workflow_progress(&step_states)),
                step_id: None,
                message: None,
                error: None,
                data: None,
            });

            if failed {
                break;
            }
        }

        if failed {
            break;
        }
        let all_done = step_states
            .iter()
            .all(|state| is_terminal_status(&state.status));
        if all_done {
            break;
        }
        if !progressed {
            failed = true;
            workflow_error =
                Some("workflow stuck: unresolved dependencies or unsupported cycle".to_string());
            break;
        }
    }

    let mut final_output = HashMap::new();
    for (step_id, step_output) in &outputs_by_step {
        final_output.insert(step_id.clone(), to_json_object(step_output));
        for (key, value) in step_output {
            final_output.insert(key.clone(), value.clone());
        }
    }

    record.status = if failed {
        WorkflowExecutionStatus::Failed
    } else {
        WorkflowExecutionStatus::Completed
    };
    record.error = workflow_error.clone();
    record.output = Some(final_output.clone());
    record.step_states = step_states.clone();
    record.completed_at = Some(now_iso());
    persist_execution(state, record.clone()).await;
    clear_execution_flags(state, &execution_id).await;

    match record.status {
        WorkflowExecutionStatus::Completed => {
            record.logs.push(emit_execution_event(ExecutionEventArgs {
                app_handle,
                event_type: WorkflowRuntimeEventType::ExecutionCompleted,
                request_id: request_id.as_deref(),
                execution_id: &execution_id,
                workflow_id: &request.definition.id,
                progress: Some(100.0),
                step_id: None,
                message: Some("workflow execution completed".to_string()),
                error: None,
                data: Some(to_json_object(&final_output)),
            }));
        }
        WorkflowExecutionStatus::Failed => {
            record.logs.push(emit_execution_event(ExecutionEventArgs {
                app_handle,
                event_type: WorkflowRuntimeEventType::ExecutionFailed,
                request_id: request_id.as_deref(),
                execution_id: &execution_id,
                workflow_id: &request.definition.id,
                progress: Some(workflow_progress(&step_states)),
                step_id: None,
                message: None,
                error: workflow_error.clone(),
                data: Some(to_json_object(&final_output)),
            }));
        }
        _ => {}
    }
    persist_execution(state, record.clone()).await;

    Ok(WorkflowRunResult {
        execution_id: execution_id.clone(),
        status: record.status,
        output: Some(final_output),
        step_states,
        error: workflow_error,
        started_at: Some(started_at),
        completed_at: record.completed_at,
    })
}
