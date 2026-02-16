//! Tesseract OCR Provider
//!
//! Uses Tesseract OCR engine for text extraction.
//! Requires tesseract binary to be installed on the system.

use crate::screenshot::ocr_provider::{
    DocumentHint, OcrBounds, OcrError, OcrErrorCode, OcrOptions, OcrProvider, OcrProviderType,
    OcrRegion, OcrRegionType, OcrResult,
};
use async_trait::async_trait;
use std::path::PathBuf;
use std::process::Command;

/// Tesseract OCR Provider
pub struct TesseractProvider {
    /// Path to tessdata directory
    tessdata_path: Option<PathBuf>,
    /// Default language
    default_language: String,
}

impl TesseractProvider {
    pub fn new() -> Self {
        Self {
            tessdata_path: None,
            default_language: "eng".to_string(),
        }
    }

    #[allow(dead_code)]
    pub fn with_tessdata_path(mut self, path: PathBuf) -> Self {
        self.tessdata_path = Some(path);
        self
    }

    #[allow(dead_code)]
    pub fn with_language(mut self, language: &str) -> Self {
        self.default_language = language.to_string();
        self
    }

    /// Check if tesseract binary is available
    fn check_tesseract_binary() -> bool {
        Command::new("tesseract")
            .arg("--version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Get list of installed languages from tesseract
    fn get_installed_languages() -> Vec<String> {
        let output = Command::new("tesseract").arg("--list-langs").output();

        match output {
            Ok(o) if o.status.success() => {
                let stdout = String::from_utf8_lossy(&o.stdout);
                stdout
                    .lines()
                    .skip(1) // Skip header line
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect()
            }
            _ => vec![],
        }
    }

    /// Convert language code to Tesseract format
    fn to_tesseract_lang(lang: &str) -> String {
        match lang {
            "en" | "en-US" | "en-GB" => "eng".to_string(),
            "zh" | "zh-Hans" | "zh-CN" => "chi_sim".to_string(),
            "zh-Hant" | "zh-TW" => "chi_tra".to_string(),
            "ja" | "ja-JP" => "jpn".to_string(),
            "ko" | "ko-KR" => "kor".to_string(),
            "de" | "de-DE" => "deu".to_string(),
            "fr" | "fr-FR" => "fra".to_string(),
            "es" | "es-ES" => "spa".to_string(),
            "it" | "it-IT" => "ita".to_string(),
            "pt" | "pt-BR" | "pt-PT" => "por".to_string(),
            "ru" | "ru-RU" => "rus".to_string(),
            "ar" | "ar-SA" => "ara".to_string(),
            "hi" | "hi-IN" => "hin".to_string(),
            "th" | "th-TH" => "tha".to_string(),
            "vi" | "vi-VN" => "vie".to_string(),
            "nl" | "nl-NL" => "nld".to_string(),
            "pl" | "pl-PL" => "pol".to_string(),
            "tr" | "tr-TR" => "tur".to_string(),
            "uk" | "uk-UA" => "ukr".to_string(),
            "cs" | "cs-CZ" => "ces".to_string(),
            "sv" | "sv-SE" => "swe".to_string(),
            "da" | "da-DK" => "dan".to_string(),
            "fi" | "fi-FI" => "fin".to_string(),
            "nb" | "no" | "nb-NO" => "nor".to_string(),
            "el" | "el-GR" => "ell".to_string(),
            "he" | "he-IL" => "heb".to_string(),
            "hu" | "hu-HU" => "hun".to_string(),
            "ro" | "ro-RO" => "ron".to_string(),
            "bg" | "bg-BG" => "bul".to_string(),
            "id" | "id-ID" => "ind".to_string(),
            "ms" | "ms-MY" => "msa".to_string(),
            _ => lang.to_string(),
        }
    }

    /// Get Tesseract PSM (Page Segmentation Mode) based on document hint
    fn get_psm(hint: &Option<DocumentHint>) -> Option<&'static str> {
        match hint {
            Some(DocumentHint::DenseText) | Some(DocumentHint::Document) => Some("6"), // Uniform block of text
            Some(DocumentHint::SparseText) => Some("11"), // Sparse text, no particular order
            Some(DocumentHint::Screenshot) => Some("3"),  // Fully automatic (default)
            Some(DocumentHint::Receipt) => Some("4"),     // Single column of variable sizes
            Some(DocumentHint::Handwriting) => Some("6"), // Uniform block
            _ => None,
        }
    }
}

impl Default for TesseractProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl OcrProvider for TesseractProvider {
    fn provider_type(&self) -> OcrProviderType {
        OcrProviderType::Tesseract
    }

    async fn is_available(&self) -> bool {
        Self::check_tesseract_binary()
    }

    async fn get_supported_languages(&self) -> Result<Vec<String>, OcrError> {
        let languages = Self::get_installed_languages();
        if languages.is_empty() && !Self::check_tesseract_binary() {
            return Err(OcrError::provider_unavailable(
                "Tesseract is not installed or not in PATH",
            ));
        }
        Ok(languages)
    }

    async fn extract_text(
        &self,
        image_data: &[u8],
        options: &OcrOptions,
    ) -> Result<OcrResult, OcrError> {
        if !Self::check_tesseract_binary() {
            return Err(OcrError::provider_unavailable(
                "Tesseract is not installed or not in PATH",
            ));
        }

        // Create temporary file for image
        let temp_dir = std::env::temp_dir();
        let input_path = temp_dir.join(format!("ocr_input_{}.png", std::process::id()));
        let output_base = temp_dir.join(format!("ocr_output_{}", std::process::id()));

        // Write image to temp file
        std::fs::write(&input_path, image_data).map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to write temp file: {}", e),
            )
        })?;

        // Determine language
        let lang = options
            .language
            .as_ref()
            .map(|l| Self::to_tesseract_lang(l))
            .unwrap_or_else(|| self.default_language.clone());

        // Build tesseract command
        let mut cmd = Command::new("tesseract");
        cmd.arg(&input_path).arg(&output_base).arg("-l").arg(&lang);

        // Add tessdata path if specified
        if let Some(ref tessdata) = self.tessdata_path {
            cmd.arg("--tessdata-dir").arg(tessdata);
        }

        // Set Page Segmentation Mode based on document hint
        if let Some(psm) = Self::get_psm(&options.document_hint) {
            cmd.arg("--psm").arg(psm);
        }

        // Request TSV output for bounding boxes if word-level requested
        if options.word_level {
            cmd.arg("tsv");
        }

        let output = cmd.output().map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to run tesseract: {}", e),
            )
        })?;

        // Clean up input file
        let _ = std::fs::remove_file(&input_path);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Tesseract failed: {}", stderr),
            ));
        }

        // Read output
        let output_path = if options.word_level {
            output_base.with_extension("tsv")
        } else {
            output_base.with_extension("txt")
        };

        let text_content = std::fs::read_to_string(&output_path).map_err(|e| {
            OcrError::new(
                OcrErrorCode::ProviderError,
                format!("Failed to read output: {}", e),
            )
        })?;

        // Clean up output file
        let _ = std::fs::remove_file(&output_path);

        // Parse results
        let (text, regions) = if options.word_level {
            parse_tsv_output(&text_content)
        } else {
            (text_content.trim().to_string(), vec![])
        };

        let confidence = if regions.is_empty() {
            if text.is_empty() {
                0.0
            } else {
                0.85
            }
        } else {
            let sum: f64 = regions.iter().map(|r| r.confidence).sum();
            sum / regions.len() as f64
        };

        Ok(OcrResult {
            text,
            regions,
            confidence,
            language: Some(lang),
            provider: "Tesseract".to_string(),
            processing_time_ms: 0,
        })
    }
}

/// Parse Tesseract TSV output to extract regions
fn parse_tsv_output(tsv: &str) -> (String, Vec<OcrRegion>) {
    let mut regions = Vec::new();
    let mut full_text = String::new();

    for line in tsv.lines().skip(1) {
        // Skip header
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 12 {
            continue;
        }

        let level: i32 = parts[0].parse().unwrap_or(0);
        let conf: f64 = parts[10].parse().unwrap_or(0.0);
        let text = parts[11];

        // Only process word-level entries (level 5)
        if level == 5 && !text.trim().is_empty() {
            let x: f64 = parts[6].parse().unwrap_or(0.0);
            let y: f64 = parts[7].parse().unwrap_or(0.0);
            let width: f64 = parts[8].parse().unwrap_or(0.0);
            let height: f64 = parts[9].parse().unwrap_or(0.0);

            if !full_text.is_empty() {
                full_text.push(' ');
            }
            full_text.push_str(text);

            regions.push(OcrRegion {
                text: text.to_string(),
                bounds: OcrBounds {
                    x,
                    y,
                    width,
                    height,
                },
                confidence: conf / 100.0, // Tesseract gives 0-100
                region_type: OcrRegionType::Word,
            });
        }
    }

    (full_text, regions)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tesseract_provider_new() {
        let provider = TesseractProvider::new();
        assert_eq!(provider.provider_type(), OcrProviderType::Tesseract);
        assert_eq!(provider.default_language, "eng");
    }

    #[test]
    fn test_tesseract_provider_with_language() {
        let provider = TesseractProvider::new().with_language("chi_sim");
        assert_eq!(provider.default_language, "chi_sim");
    }

    #[test]
    fn test_language_conversion() {
        assert_eq!(TesseractProvider::to_tesseract_lang("en"), "eng");
        assert_eq!(TesseractProvider::to_tesseract_lang("zh-Hans"), "chi_sim");
        assert_eq!(TesseractProvider::to_tesseract_lang("ja"), "jpn");
        assert_eq!(TesseractProvider::to_tesseract_lang("hi"), "hin");
        assert_eq!(TesseractProvider::to_tesseract_lang("th"), "tha");
        assert_eq!(TesseractProvider::to_tesseract_lang("vi"), "vie");
        assert_eq!(TesseractProvider::to_tesseract_lang("unknown"), "unknown");
    }

    #[test]
    fn test_psm_modes() {
        assert_eq!(
            TesseractProvider::get_psm(&Some(DocumentHint::DenseText)),
            Some("6")
        );
        assert_eq!(
            TesseractProvider::get_psm(&Some(DocumentHint::SparseText)),
            Some("11")
        );
        assert_eq!(
            TesseractProvider::get_psm(&Some(DocumentHint::Receipt)),
            Some("4")
        );
        assert_eq!(TesseractProvider::get_psm(&None), None);
    }

    #[test]
    fn test_parse_tsv_empty() {
        let (text, regions) = parse_tsv_output("");
        assert!(text.is_empty());
        assert!(regions.is_empty());
    }
}
