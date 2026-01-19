//! Proxy Management Tauri Commands
//!
//! Provides commands for:
//! - Auto-detecting proxy software (Clash, V2Ray, Shadowsocks, etc.)
//! - Testing proxy connectivity
//! - Getting system proxy settings
//! - Setting application-wide proxy

use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::process::Command;
use std::time::{Duration, Instant};

/// Known proxy software types
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProxySoftware {
    Clash,
    ClashVerge,
    ClashForWindows,
    V2ray,
    V2rayn,
    Shadowsocks,
    Shadowsocksr,
    Trojan,
    SingBox,
    Surge,
    Quantumult,
    Proxifier,
    Unknown,
}

impl std::fmt::Display for ProxySoftware {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProxySoftware::Clash => write!(f, "clash"),
            ProxySoftware::ClashVerge => write!(f, "clash-verge"),
            ProxySoftware::ClashForWindows => write!(f, "clash-for-windows"),
            ProxySoftware::V2ray => write!(f, "v2ray"),
            ProxySoftware::V2rayn => write!(f, "v2rayn"),
            ProxySoftware::Shadowsocks => write!(f, "shadowsocks"),
            ProxySoftware::Shadowsocksr => write!(f, "shadowsocksr"),
            ProxySoftware::Trojan => write!(f, "trojan"),
            ProxySoftware::SingBox => write!(f, "sing-box"),
            ProxySoftware::Surge => write!(f, "surge"),
            ProxySoftware::Quantumult => write!(f, "quantumult"),
            ProxySoftware::Proxifier => write!(f, "proxifier"),
            ProxySoftware::Unknown => write!(f, "unknown"),
        }
    }
}

/// Detected proxy information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedProxy {
    pub software: ProxySoftware,
    pub name: String,
    pub icon: String,
    pub running: bool,
    #[serde(rename = "httpPort")]
    pub http_port: Option<u16>,
    #[serde(rename = "socksPort")]
    pub socks_port: Option<u16>,
    #[serde(rename = "mixedPort")]
    pub mixed_port: Option<u16>,
    #[serde(rename = "apiPort")]
    pub api_port: Option<u16>,
    #[serde(rename = "apiUrl")]
    pub api_url: Option<String>,
    pub version: Option<String>,
    #[serde(rename = "configPath")]
    pub config_path: Option<String>,
}

/// Proxy test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyTestResult {
    pub success: bool,
    pub latency: Option<u64>,
    pub ip: Option<String>,
    pub location: Option<String>,
    pub error: Option<String>,
}

/// System proxy settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemProxySettings {
    pub enabled: bool,
    pub http_proxy: Option<String>,
    pub https_proxy: Option<String>,
    pub socks_proxy: Option<String>,
    pub no_proxy: Option<String>,
}

/// Detect all running proxy software
#[tauri::command]
pub async fn proxy_detect_all() -> Result<Vec<DetectedProxy>, String> {
    let mut detected = Vec::new();

    // Check common proxy ports
    let proxy_configs = vec![
        // Clash variants
        (
            ProxySoftware::Clash,
            "Clash",
            "⚔️",
            7890,
            7891,
            Some(7890),
            Some(9090),
        ),
        (
            ProxySoftware::ClashVerge,
            "Clash Verge",
            "🔷",
            7897,
            7898,
            Some(7897),
            Some(9097),
        ),
        (
            ProxySoftware::ClashForWindows,
            "Clash for Windows",
            "🪟",
            7890,
            7891,
            Some(7890),
            Some(9090),
        ),
        // V2Ray variants
        (
            ProxySoftware::V2ray,
            "V2Ray",
            "🚀",
            10809,
            10808,
            None,
            None,
        ),
        (
            ProxySoftware::V2rayn,
            "V2RayN",
            "🔵",
            10809,
            10808,
            None,
            None,
        ),
        // Shadowsocks
        (
            ProxySoftware::Shadowsocks,
            "Shadowsocks",
            "✈️",
            1080,
            1080,
            None,
            None,
        ),
        // sing-box
        (
            ProxySoftware::SingBox,
            "sing-box",
            "📦",
            2080,
            2081,
            Some(2080),
            None,
        ),
    ];

    for (software, name, icon, http_port, socks_port, mixed_port, api_port) in proxy_configs {
        // Check if port is open
        let port_to_check = mixed_port.unwrap_or(http_port);
        if is_port_open("127.0.0.1", port_to_check) {
            let mut proxy = DetectedProxy {
                software,
                name: name.to_string(),
                icon: icon.to_string(),
                running: true,
                http_port: Some(http_port),
                socks_port: Some(socks_port),
                mixed_port,
                api_port,
                api_url: api_port.map(|p| format!("http://127.0.0.1:{}", p)),
                version: None,
                config_path: None,
            };

            // Try to get version from API if available
            if let Some(api) = api_port {
                if let Ok(version) = get_clash_version(api).await {
                    proxy.version = Some(version);
                }
            }

            detected.push(proxy);
        }
    }

    // Also check for process names
    let process_proxies = detect_proxy_processes();
    for proxy in process_proxies {
        if !detected.iter().any(|p| p.software == proxy.software) {
            detected.push(proxy);
        }
    }

    Ok(detected)
}

/// Check if a specific port is open
fn is_port_open(host: &str, port: u16) -> bool {
    let addr = format!("{}:{}", host, port);
    match addr.parse() {
        Ok(socket_addr) => {
            TcpStream::connect_timeout(&socket_addr, Duration::from_millis(500)).is_ok()
        }
        Err(_) => false,
    }
}

/// Get Clash version from API
async fn get_clash_version(api_port: u16) -> Result<String, String> {
    let url = format!("http://127.0.0.1:{}/version", api_port);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if resp.status().is_success() {
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        if let Some(version) = json.get("version").and_then(|v| v.as_str()) {
            return Ok(version.to_string());
        }
    }

    Err("Failed to get version".to_string())
}

/// Detect proxy software by process name
fn detect_proxy_processes() -> Vec<DetectedProxy> {
    let mut detected = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let process_map = vec![
            ("clash", ProxySoftware::Clash, "Clash", "⚔️"),
            (
                "Clash Verge",
                ProxySoftware::ClashVerge,
                "Clash Verge",
                "🔷",
            ),
            (
                "Clash for Windows",
                ProxySoftware::ClashForWindows,
                "Clash for Windows",
                "🪟",
            ),
            ("v2ray", ProxySoftware::V2ray, "V2Ray", "🚀"),
            ("v2rayn", ProxySoftware::V2rayn, "V2RayN", "🔵"),
            ("ss-local", ProxySoftware::Shadowsocks, "Shadowsocks", "✈️"),
            ("sing-box", ProxySoftware::SingBox, "sing-box", "📦"),
        ];

        if let Ok(output) = Command::new("tasklist").output() {
            let output_str = String::from_utf8_lossy(&output.stdout).to_lowercase();
            for (process_name, software, name, icon) in process_map {
                if output_str.contains(&process_name.to_lowercase()) {
                    detected.push(DetectedProxy {
                        software,
                        name: name.to_string(),
                        icon: icon.to_string(),
                        running: true,
                        http_port: None,
                        socks_port: None,
                        mixed_port: None,
                        api_port: None,
                        api_url: None,
                        version: None,
                        config_path: None,
                    });
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let process_map = vec![
            ("clash", ProxySoftware::Clash, "Clash", "⚔️"),
            ("v2ray", ProxySoftware::V2ray, "V2Ray", "🚀"),
            ("ss-local", ProxySoftware::Shadowsocks, "Shadowsocks", "✈️"),
            ("sing-box", ProxySoftware::SingBox, "sing-box", "📦"),
        ];

        if let Ok(output) = Command::new("pgrep").args(["-l", "."]).output() {
            let output_str = String::from_utf8_lossy(&output.stdout).to_lowercase();
            for (process_name, software, name, icon) in process_map {
                if output_str.contains(process_name) {
                    detected.push(DetectedProxy {
                        software,
                        name: name.to_string(),
                        icon: icon.to_string(),
                        running: true,
                        http_port: None,
                        socks_port: None,
                        mixed_port: None,
                        api_port: None,
                        api_url: None,
                        version: None,
                        config_path: None,
                    });
                }
            }
        }
    }

    detected
}

/// Test proxy connectivity
#[tauri::command]
pub async fn proxy_test(
    proxy_url: String,
    test_url: Option<String>,
) -> Result<ProxyTestResult, String> {
    let test_url = test_url.unwrap_or_else(|| "https://www.google.com/generate_204".to_string());

    let proxy = reqwest::Proxy::all(&proxy_url).map_err(|e| e.to_string())?;

    let client = reqwest::Client::builder()
        .proxy(proxy)
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let start = Instant::now();

    match client.get(&test_url).send().await {
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;

            if resp.status().is_success() || resp.status().as_u16() == 204 {
                // Try to get IP from ipinfo.io
                let ip_info = get_ip_info(&client).await.ok();

                Ok(ProxyTestResult {
                    success: true,
                    latency: Some(latency),
                    ip: ip_info.as_ref().map(|(ip, _)| ip.clone()),
                    location: ip_info.map(|(_, loc)| loc),
                    error: None,
                })
            } else {
                Ok(ProxyTestResult {
                    success: false,
                    latency: Some(latency),
                    ip: None,
                    location: None,
                    error: Some(format!("HTTP {}", resp.status())),
                })
            }
        }
        Err(e) => Ok(ProxyTestResult {
            success: false,
            latency: None,
            ip: None,
            location: None,
            error: Some(e.to_string()),
        }),
    }
}

/// Get IP info from ipinfo.io
async fn get_ip_info(client: &reqwest::Client) -> Result<(String, String), String> {
    let resp = client
        .get("https://ipinfo.io/json")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let ip = json
        .get("ip")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let city = json.get("city").and_then(|v| v.as_str()).unwrap_or("");
    let country = json.get("country").and_then(|v| v.as_str()).unwrap_or("");
    let location = format!("{}, {}", city, country);

    Ok((ip, location))
}

/// Get system proxy settings
#[tauri::command]
pub fn proxy_get_system() -> Result<SystemProxySettings, String> {
    #[cfg(target_os = "windows")]
    {
        get_windows_system_proxy()
    }

    #[cfg(target_os = "macos")]
    {
        get_macos_system_proxy()
    }

    #[cfg(target_os = "linux")]
    {
        get_linux_system_proxy()
    }
}

#[cfg(target_os = "windows")]
fn get_windows_system_proxy() -> Result<SystemProxySettings, String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let internet_settings = hkcu
        .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
        .map_err(|e| e.to_string())?;

    let proxy_enable: u32 = internet_settings.get_value("ProxyEnable").unwrap_or(0);

    let proxy_server: String = internet_settings
        .get_value("ProxyServer")
        .unwrap_or_default();

    let proxy_override: String = internet_settings
        .get_value("ProxyOverride")
        .unwrap_or_default();

    let enabled = proxy_enable == 1;
    let http_proxy = if enabled && !proxy_server.is_empty() {
        Some(format!("http://{}", proxy_server))
    } else {
        None
    };

    Ok(SystemProxySettings {
        enabled,
        http_proxy: http_proxy.clone(),
        https_proxy: http_proxy,
        socks_proxy: None,
        no_proxy: if proxy_override.is_empty() {
            None
        } else {
            Some(proxy_override)
        },
    })
}

#[cfg(target_os = "macos")]
fn get_macos_system_proxy() -> Result<SystemProxySettings, String> {
    // Use networksetup to get proxy settings
    let output = Command::new("networksetup")
        .args(["-getwebproxy", "Wi-Fi"])
        .output()
        .map_err(|e| e.to_string())?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    let enabled = output_str.contains("Enabled: Yes");

    let mut http_proxy = None;
    for line in output_str.lines() {
        if line.starts_with("Server:") {
            let server = line.replace("Server:", "").trim().to_string();
            if !server.is_empty() {
                http_proxy = Some(format!("http://{}", server));
            }
        }
    }

    Ok(SystemProxySettings {
        enabled,
        http_proxy: http_proxy.clone(),
        https_proxy: http_proxy,
        socks_proxy: None,
        no_proxy: None,
    })
}

#[cfg(target_os = "linux")]
fn get_linux_system_proxy() -> Result<SystemProxySettings, String> {
    let http_proxy = std::env::var("http_proxy")
        .ok()
        .or_else(|| std::env::var("HTTP_PROXY").ok());
    let https_proxy = std::env::var("https_proxy")
        .ok()
        .or_else(|| std::env::var("HTTPS_PROXY").ok());
    let no_proxy = std::env::var("no_proxy")
        .ok()
        .or_else(|| std::env::var("NO_PROXY").ok());

    let enabled = http_proxy.is_some() || https_proxy.is_some();

    Ok(SystemProxySettings {
        enabled,
        http_proxy,
        https_proxy,
        socks_proxy: std::env::var("socks_proxy").ok(),
        no_proxy,
    })
}

/// Check if a specific proxy port is available
#[tauri::command]
pub fn proxy_check_port(host: String, port: u16) -> bool {
    is_port_open(&host, port)
}

/// Get Clash API info
#[tauri::command]
pub async fn proxy_get_clash_info(api_port: u16) -> Result<serde_json::Value, String> {
    let url = format!("http://127.0.0.1:{}", api_port);

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Get version
    let version_resp = client
        .get(format!("{}/version", url))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let version: serde_json::Value = version_resp.json().await.unwrap_or(serde_json::json!({}));

    // Get configs
    let configs_resp = client
        .get(format!("{}/configs", url))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let configs: serde_json::Value = configs_resp.json().await.unwrap_or(serde_json::json!({}));

    Ok(serde_json::json!({
        "version": version,
        "configs": configs,
        "apiUrl": url,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proxy_software_display() {
        assert_eq!(format!("{}", ProxySoftware::Clash), "clash");
        assert_eq!(format!("{}", ProxySoftware::ClashVerge), "clash-verge");
        assert_eq!(
            format!("{}", ProxySoftware::ClashForWindows),
            "clash-for-windows"
        );
        assert_eq!(format!("{}", ProxySoftware::V2ray), "v2ray");
        assert_eq!(format!("{}", ProxySoftware::V2rayn), "v2rayn");
        assert_eq!(format!("{}", ProxySoftware::Shadowsocks), "shadowsocks");
        assert_eq!(format!("{}", ProxySoftware::Shadowsocksr), "shadowsocksr");
        assert_eq!(format!("{}", ProxySoftware::Trojan), "trojan");
        assert_eq!(format!("{}", ProxySoftware::SingBox), "sing-box");
        assert_eq!(format!("{}", ProxySoftware::Surge), "surge");
        assert_eq!(format!("{}", ProxySoftware::Quantumult), "quantumult");
        assert_eq!(format!("{}", ProxySoftware::Proxifier), "proxifier");
        assert_eq!(format!("{}", ProxySoftware::Unknown), "unknown");
    }

    #[test]
    fn test_proxy_software_serialization() {
        let software = ProxySoftware::Clash;
        let serialized = serde_json::to_string(&software).unwrap();
        assert_eq!(serialized, r#""clash""#);

        let deserialized: ProxySoftware = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized, ProxySoftware::Clash);
    }

    #[test]
    fn test_proxy_software_deserialization() {
        let clash: ProxySoftware = serde_json::from_str(r#""clash""#).unwrap();
        assert_eq!(clash, ProxySoftware::Clash);

        let v2ray: ProxySoftware = serde_json::from_str(r#""v2ray""#).unwrap();
        assert_eq!(v2ray, ProxySoftware::V2ray);

        let singbox: ProxySoftware = serde_json::from_str(r#""sing-box""#).unwrap();
        assert_eq!(singbox, ProxySoftware::SingBox);
    }

    #[test]
    fn test_detected_proxy_struct() {
        let proxy = DetectedProxy {
            software: ProxySoftware::Clash,
            name: "Clash".to_string(),
            icon: "⚔️".to_string(),
            running: true,
            http_port: Some(7890),
            socks_port: Some(7891),
            mixed_port: Some(7890),
            api_port: Some(9090),
            api_url: Some("http://127.0.0.1:9090".to_string()),
            version: Some("1.18.0".to_string()),
            config_path: Some("/path/to/config.yaml".to_string()),
        };

        assert_eq!(proxy.software, ProxySoftware::Clash);
        assert!(proxy.running);
        assert_eq!(proxy.http_port, Some(7890));
        assert_eq!(proxy.api_port, Some(9090));
    }

    #[test]
    fn test_detected_proxy_minimal() {
        let proxy = DetectedProxy {
            software: ProxySoftware::Unknown,
            name: "Unknown Proxy".to_string(),
            icon: "❓".to_string(),
            running: false,
            http_port: None,
            socks_port: None,
            mixed_port: None,
            api_port: None,
            api_url: None,
            version: None,
            config_path: None,
        };

        assert_eq!(proxy.software, ProxySoftware::Unknown);
        assert!(!proxy.running);
        assert!(proxy.http_port.is_none());
    }

    #[test]
    fn test_detected_proxy_serialization() {
        let proxy = DetectedProxy {
            software: ProxySoftware::V2rayn,
            name: "V2RayN".to_string(),
            icon: "🔵".to_string(),
            running: true,
            http_port: Some(10809),
            socks_port: Some(10808),
            mixed_port: None,
            api_port: None,
            api_url: None,
            version: Some("6.0.0".to_string()),
            config_path: None,
        };

        let serialized = serde_json::to_string(&proxy).unwrap();
        let deserialized: DetectedProxy = serde_json::from_str(&serialized).unwrap();

        assert_eq!(proxy.software, deserialized.software);
        assert_eq!(proxy.name, deserialized.name);
        assert_eq!(proxy.http_port, deserialized.http_port);
    }

    #[test]
    fn test_proxy_test_result_success() {
        let result = ProxyTestResult {
            success: true,
            latency: Some(150),
            ip: Some("1.2.3.4".to_string()),
            location: Some("Tokyo, JP".to_string()),
            error: None,
        };

        assert!(result.success);
        assert_eq!(result.latency, Some(150));
        assert_eq!(result.ip, Some("1.2.3.4".to_string()));
        assert!(result.error.is_none());
    }

    #[test]
    fn test_proxy_test_result_failure() {
        let result = ProxyTestResult {
            success: false,
            latency: None,
            ip: None,
            location: None,
            error: Some("Connection timeout".to_string()),
        };

        assert!(!result.success);
        assert!(result.latency.is_none());
        assert_eq!(result.error, Some("Connection timeout".to_string()));
    }

    #[test]
    fn test_system_proxy_settings_enabled() {
        let settings = SystemProxySettings {
            enabled: true,
            http_proxy: Some("http://127.0.0.1:7890".to_string()),
            https_proxy: Some("http://127.0.0.1:7890".to_string()),
            socks_proxy: Some("socks5://127.0.0.1:7891".to_string()),
            no_proxy: Some("localhost,127.0.0.1".to_string()),
        };

        assert!(settings.enabled);
        assert_eq!(
            settings.http_proxy,
            Some("http://127.0.0.1:7890".to_string())
        );
    }

    #[test]
    fn test_system_proxy_settings_disabled() {
        let settings = SystemProxySettings {
            enabled: false,
            http_proxy: None,
            https_proxy: None,
            socks_proxy: None,
            no_proxy: None,
        };

        assert!(!settings.enabled);
        assert!(settings.http_proxy.is_none());
    }

    #[test]
    fn test_system_proxy_settings_serialization() {
        let settings = SystemProxySettings {
            enabled: true,
            http_proxy: Some("http://proxy:8080".to_string()),
            https_proxy: Some("http://proxy:8080".to_string()),
            socks_proxy: None,
            no_proxy: Some("*.local".to_string()),
        };

        let serialized = serde_json::to_string(&settings).unwrap();
        let deserialized: SystemProxySettings = serde_json::from_str(&serialized).unwrap();

        assert_eq!(settings.enabled, deserialized.enabled);
        assert_eq!(settings.http_proxy, deserialized.http_proxy);
        assert_eq!(settings.no_proxy, deserialized.no_proxy);
    }

    #[test]
    fn test_is_port_open_localhost() {
        // Test with a port that is very unlikely to be open
        let result = is_port_open("127.0.0.1", 59999);
        // We just verify it doesn't panic and returns a bool
        let _ = result;
    }

    #[test]
    fn test_is_port_open_invalid_host() {
        // Test with invalid host - should return false
        let result = is_port_open("invalid.host.local", 80);
        assert!(!result);
    }

    #[test]
    fn test_proxy_check_port_command() {
        // Test the command wrapper
        let result = proxy_check_port("127.0.0.1".to_string(), 59998);
        // Result is always a boolean, this test just ensures no panic
        let _ = result;
    }

    #[test]
    fn test_proxy_software_equality() {
        assert_eq!(ProxySoftware::Clash, ProxySoftware::Clash);
        assert_ne!(ProxySoftware::Clash, ProxySoftware::V2ray);
        assert_ne!(ProxySoftware::ClashVerge, ProxySoftware::ClashForWindows);
    }

    #[test]
    fn test_detected_proxy_with_clash_verge() {
        let proxy = DetectedProxy {
            software: ProxySoftware::ClashVerge,
            name: "Clash Verge".to_string(),
            icon: "🔷".to_string(),
            running: true,
            http_port: Some(7897),
            socks_port: Some(7898),
            mixed_port: Some(7897),
            api_port: Some(9097),
            api_url: Some("http://127.0.0.1:9097".to_string()),
            version: None,
            config_path: None,
        };

        assert_eq!(proxy.software, ProxySoftware::ClashVerge);
        assert_eq!(proxy.http_port, Some(7897));
        assert_eq!(proxy.api_port, Some(9097));
    }

    #[test]
    fn test_proxy_test_result_serialization() {
        let result = ProxyTestResult {
            success: true,
            latency: Some(200),
            ip: Some("8.8.8.8".to_string()),
            location: Some("Mountain View, US".to_string()),
            error: None,
        };

        let serialized = serde_json::to_string(&result).unwrap();
        assert!(serialized.contains("\"success\":true"));
        assert!(serialized.contains("\"latency\":200"));

        let deserialized: ProxyTestResult = serde_json::from_str(&serialized).unwrap();
        assert_eq!(result.success, deserialized.success);
        assert_eq!(result.latency, deserialized.latency);
    }
}
