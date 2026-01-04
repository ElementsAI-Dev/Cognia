//! Windows OCR Provider
//!
//! Wraps the existing WindowsOcr implementation as an OcrProvider.

use crate::screenshot::ocr_provider::{
    OcrBounds, OcrError, OcrOptions, OcrProvider, OcrProviderType, OcrRegion, OcrRegionType,
    OcrResult,
};
use crate::screenshot::windows_ocr::WindowsOcr;
use async_trait::async_trait;

/// Windows OCR Provider implementation
pub struct WindowsOcrProvider {
    ocr: WindowsOcr,
}

impl WindowsOcrProvider {
    pub fn new() -> Self {
        Self {
            ocr: WindowsOcr::new(),
        }
    }

    pub fn with_language(language: &str) -> Self {
        Self {
            ocr: WindowsOcr::with_language(language),
        }
    }
}

impl Default for WindowsOcrProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl OcrProvider for WindowsOcrProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::WindowsOcr
    }

    async fn is_available(&self) -> bool {
        WindowsOcr::is_available()
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        Ok(WindowsOcr::get_available_languages())
    }

    async fn extract_text(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        // Create OCR instance with specified language
        let mut ocr = WindowsOcr::new();
        if let Some(ref lang) = options.language {
            ocr.set_language(lang);
        }

        // Perform OCR
        let win_result = ocr.extract_text(image_data).map_err(|e| {
            OcrError::new(
                crate::screenshot::ocr_provider::OcrErrorCode::ProviderError,
                e,
            )
            .with_provider("Windows OCR")
        })?;

        // Convert to unified result format
        let mut regions = Vec::new();

        for line in &win_result.lines {
            // Add line region
            regions.push(OcrRegion {
                text: line.text.clone(),
                bounds: OcrBounds {
                    x: line.bounds.x,
                    y: line.bounds.y,
                    width: line.bounds.width,
                    height: line.bounds.height,
                },
                confidence: 0.9, // Windows OCR doesn't provide line-level confidence
                region_type: OcrRegionType::Line,
            });

            // Add word regions if requested
            if options.word_level {
                for word in &line.words {
                    regions.push(OcrRegion {
                        text: word.text.clone(),
                        bounds: OcrBounds {
                            x: word.bounds.x,
                            y: word.bounds.y,
                            width: word.bounds.width,
                            height: word.bounds.height,
                        },
                        confidence: word.confidence,
                        region_type: OcrRegionType::Word,
                    });
                }
            }
        }

        Ok(OcrResult {
            text: win_result.text,
            regions,
            confidence: win_result.confidence,
            language: win_result.language,
            provider: "Windows OCR".to_string(),
            processing_time_ms: 0, // Will be set by manager
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_windows_ocr_provider_new() {
        let provider = WindowsOcrProvider::new();
        assert_eq!(provider.provider_type(), OcrProviderType::WindowsOcr);
    }

    #[test]
    fn test_windows_ocr_provider_display_name() {
        let provider = WindowsOcrProvider::new();
        assert_eq!(provider.display_name(), "Windows OCR");
    }

    #[tokio::test]
    async fn test_windows_ocr_provider_languages() {
        let provider = WindowsOcrProvider::new();
        let languages = provider.get_supported_languages().await;
        
        // Should return some languages (actual list depends on system)
        assert!(languages.is_ok());
    }
}
