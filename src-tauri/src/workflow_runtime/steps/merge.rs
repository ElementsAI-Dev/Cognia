use std::collections::HashMap;

use serde_json::{Map as JsonMap, Value as JsonValue};

use crate::workflow_runtime::expression::evaluate_expression;
use crate::workflow_runtime::utils::to_json_object;
use crate::workflow_runtime::WorkflowStepDefinition;

pub(crate) fn execute_merge_step(
    step: &WorkflowStepDefinition,
    input: &HashMap<String, JsonValue>,
) -> Result<HashMap<String, JsonValue>, String> {
    let strategy = step
        .merge_strategy
        .clone()
        .unwrap_or_else(|| "merge".to_string());
    let values = input.values().cloned().collect::<Vec<_>>();
    let mut output = HashMap::new();

    let merged = match strategy.as_str() {
        "concat" => {
            let mut concatenated = Vec::new();
            for value in values {
                if let JsonValue::Array(mut arr) = value {
                    concatenated.append(&mut arr);
                }
            }
            JsonValue::Array(concatenated)
        }
        "first" => values.first().cloned().unwrap_or(JsonValue::Null),
        "last" => values.last().cloned().unwrap_or(JsonValue::Null),
        "custom" => {
            if let Some(expression) = step.expression.as_deref() {
                if expression.trim().is_empty() {
                    to_json_object(input)
                } else {
                    evaluate_expression(expression, input)?
                }
            } else {
                to_json_object(input)
            }
        }
        _ => {
            let mut merged = JsonMap::new();
            for value in values {
                if let JsonValue::Object(map) = value {
                    merged.extend(map);
                }
            }
            JsonValue::Object(merged)
        }
    };

    output.insert("result".to_string(), merged);
    output.insert("mergeStrategy".to_string(), JsonValue::String(strategy));
    Ok(output)
}
