//! Global mouse hook for detecting text selection
//!
//! Monitors mouse events to detect when the user finishes selecting text.

#![allow(dead_code)]

use parking_lot::RwLock;
use rdev::{Event, EventType};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Instant;
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
    /// Drag selection completed (mouse moved while button was held)
    DragEnd { x: f64, y: f64, start_x: f64, start_y: f64 },
}

/// Multi-click detection timeout in milliseconds
const MULTI_CLICK_TIMEOUT_MS: u128 = 500;

/// Global mouse hook
pub struct MouseHook {
    /// Whether the hook is running
    is_running: Arc<AtomicBool>,
    /// Whether stop has been requested
    stop_requested: Arc<AtomicBool>,
    /// Hook thread handle
    thread_handle: Arc<RwLock<Option<JoinHandle<()>>>>,
    /// Event sender
    event_tx: Arc<RwLock<Option<mpsc::UnboundedSender<MouseEvent>>>>,
    /// Last click time for double/triple click detection
    last_click_time: Arc<RwLock<Instant>>,
    /// Click count for multi-click detection
    click_count: Arc<RwLock<u8>>,
    /// Last mouse position for drag detection
    last_position: Arc<RwLock<(f64, f64)>>,
    /// Whether left button is currently pressed (for drag detection)
    left_button_down: Arc<AtomicBool>,
}

impl MouseHook {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            stop_requested: Arc::new(AtomicBool::new(false)),
            thread_handle: Arc::new(RwLock::new(None)),
            event_tx: Arc::new(RwLock::new(None)),
            last_click_time: Arc::new(RwLock::new(Instant::now())),
            click_count: Arc::new(RwLock::new(0)),
            last_position: Arc::new(RwLock::new((0.0, 0.0))),
            left_button_down: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Start the mouse hook
    pub fn start(&self) -> Result<(), String> {
        // Check if already running
        if self.is_running.load(Ordering::SeqCst) {
            log::warn!("Mouse hook already running, skipping start");
            return Ok(());
        }

        // Reset stop flag
        self.stop_requested.store(false, Ordering::SeqCst);

        let is_running = self.is_running.clone();
        let stop_requested = self.stop_requested.clone();
        let last_click_time = self.last_click_time.clone();
        let click_count = self.click_count.clone();
        let event_tx = self.event_tx.clone();
        let last_position = self.last_position.clone();
        let left_button_down = self.left_button_down.clone();

        let handle = thread::spawn(move || {
            is_running.store(true, Ordering::SeqCst);
            log::info!("Mouse hook thread started");

            let callback = move |event: Event| {
                // Check if stop was requested
                if stop_requested.load(Ordering::SeqCst) {
                    return;
                }

                match event.event_type {
                    EventType::ButtonPress(rdev::Button::Left) => {
                        left_button_down.store(true, Ordering::SeqCst);
                        let (x, y) = get_mouse_position();
                        *last_position.write() = (x, y);
                    }
                    EventType::ButtonRelease(rdev::Button::Left) => {
                        left_button_down.store(false, Ordering::SeqCst);
                        
                        let now = Instant::now();
                        let mut last_time = last_click_time.write();
                        let mut count = click_count.write();

                        // Check for multi-click (within timeout)
                        if now.duration_since(*last_time).as_millis() < MULTI_CLICK_TIMEOUT_MS {
                            *count = (*count + 1).min(3);
                        } else {
                            *count = 1;
                        }
                        *last_time = now;

                        // Get current mouse position
                        let (x, y) = get_mouse_position();
                        
                        // Check if this was a drag (moved more than 5 pixels)
                        let (last_x, last_y) = *last_position.read();
                        let distance = ((x - last_x).powi(2) + (y - last_y).powi(2)).sqrt();
                        let is_drag = distance > 5.0;

                        let mouse_event = if is_drag {
                            // Drag selection completed
                            MouseEvent::DragEnd { x, y, start_x: last_x, start_y: last_y }
                        } else {
                            match *count {
                                2 => MouseEvent::DoubleClick { x, y },
                                3 => MouseEvent::TripleClick { x, y },
                                _ => MouseEvent::LeftButtonUp { x, y },
                            }
                        };

                        // Send event if we have a receiver
                        if let Some(tx) = event_tx.read().as_ref() {
                            if let Err(e) = tx.send(mouse_event) {
                                log::debug!("Failed to send mouse event: {}", e);
                            }
                        }
                    }
                    _ => {}
                }
            };

            // Start listening (this blocks until error or process exit)
            // Note: rdev::listen is blocking and cannot be gracefully stopped
            // We use the stop_requested flag to ignore events after stop is called
            if let Err(e) = rdev::listen(callback) {
                log::error!("Mouse hook error: {:?}", e);
            }

            is_running.store(false, Ordering::SeqCst);
            log::info!("Mouse hook thread exited");
        });

        *self.thread_handle.write() = Some(handle);
        log::info!("Mouse hook started successfully");
        Ok(())
    }

    /// Stop the mouse hook
    /// Note: Due to rdev limitations, the listener thread cannot be forcefully terminated.
    /// This method sets a flag to ignore future events and marks the hook as stopped.
    pub fn stop(&self) -> Result<(), String> {
        if !self.is_running.load(Ordering::SeqCst) {
            log::debug!("Mouse hook already stopped");
            return Ok(());
        }

        // Set stop flag to ignore future events
        self.stop_requested.store(true, Ordering::SeqCst);
        self.is_running.store(false, Ordering::SeqCst);
        
        // Clear the event sender to prevent any pending events
        *self.event_tx.write() = None;
        
        // Reset click state
        *self.click_count.write() = 0;
        self.left_button_down.store(false, Ordering::SeqCst);
        
        log::info!("Mouse hook stopped (events will be ignored)");
        Ok(())
    }

    /// Reset the hook state without stopping
    pub fn reset(&self) {
        *self.click_count.write() = 0;
        *self.last_click_time.write() = Instant::now();
        self.left_button_down.store(false, Ordering::SeqCst);
        *self.last_position.write() = (0.0, 0.0);
        log::debug!("Mouse hook state reset");
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
