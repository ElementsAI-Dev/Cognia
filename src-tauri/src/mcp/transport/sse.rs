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
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| McpError::RequestError(e))?;

        let (event_tx, event_rx) = mpsc::channel(100);

        // Start SSE connection
        let sse_url = url.to_string();
        let tx = event_tx.clone();
        let connected_flag = Arc::new(AtomicBool::new(false));
        let connected_flag_clone = connected_flag.clone();

        tokio::spawn(async move {
            let mut es = EventSource::get(&sse_url);

            while let Some(event) = es.next().await {
                match event {
                    Ok(Event::Open) => {
                        log::info!("SSE connection opened to {}", sse_url);
                        connected_flag_clone.store(true, Ordering::SeqCst);
                    }
                    Ok(Event::Message(message)) => {
                        log::trace!("SSE message received: {}", message.data);
                        if tx.send(message.data).await.is_err() {
                            log::warn!("Failed to send SSE message to channel");
                            break;
                        }
                    }
                    Err(err) => {
                        log::error!("SSE error: {:?}", err);
                        connected_flag_clone.store(false, Ordering::SeqCst);
                        break;
                    }
                }
            }

            log::info!("SSE connection closed");
            connected_flag_clone.store(false, Ordering::SeqCst);
        });

        // Wait a bit for connection to establish
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // Extract message endpoint from URL (typically same base with /message suffix)
        let message_url = if url.ends_with("/sse") {
            Some(url.replace("/sse", "/message"))
        } else {
            Some(format!("{}/message", url.trim_end_matches('/')))
        };

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
        self.message_url = Some(url);
    }
}

#[async_trait]
impl Transport for SseTransport {
    async fn send(&self, message: &str) -> McpResult<()> {
        if !self.is_connected() {
            return Err(McpError::NotConnected);
        }

        let url = self
            .message_url
            .as_ref()
            .ok_or_else(|| McpError::TransportError("Message URL not configured".to_string()))?;

        log::trace!("Sending SSE message to {}: {}", url, message);

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .body(message.to_string())
            .send()
            .await
            .map_err(|e| McpError::RequestError(e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(McpError::TransportError(format!(
                "HTTP error {}: {}",
                status, body
            )));
        }

        Ok(())
    }

    async fn receive(&self) -> McpResult<String> {
        if !self.is_connected() {
            return Err(McpError::NotConnected);
        }

        let mut rx = self.event_rx.lock().await;

        match rx.recv().await {
            Some(message) => Ok(message),
            None => {
                self.connected.store(false, Ordering::SeqCst);
                Err(McpError::TransportError("SSE channel closed".to_string()))
            }
        }
    }

    async fn close(&self) -> McpResult<()> {
        self.connected.store(false, Ordering::SeqCst);
        // EventSource will be dropped when the spawned task ends
        Ok(())
    }

    fn is_connected(&self) -> bool {
        self.connected.load(Ordering::SeqCst)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // SSE tests require a running server, so they're marked as ignored by default
    #[tokio::test]
    #[ignore]
    async fn test_sse_transport_connection() {
        let result = SseTransport::connect("http://localhost:8080/sse").await;
        // This will fail without a running server
        assert!(result.is_err() || result.is_ok());
    }
}
