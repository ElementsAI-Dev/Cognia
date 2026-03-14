//! Convex error types

#[derive(Debug, thiserror::Error)]
pub enum ConvexError {
    #[error("HTTP error: {0}")]
    Http(String),

    #[error("Connection error: {0}")]
    #[allow(dead_code)]
    Connection(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Authentication error: {0}")]
    #[allow(dead_code)]
    Auth(String),

    #[error("Lock error: {0}")]
    #[allow(dead_code)]
    Lock(String),

    #[error("Subscriber error: {0}")]
    #[allow(dead_code)]
    Subscriber(String),
}

impl From<reqwest::Error> for ConvexError {
    fn from(err: reqwest::Error) -> Self {
        ConvexError::Http(err.to_string())
    }
}

impl From<serde_json::Error> for ConvexError {
    fn from(err: serde_json::Error) -> Self {
        ConvexError::Serialization(err.to_string())
    }
}
