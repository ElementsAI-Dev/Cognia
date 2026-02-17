use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::sandbox::{ExecutionRequest, RuntimeType, SandboxState};
use crate::workflow_runtime::{WorkflowCodeRuntime, WorkflowStepDefinition};

pub(super) fn step_timeout_ms(step: &WorkflowStepDefinition, default_ms: u64) -> u64 {
    step.timeout.unwrap_or(default_ms).clamp(1, 3_600_000)
}

fn timeout_ms_to_secs(timeout_ms: u64) -> u64 {
    timeout_ms.clamp(1, 3_600_000).div_ceil(1000)
}

pub(crate) fn resolve_code_step_timeout_secs(step: &WorkflowStepDefinition) -> Option<u64> {
    step.code_sandbox
        .as_ref()
        .and_then(|options| options.timeout_ms)
        .or(step.timeout)
        .map(timeout_ms_to_secs)
}

pub(crate) fn map_workflow_code_runtime(
    runtime: Option<&WorkflowCodeRuntime>,
) -> Option<RuntimeType> {
    match runtime {
        Some(WorkflowCodeRuntime::Auto) | None => None,
        Some(WorkflowCodeRuntime::Docker) => Some(RuntimeType::Docker),
        Some(WorkflowCodeRuntime::Podman) => Some(RuntimeType::Podman),
        Some(WorkflowCodeRuntime::Native) => Some(RuntimeType::Native),
    }
}

pub(crate) async fn execute_code_step(
    execution_id: &str,
    step: &WorkflowStepDefinition,
    input: &HashMap<String, JsonValue>,
    sandbox: &SandboxState,
) -> Result<HashMap<String, JsonValue>, String> {
    let sandbox_options = step.code_sandbox.clone().unwrap_or_default();
    let mut request = ExecutionRequest::new(
        step.language
            .clone()
            .unwrap_or_else(|| "javascript".to_string()),
        step.code.clone().unwrap_or_default(),
    );

    request.id = format!("{execution_id}-{}", step.id);
    request.stdin = Some(serde_json::to_string(input).map_err(|error| error.to_string())?);
    request.runtime = map_workflow_code_runtime(sandbox_options.runtime.as_ref());
    request.timeout_secs = resolve_code_step_timeout_secs(step);
    request.memory_limit_mb = sandbox_options.memory_limit_mb;
    request.network_enabled = sandbox_options.network_enabled;
    request.env = sandbox_options.env;
    request.args = sandbox_options.args;
    request.files = sandbox_options.files;

    let result = sandbox
        .execute(request)
        .await
        .map_err(|error| error.to_string())?;

    let parsed_stdout = serde_json::from_str::<JsonValue>(&result.stdout)
        .unwrap_or_else(|_| JsonValue::String(result.stdout.clone()));

    let mut output = HashMap::new();
    output.insert("result".to_string(), parsed_stdout);
    output.insert("stderr".to_string(), JsonValue::String(result.stderr));
    output.insert(
        "exitCode".to_string(),
        result
            .exit_code
            .map(|v| JsonValue::Number(v.into()))
            .unwrap_or(JsonValue::Null),
    );
    output.insert(
        "runtime".to_string(),
        JsonValue::String(result.runtime.to_string()),
    );
    Ok(output)
}
