//! Model Download Commands
//!
//! Supports downloading models from multiple sources with:
//! - Multiple mirror sources (HuggingFace, ModelScope, GitHub, custom)
//! - Automatic proxy detection and usage
//! - Progress tracking with events
//! - Resume support for interrupted downloads

use crate::http::create_client_with_proxy;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;

// ============== Types ==============

/// Model provider/source type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ModelSource {
    /// HuggingFace (huggingface.co)
    HuggingFace,
    /// ModelScope (China mirror)
    ModelScope,
    /// GitHub Releases
    GitHub,
    /// Ollama Registry
    Ollama,
    /// Custom URL
    Custom,
}

impl ModelSource {
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::HuggingFace => "HuggingFace",
            Self::ModelScope => "ModelScope (CN)",
            Self::GitHub => "GitHub",
            Self::Ollama => "Ollama",
            Self::Custom => "Custom URL",
        }
    }

    pub fn base_url(&self) -> Option<&'static str> {
        match self {
            Self::HuggingFace => Some("https://huggingface.co"),
            Self::ModelScope => Some("https://modelscope.cn"),
            Self::GitHub => Some("https://github.com"),
            Self::Ollama => Some("http://localhost:11434"),
            Self::Custom => None,
        }
    }

    fn config_key(&self) -> &'static str {
        match self {
            Self::HuggingFace => "hugging_face",
            Self::ModelScope => "model_scope",
            Self::GitHub => "git_hub",
            Self::Ollama => "ollama",
            Self::Custom => "custom",
        }
    }
}

fn resolve_source_url(source: ModelSource, url: &str, config: &DownloadConfig) -> String {
    if let Some(mirror_base) = config.custom_mirrors.get(source.config_key()) {
        let mirror_base = mirror_base.trim_end_matches('/');
        if let Some(default_base) = source.base_url() {
            if let Some(suffix) = url.strip_prefix(default_base) {
                let mut resolved = mirror_base.to_string();
                if !suffix.starts_with('/') {
                    resolved.push('/');
                }
                resolved.push_str(suffix);
                return resolved;
            }
        }
        if !mirror_base.is_empty() {
            return mirror_base.to_string();
        }
    }
    url.to_string()
}

/// Model category
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelCategory {
    /// OCR models (Tesseract data, etc.)
    Ocr,
    /// LLM models (Ollama, etc.)
    Llm,
    /// Embedding models
    Embedding,
    /// Vision models
    Vision,
    /// Speech models
    Speech,
    /// Other
    Other,
}

/// Model definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDefinition {
    /// Unique model ID
    pub id: String,
    /// Display name
    pub name: String,
    /// Model category
    pub category: ModelCategory,
    /// Description
    pub description: String,
    /// File size in bytes (approximate)
    pub size: u64,
    /// Download URLs by source
    pub sources: HashMap<ModelSource, String>,
    /// Default/recommended source
    pub default_source: ModelSource,
    /// File name to save as
    pub filename: String,
    /// Subdirectory within models folder
    pub subdir: Option<String>,
    /// Required for functionality
    pub required: bool,
}

/// Download configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadConfig {
    /// Preferred model sources (in priority order)
    pub preferred_sources: Vec<ModelSource>,
    /// Proxy URL (if any)
    pub proxy_url: Option<String>,
    /// Auto-detect and use system proxy
    pub use_system_proxy: bool,
    /// Download timeout in seconds
    pub timeout_secs: u64,
    /// Number of retry attempts
    pub max_retries: u32,
    /// Custom mirror URLs
    pub custom_mirrors: HashMap<String, String>,
}

impl Default for DownloadConfig {
    fn default() -> Self {
        Self {
            preferred_sources: vec![ModelSource::HuggingFace, ModelSource::ModelScope],
            proxy_url: None,
            use_system_proxy: true,
            timeout_secs: 300,
            max_retries: 3,
            custom_mirrors: HashMap::new(),
        }
    }
}

/// Download progress event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub model_id: String,
    pub status: DownloadStatus,
    pub source: ModelSource,
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub percent: f64,
    pub speed_bps: u64,
    pub eta_secs: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DownloadStatus {
    Pending,
    Connecting,
    Downloading,
    Verifying,
    Completed,
    Failed,
    Cancelled,
}

/// Download result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub model_id: String,
    pub success: bool,
    pub path: Option<String>,
    pub source_used: Option<ModelSource>,
    pub download_time_secs: u64,
    pub error: Option<String>,
}

// ============== Built-in Models ==============

/// Get built-in model definitions
pub fn get_builtin_models() -> Vec<ModelDefinition> {
    vec![
        // Tesseract OCR language data
        ModelDefinition {
            id: "tesseract-eng".to_string(),
            name: "Tesseract English".to_string(),
            category: ModelCategory::Ocr,
            description: "English language data for Tesseract OCR".to_string(),
            size: 4_000_000,
            sources: [
                (ModelSource::GitHub, "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata".to_string()),
                (ModelSource::HuggingFace, "https://huggingface.co/datasets/tesseract-ocr/tessdata/resolve/main/eng.traineddata".to_string()),
            ].into_iter().collect(),
            default_source: ModelSource::GitHub,
            filename: "eng.traineddata".to_string(),
            subdir: Some("tessdata".to_string()),
            required: false,
        },
        ModelDefinition {
            id: "tesseract-chi-sim".to_string(),
            name: "Tesseract Chinese (Simplified)".to_string(),
            category: ModelCategory::Ocr,
            description: "Simplified Chinese language data for Tesseract OCR".to_string(),
            size: 40_000_000,
            sources: [
                (ModelSource::GitHub, "https://github.com/tesseract-ocr/tessdata/raw/main/chi_sim.traineddata".to_string()),
                (ModelSource::HuggingFace, "https://huggingface.co/datasets/tesseract-ocr/tessdata/resolve/main/chi_sim.traineddata".to_string()),
            ].into_iter().collect(),
            default_source: ModelSource::GitHub,
            filename: "chi_sim.traineddata".to_string(),
            subdir: Some("tessdata".to_string()),
            required: false,
        },
        ModelDefinition {
            id: "tesseract-jpn".to_string(),
            name: "Tesseract Japanese".to_string(),
            category: ModelCategory::Ocr,
            description: "Japanese language data for Tesseract OCR".to_string(),
            size: 16_000_000,
            sources: [
                (ModelSource::GitHub, "https://github.com/tesseract-ocr/tessdata/raw/main/jpn.traineddata".to_string()),
            ].into_iter().collect(),
            default_source: ModelSource::GitHub,
            filename: "jpn.traineddata".to_string(),
            subdir: Some("tessdata".to_string()),
            required: false,
        },
    ]
}

// ============== Helper Functions ==============

/// Detect system proxy settings
async fn detect_system_proxy() -> Option<String> {
    // Try common proxy ports
    let proxy_ports = [
        ("http://127.0.0.1:7890", "Clash"),
        ("http://127.0.0.1:7897", "Clash Verge"),
        ("http://127.0.0.1:10809", "V2Ray"),
        ("http://127.0.0.1:1080", "SOCKS"),
    ];

    for (proxy_url, _name) in proxy_ports {
        if test_proxy_connectivity(proxy_url).await {
            log::info!("Detected working proxy: {}", proxy_url);
            return Some(proxy_url.to_string());
        }
    }

    // Check environment variables
    if let Ok(proxy) = std::env::var("HTTP_PROXY").or_else(|_| std::env::var("http_proxy")) {
        if !proxy.is_empty() {
            return Some(proxy);
        }
    }

    None
}

/// Test if a proxy is working
async fn test_proxy_connectivity(proxy_url: &str) -> bool {
    let client = match create_client_with_proxy(proxy_url, Some(5)) {
        Ok(c) => c,
        Err(_) => return false,
    };

    client
        .get("https://www.google.com/generate_204")
        .send()
        .await
        .map(|r| r.status().is_success() || r.status().as_u16() == 204)
        .unwrap_or(false)
}

/// Create HTTP client with optional proxy
async fn create_download_client(config: &DownloadConfig) -> Result<reqwest::Client, String> {
    let proxy_url = if let Some(ref proxy) = config.proxy_url {
        Some(proxy.clone())
    } else if config.use_system_proxy {
        detect_system_proxy().await
    } else {
        None
    };

    let builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(config.timeout_secs))
        .connect_timeout(std::time::Duration::from_secs(30));

    let builder = if let Some(ref proxy) = proxy_url {
        log::info!("Using proxy for download: {}", proxy);
        let proxy = reqwest::Proxy::all(proxy).map_err(|e| e.to_string())?;
        builder.proxy(proxy)
    } else {
        builder
    };

    builder.build().map_err(|e| e.to_string())
}

/// Get models directory
fn get_models_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    Ok(app_data.join("models"))
}

// ============== Tauri Commands ==============

/// Get list of available models
#[tauri::command]
pub async fn model_list_available() -> Result<Vec<ModelDefinition>, String> {
    Ok(get_builtin_models())
}

/// Get list of installed models
#[tauri::command]
pub async fn model_list_installed(app: AppHandle) -> Result<Vec<String>, String> {
    let models_dir = get_models_dir(&app)?;
    let mut installed = Vec::new();

    if !models_dir.exists() {
        return Ok(installed);
    }

    let builtin = get_builtin_models();
    for model in builtin {
        let mut path = models_dir.clone();
        if let Some(subdir) = &model.subdir {
            path = path.join(subdir);
        }
        path = path.join(&model.filename);

        if path.exists() {
            installed.push(model.id);
        }
    }

    Ok(installed)
}

/// Get download configuration
#[tauri::command]
pub async fn model_get_download_config() -> Result<DownloadConfig, String> {
    // TODO: Load from settings
    Ok(DownloadConfig::default())
}

/// Set download configuration
#[tauri::command]
pub async fn model_set_download_config(config: DownloadConfig) -> Result<(), String> {
    // TODO: Save to settings
    log::info!("Download config updated: {:?}", config);
    Ok(())
}

/// Download a model
#[tauri::command]
pub async fn model_download(
    app: AppHandle,
    model_id: String,
    source: Option<ModelSource>,
    config: Option<DownloadConfig>,
) -> Result<DownloadResult, String> {
    let config = config.unwrap_or_default();
    let start_time = std::time::Instant::now();

    // Find model definition
    let models = get_builtin_models();
    let model = models
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Model '{}' not found", model_id))?;

    // Determine source priority
    let sources_to_try: Vec<ModelSource> = if let Some(s) = source {
        vec![s]
    } else {
        let mut sources = config.preferred_sources.clone();
        if !sources.contains(&model.default_source) {
            sources.push(model.default_source);
        }
        sources
    };

    // Prepare download path
    let models_dir = get_models_dir(&app)?;
    let mut target_path = models_dir.clone();
    if let Some(ref subdir) = model.subdir {
        target_path = target_path.join(subdir);
    }
    fs::create_dir_all(&target_path)
        .await
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    target_path = target_path.join(&model.filename);

    // Create HTTP client
    let client = create_download_client(&config).await?;

    // Try each source
    let mut last_error = None;
    for source in sources_to_try {
        let url = match model.sources.get(&source) {
            Some(u) => resolve_source_url(source, u, &config),
            None => continue,
        };

        log::info!("Downloading {} from {:?}: {}", model_id, source, url);

        // Emit starting event
        let _ = app.emit(
            "model-download-progress",
            DownloadProgress {
                model_id: model_id.clone(),
                status: DownloadStatus::Connecting,
                source,
                total_bytes: model.size,
                downloaded_bytes: 0,
                percent: 0.0,
                speed_bps: 0,
                eta_secs: None,
                error: None,
            },
        );

        match download_file(
            &app,
            &client,
            &url,
            &target_path,
            &model_id,
            source,
            model.size,
        )
        .await
        {
            Ok(_) => {
                let elapsed = start_time.elapsed().as_secs();

                // Emit completion
                let _ = app.emit(
                    "model-download-progress",
                    DownloadProgress {
                        model_id: model_id.clone(),
                        status: DownloadStatus::Completed,
                        source,
                        total_bytes: model.size,
                        downloaded_bytes: model.size,
                        percent: 100.0,
                        speed_bps: 0,
                        eta_secs: None,
                        error: None,
                    },
                );

                return Ok(DownloadResult {
                    model_id,
                    success: true,
                    path: Some(target_path.to_string_lossy().to_string()),
                    source_used: Some(source),
                    download_time_secs: elapsed,
                    error: None,
                });
            }
            Err(e) => {
                log::warn!("Download from {:?} failed: {}", source, e);
                last_error = Some(e);
            }
        }
    }

    // All sources failed
    let error = last_error.unwrap_or_else(|| "No download sources available".to_string());

    let _ = app.emit(
        "model-download-progress",
        DownloadProgress {
            model_id: model_id.clone(),
            status: DownloadStatus::Failed,
            source: model.default_source,
            total_bytes: model.size,
            downloaded_bytes: 0,
            percent: 0.0,
            speed_bps: 0,
            eta_secs: None,
            error: Some(error.clone()),
        },
    );

    Ok(DownloadResult {
        model_id,
        success: false,
        path: None,
        source_used: None,
        download_time_secs: start_time.elapsed().as_secs(),
        error: Some(error),
    })
}

/// Download file with progress tracking
async fn download_file(
    app: &AppHandle,
    client: &reqwest::Client,
    url: &str,
    path: &PathBuf,
    model_id: &str,
    source: ModelSource,
    expected_size: u64,
) -> Result<(), String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let total_size = response.content_length().unwrap_or(expected_size);

    let mut file = File::create(path)
        .await
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let start = std::time::Instant::now();
    let mut last_emit = start;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;

        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Write error: {}", e))?;

        downloaded += chunk.len() as u64;

        // Emit progress every 100ms
        if last_emit.elapsed().as_millis() > 100 {
            let elapsed_secs = start.elapsed().as_secs_f64();
            let speed_bps = if elapsed_secs > 0.0 {
                (downloaded as f64 / elapsed_secs) as u64
            } else {
                0
            };

            let eta_secs = if speed_bps > 0 && downloaded < total_size {
                Some((total_size - downloaded) / speed_bps)
            } else {
                None
            };

            let _ = app.emit(
                "model-download-progress",
                DownloadProgress {
                    model_id: model_id.to_string(),
                    status: DownloadStatus::Downloading,
                    source,
                    total_bytes: total_size,
                    downloaded_bytes: downloaded,
                    percent: (downloaded as f64 / total_size as f64) * 100.0,
                    speed_bps,
                    eta_secs,
                    error: None,
                },
            );

            last_emit = std::time::Instant::now();
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Flush error: {}", e))?;

    Ok(())
}

/// Delete a downloaded model
#[tauri::command]
pub async fn model_delete(app: AppHandle, model_id: String) -> Result<bool, String> {
    let models = get_builtin_models();
    let model = models
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| format!("Model '{}' not found", model_id))?;

    let models_dir = get_models_dir(&app)?;
    let mut path = models_dir;
    if let Some(ref subdir) = model.subdir {
        path = path.join(subdir);
    }
    path = path.join(&model.filename);

    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// Get available model sources
#[tauri::command]
pub async fn model_get_sources() -> Result<Vec<(ModelSource, String)>, String> {
    Ok(vec![
        (
            ModelSource::HuggingFace,
            ModelSource::HuggingFace.display_name().to_string(),
        ),
        (
            ModelSource::ModelScope,
            ModelSource::ModelScope.display_name().to_string(),
        ),
        (
            ModelSource::GitHub,
            ModelSource::GitHub.display_name().to_string(),
        ),
        (
            ModelSource::Ollama,
            ModelSource::Ollama.display_name().to_string(),
        ),
    ])
}

/// Detect available proxy
#[tauri::command]
pub async fn model_detect_proxy() -> Result<Option<String>, String> {
    Ok(detect_system_proxy().await)
}

/// Test a specific proxy
#[tauri::command]
pub async fn model_test_proxy(proxy_url: String) -> Result<bool, String> {
    Ok(test_proxy_connectivity(&proxy_url).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_source_display_name() {
        assert_eq!(ModelSource::HuggingFace.display_name(), "HuggingFace");
        assert_eq!(ModelSource::ModelScope.display_name(), "ModelScope (CN)");
    }

    #[test]
    fn test_builtin_models() {
        let models = get_builtin_models();
        assert!(!models.is_empty());

        // Check tesseract-eng exists
        assert!(models.iter().any(|m| m.id == "tesseract-eng"));
    }

    #[test]
    fn test_download_config_default() {
        let config = DownloadConfig::default();
        assert!(!config.preferred_sources.is_empty());
        assert!(config.use_system_proxy);
    }

    #[test]
    fn test_model_category_serialization() {
        let cat = ModelCategory::Ocr;
        let json = serde_json::to_string(&cat).unwrap();
        assert_eq!(json, "\"ocr\"");
    }
}
