use std::collections::HashMap;

use serde_json::Value as JsonValue;
use tempfile::TempDir;

use super::*;
use crate::sandbox::{RuntimeType, SandboxState};
use crate::workflow_runtime::steps::execute_single_step;

async fn create_sandbox_state() -> (TempDir, SandboxState) {
    let dir = TempDir::new().expect("temp dir should be created");
    let config_path = dir.path().join("sandbox_config.json");
    let sandbox = SandboxState::new(config_path)
        .await
        .expect("sandbox should initialize");
    (dir, sandbox)
}

#[tokio::test]
async fn applies_retry_and_fallback_output() {
    let (_sandbox_dir, sandbox) = create_sandbox_state().await;
    let state = WorkflowRuntimeState::new_in_memory();
    let request = WorkflowRunRequest {
        definition: WorkflowDefinition {
            id: "wf-retry-fallback".to_string(),
            name: "retry fallback".to_string(),
            description: String::new(),
            steps: vec![
                WorkflowStepDefinition {
                    id: "step-1".to_string(),
                    step_type: "transform".to_string(),
                    expression: Some("missing_var + 1".to_string()),
                    retry_count: Some(1),
                    error_branch: Some("fallback".to_string()),
                    fallback_output: Some(JsonValue::Object(
                        [(
                            "value".to_string(),
                            JsonValue::String("fallback".to_string()),
                        )]
                        .into_iter()
                        .collect(),
                    )),
                    ..Default::default()
                },
                WorkflowStepDefinition {
                    id: "step-2".to_string(),
                    step_type: "transform".to_string(),
                    expression: Some("value".to_string()),
                    dependencies: vec!["step-1".to_string()],
                    ..Default::default()
                },
            ],
        },
        input: HashMap::new(),
        options: None,
    };

    let result = run_definition(&state, &sandbox, request, None, None)
        .await
        .expect("run should succeed");
    assert_eq!(result.status, WorkflowExecutionStatus::Completed);
    let step1 = result
        .step_states
        .iter()
        .find(|step| step.step_id == "step-1")
        .expect("step-1 should exist");
    assert_eq!(step1.status, WorkflowStepStatus::Completed);
    assert_eq!(step1.retry_count, 2);

    let record = get_execution(&state, &result.execution_id)
        .await
        .expect("execution record should be persisted");
    assert!(
        record.logs.iter().any(|entry| {
            entry.code.as_deref() == Some("workflow.step.retrying")
                && entry.level == WorkflowRuntimeLogLevel::Warn
        }),
        "expected retry log entry"
    );
    assert!(
        record.logs.iter().any(|entry| {
            entry.code.as_deref() == Some("workflow.step.failure_fallback_applied")
                && entry.level == WorkflowRuntimeLogLevel::Warn
        }),
        "expected fallback log entry"
    );
}

#[tokio::test]
async fn skips_optional_step_when_dependency_failed() {
    let (_sandbox_dir, sandbox) = create_sandbox_state().await;
    let state = WorkflowRuntimeState::new_in_memory();
    let request = WorkflowRunRequest {
        definition: WorkflowDefinition {
            id: "wf-optional-skip".to_string(),
            name: "optional skip".to_string(),
            description: String::new(),
            steps: vec![
                WorkflowStepDefinition {
                    id: "step-fail".to_string(),
                    step_type: "transform".to_string(),
                    expression: Some("missing_input + 1".to_string()),
                    error_branch: Some("continue".to_string()),
                    ..Default::default()
                },
                WorkflowStepDefinition {
                    id: "step-optional".to_string(),
                    step_type: "transform".to_string(),
                    expression: Some("1".to_string()),
                    dependencies: vec!["step-fail".to_string()],
                    optional: Some(true),
                    ..Default::default()
                },
            ],
        },
        input: HashMap::new(),
        options: None,
    };

    let result = run_definition(&state, &sandbox, request, None, None)
        .await
        .expect("run should complete");
    assert_eq!(result.status, WorkflowExecutionStatus::Completed);
    let optional = result
        .step_states
        .iter()
        .find(|step| step.step_id == "step-optional")
        .expect("optional step should exist");
    assert_eq!(optional.status, WorkflowStepStatus::Skipped);
}

#[tokio::test]
async fn fails_when_global_timeout_reached() {
    let (_sandbox_dir, sandbox) = create_sandbox_state().await;
    let state = WorkflowRuntimeState::new_in_memory();
    let request = WorkflowRunRequest {
        definition: WorkflowDefinition {
            id: "wf-timeout".to_string(),
            name: "timeout".to_string(),
            description: String::new(),
            steps: vec![
                WorkflowStepDefinition {
                    id: "step-delay".to_string(),
                    step_type: "delay".to_string(),
                    delay_type: Some("fixed".to_string()),
                    delay_ms: Some(30),
                    ..Default::default()
                },
                WorkflowStepDefinition {
                    id: "step-after".to_string(),
                    step_type: "transform".to_string(),
                    expression: Some("1".to_string()),
                    dependencies: vec!["step-delay".to_string()],
                    ..Default::default()
                },
            ],
        },
        input: HashMap::new(),
        options: Some(WorkflowRunOptions {
            timeout_ms: Some(5),
            ..Default::default()
        }),
    };

    let result = run_definition(&state, &sandbox, request, None, None)
        .await
        .expect("run should return result");
    assert_eq!(result.status, WorkflowExecutionStatus::Failed);
    assert!(
        result
            .error
            .unwrap_or_default()
            .contains("timeout exceeded"),
        "expected timeout error"
    );

    let record = get_execution(&state, &result.execution_id)
        .await
        .expect("execution record should exist");
    assert!(
        record.logs.iter().any(|entry| {
            entry.code.as_deref() == Some("workflow.execution.failed")
                && entry.level == WorkflowRuntimeLogLevel::Error
        }),
        "expected failed execution log entry"
    );
}

#[tokio::test]
async fn supports_merge_and_delay_cron_semantics() {
    let merge_step = WorkflowStepDefinition {
        id: "merge".to_string(),
        step_type: "merge".to_string(),
        merge_strategy: Some("concat".to_string()),
        ..Default::default()
    };
    let merge_input = HashMap::from([
        (
            "a".to_string(),
            JsonValue::Array(vec![JsonValue::from(1), JsonValue::from(2)]),
        ),
        ("b".to_string(), JsonValue::Array(vec![JsonValue::from(3)])),
    ]);
    let merged = execute_merge_step(&merge_step, &merge_input).expect("merge should succeed");
    assert_eq!(
        merged.get("result"),
        Some(&JsonValue::Array(vec![
            JsonValue::from(1),
            JsonValue::from(2),
            JsonValue::from(3)
        ]))
    );

    let delay_step = WorkflowStepDefinition {
        id: "delay".to_string(),
        step_type: "delay".to_string(),
        delay_type: Some("cron".to_string()),
        cron_expression: Some("0 * * * *".to_string()),
        ..Default::default()
    };
    let delayed = execute_delay_step(&delay_step)
        .await
        .expect("delay should succeed");
    assert_eq!(
        delayed.get("mode"),
        Some(&JsonValue::String("cron".to_string()))
    );
}

#[tokio::test]
async fn blocks_internal_webhook_host_by_default() {
    let step = WorkflowStepDefinition {
        id: "webhook".to_string(),
        step_type: "webhook".to_string(),
        webhook_url: Some("http://127.0.0.1/internal".to_string()),
        method: Some("POST".to_string()),
        ..Default::default()
    };
    let input = HashMap::new();
    let result = execute_webhook_step(&step, &input).await;
    assert!(result.is_err(), "internal host should be blocked");
}

#[tokio::test]
async fn recording_tool_requires_manager_in_non_desktop_runtime() {
    let (_sandbox_dir, sandbox) = create_sandbox_state().await;
    let step = WorkflowStepDefinition {
        id: "tool-recording-status".to_string(),
        step_type: "tool".to_string(),
        tool_name: Some("recording_status".to_string()),
        ..Default::default()
    };
    let step_input = HashMap::new();

    let result = execute_single_step("exec-id", &step, &step_input, &sandbox, None).await;
    assert!(
        result.is_err(),
        "recording tool without manager should fail"
    );
    assert!(
        result
            .err()
            .unwrap_or_default()
            .contains("requires desktop recording manager"),
        "error should explain missing desktop manager"
    );
}

#[tokio::test]
async fn non_recording_tool_passthrough_keeps_compatibility() {
    let (_sandbox_dir, sandbox) = create_sandbox_state().await;
    let step = WorkflowStepDefinition {
        id: "tool-web-search".to_string(),
        step_type: "tool".to_string(),
        tool_name: Some("web_search".to_string()),
        ..Default::default()
    };
    let step_input = HashMap::from([(
        "query".to_string(),
        JsonValue::String("rust tauri".to_string()),
    )]);

    let output = execute_single_step("exec-id", &step, &step_input, &sandbox, None)
        .await
        .expect("non-recording tool should passthrough");
    assert_eq!(output.get("query"), step_input.get("query"));
}

#[tokio::test]
async fn loads_recent_records_from_sqlite_on_state_init() {
    let storage = WorkflowRuntimeStorage::in_memory().expect("in-memory storage");
    let record = WorkflowExecutionRecord {
        execution_id: "exec-1".to_string(),
        workflow_id: "wf".to_string(),
        status: WorkflowExecutionStatus::Completed,
        request_id: Some("req-1".to_string()),
        input: HashMap::new(),
        output: None,
        step_states: vec![],
        logs: vec![],
        error: None,
        started_at: now_iso(),
        completed_at: Some(now_iso()),
        trigger_id: None,
        is_replay: Some(false),
    };
    storage
        .upsert_execution(&record, WORKFLOW_RUNTIME_RETENTION_LIMIT)
        .expect("upsert should work");

    let state = WorkflowRuntimeState::from_test_storage(storage);
    let got = get_execution(&state, "exec-1").await;
    assert!(got.is_some(), "record should be loaded into runtime state");
}

#[test]
fn converts_code_step_timeout_ms_to_seconds() {
    let step = WorkflowStepDefinition {
        step_type: "code".to_string(),
        timeout: Some(30_000),
        ..Default::default()
    };
    assert_eq!(resolve_code_step_timeout_secs(&step), Some(30));

    let step = WorkflowStepDefinition {
        step_type: "code".to_string(),
        timeout: Some(1),
        ..Default::default()
    };
    assert_eq!(resolve_code_step_timeout_secs(&step), Some(1));
}

#[test]
fn code_sandbox_timeout_overrides_step_timeout() {
    let step = WorkflowStepDefinition {
        step_type: "code".to_string(),
        timeout: Some(60_000),
        code_sandbox: Some(WorkflowCodeSandboxOptions {
            timeout_ms: Some(1),
            ..Default::default()
        }),
        ..Default::default()
    };
    assert_eq!(resolve_code_step_timeout_secs(&step), Some(1));
}

#[test]
fn maps_workflow_code_runtime_auto_to_none() {
    assert_eq!(
        map_workflow_code_runtime(Some(&WorkflowCodeRuntime::Auto)),
        None
    );
    assert_eq!(
        map_workflow_code_runtime(Some(&WorkflowCodeRuntime::Native)),
        Some(RuntimeType::Native)
    );
}
