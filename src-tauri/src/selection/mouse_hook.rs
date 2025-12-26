//! Global mouse hook for detecting text selection
//!
//! Monitors mouse events to detect when the user finishes selecting text.

use parking_lot::RwLock;
use rdev::{listen, Event, EventType};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use tokio::sync::mpsc;

/// Mouse event types we care about
#[derive(Debug, Clone)]
pub enum MouseEvent {
    /// Left button released (potential end of selection)
    LeftButtonUp { x: f64, y: f64 },
    /// Double click (word selection)
    DoubleClick { x: f64, y: f64 },
    /// Triple click (line/paragraph selection)
    TripleClick { x: f64, y: f64 },
}

/// Global mouse hook
pub struct MouseHook {
    /// Whether the hook is running
    is_running: Arc<AtomicBool>,
    /// Hook thread handle
    thread_handle: Arc<RwLock<Option<JoinHandle<()>>>>,
    /// Event sender
    event_tx: Arc<RwLock<Option<mpsc::UnboundedSender<MouseEvent>>>>,
    /// Last click time for double/triple click detection
    last_click_time: Arc<RwLock<std::time::Instant>>,
    /// Click count for multi-click detection
    click_count: Arc<RwLock<u8>>,
}

impl MouseHook {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            thread_handle: Arc::new(RwLock::new(None)),
            event_tx: Arc::new(RwLock::new(None)),
            last_click_time: Arc::new(RwLock::new(std::time::Instant::now())),
            click_count: Arc::new(RwLock::new(0)),
        }
    }

    /// Start the mouse hook
    pub fn start(&self) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let is_running = self.is_running.clone();
        let last_click_time = self.last_click_time.clone();
        let click_count = self.click_count.clone();
        let event_tx = self.event_tx.clone();

        let handle = thread::spawn(move || {
            is_running.store(true, Ordering::SeqCst);

            let callback = move |event: Event| {
                if !is_running.load(Ordering::SeqCst) {
                    return;
                }

                match event.event_type {
                    EventType::ButtonRelease(rdev::Button::Left) => {
                        let now = std::time::Instant::now();
                        let mut last_time = last_click_time.write();
                        let mut count = click_count.write();

                        // Check for multi-click (within 500ms)
                        if now.duration_since(*last_time).as_millis() < 500 {
                            *count = (*count + 1).min(3);
                        } else {
                            *count = 1;
                        }
                        *last_time = now;

                        // Get mouse position
                        let (x, y) = get_mouse_position();

                        let mouse_event = match *count {
                            2 => MouseEvent::DoubleClick { x, y },
                            3 => MouseEvent::TripleClick { x, y },
                            _ => MouseEvent::LeftButtonUp { x, y },
                        };

                        // Send event if we have a receiver
                        if let Some(tx) = event_tx.read().as_ref() {
                            let _ = tx.send(mouse_event);
                        }
                    }
                    _ => {}
                }
            };

            // Start listening (this blocks)
            if let Err(e) = listen(callback) {
                log::error!("Mouse hook error: {:?}", e);
            }

            is_running.store(false, Ordering::SeqCst);
        });

        *self.thread_handle.write() = Some(handle);
        log::info!("Mouse hook started");
        Ok(())
    }

    /// Stop the mouse hook
    pub fn stop(&self) -> Result<(), String> {
        self.is_running.store(false, Ordering::SeqCst);
        log::info!("Mouse hook stopped");
        Ok(())
    }

    /// Set the event sender
    pub fn set_event_sender(&self, tx: mpsc::UnboundedSender<MouseEvent>) {
        *self.event_tx.write() = Some(tx);
    }

    /// Check if the hook is running
    pub fn is_running(&self) -> bool {
        self.is_running.load(Ordering::SeqCst)
    }
}

impl Default for MouseHook {
    fn default() -> Self {
        Self::new()
    }
}

/// Get current mouse position
fn get_mouse_position() -> (f64, f64) {
    match mouse_position::mouse_position::Mouse::get_mouse_position() {
        mouse_position::mouse_position::Mouse::Position { x, y } => (x as f64, y as f64),
        mouse_position::mouse_position::Mouse::Error => (0.0, 0.0),
    }
}
