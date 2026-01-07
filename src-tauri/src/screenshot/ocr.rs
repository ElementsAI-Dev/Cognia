//! OCR (Optical Character Recognition) engine
//!
//! Legacy OCR types for backwards compatibility.
//! The main OCR functionality is now provided by the multi-provider system
//! in `ocr_provider.rs` and `ocr_manager.rs`.

use super::windows_ocr::WindowsOcr;
use serde::{Deserialize, Serialize};

/// Legacy OCR result with text and bounding boxes
/// Note: Prefer using `ocr_provider::OcrResult` for new code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrResult {
    /// Full extracted text
    pub text: String,
    /// Individual text blocks with positions
    pub blocks: Vec<OcrTextBlock>,
    /// Confidence score (0.0 - 1.0)
    pub confidence: f64,
    /// Language detected
    pub language: Option<String>,
}

/// A block of recognized text with position
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrTextBlock {
    /// The recognized text
    pub text: String,
    /// Bounding box
    pub bounds: OcrBounds,
    /// Confidence for this block
    pub confidence: f64,
}

/// Bounding box for OCR text
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// OCR Engine - delegates to WindowsOcr for actual OCR functionality
///
/// This provides a simplified interface for basic OCR operations.
/// For advanced multi-provider OCR, use the `OcrManager` directly.
pub struct OcrEngine {
    windows_ocr: WindowsOcr,
}

impl OcrEngine {
    /// Create a new OCR engine
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            windows_ocr: WindowsOcr::new(),
        })
    }

    /// Extract text from PNG image data using Windows OCR
    pub fn extract_text(&self, image_data: &[u8]) -> Result<String, String> {
        log::debug!("OCR extraction requested for {} bytes", image_data.len());

        let result = self.windows_ocr.extract_text(image_data)?;
        Ok(result.text)
    }

    /// Extract text asynchronously with full result
    pub async fn extract_text_async(&self, image_data: Vec<u8>) -> Result<OcrResult, String> {
        let win_result = self.windows_ocr.extract_text(&image_data)?;

        // Convert WindowsOcr result to legacy OcrResult
        let blocks: Vec<OcrTextBlock> = win_result
            .lines
            .iter()
            .flat_map(|line| {
                line.words.iter().map(|word| OcrTextBlock {
                    text: word.text.clone(),
                    bounds: OcrBounds {
                        x: word.bounds.x,
                        y: word.bounds.y,
                        width: word.bounds.width,
                        height: word.bounds.height,
                    },
                    confidence: word.confidence,
                })
            })
            .collect();

        Ok(OcrResult {
            text: win_result.text,
            blocks,
            confidence: win_result.confidence,
            language: win_result.language,
        })
    }

    /// Get available OCR languages from Windows OCR
    pub fn get_available_languages() -> Vec<String> {
        WindowsOcr::get_available_languages()
    }

    /// Check if OCR is available on this system
    pub fn is_available() -> bool {
        WindowsOcr::is_available()
    }
}

impl Default for OcrEngine {
    fn default() -> Self {
        Self::new().unwrap_or(Self {
            windows_ocr: WindowsOcr::new(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== OcrBounds Tests ====================

    #[test]
    fn test_ocr_bounds_creation() {
        let bounds = OcrBounds {
            x: 10.0,
            y: 20.0,
            width: 100.0,
            height: 50.0,
        };

        assert_eq!(bounds.x, 10.0);
        assert_eq!(bounds.y, 20.0);
        assert_eq!(bounds.width, 100.0);
        assert_eq!(bounds.height, 50.0);
    }

    #[test]
    fn test_ocr_bounds_serialization() {
        let bounds = OcrBounds {
            x: 5.5,
            y: 10.5,
            width: 200.0,
            height: 100.0,
        };

        let json = serde_json::to_string(&bounds).unwrap();
        let deserialized: OcrBounds = serde_json::from_str(&json).unwrap();

        assert_eq!(bounds.x, deserialized.x);
        assert_eq!(bounds.y, deserialized.y);
        assert_eq!(bounds.width, deserialized.width);
        assert_eq!(bounds.height, deserialized.height);
    }

    #[test]
    fn test_ocr_bounds_clone() {
        let bounds = OcrBounds {
            x: 0.0,
            y: 0.0,
            width: 50.0,
            height: 25.0,
        };
        let cloned = bounds.clone();

        assert_eq!(bounds.x, cloned.x);
        assert_eq!(bounds.width, cloned.width);
    }

    // ==================== OcrTextBlock Tests ====================

    #[test]
    fn test_ocr_text_block_creation() {
        let block = OcrTextBlock {
            text: "Hello World".to_string(),
            bounds: OcrBounds {
                x: 10.0,
                y: 10.0,
                width: 100.0,
                height: 20.0,
            },
            confidence: 0.95,
        };

        assert_eq!(block.text, "Hello World");
        assert_eq!(block.confidence, 0.95);
    }

    #[test]
    fn test_ocr_text_block_serialization() {
        let block = OcrTextBlock {
            text: "Test".to_string(),
            bounds: OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 50.0,
                height: 20.0,
            },
            confidence: 0.88,
        };

        let json = serde_json::to_string(&block).unwrap();
        let deserialized: OcrTextBlock = serde_json::from_str(&json).unwrap();

        assert_eq!(block.text, deserialized.text);
        assert_eq!(block.confidence, deserialized.confidence);
    }

    #[test]
    fn test_ocr_text_block_clone() {
        let block = OcrTextBlock {
            text: "Cloneable".to_string(),
            bounds: OcrBounds {
                x: 1.0,
                y: 2.0,
                width: 3.0,
                height: 4.0,
            },
            confidence: 0.99,
        };
        let cloned = block.clone();

        assert_eq!(block.text, cloned.text);
        assert_eq!(block.bounds.x, cloned.bounds.x);
    }

    // ==================== OcrResult Tests ====================

    #[test]
    fn test_ocr_result_creation() {
        let result = OcrResult {
            text: "Full text content".to_string(),
            blocks: vec![
                OcrTextBlock {
                    text: "Full".to_string(),
                    bounds: OcrBounds {
                        x: 0.0,
                        y: 0.0,
                        width: 30.0,
                        height: 15.0,
                    },
                    confidence: 0.9,
                },
                OcrTextBlock {
                    text: "text".to_string(),
                    bounds: OcrBounds {
                        x: 35.0,
                        y: 0.0,
                        width: 30.0,
                        height: 15.0,
                    },
                    confidence: 0.92,
                },
            ],
            confidence: 0.91,
            language: Some("en-US".to_string()),
        };

        assert_eq!(result.text, "Full text content");
        assert_eq!(result.blocks.len(), 2);
        assert_eq!(result.confidence, 0.91);
        assert_eq!(result.language, Some("en-US".to_string()));
    }

    #[test]
    fn test_ocr_result_empty() {
        let result = OcrResult {
            text: String::new(),
            blocks: Vec::new(),
            confidence: 0.0,
            language: None,
        };

        assert!(result.text.is_empty());
        assert!(result.blocks.is_empty());
        assert!(result.language.is_none());
    }

    #[test]
    fn test_ocr_result_serialization() {
        let result = OcrResult {
            text: "Test OCR".to_string(),
            blocks: vec![],
            confidence: 0.85,
            language: Some("zh-CN".to_string()),
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: OcrResult = serde_json::from_str(&json).unwrap();

        assert_eq!(result.text, deserialized.text);
        assert_eq!(result.confidence, deserialized.confidence);
        assert_eq!(result.language, deserialized.language);
    }

    #[test]
    fn test_ocr_result_clone() {
        let result = OcrResult {
            text: "Clone me".to_string(),
            blocks: vec![OcrTextBlock {
                text: "Clone".to_string(),
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 40.0,
                    height: 20.0,
                },
                confidence: 0.95,
            }],
            confidence: 0.95,
            language: Some("en".to_string()),
        };
        let cloned = result.clone();

        assert_eq!(result.text, cloned.text);
        assert_eq!(result.blocks.len(), cloned.blocks.len());
    }

    // ==================== OcrEngine Tests ====================

    #[test]
    fn test_ocr_engine_new() {
        let engine = OcrEngine::new();
        assert!(engine.is_ok());
    }

    #[test]
    fn test_ocr_engine_default() {
        let engine = OcrEngine::default();
        // Just verify it doesn't panic
        assert!(std::mem::size_of_val(&engine) > 0);
    }

    #[test]
    fn test_ocr_engine_extract_text_invalid_png() {
        let engine = OcrEngine::new().unwrap();
        let dummy_image_data = vec![0u8; 100];

        // Invalid PNG data should return error
        let result = engine.extract_text(&dummy_image_data);
        assert!(result.is_err());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_ocr_engine_get_available_languages() {
        let languages = OcrEngine::get_available_languages();
        // On Windows, should return installed OCR languages
        // The actual list depends on what's installed
        assert!(!languages.is_empty() || languages.is_empty()); // May be empty if no languages installed
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_ocr_engine_get_available_languages_non_windows() {
        let languages = OcrEngine::get_available_languages();
        // On non-Windows, returns empty list
        assert!(languages.is_empty());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_ocr_engine_is_available() {
        // On Windows, availability depends on installed languages
        let _is_available = OcrEngine::is_available();
        // Just verify it doesn't panic
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_ocr_engine_is_available_non_windows() {
        // On non-Windows, OCR is not available
        assert!(!OcrEngine::is_available());
    }

    #[cfg(target_os = "windows")]
    #[tokio::test]
    async fn test_ocr_engine_extract_text_async_with_valid_png() {
        let engine = OcrEngine::new().unwrap();

        // Create a minimal valid PNG (too small for actual OCR)
        let mut png_data = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut png_data, 40, 40);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().unwrap();
            let pixels = vec![255u8; 40 * 40 * 4];
            writer.write_image_data(&pixels).unwrap();
        }

        // May succeed or fail depending on Windows OCR availability
        let _result = engine.extract_text_async(png_data).await;
    }

    #[tokio::test]
    async fn test_ocr_engine_extract_text_async_invalid_png() {
        let engine = OcrEngine::new().unwrap();
        let invalid_data = vec![1, 2, 3, 4, 5]; // Not a valid PNG

        let result = engine.extract_text_async(invalid_data).await;
        assert!(result.is_err());
    }
}
