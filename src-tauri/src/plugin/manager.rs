//! Plugin Manager
//!
//! Handles plugin discovery, installation, and lifecycle management.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

use super::types::*;
use super::python::PythonRuntime;

/// Plugin Manager - manages all plugins
pub struct PluginManager {
    /// Plugin directory
    plugin_dir: PathBuf,
    /// Installed plugins
    plugins: Arc<RwLock<HashMap<String, PluginState>>>,
    /// Python runtime (optional)
    python_runtime: Option<Arc<RwLock<PythonRuntime>>>,
}

impl PluginManager {
    /// Create a new plugin manager
    pub fn new(plugin_dir: PathBuf) -> Self {
        // Ensure plugin directory exists
        if !plugin_dir.exists() {
            std::fs::create_dir_all(&plugin_dir).ok();
        }

        Self {
            plugin_dir,
            plugins: Arc::new(RwLock::new(HashMap::new())),
            python_runtime: None,
        }
    }

    /// Initialize Python runtime
    pub async fn initialize_python(&mut self, python_path: Option<String>) -> PluginResult<()> {
        let runtime = PythonRuntime::new(python_path)?;
        self.python_runtime = Some(Arc::new(RwLock::new(runtime)));
        Ok(())
    }

    /// Scan plugin directory for plugins
    pub async fn scan_plugins(&self) -> PluginResult<Vec<PluginScanResult>> {
        let mut results = Vec::new();

        // Read plugin directory
        let entries = std::fs::read_dir(&self.plugin_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();
            
            // Skip if not a directory
            if !path.is_dir() {
                continue;
            }

            // Look for plugin.json or package.json
            let manifest_path = path.join("plugin.json");
            let package_path = path.join("package.json");

            let manifest_file = if manifest_path.exists() {
                manifest_path
            } else if package_path.exists() {
                package_path
            } else {
                continue;
            };

            // Parse manifest
            match self.parse_manifest(&manifest_file) {
                Ok(manifest) => {
                    results.push(PluginScanResult {
                        manifest,
                        path: path.to_string_lossy().to_string(),
                    });
                }
                Err(e) => {
                    log::warn!("Failed to parse manifest at {:?}: {}", manifest_file, e);
                }
            }
        }

        Ok(results)
    }

    /// Parse plugin manifest file
    fn parse_manifest(&self, path: &Path) -> PluginResult<PluginManifest> {
        let content = std::fs::read_to_string(path)?;
        let manifest: PluginManifest = serde_json::from_str(&content)?;
        
        // Validate manifest
        self.validate_manifest(&manifest)?;
        
        Ok(manifest)
    }

    /// Validate plugin manifest
    fn validate_manifest(&self, manifest: &PluginManifest) -> PluginResult<()> {
        // Check required fields
        if manifest.id.is_empty() {
            return Err(PluginError::InvalidManifest("Missing plugin ID".to_string()));
        }

        if manifest.name.is_empty() {
            return Err(PluginError::InvalidManifest("Missing plugin name".to_string()));
        }

        if manifest.version.is_empty() {
            return Err(PluginError::InvalidManifest("Missing plugin version".to_string()));
        }

        // Validate ID format (lowercase, alphanumeric, hyphens, dots, underscores)
        if !manifest.id.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '.' || c == '_') {
            return Err(PluginError::InvalidManifest(format!(
                "Invalid plugin ID '{}': must be lowercase alphanumeric with hyphens, dots, or underscores",
                manifest.id
            )));
        }

        // Validate entry points based on type
        match manifest.plugin_type {
            PluginType::Frontend => {
                if manifest.main.is_none() {
                    return Err(PluginError::InvalidManifest(
                        "Frontend plugin must have 'main' entry point".to_string()
                    ));
                }
            }
            PluginType::Python => {
                if manifest.python_main.is_none() {
                    return Err(PluginError::InvalidManifest(
                        "Python plugin must have 'pythonMain' entry point".to_string()
                    ));
                }
            }
            PluginType::Hybrid => {
                // Hybrid can have either or both
            }
        }

        Ok(())
    }

    /// Install a plugin from source
    pub async fn install_plugin(&self, options: PluginInstallOptions) -> PluginResult<PluginScanResult> {
        let source_path = PathBuf::from(&options.source);
        
        // Determine installation method
        match options.install_type.as_str() {
            "local" => self.install_from_local(&source_path).await,
            "git" => self.install_from_git(&options.source).await,
            "marketplace" => self.install_from_marketplace(&options.source).await,
            _ => Err(PluginError::InvalidManifest(format!(
                "Unknown install type: {}",
                options.install_type
            ))),
        }
    }

    /// Install from local directory
    async fn install_from_local(&self, source: &Path) -> PluginResult<PluginScanResult> {
        // Parse manifest from source
        let manifest_path = source.join("plugin.json");
        let package_path = source.join("package.json");

        let manifest_file = if manifest_path.exists() {
            manifest_path
        } else if package_path.exists() {
            package_path
        } else {
            return Err(PluginError::InvalidManifest(
                "No plugin.json or package.json found".to_string()
            ));
        };

        let manifest = self.parse_manifest(&manifest_file)?;

        // Check if plugin already exists
        let dest_path = self.plugin_dir.join(&manifest.id);
        if dest_path.exists() {
            return Err(PluginError::AlreadyExists(manifest.id.clone()));
        }

        // Copy plugin to plugin directory
        self.copy_dir_recursive(source, &dest_path)?;

        Ok(PluginScanResult {
            manifest,
            path: dest_path.to_string_lossy().to_string(),
        })
    }

    /// Install from git repository
    async fn install_from_git(&self, _url: &str) -> PluginResult<PluginScanResult> {
        // TODO: Implement git clone
        Err(PluginError::InvalidManifest(
            "Git installation not yet implemented".to_string()
        ))
    }

    /// Install from marketplace
    async fn install_from_marketplace(&self, _id: &str) -> PluginResult<PluginScanResult> {
        // TODO: Implement marketplace download
        Err(PluginError::InvalidManifest(
            "Marketplace installation not yet implemented".to_string()
        ))
    }

    /// Copy directory recursively
    fn copy_dir_recursive(&self, src: &Path, dst: &Path) -> PluginResult<()> {
        std::fs::create_dir_all(dst)?;

        for entry in std::fs::read_dir(src)? {
            let entry = entry?;
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());

            if src_path.is_dir() {
                self.copy_dir_recursive(&src_path, &dst_path)?;
            } else {
                std::fs::copy(&src_path, &dst_path)?;
            }
        }

        Ok(())
    }

    /// Uninstall a plugin
    pub async fn uninstall_plugin(&self, plugin_id: &str, plugin_path: &str) -> PluginResult<()> {
        // Remove plugin state
        {
            let mut plugins = self.plugins.write().await;
            plugins.remove(plugin_id);
        }

        // Remove plugin directory
        let path = PathBuf::from(plugin_path);
        if path.exists() {
            std::fs::remove_dir_all(path)?;
        }

        Ok(())
    }

    /// Load a Python plugin
    pub async fn load_python_plugin(
        &self,
        plugin_id: &str,
        plugin_path: &str,
        main_module: &str,
        dependencies: Option<Vec<String>>,
    ) -> PluginResult<()> {
        let runtime = self.python_runtime.as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let mut runtime = runtime.write().await;

        // Install dependencies if any
        if let Some(deps) = dependencies {
            runtime.install_dependencies(&deps).await?;
        }

        // Load the plugin module
        runtime.load_plugin(plugin_id, plugin_path, main_module).await?;

        Ok(())
    }

    /// Get tools from a Python plugin
    pub async fn get_python_tools(&self, plugin_id: &str) -> PluginResult<Vec<PythonToolRegistration>> {
        let runtime = self.python_runtime.as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        runtime.get_plugin_tools(plugin_id).await
    }

    /// Call a Python plugin tool
    pub async fn call_python_tool(
        &self,
        plugin_id: &str,
        tool_name: &str,
        args: serde_json::Value,
    ) -> PluginResult<serde_json::Value> {
        let runtime = self.python_runtime.as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        runtime.call_tool(plugin_id, tool_name, args).await
    }

    /// Call a Python function
    pub async fn call_python_function(
        &self,
        plugin_id: &str,
        function_name: &str,
        args: Vec<serde_json::Value>,
    ) -> PluginResult<serde_json::Value> {
        let runtime = self.python_runtime.as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        runtime.call_function(plugin_id, function_name, args).await
    }

    /// Evaluate Python code
    pub async fn eval_python(
        &self,
        plugin_id: &str,
        code: &str,
        locals: serde_json::Value,
    ) -> PluginResult<serde_json::Value> {
        let runtime = self.python_runtime.as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        runtime.eval_code(plugin_id, code, locals).await
    }

    /// Get plugin state
    pub async fn get_plugin(&self, plugin_id: &str) -> Option<PluginState> {
        let plugins = self.plugins.read().await;
        plugins.get(plugin_id).cloned()
    }

    /// Get all plugins
    pub async fn get_all_plugins(&self) -> Vec<PluginState> {
        let plugins = self.plugins.read().await;
        plugins.values().cloned().collect()
    }

}
