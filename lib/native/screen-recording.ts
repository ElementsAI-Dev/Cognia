/**
 * Screen Recording Native API
 *
 * Provides TypeScript bindings for the Tauri screen recording commands.
 */

import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

export type RecordingStatus = 
  | "Idle" 
  | "Countdown" 
  | "Recording" 
  | "Paused" 
  | "Processing" 
  | { Error: string };

export interface RecordingConfig {
  save_directory?: string;
  format: string;
  codec: string;
  frame_rate: number;
  quality: number;
  bitrate: number;
  capture_system_audio: boolean;
  capture_microphone: boolean;
  show_cursor: boolean;
  highlight_clicks: boolean;
  countdown_seconds: number;
  show_indicator: boolean;
  max_duration: number;
  pause_on_minimize: boolean;
}

export interface RecordingMetadata {
  id: string;
  start_time: number;
  end_time?: number;
  duration_ms: number;
  width: number;
  height: number;
  mode: string;
  monitor_index?: number;
  window_title?: string;
  region?: RecordingRegion;
  file_path?: string;
  file_size: number;
  has_audio: boolean;
  thumbnail?: string;
}

export interface RecordingRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RecordingHistoryEntry {
  id: string;
  timestamp: number;
  duration_ms: number;
  width: number;
  height: number;
  mode: string;
  file_path?: string;
  file_size: number;
  thumbnail?: string;
  is_pinned: boolean;
  tags: string[];
}

export interface MonitorInfo {
  index: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_primary: boolean;
  scale_factor: number;
}

export interface AudioDevices {
  system_audio_available: boolean;
  microphones: AudioDevice[];
}

export interface AudioDevice {
  id: string;
  name: string;
  is_default: boolean;
}

// ============== Storage Types ==============

export interface StorageConfig {
  recordingsDir: string;
  screenshotsDir: string;
  organizeByDate: boolean;
  maxStorageGb: number;
  autoCleanupDays: number;
  preservePinned: boolean;
  semanticNaming: boolean;
}

export interface StorageStats {
  recordingsSize: number;
  screenshotsSize: number;
  recordingsCount: number;
  screenshotsCount: number;
  availableSpace: number;
  totalSpace: number;
}

export interface CleanupResult {
  filesDeleted: number;
  bytesFreed: number;
}

// ============== Video Processing Progress Types ==============

export interface VideoProcessingProgress {
  operation: string;
  progress: number;
  currentTime: number;
  totalDuration?: number;
  etaSeconds?: number;
  speed?: string;
  bitrate?: string;
  complete: boolean;
  error?: string;
}

// ============== Recording Control Functions ==============

/**
 * Get current recording status
 */
export async function getRecordingStatus(): Promise<RecordingStatus> {
  return invoke<RecordingStatus>("recording_get_status");
}

/**
 * Get current recording duration in milliseconds
 */
export async function getRecordingDuration(): Promise<number> {
  return invoke<number>("recording_get_duration");
}

/**
 * Start fullscreen recording
 */
export async function startFullscreenRecording(monitorIndex?: number): Promise<string> {
  return invoke<string>("recording_start_fullscreen", { monitorIndex });
}

/**
 * Start window recording
 */
export async function startWindowRecording(windowTitle?: string): Promise<string> {
  return invoke<string>("recording_start_window", { windowTitle });
}

/**
 * Start region recording
 */
export async function startRegionRecording(region: RecordingRegion): Promise<string> {
  return invoke<string>("recording_start_region", {
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  });
}

/**
 * Pause recording
 */
export async function pauseRecording(): Promise<void> {
  return invoke<void>("recording_pause");
}

/**
 * Resume recording
 */
export async function resumeRecording(): Promise<void> {
  return invoke<void>("recording_resume");
}

/**
 * Stop recording and save
 */
export async function stopRecording(): Promise<RecordingMetadata> {
  return invoke<RecordingMetadata>("recording_stop");
}

/**
 * Cancel recording without saving
 */
export async function cancelRecording(): Promise<void> {
  return invoke<void>("recording_cancel");
}

// ============== Configuration Functions ==============

/**
 * Get recording configuration
 */
export async function getRecordingConfig(): Promise<RecordingConfig> {
  return invoke<RecordingConfig>("recording_get_config");
}

/**
 * Update recording configuration
 */
export async function updateRecordingConfig(config: RecordingConfig): Promise<void> {
  return invoke<void>("recording_update_config", { config });
}

// ============== System Info Functions ==============

/**
 * Get available monitors
 */
export async function getRecordingMonitors(): Promise<MonitorInfo[]> {
  return invoke<MonitorInfo[]>("recording_get_monitors");
}

/**
 * Check if FFmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  return invoke<boolean>("recording_check_ffmpeg");
}

/**
 * Get available audio devices
 */
export async function getAudioDevices(): Promise<AudioDevices> {
  return invoke<AudioDevices>("recording_get_audio_devices");
}

// ============== History Functions ==============

/**
 * Get recording history
 */
export async function getRecordingHistory(count?: number): Promise<RecordingHistoryEntry[]> {
  return invoke<RecordingHistoryEntry[]>("recording_get_history", { count });
}

/**
 * Delete recording from history
 */
export async function deleteRecording(id: string): Promise<void> {
  return invoke<void>("recording_delete", { id });
}

/**
 * Clear recording history
 */
export async function clearRecordingHistory(): Promise<void> {
  return invoke<void>("recording_clear_history");
}

/**
 * Pin a recording entry
 */
export async function pinRecording(id: string): Promise<boolean> {
  return invoke<boolean>("recording_pin", { id });
}

/**
 * Unpin a recording entry
 */
export async function unpinRecording(id: string): Promise<boolean> {
  return invoke<boolean>("recording_unpin", { id });
}

/**
 * Get a recording by ID
 */
export async function getRecordingById(id: string): Promise<RecordingHistoryEntry | null> {
  return invoke<RecordingHistoryEntry | null>("recording_get_by_id", { id });
}

/**
 * Search recordings by tag
 */
export async function searchRecordingsByTag(tag: string): Promise<RecordingHistoryEntry[]> {
  return invoke<RecordingHistoryEntry[]>("recording_search_by_tag", { tag });
}

/**
 * Add a tag to a recording
 */
export async function addRecordingTag(id: string, tag: string): Promise<boolean> {
  return invoke<boolean>("recording_add_tag", { id, tag });
}

/**
 * Remove a tag from a recording
 */
export async function removeRecordingTag(id: string, tag: string): Promise<boolean> {
  return invoke<boolean>("recording_remove_tag", { id, tag });
}

/**
 * Recording statistics
 */
export interface RecordingStats {
  total_size: number;
  total_duration_ms: number;
  total_entries: number;
  pinned_count: number;
}

/**
 * Get recording statistics (total size, duration, entry count)
 */
export async function getRecordingStats(): Promise<RecordingStats> {
  return invoke<RecordingStats>("recording_get_stats");
}

// ============== Utility Functions ==============

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const s = seconds % 60;
  const m = minutes % 60;

  if (hours > 0) {
    return `${hours}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get default recording configuration
 */
export function getDefaultRecordingConfig(): RecordingConfig {
  return {
    format: "mp4",
    codec: "h264",
    frame_rate: 30,
    quality: 80,
    bitrate: 0,
    capture_system_audio: true,
    capture_microphone: false,
    show_cursor: true,
    highlight_clicks: false,
    countdown_seconds: 3,
    show_indicator: true,
    max_duration: 0,
    pause_on_minimize: false,
  };
}

// ============== FFmpeg Types ==============

export interface FFmpegInfo {
  available: boolean;
  version?: string;
  version_full?: string;
  path?: string;
  version_ok: boolean;
  encoders: string[];
  decoders: string[];
}

export interface FFmpegInstallGuide {
  platform: string;
  download_url: string;
  instructions: string[];
  quick_install?: string;
}

export interface HardwareAcceleration {
  nvidia: boolean;
  intel_qsv: boolean;
  amd_amf: boolean;
  vaapi: boolean;
}

// ============== FFmpeg Functions ==============

/**
 * Get detailed FFmpeg information
 */
export async function getFFmpegInfo(): Promise<FFmpegInfo> {
  return invoke<FFmpegInfo>("ffmpeg_get_info");
}

/**
 * Get FFmpeg installation guide for current platform
 */
export async function getFFmpegInstallGuide(): Promise<FFmpegInstallGuide> {
  return invoke<FFmpegInstallGuide>("ffmpeg_get_install_guide");
}

/**
 * Check hardware acceleration availability
 */
export async function checkHardwareAcceleration(): Promise<HardwareAcceleration> {
  return invoke<HardwareAcceleration>("ffmpeg_check_hardware_acceleration");
}

/**
 * Check if FFmpeg meets minimum version requirements
 */
export async function checkFFmpegVersion(): Promise<boolean> {
  return invoke<boolean>("ffmpeg_check_version");
}
// ============== Storage Management Functions ==============

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  return invoke<StorageStats>("storage_get_stats");
}

/**
 * Get storage configuration
 */
export async function getStorageConfig(): Promise<StorageConfig> {
  return invoke<StorageConfig>("storage_get_config");
}

/**
 * Update storage configuration
 */
export async function updateStorageConfig(config: StorageConfig): Promise<void> {
  return invoke<void>("storage_update_config", { config });
}

/**
 * Generate filename for a new recording
 */
export async function generateRecordingFilename(
  mode: string,
  format: string,
  customName?: string
): Promise<string> {
  return invoke<string>("storage_generate_recording_filename", { mode, format, customName });
}

/**
 * Get full path for a recording file
 */
export async function getRecordingPath(filename: string): Promise<string> {
  return invoke<string>("storage_get_recording_path", { filename });
}

/**
 * Generate filename for a screenshot
 */
export async function generateScreenshotFilename(
  mode: string,
  format: string,
  customName?: string
): Promise<string> {
  return invoke<string>("storage_generate_screenshot_filename", { mode, format, customName });
}

/**
 * Get full path for a screenshot file
 */
export async function getScreenshotPath(filename: string): Promise<string> {
  return invoke<string>("storage_get_screenshot_path", { filename });
}

/**
 * Check if storage limit is exceeded
 */
export async function isStorageExceeded(): Promise<boolean> {
  return invoke<boolean>("storage_is_exceeded");
}

/**
 * Get storage usage percentage
 */
export async function getStorageUsagePercent(): Promise<number> {
  return invoke<number>("storage_get_usage_percent");
}

/**
 * Cleanup old files based on configuration
 */
export async function cleanupStorage(): Promise<CleanupResult> {
  return invoke<CleanupResult>("storage_cleanup");
}