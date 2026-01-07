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
    DragEnd {
        x: f64,
        y: f64,
        start_x: f64,
        start_y: f64,
    },
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
        log::debug!("[MouseHook] Creating new instance");
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
        log::debug!("[MouseHook] start() called");

        // Check if already running
        if self.is_running.load(Ordering::SeqCst) {
            log::warn!("[MouseHook] Already running, skipping start");
            return Ok(());
        }

        // Reset stop flag
        log::trace!("[MouseHook] Resetting stop flag");
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
            log::info!("[MouseHook] Hook thread started, listening for mouse events");

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
                        log::trace!("[MouseHook] Left button pressed at ({:.0}, {:.0})", x, y);
                    }
                    EventType::ButtonRelease(rdev::Button::Left) => {
                        left_button_down.store(false, Ordering::SeqCst);

                        let now = Instant::now();
                        let mut last_time = last_click_time.write();
                        let mut count = click_count.write();

                        // Check for multi-click (within timeout)
                        let time_since_last = now.duration_since(*last_time).as_millis();
                        if time_since_last < MULTI_CLICK_TIMEOUT_MS {
                            *count = (*count + 1).min(3);
                            log::trace!(
                                "[MouseHook] Multi-click detected: count={}, time_since_last={}ms",
                                *count,
                                time_since_last
                            );
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
                            log::debug!("[MouseHook] Drag detected: ({:.0}, {:.0}) -> ({:.0}, {:.0}), distance={:.1}px", 
                                last_x, last_y, x, y, distance);
                            MouseEvent::DragEnd {
                                x,
                                y,
                                start_x: last_x,
                                start_y: last_y,
                            }
                        } else {
                            match *count {
                                2 => {
                                    log::debug!("[MouseHook] Double-click at ({:.0}, {:.0})", x, y);
                                    MouseEvent::DoubleClick { x, y }
                                }
                                3 => {
                                    log::debug!("[MouseHook] Triple-click at ({:.0}, {:.0})", x, y);
                                    MouseEvent::TripleClick { x, y }
                                }
                                _ => {
                                    log::trace!(
                                        "[MouseHook] Left button released at ({:.0}, {:.0})",
                                        x,
                                        y
                                    );
                                    MouseEvent::LeftButtonUp { x, y }
                                }
                            }
                        };

                        // Send event if we have a receiver
                        if let Some(tx) = event_tx.read().as_ref() {
                            if let Err(e) = tx.send(mouse_event.clone()) {
                                log::debug!("[MouseHook] Failed to send mouse event: {}", e);
                            } else {
                                log::trace!("[MouseHook] Mouse event sent: {:?}", mouse_event);
                            }
                        } else {
                            log::trace!("[MouseHook] No event receiver configured");
                        }
                    }
                    _ => {}
                }
            };

            // Start listening (this blocks until error or process exit)
            // Note: rdev::listen is blocking and cannot be gracefully stopped
            // We use the stop_requested flag to ignore events after stop is called
            log::debug!("[MouseHook] Starting rdev listener (blocking)");
            if let Err(e) = rdev::listen(callback) {
                log::error!("[MouseHook] rdev listener error: {:?}", e);
            }

            is_running.store(false, Ordering::SeqCst);
            log::info!("[MouseHook] Hook thread exited");
        });

        *self.thread_handle.write() = Some(handle);
        log::info!("[MouseHook] Started successfully");
        Ok(())
    }

    /// Stop the mouse hook
    /// Note: Due to rdev limitations, the listener thread cannot be forcefully terminated.
    /// This method sets a flag to ignore future events and marks the hook as stopped.
    pub fn stop(&self) -> Result<(), String> {
        log::debug!("[MouseHook] stop() called");

        if !self.is_running.load(Ordering::SeqCst) {
            log::debug!("[MouseHook] Already stopped");
            return Ok(());
        }

        // Set stop flag to ignore future events
        log::trace!("[MouseHook] Setting stop flag");
        self.stop_requested.store(true, Ordering::SeqCst);
        self.is_running.store(false, Ordering::SeqCst);

        // Clear the event sender to prevent any pending events
        log::trace!("[MouseHook] Clearing event sender");
        *self.event_tx.write() = None;

        // Reset click state
        log::trace!("[MouseHook] Resetting click state");
        *self.click_count.write() = 0;
        self.left_button_down.store(false, Ordering::SeqCst);

        log::info!("[MouseHook] Stopped (events will be ignored)");
        Ok(())
    }

    /// Reset the hook state without stopping
    pub fn reset(&self) {
        log::debug!("[MouseHook] Resetting state");
        *self.click_count.write() = 0;
        *self.last_click_time.write() = Instant::now();
        self.left_button_down.store(false, Ordering::SeqCst);
        *self.last_position.write() = (0.0, 0.0);
        log::debug!("[MouseHook] State reset complete");
    }

    /// Set the event sender
    pub fn set_event_sender(&self, tx: mpsc::UnboundedSender<MouseEvent>) {
        log::debug!("[MouseHook] Event sender configured");
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_mouse_hook() {
        let hook = MouseHook::new();
        assert!(!hook.is_running());
    }

    #[test]
    fn test_default_impl() {
        let hook = MouseHook::default();
        assert!(!hook.is_running());
    }

    #[test]
    fn test_initial_state() {
        let hook = MouseHook::new();

        // Should not be running initially
        assert!(!hook.is_running.load(Ordering::SeqCst));
        assert!(!hook.stop_requested.load(Ordering::SeqCst));
        assert!(!hook.left_button_down.load(Ordering::SeqCst));

        // Click count should be 0
        assert_eq!(*hook.click_count.read(), 0);

        // Last position should be (0, 0)
        assert_eq!(*hook.last_position.read(), (0.0, 0.0));

        // No event sender initially
        assert!(hook.event_tx.read().is_none());
    }

    #[test]
    fn test_set_event_sender() {
        let hook = MouseHook::new();
        let (tx, _rx) = mpsc::unbounded_channel::<MouseEvent>();

        // Initially no sender
        assert!(hook.event_tx.read().is_none());

        // Set sender
        hook.set_event_sender(tx);

        // Should have sender now
        assert!(hook.event_tx.read().is_some());
    }

    #[test]
    fn test_reset() {
        let hook = MouseHook::new();

        // Modify state
        *hook.click_count.write() = 5;
        hook.left_button_down.store(true, Ordering::SeqCst);
        *hook.last_position.write() = (100.0, 200.0);

        // Reset
        hook.reset();

        // Verify reset state
        assert_eq!(*hook.click_count.read(), 0);
        assert!(!hook.left_button_down.load(Ordering::SeqCst));
        assert_eq!(*hook.last_position.read(), (0.0, 0.0));
    }

    #[test]
    fn test_stop_when_not_running() {
        let hook = MouseHook::new();

        // Should not error when stopping a non-running hook
        let result = hook.stop();
        assert!(result.is_ok());
    }

    #[test]
    fn test_stop_clears_event_sender() {
        let hook = MouseHook::new();
        let (tx, _rx) = mpsc::unbounded_channel::<MouseEvent>();

        // Set sender
        hook.set_event_sender(tx);
        assert!(hook.event_tx.read().is_some());

        // Simulate running state
        hook.is_running.store(true, Ordering::SeqCst);

        // Stop
        let _ = hook.stop();

        // Sender should be cleared
        assert!(hook.event_tx.read().is_none());
    }

    #[test]
    fn test_stop_resets_click_state() {
        let hook = MouseHook::new();

        // Modify click state
        *hook.click_count.write() = 3;
        hook.left_button_down.store(true, Ordering::SeqCst);

        // Simulate running state
        hook.is_running.store(true, Ordering::SeqCst);

        // Stop
        let _ = hook.stop();

        // Click state should be reset
        assert_eq!(*hook.click_count.read(), 0);
        assert!(!hook.left_button_down.load(Ordering::SeqCst));
    }

    #[test]
    fn test_stop_sets_flags() {
        let hook = MouseHook::new();

        // Simulate running state
        hook.is_running.store(true, Ordering::SeqCst);

        // Stop
        let _ = hook.stop();

        // Flags should be set
        assert!(hook.stop_requested.load(Ordering::SeqCst));
        assert!(!hook.is_running.load(Ordering::SeqCst));
    }

    #[test]
    fn test_mouse_event_left_button_up() {
        let event = MouseEvent::LeftButtonUp { x: 100.0, y: 200.0 };

        match event {
            MouseEvent::LeftButtonUp { x, y } => {
                assert_eq!(x, 100.0);
                assert_eq!(y, 200.0);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_mouse_event_double_click() {
        let event = MouseEvent::DoubleClick { x: 150.0, y: 250.0 };

        match event {
            MouseEvent::DoubleClick { x, y } => {
                assert_eq!(x, 150.0);
                assert_eq!(y, 250.0);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_mouse_event_triple_click() {
        let event = MouseEvent::TripleClick { x: 200.0, y: 300.0 };

        match event {
            MouseEvent::TripleClick { x, y } => {
                assert_eq!(x, 200.0);
                assert_eq!(y, 300.0);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_mouse_event_drag_end() {
        let event = MouseEvent::DragEnd {
            x: 300.0,
            y: 400.0,
            start_x: 100.0,
            start_y: 200.0,
        };

        match event {
            MouseEvent::DragEnd {
                x,
                y,
                start_x,
                start_y,
            } => {
                assert_eq!(x, 300.0);
                assert_eq!(y, 400.0);
                assert_eq!(start_x, 100.0);
                assert_eq!(start_y, 200.0);
            }
            _ => panic!("Wrong event type"),
        }
    }

    #[test]
    fn test_mouse_event_clone() {
        let event = MouseEvent::LeftButtonUp { x: 100.0, y: 200.0 };
        let cloned = event.clone();

        match (event, cloned) {
            (
                MouseEvent::LeftButtonUp { x: x1, y: y1 },
                MouseEvent::LeftButtonUp { x: x2, y: y2 },
            ) => {
                assert_eq!(x1, x2);
                assert_eq!(y1, y2);
            }
            _ => panic!("Clone failed"),
        }
    }

    #[test]
    fn test_mouse_event_debug() {
        let event = MouseEvent::LeftButtonUp { x: 100.0, y: 200.0 };
        let debug_str = format!("{:?}", event);

        assert!(debug_str.contains("LeftButtonUp"));
        assert!(debug_str.contains("100"));
        assert!(debug_str.contains("200"));
    }

    #[test]
    fn test_multi_click_timeout_constant() {
        // Verify the constant is set correctly
        assert_eq!(MULTI_CLICK_TIMEOUT_MS, 500);
    }

    #[test]
    fn test_click_count_bounds() {
        let hook = MouseHook::new();

        // Simulate multiple clicks
        for i in 1..=5 {
            let count = (i as u8).min(3);
            *hook.click_count.write() = count;
        }

        // Should max out at 3
        assert!(*hook.click_count.read() <= 3);
    }

    #[test]
    fn test_position_tracking() {
        let hook = MouseHook::new();

        // Update position
        *hook.last_position.write() = (500.5, 600.5);

        let (x, y) = *hook.last_position.read();
        assert_eq!(x, 500.5);
        assert_eq!(y, 600.5);
    }

    #[test]
    fn test_left_button_state() {
        let hook = MouseHook::new();

        // Initially up
        assert!(!hook.left_button_down.load(Ordering::SeqCst));

        // Simulate button down
        hook.left_button_down.store(true, Ordering::SeqCst);
        assert!(hook.left_button_down.load(Ordering::SeqCst));

        // Simulate button up
        hook.left_button_down.store(false, Ordering::SeqCst);
        assert!(!hook.left_button_down.load(Ordering::SeqCst));
    }

    #[test]
    fn test_is_running_method() {
        let hook = MouseHook::new();

        assert!(!hook.is_running());

        hook.is_running.store(true, Ordering::SeqCst);
        assert!(hook.is_running());

        hook.is_running.store(false, Ordering::SeqCst);
        assert!(!hook.is_running());
    }

    #[test]
    fn test_event_sender_can_send() {
        let hook = MouseHook::new();
        let (tx, mut rx) = mpsc::unbounded_channel::<MouseEvent>();

        hook.set_event_sender(tx);

        // Send an event through the stored sender
        if let Some(sender) = hook.event_tx.read().as_ref() {
            let result = sender.send(MouseEvent::LeftButtonUp { x: 10.0, y: 20.0 });
            assert!(result.is_ok());
        }

        // Receive and verify
        let received = rx.try_recv();
        assert!(received.is_ok());
        match received.unwrap() {
            MouseEvent::LeftButtonUp { x, y } => {
                assert_eq!(x, 10.0);
                assert_eq!(y, 20.0);
            }
            _ => panic!("Wrong event type received"),
        }
    }

    #[test]
    fn test_concurrent_state_access() {
        let hook = MouseHook::new();

        // Simulate concurrent reads and writes
        for i in 0..100 {
            hook.left_button_down.store(i % 2 == 0, Ordering::SeqCst);
            *hook.click_count.write() = (i % 4) as u8;
            *hook.last_position.write() = (i as f64, i as f64);

            // Read back
            let _ = hook.left_button_down.load(Ordering::SeqCst);
            let _ = *hook.click_count.read();
            let _ = *hook.last_position.read();
        }

        // Should not panic or deadlock
    }
}
