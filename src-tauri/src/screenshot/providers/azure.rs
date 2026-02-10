//! Azure Computer Vision OCR Provider
//!
//! Uses Azure Image Analysis 4.0 API for synchronous OCR text extraction.
//! Also supports the legacy Read API v3.2 for document-heavy OCR.
//!
//! Ref: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/concept-ocr

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

    #[allow(dead_code)]
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }
}

// ============== Image Analysis 4.0 Response Types ==============

#[derive(Deserialize)]
struct ImageAnalysisResponse {
    #[serde(rename = "readResult")]
    read_result: ReadResult4,
}

#[derive(Deserialize)]
struct ReadResult4 {
    #[serde(default)]
    blocks: Vec<ReadBlock>,
}

#[derive(Deserialize)]
struct ReadBlock {
    #[serde(default)]
    lines: Vec<ReadLine4>,
}

#[derive(Deserialize)]
struct ReadLine4 {
    text: String,
    #[serde(rename = "boundingPolygon", default)]
    bounding_polygon: Vec<PointF>,
    #[serde(default)]
    words: Vec<ReadWord4>,
}

#[derive(Deserialize)]
struct ReadWord4 {
    text: String,
    #[serde(rename = "boundingPolygon", default)]
    bounding_polygon: Vec<PointF>,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize, Clone)]
struct PointF {
    #[serde(default)]
    x: f64,
    #[serde(default)]
    y: f64,
}

// ============== Legacy Read API v3.2 Response Types ==============

#[derive(Deserialize)]
struct ReadOperationResult {
    status: String,
    #[serde(rename = "analyzeResult")]
    analyze_result: Option<AnalyzeResult>,
}

#[derive(Deserialize)]
struct AnalyzeResult {
    #[serde(rename = "readResults")]
    read_results: Vec<LegacyReadResult>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct LegacyReadResult {
    #[serde(default)]
    lines: Vec<LegacyTextLine>,
    #[serde(default)]
    angle: f64,
    #[serde(default)]
    width: f64,
    #[serde(default)]
    height: f64,
}

#[derive(Deserialize)]
struct LegacyTextLine {
    text: String,
    #[serde(rename = "boundingBox")]
    bounding_box: Vec<f64>,
    #[serde(default)]
    words: Vec<LegacyTextWord>,
}

#[derive(Deserialize)]
struct LegacyTextWord {
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

/// Convert polygon points to bounding box (Image Analysis 4.0 format)
fn polygon_to_bounds(points: &[PointF]) -> OcrBounds {
    if points.is_empty() {
        return OcrBounds {
            x: 0.0,
            y: 0.0,
            width: 0.0,
            height: 0.0,
        };
    }

    let min_x = points.iter().map(|p| p.x).fold(f64::MAX, f64::min);
    let min_y = points.iter().map(|p| p.y).fold(f64::MAX, f64::min);
    let max_x = points.iter().map(|p| p.x).fold(f64::MIN, f64::max);
    let max_y = points.iter().map(|p| p.y).fold(f64::MIN, f64::max);

    OcrBounds {
        x: min_x,
        y: min_y,
        width: max_x - min_x,
        height: max_y - min_y,
    }
}

/// Convert legacy bounding box array to bounds (Read API v3.2 format)
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
    let min_y = bbox
        .iter()
        .skip(1)
        .step_by(2)
        .cloned()
        .fold(f64::MAX, f64::min);
    let max_x = bbox.iter().step_by(2).cloned().fold(0.0_f64, f64::max);
    let max_y = bbox
        .iter()
        .skip(1)
        .step_by(2)
        .cloned()
        .fold(0.0_f64, f64::max);

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
            return Err(OcrError::authentication_error(
                "Subscription key is required",
            ));
        }

        if self.endpoint.is_empty() {
            return Err(OcrError::authentication_error("Endpoint URL is required"));
        }

        // Try Image Analysis 4.0 synchronous API first, fall back to legacy Read v3.2
        match self.extract_text_v4(image_data, options).await {
            Ok(result) => Ok(result),
            Err(e) => {
                log::warn!("Azure Image Analysis 4.0 failed, falling back to legacy Read v3.2: {}", e);
                self.extract_text_legacy(image_data, options).await
            }
        }
    }
}

impl AzureVisionProvider {
    /// Image Analysis 4.0 synchronous OCR — fast, no polling
    async fn extract_text_v4(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let client = crate::http::create_proxy_client_with_timeout(self.timeout_secs)
            .map_err(|e| OcrError::network_error(format!("Failed to create HTTP client: {}", e)))?;

        // Image Analysis 4.0 endpoint
        let mut url = format!(
            "{}/computervision/imageanalysis:analyze?features=read&api-version=2024-02-01",
            self.endpoint
        );

        if let Some(ref lang) = options.language {
            if lang != "auto" {
                url = format!("{}&language={}", url, lang);
            }
        }

        let response = client
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

        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
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

        let result: ImageAnalysisResponse = response.json().await.map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to parse v4.0 response: {}", e),
            )
        })?;

        self.process_v4_result(result, options)
    }

    /// Legacy Read API v3.2 — async polling, better for documents
    async fn extract_text_legacy(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let client = crate::http::create_proxy_client_with_timeout(self.timeout_secs)
            .map_err(|e| OcrError::network_error(format!("Failed to create HTTP client: {}", e)))?;

        let mut url = format!("{}/vision/v3.2/read/analyze", self.endpoint);

        if let Some(ref lang) = options.language {
            if lang != "auto" {
                url = format!("{}?language={}", url, lang);
            }
        }

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
        let max_attempts = 30;

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
                    return self.process_legacy_result(result, options);
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

    /// Process Image Analysis 4.0 synchronous response
    fn process_v4_result(
        &self,
        result: ImageAnalysisResponse,
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let mut full_text = String::new();
        let mut regions = Vec::new();
        let mut confidence_sum = 0.0;
        let mut confidence_count = 0;

        for block in &result.read_result.blocks {
            for line in &block.lines {
                if !full_text.is_empty() {
                    full_text.push('\n');
                }
                full_text.push_str(&line.text);

                if options.word_level {
                    for word in &line.words {
                        regions.push(OcrRegion {
                            text: word.text.clone(),
                            bounds: polygon_to_bounds(&word.bounding_polygon),
                            confidence: word.confidence,
                            region_type: OcrRegionType::Word,
                        });
                        confidence_sum += word.confidence;
                        confidence_count += 1;
                    }
                } else {
                    let line_confidence = if line.words.is_empty() {
                        0.9
                    } else {
                        line.words.iter().map(|w| w.confidence).sum::<f64>()
                            / line.words.len() as f64
                    };

                    regions.push(OcrRegion {
                        text: line.text.clone(),
                        bounds: polygon_to_bounds(&line.bounding_polygon),
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
            provider: "Azure Computer Vision (v4.0)".to_string(),
            processing_time_ms: 0,
        })
    }

    /// Process legacy Read API v3.2 response
    fn process_legacy_result(
        &self,
        result: ReadOperationResult,
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        let analyze_result = result
            .analyze_result
            .ok_or_else(|| OcrError::new(OcrErrorCode::ProviderError, "No analysis result"))?;

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
                    let line_confidence = if line.words.is_empty() {
                        0.9
                    } else {
                        line.words.iter().map(|w| w.confidence).sum::<f64>()
                            / line.words.len() as f64
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
            provider: "Azure Computer Vision (v3.2)".to_string(),
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
        let provider =
            AzureVisionProvider::new("key".to_string(), "https://test.azure.com/".to_string());
        assert_eq!(provider.endpoint, "https://test.azure.com");
    }

    #[test]
    fn test_polygon_to_bounds() {
        let points = vec![
            PointF { x: 10.0, y: 20.0 },
            PointF { x: 110.0, y: 20.0 },
            PointF { x: 110.0, y: 70.0 },
            PointF { x: 10.0, y: 70.0 },
        ];
        let bounds = polygon_to_bounds(&points);
        assert_eq!(bounds.x, 10.0);
        assert_eq!(bounds.y, 20.0);
        assert_eq!(bounds.width, 100.0);
        assert_eq!(bounds.height, 50.0);
    }

    #[test]
    fn test_polygon_to_bounds_empty() {
        let bounds = polygon_to_bounds(&[]);
        assert_eq!(bounds.x, 0.0);
        assert_eq!(bounds.width, 0.0);
    }
}
