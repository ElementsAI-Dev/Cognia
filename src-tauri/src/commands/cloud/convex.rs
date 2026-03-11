//! Convex cloud sync Tauri commands
//!
//! The deploy key is NOT stored in the config file (it's `#[serde(skip)]`).
//! Instead, it's managed by the TypeScript credential-storage layer via Stronghold.
//! When `convex_set_config` receives a deploy_key, it is passed through to the
//! ConvexState in-memory only so the Rust HTTP client can authenticate.

use serde_json::Value as JsonValue;
use tauri::State;

use crate::convex::ConvexState;

#[tauri::command]
pub async fn convex_get_config(
    state: State<'_, ConvexState>,
) -> Result<JsonValue, String> {
    let config = state.get_config().await;
    serde_json::to_value(&config).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn convex_set_config(
    config: JsonValue,
    state: State<'_, ConvexState>,
) -> Result<bool, String> {
    let mut new_config: crate::convex::config::ConvexConfig =
        serde_json::from_value(config.clone()).map_err(|e| format!("Invalid config: {}", e))?;
    new_config.deployment_url = new_config
        .deployment_url
        .trim()
        .trim_end_matches('/')
        .to_string();

    // deploy_key is #[serde(skip)] so won't deserialize from JSON.
    // Extract it manually from the raw JSON if present (for in-memory use only).
    if let Some(key) = config.get("deployKey").and_then(|v| v.as_str()) {
        new_config.deploy_key = key.trim().to_string();
    }

    state
        .set_config(new_config)
        .await
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
pub async fn convex_test_connection(
    state: State<'_, ConvexState>,
) -> Result<bool, String> {
    state
        .test_connection()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn convex_is_connected(
    state: State<'_, ConvexState>,
) -> Result<bool, String> {
    Ok(state.is_connected().await)
}
