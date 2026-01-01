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
    use tempfile::TempDir;

    // ============================================================================
    // McpConfig Tests
    // ============================================================================

    #[test]
    fn test_config_new() {
        let config = McpConfig::new();
        assert!(config.mcp_servers.is_empty());
    }

    #[test]
    fn test_config_default() {
        let config = McpConfig::default();
        assert!(config.mcp_servers.is_empty());
    }

    #[test]
    fn test_config_set_server() {
        let mut config = McpConfig::new();
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Test Server".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(config.mcp_servers.len(), 1);
        assert!(config.mcp_servers.contains_key("test"));
    }

    #[test]
    fn test_config_set_server_overwrite() {
        let mut config = McpConfig::new();
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "First".to_string(),
                ..Default::default()
            },
        );
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Second".to_string(),
                ..Default::default()
            },
        );

        assert_eq!(config.mcp_servers.len(), 1);
        assert_eq!(config.get_server("test").unwrap().name, "Second");
    }

    #[test]
    fn test_config_remove_server() {
        let mut config = McpConfig::new();
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Test".to_string(),
                ..Default::default()
            },
        );

        let removed = config.remove_server("test");
        assert!(removed.is_some());
        assert_eq!(removed.unwrap().name, "Test");
        assert!(config.mcp_servers.is_empty());
    }

    #[test]
    fn test_config_remove_nonexistent_server() {
        let mut config = McpConfig::new();
        let removed = config.remove_server("nonexistent");
        assert!(removed.is_none());
    }

    #[test]
    fn test_config_get_server() {
        let mut config = McpConfig::new();
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Test".to_string(),
                ..Default::default()
            },
        );

        assert!(config.get_server("test").is_some());
        assert!(config.get_server("nonexistent").is_none());
    }

    #[test]
    fn test_config_server_ids() {
        let mut config = McpConfig::new();
        config.set_server("server1".to_string(), McpServerConfig::default());
        config.set_server("server2".to_string(), McpServerConfig::default());
        config.set_server("server3".to_string(), McpServerConfig::default());

        let ids: Vec<_> = config.server_ids().collect();
        assert_eq!(ids.len(), 3);
        assert!(ids.contains(&&"server1".to_string()));
        assert!(ids.contains(&&"server2".to_string()));
        assert!(ids.contains(&&"server3".to_string()));
    }

    #[test]
    fn test_config_servers() {
        let mut config = McpConfig::new();
        config.set_server(
            "s1".to_string(),
            McpServerConfig {
                name: "Server 1".to_string(),
                ..Default::default()
            },
        );
        config.set_server(
            "s2".to_string(),
            McpServerConfig {
                name: "Server 2".to_string(),
                ..Default::default()
            },
        );

        let servers: Vec<_> = config.servers().collect();
        assert_eq!(servers.len(), 2);
    }

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
    fn test_config_deserialization_with_defaults() {
        let json = r#"{"mcpServers": {"test": {"name": "Test"}}}"#;
        let config: McpConfig = serde_json::from_str(json).unwrap();
        
        let server = config.get_server("test").unwrap();
        assert_eq!(server.name, "Test");
        assert!(server.enabled); // default true
        assert!(!server.auto_start); // default false
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

    #[test]
    fn test_auto_start_with_multiple_enabled() {
        let mut config = McpConfig::new();

        config.set_server(
            "auto1".to_string(),
            McpServerConfig {
                name: "Auto 1".to_string(),
                auto_start: true,
                enabled: true,
                ..Default::default()
            },
        );

        config.set_server(
            "auto2".to_string(),
            McpServerConfig {
                name: "Auto 2".to_string(),
                auto_start: true,
                enabled: true,
                ..Default::default()
            },
        );

        let auto_start: Vec<_> = config.auto_start_servers().collect();
        assert_eq!(auto_start.len(), 2);
    }

    #[test]
    fn test_auto_start_empty_config() {
        let config = McpConfig::new();
        let auto_start: Vec<_> = config.auto_start_servers().collect();
        assert!(auto_start.is_empty());
    }

    // ============================================================================
    // McpConfigManager Tests
    // ============================================================================

    #[test]
    fn test_config_manager_new() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        assert_eq!(manager.config_path(), &temp_dir.path().join("mcp_servers.json"));
    }

    #[test]
    fn test_config_manager_get_config() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        let config = manager.get_config();
        assert!(config.mcp_servers.is_empty());
    }

    #[test]
    fn test_config_manager_set_server() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Test".to_string(),
                ..Default::default()
            },
        );

        let server = manager.get_server("test");
        assert!(server.is_some());
        assert_eq!(server.unwrap().name, "Test");
    }

    #[test]
    fn test_config_manager_remove_server() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server("test".to_string(), McpServerConfig::default());
        assert!(manager.has_server("test"));

        let removed = manager.remove_server("test");
        assert!(removed.is_some());
        assert!(!manager.has_server("test"));
    }

    #[test]
    fn test_config_manager_get_all_servers() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server("s1".to_string(), McpServerConfig::default());
        manager.set_server("s2".to_string(), McpServerConfig::default());

        let servers = manager.get_all_servers();
        assert_eq!(servers.len(), 2);
        assert!(servers.contains_key("s1"));
        assert!(servers.contains_key("s2"));
    }

    #[test]
    fn test_config_manager_has_server() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        assert!(!manager.has_server("test"));
        manager.set_server("test".to_string(), McpServerConfig::default());
        assert!(manager.has_server("test"));
    }

    #[test]
    fn test_config_manager_set_server_enabled() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server(
            "test".to_string(),
            McpServerConfig {
                enabled: true,
                ..Default::default()
            },
        );

        assert!(manager.set_server_enabled("test", false));
        assert!(!manager.get_server("test").unwrap().enabled);

        assert!(manager.set_server_enabled("test", true));
        assert!(manager.get_server("test").unwrap().enabled);
    }

    #[test]
    fn test_config_manager_set_server_enabled_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        assert!(!manager.set_server_enabled("nonexistent", true));
    }

    #[test]
    fn test_config_manager_set_server_auto_start() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server(
            "test".to_string(),
            McpServerConfig {
                auto_start: false,
                ..Default::default()
            },
        );

        assert!(manager.set_server_auto_start("test", true));
        assert!(manager.get_server("test").unwrap().auto_start);

        assert!(manager.set_server_auto_start("test", false));
        assert!(!manager.get_server("test").unwrap().auto_start);
    }

    #[test]
    fn test_config_manager_set_server_auto_start_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        assert!(!manager.set_server_auto_start("nonexistent", true));
    }

    #[test]
    fn test_config_manager_get_auto_start_servers() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server(
            "auto".to_string(),
            McpServerConfig {
                auto_start: true,
                enabled: true,
                ..Default::default()
            },
        );
        manager.set_server(
            "manual".to_string(),
            McpServerConfig {
                auto_start: false,
                enabled: true,
                ..Default::default()
            },
        );

        let auto_start = manager.get_auto_start_servers();
        assert_eq!(auto_start.len(), 1);
        assert_eq!(auto_start[0].0, "auto");
    }

    #[tokio::test]
    async fn test_config_manager_load_nonexistent_file() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        // Loading from nonexistent file should succeed with empty config
        let result = manager.load().await;
        assert!(result.is_ok());
        assert!(manager.get_config().mcp_servers.is_empty());
    }

    #[tokio::test]
    async fn test_config_manager_save_and_load() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "Test Server".to_string(),
                command: "test-cmd".to_string(),
                ..Default::default()
            },
        );

        // Save
        let save_result = manager.save().await;
        assert!(save_result.is_ok());

        // Create a new manager and load
        let manager2 = McpConfigManager::new(temp_dir.path().to_path_buf());
        let load_result = manager2.load().await;
        assert!(load_result.is_ok());

        let server = manager2.get_server("test");
        assert!(server.is_some());
        assert_eq!(server.unwrap().name, "Test Server");
    }

    #[tokio::test]
    async fn test_config_manager_load_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("mcp_servers.json");
        
        // Write invalid JSON
        std::fs::write(&config_path, "invalid json content").unwrap();

        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        let result = manager.load().await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_config_manager_save_creates_directory() {
        let temp_dir = TempDir::new().unwrap();
        let nested_path = temp_dir.path().join("nested").join("dir");
        let manager = McpConfigManager::new(nested_path.clone());
        
        manager.set_server("test".to_string(), McpServerConfig::default());
        
        let result = manager.save().await;
        assert!(result.is_ok());
        assert!(nested_path.join("mcp_servers.json").exists());
    }

    // ============================================================================
    // Edge Cases
    // ============================================================================

    #[test]
    fn test_config_with_special_characters_in_id() {
        let mut config = McpConfig::new();
        config.set_server(
            "server-with-special_chars.123".to_string(),
            McpServerConfig::default(),
        );

        assert!(config.get_server("server-with-special_chars.123").is_some());
    }

    #[test]
    fn test_config_with_unicode_server_name() {
        let mut config = McpConfig::new();
        config.set_server(
            "test".to_string(),
            McpServerConfig {
                name: "测试服务器 🚀".to_string(),
                ..Default::default()
            },
        );

        let json = serde_json::to_string(&config).unwrap();
        let parsed: McpConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.get_server("test").unwrap().name, "测试服务器 🚀");
    }

    #[test]
    fn test_config_with_empty_string_id() {
        let mut config = McpConfig::new();
        config.set_server(String::new(), McpServerConfig::default());

        assert!(config.get_server("").is_some());
    }

    #[test]
    fn test_config_concurrent_read_access() {
        let temp_dir = TempDir::new().unwrap();
        let manager = McpConfigManager::new(temp_dir.path().to_path_buf());
        
        manager.set_server("test".to_string(), McpServerConfig::default());

        // Multiple concurrent reads should work
        let config1 = manager.get_config();
        let config2 = manager.get_config();
        
        assert_eq!(config1.mcp_servers.len(), config2.mcp_servers.len());
    }
}
