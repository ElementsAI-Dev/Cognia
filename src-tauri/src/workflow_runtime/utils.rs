use std::collections::HashMap;

use chrono::Utc;
use serde_json::Value as JsonValue;

use super::{WorkflowStepState, WorkflowStepStatus};

pub(crate) fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

pub(crate) fn to_json_object(map: &HashMap<String, JsonValue>) -> JsonValue {
    JsonValue::Object(map.clone().into_iter().collect())
}

pub(crate) fn map_from_json_object(value: JsonValue) -> HashMap<String, JsonValue> {
    match value {
        JsonValue::Object(map) => map.into_iter().collect(),
        other => HashMap::from([("result".to_string(), other)]),
    }
}

pub(crate) fn is_terminal_status(status: &WorkflowStepStatus) -> bool {
    matches!(
        status,
        WorkflowStepStatus::Completed | WorkflowStepStatus::Failed | WorkflowStepStatus::Skipped
    )
}

pub(crate) fn workflow_progress(step_states: &[WorkflowStepState]) -> f64 {
    if step_states.is_empty() {
        return 100.0;
    }
    let completed = step_states
        .iter()
        .filter(|state| is_terminal_status(&state.status))
        .count();
    ((completed as f64 / step_states.len() as f64) * 100.0).round()
}
