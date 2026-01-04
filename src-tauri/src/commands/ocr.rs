//! OCR Tauri Commands
//!
//! Commands for multi-provider OCR functionality.

use crate::screenshot::{
    AzureVisionProvider, GoogleVisionProvider, OcrManager, OcrOptions, OcrProvider, 
    OcrProviderConfig, OcrProviderInfo, OcrProviderType, OllamaVisionProvider, 
    OpenAiVisionProvider, TesseractProvider, UnifiedOcrResult, WindowsOcrProvider,
};
use base64::Engine;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

/// Global OCR manager state
pub struct OcrState {
    pub manager: Arc<RwLock<OcrManager>>,
}

impl OcrState {
    pub fn new() -> Self {
        let manager = OcrManager::new();

        // Register Windows OCR provider by default (always available on Windows)
        manager.register_provider(Arc::new(WindowsOcrProvider::new()));

        // Register Tesseract provider if available on the system
        let tesseract = TesseractProvider::new();
        manager.register_provider(Arc::new(tesseract));

        Self {
            manager: Arc::new(RwLock::new(manager)),
        }
    }
}

impl Default for OcrState {
    fn default() -> Self {
        Self::new()
    }
}

/// OCR request parameters
#[derive(Debug, Deserialize)]
pub struct OcrRequest {
    /// Base64 encoded image data
    pub image_base64: String,
    /// Provider to use (optional, uses default if not specified)
    pub provider: Option<OcrProviderType>,
    /// OCR options
    #[serde(default)]
    pub options: OcrRequestOptions,
}

#[derive(Debug, Deserialize, Default)]
pub struct OcrRequestOptions {
    pub language: Option<String>,
    pub word_level: Option<bool>,
}

/// Provider configuration request
#[derive(Debug, Deserialize)]
pub struct ProviderConfigRequest {
    pub provider_type: OcrProviderType,
    pub enabled: Option<bool>,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub model: Option<String>,
    pub default_language: Option<String>,
}

/// Response for provider info
#[derive(Debug, Serialize)]
pub struct ProviderInfoResponse {
    pub providers: Vec<OcrProviderInfo>,
    pub default_provider: OcrProviderType,
}

// ============== Commands ==============

/// Get information about all OCR providers
#[tauri::command]
pub async fn ocr_get_providers(state: State<'_, OcrState>) -> Result<ProviderInfoResponse, String> {
    // Clone manager to avoid holding lock across await
    let manager = state.manager.read().clone();
    let providers = manager.get_provider_info().await;
    let default_provider = manager.get_default_provider();

    Ok(ProviderInfoResponse {
        providers,
        default_provider,
    })
}

/// Set the default OCR provider
#[tauri::command]
pub async fn ocr_set_default_provider(
    state: State<'_, OcrState>,
    provider: OcrProviderType,
) -> Result<(), String> {
    state.manager.read().set_default_provider(provider);
    Ok(())
}

/// Configure an OCR provider
#[tauri::command]
pub async fn ocr_configure_provider(
    state: State<'_, OcrState>,
    config: ProviderConfigRequest,
) -> Result<(), String> {
    let manager = state.manager.write();

    // Create or update config
    let mut provider_config = manager
        .get_config(&config.provider_type)
        .unwrap_or_else(|| OcrProviderConfig {
            provider_type: config.provider_type.clone(),
            ..Default::default()
        });

    if let Some(enabled) = config.enabled {
        provider_config.enabled = enabled;
    }
    if let Some(api_key) = config.api_key {
        provider_config.api_key = Some(api_key.clone());

        // Register provider if it needs an API key and we just got one
        match config.provider_type {
            OcrProviderType::OpenAiVision => {
                let endpoint = config.endpoint.clone().or(provider_config.endpoint.clone());
                let model = config.model.clone().or(provider_config.model.clone());
                let provider = OpenAiVisionProvider::new(api_key, endpoint, model);
                manager.register_provider(Arc::new(provider));
            }
            OcrProviderType::OllamaVision => {
                let endpoint = config.endpoint.clone().or(provider_config.endpoint.clone());
                let model = config.model.clone().or(provider_config.model.clone());
                let provider = OllamaVisionProvider::new(endpoint, model);
                manager.register_provider(Arc::new(provider));
            }
            OcrProviderType::GoogleVision => {
                let provider = GoogleVisionProvider::new(api_key);
                manager.register_provider(Arc::new(provider));
            }
            OcrProviderType::AzureVision => {
                let endpoint = config.endpoint.clone().or(provider_config.endpoint.clone())
                    .unwrap_or_default();
                let provider = AzureVisionProvider::new(api_key, endpoint);
                manager.register_provider(Arc::new(provider));
            }
            _ => {}
        }
    }
    if let Some(endpoint) = config.endpoint {
        provider_config.endpoint = Some(endpoint);
    }
    if let Some(model) = config.model {
        provider_config.model = Some(model);
    }
    if let Some(lang) = config.default_language {
        provider_config.default_language = Some(lang);
    }

    manager.set_config(provider_config);
    Ok(())
}

/// Register Ollama provider (doesn't require API key)
#[tauri::command]
pub async fn ocr_register_ollama(
    state: State<'_, OcrState>,
    endpoint: Option<String>,
    model: Option<String>,
) -> Result<bool, String> {
    let provider = OllamaVisionProvider::new(endpoint, model);
    let available = provider.is_available().await;

    if available {
        state.manager.read().register_provider(Arc::new(provider));
    }

    Ok(available)
}

/// Extract text using OCR
#[tauri::command]
pub async fn ocr_extract_text(
    state: State<'_, OcrState>,
    request: OcrRequest,
) -> Result<UnifiedOcrResult, String> {
    // Decode image
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&request.image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // Build options
    let options = OcrOptions {
        language: request.options.language,
        word_level: request.options.word_level.unwrap_or(false),
        ..Default::default()
    };

    // Clone manager to avoid holding lock across await
    let manager = state.manager.read().clone();
    manager
        .extract_text(request.provider, &image_data, &options)
        .await
        .map_err(|e| e.message)
}

/// Extract text with fallback to other providers
#[tauri::command]
pub async fn ocr_extract_text_with_fallback(
    state: State<'_, OcrState>,
    image_base64: String,
    preferred_providers: Vec<OcrProviderType>,
    language: Option<String>,
) -> Result<UnifiedOcrResult, String> {
    let image_data = base64::engine::general_purpose::STANDARD
        .decode(&image_base64)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let options = OcrOptions {
        language,
        ..Default::default()
    };

    // Clone manager to avoid holding lock across await
    let manager = state.manager.read().clone();
    manager
        .extract_text_with_fallback(&image_data, &options, &preferred_providers)
        .await
        .map_err(|e| e.message)
}

/// Check if a specific provider is available
#[tauri::command]
pub async fn ocr_is_provider_available(
    state: State<'_, OcrState>,
    provider: OcrProviderType,
) -> Result<bool, String> {
    // Get provider and release lock before await
    let provider_arc = {
        let manager = state.manager.read();
        manager.get_provider(&provider)
    };
    
    if let Some(p) = provider_arc {
        Ok(p.is_available().await)
    } else {
        Ok(false)
    }
}

/// Get supported languages for a provider
#[tauri::command]
pub async fn ocr_get_provider_languages(
    state: State<'_, OcrState>,
    provider: OcrProviderType,
) -> Result<Vec<String>, String> {
    // Get provider and release lock before await
    let provider_arc = {
        let manager = state.manager.read();
        manager.get_provider(&provider)
    };
    
    if let Some(p) = provider_arc {
        p.get_supported_languages()
            .await
            .map_err(|e| e.message)
    } else {
        Err(format!("Provider {:?} not registered", provider))
    }
}

/// Clear OCR result cache
#[tauri::command]
pub async fn ocr_clear_cache(state: State<'_, OcrState>) -> Result<(), String> {
    state.manager.read().clear_cache();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ocr_state_new() {
        let state = OcrState::new();
        let manager = state.manager.read();
        
        // Windows OCR should be registered by default
        let providers = manager.get_registered_providers();
        assert!(providers.contains(&OcrProviderType::WindowsOcr));
    }
}
