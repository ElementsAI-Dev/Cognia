//! Windows OCR integration
//!
//! Uses Windows Runtime OCR API for text extraction from images.
//! Requires Windows 10+ with OCR language packs installed.

use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use windows::{
    core::{Interface, HSTRING},
    Globalization::Language,
    Graphics::Imaging::{BitmapBufferAccessMode, BitmapPixelFormat, SoftwareBitmap},
    Media::Ocr::OcrEngine as WinOcrEngine,
};

/// OCR result with text and bounding boxes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WinOcrResult {
    /// Full extracted text
    pub text: String,
    /// Individual text lines with positions
    pub lines: Vec<OcrLine>,
    /// Detected language
    pub language: Option<String>,
    /// Overall confidence (estimated from word count and structure)
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
    /// Confidence for this word (estimated)
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

/// Windows OCR Engine wrapper
pub struct WindowsOcr {
    /// Preferred language for OCR (BCP-47 format)
    language: String,
}

impl WindowsOcr {
    pub fn new() -> Self {
        Self {
            language: "en-US".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_language(language: &str) -> Self {
        Self {
            language: language.to_string(),
        }
    }

    /// Set the OCR language (BCP-47 format, e.g., "en-US", "zh-Hans", "ja")
    pub fn set_language(&mut self, language: &str) {
        self.language = language.to_string();
    }

    /// Get current language
    pub fn get_language(&self) -> &str {
        &self.language
    }

    /// Extract text from PNG image data using Windows OCR
    #[cfg(target_os = "windows")]
    pub fn extract_text(&self, image_data: &[u8]) -> Result<WinOcrResult, String> {
        // Decode PNG to get raw BGRA pixels
        let decoder = png::Decoder::new(std::io::Cursor::new(image_data));
        let mut reader = decoder
            .read_info()
            .map_err(|e| format!("Failed to decode PNG: {}", e))?;
        let mut buf = vec![0; reader.output_buffer_size()];
        let info = reader
            .next_frame(&mut buf)
            .map_err(|e| format!("Failed to read PNG frame: {}", e))?;

        let width = info.width;
        let height = info.height;
        let color_type = info.color_type;
        let pixels = &buf[..info.buffer_size()];

        // Convert to BGRA if needed
        let bgra_pixels = match color_type {
            png::ColorType::Rgba => {
                // RGBA -> BGRA conversion
                let mut bgra = Vec::with_capacity(pixels.len());
                for chunk in pixels.chunks(4) {
                    bgra.push(chunk[2]); // B
                    bgra.push(chunk[1]); // G
                    bgra.push(chunk[0]); // R
                    bgra.push(chunk[3]); // A
                }
                bgra
            }
            png::ColorType::Rgb => {
                // RGB -> BGRA conversion
                let mut bgra = Vec::with_capacity((pixels.len() / 3) * 4);
                for chunk in pixels.chunks(3) {
                    bgra.push(chunk[2]); // B
                    bgra.push(chunk[1]); // G
                    bgra.push(chunk[0]); // R
                    bgra.push(255); // A
                }
                bgra
            }
            png::ColorType::Grayscale => {
                // Grayscale -> BGRA conversion
                let mut bgra = Vec::with_capacity(pixels.len() * 4);
                for &gray in pixels {
                    bgra.push(gray); // B
                    bgra.push(gray); // G
                    bgra.push(gray); // R
                    bgra.push(255); // A
                }
                bgra
            }
            png::ColorType::GrayscaleAlpha => {
                // GrayscaleAlpha -> BGRA conversion
                let mut bgra = Vec::with_capacity(pixels.len() * 2);
                for chunk in pixels.chunks(2) {
                    bgra.push(chunk[0]); // B
                    bgra.push(chunk[0]); // G
                    bgra.push(chunk[0]); // R
                    bgra.push(chunk[1]); // A
                }
                bgra
            }
            _ => return Err(format!("Unsupported color type: {:?}", color_type)),
        };

        self.extract_text_from_bgra_pixels(&bgra_pixels, width, height)
    }

    #[cfg(not(target_os = "windows"))]
    pub fn extract_text(&self, _image_data: &[u8]) -> Result<WinOcrResult, String> {
        Err("Windows OCR is only available on Windows".to_string())
    }

    /// Extract text from raw RGBA pixels
    #[allow(dead_code)]
    #[cfg(target_os = "windows")]
    pub fn extract_text_from_pixels(
        &self,
        pixels: &[u8],
        width: u32,
        height: u32,
    ) -> Result<WinOcrResult, String> {
        // Convert RGBA to BGRA
        let mut bgra = Vec::with_capacity(pixels.len());
        for chunk in pixels.chunks(4) {
            if chunk.len() == 4 {
                bgra.push(chunk[2]); // B
                bgra.push(chunk[1]); // G
                bgra.push(chunk[0]); // R
                bgra.push(chunk[3]); // A
            }
        }
        self.extract_text_from_bgra_pixels(&bgra, width, height)
    }

    #[cfg(not(target_os = "windows"))]
    pub fn extract_text_from_pixels(
        &self,
        _pixels: &[u8],
        _width: u32,
        _height: u32,
    ) -> Result<WinOcrResult, String> {
        Err("Windows OCR is only available on Windows".to_string())
    }

    /// Extract text from BGRA pixels using Windows OCR API
    #[cfg(target_os = "windows")]
    fn extract_text_from_bgra_pixels(
        &self,
        bgra_pixels: &[u8],
        width: u32,
        height: u32,
    ) -> Result<WinOcrResult, String> {
        use std::sync::mpsc;
        use std::thread;

        // Windows OCR requires running on a thread with COM initialized
        let pixels = bgra_pixels.to_vec();
        let language = self.language.clone();

        let (tx, rx) = mpsc::channel();

        thread::spawn(move || {
            let result = perform_ocr_sync(&pixels, width, height, &language);
            let _ = tx.send(result);
        });

        rx.recv()
            .map_err(|e| format!("OCR thread communication error: {}", e))?
    }

    /// Get available OCR languages installed on the system
    #[cfg(target_os = "windows")]
    pub fn get_available_languages() -> Vec<String> {
        get_installed_ocr_languages().unwrap_or_else(|_| {
            // Fallback to common languages
            vec![
                "en-US".to_string(),
                "zh-Hans".to_string(),
                "zh-Hant".to_string(),
                "ja".to_string(),
                "ko".to_string(),
            ]
        })
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_available_languages() -> Vec<String> {
        vec![]
    }

    /// Check if OCR is available on this system
    #[cfg(target_os = "windows")]
    pub fn is_available() -> bool {
        // Check if at least one OCR language is available
        WinOcrEngine::AvailableRecognizerLanguages()
            .map(|langs| langs.Size().unwrap_or(0) > 0)
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    pub fn is_available() -> bool {
        false
    }

    /// Check if a specific language is available for OCR
    #[cfg(target_os = "windows")]
    pub fn is_language_available(language: &str) -> bool {
        let lang = match Language::CreateLanguage(&HSTRING::from(language)) {
            Ok(l) => l,
            Err(_) => return false,
        };
        WinOcrEngine::IsLanguageSupported(&lang).unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    pub fn is_language_available(_language: &str) -> bool {
        false
    }
}

impl Default for WindowsOcr {
    fn default() -> Self {
        Self::new()
    }
}

/// Perform OCR synchronously (called from a separate thread)
#[cfg(target_os = "windows")]
fn perform_ocr_sync(
    bgra_pixels: &[u8],
    width: u32,
    height: u32,
    language: &str,
) -> Result<WinOcrResult, String> {
    // Validate dimensions
    if width == 0 || height == 0 {
        return Err("Invalid image dimensions".to_string());
    }

    // Windows OCR has minimum size requirements (40x40 recommended)
    if width < 20 || height < 20 {
        return Ok(WinOcrResult {
            text: String::new(),
            lines: Vec::new(),
            language: Some(language.to_string()),
            confidence: 0.0,
        });
    }

    let expected_size = (width * height * 4) as usize;
    if bgra_pixels.len() != expected_size {
        return Err(format!(
            "Pixel buffer size mismatch: expected {}, got {}",
            expected_size,
            bgra_pixels.len()
        ));
    }

    // Create SoftwareBitmap from BGRA pixels
    let bitmap = SoftwareBitmap::Create(BitmapPixelFormat::Bgra8, width as i32, height as i32)
        .map_err(|e| format!("Failed to create SoftwareBitmap: {}", e))?;

    // Copy pixel data to bitmap using CopyFromBuffer
    {
        let buffer = bitmap
            .LockBuffer(BitmapBufferAccessMode::Write)
            .map_err(|e| format!("Failed to lock bitmap buffer: {}", e))?;

        let reference = buffer
            .CreateReference()
            .map_err(|e| format!("Failed to create buffer reference: {}", e))?;

        // Use the IMemoryBufferByteAccess interface to get raw pointer
        unsafe {
            use windows::Win32::System::WinRT::IMemoryBufferByteAccess;

            let byte_access: IMemoryBufferByteAccess = reference
                .cast()
                .map_err(|e| format!("Failed to cast to IMemoryBufferByteAccess: {}", e))?;

            let mut data_ptr: *mut u8 = std::ptr::null_mut();
            let mut capacity: u32 = 0;
            byte_access
                .GetBuffer(&mut data_ptr, &mut capacity)
                .map_err(|e| format!("Failed to get buffer pointer: {}", e))?;

            if !data_ptr.is_null() && capacity as usize >= bgra_pixels.len() {
                std::ptr::copy_nonoverlapping(bgra_pixels.as_ptr(), data_ptr, bgra_pixels.len());
            } else {
                return Err("Buffer too small or null".to_string());
            }
        }
    }

    // Create OCR engine with the specified language
    // Note: TryCreateFromUserProfileLanguages and TryCreateFromLanguage return OcrEngine directly,
    // not Option<OcrEngine>. They return an error if no engine is available.
    let engine = if language == "auto" || language.is_empty() {
        // Use user's preferred language
        WinOcrEngine::TryCreateFromUserProfileLanguages()
            .map_err(|e| format!("Failed to create OCR engine: {}", e))?
    } else {
        let lang = Language::CreateLanguage(&HSTRING::from(language))
            .map_err(|e| format!("Failed to create language '{}': {}", language, e))?;

        if !WinOcrEngine::IsLanguageSupported(&lang).unwrap_or(false) {
            // Fall back to user profile languages if specified language not available
            log::warn!(
                "Language '{}' not supported, falling back to user profile",
                language
            );
            WinOcrEngine::TryCreateFromUserProfileLanguages()
                .map_err(|e| format!("Failed to create OCR engine: {}", e))?
        } else {
            WinOcrEngine::TryCreateFromLanguage(&lang)
                .map_err(|e| format!("Failed to create OCR engine for '{}': {}", language, e))?
        }
    };

    // Perform OCR recognition
    let ocr_result = engine
        .RecognizeAsync(&bitmap)
        .map_err(|e| format!("Failed to start OCR recognition: {}", e))?
        .get()
        .map_err(|e| format!("OCR recognition failed: {}", e))?;

    // Extract results
    let full_text = ocr_result.Text().map(|s| s.to_string()).unwrap_or_default();

    let mut lines = Vec::new();
    let mut total_words = 0;

    if let Ok(ocr_lines) = ocr_result.Lines() {
        for line in ocr_lines {
            let line_text = line.Text().map(|s| s.to_string()).unwrap_or_default();

            let mut words = Vec::new();
            if let Ok(line_words) = line.Words() {
                for word in line_words {
                    let word_text = word.Text().map(|s| s.to_string()).unwrap_or_default();

                    let word_bounds = if let Ok(rect) = word.BoundingRect() {
                        OcrBounds {
                            x: rect.X as f64,
                            y: rect.Y as f64,
                            width: rect.Width as f64,
                            height: rect.Height as f64,
                        }
                    } else {
                        OcrBounds {
                            x: 0.0,
                            y: 0.0,
                            width: 0.0,
                            height: 0.0,
                        }
                    };

                    words.push(OcrWord {
                        text: word_text,
                        bounds: word_bounds,
                        confidence: 0.9, // Windows OCR doesn't provide per-word confidence
                    });
                    total_words += 1;
                }
            }

            // Calculate line bounds from words
            let line_bounds = if !words.is_empty() {
                let min_x = words.iter().map(|w| w.bounds.x).fold(f64::MAX, f64::min);
                let min_y = words.iter().map(|w| w.bounds.y).fold(f64::MAX, f64::min);
                let max_x = words
                    .iter()
                    .map(|w| w.bounds.x + w.bounds.width)
                    .fold(0.0, f64::max);
                let max_y = words
                    .iter()
                    .map(|w| w.bounds.y + w.bounds.height)
                    .fold(0.0, f64::max);

                OcrBounds {
                    x: min_x,
                    y: min_y,
                    width: max_x - min_x,
                    height: max_y - min_y,
                }
            } else {
                OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 0.0,
                    height: 0.0,
                }
            };

            lines.push(OcrLine {
                text: line_text,
                words,
                bounds: line_bounds,
            });
        }
    }

    // Estimate confidence based on result quality
    let confidence = if full_text.is_empty() {
        0.0
    } else if total_words > 0 {
        0.85 + (0.1 * (total_words.min(10) as f64 / 10.0)) // 0.85-0.95 based on word count
    } else {
        0.5
    };

    // Get detected language
    let detected_language = ocr_result.Text().ok().map(|_| language.to_string());

    Ok(WinOcrResult {
        text: full_text,
        lines,
        language: detected_language,
        confidence,
    })
}

/// Get list of installed OCR languages
#[cfg(target_os = "windows")]
fn get_installed_ocr_languages() -> Result<Vec<String>, String> {
    let languages = WinOcrEngine::AvailableRecognizerLanguages()
        .map_err(|e| format!("Failed to get available languages: {}", e))?;

    let mut result = Vec::new();
    for lang in languages {
        if let Ok(tag) = lang.LanguageTag() {
            result.push(tag.to_string());
        }
    }

    Ok(result)
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
            x: 5.0,
            y: 10.0,
            width: 50.0,
            height: 25.0,
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
            bounds: OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 30.0,
                height: 15.0,
            },
            confidence: 0.95,
        };

        assert_eq!(word.text, "Hello");
        assert_eq!(word.confidence, 0.95);
    }

    #[test]
    fn test_ocr_word_serialization() {
        let word = OcrWord {
            text: "World".to_string(),
            bounds: OcrBounds {
                x: 35.0,
                y: 0.0,
                width: 35.0,
                height: 15.0,
            },
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
            bounds: OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 25.0,
                height: 12.0,
            },
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
                    bounds: OcrBounds {
                        x: 0.0,
                        y: 0.0,
                        width: 30.0,
                        height: 15.0,
                    },
                    confidence: 0.95,
                },
                OcrWord {
                    text: "World".to_string(),
                    bounds: OcrBounds {
                        x: 35.0,
                        y: 0.0,
                        width: 35.0,
                        height: 15.0,
                    },
                    confidence: 0.93,
                },
            ],
            bounds: OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 70.0,
                height: 15.0,
            },
        };

        assert_eq!(line.text, "Hello World");
        assert_eq!(line.words.len(), 2);
    }

    #[test]
    fn test_ocr_line_empty_words() {
        let line = OcrLine {
            text: String::new(),
            words: Vec::new(),
            bounds: OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 0.0,
                height: 0.0,
            },
        };

        assert!(line.text.is_empty());
        assert!(line.words.is_empty());
    }

    #[test]
    fn test_ocr_line_serialization() {
        let line = OcrLine {
            text: "Test line".to_string(),
            words: vec![OcrWord {
                text: "Test".to_string(),
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 25.0,
                    height: 12.0,
                },
                confidence: 0.9,
            }],
            bounds: OcrBounds {
                x: 0.0,
                y: 0.0,
                width: 50.0,
                height: 12.0,
            },
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
            bounds: OcrBounds {
                x: 10.0,
                y: 20.0,
                width: 40.0,
                height: 15.0,
            },
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
            lines: vec![OcrLine {
                text: "Full OCR text".to_string(),
                words: vec![],
                bounds: OcrBounds {
                    x: 0.0,
                    y: 0.0,
                    width: 100.0,
                    height: 20.0,
                },
            }],
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

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_ocr_get_available_languages() {
        let languages = WindowsOcr::get_available_languages();
        // On Windows, should return at least one installed language
        // The actual languages depend on what's installed on the system
        assert!(!languages.is_empty());
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn test_windows_ocr_get_available_languages_not_windows() {
        let languages = WindowsOcr::get_available_languages();
        // On non-Windows, returns empty list
        assert!(languages.is_empty());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_ocr_is_language_available() {
        // en-US is typically always available on Windows
        let is_available = WindowsOcr::is_language_available("en-US");
        // This may or may not be true depending on system configuration
        // Just verify the function doesn't panic
        let _ = is_available;
    }

    #[test]
    fn test_windows_ocr_get_language() {
        let ocr = WindowsOcr::with_language("de-DE");
        assert_eq!(ocr.get_language(), "de-DE");
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
                            bounds: OcrBounds {
                                x: 10.0,
                                y: 10.0,
                                width: 50.0,
                                height: 20.0,
                            },
                            confidence: 0.98,
                        },
                        OcrWord {
                            text: "World".to_string(),
                            bounds: OcrBounds {
                                x: 65.0,
                                y: 10.0,
                                width: 55.0,
                                height: 20.0,
                            },
                            confidence: 0.96,
                        },
                    ],
                    bounds: OcrBounds {
                        x: 10.0,
                        y: 10.0,
                        width: 110.0,
                        height: 20.0,
                    },
                },
                OcrLine {
                    text: "Second Line".to_string(),
                    words: vec![
                        OcrWord {
                            text: "Second".to_string(),
                            bounds: OcrBounds {
                                x: 10.0,
                                y: 35.0,
                                width: 60.0,
                                height: 20.0,
                            },
                            confidence: 0.94,
                        },
                        OcrWord {
                            text: "Line".to_string(),
                            bounds: OcrBounds {
                                x: 75.0,
                                y: 35.0,
                                width: 40.0,
                                height: 20.0,
                            },
                            confidence: 0.97,
                        },
                    ],
                    bounds: OcrBounds {
                        x: 10.0,
                        y: 35.0,
                        width: 105.0,
                        height: 20.0,
                    },
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
