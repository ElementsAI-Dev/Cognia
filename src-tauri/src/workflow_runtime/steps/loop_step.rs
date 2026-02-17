use std::collections::HashMap;

use serde_json::{Map as JsonMap, Value as JsonValue};

use crate::workflow_runtime::expression::{evaluate_expression, expression_to_bool};
use crate::workflow_runtime::utils::to_json_object;
use crate::workflow_runtime::WorkflowStepDefinition;

pub(crate) fn execute_loop_step(
    step: &WorkflowStepDefinition,
    input: &HashMap<String, JsonValue>,
) -> Result<HashMap<String, JsonValue>, String> {
    let loop_type = step
        .loop_type
        .clone()
        .unwrap_or_else(|| "forEach".to_string());
    let max_iterations = step.max_iterations.unwrap_or(100);
    let iterator_variable = step
        .iterator_variable
        .clone()
        .unwrap_or_else(|| "item".to_string());
    let mut iterations = Vec::new();

    match loop_type.as_str() {
        "times" => {
            for idx in 0..max_iterations {
                let mut item = JsonMap::new();
                item.insert(
                    iterator_variable.clone(),
                    JsonValue::Number((idx as i64).into()),
                );
                iterations.push(JsonValue::Object(item));
            }
        }
        "while" => {
            let condition = step
                .condition
                .clone()
                .ok_or_else(|| "while loop requires condition".to_string())?;
            let mut index = 0_u64;
            while index < max_iterations {
                let mut ctx = input.clone();
                ctx.insert(
                    "iteration".to_string(),
                    JsonValue::Number((index as i64).into()),
                );
                ctx.insert("input".to_string(), to_json_object(input));
                if !expression_to_bool(evaluate_expression(&condition, &ctx)?) {
                    break;
                }
                let mut item = JsonMap::new();
                item.insert(
                    iterator_variable.clone(),
                    JsonValue::Number((index as i64).into()),
                );
                iterations.push(JsonValue::Object(item));
                index += 1;
            }
        }
        _ => {
            let key = step
                .collection
                .clone()
                .unwrap_or_else(|| "collection".to_string());
            let collection = input
                .get(&key)
                .or_else(|| input.get("collection"))
                .and_then(|value| value.as_array())
                .ok_or_else(|| "forEach loop requires array collection input".to_string())?;
            for (idx, value) in collection.iter().enumerate().take(max_iterations as usize) {
                let mut item = JsonMap::new();
                item.insert(iterator_variable.clone(), value.clone());
                item.insert("index".to_string(), JsonValue::Number((idx as i64).into()));
                iterations.push(JsonValue::Object(item));
            }
        }
    }

    let mut output = HashMap::new();
    output.insert(
        "iterations".to_string(),
        JsonValue::Array(iterations.clone()),
    );
    output.insert(
        "count".to_string(),
        JsonValue::Number((iterations.len() as i64).into()),
    );
    Ok(output)
}
