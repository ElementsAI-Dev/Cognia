//! Text selection detector
//!
//! Detects selected text from other applications using platform-specific APIs.

use std::sync::Arc;
use parking_lot::RwLock;

#[cfg(target_os = "windows")]
use windows::{
    core::BSTR,
    Win32::System::Com::{CoInitializeEx, CoUninitialize, COINIT_APARTMENTTHREADED},
    Win32::UI::Accessibility::{
        CUIAutomation, IUIAutomation, IUIAutomationTextPattern, UIA_TextPatternId,
    },
};

/// Text selection detector
pub struct SelectionDetector {
    /// Last detected text
    last_text: Arc<RwLock<Option<String>>>,
    /// Whether COM is initialized
    #[cfg(target_os = "windows")]
    com_initialized: Arc<RwLock<bool>>,
}

impl SelectionDetector {
    pub fn new() -> Self {
        Self {
            last_text: Arc::new(RwLock::new(None)),
            #[cfg(target_os = "windows")]
            com_initialized: Arc::new(RwLock::new(false)),
        }
    }

    /// Get selected text from the focused application
    #[cfg(target_os = "windows")]
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        // Try UI Automation first
        match self.get_text_via_ui_automation() {
            Ok(Some(text)) if !text.is_empty() => {
                let mut last = self.last_text.write();
                *last = Some(text.clone());
                return Ok(Some(text));
            }
            _ => {}
        }

        // Fallback: try clipboard method
        self.get_text_via_clipboard()
    }

    #[cfg(not(target_os = "windows"))]
    pub fn get_selected_text(&self) -> Result<Option<String>, String> {
        // For non-Windows platforms, use clipboard fallback
        self.get_text_via_clipboard()
    }

    /// Get selected text using Windows UI Automation API
    #[cfg(target_os = "windows")]
    fn get_text_via_ui_automation(&self) -> Result<Option<String>, String> {
        unsafe {
            // Initialize COM if not already done
            {
                let mut initialized = self.com_initialized.write();
                if !*initialized {
                    CoInitializeEx(None, COINIT_APARTMENTTHREADED)
                        .map_err(|e| format!("Failed to initialize COM: {}", e))?;
                    *initialized = true;
                }
            }

            // Create UI Automation instance
            let automation: IUIAutomation = windows::core::ComInterface::cast(
                &windows::core::ComObject::new(CUIAutomation)
                    .map_err(|e| format!("Failed to create CUIAutomation: {}", e))?,
            )
            .map_err(|e| format!("Failed to cast to IUIAutomation: {}", e))?;

            // Get focused element
            let focused = automation
                .GetFocusedElement()
                .map_err(|e| format!("Failed to get focused element: {}", e))?;

            // Try to get TextPattern
            let pattern_obj = focused
                .GetCurrentPattern(UIA_TextPatternId)
                .map_err(|_| "Element does not support TextPattern")?;

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

    /// Fallback method: simulate Ctrl+C and read from clipboard
    fn get_text_via_clipboard(&self) -> Result<Option<String>, String> {
        use arboard::Clipboard;

        // Save current clipboard content
        let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
        let original = clipboard.get_text().ok();

        // Simulate Ctrl+C
        #[cfg(target_os = "windows")]
        {
            use rdev::{simulate, EventType, Key};
            use std::thread;
            use std::time::Duration;

            // Press Ctrl+C
            simulate(&EventType::KeyPress(Key::ControlLeft))
                .map_err(|e| format!("Failed to simulate key: {:?}", e))?;
            thread::sleep(Duration::from_millis(10));
            simulate(&EventType::KeyPress(Key::KeyC))
                .map_err(|e| format!("Failed to simulate key: {:?}", e))?;
            thread::sleep(Duration::from_millis(10));
            simulate(&EventType::KeyRelease(Key::KeyC))
                .map_err(|e| format!("Failed to simulate key: {:?}", e))?;
            simulate(&EventType::KeyRelease(Key::ControlLeft))
                .map_err(|e| format!("Failed to simulate key: {:?}", e))?;

            // Wait for clipboard to update
            thread::sleep(Duration::from_millis(50));
        }

        // Read new clipboard content
        let new_text = clipboard.get_text().ok();

        // Restore original clipboard if we got text
        if let Some(ref orig) = original {
            if new_text.is_some() && new_text != original {
                // We got new text, restore original after a delay
                let orig_clone = orig.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    if let Ok(mut cb) = Clipboard::new() {
                        let _ = cb.set_text(orig_clone);
                    }
                });
            }
        }

        // Return new text if different from original
        if new_text != original {
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
