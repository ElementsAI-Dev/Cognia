use std::cmp::Ordering;
use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::workflow_runtime::expression::{evaluate_expression, expression_to_bool, parse_lambda};
use crate::workflow_runtime::WorkflowStepDefinition;

pub(crate) fn execute_transform_step(
    step: &WorkflowStepDefinition,
    input: &HashMap<String, JsonValue>,
) -> Result<HashMap<String, JsonValue>, String> {
    let expression = step.expression.clone().unwrap_or_default();
    if expression.trim().is_empty() {
        return Ok(input.clone());
    }

    let data = input
        .get("data")
        .cloned()
        .unwrap_or_else(|| JsonValue::Object(input.clone().into_iter().collect()));
    let transform_type = step
        .transform_type
        .clone()
        .unwrap_or_else(|| "custom".to_string());

    let mut output = HashMap::new();

    match transform_type.as_str() {
        "map" => {
            let arr = data
                .as_array()
                .ok_or_else(|| "map transform requires array input".to_string())?;
            let lambda = parse_lambda(&expression);
            let mapped = arr
                .iter()
                .enumerate()
                .map(|(index, item)| {
                    let mut ctx = input.clone();
                    ctx.insert("item".to_string(), item.clone());
                    ctx.insert(
                        "index".to_string(),
                        JsonValue::Number((index as i64).into()),
                    );
                    if let Some((params, _)) = &lambda {
                        if let Some(first) = params.first() {
                            ctx.insert(first.clone(), item.clone());
                        }
                        if let Some(second) = params.get(1) {
                            ctx.insert(second.clone(), JsonValue::Number((index as i64).into()));
                        }
                    }
                    let body = lambda
                        .as_ref()
                        .map(|(_, body)| body.clone())
                        .unwrap_or_else(|| expression.clone());
                    evaluate_expression(&body, &ctx)
                })
                .collect::<Result<Vec<_>, _>>()?;
            output.insert("result".to_string(), JsonValue::Array(mapped));
        }
        "filter" => {
            let arr = data
                .as_array()
                .ok_or_else(|| "filter transform requires array input".to_string())?;
            let lambda = parse_lambda(&expression);
            let mut filtered = Vec::new();
            for (index, item) in arr.iter().enumerate() {
                let mut ctx = input.clone();
                ctx.insert("item".to_string(), item.clone());
                ctx.insert(
                    "index".to_string(),
                    JsonValue::Number((index as i64).into()),
                );
                if let Some((params, _)) = &lambda {
                    if let Some(first) = params.first() {
                        ctx.insert(first.clone(), item.clone());
                    }
                    if let Some(second) = params.get(1) {
                        ctx.insert(second.clone(), JsonValue::Number((index as i64).into()));
                    }
                }
                let body = lambda
                    .as_ref()
                    .map(|(_, body)| body.clone())
                    .unwrap_or_else(|| expression.clone());
                let keep = expression_to_bool(evaluate_expression(&body, &ctx)?);
                if keep {
                    filtered.push(item.clone());
                }
            }
            output.insert("result".to_string(), JsonValue::Array(filtered));
        }
        "reduce" => {
            let arr = data
                .as_array()
                .ok_or_else(|| "reduce transform requires array input".to_string())?;
            let lambda = parse_lambda(&expression);
            let mut acc = JsonValue::Null;
            for (index, item) in arr.iter().enumerate() {
                let mut ctx = input.clone();
                ctx.insert("acc".to_string(), acc.clone());
                ctx.insert("item".to_string(), item.clone());
                ctx.insert(
                    "index".to_string(),
                    JsonValue::Number((index as i64).into()),
                );
                if let Some((params, _)) = &lambda {
                    if let Some(name) = params.first() {
                        ctx.insert(name.clone(), acc.clone());
                    }
                    if let Some(name) = params.get(1) {
                        ctx.insert(name.clone(), item.clone());
                    }
                }
                let body = lambda
                    .as_ref()
                    .map(|(_, body)| body.clone())
                    .unwrap_or_else(|| expression.clone());
                acc = evaluate_expression(&body, &ctx)?;
            }
            output.insert("result".to_string(), acc);
        }
        "sort" => {
            let arr = data
                .as_array()
                .ok_or_else(|| "sort transform requires array input".to_string())?
                .clone();
            let lambda = parse_lambda(&expression);
            let body = lambda
                .as_ref()
                .map(|(_, body)| body.clone())
                .unwrap_or_else(|| expression.clone());
            let mut sorted = arr;
            sorted.sort_by(|a, b| {
                let mut ctx = input.clone();
                ctx.insert("a".to_string(), a.clone());
                ctx.insert("b".to_string(), b.clone());
                if let Some((params, _)) = &lambda {
                    if let Some(name) = params.first() {
                        ctx.insert(name.clone(), a.clone());
                    }
                    if let Some(name) = params.get(1) {
                        ctx.insert(name.clone(), b.clone());
                    }
                }
                match evaluate_expression(&body, &ctx) {
                    Ok(JsonValue::Number(v)) => v
                        .as_f64()
                        .and_then(|n| n.partial_cmp(&0.0))
                        .unwrap_or(Ordering::Equal),
                    Ok(JsonValue::Bool(v)) => {
                        if v {
                            Ordering::Greater
                        } else {
                            Ordering::Less
                        }
                    }
                    _ => Ordering::Equal,
                }
            });
            output.insert("result".to_string(), JsonValue::Array(sorted));
        }
        _ => {
            let mut ctx = input.clone();
            ctx.insert("data".to_string(), data);
            output.insert(
                "result".to_string(),
                evaluate_expression(&expression, &ctx)?,
            );
        }
    }

    Ok(output)
}
