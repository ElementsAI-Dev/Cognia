//! Anthropic Claude Vision OCR Provider
//!
//! Uses Anthropic's Claude models (Claude 4 Sonnet, Claude Sonnet 4.5, etc.) for OCR.
//! Claude's vision capabilities excel at text extraction with layout preservation,
//! handwriting recognition, and multilingual document understanding.

use crate::screenshot::ocr_provider::{
    DocumentHint, OcrBounds, OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderType,
    OcrRegion, OcrRegionType, OcrResult,
};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Anthropic Claude Vision Provider
pub struct AnthropicVisionProvider {
    /// API key
    api_key: String,
    /// API endpoint (for custom/proxy endpoints)
    endpoint: String,
    /// Model to use
    model: String,
    /// Request timeout in seconds
    timeout_secs: u64,
    /// Max tokens for response
    max_tokens: u32,
}

impl AnthropicVisionProvider {
    pub fn new(api_key: String, endpoint: Option<String>, model: Option<String>) -> Self {
        Self {
            api_key,
            endpoint: endpoint.unwrap_or_else(|| "https://api.anthropic.com".to_string()),
            model: model.unwrap_or_else(|| "claude-sonnet-4-5-20250929".to_string()),
            timeout_secs: 60,
            max_tokens: 4096,
        }
    }

    #[allow(dead_code)]
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }

    #[allow(dead_code)]
    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = max_tokens;
        self
    }

    /// Build OCR prompt based on options and document hint
    fn build_prompt(options: &OcrOptions) -> String {
        let base_instruction = match options.document_hint {
            Some(DocumentHint::Handwriting) => {
                "Extract all handwritten text from this image. Pay careful attention to \
                 handwriting variations and character shapes."
            }
            Some(DocumentHint::Receipt) => {
                "Extract all text from this receipt/invoice image. Preserve the tabular \
                 layout including item names, quantities, prices, and totals."
            }
            Some(DocumentHint::Screenshot) => {
                "Extract all visible text from this screenshot. Preserve the UI layout, \
                 including menus, buttons, labels, and content areas."
            }
            Some(DocumentHint::DenseText) => {
                "Extract all text from this document image. Preserve paragraph structure, \
                 headings, and text formatting hierarchy."
            }
            Some(DocumentHint::SparseText) => {
                "Extract all visible text from this image, including labels, signs, \
                 captions, and any other sparse text elements."
            }
            _ => "Extract all visible text from this image.",
        };

        let language_hint = options
            .language
            .as_ref()
            .map(|l| format!(" The text is primarily in {}.", l))
            .unwrap_or_default();

        format!(
            "{} Return ONLY the extracted text, preserving the original layout and line breaks. \
             Do not add any explanations, descriptions, or formatting markers - just the raw text \
             as it appears in the image.{}",
            base_instruction, language_hint
        )
    }
}

// ============== API Request/Response Types ==============

#[derive(Serialize)]
struct MessagesRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<Message>,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: Vec<ContentBlock>,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum ContentBlock {
    #[serde(rename = "image")]
    Image { source: ImageSource },
    #[serde(rename = "text")]
    Text { text: String },
}

#[derive(Serialize)]
struct ImageSource {
    #[serde(rename = "type")]
    source_type: String,
    media_type: String,
    data: String,
}

#[derive(Deserialize)]
struct MessagesResponse {
    content: Vec<ResponseContent>,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
enum ResponseContent {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(other)]
    Other,
}

#[derive(Deserialize)]
struct ErrorResponse {
    error: ApiError,
}

#[derive(Deserialize)]
struct ApiError {
    #[serde(rename = "type")]
    error_type: String,
    message: String,
}

// ============== OcrProvider Implementation ==============

#[async_trait]
impl OcrProvider for AnthropicVisionProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::AnthropicVision
    }

    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        // Claude models support virtually all written languages
        Ok(vec![
            "auto".to_string(),
            "en".to_string(),
            "zh".to_string(),
            "zh-Hans".to_string(),
            "zh-Hant".to_string(),
            "ja".to_string(),
            "ko".to_string(),
            "es".to_string(),
            "fr".to_string(),
            "de".to_string(),
            "it".to_string(),
            "pt".to_string(),
            "ru".to_string(),
            "ar".to_string(),
            "hi".to_string(),
            "th".to_string(),
            "vi".to_string(),
            "nl".to_string(),
            "pl".to_string(),
            "tr".to_string(),
            "uk".to_string(),
            "sv".to_string(),
            "da".to_string(),
            "fi".to_string(),
            "nb".to_string(),
            "el".to_string(),
            "he".to_string(),
            "id".to_string(),
            "ms".to_string(),
            "ro".to_string(),
            "hu".to_string(),
            "cs".to_string(),
            "bg".to_string(),
        ])
    }

    async fn extract_text(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        if self.api_key.is_empty() {
            return Err(OcrError::authentication_error("API key is required"));
        }

        let client = crate::http::create_proxy_client_with_timeout(self.timeout_secs)
            .map_err(|e| OcrError::network_error(format!("Failed to create HTTP client: {}", e)))?;

        // Detect media type from image data
        let media_type = detect_media_type(image_data);

        // Encode image to base64
        let image_base64 = base64::engine::general_purpose::STANDARD.encode(image_data);

        // Build prompt
        let prompt = Self::build_prompt(options);

        let request = MessagesRequest {
            model: self.model.clone(),
            max_tokens: self.max_tokens,
            messages: vec![Message {
                role: "user".to_string(),
                content: vec![
                    ContentBlock::Image {
                        source: ImageSource {
                            source_type: "base64".to_string(),
                            media_type,
                            data: image_base64,
                        },
                    },
                    ContentBlock::Text { text: prompt },
                ],
            }],
        };

        let response = client
            .post(format!("{}/v1/messages", self.endpoint))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    OcrError::network_error("Request timed out")
                } else if e.is_connect() {
                    OcrError::network_error("Cannot connect to Anthropic API")
                } else {
                    OcrError::network_error(format!("Request failed: {}", e))
                }
            })?;

        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();

            if let Ok(error_response) = serde_json::from_str::<ErrorResponse>(&body) {
                return Err(match error_response.error.error_type.as_str() {
                    "authentication_error" => {
                        OcrError::authentication_error(error_response.error.message)
                    }
                    "rate_limit_error" => OcrError::new(
                        OcrErrorCode::RateLimitExceeded,
                        error_response.error.message,
                    ),
                    "invalid_request_error" => {
                        OcrError::new(OcrErrorCode::ProviderError, error_response.error.message)
                    }
                    "overloaded_error" => OcrError::new(
                        OcrErrorCode::ProviderError,
                        "Anthropic API is temporarily overloaded. Please try again.",
                    ),
                    _ => OcrError::new(OcrErrorCode::ProviderError, error_response.error.message),
                });
            }

            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("API error ({}): {}", status, body),
            ));
        }

        let result: MessagesResponse = response.json().await.map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to parse response: {}", e),
            )
        })?;

        // Extract text from response content blocks
        let text = result
            .content
            .iter()
            .filter_map(|block| match block {
                ResponseContent::Text { text } => Some(text.trim().to_string()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n");

        // Claude doesn't provide bounding boxes; return as single block
        let regions = if !text.is_empty() {
            vec![OcrRegion {
                text: text.clone(),
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 0.0,
                    height: 0.0,
                },
                confidence: 0.95,
                region_type: OcrRegionType::Block,
            }]
        } else {
            vec![]
        };

        let confidence = if regions.is_empty() { 0.0 } else { 0.95 };

        Ok(OcrResult {
            text,
            regions,
            confidence,
            language: options.language.clone(),
            provider: format!("Anthropic ({})", self.model),
            processing_time_ms: 0,
        })
    }
}

/// Detect image media type from magic bytes
fn detect_media_type(data: &[u8]) -> String {
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
        "image/png".to_string()
    } else if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        "image/jpeg".to_string()
    } else if data.starts_with(b"GIF") {
        "image/gif".to_string()
    } else if data.starts_with(b"RIFF") && data.len() > 12 && &data[8..12] == b"WEBP" {
        "image/webp".to_string()
    } else {
        // Default to PNG for screenshots
        "image/png".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_anthropic_provider_new() {
        let provider = AnthropicVisionProvider::new("test_key".to_string(), None, None);
        assert_eq!(provider.endpoint, "https://api.anthropic.com");
        assert_eq!(provider.model, "claude-sonnet-4-5-20250929");
    }

    #[test]
    fn test_anthropic_provider_custom_model() {
        let provider = AnthropicVisionProvider::new(
            "test_key".to_string(),
            None,
            Some("claude-sonnet-4-20250514".to_string()),
        );
        assert_eq!(provider.model, "claude-sonnet-4-20250514");
    }

    #[test]
    fn test_anthropic_provider_custom_endpoint() {
        let provider = AnthropicVisionProvider::new(
            "key".to_string(),
            Some("https://custom-proxy.example.com".to_string()),
            None,
        );
        assert_eq!(provider.endpoint, "https://custom-proxy.example.com");
    }

    #[test]
    fn test_anthropic_provider_type() {
        let provider = AnthropicVisionProvider::new("key".to_string(), None, None);
        assert_eq!(provider.provider_type(), OcrProviderType::AnthropicVision);
    }

    #[tokio::test]
    async fn test_anthropic_provider_no_key() {
        let provider = AnthropicVisionProvider::new(String::new(), None, None);
        assert!(!provider.is_available().await);
    }

    #[tokio::test]
    async fn test_anthropic_provider_with_key() {
        let provider = AnthropicVisionProvider::new("some_key".to_string(), None, None);
        assert!(provider.is_available().await);
    }

    #[tokio::test]
    async fn test_anthropic_supported_languages() {
        let provider = AnthropicVisionProvider::new("key".to_string(), None, None);
        let languages = provider.get_supported_languages().await.unwrap();
        assert!(languages.contains(&"en".to_string()));
        assert!(languages.contains(&"zh".to_string()));
        assert!(languages.contains(&"ja".to_string()));
        assert!(languages.len() > 20);
    }

    #[test]
    fn test_build_prompt_default() {
        let options = OcrOptions::default();
        let prompt = AnthropicVisionProvider::build_prompt(&options);
        assert!(prompt.contains("Extract all visible text"));
    }

    #[test]
    fn test_build_prompt_with_hint() {
        let options = OcrOptions {
            document_hint: Some(DocumentHint::Receipt),
            ..Default::default()
        };
        let prompt = AnthropicVisionProvider::build_prompt(&options);
        assert!(prompt.contains("receipt/invoice"));
    }

    #[test]
    fn test_build_prompt_with_language() {
        let options = OcrOptions {
            language: Some("Chinese".to_string()),
            ..Default::default()
        };
        let prompt = AnthropicVisionProvider::build_prompt(&options);
        assert!(prompt.contains("Chinese"));
    }

    #[test]
    fn test_detect_media_type_png() {
        let png_header = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        assert_eq!(detect_media_type(&png_header), "image/png");
    }

    #[test]
    fn test_detect_media_type_jpeg() {
        let jpeg_header = vec![0xFF, 0xD8, 0xFF, 0xE0];
        assert_eq!(detect_media_type(&jpeg_header), "image/jpeg");
    }

    #[test]
    fn test_detect_media_type_gif() {
        let gif_header = b"GIF89a".to_vec();
        assert_eq!(detect_media_type(&gif_header), "image/gif");
    }

    #[test]
    fn test_detect_media_type_webp() {
        let mut webp_header = b"RIFF".to_vec();
        webp_header.extend_from_slice(&[0x00; 4]); // size
        webp_header.extend_from_slice(b"WEBP");
        assert_eq!(detect_media_type(&webp_header), "image/webp");
    }

    #[test]
    fn test_detect_media_type_unknown() {
        let unknown = vec![0x00, 0x01, 0x02];
        assert_eq!(detect_media_type(&unknown), "image/png");
    }

    #[test]
    fn test_with_timeout() {
        let provider =
            AnthropicVisionProvider::new("key".to_string(), None, None).with_timeout(120);
        assert_eq!(provider.timeout_secs, 120);
    }

    #[test]
    fn test_with_max_tokens() {
        let provider =
            AnthropicVisionProvider::new("key".to_string(), None, None).with_max_tokens(8192);
        assert_eq!(provider.max_tokens, 8192);
    }
}
