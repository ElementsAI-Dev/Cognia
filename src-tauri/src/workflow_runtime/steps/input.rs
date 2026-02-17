use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::workflow_runtime::utils::to_json_object;
use crate::workflow_runtime::WorkflowStepDefinition;

pub(crate) fn build_step_input(
    step: &WorkflowStepDefinition,
    workflow_input: &HashMap<String, JsonValue>,
    outputs_by_step: &HashMap<String, HashMap<String, JsonValue>>,
) -> HashMap<String, JsonValue> {
    let mut input = workflow_input.clone();

    for dep in &step.dependencies {
        if let Some(output) = outputs_by_step.get(dep) {
            for (key, value) in output {
                input.insert(key.clone(), value.clone());
            }
            input.insert(dep.clone(), to_json_object(output));
        }
    }

    for (key, schema) in &step.inputs {
        if !input.contains_key(key) {
            if let Some(default) = &schema.default {
                input.insert(key.clone(), default.clone());
            }
        }
    }

    input
}
