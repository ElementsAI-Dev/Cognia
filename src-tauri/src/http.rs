//! Shared HTTP client module
//!
//! This module provides centralized HTTP client configuration with proper
//! timeout settings, proxy support, and connection pooling.
//!
//! ## Proxy Support
//!
//! Use `set_global_proxy` to configure a proxy URL that will be used by
//! all proxy-aware client factory functions (`create_proxy_client`,
//! `create_proxy_client_long`, `create_proxy_client_quick`).
//!
//! For localhost/127.0.0.1 targets, use the static `HTTP_CLIENT*` instances
//! directly since local requests should bypass the proxy.

use once_cell::sync::Lazy;
use reqwest::Client;
use std::sync::RwLock;
use std::time::Duration;

/// Default User-Agent header
pub const DEFAULT_USER_AGENT: &str = concat!("Cognia/", env!("CARGO_PKG_VERSION"), " (Tauri)");

/// Default timeout for HTTP requests (30 seconds)
pub const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Default connection timeout (10 seconds)
pub const DEFAULT_CONNECT_TIMEOUT_SECS: u64 = 10;

/// Default pool idle timeout (90 seconds)
pub const DEFAULT_POOL_IDLE_TIMEOUT_SECS: u64 = 90;

/// Default maximum idle connections per host
pub const DEFAULT_POOL_MAX_IDLE_PER_HOST: usize = 10;

/// Shared HTTP client for general API requests
///
/// This client is configured with:
/// - 30 second request timeout
/// - 10 second connection timeout
/// - Connection pooling with 90 second idle timeout
/// - User-Agent header
pub static HTTP_CLIENT: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .connect_timeout(Duration::from_secs(DEFAULT_CONNECT_TIMEOUT_SECS))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST)
        .build()
        .expect("Failed to create HTTP client")
});

/// HTTP client for long-running requests (e.g., file downloads, streaming)
///
/// This client has extended timeouts suitable for large transfers.
pub static HTTP_CLIENT_LONG: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(300)) // 5 minutes
        .connect_timeout(Duration::from_secs(DEFAULT_CONNECT_TIMEOUT_SECS))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST)
        .build()
        .expect("Failed to create long-timeout HTTP client")
});

/// HTTP client for quick API checks (short timeout)
///
/// This client has shorter timeouts suitable for health checks and quick API pings.
pub static HTTP_CLIENT_QUICK: Lazy<Client> = Lazy::new(|| {
    Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(5))
        .pool_idle_timeout(Duration::from_secs(30))
        .pool_max_idle_per_host(5)
        .build()
        .expect("Failed to create quick HTTP client")
});

/// Create a custom HTTP client with proxy support
///
/// # Arguments
/// * `proxy_url` - The proxy URL (e.g., "http://127.0.0.1:7890" or "socks5://127.0.0.1:1080")
/// * `timeout_secs` - Request timeout in seconds
///
/// # Returns
/// A configured HTTP client or an error if the proxy URL is invalid
pub fn create_client_with_proxy(
    proxy_url: &str,
    timeout_secs: Option<u64>,
) -> Result<Client, reqwest::Error> {
    let proxy = reqwest::Proxy::all(proxy_url)?;

    Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .proxy(proxy)
        .timeout(Duration::from_secs(
            timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS),
        ))
        .connect_timeout(Duration::from_secs(DEFAULT_CONNECT_TIMEOUT_SECS))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS))
        .build()
}

// =============================================================================
// Global Proxy State
// =============================================================================

/// Global proxy URL state, set from the frontend proxy store via Tauri command.
///
/// When set, all `create_proxy_client*` factory functions will create clients
/// that route requests through this proxy.
static GLOBAL_PROXY_URL: Lazy<RwLock<Option<String>>> = Lazy::new(|| RwLock::new(None));

/// Default bypass list for proxy - these hosts should never go through proxy
const DEFAULT_BYPASS_HOSTS: &[&str] = &["localhost", "127.0.0.1", "::1", "0.0.0.0"];

/// Set the global proxy URL. Called from the frontend when proxy settings change.
///
/// Pass `None` to disable the global proxy.
pub fn set_global_proxy(proxy_url: Option<String>) {
    if let Ok(mut guard) = GLOBAL_PROXY_URL.write() {
        if let Some(ref url) = proxy_url {
            log::info!("Global proxy set to: {}", url);
        } else {
            log::info!("Global proxy disabled");
        }
        *guard = proxy_url;
    }
}

/// Get the current global proxy URL.
pub fn get_global_proxy() -> Option<String> {
    GLOBAL_PROXY_URL.read().ok().and_then(|guard| guard.clone())
}

/// Check if a URL target should bypass the proxy (e.g., localhost).
pub fn should_bypass_proxy(url: &str) -> bool {
    // Simple host extraction without requiring the `url` crate
    // Handles formats like "http://host:port/path" and "https://host/path"
    let url_lower = url.to_lowercase();
    for bypass in DEFAULT_BYPASS_HOSTS {
        // Check patterns: "://host:", "://host/", "://host" (end of string)
        let prefix = format!("://{}", bypass);
        if let Some(pos) = url_lower.find(&prefix) {
            let after = pos + prefix.len();
            if after >= url_lower.len() {
                return true;
            }
            let next_char = url_lower.as_bytes()[after];
            if next_char == b':' || next_char == b'/' || next_char == b'?' {
                return true;
            }
        }
        // Handle IPv6 bracket notation: "://[::1]"
        let bracket_prefix = format!("://[{}]", bypass);
        if url_lower.contains(&bracket_prefix) {
            return true;
        }
    }
    false
}

// =============================================================================
// Proxy-aware Client Factory Functions
// =============================================================================

/// Apply proxy configuration to a client builder if global proxy is set.
fn apply_proxy(builder: reqwest::ClientBuilder) -> reqwest::ClientBuilder {
    if let Some(proxy_url) = get_global_proxy() {
        match reqwest::Proxy::all(&proxy_url) {
            Ok(proxy) => {
                log::trace!("Applying global proxy: {}", proxy_url);
                builder.proxy(proxy)
            }
            Err(e) => {
                log::warn!("Failed to configure global proxy '{}': {}", proxy_url, e);
                builder
            }
        }
    } else {
        builder
    }
}

/// Create a proxy-aware HTTP client with default timeout (30s).
///
/// If a global proxy is configured via `set_global_proxy`, the client will
/// route requests through it. Otherwise, behaves like `HTTP_CLIENT`.
pub fn create_proxy_client() -> Result<Client, reqwest::Error> {
    let builder = Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .connect_timeout(Duration::from_secs(DEFAULT_CONNECT_TIMEOUT_SECS))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST);

    apply_proxy(builder).build()
}

/// Create a proxy-aware HTTP client with long timeout (5 min).
///
/// Suitable for file downloads and streaming operations.
pub fn create_proxy_client_long() -> Result<Client, reqwest::Error> {
    let builder = Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(300))
        .connect_timeout(Duration::from_secs(DEFAULT_CONNECT_TIMEOUT_SECS))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST);

    apply_proxy(builder).build()
}

/// Create a proxy-aware HTTP client with short timeout (10s).
///
/// Suitable for health checks and quick API pings.
pub fn create_proxy_client_quick() -> Result<Client, reqwest::Error> {
    let builder = Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(10))
        .connect_timeout(Duration::from_secs(5))
        .pool_idle_timeout(Duration::from_secs(30))
        .pool_max_idle_per_host(5);

    apply_proxy(builder).build()
}

/// Create a proxy-aware HTTP client with custom timeout.
///
/// If the target URL is localhost, proxy is bypassed automatically.
pub fn create_proxy_client_with_timeout(timeout_secs: u64) -> Result<Client, reqwest::Error> {
    let builder = Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(timeout_secs))
        .connect_timeout(Duration::from_secs(DEFAULT_CONNECT_TIMEOUT_SECS))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS));

    apply_proxy(builder).build()
}

/// Get the appropriate HTTP client for a given URL.
///
/// Returns a proxy-aware client for external URLs,
/// or the static no-proxy client for localhost targets.
pub fn get_client_for_url(url: &str) -> Result<Client, reqwest::Error> {
    if should_bypass_proxy(url) {
        Ok(HTTP_CLIENT.clone())
    } else {
        create_proxy_client()
    }
}

/// Get the appropriate long-timeout HTTP client for a given URL.
#[allow(dead_code)]
pub fn get_client_long_for_url(url: &str) -> Result<Client, reqwest::Error> {
    if should_bypass_proxy(url) {
        Ok(HTTP_CLIENT_LONG.clone())
    } else {
        create_proxy_client_long()
    }
}

/// Get the appropriate quick HTTP client for a given URL.
pub fn get_client_quick_for_url(url: &str) -> Result<Client, reqwest::Error> {
    if should_bypass_proxy(url) {
        Ok(HTTP_CLIENT_QUICK.clone())
    } else {
        create_proxy_client_quick()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_client_creation() {
        let _ = &*HTTP_CLIENT;
    }

    #[test]
    fn test_long_client_creation() {
        let _ = &*HTTP_CLIENT_LONG;
    }

    #[test]
    fn test_quick_client_creation() {
        let _ = &*HTTP_CLIENT_QUICK;
    }

    #[test]
    fn test_proxy_client_creation() {
        let client = create_client_with_proxy("http://127.0.0.1:7890", Some(30));
        assert!(client.is_ok());
    }

    #[test]
    fn test_socks_proxy_client_creation() {
        let client = create_client_with_proxy("socks5://127.0.0.1:1080", None);
        assert!(client.is_ok());
    }

    #[test]
    fn test_default_constants() {
        assert_eq!(DEFAULT_TIMEOUT_SECS, 30);
        assert_eq!(DEFAULT_CONNECT_TIMEOUT_SECS, 10);
        assert_eq!(DEFAULT_POOL_IDLE_TIMEOUT_SECS, 90);
        assert_eq!(DEFAULT_POOL_MAX_IDLE_PER_HOST, 10);
    }

    #[test]
    fn test_global_proxy_set_and_get() {
        // Initially no proxy
        set_global_proxy(None);
        assert!(get_global_proxy().is_none());

        // Set proxy
        set_global_proxy(Some("http://127.0.0.1:7890".to_string()));
        assert_eq!(
            get_global_proxy(),
            Some("http://127.0.0.1:7890".to_string())
        );

        // Clear proxy
        set_global_proxy(None);
        assert!(get_global_proxy().is_none());
    }

    #[test]
    fn test_should_bypass_proxy() {
        assert!(should_bypass_proxy("http://localhost:11434/api/tags"));
        assert!(should_bypass_proxy("http://127.0.0.1:8080/health"));
        assert!(should_bypass_proxy("http://[::1]:3000/"));
        assert!(!should_bypass_proxy("https://api.openai.com/v1/models"));
        assert!(!should_bypass_proxy(
            "https://api.anthropic.com/v1/messages"
        ));
    }

    #[test]
    fn test_create_proxy_client_no_global() {
        set_global_proxy(None);
        let client = create_proxy_client();
        assert!(client.is_ok());
    }

    #[test]
    fn test_create_proxy_client_with_global() {
        set_global_proxy(Some("http://127.0.0.1:7890".to_string()));
        let client = create_proxy_client();
        assert!(client.is_ok());
        set_global_proxy(None);
    }

    #[test]
    fn test_get_client_for_url_localhost() {
        set_global_proxy(Some("http://127.0.0.1:7890".to_string()));
        let client = get_client_for_url("http://localhost:11434/api/tags");
        assert!(client.is_ok());
        set_global_proxy(None);
    }

    #[test]
    fn test_get_client_for_url_external() {
        set_global_proxy(Some("http://127.0.0.1:7890".to_string()));
        let client = get_client_for_url("https://api.openai.com/v1/models");
        assert!(client.is_ok());
        set_global_proxy(None);
    }
}
