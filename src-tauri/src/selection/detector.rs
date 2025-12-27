//! Text selection detector
//!
//! Detects selected text from other applications using platform-specific APIs.

use std::sync::Arc;
use std::sync::atomic::{AtomicU32, Ordering};
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
const MAX_CLIPBOARD_RETRIES: u32 = 3;

/// Delay between clipboard retries in milliseconds
const CLIPBOARD_RETRY_DELAY_MS: u64 = 50;

/// Text selection detector
pub struct SelectionDetector {
    /// Last detected text
    last_text: Arc<RwLock<Option<String>>>,
    /// Last detection timestamp
    last_detection_time: Arc<RwLock<Option<std::time::Instant>>>,
    /// Detection attempt counter (for debugging)
    detection_attempts: Arc<AtomicU32>,
    /// Successful detection counter
    successful_detections: Arc<AtomicU32>,
    /// Whether COM is initialized
    #[cfg(target_os = "windows")]
    com_initialized: Arc<RwLock<bool>>,
}

impl SelectionDetector {
    pub fn new() -> Self {
        Self {
            last_text: Arc::new(RwLock::new(None)),
            last_detection_time: Arc::new(RwLock::new(None)),
            detection_attempts: Arc::new(AtomicU32::new(0)),
            successful_detections: Arc::new(AtomicU32::new(0)),
            #[cfg(target_os = "windows")]
            com_initialized: Arc::new(RwLock::new(false)),
        }
    }

    /// Get selected text from the focused application
    #[cfg(target_os = "windows")]
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        self.detection_attempts.fetch_add(1, Ordering::Relaxed);
        
        // Try UI Automation first (most reliable, doesn't modify clipboard)
        match self.get_text_via_ui_automation() {
            Ok(Some(text)) if !text.is_empty() => {
                self.record_successful_detection(text.clone());
                return Ok(Some(text));
            }
            Ok(_) => {
                log::debug!("UI Automation returned no text, trying clipboard fallback");
            }
            Err(e) => {
                log::debug!("UI Automation failed: {}, trying clipboard fallback", e);
            }
        }

        // Fallback: try clipboard method with retries
        self.get_text_via_clipboard_with_retry()
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        self.detection_attempts.fetch_add(1, Ordering::Relaxed);
        // For non-Windows platforms, use clipboard fallback with retries
        self.get_text_via_clipboard_with_retry()
    }

    /// Record a successful detection
    fn record_successful_detection(&self, text: String) {
        self.successful_detections.fetch_add(1, Ordering::Relaxed);
        *self.last_text.write() = Some(text);
        *self.last_detection_time.write() = Some(std::time::Instant::now());
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

    /// Get selected text using Windows UI Automation API
    #[cfg(target_os = "windows")]
    fn get_text_via_ui_automation(&self) -> Result<Option<String>, String> {
        unsafe {
            // Initialize COM if not already done
            {
                let mut initialized = self.com_initialized.write();
                if !*initialized {
                    let hr = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
                    if hr.is_err() {
                        return Err(format!("Failed to initialize COM: {:?}", hr));
                    }
                    *initialized = true;
                }
            }

            // Create UI Automation instance using CoCreateInstance
            let automation: IUIAutomation = CoCreateInstance(
                &CUIAutomation,
                None,
                CLSCTX_INPROC_SERVER,
            )
            .map_err(|e| format!("Failed to create CUIAutomation: {}", e))?;

            // Get focused element
            let focused = automation
                .GetFocusedElement()
                .map_err(|e| format!("Failed to get focused element: {}", e))?;

            // Try to get TextPattern
            let pattern_obj = focused
                .GetCurrentPattern(UIA_TextPatternId)
                .map_err(|_| "Element does not support TextPattern".to_string())?;

            let text_pattern: IUIAutomationTextPattern = pattern_obj
                .cast()
                .map_err(|e| format!("Failed to cast to TextPattern: {}", e))?;

            // Get selection
            let selection = text_pattern
                .GetSelection()
                .map_err(|e| format!("Failed to get selection: {}", e))?;

            let count = selection
                .Length()
                .map_err(|e| format!("Failed to get selection length: {}", e))?;

            if count == 0 {
                return Ok(None);
            }

            // Get first selection range
            let range = selection
                .GetElement(0)
                .map_err(|e| format!("Failed to get selection range: {}", e))?;

            let text: BSTR = range
                .GetText(-1)
                .map_err(|e| format!("Failed to get text: {}", e))?;

            let text_str = text.to_string();
            if text_str.is_empty() {
                Ok(None)
            } else {
                Ok(Some(text_str))
            }
        }
    }

    /// Clipboard fallback with retry logic
    fn get_text_via_clipboard_with_retry(&self) -> Result<Option<String>, String> {
        let mut last_error = String::new();
        
        for attempt in 0..MAX_CLIPBOARD_RETRIES {
            match self.get_text_via_clipboard() {
                Ok(Some(text)) if !text.is_empty() => {
                    self.record_successful_detection(text.clone());
                    return Ok(Some(text));
                }
                Ok(_) => {
                    // No text, but no error - don't retry
                    return Ok(None);
                }
                Err(e) => {
                    last_error = e;
                    if attempt < MAX_CLIPBOARD_RETRIES - 1 {
                        log::debug!("Clipboard attempt {} failed, retrying...", attempt + 1);
                        std::thread::sleep(std::time::Duration::from_millis(CLIPBOARD_RETRY_DELAY_MS));
                    }
                }
            }
        }
        
        Err(format!("Clipboard fallback failed after {} attempts: {}", MAX_CLIPBOARD_RETRIES, last_error))
    }

    /// Fallback method: simulate Ctrl+C and read from clipboard
    fn get_text_via_clipboard(&self) -> Result<Option<String>, String> {
        use arboard::Clipboard;

        // Save current clipboard content
        let mut clipboard = Clipboard::new().map_err(|e| format!("Failed to create clipboard: {}", e))?;
        let original = clipboard.get_text().ok();

        // Simulate Ctrl+C
        #[cfg(target_os = "windows")]
        {
            use rdev::{simulate, EventType, Key};
            use std::thread;
            use std::time::Duration;

            // Small delay before simulating to ensure focus is stable
            thread::sleep(Duration::from_millis(10));

            // Press Ctrl+C with proper timing
            simulate(&EventType::KeyPress(Key::ControlLeft))
                .map_err(|e| format!("Failed to simulate Ctrl press: {:?}", e))?;
            thread::sleep(Duration::from_millis(20));
            
            simulate(&EventType::KeyPress(Key::KeyC))
                .map_err(|e| format!("Failed to simulate C press: {:?}", e))?;
            thread::sleep(Duration::from_millis(20));
            
            simulate(&EventType::KeyRelease(Key::KeyC))
                .map_err(|e| format!("Failed to simulate C release: {:?}", e))?;
            thread::sleep(Duration::from_millis(10));
            
            simulate(&EventType::KeyRelease(Key::ControlLeft))
                .map_err(|e| format!("Failed to simulate Ctrl release: {:?}", e))?;

            // Wait for clipboard to update (increased delay for reliability)
            thread::sleep(Duration::from_millis(80));
        }

        #[cfg(not(target_os = "windows"))]
        {
            // On non-Windows, we can't easily simulate Ctrl+C
            // Just return whatever is in the clipboard
            log::debug!("Non-Windows platform: using current clipboard content");
        }

        // Read new clipboard content
        let new_text = clipboard.get_text().ok();

        // Restore original clipboard if we got new text
        if let Some(ref orig) = original {
            if new_text.is_some() && new_text != original {
                // We got new text, restore original after a delay
                let orig_clone = orig.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(150));
                    if let Ok(mut cb) = Clipboard::new() {
                        let _ = cb.set_text(orig_clone);
                    }
                });
            }
        }

        // Return new text if different from original
        if new_text != original {
            if let Some(ref text) = new_text {
                log::debug!("Got {} chars from clipboard", text.len());
            }
            Ok(new_text)
        } else {
            Ok(None)
        }
    }

    /// Get the last detected text
    pub fn get_last_text(&self) -> Option<String> {
        self.last_text.read().clone()
    }

    /// Clear the last detected text
    pub fn clear_last_text(&self) {
        let mut last = self.last_text.write();
        *last = None;
    }
}

impl Drop for SelectionDetector {
    fn drop(&mut self) {
        #[cfg(target_os = "windows")]
        {
            let initialized = self.com_initialized.read();
            if *initialized {
                unsafe {
                    CoUninitialize();
                }
            }
        }
    }
}

impl Default for SelectionDetector {
    fn default() -> Self {
        Self::new()
    }
}
