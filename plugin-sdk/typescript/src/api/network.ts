/**
 * Network API Types
 *
 * @description Type definitions for network operations in plugins.
 */

/**
 * Network API for making HTTP requests
 *
 * @remarks
 * Provides methods for making HTTP requests with automatic error handling
 * and response parsing.
 *
 * @example
 * ```typescript
 * // GET request
 * const response = await context.network.get<{ data: string }>('https://api.example.com/data');
 * console.log(response.data);
 *
 * // POST request
 * const result = await context.network.post('https://api.example.com/create', {
 *   name: 'Test',
 * });
 *
 * // Download file
 * await context.network.download(
 *   'https://example.com/file.pdf',
 *   '/path/to/save.pdf',
 *   {
 *     onProgress: (progress) => {
 *       console.log(`${progress.percent}% complete`);
 *     },
 *   }
 * );
 * ```
 */
export interface PluginNetworkAPI {
  get: <T>(url: string, options?: NetworkRequestOptions) => Promise<NetworkResponse<T>>;
  post: <T>(url: string, body?: unknown, options?: NetworkRequestOptions) => Promise<NetworkResponse<T>>;
  put: <T>(url: string, body?: unknown, options?: NetworkRequestOptions) => Promise<NetworkResponse<T>>;
  delete: <T>(url: string, options?: NetworkRequestOptions) => Promise<NetworkResponse<T>>;
  patch: <T>(url: string, body?: unknown, options?: NetworkRequestOptions) => Promise<NetworkResponse<T>>;
  fetch: <T>(url: string, options?: NetworkRequestOptions) => Promise<NetworkResponse<T>>;
  download: (url: string, destPath: string, options?: DownloadOptions) => Promise<DownloadResult>;
  upload: (url: string, filePath: string, options?: UploadOptions) => Promise<NetworkResponse<unknown>>;
}

/**
 * Network request options
 */
export interface NetworkRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  signal?: AbortSignal;
}

/**
 * Network response
 */
export interface NetworkResponse<T> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
}

/**
 * Download options
 */
export interface DownloadOptions {
  headers?: Record<string, string>;
  onProgress?: (progress: DownloadProgress) => void;
}

/**
 * Download progress
 */
export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;
}

/**
 * Download result
 */
export interface DownloadResult {
  path: string;
  size: number;
  contentType?: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  headers?: Record<string, string>;
  fieldName?: string;
  onProgress?: (progress: DownloadProgress) => void;
}
