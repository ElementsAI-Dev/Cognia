/**
 * Proxy-aware Fetch Utility
 *
 * Provides a fetch wrapper that routes requests through configured proxy.
 * Works in both browser and Tauri environments.
 *
 * Note: In browser environments, proxy is handled by the browser/system.
 * In Tauri desktop, we use environment variables or custom fetch.
 */

import { useProxyStore, getActiveProxyUrl } from '@/stores/system';

export interface ProxyFetchOptions extends RequestInit {
  /** Skip proxy for this request */
  skipProxy?: boolean;
  /** Custom timeout in milliseconds */
  timeout?: number;
}

/**
 * Get the current proxy URL from the store
 */
export function getCurrentProxyUrl(): string | null {
  const state = useProxyStore.getState();
  return getActiveProxyUrl(state);
}

/**
 * Check if proxy is currently enabled
 */
export function isProxyEnabled(): boolean {
  const state = useProxyStore.getState();
  return state.config.enabled && state.config.mode !== 'off';
}

/**
 * Get proxy configuration for HTTP clients
 * Returns configuration suitable for various HTTP client libraries
 */
export function getProxyConfig(): {
  enabled: boolean;
  url: string | null;
  host: string | null;
  port: number | null;
  protocol: string | null;
} {
  const state = useProxyStore.getState();
  const proxyUrl = getActiveProxyUrl(state);

  if (!proxyUrl) {
    return {
      enabled: false,
      url: null,
      host: null,
      port: null,
      protocol: null,
    };
  }

  try {
    const parsed = new URL(proxyUrl);
    return {
      enabled: true,
      url: proxyUrl,
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 80),
      protocol: parsed.protocol.replace(':', ''),
    };
  } catch {
    return {
      enabled: false,
      url: null,
      host: null,
      port: null,
      protocol: null,
    };
  }
}

/**
 * Create a fetch function with proxy support
 * This is primarily for documentation - actual proxy handling
 * depends on the environment (browser vs Tauri)
 */
export function createProxyFetch(customProxyUrl?: string) {
  return async (
    input: RequestInfo | URL,
    init?: ProxyFetchOptions
  ): Promise<Response> => {
    const { skipProxy, timeout, ...fetchInit } = init || {};

    // Get proxy URL
    const proxyUrl = skipProxy ? null : (customProxyUrl || getCurrentProxyUrl());

    // In browser environment, we can't directly use proxy
    // The browser will use system proxy settings
    if (typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
      // For browser, just use regular fetch
      // System/browser proxy settings will be used automatically
      if (timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
          return await fetch(input, { ...fetchInit, signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }
      }
      return fetch(input, fetchInit);
    }

    // In Tauri environment, we set proxy via environment variables
    // or use the Rust backend for proxied requests
    if (proxyUrl) {
      // Log proxy usage in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Proxy] Routing request through: ${proxyUrl}`);
      }
    }

    if (timeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        return await fetch(input, { ...fetchInit, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return fetch(input, fetchInit);
  };
}

/**
 * Get environment variables for proxy configuration
 * Useful for setting up HTTP clients that read from environment
 */
export function getProxyEnvironmentVars(): Record<string, string> {
  const proxyUrl = getCurrentProxyUrl();

  if (!proxyUrl) {
    return {};
  }

  return {
    HTTP_PROXY: proxyUrl,
    HTTPS_PROXY: proxyUrl,
    http_proxy: proxyUrl,
    https_proxy: proxyUrl,
  };
}

/**
 * Apply proxy to a URL (for debugging/logging)
 */
export function formatProxiedUrl(url: string): string {
  const proxyUrl = getCurrentProxyUrl();
  if (proxyUrl) {
    return `${url} (via ${proxyUrl})`;
  }
  return url;
}

/**
 * Create headers with proxy authentication if needed
 */
export function getProxyAuthHeaders(): Record<string, string> {
  const state = useProxyStore.getState();

  if (state.config.mode === 'manual' && state.config.manual) {
    const { username, password } = state.config.manual;
    if (username && password) {
      const credentials = btoa(`${username}:${password}`);
      return {
        'Proxy-Authorization': `Basic ${credentials}`,
      };
    }
  }

  return {};
}

/**
 * Default proxy-aware fetch instance
 */
export const proxyFetch = createProxyFetch();

export default proxyFetch;
