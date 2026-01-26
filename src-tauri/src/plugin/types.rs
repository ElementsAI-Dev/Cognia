//! Plugin System Types
//!
//! Type definitions for the plugin system.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Plugin type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PluginType {
    Frontend,
    Python,
    Hybrid,
}

/// Plugin status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PluginStatus {
    Discovered,
    Installed,
    Loading,
    Loaded,
    Enabling,
    Enabled,
    Disabling,
    Disabled,
    Unloading,
    Error,
    Updating,
}

/// Plugin capability
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum PluginCapability {
    Tools,
    Components,
    Modes,
    Skills,
    Themes,
    Commands,
    Hooks,
    Processors,
    Providers,
    Exporters,
    Importers,
}

/// Plugin permission
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum PluginPermission {
    #[serde(rename = "filesystem:read")]
    FilesystemRead,
    #[serde(rename = "filesystem:write")]
    FilesystemWrite,
    #[serde(rename = "network:fetch")]
    NetworkFetch,
    #[serde(rename = "network:websocket")]
    NetworkWebsocket,
    #[serde(rename = "clipboard:read")]
    ClipboardRead,
    #[serde(rename = "clipboard:write")]
    ClipboardWrite,
    #[serde(rename = "notification")]
    Notification,
    #[serde(rename = "shell:execute")]
    ShellExecute,
    #[serde(rename = "process:spawn")]
    ProcessSpawn,
    #[serde(rename = "database:read")]
    DatabaseRead,
    #[serde(rename = "database:write")]
    DatabaseWrite,
    #[serde(rename = "settings:read")]
    SettingsRead,
    #[serde(rename = "settings:write")]
    SettingsWrite,
    #[serde(rename = "session:read")]
    SessionRead,
    #[serde(rename = "session:write")]
    SessionWrite,
    #[serde(rename = "agent:control")]
    AgentControl,
    #[serde(rename = "python:execute")]
    PythonExecute,
}

/// Plugin author information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginAuthor {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Plugin engine requirements
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PluginEngines {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cognia: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub node: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub python: Option<String>,
}

/// A2UI component definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct A2UIComponentDef {
    #[serde(rename = "type")]
    pub component_type: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

/// Tool definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginToolDef {
    pub name: String,
    pub description: String,
    #[serde(rename = "parametersSchema")]
    pub parameters_schema: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(rename = "requiresApproval", skip_serializing_if = "Option::is_none")]
    pub requires_approval: Option<bool>,
}

/// Mode definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginModeDef {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    #[serde(rename = "systemPrompt", skip_serializing_if = "Option::is_none")]
    pub system_prompt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<String>>,
    #[serde(rename = "outputFormat", skip_serializing_if = "Option::is_none")]
    pub output_format: Option<String>,
    #[serde(rename = "previewEnabled", skip_serializing_if = "Option::is_none")]
    pub preview_enabled: Option<bool>,
}

/// Plugin manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub author: Option<PluginAuthor>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repository: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    
    #[serde(rename = "type")]
    pub plugin_type: PluginType,
    
    pub capabilities: Vec<PluginCapability>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub main: Option<String>,
    
    #[serde(rename = "pythonMain", skip_serializing_if = "Option::is_none")]
    pub python_main: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub styles: Option<String>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<HashMap<String, String>>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engines: Option<PluginEngines>,
    
    #[serde(rename = "pythonDependencies", skip_serializing_if = "Option::is_none")]
    pub python_dependencies: Option<Vec<String>>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<PluginPermission>>,
    
    #[serde(rename = "optionalPermissions", skip_serializing_if = "Option::is_none")]
    pub optional_permissions: Option<Vec<PluginPermission>>,
    
    #[serde(rename = "configSchema", skip_serializing_if = "Option::is_none")]
    pub config_schema: Option<serde_json::Value>,
    
    #[serde(rename = "defaultConfig", skip_serializing_if = "Option::is_none")]
    pub default_config: Option<serde_json::Value>,
    
    #[serde(rename = "a2uiComponents", skip_serializing_if = "Option::is_none")]
    pub a2ui_components: Option<Vec<A2UIComponentDef>>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<PluginToolDef>>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modes: Option<Vec<PluginModeDef>>,
    
    #[serde(rename = "activateOnStartup", skip_serializing_if = "Option::is_none")]
    pub activate_on_startup: Option<bool>,
}

/// Plugin instance state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginState {
    pub manifest: PluginManifest,
    pub status: PluginStatus,
    pub path: String,
    pub config: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(rename = "installedAt", skip_serializing_if = "Option::is_none")]
    pub installed_at: Option<String>,
    #[serde(rename = "enabledAt", skip_serializing_if = "Option::is_none")]
    pub enabled_at: Option<String>,
}

/// Plugin scan result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginScanResult {
    pub manifest: PluginManifest,
    pub path: String,
}

/// Python tool registration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonToolRegistration {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
    #[serde(rename = "requiresApproval", skip_serializing_if = "Option::is_none")]
    pub requires_approval: Option<bool>,
}

/// Python hook registration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonHookRegistration {
    #[serde(rename = "hookName")]
    pub hook_name: String,
    #[serde(rename = "functionName")]
    pub function_name: String,
    #[serde(rename = "async", skip_serializing_if = "Option::is_none")]
    pub is_async: Option<bool>,
}

/// Plugin installation options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInstallOptions {
    pub source: String,
    #[serde(rename = "installType")]
    pub install_type: String,
    #[serde(rename = "pluginDir")]
    pub plugin_dir: String,
}

/// Plugin error
#[derive(Debug, thiserror::Error)]
pub enum PluginError {
    #[error("Plugin not found: {0}")]
    NotFound(String),
    
    #[error("Invalid manifest: {0}")]
    InvalidManifest(String),
    
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("Python error: {0}")]
    Python(String),
    
    #[error("Plugin already exists: {0}")]
    AlreadyExists(String),
    
    #[error("Dependency error: {0}")]
    Dependency(String),
    
    #[error("Network error: {0}")]
    Network(String),
    
    #[error("Signature verification failed: {0}")]
    SignatureVerification(String),
    
    #[error("Version mismatch: {0}")]
    VersionMismatch(String),
}

// =============================================================================
// Marketplace Types
// =============================================================================

/// Marketplace configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceConfig {
    #[serde(rename = "registryUrl")]
    pub registry_url: String,
    #[serde(rename = "cacheTimeout")]
    pub cache_timeout: u64,
    #[serde(rename = "verifySignatures")]
    pub verify_signatures: bool,
}

impl Default for MarketplaceConfig {
    fn default() -> Self {
        Self {
            registry_url: "https://plugins.cognia.app/api/v1".to_string(),
            cache_timeout: 300000, // 5 minutes
            verify_signatures: true,
        }
    }
}

/// Plugin registry entry from marketplace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginRegistryEntry {
    pub id: String,
    pub name: String,
    pub description: String,
    pub author: String,
    pub version: String,
    #[serde(rename = "latestVersion")]
    pub latest_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repository: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    pub downloads: u64,
    pub rating: f64,
    #[serde(rename = "ratingCount")]
    pub rating_count: u64,
    pub tags: Vec<String>,
    pub categories: Vec<String>,
    pub manifest: PluginManifest,
    #[serde(rename = "publishedAt")]
    pub published_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub verified: bool,
    pub featured: bool,
    #[serde(rename = "downloadUrl", skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature: Option<String>,
}

/// Marketplace search options
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MarketplaceSearchOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub query: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(rename = "sortBy", skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<String>,
    #[serde(rename = "sortOrder", skip_serializing_if = "Option::is_none")]
    pub sort_order: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verified: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<u32>,
}

/// Marketplace search result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceSearchResult {
    pub plugins: Vec<PluginRegistryEntry>,
    pub total: u64,
    #[serde(rename = "hasMore")]
    pub has_more: bool,
}

/// Plugin version info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginVersionInfo {
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changelog: Option<String>,
    #[serde(rename = "publishedAt")]
    pub published_at: String,
    #[serde(rename = "minAppVersion", skip_serializing_if = "Option::is_none")]
    pub min_app_version: Option<String>,
    #[serde(rename = "downloadUrl")]
    pub download_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
}

/// Installation progress event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallationProgress {
    #[serde(rename = "pluginId")]
    pub plugin_id: String,
    pub stage: InstallationStage,
    pub progress: f64,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Installation stage
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum InstallationStage {
    Downloading,
    Extracting,
    Verifying,
    Installing,
    Configuring,
    Complete,
    Error,
}

// =============================================================================
// File Watcher Types (for Hot Reload)
// =============================================================================

/// File change event type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum FileChangeType {
    Create,
    Modify,
    Delete,
    Rename,
}

/// File change event for plugin hot reload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginFileChangeEvent {
    #[serde(rename = "type")]
    pub change_type: FileChangeType,
    pub path: String,
    #[serde(rename = "pluginId", skip_serializing_if = "Option::is_none")]
    pub plugin_id: Option<String>,
    pub timestamp: u64,
}

/// Watcher configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatcherConfig {
    pub paths: Vec<String>,
    #[serde(rename = "debounceMs")]
    pub debounce_ms: u64,
    #[serde(rename = "recursive")]
    pub recursive: bool,
}

impl serde::Serialize for PluginError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type PluginResult<T> = Result<T, PluginError>;

// =============================================================================
// Extended Plugin API Types
// =============================================================================

/// Network request options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkRequestOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub method: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u64>,
    #[serde(rename = "responseType", skip_serializing_if = "Option::is_none")]
    pub response_type: Option<String>,
}

/// Network response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkResponse {
    pub ok: bool,
    pub status: u16,
    #[serde(rename = "statusText")]
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub data: serde_json::Value,
}

/// Download progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub loaded: u64,
    pub total: u64,
    pub percent: f64,
}

/// Download result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub path: String,
    pub size: u64,
    #[serde(rename = "contentType", skip_serializing_if = "Option::is_none")]
    pub content_type: Option<String>,
}

/// File entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isFile")]
    pub is_file: bool,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

/// File stat
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileStat {
    pub size: u64,
    #[serde(rename = "isFile")]
    pub is_file: bool,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(rename = "isSymlink")]
    pub is_symlink: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accessed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<u32>,
}

/// File watch event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileWatchEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub path: String,
    #[serde(rename = "newPath", skip_serializing_if = "Option::is_none")]
    pub new_path: Option<String>,
}

/// Shell execution options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encoding: Option<String>,
}

/// Shell execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShellResult {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

/// Spawn options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpawnOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub env: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detached: Option<bool>,
    #[serde(rename = "windowsHide", skip_serializing_if = "Option::is_none")]
    pub windows_hide: Option<bool>,
}

/// Database result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseResult {
    #[serde(rename = "rowsAffected")]
    pub rows_affected: u64,
    #[serde(rename = "lastInsertId", skip_serializing_if = "Option::is_none")]
    pub last_insert_id: Option<i64>,
}

/// Table column definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableColumn {
    pub name: String,
    #[serde(rename = "type")]
    pub column_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nullable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unique: Option<bool>,
}

/// Table index definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableIndex {
    pub name: String,
    pub columns: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unique: Option<bool>,
}

/// Table schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    pub columns: Vec<TableColumn>,
    #[serde(rename = "primaryKey", skip_serializing_if = "Option::is_none")]
    pub primary_key: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub indexes: Option<Vec<TableIndex>>,
}

/// Shortcut registration options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<String>,
    #[serde(rename = "preventDefault", skip_serializing_if = "Option::is_none")]
    pub prevent_default: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Context menu item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextMenuItem {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub when: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub submenu: Option<Vec<ContextMenuItem>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub separator: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled: Option<bool>,
}

/// Context menu click context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextMenuClickContext {
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection: Option<String>,
    #[serde(rename = "messageId", skip_serializing_if = "Option::is_none")]
    pub message_id: Option<String>,
    #[serde(rename = "artifactId", skip_serializing_if = "Option::is_none")]
    pub artifact_id: Option<String>,
    #[serde(rename = "projectId", skip_serializing_if = "Option::is_none")]
    pub project_id: Option<String>,
    #[serde(rename = "sessionId", skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<Position>,
}

/// Position
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

/// Window creation options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowOptions {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(rename = "minWidth", skip_serializing_if = "Option::is_none")]
    pub min_width: Option<u32>,
    #[serde(rename = "minHeight", skip_serializing_if = "Option::is_none")]
    pub min_height: Option<u32>,
    #[serde(rename = "maxWidth", skip_serializing_if = "Option::is_none")]
    pub max_width: Option<u32>,
    #[serde(rename = "maxHeight", skip_serializing_if = "Option::is_none")]
    pub max_height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub center: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resizable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fullscreen: Option<bool>,
    #[serde(rename = "alwaysOnTop", skip_serializing_if = "Option::is_none")]
    pub always_on_top: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decorations: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transparent: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

/// Plugin API request (for IPC)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "api", content = "payload")]
pub enum PluginApiRequest {
    // Network API
    #[serde(rename = "network:fetch")]
    NetworkFetch { url: String, options: Option<NetworkRequestOptions> },
    #[serde(rename = "network:download")]
    NetworkDownload { url: String, dest_path: String },
    #[serde(rename = "network:upload")]
    NetworkUpload { url: String, file_path: String },
    
    // Filesystem API
    #[serde(rename = "fs:readText")]
    FsReadText { path: String },
    #[serde(rename = "fs:readBinary")]
    FsReadBinary { path: String },
    #[serde(rename = "fs:writeText")]
    FsWriteText { path: String, content: String },
    #[serde(rename = "fs:writeBinary")]
    FsWriteBinary { path: String, content: Vec<u8> },
    #[serde(rename = "fs:exists")]
    FsExists { path: String },
    #[serde(rename = "fs:mkdir")]
    FsMkdir { path: String, recursive: Option<bool> },
    #[serde(rename = "fs:remove")]
    FsRemove { path: String, recursive: Option<bool> },
    #[serde(rename = "fs:copy")]
    FsCopy { src: String, dest: String },
    #[serde(rename = "fs:move")]
    FsMove { src: String, dest: String },
    #[serde(rename = "fs:readDir")]
    FsReadDir { path: String },
    #[serde(rename = "fs:stat")]
    FsStat { path: String },
    
    // Clipboard API
    #[serde(rename = "clipboard:readText")]
    ClipboardReadText,
    #[serde(rename = "clipboard:writeText")]
    ClipboardWriteText { text: String },
    #[serde(rename = "clipboard:readImage")]
    ClipboardReadImage,
    #[serde(rename = "clipboard:writeImage")]
    ClipboardWriteImage { data: Vec<u8>, format: Option<String> },
    #[serde(rename = "clipboard:clear")]
    ClipboardClear,
    
    // Shell API
    #[serde(rename = "shell:execute")]
    ShellExecute { command: String, options: Option<ShellOptions> },
    #[serde(rename = "shell:spawn")]
    ShellSpawn { command: String, args: Option<Vec<String>>, options: Option<SpawnOptions> },
    #[serde(rename = "shell:open")]
    ShellOpen { path: String },
    #[serde(rename = "shell:showInFolder")]
    ShellShowInFolder { path: String },
    
    // Database API
    #[serde(rename = "db:query")]
    DbQuery { sql: String, params: Option<Vec<serde_json::Value>> },
    #[serde(rename = "db:execute")]
    DbExecute { sql: String, params: Option<Vec<serde_json::Value>> },
    #[serde(rename = "db:createTable")]
    DbCreateTable { name: String, schema: TableSchema },
    #[serde(rename = "db:dropTable")]
    DbDropTable { name: String },
    #[serde(rename = "db:tableExists")]
    DbTableExists { name: String },
    
    // Secrets API
    #[serde(rename = "secrets:store")]
    SecretsStore { key: String, value: String },
    #[serde(rename = "secrets:get")]
    SecretsGet { key: String },
    #[serde(rename = "secrets:delete")]
    SecretsDelete { key: String },
    #[serde(rename = "secrets:has")]
    SecretsHas { key: String },
    
    // Window API
    #[serde(rename = "window:create")]
    WindowCreate { options: WindowOptions },
    #[serde(rename = "window:close")]
    WindowClose { window_id: String },
    #[serde(rename = "window:setTitle")]
    WindowSetTitle { window_id: String, title: String },
    #[serde(rename = "window:setSize")]
    WindowSetSize { window_id: String, width: u32, height: u32 },
    #[serde(rename = "window:setPosition")]
    WindowSetPosition { window_id: String, x: i32, y: i32 },
    #[serde(rename = "window:center")]
    WindowCenter { window_id: String },
    #[serde(rename = "window:show")]
    WindowShow { window_id: String },
    #[serde(rename = "window:hide")]
    WindowHide { window_id: String },
}

/// Plugin API response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginApiResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
