mod code;
mod delay;
mod input;
mod loop_step;
mod merge;
mod tool;
mod transform;
mod webhook;

use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::sandbox::SandboxState;
use crate::screen_recording::ScreenRecordingManager;
use crate::workflow_runtime::expression::evaluate_expression;
use crate::workflow_runtime::WorkflowStepDefinition;

#[cfg(test)]
pub(crate) use code::{map_workflow_code_runtime, resolve_code_step_timeout_secs};
#[cfg(test)]
pub(crate) use delay::execute_delay_step;
pub(crate) use input::build_step_input;
#[cfg(test)]
pub(crate) use merge::execute_merge_step;
#[cfg(test)]
pub(crate) use webhook::execute_webhook_step;

pub(crate) async fn execute_single_step(
    execution_id: &str,
    step: &WorkflowStepDefinition,
    step_input: &HashMap<String, JsonValue>,
    sandbox: &SandboxState,
    recording_manager: Option<&ScreenRecordingManager>,
) -> Result<HashMap<String, JsonValue>, String> {
    match step.step_type.as_str() {
        "conditional" => {
            let condition = step.condition.clone().unwrap_or_else(|| "true".to_string());
            let mut output = step_input.clone();
            output.insert(
                "conditionResult".to_string(),
                evaluate_expression(&condition, step_input)?,
            );
            Ok(output)
        }
        "transform" => transform::execute_transform_step(step, step_input),
        "loop" => loop_step::execute_loop_step(step, step_input),
        "delay" => delay::execute_delay_step(step).await,
        "merge" => merge::execute_merge_step(step, step_input),
        "webhook" => webhook::execute_webhook_step(step, step_input).await,
        "code" => code::execute_code_step(execution_id, step, step_input, sandbox).await,
        "tool" => tool::execute_tool_step(step, step_input, recording_manager).await,
        _ => Ok(step_input.clone()),
    }
}
