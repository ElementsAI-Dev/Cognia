//! Port management commands
//!
//! Provides Tauri commands for port checking and management.

use serde::{Deserialize, Serialize};

use crate::port_utils;

/// Response for port status check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortStatusResponse {
    /// The port that was checked
    pub port: u16,
    /// Whether the port is in use
    pub in_use: bool,
    /// PID of the process using the port (if found)
    pub pid: Option<u32>,
    /// Name of the process using the port (if found)
    pub process_name: Option<String>,
}

/// Check if a port is in use and get details about the occupying process
#[tauri::command]
pub fn port_check_status(port: u16) -> PortStatusResponse {
    let result = port_utils::check_port_status(port);
    PortStatusResponse {
        port: result.port,
        in_use: result.in_use,
        pid: result.pid,
        process_name: result.process_name,
    }
}

/// Check if a port is available (not in use)
#[tauri::command]
pub fn port_is_available(port: u16) -> bool {
    !port_utils::is_port_in_use(port)
}

/// Ensure a port is available by killing the occupying process if needed
/// Returns Ok(true) if port was freed, Ok(false) if port was already free
#[tauri::command]
pub fn port_ensure_available(port: u16) -> Result<bool, String> {
    port_utils::ensure_port_available(port)
}

/// Kill a process by PID
#[tauri::command]
pub fn port_kill_process(pid: u32) -> Result<(), String> {
    port_utils::kill_process(pid)
}

/// Find the process using a specific port
#[tauri::command]
pub fn port_find_process(port: u16) -> Option<(u32, String)> {
    port_utils::find_process_on_port(port)
}
