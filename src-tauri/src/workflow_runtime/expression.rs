use std::collections::HashMap;

use rhai::{Dynamic, Engine, Map as RhaiMap, Scope};
use serde_json::{Map as JsonMap, Value as JsonValue};

pub(crate) fn json_to_dynamic(value: &JsonValue) -> Dynamic {
    match value {
        JsonValue::Null => Dynamic::UNIT,
        JsonValue::Bool(v) => Dynamic::from_bool(*v),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                Dynamic::from_int(i)
            } else if let Some(f) = n.as_f64() {
                Dynamic::from_float(f)
            } else {
                Dynamic::UNIT
            }
        }
        JsonValue::String(s) => Dynamic::from(s.clone()),
        JsonValue::Array(arr) => {
            let values = arr.iter().map(json_to_dynamic).collect::<rhai::Array>();
            Dynamic::from_array(values)
        }
        JsonValue::Object(map) => {
            let mut out = RhaiMap::new();
            for (k, v) in map {
                out.insert(k.into(), json_to_dynamic(v));
            }
            Dynamic::from_map(out)
        }
    }
}

pub(crate) fn dynamic_to_json(value: Dynamic) -> JsonValue {
    if value.is::<()>() {
        return JsonValue::Null;
    }
    if let Some(v) = value.clone().try_cast::<bool>() {
        return JsonValue::Bool(v);
    }
    if let Some(v) = value.clone().try_cast::<i64>() {
        return JsonValue::Number(v.into());
    }
    if let Some(v) = value.clone().try_cast::<f64>() {
        return serde_json::Number::from_f64(v)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null);
    }
    if let Some(v) = value.clone().try_cast::<String>() {
        return JsonValue::String(v);
    }
    if let Some(v) = value.clone().try_cast::<rhai::Array>() {
        return JsonValue::Array(v.into_iter().map(dynamic_to_json).collect());
    }
    if let Some(v) = value.clone().try_cast::<RhaiMap>() {
        let mut out = JsonMap::new();
        for (k, val) in v {
            out.insert(k.to_string(), dynamic_to_json(val));
        }
        return JsonValue::Object(out);
    }
    JsonValue::String(value.to_string())
}

pub(crate) fn evaluate_expression(
    expression: &str,
    context: &HashMap<String, JsonValue>,
) -> Result<JsonValue, String> {
    let mut engine = Engine::new();
    engine.set_max_operations(10_000);
    engine.set_max_expr_depths(32, 32);
    engine.set_strict_variables(true);

    let mut scope = Scope::new();
    for (key, value) in context {
        scope.push_dynamic(key.to_string(), json_to_dynamic(value));
    }

    engine
        .eval_with_scope::<Dynamic>(&mut scope, expression)
        .map(dynamic_to_json)
        .map_err(|error| format!("expression evaluation failed: {error}"))
}

pub(crate) fn parse_lambda(expression: &str) -> Option<(Vec<String>, String)> {
    let (left, right) = expression.split_once("=>")?;
    let params = left.trim().trim_start_matches('(').trim_end_matches(')');
    let parameter_list = params
        .split(',')
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
        .collect::<Vec<_>>();
    let body = right.trim().to_string();
    Some((parameter_list, body))
}

pub(crate) fn expression_to_bool(value: JsonValue) -> bool {
    match value {
        JsonValue::Bool(v) => v,
        JsonValue::Number(v) => v.as_f64().map(|n| n != 0.0).unwrap_or(false),
        JsonValue::String(v) => !v.is_empty(),
        JsonValue::Array(v) => !v.is_empty(),
        JsonValue::Object(v) => !v.is_empty(),
        JsonValue::Null => false,
    }
}

pub(crate) fn render_template(template: &str, input: &HashMap<String, JsonValue>) -> String {
    let mut rendered = template.to_string();
    for (key, value) in input {
        let replacement = match value {
            JsonValue::String(raw) => raw.clone(),
            _ => value.to_string(),
        };
        rendered = rendered.replace(&format!("{{{{{key}}}}}"), &replacement);
    }
    rendered
}
