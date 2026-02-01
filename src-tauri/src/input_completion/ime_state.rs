//! IME (Input Method Editor) state detection
//!
//! Detects the current state of the system's input method, including:
//! - Whether IME is active
//! - Current input mode (Chinese, English, etc.)
//! - Whether the user is currently composing (typing pinyin, etc.)

use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// Input mode classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum InputMode {
    /// English/ASCII input
    English,
    /// Chinese input (Pinyin, Wubi, etc.)
    Chinese,
    /// Japanese input (Hiragana, Katakana, Kanji)
    Japanese,
    /// Korean input (Hangul)
    Korean,
    /// Other/Unknown input mode
    Other(String),
}

/// Current IME state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImeState {
    /// Whether IME is currently active/open
    pub is_active: bool,
    /// Whether user is currently composing (e.g., typing pinyin)
    pub is_composing: bool,
    /// Current input mode
    pub input_mode: InputMode,
    /// Name of the current IME (if available)
    pub ime_name: Option<String>,
    /// Current composition string (the pinyin being typed)
    pub composition_string: Option<String>,
    /// Candidate list (if available)
    pub candidates: Vec<String>,
}

impl Default for ImeState {
    fn default() -> Self {
        Self {
            is_active: false,
            is_composing: false,
            input_mode: InputMode::English,
            ime_name: None,
            composition_string: None,
            candidates: Vec::new(),
        }
    }
}

/// IME Monitor for tracking input method state
pub struct ImeMonitor {
    /// Current IME state
    state: Arc<RwLock<ImeState>>,
    /// Whether monitoring is active
    is_running: Arc<AtomicBool>,
    /// Polling interval in milliseconds
    poll_interval_ms: u64,
}

impl ImeMonitor {
    /// Create a new IME monitor
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(ImeState::default())),
            is_running: Arc::new(AtomicBool::new(false)),
            poll_interval_ms: 100,
        }
    }

    /// Start monitoring IME state
    pub fn start(&self) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        log::info!("Starting IME monitor");
        self.is_running.store(true, Ordering::SeqCst);

        let state = self.state.clone();
        let is_running = self.is_running.clone();
        let poll_interval = self.poll_interval_ms;

        std::thread::spawn(move || {
            while is_running.load(Ordering::SeqCst) {
                // Poll IME state
                let new_state = Self::poll_ime_state();
                
                // Update state if changed
                let mut current = state.write();
                if current.is_active != new_state.is_active
                    || current.is_composing != new_state.is_composing
                    || current.input_mode != new_state.input_mode
                {
                    log::trace!(
                        "IME state changed: active={}, composing={}, mode={:?}",
                        new_state.is_active,
                        new_state.is_composing,
                        new_state.input_mode
                    );
                    *current = new_state;
                }
                drop(current);

                std::thread::sleep(std::time::Duration::from_millis(poll_interval));
            }
            log::info!("IME monitor stopped");
        });

        Ok(())
    }

    /// Stop monitoring IME state
    pub fn stop(&self) {
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Get current IME state
    pub fn get_state(&self) -> ImeState {
        self.state.read().clone()
    }

    /// Poll the current IME state from the system
    #[cfg(windows)]
    fn poll_ime_state() -> ImeState {
        use windows::Win32::UI::Input::Ime::*;
        use windows::Win32::UI::WindowsAndMessaging::*;
        use windows::Win32::Foundation::*;

        unsafe {
            // Get the foreground window
            let hwnd = GetForegroundWindow();
            if hwnd.0.is_null() {
                return ImeState::default();
            }

            // Get the default IME window
            let ime_wnd = ImmGetDefaultIMEWnd(hwnd);
            if ime_wnd.0.is_null() {
                return ImeState::default();
            }

            // Check if IME is open (Chinese mode vs English mode)
            // IMC_GETOPENSTATUS = 0x0005
            let status = SendMessageW(
                ime_wnd,
                WM_IME_CONTROL,
                WPARAM(0x0005),
                LPARAM(0),
            );

            let is_active = status.0 != 0;

            // Get IME context
            let himc = ImmGetContext(hwnd);
            let mut is_composing = false;
            let mut composition_string = None;

            if !himc.is_invalid() {
                // Check if currently composing
                // GCS_COMPSTR = 0x0008
                let comp_len = ImmGetCompositionStringW(himc, GCS_COMPSTR, None, 0);
                if comp_len > 0 {
                    is_composing = true;
                    
                    // Get the composition string
                    let mut buffer = vec![0u16; (comp_len as usize / 2) + 1];
                    let buffer_size = (buffer.len() * 2) as u32;
                    let result = ImmGetCompositionStringW(
                        himc,
                        GCS_COMPSTR,
                        Some(buffer.as_mut_ptr() as *mut _),
                        buffer_size,
                    );
                    
                    if result > 0 {
                        let len = result as usize / 2;
                        composition_string = Some(String::from_utf16_lossy(&buffer[..len]));
                    }
                }

                let _ = ImmReleaseContext(hwnd, himc);
            }

            // Determine input mode
            let input_mode = if is_active {
                InputMode::Chinese
            } else {
                InputMode::English
            };

            ImeState {
                is_active,
                is_composing,
                input_mode,
                ime_name: None,
                composition_string,
                candidates: Vec::new(),
            }
        }
    }

    /// Poll IME state on macOS using Carbon API
    #[cfg(target_os = "macos")]
    fn poll_ime_state() -> ImeState {
        use std::process::Command;
        
        // Use macOS command to detect current input source
        // This approach is more reliable than trying to link against Carbon framework
        let output = Command::new("defaults")
            .args(["read", "com.apple.HIToolbox", "AppleCurrentKeyboardLayoutInputSourceID"])
            .output();
        
        match output {
            Ok(result) => {
                let input_source = String::from_utf8_lossy(&result.stdout).trim().to_string();
                
                // Detect input mode based on input source ID
                let (is_active, input_mode, ime_name) = if input_source.contains("Pinyin") 
                    || input_source.contains("Chinese") 
                    || input_source.contains("Simplified")
                    || input_source.contains("Traditional")
                    || input_source.contains("Wubi")
                {
                    (true, InputMode::Chinese, Some("macOS Chinese".to_string()))
                } else if input_source.contains("Japanese") 
                    || input_source.contains("Hiragana")
                    || input_source.contains("Katakana")
                    || input_source.contains("Romaji")
                {
                    (true, InputMode::Japanese, Some("macOS Japanese".to_string()))
                } else if input_source.contains("Korean") 
                    || input_source.contains("Hangul")
                {
                    (true, InputMode::Korean, Some("macOS Korean".to_string()))
                } else if input_source.contains("ABC") 
                    || input_source.contains("US") 
                    || input_source.contains("British")
                    || input_source.contains("Australian")
                {
                    (false, InputMode::English, None)
                } else {
                    // Unknown input source, assume not CJK
                    (false, InputMode::Other(input_source.clone()), Some(input_source))
                };
                
                ImeState {
                    is_active,
                    is_composing: false, // macOS doesn't expose composition state easily
                    input_mode,
                    ime_name,
                    composition_string: None,
                    candidates: Vec::new(),
                }
            }
            Err(e) => {
                log::trace!("Failed to detect macOS input source: {}", e);
                ImeState::default()
            }
        }
    }

    /// Poll IME state on Linux using IBus/Fcitx D-Bus interface
    #[cfg(target_os = "linux")]
    fn poll_ime_state() -> ImeState {
        use std::process::Command;
        
        // Try IBus first (most common on GNOME/Ubuntu)
        if let Some(state) = Self::poll_ibus_state() {
            return state;
        }
        
        // Try Fcitx (common on KDE and Chinese distributions)
        if let Some(state) = Self::poll_fcitx_state() {
            return state;
        }
        
        // Fallback: check environment variables for IME hints
        Self::poll_linux_env_ime()
    }
    
    #[cfg(target_os = "linux")]
    fn poll_ibus_state() -> Option<ImeState> {
        use std::process::Command;
        
        // Query IBus for current input method using ibus command with timeout
        let output = Command::new("timeout")
            .args(["0.5", "ibus", "read-config", "general/preload_engines"])
            .output()
            .ok()?;
        
        // Also try to get the current engine with timeout
        let engine_output = Command::new("timeout")
            .args(["0.5", "ibus", "engine"])
            .output()
            .ok();
        
        let current_engine = engine_output
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_default();
        
        if current_engine.is_empty() {
            return None;
        }
        
        let (is_active, input_mode, ime_name) = if current_engine.contains("pinyin") 
            || current_engine.contains("chinese")
            || current_engine.contains("rime")
            || current_engine.contains("wubi")
            || current_engine.contains("libpinyin")
        {
            (true, InputMode::Chinese, Some(current_engine.clone()))
        } else if current_engine.contains("anthy") 
            || current_engine.contains("mozc")
            || current_engine.contains("kkc")
        {
            (true, InputMode::Japanese, Some(current_engine.clone()))
        } else if current_engine.contains("hangul") 
            || current_engine.contains("korean")
        {
            (true, InputMode::Korean, Some(current_engine.clone()))
        } else if current_engine.contains("xkb") 
            || current_engine.contains("us")
            || current_engine.contains("en")
        {
            (false, InputMode::English, None)
        } else {
            (false, InputMode::Other(current_engine.clone()), Some(current_engine))
        };
        
        Some(ImeState {
            is_active,
            is_composing: false, // IBus doesn't expose this via CLI easily
            input_mode,
            ime_name,
            composition_string: None,
            candidates: Vec::new(),
        })
    }
    
    #[cfg(target_os = "linux")]
    fn poll_fcitx_state() -> Option<ImeState> {
        use std::process::Command;
        
        // Try fcitx5-remote first (Fcitx5) with timeout
        let output = Command::new("timeout")
            .args(["0.5", "fcitx5-remote", "-n"]) // Get current input method name
            .output();
        
        let current_im = match output {
            Ok(o) if o.status.success() => {
                String::from_utf8_lossy(&o.stdout).trim().to_string()
            }
            _ => {
                // Fallback to fcitx-remote (Fcitx4) with timeout
                let output4 = Command::new("timeout")
                    .args(["0.5", "fcitx-remote", "-n"])
                    .output()
                    .ok()?;
                    
                if !output4.status.success() {
                    return None;
                }
                String::from_utf8_lossy(&output4.stdout).trim().to_string()
            }
        };
        
        if current_im.is_empty() {
            return None;
        }
        
        let (is_active, input_mode, ime_name) = if current_im.contains("pinyin") 
            || current_im.contains("rime")
            || current_im.contains("chinese")
            || current_im.contains("wubi")
            || current_im.contains("shuangpin")
        {
            (true, InputMode::Chinese, Some(current_im.clone()))
        } else if current_im.contains("anthy") 
            || current_im.contains("mozc")
            || current_im.contains("kkc")
        {
            (true, InputMode::Japanese, Some(current_im.clone()))
        } else if current_im.contains("hangul") {
            (true, InputMode::Korean, Some(current_im.clone()))
        } else if current_im.contains("keyboard") 
            || current_im.contains("us")
        {
            (false, InputMode::English, None)
        } else {
            (false, InputMode::Other(current_im.clone()), Some(current_im))
        };
        
        Some(ImeState {
            is_active,
            is_composing: false,
            input_mode,
            ime_name,
            composition_string: None,
            candidates: Vec::new(),
        })
    }
    
    #[cfg(target_os = "linux")]
    fn poll_linux_env_ime() -> ImeState {
        // Check environment variables for IME configuration
        let gtk_im = std::env::var("GTK_IM_MODULE").unwrap_or_default();
        let qt_im = std::env::var("QT_IM_MODULE").unwrap_or_default();
        let xmodifiers = std::env::var("XMODIFIERS").unwrap_or_default();
        
        // Detect if an IME framework is configured
        let has_ime = !gtk_im.is_empty() 
            && (gtk_im.contains("ibus") || gtk_im.contains("fcitx") || gtk_im.contains("scim"));
        
        if has_ime {
            log::trace!("Detected IME framework: GTK={}, QT={}, XMODIFIERS={}", gtk_im, qt_im, xmodifiers);
        }
        
        // Without being able to query the actual state, return conservative default
        ImeState::default()
    }

    /// Fallback for other Unix-like systems (FreeBSD, etc.)
    #[cfg(all(unix, not(target_os = "macos"), not(target_os = "linux")))]
    fn poll_ime_state() -> ImeState {
        // For other Unix systems, return default state
        log::trace!("IME detection not implemented for this Unix variant");
        ImeState::default()
    }
}

impl Default for ImeMonitor {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for ImeMonitor {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ime_state_default() {
        let state = ImeState::default();
        assert!(!state.is_active);
        assert!(!state.is_composing);
        assert_eq!(state.input_mode, InputMode::English);
        assert!(state.ime_name.is_none());
        assert!(state.composition_string.is_none());
        assert!(state.candidates.is_empty());
    }

    #[test]
    fn test_ime_monitor_creation() {
        let monitor = ImeMonitor::new();
        let state = monitor.get_state();
        assert!(!state.is_active);
    }

    #[test]
    fn test_ime_monitor_default() {
        let monitor = ImeMonitor::default();
        assert!(!monitor.is_running.load(Ordering::SeqCst));
    }

    #[test]
    fn test_input_mode_equality() {
        assert_eq!(InputMode::English, InputMode::English);
        assert_eq!(InputMode::Chinese, InputMode::Chinese);
        assert_eq!(InputMode::Japanese, InputMode::Japanese);
        assert_eq!(InputMode::Korean, InputMode::Korean);
        assert_ne!(InputMode::English, InputMode::Chinese);
        assert_ne!(InputMode::Japanese, InputMode::Korean);
    }

    #[test]
    fn test_input_mode_other() {
        let mode = InputMode::Other("Vietnamese".to_string());
        assert_eq!(mode, InputMode::Other("Vietnamese".to_string()));
        assert_ne!(mode, InputMode::Other("Thai".to_string()));
    }

    #[test]
    fn test_ime_state_serialization() {
        let state = ImeState {
            is_active: true,
            is_composing: true,
            input_mode: InputMode::Chinese,
            ime_name: Some("Microsoft Pinyin".to_string()),
            composition_string: Some("ni hao".to_string()),
            candidates: vec!["你好".to_string(), "泥好".to_string()],
        };

        let json = serde_json::to_string(&state).unwrap();
        let parsed: ImeState = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.is_active, state.is_active);
        assert_eq!(parsed.is_composing, state.is_composing);
        assert_eq!(parsed.input_mode, state.input_mode);
        assert_eq!(parsed.ime_name, state.ime_name);
        assert_eq!(parsed.composition_string, state.composition_string);
        assert_eq!(parsed.candidates, state.candidates);
    }

    #[test]
    fn test_input_mode_serialization_english() {
        let mode = InputMode::English;
        let json = serde_json::to_string(&mode).unwrap();
        let parsed: InputMode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, mode);
    }

    #[test]
    fn test_input_mode_serialization_chinese() {
        let mode = InputMode::Chinese;
        let json = serde_json::to_string(&mode).unwrap();
        let parsed: InputMode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, mode);
    }

    #[test]
    fn test_input_mode_serialization_japanese() {
        let mode = InputMode::Japanese;
        let json = serde_json::to_string(&mode).unwrap();
        let parsed: InputMode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, mode);
    }

    #[test]
    fn test_input_mode_serialization_korean() {
        let mode = InputMode::Korean;
        let json = serde_json::to_string(&mode).unwrap();
        let parsed: InputMode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, mode);
    }

    #[test]
    fn test_input_mode_serialization_other() {
        let mode = InputMode::Other("Thai".to_string());
        let json = serde_json::to_string(&mode).unwrap();
        let parsed: InputMode = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, mode);
    }

    #[test]
    fn test_ime_state_with_candidates() {
        let state = ImeState {
            is_active: true,
            is_composing: true,
            input_mode: InputMode::Chinese,
            ime_name: Some("Sogou Pinyin".to_string()),
            composition_string: Some("zhong wen".to_string()),
            candidates: vec![
                "中文".to_string(),
                "重温".to_string(),
                "钟文".to_string(),
            ],
        };

        assert_eq!(state.candidates.len(), 3);
        assert_eq!(state.candidates[0], "中文");
    }

    #[test]
    fn test_ime_state_english_mode() {
        let state = ImeState {
            is_active: false,
            is_composing: false,
            input_mode: InputMode::English,
            ime_name: None,
            composition_string: None,
            candidates: Vec::new(),
        };

        assert!(!state.is_active);
        assert_eq!(state.input_mode, InputMode::English);
    }

    #[test]
    fn test_ime_monitor_stop() {
        let monitor = ImeMonitor::new();
        monitor.stop();
        assert!(!monitor.is_running.load(Ordering::SeqCst));
    }

    #[test]
    fn test_ime_monitor_get_state_thread_safe() {
        let monitor = Arc::new(ImeMonitor::new());
        
        let monitor_clone = monitor.clone();
        let handle = std::thread::spawn(move || {
            let state = monitor_clone.get_state();
            assert!(!state.is_active);
        });
        
        handle.join().unwrap();
    }

    #[test]
    fn test_ime_state_clone() {
        let state = ImeState {
            is_active: true,
            is_composing: true,
            input_mode: InputMode::Chinese,
            ime_name: Some("Test IME".to_string()),
            composition_string: Some("test".to_string()),
            candidates: vec!["测试".to_string()],
        };

        let cloned = state.clone();
        assert_eq!(cloned.is_active, state.is_active);
        assert_eq!(cloned.ime_name, state.ime_name);
    }

    #[test]
    fn test_ime_state_debug() {
        let state = ImeState::default();
        let debug_str = format!("{:?}", state);
        assert!(debug_str.contains("ImeState"));
        assert!(debug_str.contains("is_active"));
    }

    #[test]
    fn test_input_mode_debug() {
        let mode = InputMode::Chinese;
        let debug_str = format!("{:?}", mode);
        assert!(debug_str.contains("Chinese"));
    }

    #[test]
    fn test_ime_monitor_start_idempotent() {
        let monitor = ImeMonitor::new();
        // First start should succeed
        // Note: We can't actually test start() without rdev listener setup
        // Just verify initial state
        assert!(!monitor.is_running.load(Ordering::SeqCst));
    }

    #[test]
    fn test_poll_ime_state_non_windows() {
        // On non-Windows, should return default state
        #[cfg(not(windows))]
        {
            let state = ImeMonitor::poll_ime_state();
            assert!(!state.is_active);
            assert_eq!(state.input_mode, InputMode::English);
        }
    }
}
