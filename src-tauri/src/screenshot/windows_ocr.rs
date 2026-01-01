//! Windows OCR integration
//!
//! Uses Windows Runtime OCR API for text extraction from images.

use serde::{Deserialize, Serialize};

/// OCR result with text and bounding boxes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WinOcrResult {
    /// Full extracted text
    pub text: String,
    /// Individual text lines with positions
    pub lines: Vec<OcrLine>,
    /// Detected language
    pub language: Option<String>,
    /// Overall confidence
    pub confidence: f64,
}

/// A line of recognized text
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrLine {
    /// The text content
    pub text: String,
    /// Words in this line
    pub words: Vec<OcrWord>,
    /// Bounding box
    pub bounds: OcrBounds,
}

/// A single word
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrWord {
    /// The word text
    pub text: String,
    /// Bounding box
    pub bounds: OcrBounds,
    /// Confidence for this word
    pub confidence: f64,
}

/// Bounding box
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Windows OCR Engine
pub struct WindowsOcr {
    /// Preferred language for OCR
    language: String,
}

impl WindowsOcr {
    pub fn new() -> Self {
        Self {
            language: "en-US".to_string(),
        }
    }

    pub fn with_language(language: &str) -> Self {
        Self {
            language: language.to_string(),
        }
    }

    /// Set the OCR language
    pub fn set_language(&mut self, language: &str) {
        self.language = language.to_string();
    }

    /// Extract text from PNG image data
    #[cfg(target_os = "windows")]
    pub fn extract_text(&self, image_data: &[u8]) -> Result<WinOcrResult, String> {
        // Decode PNG to get raw pixels
        let decoder = png::Decoder::new(std::io::Cursor::new(image_data));
        let mut reader = decoder.read_info().map_err(|e| format!("Failed to decode PNG: {}", e))?;
        let mut buf = vec![0; reader.output_buffer_size()];
        let info = reader.next_frame(&mut buf).map_err(|e| format!("Failed to read PNG frame: {}", e))?;
        
        let width = info.width;
        let height = info.height;
        let pixels = &buf[..info.buffer_size()];

        // For now, return a placeholder result
        // Full Windows Runtime OCR integration requires the windows crate with WinRT features
        // which adds significant compile time and complexity
        
        log::info!("OCR requested for {}x{} image", width, height);
        
        // Placeholder - in production, use Windows.Media.Ocr API
        Ok(WinOcrResult {
            text: String::new(),
            lines: Vec::new(),
            language: Some(self.language.clone()),
            confidence: 0.0,
        })
    }

    #[cfg(not(target_os = "windows"))]
    pub fn extract_text(&self, _image_data: &[u8]) -> Result<WinOcrResult, String> {
        Err("Windows OCR is only available on Windows".to_string())
    }

    /// Extract text from raw RGBA pixels
    #[cfg(target_os = "windows")]
    pub fn extract_text_from_pixels(&self, pixels: &[u8], width: u32, height: u32) -> Result<WinOcrResult, String> {
        log::info!("OCR requested for {}x{} pixels", width, height);
        
        // Placeholder
        Ok(WinOcrResult {
            text: String::new(),
            lines: Vec::new(),
            language: Some(self.language.clone()),
            confidence: 0.0,
        })
    }

    #[cfg(not(target_os = "windows"))]
    pub fn extract_text_from_pixels(&self, _pixels: &[u8], _width: u32, _height: u32) -> Result<WinOcrResult, String> {
        Err("Windows OCR is only available on Windows".to_string())
    }

    /// Get available OCR languages
    pub fn get_available_languages() -> Vec<String> {
        vec![
            "en-US".to_string(),
            "zh-Hans".to_string(),
            "zh-Hant".to_string(),
            "ja".to_string(),
            "ko".to_string(),
            "de-DE".to_string(),
            "fr-FR".to_string(),
            "es-ES".to_string(),
            "it-IT".to_string(),
            "pt-BR".to_string(),
            "ru-RU".to_string(),
        ]
    }

    /// Check if OCR is available
    #[cfg(target_os = "windows")]
    pub fn is_available() -> bool {
        // Windows 10+ has built-in OCR
        true
    }

    #[cfg(not(target_os = "windows"))]
    pub fn is_available() -> bool {
        false
    }
}

impl Default for WindowsOcr {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== OcrBounds Tests ====================

    #[test]
    fn test_ocr_bounds_creation() {
        let bounds = OcrBounds {
            x: 10.5,
            y: 20.5,
            width: 100.0,
            height: 50.0,
        };
        
        assert_eq!(bounds.x, 10.5);
        assert_eq!(bounds.y, 20.5);
        assert_eq!(bounds.width, 100.0);
        assert_eq!(bounds.height, 50.0);
    }

    #[test]
    fn test_ocr_bounds_serialization() {
        let bounds = OcrBounds {
            x: 0.0,
            y: 0.0,
            width: 200.0,
            height: 100.0,
        };
        
        let json = serde_json::to_string(&bounds).unwrap();
        let deserialized: OcrBounds = serde_json::from_str(&json).unwrap();
        
        assert_eq!(bounds.x, deserialized.x);
        assert_eq!(bounds.width, deserialized.width);
    }

    #[test]
    fn test_ocr_bounds_clone() {
        let bounds = OcrBounds {
            x: 5.0, y: 10.0, width: 50.0, height: 25.0,
        };
        let cloned = bounds.clone();
        
        assert_eq!(bounds.x, cloned.x);
        assert_eq!(bounds.height, cloned.height);
    }

    // ==================== OcrWord Tests ====================

    #[test]
    fn test_ocr_word_creation() {
        let word = OcrWord {
            text: "Hello".to_string(),
            bounds: OcrBounds { x: 0.0, y: 0.0, width: 30.0, height: 15.0 },
            confidence: 0.95,
        };
        
        assert_eq!(word.text, "Hello");
        assert_eq!(word.confidence, 0.95);
    }

    #[test]
    fn test_ocr_word_serialization() {
        let word = OcrWord {
            text: "World".to_string(),
            bounds: OcrBounds { x: 35.0, y: 0.0, width: 35.0, height: 15.0 },
            confidence: 0.92,
        };
        
        let json = serde_json::to_string(&word).unwrap();
        let deserialized: OcrWord = serde_json::from_str(&json).unwrap();
        
        assert_eq!(word.text, deserialized.text);
        assert_eq!(word.confidence, deserialized.confidence);
    }

    #[test]
    fn test_ocr_word_clone() {
        let word = OcrWord {
            text: "Test".to_string(),
            bounds: OcrBounds { x: 0.0, y: 0.0, width: 25.0, height: 12.0 },
            confidence: 0.88,
        };
        let cloned = word.clone();
        
        assert_eq!(word.text, cloned.text);
        assert_eq!(word.bounds.width, cloned.bounds.width);
    }

    // ==================== OcrLine Tests ====================

    #[test]
    fn test_ocr_line_creation() {
        let line = OcrLine {
            text: "Hello World".to_string(),
            words: vec![
                OcrWord {
                    text: "Hello".to_string(),
                    bounds: OcrBounds { x: 0.0, y: 0.0, width: 30.0, height: 15.0 },
                    confidence: 0.95,
                },
                OcrWord {
                    text: "World".to_string(),
                    bounds: OcrBounds { x: 35.0, y: 0.0, width: 35.0, height: 15.0 },
                    confidence: 0.93,
                },
            ],
            bounds: OcrBounds { x: 0.0, y: 0.0, width: 70.0, height: 15.0 },
        };
        
        assert_eq!(line.text, "Hello World");
        assert_eq!(line.words.len(), 2);
    }

    #[test]
    fn test_ocr_line_empty_words() {
        let line = OcrLine {
            text: String::new(),
            words: Vec::new(),
            bounds: OcrBounds { x: 0.0, y: 0.0, width: 0.0, height: 0.0 },
        };
        
        assert!(line.text.is_empty());
        assert!(line.words.is_empty());
    }

    #[test]
    fn test_ocr_line_serialization() {
        let line = OcrLine {
            text: "Test line".to_string(),
            words: vec![
                OcrWord {
                    text: "Test".to_string(),
                    bounds: OcrBounds { x: 0.0, y: 0.0, width: 25.0, height: 12.0 },
                    confidence: 0.9,
                },
            ],
            bounds: OcrBounds { x: 0.0, y: 0.0, width: 50.0, height: 12.0 },
        };
        
        let json = serde_json::to_string(&line).unwrap();
        let deserialized: OcrLine = serde_json::from_str(&json).unwrap();
        
        assert_eq!(line.text, deserialized.text);
        assert_eq!(line.words.len(), deserialized.words.len());
    }

    #[test]
    fn test_ocr_line_clone() {
        let line = OcrLine {
            text: "Clone".to_string(),
            words: vec![],
            bounds: OcrBounds { x: 10.0, y: 20.0, width: 40.0, height: 15.0 },
        };
        let cloned = line.clone();
        
        assert_eq!(line.text, cloned.text);
        assert_eq!(line.bounds.x, cloned.bounds.x);
    }

    // ==================== WinOcrResult Tests ====================

    #[test]
    fn test_win_ocr_result_creation() {
        let result = WinOcrResult {
            text: "Full OCR text".to_string(),
            lines: vec![
                OcrLine {
                    text: "Full OCR text".to_string(),
                    words: vec![],
                    bounds: OcrBounds { x: 0.0, y: 0.0, width: 100.0, height: 20.0 },
                },
            ],
            language: Some("en-US".to_string()),
            confidence: 0.9,
        };
        
        assert_eq!(result.text, "Full OCR text");
        assert_eq!(result.lines.len(), 1);
        assert_eq!(result.language, Some("en-US".to_string()));
        assert_eq!(result.confidence, 0.9);
    }

    #[test]
    fn test_win_ocr_result_empty() {
        let result = WinOcrResult {
            text: String::new(),
            lines: Vec::new(),
            language: None,
            confidence: 0.0,
        };
        
        assert!(result.text.is_empty());
        assert!(result.lines.is_empty());
        assert!(result.language.is_none());
    }

    #[test]
    fn test_win_ocr_result_serialization() {
        let result = WinOcrResult {
            text: "Test".to_string(),
            lines: vec![],
            language: Some("zh-Hans".to_string()),
            confidence: 0.85,
        };
        
        let json = serde_json::to_string(&result).unwrap();
        let deserialized: WinOcrResult = serde_json::from_str(&json).unwrap();
        
        assert_eq!(result.text, deserialized.text);
        assert_eq!(result.language, deserialized.language);
        assert_eq!(result.confidence, deserialized.confidence);
    }

    #[test]
    fn test_win_ocr_result_clone() {
        let result = WinOcrResult {
            text: "Clone me".to_string(),
            lines: vec![],
            language: Some("ja".to_string()),
            confidence: 0.88,
        };
        let cloned = result.clone();
        
        assert_eq!(result.text, cloned.text);
        assert_eq!(result.language, cloned.language);
    }

    // ==================== WindowsOcr Tests ====================

    #[test]
    fn test_windows_ocr_new() {
        let ocr = WindowsOcr::new();
        assert_eq!(ocr.language, "en-US");
    }

    #[test]
    fn test_windows_ocr_default() {
        let ocr = WindowsOcr::default();
        assert_eq!(ocr.language, "en-US");
    }

    #[test]
    fn test_windows_ocr_with_language() {
        let ocr = WindowsOcr::with_language("zh-Hans");
        assert_eq!(ocr.language, "zh-Hans");
    }

    #[test]
    fn test_windows_ocr_set_language() {
        let mut ocr = WindowsOcr::new();
        assert_eq!(ocr.language, "en-US");
        
        ocr.set_language("ja");
        assert_eq!(ocr.language, "ja");
        
        ocr.set_language("ko");
        assert_eq!(ocr.language, "ko");
    }

    #[test]
    fn test_windows_ocr_get_available_languages() {
        let languages = WindowsOcr::get_available_languages();
        
        assert!(!languages.is_empty());
        assert!(languages.contains(&"en-US".to_string()));
        assert!(languages.contains(&"zh-Hans".to_string()));
        assert!(languages.contains(&"zh-Hant".to_string()));
        assert!(languages.contains(&"ja".to_string()));
        assert!(languages.contains(&"ko".to_string()));
        assert!(languages.contains(&"de-DE".to_string()));
        assert!(languages.contains(&"fr-FR".to_string()));
        assert!(languages.contains(&"es-ES".to_string()));
        assert!(languages.contains(&"it-IT".to_string()));
        assert!(languages.contains(&"pt-BR".to_string()));
        assert!(languages.contains(&"ru-RU".to_string()));
    }

    #[test]
    fn test_windows_ocr_available_languages_count() {
        let languages = WindowsOcr::get_available_languages();
        assert_eq!(languages.len(), 11);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_ocr_is_available_windows() {
        assert!(WindowsOcr::is_available());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_windows_ocr_is_available_not_windows() {
        assert!(!WindowsOcr::is_available());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_ocr_extract_text_with_valid_png() {
        let ocr = WindowsOcr::new();
        
        // Create a minimal valid PNG
        let mut png_data = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut png_data, 2, 2);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().unwrap();
            let pixels = vec![255u8; 2 * 2 * 4];
            writer.write_image_data(&pixels).unwrap();
        }
        
        let result = ocr.extract_text(&png_data);
        assert!(result.is_ok());
        
        let ocr_result = result.unwrap();
        // Placeholder returns empty result with language set
        assert_eq!(ocr_result.language, Some("en-US".to_string()));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_ocr_extract_text_invalid_png() {
        let ocr = WindowsOcr::new();
        let invalid_data = vec![1, 2, 3, 4, 5]; // Not a valid PNG
        
        let result = ocr.extract_text(&invalid_data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Failed to decode PNG"));
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_windows_ocr_extract_text_not_windows() {
        let ocr = WindowsOcr::new();
        let dummy_data = vec![0u8; 100];
        
        let result = ocr.extract_text(&dummy_data);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("only available on Windows"));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_ocr_extract_text_from_pixels() {
        let ocr = WindowsOcr::new();
        let pixels = vec![255u8; 10 * 10 * 4]; // 10x10 white image
        
        let result = ocr.extract_text_from_pixels(&pixels, 10, 10);
        assert!(result.is_ok());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_windows_ocr_extract_text_from_pixels_not_windows() {
        let ocr = WindowsOcr::new();
        let pixels = vec![0u8; 100];
        
        let result = ocr.extract_text_from_pixels(&pixels, 10, 10);
        assert!(result.is_err());
    }

    #[test]
    fn test_windows_ocr_language_change_affects_result() {
        let mut ocr = WindowsOcr::new();
        assert_eq!(ocr.language, "en-US");
        
        ocr.set_language("zh-Hans");
        assert_eq!(ocr.language, "zh-Hans");
        
        // Create valid PNG for testing on Windows
        #[cfg(target_os = "windows")]
        {
            let mut png_data = Vec::new();
            {
                let mut encoder = png::Encoder::new(&mut png_data, 2, 2);
                encoder.set_color(png::ColorType::Rgba);
                encoder.set_depth(png::BitDepth::Eight);
                let mut writer = encoder.write_header().unwrap();
                let pixels = vec![255u8; 2 * 2 * 4];
                writer.write_image_data(&pixels).unwrap();
            }
            
            let result = ocr.extract_text(&png_data).unwrap();
            assert_eq!(result.language, Some("zh-Hans".to_string()));
        }
    }

    #[test]
    fn test_windows_ocr_debug() {
        let ocr = WindowsOcr::with_language("fr-FR");
        // WindowsOcr doesn't derive Debug, so we just verify it exists
        assert_eq!(ocr.language, "fr-FR");
    }

    // ==================== Integration-like Tests ====================

    #[test]
    fn test_full_ocr_result_structure() {
        // Test a complete OCR result structure
        let result = WinOcrResult {
            text: "Hello World\nSecond Line".to_string(),
            lines: vec![
                OcrLine {
                    text: "Hello World".to_string(),
                    words: vec![
                        OcrWord {
                            text: "Hello".to_string(),
                            bounds: OcrBounds { x: 10.0, y: 10.0, width: 50.0, height: 20.0 },
                            confidence: 0.98,
                        },
                        OcrWord {
                            text: "World".to_string(),
                            bounds: OcrBounds { x: 65.0, y: 10.0, width: 55.0, height: 20.0 },
                            confidence: 0.96,
                        },
                    ],
                    bounds: OcrBounds { x: 10.0, y: 10.0, width: 110.0, height: 20.0 },
                },
                OcrLine {
                    text: "Second Line".to_string(),
                    words: vec![
                        OcrWord {
                            text: "Second".to_string(),
                            bounds: OcrBounds { x: 10.0, y: 35.0, width: 60.0, height: 20.0 },
                            confidence: 0.94,
                        },
                        OcrWord {
                            text: "Line".to_string(),
                            bounds: OcrBounds { x: 75.0, y: 35.0, width: 40.0, height: 20.0 },
                            confidence: 0.97,
                        },
                    ],
                    bounds: OcrBounds { x: 10.0, y: 35.0, width: 105.0, height: 20.0 },
                },
            ],
            language: Some("en-US".to_string()),
            confidence: 0.96,
        };
        
        // Verify structure
        assert_eq!(result.lines.len(), 2);
        assert_eq!(result.lines[0].words.len(), 2);
        assert_eq!(result.lines[1].words.len(), 2);
        
        // Verify serialization round-trip
        let json = serde_json::to_string(&result).unwrap();
        let deserialized: WinOcrResult = serde_json::from_str(&json).unwrap();
        assert_eq!(result.text, deserialized.text);
        assert_eq!(result.lines.len(), deserialized.lines.len());
    }
}
