//! Screenshot module
//!
//! Provides screenshot capture functionality including fullscreen,
//! window, and region capture modes.

#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]
//! - Window capture
//! - Region selection capture
//! - OCR text extraction
//! - Screenshot history

mod capture;
mod region_selector;
mod ocr;
mod annotator;
mod windows_ocr;
mod screenshot_history;

pub use capture::{ScreenshotCapture, CaptureMode, ScreenshotResult};
pub use region_selector::RegionSelector;
pub use ocr::OcrEngine;
pub use annotator::ScreenshotAnnotator;
pub use windows_ocr::{WindowsOcr, WinOcrResult, OcrLine, OcrWord, OcrBounds};
pub use screenshot_history::{ScreenshotHistory, ScreenshotHistoryEntry};

use serde::{Deserialize, Serialize};

/// Screenshot configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotConfig {
    /// Default save directory
    pub save_directory: Option<String>,
    /// Image format (png, jpg, webp)
    pub format: String,
    /// JPEG quality (1-100)
    pub quality: u8,
    /// Whether to include cursor in screenshot
    pub include_cursor: bool,
    /// Delay before capture in milliseconds
    pub delay_ms: u64,
    /// Whether to copy to clipboard after capture
    pub copy_to_clipboard: bool,
    /// Whether to show notification after capture
    pub show_notification: bool,
    /// OCR language (e.g., "eng", "chi_sim", "jpn")
    pub ocr_language: String,
}

impl Default for ScreenshotConfig {
    fn default() -> Self {
        Self {
            save_directory: None,
            format: "png".to_string(),
            quality: 95,
            include_cursor: false,
            delay_ms: 0,
            copy_to_clipboard: true,
            show_notification: true,
            ocr_language: "eng".to_string(),
        }
    }
}

/// Screenshot metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenshotMetadata {
    /// Capture timestamp
    pub timestamp: i64,
    /// Image width
    pub width: u32,
    /// Image height
    pub height: u32,
    /// Capture mode used
    pub mode: String,
    /// Monitor index (for multi-monitor setups)
    pub monitor_index: Option<usize>,
    /// Window title (for window capture)
    pub window_title: Option<String>,
    /// Region coordinates (for region capture)
    pub region: Option<CaptureRegion>,
    /// File path if saved
    pub file_path: Option<String>,
    /// OCR extracted text
    pub ocr_text: Option<String>,
}

/// Capture region coordinates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRegion {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Screenshot manager for coordinating capture operations
pub struct ScreenshotManager {
    config: std::sync::Arc<parking_lot::RwLock<ScreenshotConfig>>,
    capture: ScreenshotCapture,
    ocr_engine: Option<OcrEngine>,
    windows_ocr: WindowsOcr,
    history: ScreenshotHistory,
    app_handle: tauri::AppHandle,
}

impl ScreenshotManager {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        Self {
            config: std::sync::Arc::new(parking_lot::RwLock::new(ScreenshotConfig::default())),
            capture: ScreenshotCapture::new(),
            ocr_engine: OcrEngine::new().ok(),
            windows_ocr: WindowsOcr::new(),
            history: ScreenshotHistory::new(),
            app_handle,
        }
    }

    /// Update configuration
    pub fn update_config(&self, config: ScreenshotConfig) {
        *self.config.write() = config;
    }

    /// Get current configuration
    pub fn get_config(&self) -> ScreenshotConfig {
        self.config.read().clone()
    }

    /// Capture full screen
    pub async fn capture_fullscreen(&self, monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
        let config = self.config.read().clone();
        
        if config.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(config.delay_ms)).await;
        }

        let result = self.capture.capture_screen(monitor_index)?;
        self.post_capture_actions(&result, &config).await?;
        Ok(result)
    }

    /// Capture active window
    pub async fn capture_window(&self) -> Result<ScreenshotResult, String> {
        let config = self.config.read().clone();
        
        if config.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(config.delay_ms)).await;
        }

        let result = self.capture.capture_active_window()?;
        self.post_capture_actions(&result, &config).await?;
        Ok(result)
    }

    /// Capture selected region
    pub async fn capture_region(&self, region: CaptureRegion) -> Result<ScreenshotResult, String> {
        let config = self.config.read().clone();
        
        if config.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(config.delay_ms)).await;
        }

        let result = self.capture.capture_region(region.x, region.y, region.width, region.height)?;
        self.post_capture_actions(&result, &config).await?;
        Ok(result)
    }

    /// Start interactive region selection
    pub async fn start_region_selection(&self) -> Result<CaptureRegion, String> {
        RegionSelector::select_region(&self.app_handle).await
    }

    /// Perform OCR on screenshot
    pub fn extract_text(&self, image_data: &[u8]) -> Result<String, String> {
        match &self.ocr_engine {
            Some(engine) => engine.extract_text(image_data),
            None => Err("OCR engine not available".to_string()),
        }
    }

    /// Post-capture actions (clipboard, notification, etc.)
    async fn post_capture_actions(&self, result: &ScreenshotResult, config: &ScreenshotConfig) -> Result<(), String> {
        // Copy to clipboard if enabled
        if config.copy_to_clipboard {
            self.copy_to_clipboard(&result.image_data)?;
        }

        // Show notification if enabled
        if config.show_notification {
            let _ = self.app_handle.emit("screenshot-captured", serde_json::json!({
                "width": result.metadata.width,
                "height": result.metadata.height,
                "mode": result.metadata.mode,
            }));
        }

        Ok(())
    }

    /// Copy image to clipboard
    fn copy_to_clipboard(&self, image_data: &[u8]) -> Result<(), String> {
        use arboard::{Clipboard, ImageData};
        use std::borrow::Cow;

        // Decode PNG to raw RGBA
        let decoder = png::Decoder::new(std::io::Cursor::new(image_data));
        let mut reader = decoder.read_info().map_err(|e| e.to_string())?;
        let mut buf = vec![0; reader.output_buffer_size()];
        let info = reader.next_frame(&mut buf).map_err(|e| e.to_string())?;

        let image = ImageData {
            width: info.width as usize,
            height: info.height as usize,
            bytes: Cow::Owned(buf[..info.buffer_size()].to_vec()),
        };

        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        clipboard.set_image(image).map_err(|e| e.to_string())
    }

    /// Save screenshot to file
    pub fn save_to_file(&self, image_data: &[u8], path: &str) -> Result<String, String> {
        std::fs::write(path, image_data).map_err(|e| e.to_string())?;
        Ok(path.to_string())
    }

    /// Get list of available monitors
    pub fn get_monitors(&self) -> Vec<MonitorInfo> {
        self.capture.get_monitors()
    }

    /// Extract text using Windows OCR
    pub fn extract_text_windows(&self, image_data: &[u8]) -> Result<WinOcrResult, String> {
        self.windows_ocr.extract_text(image_data)
    }

    /// Get screenshot history
    pub fn get_history(&self, count: usize) -> Vec<ScreenshotHistoryEntry> {
        self.history.get_recent(count)
    }

    /// Get all screenshot history
    pub fn get_all_history(&self) -> Vec<ScreenshotHistoryEntry> {
        self.history.get_all()
    }

    /// Search history by OCR text
    pub fn search_history_by_text(&self, query: &str) -> Vec<ScreenshotHistoryEntry> {
        self.history.search_by_text(query)
    }

    /// Get screenshot by ID
    pub fn get_screenshot_by_id(&self, id: &str) -> Option<ScreenshotHistoryEntry> {
        self.history.get_by_id(id)
    }

    /// Pin screenshot
    pub fn pin_screenshot(&self, id: &str) -> bool {
        self.history.pin_entry(id)
    }

    /// Unpin screenshot
    pub fn unpin_screenshot(&self, id: &str) -> bool {
        self.history.unpin_entry(id)
    }

    /// Delete screenshot from history
    pub fn delete_screenshot(&self, id: &str) -> bool {
        self.history.delete_entry(id)
    }

    /// Clear screenshot history
    pub fn clear_history(&self) {
        self.history.clear_unpinned()
    }

    /// Add screenshot to history
    fn add_to_history(&self, result: &ScreenshotResult) {
        let entry = ScreenshotHistoryEntry::new(
            result.metadata.width,
            result.metadata.height,
            &result.metadata.mode,
        );
        
        let entry = if let Some(ref title) = result.metadata.window_title {
            entry.with_window_title(title.clone())
        } else {
            entry
        };

        self.history.add(entry);
    }

    /// Capture and add to history
    pub async fn capture_fullscreen_with_history(&self, monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
        let result = self.capture_fullscreen(monitor_index).await?;
        self.add_to_history(&result);
        Ok(result)
    }

    /// Capture window and add to history
    pub async fn capture_window_with_history(&self) -> Result<ScreenshotResult, String> {
        let result = self.capture_window().await?;
        self.add_to_history(&result);
        Ok(result)
    }

    /// Capture region and add to history
    pub async fn capture_region_with_history(&self, region: CaptureRegion) -> Result<ScreenshotResult, String> {
        let result = self.capture_region(region).await?;
        self.add_to_history(&result);
        Ok(result)
    }

    /// Get available OCR languages
    pub fn get_ocr_languages(&self) -> Vec<String> {
        WindowsOcr::get_available_languages()
    }

    /// Set OCR language
    pub fn set_ocr_language(&mut self, language: &str) {
        self.windows_ocr.set_language(language);
    }
}

/// Monitor information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub scale_factor: f64,
}

use tauri::Emitter;
