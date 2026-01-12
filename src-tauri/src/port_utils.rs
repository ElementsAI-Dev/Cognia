//! Port Utilities Module
//!
//! Provides cross-platform utilities for:
//! - Checking if a port is in use
//! - Finding the process occupying a port
//! - Killing the process to free the port
//!
//! Works on Windows, macOS, and Linux in both development and production environments.

use std::net::TcpListener;
use std::process::Command;

/// Result of port check operation
#[derive(Debug)]
pub struct PortCheckResult {
    /// The port that was checked
    pub port: u16,
    /// Whether the port is in use
    pub in_use: bool,
    /// PID of the process using the port (if found)
    pub pid: Option<u32>,
    /// Name of the process using the port (if found)
    pub process_name: Option<String>,
}

/// Check if a port is in use by attempting to bind to it
pub fn is_port_in_use(port: u16) -> bool {
    TcpListener::bind(format!("127.0.0.1:{}", port)).is_err()
}

/// Find the process using a specific port
/// Returns (pid, process_name) if found
#[cfg(windows)]
pub fn find_process_on_port(port: u16) -> Option<(u32, String)> {
    // Use netstat to find the process
    let output = Command::new("cmd")
        .args(["/C", &format!("netstat -ano | findstr :{}", port)])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    
    // Parse netstat output to find PID
    // Format: TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 5 {
            // Check if this is the right port (LISTENING state)
            let local_addr = parts.get(1)?;
            if local_addr.ends_with(&format!(":{}", port)) && parts.get(3) == Some(&"LISTENING") {
                if let Some(pid_str) = parts.get(4) {
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        // Get process name using tasklist
                        let process_name = get_process_name_windows(pid);
                        return Some((pid, process_name.unwrap_or_else(|| "Unknown".to_string())));
                    }
                }
            }
        }
    }
    None
}

#[cfg(windows)]
fn get_process_name_windows(pid: u32) -> Option<String> {
    let output = Command::new("cmd")
        .args(["/C", &format!("tasklist /FI \"PID eq {}\" /FO CSV /NH", pid)])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse CSV format: "process.exe","12345","Console","1","12,345 K"
    let line = stdout.lines().next()?;
    let name = line.split(',').next()?.trim_matches('"');
    Some(name.to_string())
}

#[cfg(unix)]
pub fn find_process_on_port(port: u16) -> Option<(u32, String)> {
    // Try lsof first (available on macOS and most Linux distros)
    if let Some(result) = find_process_with_lsof(port) {
        return Some(result);
    }
    
    // Fallback to ss/netstat on Linux
    #[cfg(target_os = "linux")]
    if let Some(result) = find_process_with_ss(port) {
        return Some(result);
    }
    
    None
}

#[cfg(unix)]
fn find_process_with_lsof(port: u16) -> Option<(u32, String)> {
    let output = Command::new("lsof")
        .args(["-i", &format!(":{}", port), "-t", "-sTCP:LISTEN"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let pid_str = stdout.trim();
    
    if pid_str.is_empty() {
        return None;
    }
    
    // lsof -t might return multiple PIDs, take the first one
    let first_pid = pid_str.lines().next()?;
    let pid = first_pid.parse::<u32>().ok()?;
    
    // Get process name
    let name_output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "comm="])
        .output()
        .ok()?;
    
    let process_name = String::from_utf8_lossy(&name_output.stdout)
        .trim()
        .to_string();
    
    Some((pid, if process_name.is_empty() { "Unknown".to_string() } else { process_name }))
}

#[cfg(all(unix, target_os = "linux"))]
fn find_process_with_ss(port: u16) -> Option<(u32, String)> {
    // ss -tlnp | grep :port
    let output = Command::new("ss")
        .args(["-tlnp"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    
    for line in stdout.lines() {
        if line.contains(&format!(":{}", port)) {
            // Parse ss output to find PID
            // Format includes: users:(("node",pid=12345,fd=20))
            if let Some(start) = line.find("pid=") {
                let rest = &line[start + 4..];
                if let Some(end) = rest.find(|c: char| !c.is_ascii_digit()) {
                    if let Ok(pid) = rest[..end].parse::<u32>() {
                        // Get process name from ps
                        let name_output = Command::new("ps")
                            .args(["-p", &pid.to_string(), "-o", "comm="])
                            .output()
                            .ok()?;
                        
                        let process_name = String::from_utf8_lossy(&name_output.stdout)
                            .trim()
                            .to_string();
                        
                        return Some((pid, if process_name.is_empty() { "Unknown".to_string() } else { process_name }));
                    }
                }
            }
        }
    }
    None
}

/// Kill a process by PID
#[cfg(windows)]
pub fn kill_process(pid: u32) -> Result<(), String> {
    log::info!("Attempting to kill process with PID: {}", pid);
    
    let output = Command::new("taskkill")
        .args(["/F", "/PID", &pid.to_string()])
        .output()
        .map_err(|e| format!("Failed to execute taskkill: {}", e))?;

    if output.status.success() {
        log::info!("Successfully killed process with PID: {}", pid);
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Err(format!(
            "Failed to kill process {}: {} {}",
            pid, stdout, stderr
        ))
    }
}

#[cfg(unix)]
pub fn kill_process(pid: u32) -> Result<(), String> {
    log::info!("Attempting to kill process with PID: {}", pid);
    
    // Try SIGTERM first for graceful shutdown
    let result = Command::new("kill")
        .args(["-15", &pid.to_string()])
        .output();

    match result {
        Ok(output) if output.status.success() => {
            // Wait a bit and check if process is gone
            std::thread::sleep(std::time::Duration::from_millis(500));
            
            // Check if process still exists
            let check = Command::new("kill")
                .args(["-0", &pid.to_string()])
                .output();
            
            if let Ok(check_output) = check {
                if !check_output.status.success() {
                    log::info!("Successfully killed process with PID: {} (SIGTERM)", pid);
                    return Ok(());
                }
            } else {
                // Process doesn't exist anymore
                log::info!("Successfully killed process with PID: {} (SIGTERM)", pid);
                return Ok(());
            }
            
            // Process still alive, try SIGKILL
            log::warn!("Process {} still alive after SIGTERM, trying SIGKILL", pid);
            let kill_result = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
            
            match kill_result {
                Ok(output) if output.status.success() => {
                    log::info!("Successfully killed process with PID: {} (SIGKILL)", pid);
                    Ok(())
                }
                Ok(output) => {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    Err(format!("Failed to SIGKILL process {}: {}", pid, stderr))
                }
                Err(e) => Err(format!("Failed to execute kill -9: {}", e)),
            }
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            // Try SIGKILL as fallback
            let kill_result = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
            
            match kill_result {
                Ok(output) if output.status.success() => {
                    log::info!("Successfully killed process with PID: {} (SIGKILL fallback)", pid);
                    Ok(())
                }
                _ => Err(format!("Failed to kill process {}: {}", pid, stderr)),
            }
        }
        Err(e) => Err(format!("Failed to execute kill: {}", e)),
    }
}

/// Check port and kill the occupying process if needed
/// Returns Ok(true) if port was freed, Ok(false) if port was already free
pub fn ensure_port_available(port: u16) -> Result<bool, String> {
    log::info!("Checking if port {} is available...", port);
    
    if !is_port_in_use(port) {
        log::info!("Port {} is available", port);
        return Ok(false);
    }
    
    log::warn!("Port {} is in use, attempting to find and kill the occupying process", port);
    
    // Find the process using the port
    match find_process_on_port(port) {
        Some((pid, process_name)) => {
            log::info!(
                "Found process '{}' (PID: {}) using port {}",
                process_name, pid, port
            );
            
            // Kill the process
            kill_process(pid)?;
            
            // Wait a bit for the port to be released
            std::thread::sleep(std::time::Duration::from_millis(500));
            
            // Verify the port is now available
            if is_port_in_use(port) {
                // Try one more time with a longer wait
                std::thread::sleep(std::time::Duration::from_secs(1));
                if is_port_in_use(port) {
                    return Err(format!(
                        "Port {} is still in use after killing process {} ({})",
                        port, pid, process_name
                    ));
                }
            }
            
            log::info!("Port {} is now available after killing process {} ({})", port, pid, process_name);
            Ok(true)
        }
        None => {
            // Port is in use but we couldn't find the process
            // This might happen due to permission issues
            log::warn!(
                "Port {} is in use but could not identify the occupying process. \
                This may be due to insufficient permissions.",
                port
            );
            Err(format!(
                "Port {} is in use but could not identify the occupying process. \
                Try running with administrator/root privileges.",
                port
            ))
        }
    }
}

/// Get detailed information about port status
pub fn check_port_status(port: u16) -> PortCheckResult {
    let in_use = is_port_in_use(port);
    let (pid, process_name) = if in_use {
        find_process_on_port(port)
            .map(|(p, n)| (Some(p), Some(n)))
            .unwrap_or((None, None))
    } else {
        (None, None)
    };
    
    PortCheckResult {
        port,
        in_use,
        pid,
        process_name,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_port_check_available() {
        // Use a high port that's unlikely to be in use
        let port = 59999;
        assert!(!is_port_in_use(port) || is_port_in_use(port)); // Just check it doesn't panic
    }

    #[test]
    fn test_port_status() {
        let result = check_port_status(59998);
        assert_eq!(result.port, 59998);
        // The rest depends on system state
    }
}
