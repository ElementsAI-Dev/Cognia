//! Convex configuration management
//!
//! Persists Convex deployment configuration to a JSON file
//! in the app data directory (same pattern as sandbox config).

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use super::error::ConvexError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvexConfig {
    pub deployment_url: String,
    /// Deploy key is stored in Stronghold/KV store, not persisted to config file.
    /// This field is populated at runtime from the credential store.
    #[serde(skip)]
    pub deploy_key: String,
    pub enabled: bool,
    pub sync_interval_secs: u64,
}

impl Default for ConvexConfig {
    fn default() -> Self {
        Self {
            deployment_url: String::new(),
            deploy_key: String::new(),
            enabled: false,
            sync_interval_secs: 900, // 15 minutes
        }
    }
}

impl ConvexConfig {
    pub fn load(path: &PathBuf) -> Result<Self, ConvexError> {
        if !path.exists() {
            let config = Self::default();
            config.save(path)?;
            return Ok(config);
        }

        let content = std::fs::read_to_string(path)
            .map_err(|e| ConvexError::Config(format!("Failed to read config: {}", e)))?;

        serde_json::from_str(&content).map_err(|e| {
            log::warn!("Invalid convex config, using default: {}", e);
            ConvexError::Config(e.to_string())
        })
    }

    pub fn save(&self, path: &PathBuf) -> Result<(), ConvexError> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| ConvexError::Config(format!("Failed to create config dir: {}", e)))?;
        }

        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)
            .map_err(|e| ConvexError::Config(format!("Failed to write config: {}", e)))?;

        Ok(())
    }

    pub fn is_configured(&self) -> bool {
        self.enabled && !self.deployment_url.is_empty()
    }

    /// Check if fully ready to connect (has both URL and deploy key)
    pub fn is_ready(&self) -> bool {
        !self.deployment_url.is_empty() && !self.deploy_key.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ConvexConfig::default();
        assert!(!config.enabled);
        assert!(config.deployment_url.is_empty());
        assert!(!config.is_configured());
    }

    #[test]
    fn test_is_configured() {
        let mut config = ConvexConfig::default();
        assert!(!config.is_configured());

        config.deployment_url = "https://example.convex.cloud".to_string();
        assert!(!config.is_configured()); // not enabled yet

        config.enabled = true;
        assert!(config.is_configured());
    }

    #[test]
    fn test_is_ready() {
        let mut config = ConvexConfig::default();
        assert!(!config.is_ready());

        config.deployment_url = "https://example.convex.cloud".to_string();
        assert!(!config.is_ready());

        config.deploy_key = "prod:key123".to_string();
        assert!(config.is_ready());
    }

    #[test]
    fn test_save_and_load() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("convex_config.json");

        let config = ConvexConfig {
            deployment_url: "https://test.convex.cloud".to_string(),
            deploy_key: "prod:test_key".to_string(),
            enabled: true,
            sync_interval_secs: 300,
        };

        config.save(&path).unwrap();
        let loaded = ConvexConfig::load(&path).unwrap();

        assert_eq!(loaded.deployment_url, config.deployment_url);
        // deploy_key is #[serde(skip)], should not be persisted
        assert!(loaded.deploy_key.is_empty());
        assert_eq!(loaded.enabled, config.enabled);
        assert_eq!(loaded.sync_interval_secs, config.sync_interval_secs);
    }
}
