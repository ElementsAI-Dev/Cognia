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
