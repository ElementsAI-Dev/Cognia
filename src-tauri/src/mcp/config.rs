//! MCP Configuration management
//!
//! Handles loading and saving MCP server configurations

use std::collections::HashMap;
use std::path::PathBuf;

use crate::mcp::error::{McpError, McpResult};
use crate::mcp::types::McpServerConfig;

/// Complete MCP configuration file structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpConfig {
    /// Map of server ID to server configuration
    #[serde(default)]
    pub mcp_servers: HashMap<String, McpServerConfig>,
}

impl McpConfig {
    /// Create an empty configuration
    pub fn new() -> Self {
        Self::default()
    }

    /// Add or update a server configuration
    pub fn set_server(&mut self, id: String, config: McpServerConfig) {
        self.mcp_servers.insert(id, config);
    }

    /// Remove a server configuration
    pub fn remove_server(&mut self, id: &str) -> Option<McpServerConfig> {
        self.mcp_servers.remove(id)
    }

    /// Get a server configuration
    pub fn get_server(&self, id: &str) -> Option<&McpServerConfig> {
        self.mcp_servers.get(id)
    }

    /// Get all server IDs
    pub fn server_ids(&self) -> impl Iterator<Item = &String> {
        self.mcp_servers.keys()
    }

    /// Get all servers
    pub fn servers(&self) -> impl Iterator<Item = (&String, &McpServerConfig)> {
        self.mcp_servers.iter()
    }

    /// Get servers marked for auto-start
    pub fn auto_start_servers(&self) -> impl Iterator<Item = (&String, &McpServerConfig)> {
        self.mcp_servers
            .iter()
            .filter(|(_, config)| config.auto_start && config.enabled)
    }
}

/// Configuration manager for MCP settings
pub struct McpConfigManager {
    /// Path to the configuration file
    config_path: PathBuf,
    /// Current configuration
    config: parking_lot::RwLock<McpConfig>,
}

impl McpConfigManager {
    /// Create a new configuration manager
    pub fn new(app_data_dir: PathBuf) -> Self {
        let config_path = app_data_dir.join("mcp_servers.json");
        Self {
            config_path,
            config: parking_lot::RwLock::new(McpConfig::new()),
        }
    }

    /// Get the configuration file path
    pub fn config_path(&self) -> &PathBuf {
        &self.config_path
    }

    /// Load configuration from disk
    pub async fn load(&self) -> McpResult<()> {
        if !self.config_path.exists() {
            log::info!("No MCP config file found, using defaults");
            return Ok(());
        }

        let content = tokio::fs::read_to_string(&self.config_path)
            .await
            .map_err(|e| McpError::ConfigPathError(format!("Failed to read config: {}", e)))?;

        let config: McpConfig = serde_json::from_str(&content).map_err(|e| {
            McpError::ConfigPathError(format!("Failed to parse config: {}", e))
        })?;

        log::info!(
            "Loaded MCP config with {} servers",
            config.mcp_servers.len()
        );

        *self.config.write() = config;
        Ok(())
    }

    /// Save configuration to disk
    pub async fn save(&self) -> McpResult<()> {
        // Ensure parent directory exists
        if let Some(parent) = self.config_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                McpError::ConfigPathError(format!("Failed to create config directory: {}", e))
            })?;
        }

        let config = self.config.read().clone();
        let content = serde_json::to_string_pretty(&config)?;

        tokio::fs::write(&self.config_path, content)
            .await
            .map_err(|e| McpError::ConfigPathError(format!("Failed to write config: {}", e)))?;

        log::info!("Saved MCP config to {:?}", self.config_path);
        Ok(())
    }

    /// Get a copy of the current configuration
    pub fn get_config(&self) -> McpConfig {
        self.config.read().clone()
    }

    /// Add or update a server
    pub fn set_server(&self, id: String, config: McpServerConfig) {
        self.config.write().set_server(id, config);
    }

    /// Remove a server
    pub fn remove_server(&self, id: &str) -> Option<McpServerConfig> {
        self.config.write().remove_server(id)
    }

    /// Get a server configuration
    pub fn get_server(&self, id: &str) -> Option<McpServerConfig> {
        self.config.read().get_server(id).cloned()
    }

    /// Get all server configurations
    pub fn get_all_servers(&self) -> HashMap<String, McpServerConfig> {
        self.config.read().mcp_servers.clone()
    }

    /// Get servers marked for auto-start
    pub fn get_auto_start_servers(&self) -> Vec<(String, McpServerConfig)> {
        self.config
            .read()
            .auto_start_servers()
            .map(|(id, config)| (id.clone(), config.clone()))
            .collect()
    }

    /// Check if a server exists
    pub fn has_server(&self, id: &str) -> bool {
        self.config.read().mcp_servers.contains_key(id)
    }

    /// Update a server's enabled status
    pub fn set_server_enabled(&self, id: &str, enabled: bool) -> bool {
        let mut config = self.config.write();
        if let Some(server) = config.mcp_servers.get_mut(id) {
            server.enabled = enabled;
            true
        } else {
            false
        }
    }

    /// Update a server's auto-start status
    pub fn set_server_auto_start(&self, id: &str, auto_start: bool) -> bool {
        let mut config = self.config.write();
        if let Some(server) = config.mcp_servers.get_mut(id) {
            server.auto_start = auto_start;
            true
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::types::McpConnectionType;

    #[test]
    fn test_config_serialization() {
        let mut config = McpConfig::new();
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Test Server".to_string(),
                command: "npx".to_string(),
                args: vec!["-y".to_string(), "@test/mcp-server".to_string()],
                env: HashMap::new(),
                connection_type: McpConnectionType::Stdio,
                url: None,
                enabled: true,
                auto_start: false,
            },
        );

        let json = serde_json::to_string_pretty(&config).unwrap();
        assert!(json.contains("Test Server"));
        assert!(json.contains("npx"));

        let parsed: McpConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.mcp_servers.len(), 1);
        assert!(parsed.mcp_servers.contains_key("test"));
    }

    #[test]
    fn test_auto_start_filtering() {
        let mut config = McpConfig::new();

        config.set_server(
            "auto1".to_string(),
            McpServerConfig {
                name: "Auto Start 1".to_string(),
                auto_start: true,
                enabled: true,
                ..Default::default()
            },
        );

        config.set_server(
            "manual".to_string(),
            McpServerConfig {
                name: "Manual".to_string(),
                auto_start: false,
                enabled: true,
                ..Default::default()
            },
        );

        config.set_server(
            "disabled".to_string(),
            McpServerConfig {
                name: "Disabled".to_string(),
                auto_start: true,
                enabled: false,
                ..Default::default()
            },
        );

        let auto_start: Vec<_> = config.auto_start_servers().collect();
        assert_eq!(auto_start.len(), 1);
        assert_eq!(auto_start[0].0, "auto1");
    }
}
