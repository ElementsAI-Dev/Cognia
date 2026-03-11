//! Streamable HTTP transport implementation for MCP
//!
//! This transport currently reuses the proven SSE message pump and POST channel
//! semantics while exposing a dedicated connection mode for modern remote MCP
//! endpoints and deterministic fallback orchestration.

use async_trait::async_trait;

use crate::mcp::error::McpResult;
use crate::mcp::transport::sse::SseTransport;
use crate::mcp::transport::Transport;

/// Streamable HTTP transport wrapper.
///
/// Internally it delegates to `SseTransport` for receive/send behavior. This
/// keeps runtime behavior stable while allowing manager-level selection and
/// fallback policy to distinguish streamable HTTP from legacy SSE.
pub struct StreamableHttpTransport {
    inner: SseTransport,
}

impl StreamableHttpTransport {
    /// Connect to a streamable HTTP endpoint without proxy.
    pub async fn connect(url: &str) -> McpResult<Self> {
        Self::connect_with_proxy(url, None).await
    }

    /// Connect to a streamable HTTP endpoint with optional proxy support.
    pub async fn connect_with_proxy(url: &str, proxy_url: Option<&str>) -> McpResult<Self> {
        let inner = SseTransport::connect_with_proxy(url, proxy_url).await?;
        Ok(Self { inner })
    }

    /// Override the message endpoint URL.
    pub fn set_message_url(&mut self, url: String) {
        self.inner.set_message_url(url);
    }
}

#[async_trait]
impl Transport for StreamableHttpTransport {
    async fn send(&self, message: &str) -> McpResult<()> {
        self.inner.send(message).await
    }

    async fn receive(&self) -> McpResult<String> {
        self.inner.receive().await
    }

    async fn close(&self) -> McpResult<()> {
        self.inner.close().await
    }

    fn is_connected(&self) -> bool {
        self.inner.is_connected()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::transport::Transport;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use tokio::time::{timeout, Duration};

    #[test]
    fn test_streamable_http_type_exists() {
        // Compile-time sanity check for the wrapper type.
        let _ = std::mem::size_of::<StreamableHttpTransport>();
    }

    async fn read_http_request(stream: &mut tokio::net::TcpStream) -> String {
        let mut buffer = vec![0_u8; 4096];
        let mut request = String::new();
        loop {
            let bytes_read = stream.read(&mut buffer).await.unwrap();
            if bytes_read == 0 {
                break;
            }
            request.push_str(&String::from_utf8_lossy(&buffer[..bytes_read]));
            if request.contains("\r\n\r\n") {
                break;
            }
        }
        request
    }

    #[tokio::test]
    async fn test_streamable_http_transport_handshake_and_send() {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();

        tokio::spawn(async move {
            for _ in 0..2 {
                let (mut socket, _) = listener.accept().await.unwrap();
                tokio::spawn(async move {
                    let request = read_http_request(&mut socket).await;
                    if request.starts_with("GET /sse ") {
                        let response = concat!(
                            "HTTP/1.1 200 OK\r\n",
                            "Content-Type: text/event-stream\r\n",
                            "Cache-Control: no-cache\r\n",
                            "Connection: keep-alive\r\n",
                            "\r\n",
                            "data: {\"jsonrpc\":\"2.0\",\"method\":\"ping\"}\n\n"
                        );
                        socket.write_all(response.as_bytes()).await.unwrap();
                        tokio::time::sleep(Duration::from_millis(600)).await;
                    } else if request.starts_with("POST /message ") {
                        let response = concat!(
                            "HTTP/1.1 200 OK\r\n",
                            "Content-Type: text/plain\r\n",
                            "Content-Length: 2\r\n",
                            "Connection: close\r\n",
                            "\r\n",
                            "ok"
                        );
                        socket.write_all(response.as_bytes()).await.unwrap();
                    } else {
                        let response = concat!(
                            "HTTP/1.1 404 Not Found\r\n",
                            "Content-Length: 0\r\n",
                            "Connection: close\r\n",
                            "\r\n"
                        );
                        socket.write_all(response.as_bytes()).await.unwrap();
                    }
                });
            }
        });

        let sse_url = format!("http://{}/sse", address);
        let message_url = format!("http://{}/message", address);
        let mut transport = StreamableHttpTransport::connect(&sse_url).await.unwrap();
        transport.set_message_url(message_url);

        let received = timeout(Duration::from_secs(3), transport.receive())
            .await
            .expect("timed out waiting for streamable HTTP message")
            .expect("failed to receive streamable HTTP message");
        assert!(received.contains("\"jsonrpc\":\"2.0\""));

        transport
            .send(r#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#)
            .await
            .expect("failed to POST streamable HTTP payload");
    }
}
