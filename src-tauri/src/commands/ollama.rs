//! Ollama API commands for local model management

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures::StreamExt;

/// Ollama model information
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub model: String,
    pub modified_at: String,
    pub size: u64,
    pub digest: String,
    pub details: Option<OllamaModelDetails>,
}

/// Ollama model details
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaModelDetails {
    pub parent_model: Option<String>,
    pub format: Option<String>,
    pub family: Option<String>,
    pub families: Option<Vec<String>>,
    pub parameter_size: Option<String>,
    pub quantization_level: Option<String>,
}

/// Ollama server status
#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaServerStatus {
    pub connected: bool,
    pub version: Option<String>,
    pub models_count: u32,
}

/// Ollama model pull progress
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaPullProgress {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
    pub model: String,
}

/// Ollama running model info
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaRunningModel {
    pub name: String,
    pub model: String,
    pub size: u64,
    pub digest: String,
    pub expires_at: Option<String>,
    pub size_vram: Option<u64>,
}

/// Ollama model show response
#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModelInfo {
    pub modelfile: Option<String>,
    pub parameters: Option<String>,
    pub template: Option<String>,
    pub details: Option<OllamaModelDetails>,
    pub model_info: Option<serde_json::Value>,
}

/// Helper to normalize base URL
fn normalize_base_url(base_url: &str) -> String {
    let url = base_url.trim_end_matches('/');
    // Remove /v1 suffix if present (OpenAI compat endpoint)
    if url.ends_with("/v1") {
        url[..url.len() - 3].to_string()
    } else {
        url.to_string()
    }
}

/// Get Ollama server status and version
#[tauri::command]
pub async fn ollama_get_status(base_url: String) -> Result<OllamaServerStatus, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Try to get version from /api/version endpoint
    let version_result = client
        .get(format!("{}/api/version", url))
        .send()
        .await;

    let version = match version_result {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            body.get("version").and_then(|v| v.as_str()).map(|s| s.to_string())
        }
        _ => None,
    };

    // Get model count
    let models_result = client
        .get(format!("{}/api/tags", url))
        .send()
        .await;

    let (connected, models_count) = match models_result {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            let count = body
                .get("models")
                .and_then(|m| m.as_array())
                .map(|a| a.len() as u32)
                .unwrap_or(0);
            (true, count)
        }
        Ok(_) => (true, 0),
        Err(_) => (false, 0),
    };

    Ok(OllamaServerStatus {
        connected,
        version,
        models_count,
    })
}

/// List all installed Ollama models
#[tauri::command]
pub async fn ollama_list_models(base_url: String) -> Result<Vec<OllamaModel>, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/api/tags", url))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = body
        .get("models")
        .and_then(|m| m.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| serde_json::from_value::<OllamaModel>(m.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

/// Get detailed information about a specific model
#[tauri::command]
pub async fn ollama_show_model(base_url: String, model_name: String) -> Result<OllamaModelInfo, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/show", url))
        .json(&serde_json::json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let info: OllamaModelInfo = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(info)
}

/// Pull/download a model from Ollama registry (with streaming progress)
#[tauri::command]
pub async fn ollama_pull_model(
    app: AppHandle,
    base_url: String,
    model_name: String,
) -> Result<bool, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/pull", url))
        .json(&serde_json::json!({ 
            "name": model_name,
            "stream": true 
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    // Stream the response and emit progress events
    let mut stream = response.bytes_stream();
    let mut buffer = Vec::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(bytes) => {
                buffer.extend_from_slice(&bytes);
                
                // Try to parse complete JSON lines from buffer
                while let Some(newline_pos) = buffer.iter().position(|&b| b == b'\n') {
                    let line: Vec<u8> = buffer.drain(..=newline_pos).collect();
                    if let Ok(text) = std::str::from_utf8(&line) {
                        if let Ok(progress) = serde_json::from_str::<serde_json::Value>(text.trim()) {
                            let pull_progress = OllamaPullProgress {
                                status: progress.get("status")
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("unknown")
                                    .to_string(),
                                digest: progress.get("digest")
                                    .and_then(|s| s.as_str())
                                    .map(|s| s.to_string()),
                                total: progress.get("total")
                                    .and_then(|t| t.as_u64()),
                                completed: progress.get("completed")
                                    .and_then(|c| c.as_u64()),
                                model: model_name.clone(),
                            };
                            
                            // Emit progress event to frontend
                            let _ = app.emit("ollama-pull-progress", &pull_progress);
                        }
                    }
                }
            }
            Err(e) => {
                return Err(format!("Stream error: {}", e));
            }
        }
    }

    // Emit completion event
    let _ = app.emit("ollama-pull-progress", OllamaPullProgress {
        status: "success".to_string(),
        digest: None,
        total: None,
        completed: None,
        model: model_name,
    });

    Ok(true)
}

/// Delete a model from Ollama
#[tauri::command]
pub async fn ollama_delete_model(base_url: String, model_name: String) -> Result<bool, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .delete(format!("{}/api/delete", url))
        .json(&serde_json::json!({ "name": model_name }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete model: {}", error_text));
    }

    Ok(true)
}

/// List currently running/loaded models
#[tauri::command]
pub async fn ollama_list_running(base_url: String) -> Result<Vec<OllamaRunningModel>, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .get(format!("{}/api/ps", url))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama API error: {}", response.status()));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = body
        .get("models")
        .and_then(|m| m.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| serde_json::from_value::<OllamaRunningModel>(m.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

/// Copy a model to create a new model with a different name
#[tauri::command]
pub async fn ollama_copy_model(
    base_url: String,
    source: String,
    destination: String,
) -> Result<bool, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/copy", url))
        .json(&serde_json::json!({ 
            "source": source,
            "destination": destination 
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to copy model: {}", error_text));
    }

    Ok(true)
}

/// Generate embeddings using Ollama
#[tauri::command]
pub async fn ollama_generate_embedding(
    base_url: String,
    model: String,
    input: String,
) -> Result<Vec<f64>, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/embed", url))
        .json(&serde_json::json!({ 
            "model": model,
            "input": input
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to generate embedding: {}", error_text));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Ollama returns embeddings array - get first one for single input
    let embeddings = body
        .get("embeddings")
        .and_then(|e| e.as_array())
        .and_then(|arr| arr.first())
        .and_then(|e| e.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_f64())
                .collect::<Vec<f64>>()
        })
        .ok_or_else(|| "Failed to extract embeddings from response".to_string())?;

    Ok(embeddings)
}

/// Stop/unload a running model
#[tauri::command]
pub async fn ollama_stop_model(base_url: String, model_name: String) -> Result<bool, String> {
    let url = normalize_base_url(&base_url);
    let client = reqwest::Client::new();

    // Send a generate request with keep_alive: 0 to unload the model
    let response = client
        .post(format!("{}/api/generate", url))
        .json(&serde_json::json!({ 
            "model": model_name,
            "keep_alive": 0
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to stop model: {}", error_text));
    }

    Ok(true)
}
