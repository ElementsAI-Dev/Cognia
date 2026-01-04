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
mod window_manager;
pub mod ocr_provider;
pub mod ocr_manager;
pub mod providers;

pub use capture::{ScreenshotCapture, CaptureMode, ScreenshotResult};
pub use region_selector::RegionSelector;
pub use ocr::OcrEngine;
pub use annotator::ScreenshotAnnotator;
pub use windows_ocr::{WindowsOcr, WinOcrResult, OcrLine, OcrWord, OcrBounds};
pub use screenshot_history::{ScreenshotHistory, ScreenshotHistoryEntry};
pub use window_manager::{WindowManager, WindowInfo, SnapConfig, SnapResult};
pub use ocr_provider::{
    OcrProvider, OcrProviderType, OcrProviderConfig, OcrProviderInfo,
    OcrResult as UnifiedOcrResult, OcrOptions, OcrError, OcrRegion, OcrBounds as UnifiedOcrBounds,
};
pub use ocr_manager::OcrManager;
pub use providers::{
    AzureVisionProvider, GoogleVisionProvider, OllamaVisionProvider, 
    OpenAiVisionProvider, TesseractProvider, WindowsOcrProvider,
};

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
    window_manager: WindowManager,
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
            window_manager: WindowManager::new(),
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

    /// Apply configured delay before capture
    async fn apply_capture_delay(&self, config: &ScreenshotConfig) {
        if config.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(config.delay_ms)).await;
        }
    }

    /// Execute capture with common pre/post actions
    async fn execute_capture<F>(&self, capture_fn: F) -> Result<ScreenshotResult, String>
    where
        F: FnOnce(&ScreenshotCapture) -> Result<ScreenshotResult, String>,
    {
        let config = self.config.read().clone();
        self.apply_capture_delay(&config).await;
        let result = capture_fn(&self.capture)?;
        self.post_capture_actions(&result, &config).await?;
        Ok(result)
    }

    /// Capture full screen
    pub async fn capture_fullscreen(&self, monitor_index: Option<usize>) -> Result<ScreenshotResult, String> {
        self.execute_capture(|capture| capture.capture_screen(monitor_index)).await
    }

    /// Capture active window
    pub async fn capture_window(&self) -> Result<ScreenshotResult, String> {
        self.execute_capture(|capture| capture.capture_active_window()).await
    }

    /// Capture selected region
    pub async fn capture_region(&self, region: CaptureRegion) -> Result<ScreenshotResult, String> {
        self.execute_capture(|capture| {
            capture.capture_region(region.x, region.y, region.width, region.height)
        }).await
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

    // ==================== Window Management Methods ====================

    /// Get list of all visible windows
    pub fn get_windows(&self) -> Vec<WindowInfo> {
        self.window_manager.get_windows()
    }

    /// Get list of all visible windows with thumbnails
    pub fn get_windows_with_thumbnails(&self, thumbnail_size: u32) -> Vec<WindowInfo> {
        self.window_manager.get_windows_with_thumbnails(thumbnail_size)
    }

    /// Capture a specific window by its HWND
    pub fn capture_window_by_hwnd(&self, hwnd: isize) -> Result<ScreenshotResult, String> {
        self.window_manager.capture_window_by_hwnd(hwnd)
    }

    /// Capture a specific window by HWND and add to history
    pub async fn capture_window_by_hwnd_with_history(&self, hwnd: isize) -> Result<ScreenshotResult, String> {
        let config = self.config.read().clone();
        self.apply_capture_delay(&config).await;
        let result = self.window_manager.capture_window_by_hwnd(hwnd)?;
        self.post_capture_actions(&result, &config).await?;
        self.add_to_history(&result);
        Ok(result)
    }

    /// Calculate snap position for window movement
    pub fn calculate_snap_position(
        &self,
        window_hwnd: isize,
        proposed_x: i32,
        proposed_y: i32,
        window_width: u32,
        window_height: u32,
    ) -> SnapResult {
        self.window_manager.calculate_snap_position(
            window_hwnd,
            proposed_x,
            proposed_y,
            window_width,
            window_height,
        )
    }

    /// Update snap configuration
    pub fn set_snap_config(&mut self, config: SnapConfig) {
        self.window_manager.set_snap_config(config);
    }

    /// Get current snap configuration
    pub fn get_snap_config(&self) -> SnapConfig {
        self.window_manager.get_snap_config().clone()
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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== ScreenshotConfig Tests ====================

    #[test]
    fn test_screenshot_config_default() {
        let config = ScreenshotConfig::default();
        
        assert!(config.save_directory.is_none());
        assert_eq!(config.format, "png");
        assert_eq!(config.quality, 95);
        assert!(!config.include_cursor);
        assert_eq!(config.delay_ms, 0);
        assert!(config.copy_to_clipboard);
        assert!(config.show_notification);
        assert_eq!(config.ocr_language, "eng");
    }

    #[test]
    fn test_screenshot_config_custom() {
        let config = ScreenshotConfig {
            save_directory: Some("/custom/path".to_string()),
            format: "jpg".to_string(),
            quality: 80,
            include_cursor: true,
            delay_ms: 500,
            copy_to_clipboard: false,
            show_notification: false,
            ocr_language: "chi_sim".to_string(),
        };
        
        assert_eq!(config.save_directory, Some("/custom/path".to_string()));
        assert_eq!(config.format, "jpg");
        assert_eq!(config.quality, 80);
        assert!(config.include_cursor);
        assert_eq!(config.delay_ms, 500);
        assert!(!config.copy_to_clipboard);
        assert!(!config.show_notification);
        assert_eq!(config.ocr_language, "chi_sim");
    }

    #[test]
    fn test_screenshot_config_clone() {
        let config = ScreenshotConfig::default();
        let cloned = config.clone();
        
        assert_eq!(config.format, cloned.format);
        assert_eq!(config.quality, cloned.quality);
    }

    #[test]
    fn test_screenshot_config_serialization() {
        let config = ScreenshotConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: ScreenshotConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(config.format, deserialized.format);
        assert_eq!(config.quality, deserialized.quality);
        assert_eq!(config.ocr_language, deserialized.ocr_language);
    }

    // ==================== CaptureRegion Tests ====================

    #[test]
    fn test_capture_region_creation() {
        let region = CaptureRegion {
            x: 100,
            y: 200,
            width: 800,
            height: 600,
        };
        
        assert_eq!(region.x, 100);
        assert_eq!(region.y, 200);
        assert_eq!(region.width, 800);
        assert_eq!(region.height, 600);
    }

    #[test]
    fn test_capture_region_clone() {
        let region = CaptureRegion {
            x: 50,
            y: 50,
            width: 100,
            height: 100,
        };
        let cloned = region.clone();
        
        assert_eq!(region.x, cloned.x);
        assert_eq!(region.y, cloned.y);
        assert_eq!(region.width, cloned.width);
        assert_eq!(region.height, cloned.height);
    }

    #[test]
    fn test_capture_region_serialization() {
        let region = CaptureRegion {
            x: -100,
            y: -50,
            width: 1920,
            height: 1080,
        };
        let json = serde_json::to_string(&region).unwrap();
        let deserialized: CaptureRegion = serde_json::from_str(&json).unwrap();
        
        assert_eq!(region.x, deserialized.x);
        assert_eq!(region.y, deserialized.y);
        assert_eq!(region.width, deserialized.width);
        assert_eq!(region.height, deserialized.height);
    }

    #[test]
    fn test_capture_region_negative_coordinates() {
        let region = CaptureRegion {
            x: -500,
            y: -300,
            width: 400,
            height: 300,
        };
        
        assert_eq!(region.x, -500);
        assert_eq!(region.y, -300);
    }

    #[test]
    fn test_capture_region_zero_dimensions() {
        let region = CaptureRegion {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        };
        
        assert_eq!(region.width, 0);
        assert_eq!(region.height, 0);
    }

    // ==================== ScreenshotMetadata Tests ====================

    #[test]
    fn test_screenshot_metadata_creation() {
        let metadata = ScreenshotMetadata {
            timestamp: 1234567890,
            width: 1920,
            height: 1080,
            mode: "fullscreen".to_string(),
            monitor_index: Some(0),
            window_title: None,
            region: None,
            file_path: None,
            ocr_text: None,
        };
        
        assert_eq!(metadata.timestamp, 1234567890);
        assert_eq!(metadata.width, 1920);
        assert_eq!(metadata.height, 1080);
        assert_eq!(metadata.mode, "fullscreen");
        assert_eq!(metadata.monitor_index, Some(0));
    }

    #[test]
    fn test_screenshot_metadata_with_region() {
        let region = CaptureRegion {
            x: 100,
            y: 100,
            width: 500,
            height: 400,
        };
        let metadata = ScreenshotMetadata {
            timestamp: 0,
            width: 500,
            height: 400,
            mode: "region".to_string(),
            monitor_index: None,
            window_title: None,
            region: Some(region),
            file_path: None,
            ocr_text: None,
        };
        
        assert!(metadata.region.is_some());
        let r = metadata.region.unwrap();
        assert_eq!(r.x, 100);
        assert_eq!(r.width, 500);
    }

    #[test]
    fn test_screenshot_metadata_with_window_title() {
        let metadata = ScreenshotMetadata {
            timestamp: 0,
            width: 800,
            height: 600,
            mode: "window".to_string(),
            monitor_index: None,
            window_title: Some("Test Window Title".to_string()),
            region: None,
            file_path: None,
            ocr_text: None,
        };
        
        assert_eq!(metadata.window_title, Some("Test Window Title".to_string()));
    }

    #[test]
    fn test_screenshot_metadata_with_ocr() {
        let metadata = ScreenshotMetadata {
            timestamp: 0,
            width: 800,
            height: 600,
            mode: "region".to_string(),
            monitor_index: None,
            window_title: None,
            region: None,
            file_path: Some("/path/to/screenshot.png".to_string()),
            ocr_text: Some("Extracted text from image".to_string()),
        };
        
        assert_eq!(metadata.file_path, Some("/path/to/screenshot.png".to_string()));
        assert_eq!(metadata.ocr_text, Some("Extracted text from image".to_string()));
    }

    #[test]
    fn test_screenshot_metadata_serialization() {
        let metadata = ScreenshotMetadata {
            timestamp: 1700000000000,
            width: 1920,
            height: 1080,
            mode: "fullscreen".to_string(),
            monitor_index: Some(1),
            window_title: Some("Window".to_string()),
            region: Some(CaptureRegion { x: 0, y: 0, width: 100, height: 100 }),
            file_path: Some("/path.png".to_string()),
            ocr_text: Some("text".to_string()),
        };
        
        let json = serde_json::to_string(&metadata).unwrap();
        let deserialized: ScreenshotMetadata = serde_json::from_str(&json).unwrap();
        
        assert_eq!(metadata.timestamp, deserialized.timestamp);
        assert_eq!(metadata.width, deserialized.width);
        assert_eq!(metadata.mode, deserialized.mode);
    }

    // ==================== MonitorInfo Tests ====================

    #[test]
    fn test_monitor_info_creation() {
        let monitor = MonitorInfo {
            index: 0,
            name: "Primary Monitor".to_string(),
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_primary: true,
            scale_factor: 1.0,
        };
        
        assert_eq!(monitor.index, 0);
        assert_eq!(monitor.name, "Primary Monitor");
        assert!(monitor.is_primary);
        assert_eq!(monitor.scale_factor, 1.0);
    }

    #[test]
    fn test_monitor_info_secondary() {
        let monitor = MonitorInfo {
            index: 1,
            name: "Secondary Monitor".to_string(),
            x: 1920,
            y: 0,
            width: 2560,
            height: 1440,
            is_primary: false,
            scale_factor: 1.25,
        };
        
        assert_eq!(monitor.index, 1);
        assert!(!monitor.is_primary);
        assert_eq!(monitor.scale_factor, 1.25);
        assert_eq!(monitor.x, 1920);
    }

    #[test]
    fn test_monitor_info_negative_position() {
        let monitor = MonitorInfo {
            index: 2,
            name: "Left Monitor".to_string(),
            x: -1920,
            y: 0,
            width: 1920,
            height: 1080,
            is_primary: false,
            scale_factor: 1.0,
        };
        
        assert_eq!(monitor.x, -1920);
    }

    #[test]
    fn test_monitor_info_serialization() {
        let monitor = MonitorInfo {
            index: 0,
            name: "Test".to_string(),
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            is_primary: true,
            scale_factor: 2.0,
        };
        
        let json = serde_json::to_string(&monitor).unwrap();
        let deserialized: MonitorInfo = serde_json::from_str(&json).unwrap();
        
        assert_eq!(monitor.index, deserialized.index);
        assert_eq!(monitor.scale_factor, deserialized.scale_factor);
    }

    #[test]
    fn test_monitor_info_clone() {
        let monitor = MonitorInfo {
            index: 0,
            name: "Monitor".to_string(),
            x: 100,
            y: 200,
            width: 1280,
            height: 720,
            is_primary: true,
            scale_factor: 1.5,
        };
        let cloned = monitor.clone();
        
        assert_eq!(monitor.name, cloned.name);
        assert_eq!(monitor.width, cloned.width);
        assert_eq!(monitor.scale_factor, cloned.scale_factor);
    }
}
