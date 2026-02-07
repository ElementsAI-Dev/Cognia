/**
 * Multi-provider OCR API
 *
 * Supports multiple OCR providers including:
 * - Windows OCR (built-in, Windows 10+)
 * - OpenAI Vision (GPT-4o)
 * - Anthropic Claude Vision (Claude Sonnet 4.5)
 * - Ollama Vision (llama3.2-vision, etc.)
 * - Google Cloud Vision
 * - Azure Computer Vision (v4.0 + v3.2)
 * - Tesseract OCR (local binary)
 */

import { invoke } from "@tauri-apps/api/core";

// ============== Types ==============

/** Available OCR provider types */
export type OcrProviderType =
  | "windows_ocr"
  | "google_vision"
  | "azure_vision"
  | "openai_vision"
  | "anthropic_vision"
  | "ollama_vision"
  | "tesseract";

/** OCR region type */
export type OcrRegionType = "word" | "line" | "paragraph" | "block";

/** Document hint for better OCR */
export type DocumentHint =
  | "document"
  | "dense_text"
  | "sparse_text"
  | "handwriting"
  | "receipt"
  | "screenshot";

/** Bounding box for OCR text */
export interface OcrBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A region of recognized text */
export interface OcrRegion {
  text: string;
  bounds: OcrBounds;
  confidence: number;
  region_type: OcrRegionType;
}

/** Unified OCR result from any provider */
export interface OcrResult {
  text: string;
  regions: OcrRegion[];
  confidence: number;
  language?: string;
  provider: string;
  processing_time_ms: number;
}

/** Information about an OCR provider */
export interface OcrProviderInfo {
  provider_type: OcrProviderType;
  display_name: string;
  available: boolean;
  requires_api_key: boolean;
  is_local: boolean;
  languages: string[];
  description: string;
}

/** Response from get providers */
export interface ProviderInfoResponse {
  providers: OcrProviderInfo[];
  default_provider: OcrProviderType;
}

/** OCR request options */
export interface OcrOptions {
  language?: string;
  document_hint?: DocumentHint;
  detect_orientation?: boolean;
  word_level?: boolean;
}

/** Provider configuration */
export interface OcrProviderConfig {
  provider_type: OcrProviderType;
  enabled?: boolean;
  api_key?: string;
  endpoint?: string;
  model?: string;
  default_language?: string;
}

/** OCR request parameters */
export interface OcrRequest {
  image_base64: string;
  provider?: OcrProviderType;
  options?: {
    language?: string;
    word_level?: boolean;
  };
}

// ============== API Functions ==============

/**
 * Get information about all OCR providers
 */
export async function getProviders(): Promise<ProviderInfoResponse> {
  return invoke("ocr_get_providers");
}

/**
 * Set the default OCR provider
 */
export async function setDefaultProvider(
  provider: OcrProviderType
): Promise<void> {
  return invoke("ocr_set_default_provider", { provider });
}

/**
 * Configure an OCR provider
 */
export async function configureProvider(
  config: OcrProviderConfig
): Promise<void> {
  return invoke("ocr_configure_provider", { config });
}

/**
 * Register Ollama provider (auto-detects if available)
 */
export async function registerOllama(
  endpoint?: string,
  model?: string
): Promise<boolean> {
  return invoke("ocr_register_ollama", { endpoint, model });
}

/**
 * Extract text from image using OCR
 */
export async function extractText(request: OcrRequest): Promise<OcrResult> {
  return invoke("ocr_extract_text", { request });
}

/**
 * Extract text with automatic fallback to other providers
 */
export async function extractTextWithFallback(
  imageBase64: string,
  preferredProviders: OcrProviderType[],
  language?: string
): Promise<OcrResult> {
  return invoke("ocr_extract_text_with_fallback", {
    imageBase64,
    preferredProviders,
    language,
  });
}

/**
 * Check if a provider is available
 */
export async function isProviderAvailable(
  provider: OcrProviderType
): Promise<boolean> {
  return invoke("ocr_is_provider_available", { provider });
}

/**
 * Get supported languages for a provider
 */
export async function getProviderLanguages(
  provider: OcrProviderType
): Promise<string[]> {
  return invoke("ocr_get_provider_languages", { provider });
}

/**
 * Clear the OCR result cache
 */
export async function clearCache(): Promise<void> {
  return invoke("ocr_clear_cache");
}

// ============== Helper Functions ==============

/**
 * Get display name for a provider type
 */
export function getProviderDisplayName(provider: OcrProviderType): string {
  const names: Record<OcrProviderType, string> = {
    windows_ocr: "Windows OCR",
    google_vision: "Google Cloud Vision",
    azure_vision: "Azure Computer Vision",
    openai_vision: "OpenAI Vision",
    anthropic_vision: "Anthropic Claude Vision",
    ollama_vision: "Ollama Vision",
    tesseract: "Tesseract OCR",
  };
  return names[provider] || provider;
}

/**
 * Check if a provider requires an API key
 */
export function providerRequiresApiKey(provider: OcrProviderType): boolean {
  return ["google_vision", "azure_vision", "openai_vision", "anthropic_vision"].includes(provider);
}

/**
 * Check if a provider is local (no network required)
 */
export function isProviderLocal(provider: OcrProviderType): boolean {
  return ["windows_ocr", "tesseract"].includes(provider);
}

/**
 * Convert image file to base64
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix if present
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert canvas to base64 PNG
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}

// Default export for convenience
const ocrApi = {
  getProviders,
  setDefaultProvider,
  configureProvider,
  registerOllama,
  extractText,
  extractTextWithFallback,
  isProviderAvailable,
  getProviderLanguages,
  clearCache,
  getProviderDisplayName,
  providerRequiresApiKey,
  isProviderLocal,
  imageToBase64,
  canvasToBase64,
};

export default ocrApi;
