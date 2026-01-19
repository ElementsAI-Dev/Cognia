//! Ollama API commands for local model management

use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

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
    if let Some(stripped) = url.strip_suffix("/v1") {
        stripped.to_string()
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
    let version_result = client.get(format!("{}/api/version", url)).send().await;

    let version = match version_result {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            body.get("version")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
        }
        _ => None,
    };

    // Get model count
    let models_result = client.get(format!("{}/api/tags", url)).send().await;

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
pub async fn ollama_show_model(
    base_url: String,
    model_name: String,
) -> Result<OllamaModelInfo, String> {
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
                        if let Ok(progress) = serde_json::from_str::<serde_json::Value>(text.trim())
                        {
                            let pull_progress = OllamaPullProgress {
                                status: progress
                                    .get("status")
                                    .and_then(|s| s.as_str())
                                    .unwrap_or("unknown")
                                    .to_string(),
                                digest: progress
                                    .get("digest")
                                    .and_then(|s| s.as_str())
                                    .map(|s| s.to_string()),
                                total: progress.get("total").and_then(|t| t.as_u64()),
                                completed: progress.get("completed").and_then(|c| c.as_u64()),
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
    let _ = app.emit(
        "ollama-pull-progress",
        OllamaPullProgress {
            status: "success".to_string(),
            digest: None,
            total: None,
            completed: None,
            model: model_name,
        },
    );

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
        .map(|arr| arr.iter().filter_map(|v| v.as_f64()).collect::<Vec<f64>>())
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_normalize_base_url_no_trailing_slash() {
        let url = "http://localhost:11434";
        let normalized = normalize_base_url(url);
        assert_eq!(normalized, "http://localhost:11434");
    }

    #[test]
    fn test_normalize_base_url_with_trailing_slash() {
        let url = "http://localhost:11434/";
        let normalized = normalize_base_url(url);
        assert_eq!(normalized, "http://localhost:11434");
    }

    #[test]
    fn test_normalize_base_url_with_v1_suffix() {
        let url = "http://localhost:11434/v1";
        let normalized = normalize_base_url(url);
        assert_eq!(normalized, "http://localhost:11434");
    }

    #[test]
    fn test_normalize_base_url_with_v1_and_trailing_slash() {
        let url = "http://localhost:11434/v1/";
        let normalized = normalize_base_url(url);
        assert_eq!(normalized, "http://localhost:11434");
    }

    #[test]
    fn test_normalize_base_url_multiple_slashes() {
        let url = "http://localhost:11434///";
        let normalized = normalize_base_url(url);
        assert_eq!(normalized, "http://localhost:11434");
    }

    #[test]
    fn test_ollama_model_struct() {
        let model = OllamaModel {
            name: "llama2:latest".to_string(),
            model: "llama2".to_string(),
            modified_at: "2024-01-01T00:00:00Z".to_string(),
            size: 3_800_000_000,
            digest: "abc123".to_string(),
            details: Some(OllamaModelDetails {
                parent_model: None,
                format: Some("gguf".to_string()),
                family: Some("llama".to_string()),
                families: Some(vec!["llama".to_string()]),
                parameter_size: Some("7B".to_string()),
                quantization_level: Some("Q4_0".to_string()),
            }),
        };

        assert_eq!(model.name, "llama2:latest");
        assert_eq!(model.size, 3_800_000_000);
        assert!(model.details.is_some());
    }

    #[test]
    fn test_ollama_model_serialization() {
        let model = OllamaModel {
            name: "mistral".to_string(),
            model: "mistral".to_string(),
            modified_at: "2024-01-01T00:00:00Z".to_string(),
            size: 4_000_000_000,
            digest: "def456".to_string(),
            details: None,
        };

        let serialized = serde_json::to_string(&model).unwrap();
        let deserialized: OllamaModel = serde_json::from_str(&serialized).unwrap();

        assert_eq!(model.name, deserialized.name);
        assert_eq!(model.size, deserialized.size);
        assert_eq!(model.digest, deserialized.digest);
    }

    #[test]
    fn test_ollama_model_details_struct() {
        let details = OllamaModelDetails {
            parent_model: Some("parent".to_string()),
            format: Some("gguf".to_string()),
            family: Some("llama".to_string()),
            families: Some(vec!["llama".to_string(), "codellama".to_string()]),
            parameter_size: Some("13B".to_string()),
            quantization_level: Some("Q5_K_M".to_string()),
        };

        assert_eq!(details.family, Some("llama".to_string()));
        assert_eq!(details.parameter_size, Some("13B".to_string()));
        assert_eq!(details.families.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_ollama_server_status_struct() {
        let status = OllamaServerStatus {
            connected: true,
            version: Some("0.1.24".to_string()),
            models_count: 5,
        };

        assert!(status.connected);
        assert_eq!(status.version, Some("0.1.24".to_string()));
        assert_eq!(status.models_count, 5);
    }

    #[test]
    fn test_ollama_server_status_disconnected() {
        let status = OllamaServerStatus {
            connected: false,
            version: None,
            models_count: 0,
        };

        assert!(!status.connected);
        assert!(status.version.is_none());
        assert_eq!(status.models_count, 0);
    }

    #[test]
    fn test_ollama_pull_progress_struct() {
        let progress = OllamaPullProgress {
            status: "downloading".to_string(),
            digest: Some("sha256:abc123".to_string()),
            total: Some(4_000_000_000),
            completed: Some(2_000_000_000),
            model: "llama2".to_string(),
        };

        assert_eq!(progress.status, "downloading");
        assert_eq!(progress.total, Some(4_000_000_000));
        assert_eq!(progress.completed, Some(2_000_000_000));
    }

    #[test]
    fn test_ollama_pull_progress_complete() {
        let progress = OllamaPullProgress {
            status: "success".to_string(),
            digest: None,
            total: None,
            completed: None,
            model: "llama2".to_string(),
        };

        assert_eq!(progress.status, "success");
        assert!(progress.digest.is_none());
    }

    #[test]
    fn test_ollama_running_model_struct() {
        let running = OllamaRunningModel {
            name: "llama2:latest".to_string(),
            model: "llama2".to_string(),
            size: 3_800_000_000,
            digest: "abc123".to_string(),
            expires_at: Some("2024-01-01T01:00:00Z".to_string()),
            size_vram: Some(3_500_000_000),
        };

        assert_eq!(running.name, "llama2:latest");
        assert_eq!(running.size_vram, Some(3_500_000_000));
    }

    #[test]
    fn test_ollama_model_info_struct() {
        let info = OllamaModelInfo {
            modelfile: Some("FROM llama2".to_string()),
            parameters: Some("temperature 0.7".to_string()),
            template: Some("{{ .Prompt }}".to_string()),
            details: Some(OllamaModelDetails {
                parent_model: None,
                format: Some("gguf".to_string()),
                family: None,
                families: None,
                parameter_size: None,
                quantization_level: None,
            }),
            model_info: Some(json!({"general.architecture": "llama"})),
        };

        assert!(info.modelfile.is_some());
        assert!(info.details.is_some());
    }

    #[test]
    fn test_ollama_structs_serialization_roundtrip() {
        // Test OllamaServerStatus
        let status = OllamaServerStatus {
            connected: true,
            version: Some("0.1.24".to_string()),
            models_count: 3,
        };
        let json = serde_json::to_string(&status).unwrap();
        let parsed: OllamaServerStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(status.connected, parsed.connected);
        assert_eq!(status.version, parsed.version);
        assert_eq!(status.models_count, parsed.models_count);

        // Test OllamaPullProgress
        let progress = OllamaPullProgress {
            status: "pulling".to_string(),
            digest: Some("sha256:xyz".to_string()),
            total: Some(1000),
            completed: Some(500),
            model: "test".to_string(),
        };
        let json = serde_json::to_string(&progress).unwrap();
        let parsed: OllamaPullProgress = serde_json::from_str(&json).unwrap();
        assert_eq!(progress.status, parsed.status);
        assert_eq!(progress.model, parsed.model);
    }

    #[test]
    fn test_normalize_base_url_preserves_protocol() {
        let https_url = "https://ollama.example.com/v1";
        let normalized = normalize_base_url(https_url);
        assert!(normalized.starts_with("https://"));
        assert!(!normalized.ends_with("/v1"));

        let http_url = "http://localhost:11434";
        let normalized = normalize_base_url(http_url);
        assert!(normalized.starts_with("http://"));
    }

    #[test]
    fn test_normalize_base_url_with_path() {
        let url = "http://localhost:11434/api/v1";
        let normalized = normalize_base_url(url);
        // Should only remove trailing /v1
        assert_eq!(normalized, "http://localhost:11434/api");
    }
}
