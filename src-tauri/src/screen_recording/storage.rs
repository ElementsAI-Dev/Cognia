//! Storage Management Module
//!
//! Provides intelligent file organization and cleanup for recordings and screenshots.

use chrono::{DateTime, Local};
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// Storage configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageConfig {
    /// Base directory for recordings
    pub recordings_dir: PathBuf,
    /// Base directory for screenshots
    pub screenshots_dir: PathBuf,
    /// Organize files by date (YYYY-MM-DD folders)
    pub organize_by_date: bool,
    /// Maximum storage size in GB (0 = unlimited)
    pub max_storage_gb: f64,
    /// Auto-cleanup files older than N days (0 = disabled)
    pub auto_cleanup_days: u32,
    /// Keep pinned files during cleanup
    pub preserve_pinned: bool,
    /// Use semantic naming (e.g., "Recording_14-30-22.mp4" instead of UUID)
    pub semantic_naming: bool,
}

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            recordings_dir: PathBuf::from("recordings"),
            screenshots_dir: PathBuf::from("screenshots"),
            organize_by_date: true,
            max_storage_gb: 10.0,
            auto_cleanup_days: 30,
            preserve_pinned: true,
            semantic_naming: true,
        }
    }
}

/// Storage statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    /// Total size of recordings in bytes
    pub recordings_size: u64,
    /// Total size of screenshots in bytes
    pub screenshots_size: u64,
    /// Number of recording files
    pub recordings_count: u32,
    /// Number of screenshot files
    pub screenshots_count: u32,
    /// Available disk space in bytes
    pub available_space: u64,
    /// Total disk space in bytes
    pub total_space: u64,
}

/// Aggregated storage status — combines stats, usage percent, and exceeded flag
/// into a single response to eliminate redundant disk traversals
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AggregatedStorageStatus {
    pub stats: StorageStats,
    pub usage_percent: f32,
    pub is_exceeded: bool,
    pub config: StorageConfig,
}

/// File metadata for storage management
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageFile {
    pub path: PathBuf,
    pub size: u64,
    pub created: i64,
    pub modified: i64,
    pub is_pinned: bool,
    pub file_type: StorageFileType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum StorageFileType {
    Recording,
    Screenshot,
    Thumbnail,
    Other,
}

/// Storage manager for recordings and screenshots
pub struct StorageManager {
    config: StorageConfig,
}

impl StorageManager {
    pub fn new(config: StorageConfig) -> Self {
        Self { config }
    }

    /// Get current storage configuration
    pub fn get_config(&self) -> StorageConfig {
        self.config.clone()
    }

    /// Update storage configuration
    pub fn update_config(&mut self, config: StorageConfig) {
        self.config = config;
    }

    /// Generate semantic filename for recordings
    pub fn generate_recording_filename(
        &self,
        mode: &str,
        format: &str,
        custom_name: Option<&str>,
    ) -> String {
        let now = Local::now();
        let time_str = now.format("%H-%M-%S").to_string();

        let base_name = if self.config.semantic_naming {
            match custom_name {
                Some(name) => format!("{}_{}", name, time_str),
                None => {
                    let mode_name = match mode {
                        "fullscreen" => "Fullscreen",
                        "window" => "Window",
                        "region" => "Region",
                        _ => "Recording",
                    };
                    format!("{}_{}", mode_name, time_str)
                }
            }
        } else {
            format!("recording_{}", &uuid::Uuid::new_v4().to_string()[..8])
        };

        format!("{}.{}", base_name, format)
    }

    /// Generate semantic filename for screenshots
    pub fn generate_screenshot_filename(
        &self,
        mode: &str,
        format: &str,
        custom_name: Option<&str>,
    ) -> String {
        let now = Local::now();
        let time_str = now.format("%H-%M-%S").to_string();

        let base_name = if self.config.semantic_naming {
            match custom_name {
                Some(name) => format!("{}_{}", name, time_str),
                None => {
                    let mode_name = match mode {
                        "fullscreen" => "Screenshot",
                        "window" => "Window",
                        "region" => "Region",
                        _ => "Screenshot",
                    };
                    format!("{}_{}", mode_name, time_str)
                }
            }
        } else {
            format!("screenshot_{}", &uuid::Uuid::new_v4().to_string()[..8])
        };

        format!("{}.{}", base_name, format)
    }

    /// Get full path for a recording, creating date folders if needed
    pub fn get_recording_path(&self, filename: &str) -> Result<PathBuf, String> {
        let mut path = self.config.recordings_dir.clone();

        if self.config.organize_by_date {
            let date_folder = Local::now().format("%Y-%m-%d").to_string();
            path = path.join(&date_folder);

            if !path.exists() {
                fs::create_dir_all(&path)
                    .map_err(|e| format!("Failed to create date folder: {}", e))?;
                debug!("[Storage] Created date folder: {:?}", path);
            }
        }

        Ok(path.join(filename))
    }

    /// Get full path for a screenshot, creating date folders if needed
    pub fn get_screenshot_path(&self, filename: &str) -> Result<PathBuf, String> {
        let mut path = self.config.screenshots_dir.clone();

        if self.config.organize_by_date {
            let date_folder = Local::now().format("%Y-%m-%d").to_string();
            path = path.join(&date_folder);

            if !path.exists() {
                fs::create_dir_all(&path)
                    .map_err(|e| format!("Failed to create date folder: {}", e))?;
                debug!("[Storage] Created date folder: {:?}", path);
            }
        }

        Ok(path.join(filename))
    }

    /// Calculate storage statistics
    pub fn get_stats(&self) -> StorageStats {
        let (recordings_size, recordings_count) =
            self.calculate_dir_size(&self.config.recordings_dir);
        let (screenshots_size, screenshots_count) =
            self.calculate_dir_size(&self.config.screenshots_dir);

        // Get disk space
        let (available_space, total_space) = self.get_disk_space();

        StorageStats {
            recordings_size,
            screenshots_size,
            recordings_count,
            screenshots_count,
            available_space,
            total_space,
        }
    }

    /// Calculate directory size recursively
    #[allow(clippy::only_used_in_recursion)]
    fn calculate_dir_size(&self, dir: &Path) -> (u64, u32) {
        let mut total_size = 0u64;
        let mut file_count = 0u32;

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let (size, count) = self.calculate_dir_size(&path);
                    total_size += size;
                    file_count += count;
                } else if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                    file_count += 1;
                }
            }
        }

        (total_size, file_count)
    }

    /// Get disk space info
    fn get_disk_space(&self) -> (u64, u64) {
        #[cfg(target_os = "windows")]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            use windows::core::PCWSTR;
            use windows::Win32::Storage::FileSystem::GetDiskFreeSpaceExW;

            let path = self.config.recordings_dir.to_string_lossy();
            let root = if path.len() >= 2 && path.chars().nth(1) == Some(':') {
                format!("{}\\", &path[..2])
            } else {
                "C:\\".to_string()
            };

            let wide: Vec<u16> = OsStr::new(&root)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            let mut free_bytes = 0u64;
            let mut total_bytes = 0u64;

            unsafe {
                let _ = GetDiskFreeSpaceExW(
                    PCWSTR(wide.as_ptr()),
                    Some(&mut free_bytes as *mut u64),
                    Some(&mut total_bytes as *mut u64),
                    None,
                );
            }

            (free_bytes, total_bytes)
        }

        #[cfg(not(target_os = "windows"))]
        {
            // Fallback for non-Windows platforms
            (0, 0)
        }
    }

    /// Cleanup old files based on configuration
    pub fn cleanup_old_files(&self, pinned_ids: &[String]) -> Result<CleanupResult, String> {
        if self.config.auto_cleanup_days == 0 {
            return Ok(CleanupResult::default());
        }

        let cutoff_date = Local::now()
            .checked_sub_signed(chrono::Duration::days(self.config.auto_cleanup_days as i64))
            .ok_or("Failed to calculate cutoff date")?;

        let mut result = CleanupResult::default();

        // Cleanup recordings
        if let Err(e) = self.cleanup_directory(
            &self.config.recordings_dir,
            cutoff_date,
            pinned_ids,
            &mut result,
        ) {
            warn!("[Storage] Error cleaning recordings: {}", e);
        }

        // Cleanup screenshots
        if let Err(e) = self.cleanup_directory(
            &self.config.screenshots_dir,
            cutoff_date,
            pinned_ids,
            &mut result,
        ) {
            warn!("[Storage] Error cleaning screenshots: {}", e);
        }

        info!(
            "[Storage] Cleanup complete: {} files deleted, {} bytes freed",
            result.files_deleted, result.bytes_freed
        );

        Ok(result)
    }

    /// Cleanup a single directory
    fn cleanup_directory(
        &self,
        dir: &Path,
        cutoff: DateTime<Local>,
        pinned_ids: &[String],
        result: &mut CleanupResult,
    ) -> Result<(), String> {
        if !dir.exists() {
            return Ok(());
        }

        let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;

        for entry in entries.flatten() {
            let path = entry.path();

            if path.is_dir() {
                // Recursively clean subdirectories
                self.cleanup_directory(&path, cutoff, pinned_ids, result)?;

                // Remove empty directories
                if let Ok(mut entries) = fs::read_dir(&path) {
                    if entries.next().is_none() {
                        let _ = fs::remove_dir(&path);
                        debug!("[Storage] Removed empty directory: {:?}", path);
                    }
                }
            } else {
                // Check if file should be deleted
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        let modified_time: DateTime<Local> = modified.into();

                        if modified_time < cutoff {
                            // Check if pinned
                            let filename = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");

                            let is_pinned = self.config.preserve_pinned
                                && pinned_ids.iter().any(|id| filename.contains(id));

                            if !is_pinned {
                                let size = metadata.len();
                                if fs::remove_file(&path).is_ok() {
                                    result.files_deleted += 1;
                                    result.bytes_freed += size;
                                    debug!("[Storage] Deleted old file: {:?}", path);
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    /// Get aggregated storage status in a single call (eliminates 3 separate IPC calls)
    pub fn get_aggregated_status(&self) -> AggregatedStorageStatus {
        let stats = self.get_stats();
        let total_used = stats.recordings_size + stats.screenshots_size;
        let max_bytes = (self.config.max_storage_gb * 1024.0 * 1024.0 * 1024.0) as u64;

        let usage_percent = if self.config.max_storage_gb > 0.0 && max_bytes > 0 {
            (total_used as f32 / max_bytes as f32) * 100.0
        } else {
            0.0
        };

        let is_exceeded = self.config.max_storage_gb > 0.0 && total_used > max_bytes;

        AggregatedStorageStatus {
            stats,
            usage_percent,
            is_exceeded,
            config: self.config.clone(),
        }
    }

    /// Check if storage limit is exceeded
    pub fn is_storage_exceeded(&self) -> bool {
        if self.config.max_storage_gb <= 0.0 {
            return false;
        }

        let stats = self.get_stats();
        let total_bytes = stats.recordings_size + stats.screenshots_size;
        let max_bytes = (self.config.max_storage_gb * 1024.0 * 1024.0 * 1024.0) as u64;

        total_bytes > max_bytes
    }

    /// Get storage usage percentage
    pub fn get_storage_usage_percent(&self) -> f32 {
        if self.config.max_storage_gb <= 0.0 {
            return 0.0;
        }

        let stats = self.get_stats();
        let total_bytes = stats.recordings_size + stats.screenshots_size;
        let max_bytes = self.config.max_storage_gb * 1024.0 * 1024.0 * 1024.0;

        ((total_bytes as f64 / max_bytes) * 100.0) as f32
    }

    /// List all storage files (recordings and screenshots)
    ///
    /// Returns a list of StorageFile objects with metadata for each file.
    /// Optionally filter by file type.
    pub fn list_files(
        &self,
        file_type: Option<StorageFileType>,
        pinned_ids: &[String],
    ) -> Vec<StorageFile> {
        let mut files = Vec::new();

        // List recordings if no filter or filter is Recording
        if file_type.is_none() || file_type == Some(StorageFileType::Recording) {
            self.collect_files_from_dir(
                &self.config.recordings_dir,
                StorageFileType::Recording,
                pinned_ids,
                &mut files,
            );
        }

        // List screenshots if no filter or filter is Screenshot
        if file_type.is_none() || file_type == Some(StorageFileType::Screenshot) {
            self.collect_files_from_dir(
                &self.config.screenshots_dir,
                StorageFileType::Screenshot,
                pinned_ids,
                &mut files,
            );
        }

        // Sort by modified time (newest first)
        files.sort_by(|a, b| b.modified.cmp(&a.modified));

        files
    }

    /// Collect files from a directory recursively
    fn collect_files_from_dir(
        &self,
        dir: &Path,
        default_type: StorageFileType,
        pinned_ids: &[String],
        files: &mut Vec<StorageFile>,
    ) {
        if !dir.exists() {
            return;
        }

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();

                if path.is_dir() {
                    // Recursively collect from subdirectories
                    self.collect_files_from_dir(&path, default_type.clone(), pinned_ids, files);
                } else if let Ok(metadata) = entry.metadata() {
                    // Determine file type based on extension
                    let file_type = self.determine_file_type(&path, &default_type);

                    // Check if pinned
                    let filename = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                    let is_pinned = pinned_ids.iter().any(|id| filename.contains(id));

                    // Get timestamps
                    let created = metadata
                        .created()
                        .map(|t| {
                            let datetime: DateTime<Local> = t.into();
                            datetime.timestamp()
                        })
                        .unwrap_or(0);

                    let modified = metadata
                        .modified()
                        .map(|t| {
                            let datetime: DateTime<Local> = t.into();
                            datetime.timestamp()
                        })
                        .unwrap_or(0);

                    files.push(StorageFile {
                        path: path.clone(),
                        size: metadata.len(),
                        created,
                        modified,
                        is_pinned,
                        file_type,
                    });
                }
            }
        }
    }

    /// Determine file type based on extension
    fn determine_file_type(&self, path: &Path, default_type: &StorageFileType) -> StorageFileType {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();

        match ext.as_str() {
            "mp4" | "mkv" | "webm" | "avi" | "mov" => StorageFileType::Recording,
            "png" | "jpg" | "jpeg" | "gif" | "bmp" | "webp" => StorageFileType::Screenshot,
            "thumb" | "thumbnail" => StorageFileType::Thumbnail,
            _ => default_type.clone(),
        }
    }

    /// Get a single file by path
    pub fn get_file(&self, file_path: &Path, pinned_ids: &[String]) -> Option<StorageFile> {
        if !file_path.exists() {
            return None;
        }

        let metadata = fs::metadata(file_path).ok()?;

        // Determine file type
        let is_recording = file_path.starts_with(&self.config.recordings_dir);
        let default_type = if is_recording {
            StorageFileType::Recording
        } else {
            StorageFileType::Screenshot
        };
        let file_type = self.determine_file_type(file_path, &default_type);

        // Check if pinned
        let filename = file_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
        let is_pinned = pinned_ids.iter().any(|id| filename.contains(id));

        // Get timestamps
        let created = metadata
            .created()
            .map(|t| {
                let datetime: DateTime<Local> = t.into();
                datetime.timestamp()
            })
            .unwrap_or(0);

        let modified = metadata
            .modified()
            .map(|t| {
                let datetime: DateTime<Local> = t.into();
                datetime.timestamp()
            })
            .unwrap_or(0);

        Some(StorageFile {
            path: file_path.to_path_buf(),
            size: metadata.len(),
            created,
            modified,
            is_pinned,
            file_type,
        })
    }
}

/// Result of cleanup operation
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub files_deleted: u32,
    pub bytes_freed: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_config_default() {
        let config = StorageConfig::default();
        assert!(config.organize_by_date);
        assert!(config.semantic_naming);
        assert_eq!(config.max_storage_gb, 10.0);
    }

    #[test]
    fn test_generate_recording_filename() {
        let config = StorageConfig::default();
        let manager = StorageManager::new(config);

        let filename = manager.generate_recording_filename("fullscreen", "mp4", None);
        assert!(filename.starts_with("Fullscreen_"));
        assert!(filename.ends_with(".mp4"));
    }

    #[test]
    fn test_generate_screenshot_filename() {
        let config = StorageConfig::default();
        let manager = StorageManager::new(config);

        let filename = manager.generate_screenshot_filename("window", "png", Some("MyWindow"));
        assert!(filename.starts_with("MyWindow_"));
        assert!(filename.ends_with(".png"));
    }

    #[test]
    fn test_aggregated_storage_status() {
        let config = StorageConfig::default();
        let manager = StorageManager::new(config);

        let status = manager.get_aggregated_status();

        // Should return valid stats
        assert_eq!(status.stats.recordings_count, 0);
        assert_eq!(status.stats.screenshots_count, 0);
        // With no files, usage should be 0
        assert_eq!(status.usage_percent, 0.0);
        assert!(!status.is_exceeded);
        // Config should match
        assert_eq!(status.config.max_storage_gb, 10.0);
        assert!(status.config.organize_by_date);
    }

    #[test]
    fn test_aggregated_storage_status_serialization() {
        let status = AggregatedStorageStatus {
            stats: StorageStats {
                recordings_size: 1024,
                screenshots_size: 512,
                recordings_count: 2,
                screenshots_count: 1,
                available_space: 100_000_000,
                total_space: 500_000_000,
            },
            usage_percent: 15.5,
            is_exceeded: false,
            config: StorageConfig::default(),
        };

        let json = serde_json::to_string(&status).unwrap();
        let deserialized: AggregatedStorageStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.stats.recordings_size, 1024);
        assert_eq!(deserialized.stats.screenshots_count, 1);
        assert!((deserialized.usage_percent - 15.5).abs() < 0.01);
        assert!(!deserialized.is_exceeded);
        assert_eq!(deserialized.config.max_storage_gb, 10.0);
    }

    #[test]
    fn test_aggregated_status_unlimited_storage() {
        let mut config = StorageConfig::default();
        config.max_storage_gb = 0.0; // unlimited
        let manager = StorageManager::new(config);

        let status = manager.get_aggregated_status();
        assert_eq!(status.usage_percent, 0.0);
        assert!(!status.is_exceeded);
    }
}
