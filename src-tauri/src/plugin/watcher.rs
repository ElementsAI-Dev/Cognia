//! Plugin File Watcher
//!
//! Provides file watching functionality for plugin hot reload during development.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event, EventKind};
use tokio::sync::{mpsc, RwLock};
use tauri::{AppHandle, Emitter};

use super::types::{FileChangeType, PluginFileChangeEvent, WatcherConfig, PluginResult, PluginError};

/// Plugin file watcher for hot reload
pub struct PluginWatcher {
    /// File watcher instance
    watcher: Option<RecommendedWatcher>,
    /// Watched paths mapping to plugin IDs
    watched_paths: Arc<RwLock<HashMap<PathBuf, String>>>,
    /// Debounce tracking
    last_events: Arc<RwLock<HashMap<PathBuf, Instant>>>,
    /// Configuration
    config: WatcherConfig,
    /// Event sender
    event_tx: Option<mpsc::Sender<PluginFileChangeEvent>>,
    /// Whether watcher is active
    is_watching: bool,
}

impl PluginWatcher {
    /// Create a new plugin watcher
    pub fn new() -> Self {
        Self {
            watcher: None,
            watched_paths: Arc::new(RwLock::new(HashMap::new())),
            last_events: Arc::new(RwLock::new(HashMap::new())),
            config: WatcherConfig {
                paths: Vec::new(),
                debounce_ms: 300,
                recursive: true,
            },
            event_tx: None,
            is_watching: false,
        }
    }

    /// Start watching plugin directories
    pub async fn start_watching(
        &mut self,
        app_handle: AppHandle,
        paths: Vec<(String, Option<String>)>, // (path, plugin_id)
    ) -> PluginResult<()> {
        if self.is_watching {
            self.stop_watching().await?;
        }

        let watched_paths = self.watched_paths.clone();
        let last_events = self.last_events.clone();
        let debounce_ms = self.config.debounce_ms;

        // Store path -> plugin_id mapping
        {
            let mut paths_map = watched_paths.write().await;
            for (path, plugin_id) in &paths {
                if let Some(id) = plugin_id {
                    paths_map.insert(PathBuf::from(path), id.clone());
                }
            }
        }

        // Create event channel
        let (tx, mut rx) = mpsc::channel::<PluginFileChangeEvent>(100);
        self.event_tx = Some(tx.clone());

        // Spawn event handler task
        let app_handle_clone = app_handle.clone();
        tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                // Emit event to frontend
                if let Err(e) = app_handle_clone.emit("plugin:file-change", &event) {
                    log::error!("Failed to emit file change event: {}", e);
                }
            }
        });

        // Create watcher
        let watched_paths_clone = watched_paths.clone();
        let last_events_clone = last_events.clone();
        let tx_clone = tx.clone();

        let watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                if let Ok(event) = result {
                    let tx = tx_clone.clone();
                    let watched_paths = watched_paths_clone.clone();
                    let last_events = last_events_clone.clone();
                    
                    // Process event in blocking context
                    tokio::spawn(async move {
                        Self::process_event(
                            event,
                            &watched_paths,
                            &last_events,
                            debounce_ms,
                            &tx,
                        ).await;
                    });
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(100)),
        ).map_err(|e| PluginError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!("Failed to create file watcher: {}", e)
        )))?;

        self.watcher = Some(watcher);

        // Add paths to watcher
        for (path, _) in &paths {
            self.watch_path(path)?;
        }

        self.is_watching = true;
        log::info!("Started watching {} plugin paths", paths.len());

        Ok(())
    }

    /// Stop watching
    pub async fn stop_watching(&mut self) -> PluginResult<()> {
        self.watcher = None;
        self.event_tx = None;
        self.is_watching = false;
        
        // Clear tracked paths
        {
            let mut paths = self.watched_paths.write().await;
            paths.clear();
        }
        
        log::info!("Stopped file watcher");
        Ok(())
    }

    /// Add a path to watch
    pub fn watch_path(&mut self, path: &str) -> PluginResult<()> {
        if let Some(ref mut watcher) = self.watcher {
            let path = Path::new(path);
            let mode = if self.config.recursive {
                RecursiveMode::Recursive
            } else {
                RecursiveMode::NonRecursive
            };
            
            watcher.watch(path, mode).map_err(|e| {
                PluginError::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to watch path {:?}: {}", path, e)
                ))
            })?;
            
            log::debug!("Watching path: {:?}", path);
        }
        Ok(())
    }

    /// Remove a path from watching
    pub fn unwatch_path(&mut self, path: &str) -> PluginResult<()> {
        if let Some(ref mut watcher) = self.watcher {
            let path = Path::new(path);
            watcher.unwatch(path).map_err(|e| {
                PluginError::Io(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Failed to unwatch path {:?}: {}", path, e)
                ))
            })?;
        }
        Ok(())
    }

    /// Process a file system event
    async fn process_event(
        event: Event,
        watched_paths: &Arc<RwLock<HashMap<PathBuf, String>>>,
        last_events: &Arc<RwLock<HashMap<PathBuf, Instant>>>,
        debounce_ms: u64,
        tx: &mpsc::Sender<PluginFileChangeEvent>,
    ) {
        // Convert event kind to our type
        let change_type = match event.kind {
            EventKind::Create(_) => FileChangeType::Create,
            EventKind::Modify(_) => FileChangeType::Modify,
            EventKind::Remove(_) => FileChangeType::Delete,
            _ => return, // Ignore other events
        };

        for path in event.paths {
            // Skip non-relevant files
            if Self::should_ignore_path(&path) {
                continue;
            }

            // Debounce check
            {
                let mut last = last_events.write().await;
                let now = Instant::now();
                if let Some(last_time) = last.get(&path) {
                    if now.duration_since(*last_time) < Duration::from_millis(debounce_ms) {
                        continue;
                    }
                }
                last.insert(path.clone(), now);
            }

            // Find associated plugin ID
            let plugin_id = {
                let paths = watched_paths.read().await;
                Self::find_plugin_id(&path, &paths)
            };

            // Create and send event
            let event = PluginFileChangeEvent {
                change_type: change_type.clone(),
                path: path.to_string_lossy().to_string(),
                plugin_id,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
            };

            if let Err(e) = tx.send(event).await {
                log::error!("Failed to send file change event: {}", e);
            }
        }
    }

    /// Check if path should be ignored
    fn should_ignore_path(path: &Path) -> bool {
        let path_str = path.to_string_lossy();
        
        // Ignore common patterns
        let ignore_patterns = [
            "node_modules",
            ".git",
            "__pycache__",
            ".DS_Store",
            "Thumbs.db",
            ".pyc",
            ".pyo",
            ".swp",
            ".swo",
            "~",
        ];
        
        for pattern in ignore_patterns {
            if path_str.contains(pattern) {
                return true;
            }
        }
        
        false
    }

    /// Find plugin ID for a given path
    fn find_plugin_id(path: &Path, watched_paths: &HashMap<PathBuf, String>) -> Option<String> {
        // Check if path or any parent is in watched paths
        let mut current = Some(path);
        while let Some(p) = current {
            if let Some(id) = watched_paths.get(p) {
                return Some(id.clone());
            }
            current = p.parent();
        }
        None
    }

    /// Check if watcher is active
    pub fn is_watching(&self) -> bool {
        self.is_watching
    }

    /// Update watcher configuration
    pub fn set_config(&mut self, config: WatcherConfig) {
        self.config = config;
    }
}

impl Default for PluginWatcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_ignore_path() {
        assert!(PluginWatcher::should_ignore_path(Path::new("/project/node_modules/foo")));
        assert!(PluginWatcher::should_ignore_path(Path::new("/project/.git/config")));
        assert!(PluginWatcher::should_ignore_path(Path::new("/project/__pycache__/test.pyc")));
        assert!(!PluginWatcher::should_ignore_path(Path::new("/project/src/index.ts")));
        assert!(!PluginWatcher::should_ignore_path(Path::new("/project/plugin.json")));
    }

    #[test]
    fn test_find_plugin_id() {
        let mut watched_paths = HashMap::new();
        watched_paths.insert(
            PathBuf::from("/plugins/my-plugin"),
            "my-plugin".to_string(),
        );

        assert_eq!(
            PluginWatcher::find_plugin_id(
                Path::new("/plugins/my-plugin/src/index.ts"),
                &watched_paths
            ),
            Some("my-plugin".to_string())
        );

        assert_eq!(
            PluginWatcher::find_plugin_id(
                Path::new("/other/path/file.ts"),
                &watched_paths
            ),
            None
        );
    }
}
