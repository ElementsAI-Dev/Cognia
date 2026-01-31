//! SSE (Server-Sent Events) transport implementation for MCP
//!
//! Communicates with MCP servers via HTTP SSE connections
//! Supports optional proxy configuration for network requests

use async_trait::async_trait;
use futures::StreamExt;
use reqwest_eventsource::{Event, EventSource, RequestBuilderExt};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex as TokioMutex};

use crate::mcp::error::{McpError, McpResult};
use crate::mcp::transport::Transport;

/// Channel capacity for SSE event buffering
const SSE_CHANNEL_CAPACITY: usize = 100;

/// HTTP client timeout in seconds
const HTTP_TIMEOUT_SECS: u64 = 30;

/// Connection establishment wait time in milliseconds
const CONNECTION_WAIT_MS: u64 = 100;

/// Maximum message length for logging (longer messages are truncated)
const LOG_MAX_MESSAGE_LEN: usize = 500;

/// Truncate a string for logging purposes
#[inline]
fn truncate_for_log(s: &str) -> &str {
    if s.len() > LOG_MAX_MESSAGE_LEN {
        &s[..LOG_MAX_MESSAGE_LEN]
    } else {
        s
    }
}

/// SSE transport for HTTP Server-Sent Events communication
pub struct SseTransport {
    /// Base URL for the SSE endpoint
    base_url: String,
    /// HTTP client for sending requests
    client: reqwest::Client,
    /// Channel for receiving SSE events
    event_rx: TokioMutex<mpsc::Receiver<String>>,
    /// Channel sender for SSE events (kept to prevent channel closure)
    event_tx_holder: mpsc::Sender<String>,
    /// Shared connection status (updated by background task)
    connected: Arc<AtomicBool>,
    /// Message endpoint URL (for POST requests)
    message_url: Option<String>,
}

impl SseTransport {
    /// Connect to an SSE endpoint without proxy
    pub async fn connect(url: &str) -> McpResult<Self> {
        Self::connect_with_proxy(url, None).await
    }

    /// Connect to an SSE endpoint with optional proxy support
    pub async fn connect_with_proxy(url: &str, proxy_url: Option<&str>) -> McpResult<Self> {
        log::info!("Connecting to SSE endpoint: {}", url);
        if let Some(proxy) = proxy_url {
            log::info!("Using proxy: {}", proxy);
        }

        log::debug!("Creating HTTP client with {}s timeout", HTTP_TIMEOUT_SECS);
        let mut client_builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS));

        // Add proxy if configured
        if let Some(proxy) = proxy_url {
            match reqwest::Proxy::all(proxy) {
                Ok(proxy_config) => {
                    client_builder = client_builder.proxy(proxy_config);
                    log::debug!("Proxy configured for SSE transport");
                }
                Err(e) => {
                    log::warn!("Failed to configure proxy '{}': {}, continuing without proxy", proxy, e);
                }
            }
        }

        let client = client_builder.build().map_err(|e| {
            log::error!("Failed to create HTTP client: {}", e);
            McpError::RequestError(e)
        })?;

        let (event_tx, event_rx) = mpsc::channel(SSE_CHANNEL_CAPACITY);
        log::trace!("Created event channel with capacity {}", SSE_CHANNEL_CAPACITY);

        // Start SSE connection with shared connection status
        let sse_url = url.to_string();
        let tx = event_tx.clone();
        let connected = Arc::new(AtomicBool::new(false));
        let connected_clone = connected.clone();
        let sse_url_for_log = sse_url.clone();

        // Clone client for the spawned task
        let sse_client = client.clone();

        log::debug!("Spawning SSE event listener task");
        tokio::spawn(async move {
            log::trace!("SSE listener task started for {}", sse_url);
            // Use client with proxy support for SSE connection
            let request = sse_client.get(&sse_url);
            let mut es = match request.eventsource() {
                Ok(es) => es,
                Err(e) => {
                    log::error!("Failed to create EventSource for {}: {:?}", sse_url, e);
                    connected_clone.store(false, Ordering::SeqCst);
                    return;
                }
            };
            let mut message_count: u64 = 0;

            while let Some(event) = es.next().await {
                match event {
                    Ok(Event::Open) => {
                        log::info!("SSE connection opened to {}", sse_url);
                        connected_clone.store(true, Ordering::SeqCst);
                    }
                    Ok(Event::Message(message)) => {
                        message_count += 1;
                        log::trace!(
                            "SSE message #{} received ({} bytes): {}",
                            message_count,
                            message.data.len(),
                            truncate_for_log(&message.data)
                        );
                        if tx.send(message.data).await.is_err() {
                            log::warn!("Failed to send SSE message to channel, receiver dropped");
                            break;
                        }
                    }
                    Err(err) => {
                        log::error!("SSE connection error for {}: {:?}", sse_url, err);
                        connected_clone.store(false, Ordering::SeqCst);
                        break;
                    }
                }
            }

            log::info!(
                "SSE connection closed for {} (received {} messages total)",
                sse_url,
                message_count
            );
            connected_clone.store(false, Ordering::SeqCst);
        });

        // Wait a bit for connection to establish
        log::trace!("Waiting {}ms for SSE connection to establish", CONNECTION_WAIT_MS);
        tokio::time::sleep(std::time::Duration::from_millis(CONNECTION_WAIT_MS)).await;

        // Extract message endpoint from URL (typically same base with /message suffix)
        let message_url = url
            .strip_suffix("/sse")
            .map(|base| format!("{}/message", base))
            .or_else(|| Some(format!("{}/message", url.trim_end_matches('/'))));
        log::debug!("Derived message URL: {:?}", message_url);
        log::info!(
            "SSE transport created for {} (message endpoint: {:?})",
            sse_url_for_log,
            message_url
        );

        Ok(Self {
            base_url: url.to_string(),
            client,
            event_rx: TokioMutex::new(event_rx),
            event_tx_holder: event_tx,
            connected,
            message_url,
        })
    }

    /// Set the message endpoint URL
    pub fn set_message_url(&mut self, url: String) {
        log::debug!("Setting custom message URL: {}", url);
        self.message_url = Some(url);
    }
}

#[async_trait]
impl Transport for SseTransport {
    async fn send(&self, message: &str) -> McpResult<()> {
        if !self.is_connected() {
            log::warn!("Attempted to send message on disconnected SSE transport");
            return Err(McpError::NotConnected);
        }

        let url = self.message_url.as_ref().ok_or_else(|| {
            log::error!("Cannot send SSE message: message URL not configured");
            McpError::TransportError("Message URL not configured".to_string())
        })?;

        log::trace!(
            "Sending HTTP POST to {} ({} bytes): {}",
            url,
            message.len(),
            truncate_for_log(message)
        );

        let start = std::time::Instant::now();
        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .body(message.to_string())
            .send()
            .await
            .map_err(|e| {
                log::error!("HTTP POST request failed to {}: {}", url, e);
                McpError::RequestError(e)
            })?;

        let elapsed = start.elapsed();
        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            log::error!(
                "HTTP POST to {} failed with status {} after {:?}: {}",
                url,
                status,
                elapsed,
                body
            );
            return Err(McpError::TransportError(format!(
                "HTTP error {}: {}",
                status, body
            )));
        }

        log::trace!(
            "HTTP POST to {} completed with status {} in {:?}",
            url,
            status,
            elapsed
        );
        Ok(())
    }

    async fn receive(&self) -> McpResult<String> {
        if !self.is_connected() {
            log::warn!("Attempted to receive message on disconnected SSE transport");
            return Err(McpError::NotConnected);
        }

        let mut rx = self.event_rx.lock().await;
        log::trace!("Waiting to receive SSE event");

        match rx.recv().await {
            Some(message) => {
                log::trace!(
                    "Received SSE event ({} bytes): {}",
                    message.len(),
                    truncate_for_log(&message)
                );
                Ok(message)
            }
            None => {
                log::warn!("SSE event channel closed unexpectedly");
                self.connected.store(false, Ordering::SeqCst);
                Err(McpError::TransportError("SSE channel closed".to_string()))
            }
        }
    }

    async fn close(&self) -> McpResult<()> {
        log::debug!("Closing SSE transport for {}", self.base_url);
        self.connected.store(false, Ordering::SeqCst);
        // EventSource will be dropped when the spawned task ends
        log::info!("SSE transport closed for {}", self.base_url);
        Ok(())
    }

    fn is_connected(&self) -> bool {
        let is_connected = self.connected.load(Ordering::SeqCst);
        log::trace!(
            "SSE transport connection status for {}: {}",
            self.base_url,
            is_connected
        );
        is_connected
    }
}

impl Drop for SseTransport {
    fn drop(&mut self) {
        log::debug!("Dropping SSE transport for {}", self.base_url);
        self.connected.store(false, Ordering::SeqCst);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // Constants Tests
    // ============================================================================

    #[test]
    fn test_constants_have_reasonable_values() {
        // Channel capacity should be positive
        assert!(SSE_CHANNEL_CAPACITY > 0);
        assert!(SSE_CHANNEL_CAPACITY <= 1000); // Not too large

        // Timeout should be reasonable
        assert!(HTTP_TIMEOUT_SECS >= 5);
        assert!(HTTP_TIMEOUT_SECS <= 120);

        // Connection wait should be reasonable
        assert!(CONNECTION_WAIT_MS >= 50);
        assert!(CONNECTION_WAIT_MS <= 1000);

        // Log truncation length should be reasonable
        assert!(LOG_MAX_MESSAGE_LEN >= 100);
        assert!(LOG_MAX_MESSAGE_LEN <= 10000);
    }

    // ============================================================================
    // Helper Function Tests
    // ============================================================================

    #[test]
    fn test_truncate_for_log_short_string() {
        let short = "Hello, World!";
        assert_eq!(truncate_for_log(short), short);
    }

    #[test]
    fn test_truncate_for_log_exact_length() {
        let exact = "a".repeat(LOG_MAX_MESSAGE_LEN);
        assert_eq!(truncate_for_log(&exact), exact.as_str());
    }

    #[test]
    fn test_truncate_for_log_long_string() {
        let long = "a".repeat(LOG_MAX_MESSAGE_LEN + 100);
        let truncated = truncate_for_log(&long);
        assert_eq!(truncated.len(), LOG_MAX_MESSAGE_LEN);
        assert_eq!(truncated, &long[..LOG_MAX_MESSAGE_LEN]);
    }

    #[test]
    fn test_truncate_for_log_empty_string() {
        assert_eq!(truncate_for_log(""), "");
    }

    #[test]
    fn test_truncate_for_log_unicode() {
        // Note: truncation is byte-based, so we test with ASCII to avoid mid-char cuts
        let unicode = "Hello 世界!";
        assert_eq!(truncate_for_log(unicode), unicode);
    }

    // ============================================================================
    // SseTransport Connection Tests (require running server)
    // ============================================================================

    #[tokio::test]
    #[ignore = "requires running SSE server"]
    async fn test_sse_transport_connection() {
        let result = SseTransport::connect("http://localhost:8080/sse").await;
        // With a running server, this should succeed
        assert!(result.is_ok(), "Expected successful connection to running server");
    }

    #[tokio::test]
    #[ignore = "requires network, may timeout"]
    async fn test_sse_transport_connection_invalid_url() {
        let result =
            SseTransport::connect("http://invalid-host-that-does-not-exist:9999/sse").await;
        // The struct is created optimistically, but connection may not be established
        // This is expected behavior - the actual connection happens in the background task
        assert!(result.is_ok(), "Transport creation should succeed even for invalid hosts");
    }

    // ============================================================================
    // SseTransport State Tests (require running server)
    // ============================================================================

    #[tokio::test]
    #[ignore = "requires running SSE server"]
    async fn test_sse_transport_is_connected() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            // Wait for connection to establish
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            // With a running server, should be connected
            assert!(t.is_connected(), "Should be connected to running server");
        }
    }

    #[tokio::test]
    #[ignore = "requires running SSE server"]
    async fn test_sse_transport_close() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            let close_result = t.close().await;
            assert!(close_result.is_ok(), "Close should succeed");
            assert!(!t.is_connected(), "Should be disconnected after close");
        }
    }

    // ============================================================================
    // Message URL Tests
    // ============================================================================

    #[test]
    fn test_message_url_derivation_from_sse_suffix() {
        // Test that message URL is correctly derived from SSE URL
        let url = "http://localhost:8080/sse";
        let expected_message_url = "http://localhost:8080/message";

        // The derivation logic: strip /sse suffix and append /message
        let derived = url
            .strip_suffix("/sse")
            .map(|base| format!("{}/message", base))
            .or_else(|| Some(format!("{}/message", url.trim_end_matches('/'))))
            .unwrap();

        assert_eq!(derived, expected_message_url);
    }

    #[test]
    fn test_message_url_derivation_without_sse_suffix() {
        let url = "http://localhost:8080/events";
        let derived = url
            .strip_suffix("/sse")
            .map(|base| format!("{}/message", base))
            .or_else(|| Some(format!("{}/message", url.trim_end_matches('/'))))
            .unwrap();

        assert_eq!(derived, "http://localhost:8080/events/message");
    }

    #[test]
    fn test_message_url_derivation_with_trailing_slash() {
        let url = "http://localhost:8080/";
        let derived = format!("{}/message", url.trim_end_matches('/'));

        assert_eq!(derived, "http://localhost:8080/message");
    }

    // ============================================================================
    // Transport Behavior Tests (require running server)
    // ============================================================================

    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_send_when_not_connected() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            t.close().await.unwrap();

            let result = t.send(r#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#).await;
            assert!(result.is_err());
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_receive_when_not_connected() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            t.close().await.unwrap();

            let result = t.receive().await;
            assert!(result.is_err());
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_multiple_close_calls() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            // First close
            let result1 = t.close().await;
            assert!(result1.is_ok());

            // Second close should also succeed (idempotent)
            let result2 = t.close().await;
            assert!(result2.is_ok());
        }
    }

    // ============================================================================
    // URL Format Tests
    // ============================================================================

    #[test]
    fn test_various_url_formats() {
        let urls = vec![
            ("http://localhost:8080/sse", "http://localhost:8080/message"),
            (
                "https://api.example.com/sse",
                "https://api.example.com/message",
            ),
            ("http://127.0.0.1:3000/sse", "http://127.0.0.1:3000/message"),
            ("http://localhost/sse", "http://localhost/message"),
        ];

        for (input, expected) in urls {
            let derived = input
                .strip_suffix("/sse")
                .map(|base| format!("{}/message", base))
                .unwrap_or_else(|| format!("{}/message", input.trim_end_matches('/')));
            assert_eq!(derived, expected, "Failed for input: {}", input);
        }
    }

    #[test]
    fn test_url_with_sse_in_hostname() {
        // This test verifies that /sse in hostname is NOT replaced (only suffix)
        let url = "http://sse-server.example.com/sse";
        let derived = url
            .strip_suffix("/sse")
            .map(|base| format!("{}/message", base))
            .unwrap_or_else(|| format!("{}/message", url.trim_end_matches('/')));

        // Should only strip the suffix, not the hostname
        assert_eq!(derived, "http://sse-server.example.com/message");
    }

    #[test]
    fn test_url_with_query_params() {
        let url = "http://localhost:8080/sse?token=abc123";
        let derived = url.replace("/sse", "/message");
        assert_eq!(derived, "http://localhost:8080/message?token=abc123");
    }

    #[test]
    fn test_url_with_path_segments() {
        let url = "http://localhost:8080/api/v1/sse";
        let derived = url.replace("/sse", "/message");
        assert_eq!(derived, "http://localhost:8080/api/v1/message");
    }

    // ============================================================================
    // Proxy Support Tests
    // ============================================================================

    #[tokio::test]
    #[ignore = "requires running SSE server"]
    async fn test_sse_transport_connect_without_proxy() {
        // Test that connect() works the same as connect_with_proxy(url, None)
        let result = SseTransport::connect("http://localhost:8080/sse").await;
        assert!(result.is_ok(), "Transport creation should succeed");
    }

    #[tokio::test]
    #[ignore = "requires running SSE server and proxy"]
    async fn test_sse_transport_connect_with_proxy() {
        // Test that connect_with_proxy accepts proxy URL
        let result =
            SseTransport::connect_with_proxy("http://localhost:8080/sse", Some("http://127.0.0.1:7890")).await;
        assert!(result.is_ok(), "Transport creation with proxy should succeed");
    }

    #[tokio::test]
    #[ignore = "requires running SSE server"]
    async fn test_sse_transport_connect_with_none_proxy() {
        // Test that connect_with_proxy with None proxy works like connect
        let result = SseTransport::connect_with_proxy("http://localhost:8080/sse", None).await;
        assert!(result.is_ok(), "Transport creation without proxy should succeed");
    }

    #[tokio::test]
    #[ignore = "requires running SSE server"]
    async fn test_sse_transport_connect_with_invalid_proxy() {
        // Test that invalid proxy URL is handled gracefully (logs warning, continues without proxy)
        let result =
            SseTransport::connect_with_proxy("http://localhost:8080/sse", Some("not-a-valid-proxy-url")).await;
        // Should still create transport (invalid proxy is logged and ignored)
        assert!(result.is_ok(), "Transport creation should succeed even with invalid proxy URL");
    }

    #[test]
    fn test_proxy_url_formats() {
        // Verify proxy URL format parsing (used by reqwest::Proxy::all)
        let valid_proxies = vec![
            "http://127.0.0.1:7890",
            "http://localhost:8080",
            "socks5://127.0.0.1:1080",
            "http://user:pass@proxy.example.com:8080",
        ];

        for proxy_url in valid_proxies {
            let result = reqwest::Proxy::all(proxy_url);
            assert!(result.is_ok(), "Failed to parse proxy URL: {}", proxy_url);
        }
    }

    #[test]
    fn test_invalid_proxy_url_formats() {
        let invalid_proxies = vec![
            "not-a-url",
            "ftp://proxy:8080", // FTP not supported
            "",
        ];

        for proxy_url in invalid_proxies {
            let result = reqwest::Proxy::all(proxy_url);
            assert!(result.is_err(), "Should fail for invalid proxy URL: {}", proxy_url);
        }
    }
}
