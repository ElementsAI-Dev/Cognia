//! Azure Computer Vision OCR Provider
//!
//! Uses Azure Cognitive Services Computer Vision API for text extraction.

use crate::screenshot::ocr_provider::{
    OcrBounds, OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderType, OcrRegion,
    OcrRegionType, OcrResult,
};
use async_trait::async_trait;
use serde::Deserialize;

/// Azure Computer Vision Provider
pub struct AzureVisionProvider {
    /// Subscription key
    subscription_key: String,
    /// Azure endpoint URL
    endpoint: String,
    /// Request timeout in seconds
    timeout_secs: u64,
}

impl AzureVisionProvider {
    pub fn new(subscription_key: String, endpoint: String) -> Self {
        // Ensure endpoint doesn't have trailing slash
        let endpoint = endpoint.trim_end_matches('/').to_string();
        
        Self {
            subscription_key,
            endpoint,
            timeout_secs: 60,
        }
    }

    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }
}

// Azure Read API response structures
#[derive(Deserialize)]
struct ReadOperationResult {
    status: String,
    #[serde(rename = "analyzeResult")]
    analyze_result: Option<AnalyzeResult>,
}

#[derive(Deserialize)]
struct AnalyzeResult {
    #[serde(rename = "readResults")]
    read_results: Vec<ReadResult>,
}

#[derive(Deserialize)]
struct ReadResult {
    #[serde(default)]
    lines: Vec<TextLine>,
    #[serde(default)]
    angle: f64,
    #[serde(default)]
    width: f64,
    #[serde(default)]
    height: f64,
}

#[derive(Deserialize)]
struct TextLine {
    text: String,
    #[serde(rename = "boundingBox")]
    bounding_box: Vec<f64>,
    #[serde(default)]
    words: Vec<TextWord>,
}

#[derive(Deserialize)]
struct TextWord {
    text: String,
    #[serde(rename = "boundingBox")]
    bounding_box: Vec<f64>,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize)]
struct AzureError {
    error: AzureErrorDetail,
}

#[derive(Deserialize)]
struct AzureErrorDetail {
    code: String,
    message: String,
}

fn bounding_box_to_bounds(bbox: &[f64]) -> OcrBounds {
    if bbox.len() < 8 {
        return OcrBounds {
            x: 0.0,
            y: 0.0,
            width: 0.0,
            height: 0.0,
        };
    }

    // Azure provides 4 corner points: [x1,y1, x2,y2, x3,y3, x4,y4]
    let min_x = bbox.iter().step_by(2).cloned().fold(f64::MAX, f64::min);
    let min_y = bbox.iter().skip(1).step_by(2).cloned().fold(f64::MAX, f64::min);
    let max_x = bbox.iter().step_by(2).cloned().fold(0.0_f64, f64::max);
    let max_y = bbox.iter().skip(1).step_by(2).cloned().fold(0.0_f64, f64::max);

    OcrBounds {
        x: min_x,
        y: min_y,
        width: max_x - min_x,
        height: max_y - min_y,
    }
}

#[async_trait]
impl OcrProvider for AzureVisionProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::AzureVision
    }

    async fn is_available(&self) -> bool {
        !self.subscription_key.is_empty() && !self.endpoint.is_empty()
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        // Azure Read API supports many languages
        // https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/language-support
        Ok(vec![
            "auto".to_string(),
            "en".to_string(),
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
            "nl".to_string(),
            "pl".to_string(),
            "tr".to_string(),
            "uk".to_string(),
            "cs".to_string(),
            "sv".to_string(),
        ])
    }

    async fn extract_text(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        if self.subscription_key.is_empty() {
            return Err(OcrError::authentication_error("Subscription key is required"));
        }

        if self.endpoint.is_empty() {
            return Err(OcrError::authentication_error("Endpoint URL is required"));
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(self.timeout_secs))
            .build()
            .map_err(|e| OcrError::network_error(format!("Failed to create HTTP client: {}", e)))?;

        // Build URL with optional language parameter
        let mut url = format!(
            "{}/vision/v3.2/read/analyze",
            self.endpoint
        );

        if let Some(ref lang) = options.language {
            if lang != "auto" {
                url = format!("{}?language={}", url, lang);
            }
        }

        // Submit image for analysis
        let submit_response = client
            .post(&url)
            .header("Ocp-Apim-Subscription-Key", &self.subscription_key)
            .header("Content-Type", "application/octet-stream")
            .body(image_data.to_vec())
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    OcrError::network_error("Request timed out")
                } else if e.is_connect() {
                    OcrError::network_error("Cannot connect to Azure API")
                } else {
                    OcrError::network_error(format!("Request failed: {}", e))
                }
            })?;

        let status = submit_response.status();

        if !status.is_success() {
            let body = submit_response.text().await.unwrap_or_default();
            
            if let Ok(error) = serde_json::from_str::<AzureError>(&body) {
                return Err(OcrError::new(
                    OcrErrorCode::ProviderError,
                    format!("{}: {}", error.error.code, error.error.message),
                ));
            }

            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Azure API error ({}): {}", status, body),
            ));
        }

        // Get the Operation-Location header for polling
        let operation_location = submit_response
            .headers()
            .get("Operation-Location")
            .and_then(|h| h.to_str().ok())
            .ok_or_else(|| {
                OcrError::new(
                    OcrErrorCode::ProviderError,
                    "Missing Operation-Location header in response",
                )
            })?
            .to_string();

        // Poll for results
        let mut attempts = 0;
        let max_attempts = 30; // 30 seconds max wait
        
        loop {
            attempts += 1;
            if attempts > max_attempts {
                return Err(OcrError::new(
                    OcrErrorCode::ProviderError,
                    "Timeout waiting for OCR results",
                ));
            }

            tokio::time::sleep(std::time::Duration::from_secs(1)).await;

            let poll_response = client
                .get(&operation_location)
                .header("Ocp-Apim-Subscription-Key", &self.subscription_key)
                .send()
                .await
                .map_err(|e| OcrError::network_error(format!("Poll request failed: {}", e)))?;

            if !poll_response.status().is_success() {
                let body = poll_response.text().await.unwrap_or_default();
                return Err(OcrError::new(
                    OcrErrorCode::ProviderError,
                    format!("Poll failed: {}", body),
                ));
            }

            let result: ReadOperationResult = poll_response.json().await.map_err(|e| {
                OcrError::new(
                    OcrErrorCode::ProviderError,
                    format!("Failed to parse response: {}", e),
                )
            })?;

            match result.status.as_str() {
                "succeeded" => {
                    return self.process_result(result, options);
                }
                "failed" => {
                    return Err(OcrError::new(
                        OcrErrorCode::ProviderError,
                        "OCR operation failed",
                    ));
                }
                "running" | "notStarted" => {
                    continue;
                }
                _ => {
                    return Err(OcrError::new(
                        OcrErrorCode::ProviderError,
                        format!("Unknown status: {}", result.status),
                    ));
                }
            }
        }
    }
}

impl AzureVisionProvider {
    fn process_result(
        &self,
        result: ReadOperationResult,
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let analyze_result = result.analyze_result.ok_or_else(|| {
            OcrError::new(OcrErrorCode::ProviderError, "No analysis result")
        })?;

        let mut full_text = String::new();
        let mut regions = Vec::new();
        let mut confidence_sum = 0.0;
        let mut confidence_count = 0;

        for read_result in &analyze_result.read_results {
            for line in &read_result.lines {
                if !full_text.is_empty() {
                    full_text.push('\n');
                }
                full_text.push_str(&line.text);

                if options.word_level {
                    for word in &line.words {
                        regions.push(OcrRegion {
                            text: word.text.clone(),
                            bounds: bounding_box_to_bounds(&word.bounding_box),
                            confidence: word.confidence,
                            region_type: OcrRegionType::Word,
                        });
                        confidence_sum += word.confidence;
                        confidence_count += 1;
                    }
                } else {
                    // Calculate line confidence from word confidences
                    let line_confidence = if line.words.is_empty() {
                        0.9
                    } else {
                        line.words.iter().map(|w| w.confidence).sum::<f64>() / line.words.len() as f64
                    };

                    regions.push(OcrRegion {
                        text: line.text.clone(),
                        bounds: bounding_box_to_bounds(&line.bounding_box),
                        confidence: line_confidence,
                        region_type: OcrRegionType::Line,
                    });
                    confidence_sum += line_confidence;
                    confidence_count += 1;
                }
            }
        }

        let confidence = if confidence_count > 0 {
            confidence_sum / confidence_count as f64
        } else if full_text.is_empty() {
            0.0
        } else {
            0.9
        };

        Ok(OcrResult {
            text: full_text,
            regions,
            confidence,
            language: options.language.clone(),
            provider: "Azure Computer Vision".to_string(),
            processing_time_ms: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_azure_provider_new() {
        let provider = AzureVisionProvider::new(
            "test_key".to_string(),
            "https://myresource.cognitiveservices.azure.com".to_string(),
        );
        assert_eq!(provider.provider_type(), OcrProviderType::AzureVision);
    }

    #[tokio::test]
    async fn test_azure_provider_no_key() {
        let provider = AzureVisionProvider::new(
            String::new(),
            "https://test.cognitiveservices.azure.com".to_string(),
        );
        assert!(!provider.is_available().await);
    }

    #[tokio::test]
    async fn test_azure_provider_no_endpoint() {
        let provider = AzureVisionProvider::new("some_key".to_string(), String::new());
        assert!(!provider.is_available().await);
    }

    #[tokio::test]
    async fn test_azure_provider_with_credentials() {
        let provider = AzureVisionProvider::new(
            "some_key".to_string(),
            "https://test.cognitiveservices.azure.com".to_string(),
        );
        assert!(provider.is_available().await);
    }

    #[test]
    fn test_bounding_box_to_bounds() {
        let bbox = vec![10.0, 20.0, 110.0, 20.0, 110.0, 70.0, 10.0, 70.0];
        let bounds = bounding_box_to_bounds(&bbox);
        
        assert_eq!(bounds.x, 10.0);
        assert_eq!(bounds.y, 20.0);
        assert_eq!(bounds.width, 100.0);
        assert_eq!(bounds.height, 50.0);
    }

    #[test]
    fn test_bounding_box_empty() {
        let bounds = bounding_box_to_bounds(&[]);
        assert_eq!(bounds.x, 0.0);
        assert_eq!(bounds.width, 0.0);
    }

    #[test]
    fn test_endpoint_trailing_slash_removed() {
        let provider = AzureVisionProvider::new(
            "key".to_string(),
            "https://test.azure.com/".to_string(),
        );
        assert_eq!(provider.endpoint, "https://test.azure.com");
    }
}
