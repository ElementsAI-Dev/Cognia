use std::collections::HashMap;

use serde_json::Value as JsonValue;

use crate::screen_recording::{RecordingRegion, ScreenRecordingManager};
use crate::workflow_runtime::WorkflowStepDefinition;

fn read_value_from_input_or_metadata<'a>(
    step_input: &'a HashMap<String, JsonValue>,
    step: &'a WorkflowStepDefinition,
    keys: &[&str],
) -> Option<&'a JsonValue> {
    for key in keys {
        if let Some(value) = step_input.get(*key) {
            return Some(value);
        }
        if let Some(value) = step.metadata.get(*key) {
            return Some(value);
        }
    }
    None
}

fn read_optional_usize(
    step_input: &HashMap<String, JsonValue>,
    step: &WorkflowStepDefinition,
    keys: &[&str],
) -> Option<usize> {
    read_value_from_input_or_metadata(step_input, step, keys)
        .and_then(|value| {
            value
                .as_u64()
                .or_else(|| value.as_i64().map(|v| v.max(0) as u64))
        })
        .map(|value| value as usize)
}

fn read_optional_string(
    step_input: &HashMap<String, JsonValue>,
    step: &WorkflowStepDefinition,
    keys: &[&str],
) -> Option<String> {
    read_value_from_input_or_metadata(step_input, step, keys)
        .and_then(|value| value.as_str())
        .map(str::to_string)
}

fn parse_recording_region(
    step_input: &HashMap<String, JsonValue>,
    step: &WorkflowStepDefinition,
) -> Result<RecordingRegion, String> {
    if let Some(JsonValue::Object(region)) =
        read_value_from_input_or_metadata(step_input, step, &["region"])
    {
        let x = region
            .get("x")
            .and_then(|value| value.as_i64())
            .ok_or_else(|| "recording_start_region requires region.x".to_string())?
            as i32;
        let y = region
            .get("y")
            .and_then(|value| value.as_i64())
            .ok_or_else(|| "recording_start_region requires region.y".to_string())?
            as i32;
        let width = region
            .get("width")
            .and_then(|value| value.as_u64())
            .ok_or_else(|| "recording_start_region requires region.width".to_string())?
            as u32;
        let height = region
            .get("height")
            .and_then(|value| value.as_u64())
            .ok_or_else(|| "recording_start_region requires region.height".to_string())?
            as u32;
        return Ok(RecordingRegion {
            x,
            y,
            width,
            height,
        });
    }

    let x = read_value_from_input_or_metadata(step_input, step, &["x"])
        .and_then(|value| value.as_i64())
        .ok_or_else(|| "recording_start_region requires x".to_string())? as i32;
    let y = read_value_from_input_or_metadata(step_input, step, &["y"])
        .and_then(|value| value.as_i64())
        .ok_or_else(|| "recording_start_region requires y".to_string())? as i32;
    let width = read_value_from_input_or_metadata(step_input, step, &["width"])
        .and_then(|value| value.as_u64())
        .ok_or_else(|| "recording_start_region requires width".to_string())? as u32;
    let height = read_value_from_input_or_metadata(step_input, step, &["height"])
        .and_then(|value| value.as_u64())
        .ok_or_else(|| "recording_start_region requires height".to_string())?
        as u32;

    Ok(RecordingRegion {
        x,
        y,
        width,
        height,
    })
}

pub(crate) async fn execute_tool_step(
    step: &WorkflowStepDefinition,
    step_input: &HashMap<String, JsonValue>,
    recording_manager: Option<&ScreenRecordingManager>,
) -> Result<HashMap<String, JsonValue>, String> {
    let Some(tool_name) = step.tool_name.as_deref() else {
        return Ok(step_input.clone());
    };

    if !tool_name.starts_with("recording_") {
        return Ok(step_input.clone());
    }

    let manager = recording_manager.ok_or_else(|| {
        format!(
            "recording tool '{}' requires desktop recording manager state",
            tool_name
        )
    })?;

    let mut output = HashMap::new();
    match tool_name {
        "recording_start_fullscreen" => {
            let monitor_index =
                read_optional_usize(step_input, step, &["monitorIndex", "monitor_index"]);
            let recording_id = manager.start_fullscreen(monitor_index).await?;
            output.insert("recordingId".to_string(), JsonValue::String(recording_id));
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Idle".to_string())),
            );
            output.insert(
                "durationMs".to_string(),
                JsonValue::Number((manager.get_duration() as i64).into()),
            );
        }
        "recording_start_window" => {
            let window_title =
                read_optional_string(step_input, step, &["windowTitle", "window_title"]);
            let recording_id = manager.start_window(window_title).await?;
            output.insert("recordingId".to_string(), JsonValue::String(recording_id));
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Idle".to_string())),
            );
            output.insert(
                "durationMs".to_string(),
                JsonValue::Number((manager.get_duration() as i64).into()),
            );
        }
        "recording_start_region" => {
            let region = parse_recording_region(step_input, step)?;
            let recording_id = manager.start_region(region).await?;
            output.insert("recordingId".to_string(), JsonValue::String(recording_id));
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Idle".to_string())),
            );
            output.insert(
                "durationMs".to_string(),
                JsonValue::Number((manager.get_duration() as i64).into()),
            );
        }
        "recording_pause" => {
            manager.pause()?;
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Paused".to_string())),
            );
        }
        "recording_resume" => {
            manager.resume()?;
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Recording".to_string())),
            );
        }
        "recording_stop" => {
            let metadata = manager.stop().await?;
            output.insert(
                "recordingId".to_string(),
                JsonValue::String(metadata.id.clone()),
            );
            output.insert(
                "metadata".to_string(),
                serde_json::to_value(metadata).unwrap_or(JsonValue::Null),
            );
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Idle".to_string())),
            );
        }
        "recording_cancel" => {
            manager.cancel()?;
            output.insert("cancelled".to_string(), JsonValue::Bool(true));
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Idle".to_string())),
            );
        }
        "recording_status" => {
            output.insert(
                "status".to_string(),
                serde_json::to_value(manager.get_status())
                    .unwrap_or(JsonValue::String("Idle".to_string())),
            );
        }
        "recording_duration" => {
            output.insert(
                "durationMs".to_string(),
                JsonValue::Number((manager.get_duration() as i64).into()),
            );
        }
        _ => {
            return Err(format!("unsupported recording tool '{tool_name}'"));
        }
    }

    Ok(output)
}
