//! OCR Provider System
//!
//! Multi-provider OCR architecture supporting:
//! - Windows OCR (built-in, Windows 10+)
//! - Cloud providers (Google Vision, Azure, OpenAI Vision, Ollama)
//! - Local engines (Tesseract via system binary)

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============== Unified OCR Result Types ==============

/// Unified OCR result from any provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    /// Full extracted text
    pub text: String,
    /// Individual text regions with positions
    pub regions: Vec<OcrRegion>,
    /// Overall confidence score (0.0 - 1.0)
    pub confidence: f64,
    /// Detected or specified language
    pub language: Option<String>,
    /// Provider that produced this result
    pub provider: String,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
}

/// A region of recognized text with position
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrRegion {
    /// The recognized text
    pub text: String,
    /// Bounding box
    pub bounds: OcrBounds,
    /// Confidence for this region (0.0 - 1.0)
    pub confidence: f64,
    /// Region type (line, word, paragraph, block)
    pub region_type: OcrRegionType,
}

/// Bounding box for OCR text
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Type of OCR region
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum OcrRegionType {
    Word,
    Line,
    Paragraph,
    Block,
}

// ============== Provider Types ==============

/// Available OCR providers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum OcrProviderType {
    /// Windows built-in OCR (Windows 10+)
    WindowsOcr,
    /// Google Cloud Vision API
    GoogleVision,
    /// Azure Computer Vision
    AzureVision,
    /// OpenAI Vision (GPT-4V)
    OpenAiVision,
    /// Ollama with vision models (LLaVA, etc.)
    OllamaVision,
    /// Tesseract OCR (local binary)
    Tesseract,
}

impl OcrProviderType {
    /// Get display name for the provider
    pub fn display_name(&self) -> &'static str {
        match self {
            Self::WindowsOcr => "Windows OCR",
            Self::GoogleVision => "Google Cloud Vision",
            Self::AzureVision => "Azure Computer Vision",
            Self::OpenAiVision => "OpenAI Vision",
            Self::OllamaVision => "Ollama Vision",
            Self::Tesseract => "Tesseract OCR",
        }
    }

    /// Check if provider requires API key
    pub fn requires_api_key(&self) -> bool {
        matches!(
            self,
            Self::GoogleVision | Self::AzureVision | Self::OpenAiVision
        )
    }

    /// Check if provider is local (no network required)
    pub fn is_local(&self) -> bool {
        matches!(self, Self::WindowsOcr | Self::Tesseract)
    }

    /// Get all provider types
    pub fn all() -> Vec<Self> {
        vec![
            Self::WindowsOcr,
            Self::GoogleVision,
            Self::AzureVision,
            Self::OpenAiVision,
            Self::OllamaVision,
            Self::Tesseract,
        ]
    }
}

// ============== Provider Configuration ==============

/// Configuration for an OCR provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrProviderConfig {
    /// Provider type
    pub provider_type: OcrProviderType,
    /// Whether this provider is enabled
    pub enabled: bool,
    /// API key (for cloud providers)
    pub api_key: Option<String>,
    /// API endpoint URL (for custom endpoints)
    pub endpoint: Option<String>,
    /// Model name (for AI-based providers)
    pub model: Option<String>,
    /// Default language for OCR
    pub default_language: Option<String>,
    /// Additional provider-specific options
    pub options: HashMap<String, String>,
}

impl Default for OcrProviderConfig {
    fn default() -> Self {
        Self {
            provider_type: OcrProviderType::WindowsOcr,
            enabled: true,
            api_key: None,
            endpoint: None,
            model: None,
            default_language: None,
            options: HashMap::new(),
        }
    }
}

/// OCR request options
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OcrOptions {
    /// Preferred language for OCR
    pub language: Option<String>,
    /// Hint about document type
    pub document_hint: Option<DocumentHint>,
    /// Whether to detect text orientation
    pub detect_orientation: bool,
    /// Whether to return detailed word-level results
    pub word_level: bool,
}

/// Hint about document type for better OCR
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentHint {
    /// General document
    Document,
    /// Dense text (book, article)
    DenseText,
    /// Sparse text (signs, labels)
    SparseText,
    /// Handwritten text
    Handwriting,
    /// Receipt or invoice
    Receipt,
    /// Screenshot or UI
    Screenshot,
}

// ============== Provider Trait ==============

/// Trait for OCR providers
#[async_trait]
pub trait OcrProvider: Send + Sync {
    /// Get the provider type
    fn provider_type(&self) -> OcrProviderType;

    /// Get display name
    fn display_name(&self) -> &str {
        self.provider_type().display_name()
    }

    /// Check if provider is available
    async fn is_available(&self) -> bool;

    /// Get supported languages
    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError>;

    /// Extract text from image data (PNG format)
    async fn extract_text(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError>;

    /// Check if a specific language is supported
    async fn is_language_supported(&self, language: &str) -> bool {
        self.get_supported_languages()
            .await
            .map(|langs| {
                langs
                    .iter()
                    .any(|l| l == language || l.starts_with(language))
            })
            .unwrap_or(false)
    }
}

// ============== Error Types ==============

/// OCR error types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrError {
    /// Error code
    pub code: OcrErrorCode,
    /// Human-readable message
    pub message: String,
    /// Provider that caused the error
    pub provider: Option<String>,
}

impl std::fmt::Display for OcrError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for OcrError {}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OcrErrorCode {
    /// Provider not available
    ProviderUnavailable,
    /// Invalid image data
    InvalidImage,
    /// Language not supported
    UnsupportedLanguage,
    /// API key missing or invalid
    AuthenticationError,
    /// Rate limit exceeded
    RateLimitExceeded,
    /// Network error
    NetworkError,
    /// Provider-specific error
    ProviderError,
    /// Configuration error
    ConfigurationError,
    /// Unknown error
    Unknown,
}

impl std::fmt::Display for OcrErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ProviderUnavailable => write!(f, "Provider unavailable"),
            Self::InvalidImage => write!(f, "Invalid image"),
            Self::UnsupportedLanguage => write!(f, "Unsupported language"),
            Self::AuthenticationError => write!(f, "Authentication error"),
            Self::RateLimitExceeded => write!(f, "Rate limit exceeded"),
            Self::NetworkError => write!(f, "Network error"),
            Self::ProviderError => write!(f, "Provider error"),
            Self::ConfigurationError => write!(f, "Configuration error"),
            Self::Unknown => write!(f, "Unknown error"),
        }
    }
}

impl OcrError {
    pub fn new(code: OcrErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            provider: None,
        }
    }

    pub fn with_provider(mut self, provider: impl Into<String>) -> Self {
        self.provider = Some(provider.into());
        self
    }

    pub fn provider_unavailable(message: impl Into<String>) -> Self {
        Self::new(OcrErrorCode::ProviderUnavailable, message)
    }

    pub fn invalid_image(message: impl Into<String>) -> Self {
        Self::new(OcrErrorCode::InvalidImage, message)
    }

    pub fn authentication_error(message: impl Into<String>) -> Self {
        Self::new(OcrErrorCode::AuthenticationError, message)
    }

    pub fn network_error(message: impl Into<String>) -> Self {
        Self::new(OcrErrorCode::NetworkError, message)
    }
}

// ============== Provider Info ==============

/// Information about an OCR provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrProviderInfo {
    /// Provider type
    pub provider_type: OcrProviderType,
    /// Display name
    pub display_name: String,
    /// Whether provider is available
    pub available: bool,
    /// Whether provider requires API key
    pub requires_api_key: bool,
    /// Whether provider is local
    pub is_local: bool,
    /// Supported languages (if known)
    pub languages: Vec<String>,
    /// Provider description
    pub description: String,
}

impl OcrProviderInfo {
    pub fn new(provider_type: OcrProviderType, available: bool, languages: Vec<String>) -> Self {
        let description = match provider_type {
            OcrProviderType::WindowsOcr => {
                "Built-in Windows OCR. Fast, offline, supports multiple languages."
            }
            OcrProviderType::GoogleVision => {
                "Google Cloud Vision API. High accuracy, supports 100+ languages."
            }
            OcrProviderType::AzureVision => {
                "Azure Computer Vision. Enterprise-grade OCR with handwriting support."
            }
            OcrProviderType::OpenAiVision => {
                "OpenAI GPT-4 Vision. AI-powered text extraction with context understanding."
            }
            OcrProviderType::OllamaVision => {
                "Ollama with vision models. Local AI OCR using LLaVA or similar models."
            }
            OcrProviderType::Tesseract => {
                "Tesseract OCR engine. Open-source, supports 100+ languages."
            }
        };

        Self {
            display_name: provider_type.display_name().to_string(),
            requires_api_key: provider_type.requires_api_key(),
            is_local: provider_type.is_local(),
            provider_type,
            available,
            languages,
            description: description.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_provider_type_display_name() {
        assert_eq!(OcrProviderType::WindowsOcr.display_name(), "Windows OCR");
        assert_eq!(
            OcrProviderType::GoogleVision.display_name(),
            "Google Cloud Vision"
        );
    }

    #[test]
    fn test_provider_type_requires_api_key() {
        assert!(!OcrProviderType::WindowsOcr.requires_api_key());
        assert!(OcrProviderType::GoogleVision.requires_api_key());
        assert!(!OcrProviderType::Tesseract.requires_api_key());
    }

    #[test]
    fn test_provider_type_is_local() {
        assert!(OcrProviderType::WindowsOcr.is_local());
        assert!(OcrProviderType::Tesseract.is_local());
        assert!(!OcrProviderType::GoogleVision.is_local());
    }

    #[test]
    fn test_ocr_result_serialization() {
        let result = OcrResult {
            text: "Hello World".to_string(),
            regions: vec![],
            confidence: 0.95,
            language: Some("en".to_string()),
            provider: "windows_ocr".to_string(),
            processing_time_ms: 150,
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: OcrResult = serde_json::from_str(&json).unwrap();

        assert_eq!(result.text, deserialized.text);
        assert_eq!(result.confidence, deserialized.confidence);
    }

    #[test]
    fn test_ocr_error() {
        let err = OcrError::provider_unavailable("Windows OCR not installed")
            .with_provider("windows_ocr");

        assert_eq!(err.code, OcrErrorCode::ProviderUnavailable);
        assert_eq!(err.provider, Some("windows_ocr".to_string()));
    }

    #[test]
    fn test_provider_config_default() {
        let config = OcrProviderConfig::default();
        assert_eq!(config.provider_type, OcrProviderType::WindowsOcr);
        assert!(config.enabled);
        assert!(config.api_key.is_none());
    }
}
