//! Ollama Vision OCR Provider
//!
//! Uses Ollama with vision-capable models (LLaVA, etc.) for OCR.

use crate::screenshot::ocr_provider::{
    DocumentHint, OcrBounds, OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderType,
    OcrRegion, OcrRegionType, OcrResult,
};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Ollama Vision Provider
pub struct OllamaVisionProvider {
    /// Ollama API endpoint
    endpoint: String,
    /// Model to use (e.g., "llama3.2-vision", "qwen2.5vl", "gemma3")
    model: String,
    /// Request timeout in seconds
    timeout_secs: u64,
}

impl OllamaVisionProvider {
    pub fn new(endpoint: Option<String>, model: Option<String>) -> Self {
        Self {
            endpoint: endpoint.unwrap_or_else(|| "http://localhost:11434".to_string()),
            model: model.unwrap_or_else(|| "llama3.2-vision".to_string()),
            timeout_secs: 120,
        }
    }

    /// Build OCR prompt based on options and document hint
    fn build_prompt(options: &OcrOptions) -> String {
        let base_instruction = match options.document_hint {
            Some(DocumentHint::Handwriting) => {
                "Extract all handwritten text from this image. Pay careful attention to \
                 handwriting variations."
            }
            Some(DocumentHint::Receipt) => {
                "Extract all text from this receipt/invoice. Preserve the tabular layout."
            }
            Some(DocumentHint::Screenshot) => {
                "Extract all visible text from this screenshot. Preserve the UI layout."
            }
            Some(DocumentHint::DenseText) => {
                "Extract all text from this document. Preserve paragraph structure."
            }
            Some(DocumentHint::SparseText) => {
                "Extract all visible text from this image, including labels and signs."
            }
            _ => "Extract all text from this image.",
        };

        let language_hint = options
            .language
            .as_ref()
            .map(|l| format!(" The text is in {}.", l))
            .unwrap_or_default();

        format!(
            "{} Return ONLY the extracted text, nothing else. \
             Preserve the original layout and line breaks as much as possible.{}",
            base_instruction, language_hint
        )
    }

    #[allow(dead_code)]
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }

    /// Check if Ollama server is running
    async fn check_server(&self) -> bool {
        let client = match crate::http::get_client_for_url(&self.endpoint) {
            Ok(c) => c,
            Err(_) => return false,
        };

        client
            .get(format!("{}/api/tags", self.endpoint))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }

    /// Check if the specified model is available
    async fn check_model(&self) -> bool {
        let client = match crate::http::get_client_for_url(&self.endpoint) {
            Ok(c) => c,
            Err(_) => return false,
        };

        #[derive(Deserialize)]
        struct TagsResponse {
            models: Option<Vec<ModelInfo>>,
        }

        #[derive(Deserialize)]
        struct ModelInfo {
            name: String,
        }

        let response = client
            .get(format!("{}/api/tags", self.endpoint))
            .send()
            .await;

        if let Ok(resp) = response {
            if let Ok(tags) = resp.json::<TagsResponse>().await {
                if let Some(models) = tags.models {
                    return models.iter().any(|m| {
                        m.name == self.model || m.name.starts_with(&format!("{}:", self.model))
                    });
                }
            }
        }

        false
    }
}

impl Default for OllamaVisionProvider {
    fn default() -> Self {
        Self::new(None, None)
    }
}

#[derive(Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaChatMessage>,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Serialize)]
struct OllamaChatMessage {
    role: String,
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    images: Option<Vec<String>>,
}

#[derive(Serialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: i32,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: OllamaResponseMessage,
}

#[derive(Deserialize)]
struct OllamaResponseMessage {
    content: String,
}

#[async_trait]
impl OcrProvider for OllamaVisionProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::OllamaVision
    }

    async fn is_available(&self) -> bool {
        self.check_server().await && self.check_model().await
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        // Vision models typically support multiple languages
        Ok(vec![
            "auto".to_string(),
            "en".to_string(),
            "zh".to_string(),
            "ja".to_string(),
            "ko".to_string(),
            "es".to_string(),
            "fr".to_string(),
            "de".to_string(),
            "ru".to_string(),
            "ar".to_string(),
        ])
    }

    async fn extract_text(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let client = crate::http::get_client_for_url(&self.endpoint)
            .map_err(|e| OcrError::network_error(format!("Failed to create HTTP client: {}", e)))?;

        // Encode image to base64
        let image_base64 = base64::engine::general_purpose::STANDARD.encode(image_data);

        // Build prompt based on document hint and options
        let prompt = Self::build_prompt(options);

        // Use the chat API which is the recommended approach for vision models
        let request = OllamaChatRequest {
            model: self.model.clone(),
            messages: vec![OllamaChatMessage {
                role: "user".to_string(),
                content: prompt,
                images: Some(vec![image_base64]),
            }],
            stream: false,
            options: OllamaOptions {
                temperature: 0.0,
                num_predict: 4096,
            },
        };

        let response = client
            .post(format!("{}/api/chat", self.endpoint))
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    OcrError::network_error("Request timed out")
                } else if e.is_connect() {
                    OcrError::provider_unavailable("Cannot connect to Ollama server")
                } else {
                    OcrError::network_error(format!("Request failed: {}", e))
                }
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Ollama API error ({}): {}", status, body),
            ));
        }

        let result: OllamaChatResponse = response.json().await.map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to parse response: {}", e),
            )
        })?;

        let text = result.message.content.trim().to_string();

        // Vision models don't provide bounding boxes; return text as single block
        let regions = if !text.is_empty() {
            vec![OcrRegion {
                text: text.clone(),
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 0.0,
                    height: 0.0,
                },
                confidence: 0.85,
                region_type: OcrRegionType::Block,
            }]
        } else {
            vec![]
        };

        let confidence = if regions.is_empty() { 0.0 } else { 0.85 };

        Ok(OcrResult {
            text,
            regions,
            confidence,
            language: options.language.clone(),
            provider: format!("Ollama ({})", self.model),
            processing_time_ms: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ollama_provider_new() {
        let provider = OllamaVisionProvider::new(None, None);
        assert_eq!(provider.endpoint, "http://localhost:11434");
        assert_eq!(provider.model, "llama3.2-vision");
    }

    #[test]
    fn test_ollama_provider_custom() {
        let provider = OllamaVisionProvider::new(
            Some("http://custom:8080".to_string()),
            Some("bakllava".to_string()),
        );
        assert_eq!(provider.endpoint, "http://custom:8080");
        assert_eq!(provider.model, "bakllava");
    }

    #[test]
    fn test_ollama_provider_type() {
        let provider = OllamaVisionProvider::default();
        assert_eq!(provider.provider_type(), OcrProviderType::OllamaVision);
    }
}
