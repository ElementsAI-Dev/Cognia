//! Keyboard monitoring for input completion
//!
//! Captures keyboard events for real-time input tracking.
//! Extends the existing rdev-based mouse hook pattern.

use parking_lot::RwLock;
use rdev::{Event, EventType, Key};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use tokio::sync::mpsc;

/// Type of keyboard event
#[derive(Debug, Clone, PartialEq)]
pub enum KeyEventType {
    /// Key was pressed
    KeyPress,
    /// Key was released
    KeyRelease,
}

/// A keyboard event
#[derive(Debug, Clone)]
pub struct KeyEvent {
    /// Type of event
    pub event_type: KeyEventType,
    /// Key name (e.g., "A", "Tab", "Shift")
    pub key: String,
    /// Character produced (if printable)
    pub char: Option<char>,
    /// Whether Ctrl/Cmd is held
    pub ctrl: bool,
    /// Whether Shift is held
    pub shift: bool,
    /// Whether Alt is held
    pub alt: bool,
    /// Timestamp in milliseconds
    pub timestamp: i64,
}

/// Keyboard monitor for tracking key events
pub struct KeyboardMonitor {
    /// Whether the monitor is running
    is_running: Arc<AtomicBool>,
    /// Stop request flag
    stop_requested: Arc<AtomicBool>,
    /// Thread handle
    thread_handle: Arc<RwLock<Option<JoinHandle<()>>>>,
    /// Modifier key states
    ctrl_down: Arc<AtomicBool>,
    shift_down: Arc<AtomicBool>,
    alt_down: Arc<AtomicBool>,
}

impl KeyboardMonitor {
    /// Create a new keyboard monitor
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            stop_requested: Arc::new(AtomicBool::new(false)),
            thread_handle: Arc::new(RwLock::new(None)),
            ctrl_down: Arc::new(AtomicBool::new(false)),
            shift_down: Arc::new(AtomicBool::new(false)),
            alt_down: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Start the keyboard monitor
    pub fn start(&self, event_tx: mpsc::UnboundedSender<KeyEvent>) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            log::warn!("KeyboardMonitor is already running");
            return Ok(());
        }

        log::info!("Starting KeyboardMonitor");
        self.stop_requested.store(false, Ordering::SeqCst);

        let is_running = self.is_running.clone();
        let stop_requested = self.stop_requested.clone();
        let ctrl_down = self.ctrl_down.clone();
        let shift_down = self.shift_down.clone();
        let alt_down = self.alt_down.clone();

        let handle = thread::spawn(move || {
            is_running.store(true, Ordering::SeqCst);
            log::info!("KeyboardMonitor thread started");

            let callback = move |event: Event| {
                if stop_requested.load(Ordering::SeqCst) {
                    return;
                }

                match event.event_type {
                    EventType::KeyPress(key) => {
                        // Track modifier states
                        match key {
                            Key::ControlLeft | Key::ControlRight => {
                                ctrl_down.store(true, Ordering::SeqCst);
                                return;
                            }
                            Key::ShiftLeft | Key::ShiftRight => {
                                shift_down.store(true, Ordering::SeqCst);
                                return;
                            }
                            Key::Alt | Key::AltGr => {
                                alt_down.store(true, Ordering::SeqCst);
                                return;
                            }
                            _ => {}
                        }

                        let key_event = KeyEvent {
                            event_type: KeyEventType::KeyPress,
                            key: Self::key_to_string(&key),
                            char: Self::key_to_char(&key, shift_down.load(Ordering::SeqCst)),
                            ctrl: ctrl_down.load(Ordering::SeqCst),
                            shift: shift_down.load(Ordering::SeqCst),
                            alt: alt_down.load(Ordering::SeqCst),
                            timestamp: chrono::Utc::now().timestamp_millis(),
                        };

                        if let Err(e) = event_tx.send(key_event) {
                            log::trace!("Failed to send key event: {}", e);
                        }
                    }
                    EventType::KeyRelease(key) => {
                        // Track modifier releases
                        match key {
                            Key::ControlLeft | Key::ControlRight => {
                                ctrl_down.store(false, Ordering::SeqCst);
                                return;
                            }
                            Key::ShiftLeft | Key::ShiftRight => {
                                shift_down.store(false, Ordering::SeqCst);
                                return;
                            }
                            Key::Alt | Key::AltGr => {
                                alt_down.store(false, Ordering::SeqCst);
                                return;
                            }
                            _ => {}
                        }

                        let key_event = KeyEvent {
                            event_type: KeyEventType::KeyRelease,
                            key: Self::key_to_string(&key),
                            char: Self::key_to_char(&key, shift_down.load(Ordering::SeqCst)),
                            ctrl: ctrl_down.load(Ordering::SeqCst),
                            shift: shift_down.load(Ordering::SeqCst),
                            alt: alt_down.load(Ordering::SeqCst),
                            timestamp: chrono::Utc::now().timestamp_millis(),
                        };

                        if let Err(e) = event_tx.send(key_event) {
                            log::trace!("Failed to send key release event: {}", e);
                        }
                    }
                    _ => {}
                }
            };

            // Start listening (this blocks)
            if let Err(e) = rdev::listen(callback) {
                log::error!("Keyboard listener error: {:?}", e);
            }

            is_running.store(false, Ordering::SeqCst);
            log::info!("KeyboardMonitor thread stopped");
        });

        *self.thread_handle.write() = Some(handle);
        Ok(())
    }

    /// Stop the keyboard monitor
    pub fn stop(&self) {
        log::info!("Stopping KeyboardMonitor");
        self.stop_requested.store(true, Ordering::SeqCst);
        // Note: rdev::listen cannot be gracefully stopped from another thread
        // The callback will check stop_requested and ignore events
        // Mark as not running to allow restart
        self.is_running.store(false, Ordering::SeqCst);
    }

    /// Stop the keyboard monitor with timeout
    /// Returns true if stopped successfully, false if timed out
    pub fn stop_with_timeout(&self, timeout_ms: u64) -> bool {
        log::info!("Stopping KeyboardMonitor with {}ms timeout", timeout_ms);
        self.stop_requested.store(true, Ordering::SeqCst);
        
        let start = std::time::Instant::now();
        while self.is_running.load(Ordering::SeqCst) {
            if start.elapsed().as_millis() as u64 > timeout_ms {
                log::warn!("KeyboardMonitor stop timed out");
                // Force mark as stopped
                self.is_running.store(false, Ordering::SeqCst);
                return false;
            }
            std::thread::sleep(std::time::Duration::from_millis(10));
        }
        true
    }

    /// Check if stop was requested (for use in callbacks)
    #[allow(dead_code)]
    pub fn is_stop_requested(&self) -> bool {
        self.stop_requested.load(Ordering::SeqCst)
    }

    /// Reset the monitor state for restart
    #[allow(dead_code)]
    pub fn reset(&self) {
        self.stop_requested.store(false, Ordering::SeqCst);
        self.is_running.store(false, Ordering::SeqCst);
        self.ctrl_down.store(false, Ordering::SeqCst);
        self.shift_down.store(false, Ordering::SeqCst);
        self.alt_down.store(false, Ordering::SeqCst);
    }

    /// Check if monitor is running
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }

    /// Convert rdev Key to string
    fn key_to_string(key: &Key) -> String {
        match key {
            Key::Alt => "Alt".to_string(),
            Key::AltGr => "AltGr".to_string(),
            Key::Backspace => "Backspace".to_string(),
            Key::CapsLock => "CapsLock".to_string(),
            Key::ControlLeft => "ControlLeft".to_string(),
            Key::ControlRight => "ControlRight".to_string(),
            Key::Delete => "Delete".to_string(),
            Key::DownArrow => "DownArrow".to_string(),
            Key::End => "End".to_string(),
            Key::Escape => "Escape".to_string(),
            Key::F1 => "F1".to_string(),
            Key::F2 => "F2".to_string(),
            Key::F3 => "F3".to_string(),
            Key::F4 => "F4".to_string(),
            Key::F5 => "F5".to_string(),
            Key::F6 => "F6".to_string(),
            Key::F7 => "F7".to_string(),
            Key::F8 => "F8".to_string(),
            Key::F9 => "F9".to_string(),
            Key::F10 => "F10".to_string(),
            Key::F11 => "F11".to_string(),
            Key::F12 => "F12".to_string(),
            Key::Home => "Home".to_string(),
            Key::LeftArrow => "LeftArrow".to_string(),
            Key::MetaLeft => "MetaLeft".to_string(),
            Key::MetaRight => "MetaRight".to_string(),
            Key::PageDown => "PageDown".to_string(),
            Key::PageUp => "PageUp".to_string(),
            Key::Return => "Return".to_string(),
            Key::RightArrow => "RightArrow".to_string(),
            Key::ShiftLeft => "ShiftLeft".to_string(),
            Key::ShiftRight => "ShiftRight".to_string(),
            Key::Space => "Space".to_string(),
            Key::Tab => "Tab".to_string(),
            Key::UpArrow => "UpArrow".to_string(),
            Key::PrintScreen => "PrintScreen".to_string(),
            Key::ScrollLock => "ScrollLock".to_string(),
            Key::Pause => "Pause".to_string(),
            Key::NumLock => "NumLock".to_string(),
            Key::BackQuote => "BackQuote".to_string(),
            Key::Num1 => "1".to_string(),
            Key::Num2 => "2".to_string(),
            Key::Num3 => "3".to_string(),
            Key::Num4 => "4".to_string(),
            Key::Num5 => "5".to_string(),
            Key::Num6 => "6".to_string(),
            Key::Num7 => "7".to_string(),
            Key::Num8 => "8".to_string(),
            Key::Num9 => "9".to_string(),
            Key::Num0 => "0".to_string(),
            Key::Minus => "Minus".to_string(),
            Key::Equal => "Equal".to_string(),
            Key::KeyQ => "Q".to_string(),
            Key::KeyW => "W".to_string(),
            Key::KeyE => "E".to_string(),
            Key::KeyR => "R".to_string(),
            Key::KeyT => "T".to_string(),
            Key::KeyY => "Y".to_string(),
            Key::KeyU => "U".to_string(),
            Key::KeyI => "I".to_string(),
            Key::KeyO => "O".to_string(),
            Key::KeyP => "P".to_string(),
            Key::LeftBracket => "LeftBracket".to_string(),
            Key::RightBracket => "RightBracket".to_string(),
            Key::KeyA => "A".to_string(),
            Key::KeyS => "S".to_string(),
            Key::KeyD => "D".to_string(),
            Key::KeyF => "F".to_string(),
            Key::KeyG => "G".to_string(),
            Key::KeyH => "H".to_string(),
            Key::KeyJ => "J".to_string(),
            Key::KeyK => "K".to_string(),
            Key::KeyL => "L".to_string(),
            Key::SemiColon => "SemiColon".to_string(),
            Key::Quote => "Quote".to_string(),
            Key::BackSlash => "BackSlash".to_string(),
            Key::IntlBackslash => "IntlBackslash".to_string(),
            Key::KeyZ => "Z".to_string(),
            Key::KeyX => "X".to_string(),
            Key::KeyC => "C".to_string(),
            Key::KeyV => "V".to_string(),
            Key::KeyB => "B".to_string(),
            Key::KeyN => "N".to_string(),
            Key::KeyM => "M".to_string(),
            Key::Comma => "Comma".to_string(),
            Key::Dot => "Dot".to_string(),
            Key::Slash => "Slash".to_string(),
            Key::Insert => "Insert".to_string(),
            Key::KpReturn => "KpReturn".to_string(),
            Key::KpMinus => "KpMinus".to_string(),
            Key::KpPlus => "KpPlus".to_string(),
            Key::KpMultiply => "KpMultiply".to_string(),
            Key::KpDivide => "KpDivide".to_string(),
            Key::Kp0 => "Kp0".to_string(),
            Key::Kp1 => "Kp1".to_string(),
            Key::Kp2 => "Kp2".to_string(),
            Key::Kp3 => "Kp3".to_string(),
            Key::Kp4 => "Kp4".to_string(),
            Key::Kp5 => "Kp5".to_string(),
            Key::Kp6 => "Kp6".to_string(),
            Key::Kp7 => "Kp7".to_string(),
            Key::Kp8 => "Kp8".to_string(),
            Key::Kp9 => "Kp9".to_string(),
            Key::KpDelete => "KpDelete".to_string(),
            Key::Function => "Function".to_string(),
            Key::Unknown(code) => format!("Unknown({})", code),
        }
    }

    /// Convert rdev Key to character (if printable)
    fn key_to_char(key: &Key, shift: bool) -> Option<char> {
        match key {
            Key::KeyA => Some(if shift { 'A' } else { 'a' }),
            Key::KeyB => Some(if shift { 'B' } else { 'b' }),
            Key::KeyC => Some(if shift { 'C' } else { 'c' }),
            Key::KeyD => Some(if shift { 'D' } else { 'd' }),
            Key::KeyE => Some(if shift { 'E' } else { 'e' }),
            Key::KeyF => Some(if shift { 'F' } else { 'f' }),
            Key::KeyG => Some(if shift { 'G' } else { 'g' }),
            Key::KeyH => Some(if shift { 'H' } else { 'h' }),
            Key::KeyI => Some(if shift { 'I' } else { 'i' }),
            Key::KeyJ => Some(if shift { 'J' } else { 'j' }),
            Key::KeyK => Some(if shift { 'K' } else { 'k' }),
            Key::KeyL => Some(if shift { 'L' } else { 'l' }),
            Key::KeyM => Some(if shift { 'M' } else { 'm' }),
            Key::KeyN => Some(if shift { 'N' } else { 'n' }),
            Key::KeyO => Some(if shift { 'O' } else { 'o' }),
            Key::KeyP => Some(if shift { 'P' } else { 'p' }),
            Key::KeyQ => Some(if shift { 'Q' } else { 'q' }),
            Key::KeyR => Some(if shift { 'R' } else { 'r' }),
            Key::KeyS => Some(if shift { 'S' } else { 's' }),
            Key::KeyT => Some(if shift { 'T' } else { 't' }),
            Key::KeyU => Some(if shift { 'U' } else { 'u' }),
            Key::KeyV => Some(if shift { 'V' } else { 'v' }),
            Key::KeyW => Some(if shift { 'W' } else { 'w' }),
            Key::KeyX => Some(if shift { 'X' } else { 'x' }),
            Key::KeyY => Some(if shift { 'Y' } else { 'y' }),
            Key::KeyZ => Some(if shift { 'Z' } else { 'z' }),
            Key::Num0 => Some(if shift { ')' } else { '0' }),
            Key::Num1 => Some(if shift { '!' } else { '1' }),
            Key::Num2 => Some(if shift { '@' } else { '2' }),
            Key::Num3 => Some(if shift { '#' } else { '3' }),
            Key::Num4 => Some(if shift { '$' } else { '4' }),
            Key::Num5 => Some(if shift { '%' } else { '5' }),
            Key::Num6 => Some(if shift { '^' } else { '6' }),
            Key::Num7 => Some(if shift { '&' } else { '7' }),
            Key::Num8 => Some(if shift { '*' } else { '8' }),
            Key::Num9 => Some(if shift { '(' } else { '9' }),
            Key::Space => Some(' '),
            Key::Minus => Some(if shift { '_' } else { '-' }),
            Key::Equal => Some(if shift { '+' } else { '=' }),
            Key::LeftBracket => Some(if shift { '{' } else { '[' }),
            Key::RightBracket => Some(if shift { '}' } else { ']' }),
            Key::BackSlash => Some(if shift { '|' } else { '\\' }),
            Key::SemiColon => Some(if shift { ':' } else { ';' }),
            Key::Quote => Some(if shift { '"' } else { '\'' }),
            Key::Comma => Some(if shift { '<' } else { ',' }),
            Key::Dot => Some(if shift { '>' } else { '.' }),
            Key::Slash => Some(if shift { '?' } else { '/' }),
            Key::BackQuote => Some(if shift { '~' } else { '`' }),
            Key::Return => Some('\n'),
            Key::Tab => Some('\t'),
            Key::Kp0 => Some('0'),
            Key::Kp1 => Some('1'),
            Key::Kp2 => Some('2'),
            Key::Kp3 => Some('3'),
            Key::Kp4 => Some('4'),
            Key::Kp5 => Some('5'),
            Key::Kp6 => Some('6'),
            Key::Kp7 => Some('7'),
            Key::Kp8 => Some('8'),
            Key::Kp9 => Some('9'),
            Key::KpPlus => Some('+'),
            Key::KpMinus => Some('-'),
            Key::KpMultiply => Some('*'),
            Key::KpDivide => Some('/'),
            _ => None,
        }
    }
}

impl Default for KeyboardMonitor {
    fn default() -> Self {
        Self::new()
    }
}

impl Drop for KeyboardMonitor {
    fn drop(&mut self) {
        self.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keyboard_monitor_creation() {
        let monitor = KeyboardMonitor::new();
        assert!(!monitor.is_running());
    }

    #[test]
    fn test_keyboard_monitor_default() {
        let monitor = KeyboardMonitor::default();
        assert!(!monitor.is_running());
    }

    #[test]
    fn test_keyboard_monitor_stop() {
        let monitor = KeyboardMonitor::new();
        monitor.stop();
        assert!(monitor.stop_requested.load(Ordering::SeqCst));
    }

    #[test]
    fn test_key_to_string() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::KeyA), "A");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Tab), "Tab");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Space), "Space");
    }

    #[test]
    fn test_key_to_string_all_letters() {
        let letters = vec![
            (Key::KeyA, "A"), (Key::KeyB, "B"), (Key::KeyC, "C"),
            (Key::KeyD, "D"), (Key::KeyE, "E"), (Key::KeyF, "F"),
            (Key::KeyG, "G"), (Key::KeyH, "H"), (Key::KeyI, "I"),
            (Key::KeyJ, "J"), (Key::KeyK, "K"), (Key::KeyL, "L"),
            (Key::KeyM, "M"), (Key::KeyN, "N"), (Key::KeyO, "O"),
            (Key::KeyP, "P"), (Key::KeyQ, "Q"), (Key::KeyR, "R"),
            (Key::KeyS, "S"), (Key::KeyT, "T"), (Key::KeyU, "U"),
            (Key::KeyV, "V"), (Key::KeyW, "W"), (Key::KeyX, "X"),
            (Key::KeyY, "Y"), (Key::KeyZ, "Z"),
        ];
        
        for (key, expected) in letters {
            assert_eq!(KeyboardMonitor::key_to_string(&key), expected);
        }
    }

    #[test]
    fn test_key_to_string_numbers() {
        let numbers = vec![
            (Key::Num0, "0"), (Key::Num1, "1"), (Key::Num2, "2"),
            (Key::Num3, "3"), (Key::Num4, "4"), (Key::Num5, "5"),
            (Key::Num6, "6"), (Key::Num7, "7"), (Key::Num8, "8"),
            (Key::Num9, "9"),
        ];
        
        for (key, expected) in numbers {
            assert_eq!(KeyboardMonitor::key_to_string(&key), expected);
        }
    }

    #[test]
    fn test_key_to_string_function_keys() {
        let f_keys = vec![
            (Key::F1, "F1"), (Key::F2, "F2"), (Key::F3, "F3"),
            (Key::F4, "F4"), (Key::F5, "F5"), (Key::F6, "F6"),
            (Key::F7, "F7"), (Key::F8, "F8"), (Key::F9, "F9"),
            (Key::F10, "F10"), (Key::F11, "F11"), (Key::F12, "F12"),
        ];
        
        for (key, expected) in f_keys {
            assert_eq!(KeyboardMonitor::key_to_string(&key), expected);
        }
    }

    #[test]
    fn test_key_to_string_modifiers() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Alt), "Alt");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::AltGr), "AltGr");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::ControlLeft), "ControlLeft");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::ControlRight), "ControlRight");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::ShiftLeft), "ShiftLeft");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::ShiftRight), "ShiftRight");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::MetaLeft), "MetaLeft");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::MetaRight), "MetaRight");
    }

    #[test]
    fn test_key_to_string_navigation() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::UpArrow), "UpArrow");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::DownArrow), "DownArrow");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::LeftArrow), "LeftArrow");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::RightArrow), "RightArrow");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Home), "Home");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::End), "End");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::PageUp), "PageUp");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::PageDown), "PageDown");
    }

    #[test]
    fn test_key_to_string_special() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Escape), "Escape");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Return), "Return");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Backspace), "Backspace");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Delete), "Delete");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Insert), "Insert");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::CapsLock), "CapsLock");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::NumLock), "NumLock");
    }

    #[test]
    fn test_key_to_string_punctuation() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Minus), "Minus");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Equal), "Equal");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::LeftBracket), "LeftBracket");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::RightBracket), "RightBracket");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::BackSlash), "BackSlash");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::SemiColon), "SemiColon");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Quote), "Quote");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Comma), "Comma");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Dot), "Dot");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Slash), "Slash");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::BackQuote), "BackQuote");
    }

    #[test]
    fn test_key_to_string_keypad() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Kp0), "Kp0");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Kp1), "Kp1");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::KpPlus), "KpPlus");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::KpMinus), "KpMinus");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::KpMultiply), "KpMultiply");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::KpDivide), "KpDivide");
        assert_eq!(KeyboardMonitor::key_to_string(&Key::KpReturn), "KpReturn");
    }

    #[test]
    fn test_key_to_string_unknown() {
        assert_eq!(KeyboardMonitor::key_to_string(&Key::Unknown(123)), "Unknown(123)");
    }

    #[test]
    fn test_key_to_char() {
        assert_eq!(KeyboardMonitor::key_to_char(&Key::KeyA, false), Some('a'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::KeyA, true), Some('A'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Space, false), Some(' '));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Num1, true), Some('!'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Escape, false), None);
    }

    #[test]
    fn test_key_to_char_letters_lowercase() {
        let letters = vec![
            (Key::KeyA, 'a'), (Key::KeyB, 'b'), (Key::KeyC, 'c'),
            (Key::KeyD, 'd'), (Key::KeyE, 'e'), (Key::KeyF, 'f'),
            (Key::KeyG, 'g'), (Key::KeyH, 'h'), (Key::KeyI, 'i'),
            (Key::KeyJ, 'j'), (Key::KeyK, 'k'), (Key::KeyL, 'l'),
            (Key::KeyM, 'm'), (Key::KeyN, 'n'), (Key::KeyO, 'o'),
            (Key::KeyP, 'p'), (Key::KeyQ, 'q'), (Key::KeyR, 'r'),
            (Key::KeyS, 's'), (Key::KeyT, 't'), (Key::KeyU, 'u'),
            (Key::KeyV, 'v'), (Key::KeyW, 'w'), (Key::KeyX, 'x'),
            (Key::KeyY, 'y'), (Key::KeyZ, 'z'),
        ];
        
        for (key, expected) in letters {
            assert_eq!(KeyboardMonitor::key_to_char(&key, false), Some(expected));
        }
    }

    #[test]
    fn test_key_to_char_letters_uppercase() {
        let letters = vec![
            (Key::KeyA, 'A'), (Key::KeyB, 'B'), (Key::KeyC, 'C'),
            (Key::KeyD, 'D'), (Key::KeyE, 'E'), (Key::KeyF, 'F'),
        ];
        
        for (key, expected) in letters {
            assert_eq!(KeyboardMonitor::key_to_char(&key, true), Some(expected));
        }
    }

    #[test]
    fn test_key_to_char_numbers_no_shift() {
        let numbers = vec![
            (Key::Num0, '0'), (Key::Num1, '1'), (Key::Num2, '2'),
            (Key::Num3, '3'), (Key::Num4, '4'), (Key::Num5, '5'),
            (Key::Num6, '6'), (Key::Num7, '7'), (Key::Num8, '8'),
            (Key::Num9, '9'),
        ];
        
        for (key, expected) in numbers {
            assert_eq!(KeyboardMonitor::key_to_char(&key, false), Some(expected));
        }
    }

    #[test]
    fn test_key_to_char_numbers_with_shift() {
        let symbols = vec![
            (Key::Num0, ')'), (Key::Num1, '!'), (Key::Num2, '@'),
            (Key::Num3, '#'), (Key::Num4, '$'), (Key::Num5, '%'),
            (Key::Num6, '^'), (Key::Num7, '&'), (Key::Num8, '*'),
            (Key::Num9, '('),
        ];
        
        for (key, expected) in symbols {
            assert_eq!(KeyboardMonitor::key_to_char(&key, true), Some(expected));
        }
    }

    #[test]
    fn test_key_to_char_punctuation_no_shift() {
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Minus, false), Some('-'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Equal, false), Some('='));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::LeftBracket, false), Some('['));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::RightBracket, false), Some(']'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::BackSlash, false), Some('\\'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::SemiColon, false), Some(';'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Quote, false), Some('\''));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Comma, false), Some(','));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Dot, false), Some('.'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Slash, false), Some('/'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::BackQuote, false), Some('`'));
    }

    #[test]
    fn test_key_to_char_punctuation_with_shift() {
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Minus, true), Some('_'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Equal, true), Some('+'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::LeftBracket, true), Some('{'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::RightBracket, true), Some('}'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::BackSlash, true), Some('|'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::SemiColon, true), Some(':'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Quote, true), Some('"'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Comma, true), Some('<'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Dot, true), Some('>'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Slash, true), Some('?'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::BackQuote, true), Some('~'));
    }

    #[test]
    fn test_key_to_char_whitespace() {
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Space, false), Some(' '));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Return, false), Some('\n'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Tab, false), Some('\t'));
    }

    #[test]
    fn test_key_to_char_keypad() {
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Kp0, false), Some('0'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Kp1, false), Some('1'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::KpPlus, false), Some('+'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::KpMinus, false), Some('-'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::KpMultiply, false), Some('*'));
        assert_eq!(KeyboardMonitor::key_to_char(&Key::KpDivide, false), Some('/'));
    }

    #[test]
    fn test_key_to_char_non_printable() {
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Escape, false), None);
        assert_eq!(KeyboardMonitor::key_to_char(&Key::F1, false), None);
        assert_eq!(KeyboardMonitor::key_to_char(&Key::ControlLeft, false), None);
        assert_eq!(KeyboardMonitor::key_to_char(&Key::Alt, false), None);
        assert_eq!(KeyboardMonitor::key_to_char(&Key::ShiftLeft, false), None);
        assert_eq!(KeyboardMonitor::key_to_char(&Key::CapsLock, false), None);
        assert_eq!(KeyboardMonitor::key_to_char(&Key::UpArrow, false), None);
    }

    #[test]
    fn test_key_event_type_equality() {
        assert_eq!(KeyEventType::KeyPress, KeyEventType::KeyPress);
        assert_eq!(KeyEventType::KeyRelease, KeyEventType::KeyRelease);
        assert_ne!(KeyEventType::KeyPress, KeyEventType::KeyRelease);
    }

    #[test]
    fn test_key_event_creation() {
        let event = KeyEvent {
            event_type: KeyEventType::KeyPress,
            key: "A".to_string(),
            char: Some('a'),
            ctrl: false,
            shift: false,
            alt: false,
            timestamp: 12345,
        };
        
        assert_eq!(event.event_type, KeyEventType::KeyPress);
        assert_eq!(event.key, "A");
        assert_eq!(event.char, Some('a'));
        assert!(!event.ctrl);
        assert!(!event.shift);
        assert!(!event.alt);
    }

    #[test]
    fn test_key_event_with_modifiers() {
        let event = KeyEvent {
            event_type: KeyEventType::KeyPress,
            key: "C".to_string(),
            char: Some('c'),
            ctrl: true,
            shift: false,
            alt: true,
            timestamp: 12345,
        };
        
        assert!(event.ctrl);
        assert!(event.alt);
        assert!(!event.shift);
    }

    #[test]
    fn test_key_event_clone() {
        let event = KeyEvent {
            event_type: KeyEventType::KeyPress,
            key: "Tab".to_string(),
            char: Some('\t'),
            ctrl: false,
            shift: false,
            alt: false,
            timestamp: 99999,
        };
        
        let cloned = event.clone();
        assert_eq!(cloned.event_type, event.event_type);
        assert_eq!(cloned.key, event.key);
        assert_eq!(cloned.timestamp, event.timestamp);
    }

    #[test]
    fn test_key_event_debug() {
        let event = KeyEvent {
            event_type: KeyEventType::KeyPress,
            key: "A".to_string(),
            char: Some('a'),
            ctrl: false,
            shift: false,
            alt: false,
            timestamp: 0,
        };
        
        let debug_str = format!("{:?}", event);
        assert!(debug_str.contains("KeyEvent"));
        assert!(debug_str.contains("KeyPress"));
    }

    #[test]
    fn test_key_event_type_debug() {
        let press = KeyEventType::KeyPress;
        let release = KeyEventType::KeyRelease;
        
        assert!(format!("{:?}", press).contains("KeyPress"));
        assert!(format!("{:?}", release).contains("KeyRelease"));
    }
}
