//! OpenAI Vision OCR Provider
//!
//! Uses OpenAI's GPT-4 Vision or compatible APIs for OCR.

use crate::screenshot::ocr_provider::{
    DocumentHint, OcrBounds, OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderType,
    OcrRegion, OcrRegionType, OcrResult,
};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// OpenAI Vision Provider
pub struct OpenAiVisionProvider {
    /// API key
    api_key: String,
    /// API endpoint (for Azure or custom endpoints)
    endpoint: String,
    /// Model to use
    model: String,
    /// Request timeout in seconds
    timeout_secs: u64,
}

impl OpenAiVisionProvider {
    pub fn new(api_key: String, endpoint: Option<String>, model: Option<String>) -> Self {
        Self {
            api_key,
            endpoint: endpoint.unwrap_or_else(|| "https://api.openai.com/v1".to_string()),
            model: model.unwrap_or_else(|| "gpt-4o-mini".to_string()),
            timeout_secs: 60,
        }
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
            _ => {
                "Extract all visible text from this image."
            }
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

    /// Create provider for Azure OpenAI
    #[allow(dead_code)]
    pub fn azure(api_key: String, endpoint: String, deployment: String) -> Self {
        Self {
            api_key,
            endpoint,
            model: deployment,
            timeout_secs: 60,
        }
    }

    #[allow(dead_code)]
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }
}

#[derive(Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize)]
struct ChatMessage {
    role: String,
    content: Vec<ContentPart>,
}

#[derive(Serialize)]
#[serde(tag = "type")]
enum ContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

#[derive(Serialize)]
struct ImageUrl {
    url: String,
    detail: String,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Deserialize)]
struct ResponseMessage {
    content: String,
}

#[derive(Deserialize)]
struct ErrorResponse {
    error: ApiError,
}

#[derive(Deserialize)]
struct ApiError {
    message: String,
    #[serde(rename = "type")]
    error_type: Option<String>,
}

#[async_trait]
impl OcrProvider for OpenAiVisionProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::OpenAiVision
    }

    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        // GPT-4V supports virtually all languages
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

        // Encode image to base64 data URL
        let image_base64 = base64::engine::general_purpose::STANDARD.encode(image_data);
        let image_url = format!("data:image/png;base64,{}", image_base64);

        // Build prompt based on document hint and language
        let prompt = Self::build_prompt(options);

        let request = ChatCompletionRequest {
            model: self.model.clone(),
            messages: vec![ChatMessage {
                role: "user".to_string(),
                content: vec![
                    ContentPart::Text { text: prompt },
                    ContentPart::ImageUrl {
                        image_url: ImageUrl {
                            url: image_url,
                            detail: "high".to_string(),
                        },
                    },
                ],
            }],
            max_tokens: 4096,
            temperature: 0.0,
        };

        let response = client
            .post(format!("{}/chat/completions", self.endpoint))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    OcrError::network_error("Request timed out")
                } else if e.is_connect() {
                    OcrError::network_error("Cannot connect to OpenAI API")
                } else {
                    OcrError::network_error(format!("Request failed: {}", e))
                }
            })?;

        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();

            // Try to parse error response
            if let Ok(error_response) = serde_json::from_str::<ErrorResponse>(&body) {
                let error_type = error_response.error.error_type.as_deref();

                return Err(match error_type {
                    Some("invalid_api_key") | Some("authentication_error") => {
                        OcrError::authentication_error(error_response.error.message)
                    }
                    Some("rate_limit_exceeded") => OcrError::new(
                        OcrErrorCode::RateLimitExceeded,
                        error_response.error.message,
                    ),
                    _ => OcrError::new(OcrErrorCode::ProviderError, error_response.error.message),
                });
            }

            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("API error ({}): {}", status, body),
            ));
        }

        let result: ChatCompletionResponse = response.json().await.map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to parse response: {}", e),
            )
        })?;

        let text = result
            .choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .unwrap_or_default();

        // Vision models don't provide bounding boxes
        let regions = if !text.is_empty() {
            vec![OcrRegion {
                text: text.clone(),
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 0.0,
                    height: 0.0,
                },
                confidence: 0.95, // High confidence for GPT-4V
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
            provider: format!("OpenAI ({})", self.model),
            processing_time_ms: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_openai_provider_new() {
        let provider = OpenAiVisionProvider::new("test_key".to_string(), None, None);
        assert_eq!(provider.endpoint, "https://api.openai.com/v1");
        assert_eq!(provider.model, "gpt-4o-mini");
    }

    #[test]
    fn test_openai_provider_azure() {
        let provider = OpenAiVisionProvider::azure(
            "azure_key".to_string(),
            "https://myresource.openai.azure.com".to_string(),
            "gpt-4-vision".to_string(),
        );
        assert_eq!(provider.endpoint, "https://myresource.openai.azure.com");
        assert_eq!(provider.model, "gpt-4-vision");
    }

    #[test]
    fn test_openai_provider_type() {
        let provider = OpenAiVisionProvider::new("key".to_string(), None, None);
        assert_eq!(provider.provider_type(), OcrProviderType::OpenAiVision);
    }

    #[tokio::test]
    async fn test_openai_provider_no_key() {
        let provider = OpenAiVisionProvider::new(String::new(), None, None);
        assert!(!provider.is_available().await);
    }

    #[tokio::test]
    async fn test_openai_provider_with_key() {
        let provider = OpenAiVisionProvider::new("some_key".to_string(), None, None);
        assert!(provider.is_available().await);
    }
}
