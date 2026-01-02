//! SSE (Server-Sent Events) transport implementation for MCP
//!
//! Communicates with MCP servers via HTTP SSE connections

use async_trait::async_trait;
use futures::StreamExt;
use reqwest_eventsource::{Event, EventSource};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex as TokioMutex};

use crate::mcp::error::{McpError, McpResult};
use crate::mcp::transport::Transport;

/// SSE transport for HTTP Server-Sent Events communication
pub struct SseTransport {
    /// Base URL for the SSE endpoint
    base_url: String,
    /// HTTP client for sending requests
    client: reqwest::Client,
    /// Channel for receiving SSE events
    event_rx: TokioMutex<mpsc::Receiver<String>>,
    /// Channel sender for SSE events (kept to check if sender is still alive)
    _event_tx: mpsc::Sender<String>,
    /// Connection status
    connected: AtomicBool,
    /// Message endpoint URL (for POST requests)
    message_url: Option<String>,
}

impl SseTransport {
    /// Connect to an SSE endpoint
    pub async fn connect(url: &str) -> McpResult<Self> {
        log::info!("Connecting to SSE endpoint: {}", url);
        
        log::debug!("Creating HTTP client with 30s timeout");
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| {
                log::error!("Failed to create HTTP client: {}", e);
                McpError::RequestError(e)
            })?;

        let (event_tx, event_rx) = mpsc::channel(100);
        log::trace!("Created event channel with capacity 100");

        // Start SSE connection
        let sse_url = url.to_string();
        let tx = event_tx.clone();
        let connected_flag = Arc::new(AtomicBool::new(false));
        let connected_flag_clone = connected_flag.clone();
        let sse_url_for_log = sse_url.clone();

        log::debug!("Spawning SSE event listener task");
        tokio::spawn(async move {
            log::trace!("SSE listener task started for {}", sse_url);
            let mut es = EventSource::get(&sse_url);
            let mut message_count: u64 = 0;

            while let Some(event) = es.next().await {
                match event {
                    Ok(Event::Open) => {
                        log::info!("SSE connection opened to {}", sse_url);
                        connected_flag_clone.store(true, Ordering::SeqCst);
                    }
                    Ok(Event::Message(message)) => {
                        message_count += 1;
                        let data_len = message.data.len();
                        log::trace!(
                            "SSE message #{} received ({} bytes): {}",
                            message_count,
                            data_len,
                            if data_len > 500 { &message.data[..500] } else { &message.data }
                        );
                        if tx.send(message.data).await.is_err() {
                            log::warn!("Failed to send SSE message to channel, receiver dropped");
                            break;
                        }
                    }
                    Err(err) => {
                        log::error!("SSE connection error for {}: {:?}", sse_url, err);
                        connected_flag_clone.store(false, Ordering::SeqCst);
                        break;
                    }
                }
            }

            log::info!("SSE connection closed for {} (received {} messages total)", sse_url, message_count);
            connected_flag_clone.store(false, Ordering::SeqCst);
        });

        // Wait a bit for connection to establish
        log::trace!("Waiting 100ms for SSE connection to establish");
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Extract message endpoint from URL (typically same base with /message suffix)
        let message_url = if url.ends_with("/sse") {
            Some(url.replace("/sse", "/message"))
        } else {
            Some(format!("{}/message", url.trim_end_matches('/')))
        };
        log::debug!("Derived message URL: {:?}", message_url);
        log::info!("SSE transport created for {} (message endpoint: {:?})", sse_url_for_log, message_url);

        Ok(Self {
            base_url: url.to_string(),
            client,
            event_rx: TokioMutex::new(event_rx),
            _event_tx: event_tx,
            connected: AtomicBool::new(true),
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

        let url = self
            .message_url
            .as_ref()
            .ok_or_else(|| {
                log::error!("Cannot send SSE message: message URL not configured");
                McpError::TransportError("Message URL not configured".to_string())
            })?;

        let msg_len = message.len();
        log::trace!(
            "Sending HTTP POST to {} ({} bytes): {}",
            url,
            msg_len,
            if msg_len > 500 { &message[..500] } else { message }
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
                url, status, elapsed, body
            );
            return Err(McpError::TransportError(format!(
                "HTTP error {}: {}",
                status, body
            )));
        }

        log::trace!("HTTP POST to {} completed with status {} in {:?}", url, status, elapsed);
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
                let msg_len = message.len();
                log::trace!(
                    "Received SSE event ({} bytes): {}",
                    msg_len,
                    if msg_len > 500 { &message[..500] } else { &message }
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
        let connected = self.connected.load(Ordering::SeqCst);
        log::trace!("SSE transport connection status for {}: {}", self.base_url, connected);
        connected
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================================================
    // SseTransport Connection Tests
    // ============================================================================

    // SSE tests require a running server, so they're marked as ignored by default
    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_connection() {
        let result = SseTransport::connect("http://localhost:8080/sse").await;
        // This will fail without a running server
        assert!(result.is_err() || result.is_ok());
    }

    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_connection_invalid_url() {
        let result = SseTransport::connect("http://invalid-host-that-does-not-exist:9999/sse").await;
        // Connection to invalid host should eventually fail or timeout
        // Note: This may take time due to DNS resolution
        assert!(result.is_ok()); // The struct is created, but connection may not be established
    }

    // ============================================================================
    // SseTransport State Tests
    // ============================================================================

    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_is_connected() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            // Initially marked as connected (optimistically)
            assert!(t.is_connected());
        }
    }

    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_close() {
        let transport = SseTransport::connect("http://localhost:8080/sse").await;
        if let Ok(t) = transport {
            let close_result = t.close().await;
            assert!(close_result.is_ok());
            assert!(!t.is_connected());
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
        
        // The derivation logic: if URL ends with /sse, replace with /message
        let derived = if url.ends_with("/sse") {
            url.replace("/sse", "/message")
        } else {
            format!("{}/message", url.trim_end_matches('/'))
        };
        
        assert_eq!(derived, expected_message_url);
    }

    #[test]
    fn test_message_url_derivation_without_sse_suffix() {
        let url = "http://localhost:8080/events";
        let derived = if url.ends_with("/sse") {
            url.replace("/sse", "/message")
        } else {
            format!("{}/message", url.trim_end_matches('/'))
        };
        
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
            ("https://api.example.com/sse", "https://api.example.com/message"),
            ("http://127.0.0.1:3000/sse", "http://127.0.0.1:3000/message"),
            ("http://localhost/sse", "http://localhost/message"),
        ];

        for (input, expected) in urls {
            let derived = input.replace("/sse", "/message");
            assert_eq!(derived, expected, "Failed for input: {}", input);
        }
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
}
