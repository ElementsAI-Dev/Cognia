//! Shared HTTP client module
//!
//! This module provides centralized HTTP client configuration with proper
//! timeout settings, proxy support, and connection pooling.

use once_cell::sync::Lazy;
use reqwest::Client;
use std::time::Duration;

/// Application version for User-Agent
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

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

/// Create a custom HTTP client with specific timeout settings
///
/// # Arguments
/// * `timeout_secs` - Request timeout in seconds
/// * `connect_timeout_secs` - Connection timeout in seconds
///
/// # Returns
/// A configured HTTP client
pub fn create_client_with_timeout(
    timeout_secs: u64,
    connect_timeout_secs: u64,
) -> Result<Client, reqwest::Error> {
    Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(timeout_secs))
        .connect_timeout(Duration::from_secs(connect_timeout_secs))
        .pool_idle_timeout(Duration::from_secs(DEFAULT_POOL_IDLE_TIMEOUT_SECS))
        .pool_max_idle_per_host(DEFAULT_POOL_MAX_IDLE_PER_HOST)
        .build()
}

/// Make an HTTP GET request through a proxy
///
/// # Arguments
/// * `url` - The target URL to request
/// * `proxy_url` - Optional proxy URL (e.g., "http://127.0.0.1:7890")
/// * `timeout_secs` - Request timeout in seconds
/// * `headers` - Optional additional headers
///
/// # Returns
/// Response body as string or error
pub async fn proxied_get(
    url: &str,
    proxy_url: Option<&str>,
    timeout_secs: Option<u64>,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<String, String> {
    let client = if let Some(proxy) = proxy_url {
        create_client_with_proxy(proxy, timeout_secs).map_err(|e| e.to_string())?
    } else {
        HTTP_CLIENT.clone()
    };

    let mut request = client.get(url);

    if let Some(hdrs) = headers {
        for (key, value) in hdrs {
            request = request.header(&key, &value);
        }
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    response.text().await.map_err(|e| e.to_string())
}

/// Make an HTTP POST request through a proxy
///
/// # Arguments
/// * `url` - The target URL to request
/// * `body` - Request body
/// * `proxy_url` - Optional proxy URL
/// * `timeout_secs` - Request timeout in seconds
/// * `headers` - Optional additional headers
///
/// # Returns
/// Response body as string or error
pub async fn proxied_post(
    url: &str,
    body: String,
    proxy_url: Option<&str>,
    timeout_secs: Option<u64>,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<String, String> {
    let client = if let Some(proxy) = proxy_url {
        create_client_with_proxy(proxy, timeout_secs).map_err(|e| e.to_string())?
    } else {
        HTTP_CLIENT.clone()
    };

    let mut request = client.post(url).body(body);

    if let Some(hdrs) = headers {
        for (key, value) in hdrs {
            request = request.header(&key, &value);
        }
    }

    let response = request.send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    response.text().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_client_creation() {
        // Verify the lazy client can be dereferenced (created)
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
    fn test_custom_timeout_client() {
        let client = create_client_with_timeout(60, 15);
        assert!(client.is_ok());
    }

    #[test]
    fn test_proxy_client_creation() {
        // This will succeed as it's just building the client config
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
}
