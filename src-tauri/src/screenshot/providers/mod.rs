//! OCR Provider Implementations
//!
//! Individual provider implementations for different OCR services.

pub mod azure;
pub mod google;
pub mod ollama;
pub mod openai;
pub mod tesseract;
pub mod windows;

pub use azure::AzureVisionProvider;
pub use google::GoogleVisionProvider;
pub use ollama::OllamaVisionProvider;
pub use openai::OpenAiVisionProvider;
pub use tesseract::TesseractProvider;
pub use windows::WindowsOcrProvider;
