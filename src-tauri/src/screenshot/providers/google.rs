//! Google Cloud Vision OCR Provider
//!
//! Uses Google Cloud Vision API for text extraction.

use crate::screenshot::ocr_provider::{
    DocumentHint, OcrBounds, OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderType,
    OcrRegion, OcrRegionType, OcrResult,
};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Google Cloud Vision Provider
pub struct GoogleVisionProvider {
    /// API key
    api_key: String,
    /// API endpoint
    endpoint: String,
    /// Request timeout in seconds
    timeout_secs: u64,
}

impl GoogleVisionProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            endpoint: "https://vision.googleapis.com/v1/images:annotate".to_string(),
            timeout_secs: 30,
        }
    }

    #[allow(dead_code)]
    pub fn with_endpoint(mut self, endpoint: String) -> Self {
        self.endpoint = endpoint;
        self
    }

    #[allow(dead_code)]
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }
}

#[derive(Serialize)]
struct VisionRequest {
    requests: Vec<AnnotateImageRequest>,
}

#[derive(Serialize)]
struct AnnotateImageRequest {
    image: Image,
    features: Vec<Feature>,
    #[serde(skip_serializing_if = "Option::is_none")]
    image_context: Option<ImageContext>,
}

#[derive(Serialize)]
struct Image {
    content: String,
}

#[derive(Serialize)]
struct Feature {
    #[serde(rename = "type")]
    feature_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_results: Option<i32>,
}

#[derive(Serialize)]
struct ImageContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    language_hints: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct VisionResponse {
    responses: Vec<AnnotateImageResponse>,
}

#[derive(Deserialize)]
struct AnnotateImageResponse {
    #[serde(default)]
    text_annotations: Vec<TextAnnotation>,
    #[serde(default)]
    full_text_annotation: Option<FullTextAnnotation>,
    error: Option<VisionError>,
}

#[derive(Deserialize)]
struct TextAnnotation {
    description: String,
    #[serde(default)]
    bounding_poly: Option<BoundingPoly>,
    #[serde(default)]
    locale: Option<String>,
}

#[derive(Deserialize)]
struct FullTextAnnotation {
    text: String,
    #[serde(default)]
    pages: Vec<Page>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct Page {
    #[serde(default)]
    blocks: Vec<Block>,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct Block {
    #[serde(default)]
    paragraphs: Vec<Paragraph>,
    #[serde(default)]
    bounding_box: Option<BoundingPoly>,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize)]
struct Paragraph {
    #[serde(default)]
    words: Vec<Word>,
    #[serde(default)]
    bounding_box: Option<BoundingPoly>,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize)]
struct Word {
    #[serde(default)]
    symbols: Vec<Symbol>,
    #[serde(default)]
    bounding_box: Option<BoundingPoly>,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct Symbol {
    text: String,
    #[serde(default)]
    confidence: f64,
}

#[derive(Deserialize, Clone)]
struct BoundingPoly {
    #[serde(default)]
    vertices: Vec<Vertex>,
}

#[derive(Deserialize, Clone)]
struct Vertex {
    #[serde(default)]
    x: i32,
    #[serde(default)]
    y: i32,
}

#[derive(Deserialize)]
struct VisionError {
    code: i32,
    message: String,
}

impl BoundingPoly {
    fn to_bounds(&self) -> OcrBounds {
        if self.vertices.len() < 4 {
            return OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 0.0,
                height: 0.0,
            };
        }

        let min_x = self.vertices.iter().map(|v| v.x).min().unwrap_or(0);
        let min_y = self.vertices.iter().map(|v| v.y).min().unwrap_or(0);
        let max_x = self.vertices.iter().map(|v| v.x).max().unwrap_or(0);
        let max_y = self.vertices.iter().map(|v| v.y).max().unwrap_or(0);

        OcrBounds {
            x: min_x as f64,
            y: min_y as f64,
            width: (max_x - min_x) as f64,
            height: (max_y - min_y) as f64,
        }
    }
}

#[async_trait]
impl OcrProvider for GoogleVisionProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::GoogleVision
    }

    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        // Google Vision supports 100+ languages
        // https://cloud.google.com/vision/docs/languages
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

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(self.timeout_secs))
            .build()
            .map_err(|e| OcrError::network_error(format!("Failed to create HTTP client: {}", e)))?;

        // Encode image to base64
        let image_base64 = base64::engine::general_purpose::STANDARD.encode(image_data);

        // Build request
        let mut image_context = None;
        if let Some(ref lang) = options.language {
            if lang != "auto" {
                image_context = Some(ImageContext {
                    language_hints: Some(vec![lang.clone()]),
                });
            }
        }

        // Choose detection type based on document hint
        // DOCUMENT_TEXT_DETECTION is better for dense text/documents
        // TEXT_DETECTION is better for sparse text in photos/screenshots
        let feature_type = match options.document_hint {
            Some(DocumentHint::DenseText) | Some(DocumentHint::Document) | Some(DocumentHint::Handwriting) => {
                "DOCUMENT_TEXT_DETECTION"
            }
            Some(DocumentHint::SparseText) | Some(DocumentHint::Screenshot) => {
                "TEXT_DETECTION"
            }
            _ => "DOCUMENT_TEXT_DETECTION", // Default to document detection for best coverage
        };

        let request = VisionRequest {
            requests: vec![AnnotateImageRequest {
                image: Image {
                    content: image_base64,
                },
                features: vec![Feature {
                    feature_type: feature_type.to_string(),
                    max_results: None,
                }],
                image_context,
            }],
        };

        let url = format!("{}?key={}", self.endpoint, self.api_key);

        let response = client.post(&url).json(&request).send().await.map_err(|e| {
            if e.is_timeout() {
                OcrError::network_error("Request timed out")
            } else if e.is_connect() {
                OcrError::network_error("Cannot connect to Google Vision API")
            } else {
                OcrError::network_error(format!("Request failed: {}", e))
            }
        })?;

        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();

            // Handle authentication errors specifically
            if status.as_u16() == 401 || status.as_u16() == 403 {
                return Err(OcrError::authentication_error(
                    format!("Google Vision API authentication failed ({}): {}", status, body),
                ));
            }
            if status.as_u16() == 429 {
                return Err(OcrError::new(
                    OcrErrorCode::RateLimitExceeded,
                    format!("Google Vision API rate limit exceeded: {}", body),
                ));
            }

            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Google Vision API error ({}): {}", status, body),
            ));
        }

        let result: VisionResponse = response.json().await.map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to parse response: {}", e),
            )
        })?;

        // Process response
        let response =
            result.responses.into_iter().next().ok_or_else(|| {
                OcrError::new(OcrErrorCode::ProviderError, "Empty response from API")
            })?;

        // Check for errors
        if let Some(error) = response.error {
            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("API error ({}): {}", error.code, error.message),
            ));
        }

        // Extract text and regions
        let (text, regions, language, confidence) = if let Some(full_text) = response.full_text_annotation {
            let text = full_text.text.clone();
            let mut regions = Vec::new();
            let mut confidence_sum = 0.0;
            let mut confidence_count = 0;

            for page in &full_text.pages {
                for block in &page.blocks {
                    for para in &block.paragraphs {
                        if options.word_level {
                            for word in &para.words {
                                let word_text: String =
                                    word.symbols.iter().map(|s| s.text.as_str()).collect();
                                if let Some(ref bbox) = word.bounding_box {
                                    regions.push(OcrRegion {
                                        text: word_text,
                                        bounds: bbox.to_bounds(),
                                        confidence: word.confidence,
                                        region_type: OcrRegionType::Word,
                                    });
                                }
                                confidence_sum += word.confidence;
                                confidence_count += 1;
                            }
                        } else {
                            // Paragraph level
                            let para_text: String = para
                                .words
                                .iter()
                                .map(|w| {
                                    w.symbols
                                        .iter()
                                        .map(|s| s.text.as_str())
                                        .collect::<String>()
                                })
                                .collect::<Vec<_>>()
                                .join(" ");

                            if let Some(ref bbox) = para.bounding_box {
                                regions.push(OcrRegion {
                                    text: para_text,
                                    bounds: bbox.to_bounds(),
                                    confidence: para.confidence,
                                    region_type: OcrRegionType::Paragraph,
                                });
                            }
                            confidence_sum += para.confidence;
                            confidence_count += 1;
                        }
                    }
                }
            }

            let avg_confidence = if confidence_count > 0 {
                confidence_sum / confidence_count as f64
            } else {
                0.9
            };

            (text, regions, None, avg_confidence)
        } else if !response.text_annotations.is_empty() {
            // Use TEXT_DETECTION results
            let first = &response.text_annotations[0];
            let text = first.description.clone();
            let language = first.locale.clone();

            // Skip first annotation (full text) and use the rest as word regions
            let regions: Vec<OcrRegion> = response
                .text_annotations
                .iter()
                .skip(1)
                .filter_map(|ann| {
                    ann.bounding_poly.as_ref().map(|bbox| OcrRegion {
                        text: ann.description.clone(),
                        bounds: bbox.to_bounds(),
                        confidence: 0.9, // TEXT_DETECTION doesn't provide confidence
                        region_type: OcrRegionType::Word,
                    })
                })
                .collect();

            let conf = if regions.is_empty() { 0.9 } else {
                regions.iter().map(|r| r.confidence).sum::<f64>() / regions.len() as f64
            };
            (text, regions, language, conf)
        } else {
            (String::new(), vec![], None, 0.0)
        };

        Ok(OcrResult {
            text,
            regions,
            confidence,
            language: language.or(options.language.clone()),
            provider: "Google Cloud Vision".to_string(),
            processing_time_ms: 0,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_google_provider_new() {
        let provider = GoogleVisionProvider::new("test_key".to_string());
        assert_eq!(provider.provider_type(), OcrProviderType::GoogleVision);
    }

    #[tokio::test]
    async fn test_google_provider_no_key() {
        let provider = GoogleVisionProvider::new(String::new());
        assert!(!provider.is_available().await);
    }

    #[tokio::test]
    async fn test_google_provider_with_key() {
        let provider = GoogleVisionProvider::new("some_key".to_string());
        assert!(provider.is_available().await);
    }

    #[test]
    fn test_bounding_poly_to_bounds() {
        let poly = BoundingPoly {
            vertices: vec![
                Vertex { x: 10, y: 20 },
                Vertex { x: 110, y: 20 },
                Vertex { x: 110, y: 70 },
                Vertex { x: 10, y: 70 },
            ],
        };

        let bounds = poly.to_bounds();
        assert_eq!(bounds.x, 10.0);
        assert_eq!(bounds.y, 20.0);
        assert_eq!(bounds.width, 100.0);
        assert_eq!(bounds.height, 50.0);
    }

    #[test]
    fn test_bounding_poly_empty() {
        let poly = BoundingPoly { vertices: vec![] };
        let bounds = poly.to_bounds();
        assert_eq!(bounds.x, 0.0);
        assert_eq!(bounds.width, 0.0);
    }
}
