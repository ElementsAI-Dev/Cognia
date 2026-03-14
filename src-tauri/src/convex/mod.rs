//! Convex cloud database integration module
//!
//! Provides HTTP API client and WebSocket subscription support
//! for syncing local data with Convex cloud.

pub mod client;
pub mod config;
pub mod error;

use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use self::client::ConvexHttpClient;
use self::config::ConvexConfig;
use self::error::ConvexError;

/// Managed state for the Convex integration
pub struct ConvexState {
    config: Arc<RwLock<ConvexConfig>>,
    config_path: PathBuf,
    client: Arc<RwLock<Option<ConvexHttpClient>>>,
}

impl ConvexState {
    pub fn new(config_path: PathBuf) -> Self {
        let config = ConvexConfig::load(&config_path).unwrap_or_else(|e| {
            log::warn!("Failed to load convex config, using default: {}", e);
            ConvexConfig::default()
        });

        let client = if config.is_ready() {
            match ConvexHttpClient::new(&config) {
                Ok(c) => Some(c),
                Err(e) => {
                    log::warn!("Failed to create convex client: {}", e);
                    None
                }
            }
        } else {
            None
        };

        Self {
            config: Arc::new(RwLock::new(config)),
            config_path,
            client: Arc::new(RwLock::new(client)),
        }
    }

    pub async fn get_config(&self) -> ConvexConfig {
        self.config.read().await.clone()
    }

    pub async fn set_config(&self, new_config: ConvexConfig) -> Result<(), ConvexError> {
        new_config.save(&self.config_path)?;

        // Recreate client if config changed
        let client = if new_config.is_ready() {
            match ConvexHttpClient::new(&new_config) {
                Ok(c) => Some(c),
                Err(e) => {
                    log::warn!("Failed to create convex client: {}", e);
                    None
                }
            }
        } else {
            None
        };

        *self.client.write().await = client;
        *self.config.write().await = new_config;
        Ok(())
    }

    pub async fn test_connection(&self) -> Result<bool, ConvexError> {
        let client_guard = self.client.read().await;
        match client_guard.as_ref() {
            Some(client) => client.health_check().await,
            None => Err(ConvexError::Config(
                "Convex client not configured".to_string(),
            )),
        }
    }

    pub async fn is_connected(&self) -> bool {
        let client_guard = self.client.read().await;
        if client_guard.is_none() {
            return false;
        }
        match client_guard.as_ref().unwrap().health_check().await {
            Ok(healthy) => healthy,
            Err(_) => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convex_state_new_default() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("convex_config.json");
        let state = ConvexState::new(path);
        // Should not panic, client should be None since no config
        let rt = tokio::runtime::Runtime::new().unwrap();
        let config = rt.block_on(state.get_config());
        assert!(!config.enabled);
        assert!(!config.is_configured());
        assert!(!config.is_ready());
    }
}
