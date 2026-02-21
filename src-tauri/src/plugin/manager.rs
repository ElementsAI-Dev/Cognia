//! Plugin Manager
//!
//! Handles plugin discovery, installation, and lifecycle management.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use tokio::sync::RwLock;

use super::python::PythonRuntime;
use super::types::*;

/// Plugin Manager - manages all plugins
pub struct PluginManager {
    /// Plugin directory
    plugin_dir: PathBuf,
    /// Plugin runtime root directory
    runtime_root: PathBuf,
    /// Persisted plugin index path
    state_file: PathBuf,
    /// Installed plugins
    plugins: Arc<RwLock<HashMap<String, PluginState>>>,
    /// Explicit runtime permission grants (canonical permission names)
    permission_grants: Arc<RwLock<HashMap<String, HashSet<String>>>>,
    /// Python runtime (optional)
    python_runtime: Option<Arc<RwLock<PythonRuntime>>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, Default)]
struct PluginStateIndex {
    plugins: Vec<PluginState>,
    #[serde(default)]
    permission_grants: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginRuntimeDirs {
    pub root: String,
    pub data: String,
    pub cache: String,
    pub temp: String,
    pub db: String,
    pub secrets: String,
    pub backups: String,
}

impl PluginManager {
    /// Create a new plugin manager
    pub fn new(plugin_dir: PathBuf) -> Self {
        // Ensure plugin directory exists
        if !plugin_dir.exists() {
            std::fs::create_dir_all(&plugin_dir).ok();
        }

        let runtime_root = plugin_dir
            .parent()
            .unwrap_or(plugin_dir.as_path())
            .join("plugins_runtime");
        if !runtime_root.exists() {
            std::fs::create_dir_all(&runtime_root).ok();
        }

        let state_file = plugin_dir.join(".plugin-index.json");

        let mut plugins_map: HashMap<String, PluginState> = HashMap::new();
        let mut grants_map: HashMap<String, HashSet<String>> = HashMap::new();
        if state_file.exists() {
            if let Ok(raw) = std::fs::read_to_string(&state_file) {
                if let Ok(index) = serde_json::from_str::<PluginStateIndex>(&raw) {
                    for plugin in index.plugins {
                        plugins_map.insert(plugin.manifest.id.clone(), plugin);
                    }
                    for (plugin_id, permissions) in index.permission_grants {
                        grants_map.insert(plugin_id, permissions.into_iter().collect());
                    }
                }
            }
        }

        Self {
            plugin_dir,
            runtime_root,
            state_file,
            plugins: Arc::new(RwLock::new(plugins_map)),
            permission_grants: Arc::new(RwLock::new(grants_map)),
            python_runtime: None,
        }
    }
    pub fn plugin_dir(&self) -> PathBuf {
        self.plugin_dir.clone()
    }

    async fn persist_index(&self) -> PluginResult<()> {
        let plugins = self.plugins.read().await;
        let grants = self.permission_grants.read().await;
        let index = PluginStateIndex {
            plugins: plugins.values().cloned().collect(),
            permission_grants: grants
                .iter()
                .map(|(k, v)| (k.clone(), v.iter().cloned().collect()))
                .collect(),
        };
        let encoded = serde_json::to_string_pretty(&index)?;
        std::fs::write(&self.state_file, encoded)?;
        Ok(())
    }

    fn now_iso8601() -> String {
        chrono::Utc::now().to_rfc3339()
    }

    pub async fn ensure_plugin_runtime_dirs(
        &self,
        plugin_id: &str,
    ) -> PluginResult<PluginRuntimeDirs> {
        let root = self.runtime_root.join(plugin_id);
        let data = root.join("data");
        let cache = root.join("cache");
        let temp = root.join("temp");
        let db = root.join("db");
        let secrets = root.join("secrets");
        let backups = root.join("backups");

        for dir in [&root, &data, &cache, &temp, &db, &secrets, &backups] {
            std::fs::create_dir_all(dir)?;
        }

        Ok(PluginRuntimeDirs {
            root: root.to_string_lossy().to_string(),
            data: data.to_string_lossy().to_string(),
            cache: cache.to_string_lossy().to_string(),
            temp: temp.to_string_lossy().to_string(),
            db: db.to_string_lossy().to_string(),
            secrets: secrets.to_string_lossy().to_string(),
            backups: backups.to_string_lossy().to_string(),
        })
    }

    pub async fn set_plugin_status(
        &self,
        plugin_id: &str,
        status: PluginStatus,
    ) -> PluginResult<()> {
        {
            let mut plugins = self.plugins.write().await;
            let plugin = plugins
                .get_mut(plugin_id)
                .ok_or_else(|| PluginError::NotFound(plugin_id.to_string()))?;
            plugin.status = status.clone();
            match status {
                PluginStatus::Installed => {
                    if plugin.installed_at.is_none() {
                        plugin.installed_at = Some(Self::now_iso8601());
                    }
                }
                PluginStatus::Enabled => {
                    plugin.enabled_at = Some(Self::now_iso8601());
                }
                _ => {}
            }
        }
        self.persist_index().await?;
        Ok(())
    }

    pub async fn grant_permission(&self, plugin_id: &str, permission: &str) -> PluginResult<()> {
        {
            let mut grants = self.permission_grants.write().await;
            grants
                .entry(plugin_id.to_string())
                .or_default()
                .insert(permission.to_string());
        }
        self.persist_index().await?;
        Ok(())
    }

    pub async fn revoke_permission(&self, plugin_id: &str, permission: &str) -> PluginResult<()> {
        {
            let mut grants = self.permission_grants.write().await;
            if let Some(perms) = grants.get_mut(plugin_id) {
                perms.remove(permission);
            }
        }
        self.persist_index().await?;
        Ok(())
    }

    pub async fn list_permissions(&self, plugin_id: &str) -> Vec<String> {
        let grants = self.permission_grants.read().await;
        grants
            .get(plugin_id)
            .map(|perms| perms.iter().cloned().collect())
            .unwrap_or_default()
    }

    pub async fn has_permission(&self, plugin_id: &str, permission: &str) -> bool {
        let grants = self.permission_grants.read().await;
        grants
            .get(plugin_id)
            .map(|perms| perms.contains(permission))
            .unwrap_or(false)
    }

    fn find_manifest_file(repo_dir: &Path) -> PluginResult<PathBuf> {
        let root_plugin = repo_dir.join("plugin.json");
        if root_plugin.exists() {
            return Ok(root_plugin);
        }
        let root_package = repo_dir.join("package.json");
        if root_package.exists() {
            return Ok(root_package);
        }

        fn walk(dir: &Path) -> PluginResult<Option<PathBuf>> {
            for entry in std::fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();

                if path.is_dir() {
                    if entry.file_name() == ".git" {
                        continue;
                    }
                    if let Some(found) = walk(&path)? {
                        return Ok(Some(found));
                    }
                    continue;
                }

                if entry.file_name() == "plugin.json" || entry.file_name() == "package.json" {
                    return Ok(Some(path));
                }
            }
            Ok(None)
        }

        if let Some(found) = walk(repo_dir)? {
            return Ok(found);
        }

        Err(PluginError::InvalidManifest(
            "No plugin.json or package.json found".to_string(),
        ))
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

        // Keep plugin states in sync with discovered manifests.
        {
            let mut plugins = self.plugins.write().await;
            for result in &results {
                let id = result.manifest.id.clone();
                let existing = plugins.get(&id).cloned();
                let mut state = existing.unwrap_or(PluginState {
                    manifest: result.manifest.clone(),
                    status: PluginStatus::Installed,
                    path: result.path.clone(),
                    config: serde_json::json!({}),
                    error: None,
                    installed_at: Some(Self::now_iso8601()),
                    enabled_at: None,
                });
                state.manifest = result.manifest.clone();
                state.path = result.path.clone();
                plugins.insert(id, state);
            }
        }
        self.persist_index().await?;

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
            return Err(PluginError::InvalidManifest(
                "Missing plugin ID".to_string(),
            ));
        }

        if manifest.name.is_empty() {
            return Err(PluginError::InvalidManifest(
                "Missing plugin name".to_string(),
            ));
        }

        if manifest.version.is_empty() {
            return Err(PluginError::InvalidManifest(
                "Missing plugin version".to_string(),
            ));
        }

        // Validate semver format (basic check: at least X.Y.Z pattern)
        {
            let parts: Vec<&str> = manifest.version.split('.').collect();
            if parts.len() < 2
                || !parts.iter().all(|p| {
                    p.chars()
                        .all(|c| c.is_ascii_digit() || c == '-' || c.is_ascii_alphanumeric())
                })
            {
                return Err(PluginError::InvalidManifest(format!(
                    "Invalid version '{}': must follow semver format (e.g., 1.0.0)",
                    manifest.version
                )));
            }
        }

        // Validate ID format (lowercase, alphanumeric, hyphens, dots, underscores)
        if !manifest.id.chars().all(|c| {
            c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '.' || c == '_'
        }) {
            return Err(PluginError::InvalidManifest(format!(
                "Invalid plugin ID '{}': must be lowercase alphanumeric with hyphens, dots, or underscores",
                manifest.id
            )));
        }

        // Validate engine version compatibility
        if let Some(ref engines) = manifest.engines {
            if let Some(ref required_version) = engines.cognia {
                let current_version = env!("CARGO_PKG_VERSION");
                if !Self::is_version_compatible(current_version, required_version) {
                    return Err(PluginError::VersionMismatch(format!(
                        "Plugin requires Cognia {}, but current version is {}",
                        required_version, current_version
                    )));
                }
            }
        }

        // Validate minAppVersion if present (alternative to engines.cognia)
        if let Some(ref min_version) = manifest.min_app_version {
            let current_version = env!("CARGO_PKG_VERSION");
            if !Self::is_version_compatible(current_version, &format!(">={}", min_version)) {
                return Err(PluginError::VersionMismatch(format!(
                    "Plugin requires minimum app version {}, but current version is {}",
                    min_version, current_version
                )));
            }
        }

        // Validate entry points based on type
        match manifest.plugin_type {
            PluginType::Frontend => {
                if manifest.main.is_none() {
                    return Err(PluginError::InvalidManifest(
                        "Frontend plugin must have 'main' entry point".to_string(),
                    ));
                }
            }
            PluginType::Python => {
                if manifest.python_main.is_none() {
                    return Err(PluginError::InvalidManifest(
                        "Python plugin must have 'pythonMain' entry point".to_string(),
                    ));
                }
            }
            PluginType::Hybrid => {
                // Hybrid can have either or both
            }
        }

        Ok(())
    }

    /// Check if current version satisfies required version (semver-compatible)
    /// Supports: exact "1.0.0", caret "^1.0.0", tilde "~1.0.0", range ">=1.0.0"
    fn is_version_compatible(current: &str, required: &str) -> bool {
        let current_parts: Vec<u32> = current.split('.').filter_map(|s| s.parse().ok()).collect();

        if current_parts.len() < 3 {
            return false;
        }

        let (operator, version_str) = if let Some(stripped) = required.strip_prefix(">=") {
            (">=", stripped)
        } else if let Some(stripped) = required.strip_prefix('^') {
            ("^", stripped)
        } else if let Some(stripped) = required.strip_prefix('~') {
            ("~", stripped)
        } else if let Some(stripped) = required.strip_prefix('>') {
            (">", stripped)
        } else {
            ("=", required)
        };

        let required_parts: Vec<u32> = version_str
            .trim()
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect();

        if required_parts.is_empty() {
            return false;
        }

        let (cur_major, cur_minor, cur_patch) =
            (current_parts[0], current_parts[1], current_parts[2]);
        let req_major = required_parts.first().copied().unwrap_or(0);
        let req_minor = required_parts.get(1).copied().unwrap_or(0);
        let req_patch = required_parts.get(2).copied().unwrap_or(0);

        match operator {
            ">=" => (cur_major, cur_minor, cur_patch) >= (req_major, req_minor, req_patch),
            ">" => (cur_major, cur_minor, cur_patch) > (req_major, req_minor, req_patch),
            "^" => {
                // Caret: allow changes that do not modify the left-most non-zero digit
                if req_major > 0 {
                    cur_major == req_major && (cur_minor, cur_patch) >= (req_minor, req_patch)
                } else if req_minor > 0 {
                    cur_major == 0 && cur_minor == req_minor && cur_patch >= req_patch
                } else {
                    cur_major == 0 && cur_minor == 0 && cur_patch == req_patch
                }
            }
            "~" => {
                // Tilde: allow patch-level changes
                cur_major == req_major && cur_minor == req_minor && cur_patch >= req_patch
            }
            _ => {
                // Exact match
                (cur_major, cur_minor, cur_patch) == (req_major, req_minor, req_patch)
            }
        }
    }

    /// Install a plugin from source
    pub async fn install_plugin(
        &self,
        options: PluginInstallOptions,
    ) -> PluginResult<PluginScanResult> {
        let source_path = PathBuf::from(&options.source);

        // Determine installation method
        let result = match options.install_type.as_str() {
            "local" => self.install_from_local(&source_path).await,
            "git" => self.install_from_git(&options.source).await,
            "marketplace" => self.install_from_marketplace(&options.source).await,
            _ => Err(PluginError::InvalidManifest(format!(
                "Unknown install type: {}",
                options.install_type
            ))),
        }?;

        {
            let mut plugins = self.plugins.write().await;
            plugins.insert(
                result.manifest.id.clone(),
                PluginState {
                    manifest: result.manifest.clone(),
                    status: PluginStatus::Installed,
                    path: result.path.clone(),
                    config: serde_json::json!({}),
                    error: None,
                    installed_at: Some(Self::now_iso8601()),
                    enabled_at: None,
                },
            );
        }
        self.persist_index().await?;
        Ok(result)
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
                "No plugin.json or package.json found".to_string(),
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
    async fn install_from_git(&self, url: &str) -> PluginResult<PluginScanResult> {
        let temp_dir = tempfile::tempdir()?;
        let repo_dir = temp_dir.path().join("repo");

        let output = Command::new("git")
            .args(["clone", "--depth", "1", url])
            .arg(&repo_dir)
            .output();

        let output = match output {
            Ok(output) => output,
            Err(e) => {
                return Err(PluginError::Dependency(format!(
                    "Failed to execute git: {}",
                    e
                )))
            }
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let detail = if !stderr.trim().is_empty() {
                stderr
            } else {
                stdout
            };
            return Err(PluginError::Dependency(format!(
                "Git clone failed: {}",
                detail.trim()
            )));
        }

        // Parse manifest from repo (supports monorepos)
        let manifest_file = Self::find_manifest_file(&repo_dir)?;
        let plugin_root = manifest_file
            .parent()
            .ok_or_else(|| PluginError::InvalidManifest("Invalid manifest path".to_string()))?;

        let manifest = self.parse_manifest(&manifest_file)?;

        // Check if plugin already exists
        let dest_path = self.plugin_dir.join(&manifest.id);
        if dest_path.exists() {
            return Err(PluginError::AlreadyExists(manifest.id.clone()));
        }

        // Copy plugin to plugin directory
        self.copy_dir_recursive(plugin_root, &dest_path)?;

        Ok(PluginScanResult {
            manifest,
            path: dest_path.to_string_lossy().to_string(),
        })
    }

    /// Install from marketplace
    async fn install_from_marketplace(&self, id: &str) -> PluginResult<PluginScanResult> {
        log::info!("Installing plugin from marketplace: {}", id);

        // Fetch plugin info from marketplace registry
        let registry_entry = self.fetch_plugin_from_registry(id).await?;

        // Get download URL
        let download_url = registry_entry
            .download_url
            .as_ref()
            .or(registry_entry.repository.as_ref())
            .ok_or_else(|| {
                PluginError::Network(format!("No download URL available for plugin: {}", id))
            })?;

        // Check if plugin already exists
        let dest_path = self.plugin_dir.join(&registry_entry.id);
        if dest_path.exists() {
            return Err(PluginError::AlreadyExists(registry_entry.id.clone()));
        }

        // If it's a git URL, use git clone
        if download_url.ends_with(".git")
            || download_url.contains("github.com")
            || download_url.contains("gitlab.com")
        {
            return self.install_from_git(download_url).await;
        }

        // Otherwise download as archive
        let temp_dir = tempfile::tempdir()?;
        let archive_path = temp_dir.path().join("plugin.zip");

        // Download the archive
        self.download_file(download_url, &archive_path).await?;

        // Verify checksum if provided
        if let Some(checksum) = &registry_entry.checksum {
            self.verify_checksum(&archive_path, checksum)?;
        }

        // Extract the archive
        let extract_dir = temp_dir.path().join("extracted");
        self.extract_archive(&archive_path, &extract_dir)?;

        // Find manifest in extracted files
        let manifest_file = Self::find_manifest_file(&extract_dir)?;
        let plugin_root = manifest_file
            .parent()
            .ok_or_else(|| PluginError::InvalidManifest("Invalid manifest path".to_string()))?;

        let manifest = self.parse_manifest(&manifest_file)?;

        // Copy to plugin directory
        self.copy_dir_recursive(plugin_root, &dest_path)?;

        log::info!("Successfully installed plugin from marketplace: {}", id);

        Ok(PluginScanResult {
            manifest,
            path: dest_path.to_string_lossy().to_string(),
        })
    }

    /// Fetch plugin info from marketplace registry
    async fn fetch_plugin_from_registry(&self, id: &str) -> PluginResult<PluginRegistryEntry> {
        let config = MarketplaceConfig::default();
        let url = format!("{}/plugins/{}", config.registry_url, id);

        log::debug!("Fetching plugin info from: {}", url);

        // Create HTTP client
        let client = crate::http::create_proxy_client()
            .map_err(|e| PluginError::Network(format!("Failed to create HTTP client: {}", e)))?;

        let response = client
            .get(&url)
            .header("User-Agent", "Cognia-Plugin-Manager/1.0")
            .send()
            .await
            .map_err(|e| PluginError::Network(format!("Failed to fetch plugin info: {}", e)))?;

        if !response.status().is_success() {
            return Err(PluginError::Network(format!(
                "Failed to fetch plugin info: HTTP {}",
                response.status()
            )));
        }

        let entry: PluginRegistryEntry = response
            .json()
            .await
            .map_err(|e| PluginError::Network(format!("Failed to parse plugin info: {}", e)))?;

        Ok(entry)
    }

    /// Download a file from URL
    async fn download_file(&self, url: &str, dest: &Path) -> PluginResult<()> {
        log::debug!("Downloading file from: {} to: {:?}", url, dest);

        let client = crate::http::create_proxy_client_long()
            .map_err(|e| PluginError::Network(format!("Failed to create HTTP client: {}", e)))?;

        let response = client
            .get(url)
            .header("User-Agent", "Cognia-Plugin-Manager/1.0")
            .send()
            .await
            .map_err(|e| PluginError::Network(format!("Failed to download file: {}", e)))?;

        if !response.status().is_success() {
            return Err(PluginError::Network(format!(
                "Failed to download file: HTTP {}",
                response.status()
            )));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| PluginError::Network(format!("Failed to read response: {}", e)))?;

        std::fs::write(dest, &bytes)?;

        Ok(())
    }

    /// Verify file checksum (SHA-256)
    fn verify_checksum(&self, file: &Path, expected: &str) -> PluginResult<()> {
        use sha2::{Digest, Sha256};

        let content = std::fs::read(file)?;
        let mut hasher = Sha256::new();
        hasher.update(&content);
        let result = hasher.finalize();
        let actual = format!("{:x}", result);

        if actual != expected.to_lowercase() {
            return Err(PluginError::SignatureVerification(format!(
                "Checksum mismatch: expected {}, got {}",
                expected, actual
            )));
        }

        Ok(())
    }

    /// Extract ZIP archive
    fn extract_archive(&self, archive: &Path, dest: &Path) -> PluginResult<()> {
        log::debug!("Extracting archive: {:?} to: {:?}", archive, dest);

        let file = std::fs::File::open(archive)?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| {
            PluginError::Io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Failed to open ZIP archive: {}", e),
            ))
        })?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i).map_err(|e| {
                PluginError::Io(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Failed to read ZIP entry: {}", e),
                ))
            })?;

            let outpath = match file.enclosed_name() {
                Some(path) => dest.join(path),
                None => continue,
            };

            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    if !parent.exists() {
                        std::fs::create_dir_all(parent)?;
                    }
                }
                let mut outfile = std::fs::File::create(&outpath)?;
                std::io::copy(&mut file, &mut outfile)?;
            }

            // Set permissions on Unix
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = file.unix_mode() {
                    std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode))?;
                }
            }
        }

        Ok(())
    }

    /// Copy directory recursively
    fn copy_dir_recursive(&self, src: &Path, dst: &Path) -> PluginResult<()> {
        Self::copy_dir_recursive_impl(src, dst)
    }

    /// Implementation of recursive directory copy
    fn copy_dir_recursive_impl(src: &Path, dst: &Path) -> PluginResult<()> {
        std::fs::create_dir_all(dst)?;

        for entry in std::fs::read_dir(src)? {
            let entry = entry?;
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());

            if src_path.is_dir() {
                if entry.file_name() == ".git" {
                    continue;
                }

                Self::copy_dir_recursive_impl(&src_path, &dst_path)?;
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
        {
            let mut grants = self.permission_grants.write().await;
            grants.remove(plugin_id);
        }

        // Remove plugin directory
        let path = PathBuf::from(plugin_path);
        if path.exists() {
            std::fs::remove_dir_all(path)?;
        }

        // Remove plugin runtime directory
        let runtime_dir = self.runtime_root.join(plugin_id);
        if runtime_dir.exists() {
            std::fs::remove_dir_all(runtime_dir)?;
        }

        self.persist_index().await?;

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
        let runtime = self
            .python_runtime
            .as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let mut runtime = runtime.write().await;

        // Install dependencies if any
        if let Some(deps) = dependencies {
            runtime.install_dependencies(&deps).await?;
        }

        // Load the plugin module
        runtime
            .load_plugin(plugin_id, plugin_path, main_module)
            .await?;

        Ok(())
    }

    /// Get tools from a Python plugin
    pub async fn get_python_tools(
        &self,
        plugin_id: &str,
    ) -> PluginResult<Vec<PythonToolRegistration>> {
        let runtime = self
            .python_runtime
            .as_ref()
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
        let runtime = self
            .python_runtime
            .as_ref()
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
        let runtime = self
            .python_runtime
            .as_ref()
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
        let runtime = self
            .python_runtime
            .as_ref()
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

    /// Get runtime snapshot including plugin state and granted permissions
    pub async fn get_runtime_snapshot(&self) -> Vec<PluginRuntimeSnapshotEntry> {
        let plugins = self.plugins.read().await;
        let grants = self.permission_grants.read().await;

        plugins
            .values()
            .cloned()
            .map(|plugin| PluginRuntimeSnapshotEntry {
                granted_permissions: grants
                    .get(&plugin.manifest.id)
                    .map(|permissions| permissions.iter().cloned().collect())
                    .unwrap_or_default(),
                plugin,
            })
            .collect()
    }

    /// Get Python runtime info
    pub async fn get_python_runtime_info(&self) -> PluginResult<PythonRuntimeInfo> {
        let runtime = self
            .python_runtime
            .as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        Ok(PythonRuntimeInfo {
            available: runtime.is_available(),
            version: runtime.version().map(|s| s.to_string()),
            plugin_count: runtime.plugin_count(),
            total_calls: runtime
                .stats()
                .total_calls
                .load(std::sync::atomic::Ordering::Relaxed),
            total_execution_time_ms: runtime
                .stats()
                .total_execution_time_ms
                .load(std::sync::atomic::Ordering::Relaxed),
            failed_calls: runtime
                .stats()
                .failed_calls
                .load(std::sync::atomic::Ordering::Relaxed),
        })
    }

    /// Check if a Python plugin is initialized
    pub async fn is_python_plugin_initialized(&self, plugin_id: &str) -> PluginResult<bool> {
        let runtime = self
            .python_runtime
            .as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        Ok(runtime.is_plugin_initialized(plugin_id))
    }

    /// Get Python plugin info
    pub async fn get_python_plugin_info(
        &self,
        plugin_id: &str,
    ) -> PluginResult<Option<PythonPluginInfo>> {
        let runtime = self
            .python_runtime
            .as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        Ok(runtime
            .get_plugin_info(plugin_id)
            .map(|(id, tools, hooks)| PythonPluginInfo {
                plugin_id: id,
                tool_count: tools,
                hook_count: hooks,
            }))
    }

    /// Unload a Python plugin
    pub async fn unload_python_plugin(&self, plugin_id: &str) -> PluginResult<()> {
        let runtime = self
            .python_runtime
            .as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let mut runtime = runtime.write().await;
        runtime.unload_plugin(plugin_id)
    }

    /// List loaded Python plugins
    pub async fn list_python_plugins(&self) -> PluginResult<Vec<String>> {
        let runtime = self
            .python_runtime
            .as_ref()
            .ok_or_else(|| PluginError::Python("Python runtime not initialized".to_string()))?;

        let runtime = runtime.read().await;
        Ok(runtime.list_plugins())
    }
}

/// Python runtime information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PythonRuntimeInfo {
    pub available: bool,
    pub version: Option<String>,
    pub plugin_count: usize,
    pub total_calls: u64,
    pub total_execution_time_ms: u64,
    pub failed_calls: u64,
}

/// Python plugin information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PythonPluginInfo {
    pub plugin_id: String,
    pub tool_count: usize,
    pub hook_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn create_test_manifest() -> PluginManifest {
        PluginManifest {
            id: "test-plugin".to_string(),
            name: "Test Plugin".to_string(),
            version: "1.0.0".to_string(),
            description: "A test plugin".to_string(),
            plugin_type: PluginType::Frontend,
            capabilities: vec![PluginCapability::Tools],
            author: None,
            homepage: None,
            repository: None,
            license: None,
            keywords: None,
            icon: None,
            main: Some("index.js".to_string()),
            python_main: None,
            styles: None,
            dependencies: None,
            engines: None,
            python_dependencies: None,
            permissions: None,
            optional_permissions: None,
            config_schema: None,
            default_config: None,
            a2ui_components: None,
            tools: None,
            modes: None,
            activate_on_startup: None,
            screenshots: None,
            activation_events: None,
            scheduled_tasks: None,
            a2ui_templates: None,
            min_app_version: None,
            commands: None,
        }
    }

    #[test]
    fn test_plugin_manager_new() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        // Plugin directory should be created
        assert!(temp_dir.path().exists());
        // Verify manager correctly stores the plugin directory
        assert_eq!(manager.plugin_dir(), temp_dir.path().to_path_buf());
    }

    #[test]
    fn test_parse_manifest_valid() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        // Create a valid manifest file
        let manifest = create_test_manifest();
        let manifest_path = temp_dir.path().join("plugin.json");
        let manifest_json = serde_json::to_string_pretty(&manifest).unwrap();
        fs::write(&manifest_path, manifest_json).unwrap();

        // Parse the manifest
        let result = manager.parse_manifest(&manifest_path);
        assert!(result.is_ok());

        let parsed = result.unwrap();
        assert_eq!(parsed.id, "test-plugin");
        assert_eq!(parsed.name, "Test Plugin");
        assert_eq!(parsed.version, "1.0.0");
    }

    #[test]
    fn test_parse_manifest_invalid_json() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        // Create an invalid manifest file
        let manifest_path = temp_dir.path().join("plugin.json");
        fs::write(&manifest_path, "{ invalid json }").unwrap();

        // Parse should fail
        let result = manager.parse_manifest(&manifest_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_manifest_valid() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let manifest = create_test_manifest();
        let result = manager.validate_manifest(&manifest);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_manifest_empty_id() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let mut manifest = create_test_manifest();
        manifest.id = "".to_string();

        let result = manager.validate_manifest(&manifest);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_manifest_empty_name() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let mut manifest = create_test_manifest();
        manifest.name = "".to_string();

        let result = manager.validate_manifest(&manifest);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_manifest_invalid_version() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let mut manifest = create_test_manifest();
        manifest.version = "invalid".to_string();

        let result = manager.validate_manifest(&manifest);
        assert!(result.is_err());
    }

    #[test]
    fn test_copy_dir_recursive() {
        let src_dir = tempdir().unwrap();
        let dst_dir = tempdir().unwrap();

        // Create test structure
        fs::write(src_dir.path().join("file1.txt"), "content1").unwrap();
        fs::create_dir(src_dir.path().join("subdir")).unwrap();
        fs::write(src_dir.path().join("subdir/file2.txt"), "content2").unwrap();

        // Copy
        let result =
            PluginManager::copy_dir_recursive_impl(src_dir.path(), &dst_dir.path().join("dest"));
        assert!(result.is_ok());

        // Verify
        assert!(dst_dir.path().join("dest/file1.txt").exists());
        assert!(dst_dir.path().join("dest/subdir/file2.txt").exists());
    }

    #[test]
    fn test_find_manifest_file() {
        let temp_dir = tempdir().unwrap();

        // Create plugin.json
        fs::write(temp_dir.path().join("plugin.json"), "{}").unwrap();

        let result = PluginManager::find_manifest_file(temp_dir.path());
        assert!(result.is_ok());
        assert!(result.unwrap().ends_with("plugin.json"));
    }

    #[test]
    fn test_find_manifest_file_package_json() {
        let temp_dir = tempdir().unwrap();

        // Create package.json with cognia field
        let package_json = r#"{"name": "test", "cognia": {"plugin": true}}"#;
        fs::write(temp_dir.path().join("package.json"), package_json).unwrap();

        let result = PluginManager::find_manifest_file(temp_dir.path());
        assert!(result.is_ok());
    }

    #[test]
    fn test_find_manifest_file_not_found() {
        let temp_dir = tempdir().unwrap();

        let result = PluginManager::find_manifest_file(temp_dir.path());
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_scan_plugins_empty() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let result = manager.scan_plugins().await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn test_scan_plugins_with_plugin() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        // Create a plugin directory with manifest
        let plugin_dir = temp_dir.path().join("my-plugin");
        fs::create_dir(&plugin_dir).unwrap();

        let manifest = create_test_manifest();
        let manifest_json = serde_json::to_string_pretty(&manifest).unwrap();
        fs::write(plugin_dir.join("plugin.json"), manifest_json).unwrap();

        let result = manager.scan_plugins().await;
        assert!(result.is_ok());

        let plugins = result.unwrap();
        assert_eq!(plugins.len(), 1);
        assert_eq!(plugins[0].manifest.id, "test-plugin");
    }

    #[tokio::test]
    async fn test_get_all_plugins_empty() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let plugins = manager.get_all_plugins().await;
        assert!(plugins.is_empty());
    }

    #[test]
    fn test_marketplace_config_default() {
        let config = MarketplaceConfig::default();
        assert_eq!(config.registry_url, "https://plugins.cognia.app/api/v1");
        assert_eq!(config.cache_timeout, 300000);
        assert!(config.verify_signatures);
    }

    #[test]
    fn test_marketplace_search_options_default() {
        let options = MarketplaceSearchOptions::default();
        assert!(options.query.is_none());
        assert!(options.category.is_none());
        assert!(options.limit.is_none());
    }

    #[test]
    fn test_is_version_compatible() {
        // Exact match
        assert!(PluginManager::is_version_compatible("1.0.0", "1.0.0"));
        assert!(!PluginManager::is_version_compatible("1.0.1", "1.0.0"));

        // Greater or equal
        assert!(PluginManager::is_version_compatible("1.0.0", ">=1.0.0"));
        assert!(PluginManager::is_version_compatible("1.0.1", ">=1.0.0"));
        assert!(PluginManager::is_version_compatible("2.0.0", ">=1.0.0"));
        assert!(!PluginManager::is_version_compatible("0.9.0", ">=1.0.0"));

        // Caret (^) - compatible with same major
        assert!(PluginManager::is_version_compatible("1.0.0", "^1.0.0"));
        assert!(PluginManager::is_version_compatible("1.5.0", "^1.0.0"));
        assert!(PluginManager::is_version_compatible("1.9.9", "^1.0.0"));
        assert!(!PluginManager::is_version_compatible("2.0.0", "^1.0.0"));
        assert!(!PluginManager::is_version_compatible("0.9.0", "^1.0.0"));

        // Tilde (~) - compatible with same minor
        assert!(PluginManager::is_version_compatible("1.0.0", "~1.0.0"));
        assert!(PluginManager::is_version_compatible("1.0.5", "~1.0.0"));
        assert!(!PluginManager::is_version_compatible("1.1.0", "~1.0.0"));
    }

    #[test]
    fn test_validate_manifest_version_mismatch() {
        let temp_dir = tempdir().unwrap();
        let manager = PluginManager::new(temp_dir.path().to_path_buf());

        let mut manifest = create_test_manifest();
        manifest.engines = Some(PluginEngines {
            cognia: Some(">=99.0.0".to_string()),
            node: None,
            python: None,
        });

        let result = manager.validate_manifest(&manifest);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, PluginError::VersionMismatch(_)));
    }
}
