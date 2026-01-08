//! Local Provider Commands
//!
//! Generic commands for interacting with OpenAI-compatible local inference servers
//! (LM Studio, llama.cpp, vLLM, LocalAI, Jan, etc.)

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};

/// Local provider identifiers
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum LocalProviderId {
    Ollama,
    Lmstudio,
    Llamacpp,
    Llamafile,
    Vllm,
    Localai,
    Jan,
    Textgenwebui,
    Koboldcpp,
    Tabbyapi,
}

impl LocalProviderId {
    pub fn default_port(&self) -> u16 {
        match self {
            Self::Ollama => 11434,
            Self::Lmstudio => 1234,
            Self::Llamacpp => 8080,
            Self::Llamafile => 8080,
            Self::Vllm => 8000,
            Self::Localai => 8080,
            Self::Jan => 1337,
            Self::Textgenwebui => 5000,
            Self::Koboldcpp => 5001,
            Self::Tabbyapi => 5000,
        }
    }

    pub fn default_base_url(&self) -> String {
        format!("http://localhost:{}", self.default_port())
    }

    pub fn health_endpoint(&self) -> &'static str {
        match self {
            Self::Ollama => "/api/version",
            Self::Lmstudio => "/v1/models",
            Self::Llamacpp => "/health",
            Self::Llamafile => "/health",
            Self::Vllm => "/health",
            Self::Localai => "/readyz",
            Self::Jan => "/v1/models",
            Self::Textgenwebui => "/v1/models",
            Self::Koboldcpp => "/api/v1/model",
            Self::Tabbyapi => "/health",
        }
    }

    pub fn models_endpoint(&self) -> &'static str {
        match self {
            Self::Ollama => "/api/tags",
            _ => "/v1/models",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::Ollama => "Ollama",
            Self::Lmstudio => "LM Studio",
            Self::Llamacpp => "llama.cpp",
            Self::Llamafile => "llamafile",
            Self::Vllm => "vLLM",
            Self::Localai => "LocalAI",
            Self::Jan => "Jan",
            Self::Textgenwebui => "Text Generation WebUI",
            Self::Koboldcpp => "KoboldCpp",
            Self::Tabbyapi => "TabbyAPI",
        }
    }

    #[cfg(target_os = "windows")]
    pub fn executable_names(&self) -> Vec<&'static str> {
        match self {
            Self::Ollama => vec!["ollama.exe"],
            Self::Lmstudio => vec!["LM Studio.exe"],
            Self::Llamacpp => vec!["llama-server.exe", "server.exe"],
            Self::Llamafile => vec!["llamafile.exe"],
            Self::Vllm => vec!["vllm.exe"],
            Self::Localai => vec!["local-ai.exe"],
            Self::Jan => vec!["Jan.exe"],
            Self::Textgenwebui => vec!["python.exe"],
            Self::Koboldcpp => vec!["koboldcpp.exe"],
            Self::Tabbyapi => vec!["python.exe"],
        }
    }

    #[cfg(not(target_os = "windows"))]
    pub fn executable_names(&self) -> Vec<&'static str> {
        match self {
            Self::Ollama => vec!["ollama"],
            Self::Lmstudio => vec!["LM Studio", "lmstudio"],
            Self::Llamacpp => vec!["llama-server", "server"],
            Self::Llamafile => vec!["llamafile"],
            Self::Vllm => vec!["vllm"],
            Self::Localai => vec!["local-ai"],
            Self::Jan => vec!["jan"],
            Self::Textgenwebui => vec!["python", "python3"],
            Self::Koboldcpp => vec!["koboldcpp"],
            Self::Tabbyapi => vec!["python", "python3"],
        }
    }
}

/// Server status response
#[derive(Debug, Serialize, Deserialize)]
pub struct LocalServerStatus {
    pub connected: bool,
    pub version: Option<String>,
    pub models_count: Option<u32>,
    pub error: Option<String>,
    pub latency_ms: Option<u64>,
}

/// Model info from OpenAI-compatible API
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalModelInfo {
    pub id: String,
    pub object: Option<String>,
    pub created: Option<i64>,
    pub owned_by: Option<String>,
    pub size: Option<u64>,
    pub family: Option<String>,
    pub quantization: Option<String>,
    pub context_length: Option<u32>,
}

/// Model pull progress event
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalModelPullProgress {
    pub model: String,
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<u64>,
    pub completed: Option<u64>,
    pub percentage: Option<f64>,
}

/// Installation check result
#[derive(Debug, Serialize, Deserialize)]
pub struct InstallCheckResult {
    pub provider_id: LocalProviderId,
    pub installed: bool,
    pub running: bool,
    pub version: Option<String>,
    pub install_path: Option<String>,
    pub error: Option<String>,
}

/// Provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalProviderConfig {
    pub provider_id: LocalProviderId,
    pub base_url: String,
    pub enabled: bool,
    pub auto_start: bool,
    pub custom_args: Option<Vec<String>>,
}

impl Default for LocalProviderConfig {
    fn default() -> Self {
        Self {
            provider_id: LocalProviderId::Ollama,
            base_url: "http://localhost:11434".to_string(),
            enabled: true,
            auto_start: false,
            custom_args: None,
        }
    }
}

/// Helper to normalize base URL
fn normalize_base_url(base_url: &str) -> String {
    let url = base_url.trim_end_matches('/');
    if let Some(stripped) = url.strip_suffix("/v1") {
        stripped.to_string()
    } else {
        url.to_string()
    }
}

/// Get local provider server status
#[tauri::command]
pub async fn local_provider_get_status(
    provider_id: LocalProviderId,
    base_url: Option<String>,
) -> Result<LocalServerStatus, String> {
    let url = normalize_base_url(&base_url.unwrap_or_else(|| provider_id.default_base_url()));
    let start_time = std::time::Instant::now();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Try health endpoint
    let health_url = format!("{}{}", url, provider_id.health_endpoint());
    let health_result = client.get(&health_url).send().await;

    match health_result {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            let version = body
                .get("version")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            // Try to get models count
            let models_count = if provider_id == LocalProviderId::Ollama {
                let tags_result = client.get(format!("{}/api/tags", url)).send().await;
                if let Ok(resp) = tags_result {
                    if let Ok(v) = resp.json::<serde_json::Value>().await {
                        v.get("models")
                            .and_then(|m| m.as_array())
                            .map(|a| a.len() as u32)
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                let models_result = client
                    .get(format!("{}{}", url, provider_id.models_endpoint()))
                    .send()
                    .await;
                models_result.ok().and_then(|r| {
                    let body: serde_json::Value = futures::executor::block_on(r.json()).ok()?;
                    body.get("data")
                        .and_then(|d| d.as_array())
                        .map(|a| a.len() as u32)
                })
            };

            Ok(LocalServerStatus {
                connected: true,
                version,
                models_count,
                error: None,
                latency_ms: Some(start_time.elapsed().as_millis() as u64),
            })
        }
        Ok(resp) => Ok(LocalServerStatus {
            connected: false,
            version: None,
            models_count: None,
            error: Some(format!("HTTP {}", resp.status())),
            latency_ms: Some(start_time.elapsed().as_millis() as u64),
        }),
        Err(e) => Ok(LocalServerStatus {
            connected: false,
            version: None,
            models_count: None,
            error: Some(e.to_string()),
            latency_ms: Some(start_time.elapsed().as_millis() as u64),
        }),
    }
}

/// List models from a local provider
#[tauri::command]
pub async fn local_provider_list_models(
    provider_id: LocalProviderId,
    base_url: Option<String>,
) -> Result<Vec<LocalModelInfo>, String> {
    let url = normalize_base_url(&base_url.unwrap_or_else(|| provider_id.default_base_url()));
    let client = reqwest::Client::new();

    let models_url = format!("{}{}", url, provider_id.models_endpoint());
    let response = client
        .get(&models_url)
        .send()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Handle Ollama format
    if provider_id == LocalProviderId::Ollama {
        let models = body
            .get("models")
            .and_then(|m| m.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| {
                        Some(LocalModelInfo {
                            id: m.get("name")?.as_str()?.to_string(),
                            object: Some("model".to_string()),
                            created: None,
                            owned_by: None,
                            size: m.get("size").and_then(|s| s.as_u64()),
                            family: m
                                .get("details")
                                .and_then(|d| d.get("family"))
                                .and_then(|f| f.as_str())
                                .map(|s| s.to_string()),
                            quantization: m
                                .get("details")
                                .and_then(|d| d.get("quantization_level"))
                                .and_then(|q| q.as_str())
                                .map(|s| s.to_string()),
                            context_length: None,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();
        return Ok(models);
    }

    // Handle OpenAI format
    let models = body
        .get("data")
        .and_then(|d| d.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| {
                    Some(LocalModelInfo {
                        id: m.get("id")?.as_str()?.to_string(),
                        object: m.get("object").and_then(|o| o.as_str()).map(|s| s.to_string()),
                        created: m.get("created").and_then(|c| c.as_i64()),
                        owned_by: m
                            .get("owned_by")
                            .and_then(|o| o.as_str())
                            .map(|s| s.to_string()),
                        size: None,
                        family: None,
                        quantization: None,
                        context_length: None,
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(models)
}

/// Check if a local provider is installed
#[tauri::command]
pub async fn local_provider_check_installation(
    provider_id: LocalProviderId,
) -> Result<InstallCheckResult, String> {
    // First check if server is running
    let status = local_provider_get_status(provider_id, None).await?;

    if status.connected {
        return Ok(InstallCheckResult {
            provider_id,
            installed: true,
            running: true,
            version: status.version,
            install_path: None,
            error: None,
        });
    }

    // Check for executable in PATH or common locations
    let executables = provider_id.executable_names();
    let mut found_path: Option<String> = None;

    for exe in executables {
        if let Ok(path) = which::which(exe) {
            found_path = Some(path.to_string_lossy().to_string());
            break;
        }
    }

    // Check common installation directories
    if found_path.is_none() {
        let common_paths = get_common_install_paths(provider_id);
        for path in common_paths {
            if path.exists() {
                found_path = Some(path.to_string_lossy().to_string());
                break;
            }
        }
    }

    Ok(InstallCheckResult {
        provider_id,
        installed: found_path.is_some(),
        running: false,
        version: None,
        install_path: found_path,
        error: status.error,
    })
}

/// Get common installation paths for a provider
fn get_common_install_paths(provider_id: LocalProviderId) -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let _program_files = std::env::var("PROGRAMFILES").unwrap_or_default();
        let user_profile = std::env::var("USERPROFILE").unwrap_or_default();

        match provider_id {
            LocalProviderId::Ollama => {
                paths.push(PathBuf::from(&local_app_data).join("Programs").join("Ollama").join("ollama.exe"));
            }
            LocalProviderId::Lmstudio => {
                paths.push(PathBuf::from(&local_app_data).join("Programs").join("LM Studio").join("LM Studio.exe"));
            }
            LocalProviderId::Jan => {
                paths.push(PathBuf::from(&local_app_data).join("Programs").join("Jan").join("Jan.exe"));
            }
            LocalProviderId::Koboldcpp => {
                paths.push(PathBuf::from(&user_profile).join("koboldcpp").join("koboldcpp.exe"));
            }
            _ => {}
        }
    }

    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_default();

        match provider_id {
            LocalProviderId::Ollama => {
                paths.push(PathBuf::from("/usr/local/bin/ollama"));
                paths.push(PathBuf::from(&home).join(".ollama").join("ollama"));
            }
            LocalProviderId::Lmstudio => {
                paths.push(PathBuf::from("/Applications/LM Studio.app"));
            }
            LocalProviderId::Jan => {
                paths.push(PathBuf::from("/Applications/Jan.app"));
            }
            _ => {}
        }
    }

    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_default();

        match provider_id {
            LocalProviderId::Ollama => {
                paths.push(PathBuf::from("/usr/local/bin/ollama"));
                paths.push(PathBuf::from("/usr/bin/ollama"));
            }
            LocalProviderId::Jan => {
                paths.push(PathBuf::from(&home).join(".local").join("share").join("Jan"));
            }
            _ => {}
        }
    }

    paths
}

/// Pull a model (for providers that support it like LocalAI)
#[tauri::command]
pub async fn local_provider_pull_model(
    app: AppHandle,
    provider_id: LocalProviderId,
    base_url: Option<String>,
    model_name: String,
) -> Result<bool, String> {
    let url = normalize_base_url(&base_url.unwrap_or_else(|| provider_id.default_base_url()));

    match provider_id {
        LocalProviderId::Localai => {
            // LocalAI model installation
            let client = reqwest::Client::new();
            let response = client
                .post(format!("{}/models/apply", url))
                .json(&serde_json::json!({
                    "id": model_name,
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to install model: {}", e))?;

            if !response.status().is_success() {
                let error = response.text().await.unwrap_or_default();
                return Err(format!("Failed to install model: {}", error));
            }

            // Emit completion event
            let _ = app.emit(
                "local-provider-pull-progress",
                LocalModelPullProgress {
                    model: model_name,
                    status: "success".to_string(),
                    digest: None,
                    total: None,
                    completed: None,
                    percentage: Some(100.0),
                },
            );

            Ok(true)
        }
        LocalProviderId::Jan => {
            // Jan model download via API
            let client = reqwest::Client::new();
            let response = client
                .post(format!("{}/v1/models/download", url))
                .json(&serde_json::json!({
                    "model": model_name,
                }))
                .send()
                .await
                .map_err(|e| format!("Failed to download model: {}", e))?;

            if !response.status().is_success() {
                let error = response.text().await.unwrap_or_default();
                return Err(format!("Failed to download model: {}", error));
            }

            Ok(true)
        }
        _ => Err(format!(
            "{} does not support model pulling",
            provider_id.display_name()
        )),
    }
}

/// Delete a model from a local provider
#[tauri::command]
pub async fn local_provider_delete_model(
    provider_id: LocalProviderId,
    base_url: Option<String>,
    model_name: String,
) -> Result<bool, String> {
    let url = normalize_base_url(&base_url.unwrap_or_else(|| provider_id.default_base_url()));
    let client = reqwest::Client::new();

    match provider_id {
        LocalProviderId::Localai => {
            let response = client
                .delete(format!("{}/models/{}", url, model_name))
                .send()
                .await
                .map_err(|e| format!("Failed to delete model: {}", e))?;

            if !response.status().is_success() {
                let error = response.text().await.unwrap_or_default();
                return Err(format!("Failed to delete model: {}", error));
            }

            Ok(true)
        }
        LocalProviderId::Jan => {
            let response = client
                .delete(format!("{}/v1/models/{}", url, model_name))
                .send()
                .await
                .map_err(|e| format!("Failed to delete model: {}", e))?;

            if !response.status().is_success() {
                let error = response.text().await.unwrap_or_default();
                return Err(format!("Failed to delete model: {}", error));
            }

            Ok(true)
        }
        _ => Err(format!(
            "{} does not support model deletion via API",
            provider_id.display_name()
        )),
    }
}

/// Get all local providers status at once
#[tauri::command]
pub async fn local_provider_check_all() -> Result<Vec<InstallCheckResult>, String> {
    let providers = vec![
        LocalProviderId::Ollama,
        LocalProviderId::Lmstudio,
        LocalProviderId::Llamacpp,
        LocalProviderId::Llamafile,
        LocalProviderId::Vllm,
        LocalProviderId::Localai,
        LocalProviderId::Jan,
        LocalProviderId::Textgenwebui,
        LocalProviderId::Koboldcpp,
        LocalProviderId::Tabbyapi,
    ];

    let mut results = Vec::new();
    for provider_id in providers {
        match local_provider_check_installation(provider_id).await {
            Ok(result) => results.push(result),
            Err(e) => {
                results.push(InstallCheckResult {
                    provider_id,
                    installed: false,
                    running: false,
                    version: None,
                    install_path: None,
                    error: Some(e),
                });
            }
        }
    }

    Ok(results)
}

/// Test connection to a local provider
#[tauri::command]
pub async fn local_provider_test_connection(
    provider_id: LocalProviderId,
    base_url: String,
) -> Result<LocalServerStatus, String> {
    local_provider_get_status(provider_id, Some(base_url)).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_id_default_port() {
        assert_eq!(LocalProviderId::Ollama.default_port(), 11434);
        assert_eq!(LocalProviderId::Lmstudio.default_port(), 1234);
        assert_eq!(LocalProviderId::Vllm.default_port(), 8000);
    }

    #[test]
    fn test_provider_id_display_name() {
        assert_eq!(LocalProviderId::Ollama.display_name(), "Ollama");
        assert_eq!(LocalProviderId::Lmstudio.display_name(), "LM Studio");
    }

    #[test]
    fn test_normalize_base_url() {
        assert_eq!(
            normalize_base_url("http://localhost:11434/"),
            "http://localhost:11434"
        );
        assert_eq!(
            normalize_base_url("http://localhost:1234/v1"),
            "http://localhost:1234"
        );
        assert_eq!(
            normalize_base_url("http://localhost:8080/v1/"),
            "http://localhost:8080"
        );
    }

    #[test]
    fn test_local_server_status_serialization() {
        let status = LocalServerStatus {
            connected: true,
            version: Some("1.0.0".to_string()),
            models_count: Some(5),
            error: None,
            latency_ms: Some(100),
        };

        let json = serde_json::to_string(&status).unwrap();
        let parsed: LocalServerStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(status.connected, parsed.connected);
        assert_eq!(status.version, parsed.version);
    }

    #[test]
    fn test_local_model_info_serialization() {
        let model = LocalModelInfo {
            id: "llama3.2".to_string(),
            object: Some("model".to_string()),
            created: None,
            owned_by: None,
            size: Some(2_000_000_000),
            family: Some("llama".to_string()),
            quantization: Some("Q4_K_M".to_string()),
            context_length: Some(8192),
        };

        let json = serde_json::to_string(&model).unwrap();
        let parsed: LocalModelInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(model.id, parsed.id);
        assert_eq!(model.size, parsed.size);
    }
}
