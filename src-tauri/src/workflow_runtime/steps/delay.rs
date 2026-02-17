use std::collections::HashMap;
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde_json::Value as JsonValue;

use crate::workflow_runtime::WorkflowStepDefinition;

pub(crate) async fn execute_delay_step(
    step: &WorkflowStepDefinition,
) -> Result<HashMap<String, JsonValue>, String> {
    let delay_type = step
        .delay_type
        .clone()
        .unwrap_or_else(|| "fixed".to_string());
    let mut output = HashMap::new();

    match delay_type.as_str() {
        "until" => {
            let until_time = step
                .until_time
                .clone()
                .ok_or_else(|| "delay type 'until' requires untilTime".to_string())?;
            let target = DateTime::parse_from_rfc3339(&until_time)
                .map_err(|error| format!("invalid untilTime: {error}"))?;
            let target_utc = target.with_timezone(&Utc);
            let now = Utc::now();
            if target_utc > now {
                let wait_ms = (target_utc.timestamp_millis() - now.timestamp_millis()) as u64;
                tokio::time::sleep(Duration::from_millis(wait_ms)).await;
                output.insert("delayed".to_string(), JsonValue::Bool(true));
                output.insert(
                    "delayMs".to_string(),
                    JsonValue::Number((wait_ms as i64).into()),
                );
            } else {
                output.insert("delayed".to_string(), JsonValue::Bool(false));
                output.insert(
                    "reason".to_string(),
                    JsonValue::String("until_time_in_past".to_string()),
                );
            }
            output.insert("untilTime".to_string(), JsonValue::String(until_time));
            Ok(output)
        }
        "cron" => {
            output.insert("delayed".to_string(), JsonValue::Bool(false));
            output.insert("mode".to_string(), JsonValue::String("cron".to_string()));
            output.insert(
                "cronExpression".to_string(),
                JsonValue::String(step.cron_expression.clone().unwrap_or_default()),
            );
            output.insert(
                "note".to_string(),
                JsonValue::String(
                    "cron scheduling is non-blocking in runtime execution".to_string(),
                ),
            );
            Ok(output)
        }
        _ => {
            let delay_ms = step.delay_ms.unwrap_or(0).min(60 * 60 * 1000);
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            output.insert("delayed".to_string(), JsonValue::Bool(true));
            output.insert(
                "delayMs".to_string(),
                JsonValue::Number((delay_ms as i64).into()),
            );
            output.insert("mode".to_string(), JsonValue::String("fixed".to_string()));
            Ok(output)
        }
    }
}
