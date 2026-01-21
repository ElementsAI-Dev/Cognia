//! FFmpeg Utility Module
//!
//! Provides FFmpeg detection, version checking, and installation guidance.

use log::debug;
use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};

/// Minimum required FFmpeg version
pub const MIN_FFMPEG_VERSION: &str = "4.0.0";

/// FFmpeg installation information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FFmpegInfo {
    /// Whether FFmpeg is installed and available
    pub available: bool,
    /// FFmpeg version string (e.g., "5.1.2")
    pub version: Option<String>,
    /// Full version output from ffmpeg -version
    pub version_full: Option<String>,
    /// FFmpeg executable path
    pub path: Option<String>,
    /// Whether version meets minimum requirements
    pub version_ok: bool,
    /// Available encoders
    pub encoders: Vec<String>,
    /// Available decoders
    pub decoders: Vec<String>,
}

impl Default for FFmpegInfo {
    fn default() -> Self {
        Self {
            available: false,
            version: None,
            version_full: None,
            path: None,
            version_ok: false,
            encoders: Vec::new(),
            decoders: Vec::new(),
        }
    }
}

/// FFmpeg installation guide for different platforms
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FFmpegInstallGuide {
    /// Platform name
    pub platform: String,
    /// Download URL
    pub download_url: String,
    /// Installation instructions
    pub instructions: Vec<String>,
    /// Quick install command (if available)
    pub quick_install: Option<String>,
}

/// Check if FFmpeg is available
#[allow(dead_code)]
pub fn check_ffmpeg() -> bool {
    debug!("[FFmpeg] Checking availability");
    Command::new("ffmpeg")
        .arg("-version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Get detailed FFmpeg information
pub fn get_ffmpeg_info() -> FFmpegInfo {
    debug!("[FFmpeg] Getting detailed info");
    let mut info = FFmpegInfo::default();

    // Check version
    match Command::new("ffmpeg")
        .arg("-version")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
    {
        Ok(output) => {
            if output.status.success() {
                info.available = true;
                let version_str = String::from_utf8_lossy(&output.stdout);
                info.version_full = Some(version_str.to_string());

                // Parse version number
                if let Some(version) = parse_ffmpeg_version(&version_str) {
                    info.version = Some(version.clone());
                    info.version_ok = compare_versions(&version, MIN_FFMPEG_VERSION);
                    debug!("[FFmpeg] Version: {}, OK: {}", version, info.version_ok);
                }
            }
        }
        Err(e) => {
            debug!("[FFmpeg] Not found: {}", e);
        }
    }

    // Try to get path
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("where").arg("ffmpeg").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = path.lines().next() {
                    info.path = Some(first_line.trim().to_string());
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = Command::new("which").arg("ffmpeg").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout);
                info.path = Some(path.trim().to_string());
            }
        }
    }

    // Get available encoders
    if info.available {
        info.encoders = get_available_encoders();
        info.decoders = get_available_decoders();
    }

    info
}

/// Parse FFmpeg version from version output
fn parse_ffmpeg_version(output: &str) -> Option<String> {
    // FFmpeg version output format: "ffmpeg version X.Y.Z ..."
    for line in output.lines() {
        if line.starts_with("ffmpeg version") {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 3 {
                let version = parts[2];
                // Handle versions like "5.1.2-static" or "n5.1.2"
                let clean_version = version
                    .trim_start_matches('n')
                    .split('-')
                    .next()
                    .unwrap_or(version);
                return Some(clean_version.to_string());
            }
        }
    }
    None
}

/// Compare two version strings (returns true if actual >= required)
fn compare_versions(actual: &str, required: &str) -> bool {
    let actual_parts: Vec<u32> = actual
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();
    let required_parts: Vec<u32> = required
        .split('.')
        .filter_map(|s| s.parse().ok())
        .collect();

    for i in 0..required_parts.len().max(actual_parts.len()) {
        let a = actual_parts.get(i).copied().unwrap_or(0);
        let r = required_parts.get(i).copied().unwrap_or(0);
        if a > r {
            return true;
        }
        if a < r {
            return false;
        }
    }
    true
}

/// Get list of available video encoders
fn get_available_encoders() -> Vec<String> {
    let mut encoders = Vec::new();

    if let Ok(output) = Command::new("ffmpeg")
        .args(["-encoders", "-hide_banner"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let line = line.trim();
                // Look for video encoders (V..... prefix)
                if line.starts_with("V") && line.len() > 7 {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let encoder = parts[1];
                        // Filter to common encoders
                        if ["libx264", "libx265", "libvpx", "libvpx-vp9", "h264_nvenc", "hevc_nvenc", "h264_qsv", "hevc_qsv"]
                            .contains(&encoder)
                        {
                            encoders.push(encoder.to_string());
                        }
                    }
                }
            }
        }
    }

    encoders
}

/// Get list of available video decoders
fn get_available_decoders() -> Vec<String> {
    let mut decoders = Vec::new();

    if let Ok(output) = Command::new("ffmpeg")
        .args(["-decoders", "-hide_banner"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let line = line.trim();
                if line.starts_with("V") && line.len() > 7 {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let decoder = parts[1];
                        if ["h264", "hevc", "vp9", "av1"].contains(&decoder) {
                            decoders.push(decoder.to_string());
                        }
                    }
                }
            }
        }
    }

    decoders
}

/// Get installation guide for the current platform
pub fn get_install_guide() -> FFmpegInstallGuide {
    #[cfg(target_os = "windows")]
    {
        FFmpegInstallGuide {
            platform: "Windows".to_string(),
            download_url: "https://www.gyan.dev/ffmpeg/builds/".to_string(),
            instructions: vec![
                "1. Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/".to_string(),
                "2. Extract the archive to a folder (e.g., C:\\ffmpeg)".to_string(),
                "3. Add C:\\ffmpeg\\bin to your system PATH:".to_string(),
                "   - Open System Properties > Advanced > Environment Variables".to_string(),
                "   - Edit 'Path' under System variables".to_string(),
                "   - Add the path to FFmpeg's bin folder".to_string(),
                "4. Restart the application".to_string(),
            ],
            quick_install: Some("winget install FFmpeg".to_string()),
        }
    }

    #[cfg(target_os = "macos")]
    {
        FFmpegInstallGuide {
            platform: "macOS".to_string(),
            download_url: "https://ffmpeg.org/download.html".to_string(),
            instructions: vec![
                "1. Install Homebrew if not already installed:".to_string(),
                "   /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"".to_string(),
                "2. Install FFmpeg: brew install ffmpeg".to_string(),
                "3. Restart the application".to_string(),
            ],
            quick_install: Some("brew install ffmpeg".to_string()),
        }
    }

    #[cfg(target_os = "linux")]
    {
        FFmpegInstallGuide {
            platform: "Linux".to_string(),
            download_url: "https://ffmpeg.org/download.html".to_string(),
            instructions: vec![
                "Ubuntu/Debian: sudo apt install ffmpeg".to_string(),
                "Fedora: sudo dnf install ffmpeg".to_string(),
                "Arch: sudo pacman -S ffmpeg".to_string(),
                "After installation, restart the application".to_string(),
            ],
            quick_install: Some("sudo apt install ffmpeg".to_string()),
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        FFmpegInstallGuide {
            platform: "Unknown".to_string(),
            download_url: "https://ffmpeg.org/download.html".to_string(),
            instructions: vec![
                "Please visit https://ffmpeg.org/download.html for installation instructions".to_string(),
            ],
            quick_install: None,
        }
    }
}

/// Check if hardware acceleration is available
pub fn check_hardware_acceleration() -> HardwareAcceleration {
    let mut hw = HardwareAcceleration::default();
    let info = get_ffmpeg_info();

    for encoder in &info.encoders {
        if encoder.contains("nvenc") {
            hw.nvidia = true;
        }
        if encoder.contains("qsv") {
            hw.intel_qsv = true;
        }
        if encoder.contains("amf") {
            hw.amd_amf = true;
        }
    }

    // Check for VAAPI on Linux
    #[cfg(target_os = "linux")]
    if let Ok(output) = Command::new("ffmpeg")
        .args(["-hwaccels"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if stdout.contains("vaapi") {
            hw.vaapi = true;
        }
    }

    hw
}

/// Hardware acceleration availability
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HardwareAcceleration {
    /// NVIDIA NVENC available
    pub nvidia: bool,
    /// Intel Quick Sync Video available
    pub intel_qsv: bool,
    /// AMD AMF available
    pub amd_amf: bool,
    /// VAAPI available (Linux)
    pub vaapi: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_version() {
        assert_eq!(
            parse_ffmpeg_version("ffmpeg version 5.1.2 Copyright"),
            Some("5.1.2".to_string())
        );
        assert_eq!(
            parse_ffmpeg_version("ffmpeg version n5.1.2-static Copyright"),
            Some("5.1.2".to_string())
        );
    }

    #[test]
    fn test_compare_versions() {
        assert!(compare_versions("5.1.2", "4.0.0"));
        assert!(compare_versions("4.0.0", "4.0.0"));
        assert!(!compare_versions("3.9.9", "4.0.0"));
        assert!(compare_versions("5.0", "4.0.0"));
    }

    #[test]
    fn test_install_guide() {
        let guide = get_install_guide();
        assert!(!guide.platform.is_empty());
        assert!(!guide.download_url.is_empty());
        assert!(!guide.instructions.is_empty());
    }
}
