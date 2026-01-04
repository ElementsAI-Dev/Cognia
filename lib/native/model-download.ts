/**
 * Model Download API
 *
 * Supports downloading models from multiple sources with:
 * - Multiple mirror sources (HuggingFace, ModelScope, GitHub)
 * - Automatic proxy detection and usage
 * - Progress tracking with events
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// ============== Types ==============

/** Model download source */
export type ModelSource =
  | "hugging_face"
  | "model_scope"
  | "git_hub"
  | "ollama"
  | "custom";

/** Model category */
export type ModelCategory =
  | "ocr"
  | "llm"
  | "embedding"
  | "vision"
  | "speech"
  | "other";

/** Download status */
export type DownloadStatus =
  | "pending"
  | "connecting"
  | "downloading"
  | "verifying"
  | "completed"
  | "failed"
  | "cancelled";

/** Model definition */
export interface ModelDefinition {
  id: string;
  name: string;
  category: ModelCategory;
  description: string;
  size: number;
  sources: Record<ModelSource, string>;
  default_source: ModelSource;
  filename: string;
  subdir?: string;
  required: boolean;
}

/** Download configuration */
export interface DownloadConfig {
  preferred_sources: ModelSource[];
  proxy_url?: string;
  use_system_proxy: boolean;
  timeout_secs: number;
  max_retries: number;
  custom_mirrors: Record<string, string>;
}

/** Download progress event */
export interface DownloadProgress {
  model_id: string;
  status: DownloadStatus;
  source: ModelSource;
  total_bytes: number;
  downloaded_bytes: number;
  percent: number;
  speed_bps: number;
  eta_secs?: number;
  error?: string;
}

/** Download result */
export interface DownloadResult {
  model_id: string;
  success: boolean;
  path?: string;
  source_used?: ModelSource;
  download_time_secs: number;
  error?: string;
}

// ============== API Functions ==============

/**
 * Get list of available models
 */
export async function listAvailableModels(): Promise<ModelDefinition[]> {
  return invoke("model_list_available");
}

/**
 * Get list of installed model IDs
 */
export async function listInstalledModels(): Promise<string[]> {
  return invoke("model_list_installed");
}

/**
 * Get download configuration
 */
export async function getDownloadConfig(): Promise<DownloadConfig> {
  return invoke("model_get_download_config");
}

/**
 * Set download configuration
 */
export async function setDownloadConfig(config: DownloadConfig): Promise<void> {
  return invoke("model_set_download_config", { config });
}

/**
 * Download a model
 */
export async function downloadModel(
  modelId: string,
  source?: ModelSource,
  config?: DownloadConfig
): Promise<DownloadResult> {
  return invoke("model_download", { modelId, source, config });
}

/**
 * Delete a downloaded model
 */
export async function deleteModel(modelId: string): Promise<boolean> {
  return invoke("model_delete", { modelId });
}

/**
 * Get available model sources
 */
export async function getModelSources(): Promise<
  Array<[ModelSource, string]>
> {
  return invoke("model_get_sources");
}

/**
 * Detect system proxy
 */
export async function detectProxy(): Promise<string | null> {
  return invoke("model_detect_proxy");
}

/**
 * Test a proxy URL
 */
export async function testProxy(proxyUrl: string): Promise<boolean> {
  return invoke("model_test_proxy", { proxyUrl });
}

// ============== Event Listeners ==============

/**
 * Listen for download progress events
 */
export async function onDownloadProgress(
  callback: (progress: DownloadProgress) => void
): Promise<UnlistenFn> {
  return listen<DownloadProgress>("model-download-progress", (event) => {
    callback(event.payload);
  });
}

// ============== Helper Functions ==============

/**
 * Get source display name
 */
export function getSourceDisplayName(source: ModelSource): string {
  const names: Record<ModelSource, string> = {
    hugging_face: "HuggingFace",
    model_scope: "ModelScope (CN)",
    git_hub: "GitHub",
    ollama: "Ollama",
    custom: "Custom URL",
  };
  return names[source] || source;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: ModelCategory): string {
  const names: Record<ModelCategory, string> = {
    ocr: "OCR",
    llm: "Language Model",
    embedding: "Embedding",
    vision: "Vision",
    speech: "Speech",
    other: "Other",
  };
  return names[category] || category;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Format download speed
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

/**
 * Format ETA
 */
export function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Get default download config
 */
export function getDefaultDownloadConfig(): DownloadConfig {
  return {
    preferred_sources: ["hugging_face", "model_scope"],
    use_system_proxy: true,
    timeout_secs: 300,
    max_retries: 3,
    custom_mirrors: {},
  };
}

// Default export
const modelDownloadApi = {
  listAvailableModels,
  listInstalledModels,
  getDownloadConfig,
  setDownloadConfig,
  downloadModel,
  deleteModel,
  getModelSources,
  detectProxy,
  testProxy,
  onDownloadProgress,
  getSourceDisplayName,
  getCategoryDisplayName,
  formatFileSize,
  formatSpeed,
  formatEta,
  getDefaultDownloadConfig,
};

export default modelDownloadApi;
