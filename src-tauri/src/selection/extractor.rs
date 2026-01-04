//! Text extraction module
//!
//! Platform-specific text extraction using UI Automation (Windows) and clipboard fallback.

use std::sync::Arc;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use parking_lot::RwLock;

#[cfg(target_os = "windows")]
use windows::{
    core::{BSTR, Interface},
    Win32::System::Com::{CoInitializeEx, CoUninitialize, CoCreateInstance, COINIT_APARTMENTTHREADED, CLSCTX_INPROC_SERVER},
    Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId,
    },
};

/// Maximum retries for clipboard fallback
const MAX_CLIPBOARD_RETRIES: u32 = 2;

/// Delay between clipboard retries in milliseconds
const CLIPBOARD_RETRY_DELAY_MS: u64 = 50;

/// Minimum interval between clipboard copy simulations (debounce) in milliseconds
const CLIPBOARD_DEBOUNCE_MS: u64 = 500;

/// Text extractor for retrieving selected text from applications
pub struct TextExtractor {
    /// Last detected text
    last_text: Arc<RwLock<Option<String>>>,
    /// Last detection timestamp
    last_detection_time: Arc<RwLock<Option<std::time::Instant>>>,
    /// Detection attempt counter
    detection_attempts: Arc<AtomicU32>,
    /// Successful detection counter
    successful_detections: Arc<AtomicU32>,
    /// Last clipboard copy simulation timestamp (for debouncing)
    last_clipboard_copy_time: Arc<AtomicU64>,
    /// Whether COM is initialized (Windows only)
    #[cfg(target_os = "windows")]
    com_initialized: Arc<RwLock<bool>>,
}

impl TextExtractor {
    pub fn new() -> Self {
        log::debug!("[TextExtractor] Creating new instance");
        Self {
            last_text: Arc::new(RwLock::new(None)),
            last_detection_time: Arc::new(RwLock::new(None)),
            detection_attempts: Arc::new(AtomicU32::new(0)),
            successful_detections: Arc::new(AtomicU32::new(0)),
            last_clipboard_copy_time: Arc::new(AtomicU64::new(0)),
            #[cfg(target_os = "windows")]
            com_initialized: Arc::new(RwLock::new(false)),
        }
    }

    /// Get selected text from the focused application
    #[cfg(target_os = "windows")]
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        let attempt = self.detection_attempts.fetch_add(1, Ordering::Relaxed) + 1;
        log::trace!("[TextExtractor] get_selected_text called (attempt #{})", attempt);
        
        // Try UI Automation first (most reliable, doesn't modify clipboard)
        log::trace!("[TextExtractor] Attempting UI Automation method");
        match self.get_text_via_ui_automation() {
            Ok(Some(text)) if !text.is_empty() => {
                log::debug!("[TextExtractor] UI Automation success: {} chars detected", text.len());
                self.record_successful_detection(text.clone());
                return Ok(Some(text));
            }
            Ok(_) => {
                log::debug!("[TextExtractor] UI Automation returned no text, trying clipboard fallback");
            }
            Err(e) => {
                log::debug!("[TextExtractor] UI Automation failed: {}, trying clipboard fallback", e);
            }
        }

        // Fallback: try clipboard method with retries
        log::trace!("[TextExtractor] Attempting clipboard fallback method");
        self.get_text_via_clipboard_with_retry()
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        let attempt = self.detection_attempts.fetch_add(1, Ordering::Relaxed) + 1;
        log::trace!("[TextExtractor] get_selected_text called on non-Windows (attempt #{})", attempt);
        self.get_text_via_clipboard_with_retry()
    }

    /// Record a successful detection
    fn record_successful_detection(&self, text: String) {
        let count = self.successful_detections.fetch_add(1, Ordering::Relaxed) + 1;
        let text_len = text.len();
        *self.last_text.write() = Some(text);
        *self.last_detection_time.write() = Some(std::time::Instant::now());
        log::debug!("[TextExtractor] Recorded successful detection #{}: {} chars", count, text_len);
    }

    /// Get detection statistics
    pub fn get_stats(&self) -> (u32, u32) {
        (
            self.detection_attempts.load(Ordering::Relaxed),
            self.successful_detections.load(Ordering::Relaxed),
        )
    }

    /// Get time since last successful detection
    pub fn time_since_last_detection(&self) -> Option<std::time::Duration> {
        self.last_detection_time.read().map(|t| t.elapsed())
    }

    /// Get the last detected text
    pub fn get_last_text(&self) -> Option<String> {
        self.last_text.read().clone()
    }

    /// Clear the last detected text
    pub fn clear_last_text(&self) {
        log::debug!("[TextExtractor] Clearing last detected text");
        *self.last_text.write() = None;
    }

    /// Get selected text using Windows UI Automation API
    #[cfg(target_os = "windows")]
    fn get_text_via_ui_automation(&self) -> Result<Option<String>, String> {
        log::trace!("[TextExtractor] get_text_via_ui_automation: starting");
        unsafe {
            // Initialize COM if not already done
            {
                let mut initialized = self.com_initialized.write();
                if !*initialized {
                    log::debug!("[TextExtractor] Initializing COM for UI Automation");
                    let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
                    if hr.is_err() {
                        log::error!("[TextExtractor] Failed to initialize COM: {:?}", hr);
                        return Err(format!("Failed to initialize COM: {:?}", hr));
                    }
                    *initialized = true;
                    log::debug!("[TextExtractor] COM initialized successfully");
                }
            }

            // Create UI Automation instance
            log::trace!("[TextExtractor] Creating CUIAutomation instance");
            let automation: IUIAutomation = CoCreateInstance(
                &CUIAutomation,
                None,
                CLSCTX_INPROC_SERVER,
            )
            .map_err(|e| {
                log::warn!("[TextExtractor] Failed to create CUIAutomation: {}", e);
                format!("Failed to create CUIAutomation: {}", e)
            })?;

            // Get focused element
            log::trace!("[TextExtractor] Getting focused element");
            let focused = automation
                .GetFocusedElement()
                .map_err(|e| {
                    log::debug!("[TextExtractor] Failed to get focused element: {}", e);
                    format!("Failed to get focused element: {}", e)
                })?;

            // Try to get TextPattern
            log::trace!("[TextExtractor] Getting TextPattern from focused element");
            let pattern_obj = focused
                .GetCurrentPattern(UIA_TextPatternId)
                .map_err(|_| {
                    log::trace!("[TextExtractor] Element does not support TextPattern");
                    "Element does not support TextPattern".to_string()
                })?;

            let text_pattern: IUIAutomationTextPattern = pattern_obj
                .cast()
                .map_err(|e| {
                    log::debug!("[TextExtractor] Failed to cast to TextPattern: {}", e);
                    format!("Failed to cast to TextPattern: {}", e)
                })?;

            // Get selection
            log::trace!("[TextExtractor] Getting text selection");
            let selection = text_pattern
                .GetSelection()
                .map_err(|e| {
                    log::debug!("[TextExtractor] Failed to get selection: {}", e);
                    format!("Failed to get selection: {}", e)
                })?;

            let count = selection
                .Length()
                .map_err(|e| {
                    log::debug!("[TextExtractor] Failed to get selection length: {}", e);
                    format!("Failed to get selection length: {}", e)
                })?;

            log::trace!("[TextExtractor] Selection range count: {}", count);
            if count == 0 {
                log::trace!("[TextExtractor] No selection ranges found");
                return Ok(None);
            }

            // Get first selection range
            log::trace!("[TextExtractor] Getting first selection range");
            let range = selection
                .GetElement(0)
                .map_err(|e| {
                    log::debug!("[TextExtractor] Failed to get selection range: {}", e);
                    format!("Failed to get selection range: {}", e)
                })?;

            let text: BSTR = range
                .GetText(-1)
                .map_err(|e| {
                    log::debug!("[TextExtractor] Failed to get text from range: {}", e);
                    format!("Failed to get text: {}", e)
                })?;

            let text_str = text.to_string();
            if text_str.is_empty() {
                log::trace!("[TextExtractor] UI Automation returned empty text");
                Ok(None)
            } else {
                log::debug!("[TextExtractor] UI Automation extracted {} chars", text_str.len());
                Ok(Some(text_str))
            }
        }
    }

    /// Clipboard fallback with retry logic
    fn get_text_via_clipboard_with_retry(&self) -> Result<Option<String>, String> {
        log::trace!("[TextExtractor] get_text_via_clipboard_with_retry: starting (max {} attempts)", MAX_CLIPBOARD_RETRIES);
        let mut last_error = String::new();
        
        for attempt in 0..MAX_CLIPBOARD_RETRIES {
            log::trace!("[TextExtractor] Clipboard attempt {}/{}", attempt + 1, MAX_CLIPBOARD_RETRIES);
            match self.get_text_via_clipboard() {
                Ok(Some(text)) if !text.is_empty() => {
                    log::debug!("[TextExtractor] Clipboard method success on attempt {}: {} chars", attempt + 1, text.len());
                    self.record_successful_detection(text.clone());
                    return Ok(Some(text));
                }
                Ok(_) => {
                    log::trace!("[TextExtractor] Clipboard returned no text on attempt {}", attempt + 1);
                    return Ok(None);
                }
                Err(e) => {
                    last_error = e.clone();
                    if attempt < MAX_CLIPBOARD_RETRIES - 1 {
                        log::debug!("[TextExtractor] Clipboard attempt {} failed: {}, retrying in {}ms...", 
                            attempt + 1, e, CLIPBOARD_RETRY_DELAY_MS);
                        std::thread::sleep(std::time::Duration::from_millis(CLIPBOARD_RETRY_DELAY_MS));
                    } else {
                        log::warn!("[TextExtractor] Clipboard attempt {} failed: {} (no more retries)", attempt + 1, e);
                    }
                }
            }
        }
        
        log::error!("[TextExtractor] Clipboard fallback failed after {} attempts: {}", MAX_CLIPBOARD_RETRIES, last_error);
        Err(format!("Clipboard fallback failed after {} attempts: {}", MAX_CLIPBOARD_RETRIES, last_error))
    }

    /// Fallback method: simulate Ctrl+C and read from clipboard
    fn get_text_via_clipboard(&self) -> Result<Option<String>, String> {
        use arboard::Clipboard;
        log::trace!("[TextExtractor] get_text_via_clipboard: starting");

        // Check debounce - prevent rapid-fire clipboard copy simulations
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let last_copy = self.last_clipboard_copy_time.load(Ordering::Relaxed);
        if last_copy > 0 && now_ms.saturating_sub(last_copy) < CLIPBOARD_DEBOUNCE_MS {
            log::trace!("[TextExtractor] Clipboard copy debounced ({}ms since last)", now_ms.saturating_sub(last_copy));
            // Return last text instead of triggering another copy
            return Ok(self.last_text.read().clone());
        }

        // Save current clipboard content
        let mut clipboard = Clipboard::new().map_err(|e| {
            log::warn!("[TextExtractor] Failed to create clipboard instance: {}", e);
            format!("Failed to create clipboard: {}", e)
        })?;
        let original = clipboard.get_text().ok();
        log::trace!("[TextExtractor] Saved original clipboard content: {} chars", 
            original.as_ref().map(|s| s.len()).unwrap_or(0));

        // Simulate Ctrl+C
        #[cfg(target_os = "windows")]
        {
            use rdev::{simulate, EventType, Key};
            use std::thread;
            use std::time::Duration;

            log::trace!("[TextExtractor] Simulating Ctrl+C keystroke");

            thread::sleep(Duration::from_millis(10));

            simulate(&EventType::KeyPress(Key::ControlLeft))
                .map_err(|e| {
                    log::warn!("[TextExtractor] Failed to simulate Ctrl press: {:?}", e);
                    format!("Failed to simulate Ctrl press: {:?}", e)
                })?;
            thread::sleep(Duration::from_millis(20));
            
            simulate(&EventType::KeyPress(Key::KeyC))
                .map_err(|e| {
                    log::warn!("[TextExtractor] Failed to simulate C press: {:?}", e);
                    format!("Failed to simulate C press: {:?}", e)
                })?;
            thread::sleep(Duration::from_millis(20));
            
            simulate(&EventType::KeyRelease(Key::KeyC))
                .map_err(|e| {
                    log::warn!("[TextExtractor] Failed to simulate C release: {:?}", e);
                    format!("Failed to simulate C release: {:?}", e)
                })?;
            thread::sleep(Duration::from_millis(10));
            
            simulate(&EventType::KeyRelease(Key::ControlLeft))
                .map_err(|e| {
                    log::warn!("[TextExtractor] Failed to simulate Ctrl release: {:?}", e);
                    format!("Failed to simulate Ctrl release: {:?}", e)
                })?;

            thread::sleep(Duration::from_millis(80));
            // Update last copy time after successful simulation
            self.last_clipboard_copy_time.store(now_ms, Ordering::Relaxed);
            log::trace!("[TextExtractor] Ctrl+C simulation complete");
        }

        #[cfg(not(target_os = "windows"))]
        {
            log::debug!("[TextExtractor] Non-Windows platform: using current clipboard content");
        }

        // Read new clipboard content
        let new_text = clipboard.get_text().ok();
        log::trace!("[TextExtractor] New clipboard content: {} chars", 
            new_text.as_ref().map(|s| s.len()).unwrap_or(0));

        // Restore original clipboard if we got new text
        if let Some(ref orig) = original {
            if new_text.is_some() && new_text != original {
                log::trace!("[TextExtractor] Scheduling clipboard restoration");
                let orig_clone = orig.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(150));
                    if let Ok(mut cb) = Clipboard::new() {
                        let _ = cb.set_text(orig_clone);
                        log::trace!("[TextExtractor] Original clipboard content restored");
                    }
                });
            }
        }

        // Return new text if different from original
        if new_text != original {
            if let Some(ref text) = new_text {
                log::debug!("[TextExtractor] Clipboard method got {} chars (different from original)", text.len());
            }
            Ok(new_text)
        } else {
            log::trace!("[TextExtractor] Clipboard content unchanged from original");
            Ok(None)
        }
    }
}

impl Drop for TextExtractor {
    fn drop(&mut self) {
        log::debug!("[TextExtractor] Dropping instance");
        #[cfg(target_os = "windows")]
        {
            let initialized = self.com_initialized.read();
            if *initialized {
                log::debug!("[TextExtractor] Uninitializing COM");
                unsafe {
                    CoUninitialize();
                }
            }
        }
    }
}

impl Default for TextExtractor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_extractor() {
        let extractor = TextExtractor::new();
        assert!(extractor.get_last_text().is_none());
    }

    #[test]
    fn test_initial_stats() {
        let extractor = TextExtractor::new();
        let (attempts, successes) = extractor.get_stats();
        assert_eq!(attempts, 0);
        assert_eq!(successes, 0);
    }

    #[test]
    fn test_clear_last_text() {
        let extractor = TextExtractor::new();
        *extractor.last_text.write() = Some("test".to_string());
        extractor.clear_last_text();
        assert!(extractor.get_last_text().is_none());
    }

    #[test]
    fn test_record_successful_detection() {
        let extractor = TextExtractor::new();
        extractor.record_successful_detection("detected".to_string());
        
        let (_, successes) = extractor.get_stats();
        assert_eq!(successes, 1);
        assert_eq!(extractor.get_last_text(), Some("detected".to_string()));
    }

    #[test]
    fn test_time_since_last_detection() {
        let extractor = TextExtractor::new();
        assert!(extractor.time_since_last_detection().is_none());
        
        extractor.record_successful_detection("test".to_string());
        assert!(extractor.time_since_last_detection().is_some());
    }
}
