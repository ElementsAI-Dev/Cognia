/**
 * Proxy Service - Interface to Tauri backend for proxy management
 *
 * Provides functions for:
 * - Auto-detecting proxy software (Clash, V2Ray, etc.)
 * - Testing proxy connectivity
 * - Getting/setting system proxy
 */

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';
import { loggers } from '@/lib/logger';
import { normalizeProxyUrl, pickPreferredSystemProxyUrl } from '@/lib/network/proxy-resolution';

const log = loggers.native;
import type {
  DetectedProxy,
  ProxyTestResult,
} from '@/types/system/proxy';

/** Endpoint test result */
export interface EndpointTestResult {
  url: string;
  name: string;
  success: boolean;
  latency?: number;
  statusCode?: number;
  error?: string;
}

/** Multi-endpoint test result */
export interface MultiEndpointTestResult {
  overallSuccess: boolean;
  successfulEndpoints: number;
  totalEndpoints: number;
  avgLatency?: number;
  bestEndpoint?: string;
  results: EndpointTestResult[];
  ip?: string;
  location?: string;
}

/** System proxy settings from OS */
export interface SystemProxySettings {
  enabled: boolean;
  httpProxy: string | null;
  httpsProxy: string | null;
  socksProxy: string | null;
  noProxy: string | null;
}

interface RawSystemProxySettings {
  enabled?: unknown;
  httpProxy?: unknown;
  httpsProxy?: unknown;
  socksProxy?: unknown;
  noProxy?: unknown;
  http_proxy?: unknown;
  https_proxy?: unknown;
  socks_proxy?: unknown;
  no_proxy?: unknown;
}

export interface SystemProxyResolution {
  proxyUrl: string | null;
  settings: SystemProxySettings | null;
  error: string | null;
}

function toMaybeString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapInvokeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function normalizeSystemProxySettings(raw: unknown): SystemProxySettings | null {
  if (!raw || typeof raw !== 'object') return null;

  const value = raw as RawSystemProxySettings;
  const httpProxy = normalizeProxyUrl(toMaybeString(value.httpProxy ?? value.http_proxy));
  const httpsProxy = normalizeProxyUrl(toMaybeString(value.httpsProxy ?? value.https_proxy));
  const socksProxy = normalizeProxyUrl(toMaybeString(value.socksProxy ?? value.socks_proxy));
  const noProxy = toMaybeString(value.noProxy ?? value.no_proxy);

  return {
    enabled: Boolean(value.enabled),
    httpProxy,
    httpsProxy,
    socksProxy,
    noProxy,
  };
}

export function getPreferredSystemProxyUrl(
  settings: SystemProxySettings | null
): string | null {
  return pickPreferredSystemProxyUrl(settings);
}

/** Check if proxy management is available */
export function isProxyAvailable(): boolean {
  return isTauri();
}

/** Detect all running proxy software */
export async function detectAllProxies(): Promise<DetectedProxy[]> {
  if (!isTauri()) {
    return [];
  }

  try {
    return await invoke<DetectedProxy[]>('proxy_detect_all');
  } catch (error) {
    log.error('Failed to detect proxies', error as Error);
    return [];
  }
}

/** Test proxy connectivity */
export async function testProxy(
  proxyUrl: string,
  testUrl?: string
): Promise<ProxyTestResult> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Proxy testing requires Tauri environment',
    };
  }

  try {
    return await invoke<ProxyTestResult>('proxy_test', {
      proxyUrl,
      testUrl,
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Get system proxy settings */
export async function getSystemProxy(): Promise<SystemProxySettings | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    const raw = await invoke<unknown>('proxy_get_system');
    return normalizeSystemProxySettings(raw);
  } catch (error) {
    log.error('Failed to get system proxy', error as Error);
    return null;
  }
}

/** Resolve current system proxy endpoint and keep error details for UI handling. */
export async function resolveSystemProxy(): Promise<SystemProxyResolution> {
  if (!isTauri()) {
    return {
      proxyUrl: null,
      settings: null,
      error: 'System proxy resolution requires Tauri environment',
    };
  }

  try {
    const raw = await invoke<unknown>('proxy_get_system');
    const settings = normalizeSystemProxySettings(raw);
    if (!settings) {
      return {
        proxyUrl: null,
        settings: null,
        error: 'Invalid system proxy response',
      };
    }

    const proxyUrl = getPreferredSystemProxyUrl(settings);
    return {
      proxyUrl,
      settings,
      error: proxyUrl ? null : 'System proxy is not configured',
    };
  } catch (error) {
    return {
      proxyUrl: null,
      settings: null,
      error: mapInvokeError(error, 'Failed to resolve system proxy'),
    };
  }
}

/** Check if a specific port is open */
export async function checkPort(host: string, port: number): Promise<boolean> {
  if (!isTauri()) {
    return false;
  }

  try {
    return await invoke<boolean>('proxy_check_port', { host, port });
  } catch {
    return false;
  }
}

/** Get Clash API info */
export async function getClashInfo(
  apiPort: number
): Promise<Record<string, unknown> | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    return await invoke<Record<string, unknown>>('proxy_get_clash_info', {
      apiPort,
    });
  } catch {
    return null;
  }
}

/** Test proxy connectivity with multiple endpoints */
export async function testProxyMulti(
  proxyUrl: string,
  testUrls?: string[]
): Promise<MultiEndpointTestResult> {
  if (!isTauri()) {
    return {
      overallSuccess: false,
      successfulEndpoints: 0,
      totalEndpoints: 0,
      results: [],
    };
  }

  try {
    const result = await invoke<{
      overall_success: boolean;
      successful_endpoints: number;
      total_endpoints: number;
      avg_latency?: number;
      best_endpoint?: string;
      results: Array<{
        url: string;
        name: string;
        success: boolean;
        latency?: number;
        status_code?: number;
        error?: string;
      }>;
      ip?: string;
      location?: string;
    }>('proxy_test_multi', {
      proxyUrl,
      testUrls,
    });

    // Convert snake_case to camelCase
    return {
      overallSuccess: result.overall_success,
      successfulEndpoints: result.successful_endpoints,
      totalEndpoints: result.total_endpoints,
      avgLatency: result.avg_latency,
      bestEndpoint: result.best_endpoint,
      results: result.results.map((r) => ({
        url: r.url,
        name: r.name,
        success: r.success,
        latency: r.latency,
        statusCode: r.status_code,
        error: r.error,
      })),
      ip: result.ip,
      location: result.location,
    };
  } catch {
    return {
      overallSuccess: false,
      successfulEndpoints: 0,
      totalEndpoints: 0,
      results: [],
    };
  }
}

/** Build proxy URL from detected proxy */
export function buildProxyUrlFromDetected(proxy: DetectedProxy): string | null {
  if (!proxy.running) {
    return null;
  }

  const port = proxy.mixedPort || proxy.httpPort;
  if (!port) {
    return null;
  }

  return `http://127.0.0.1:${port}`;
}

/** Set the global proxy URL in the Rust backend.
 * 
 * This syncs the frontend proxy configuration to the backend,
 * ensuring all Rust HTTP clients use the configured proxy.
 * Pass null to disable the proxy.
 */
export async function setBackendProxy(proxyUrl: string | null): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke('set_backend_proxy', { proxyUrl: proxyUrl || null });
    log.info(`Backend proxy ${proxyUrl ? `set to: ${proxyUrl}` : 'disabled'}`);
  } catch (error) {
    const message = mapInvokeError(error, 'Failed to set backend proxy');
    log.error('Failed to set backend proxy:', error);
    throw new Error(message);
  }
}

/** Get the current global proxy URL from the Rust backend. */
export async function getBackendProxy(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    return await invoke<string | null>('get_backend_proxy');
  } catch (error) {
    log.error('Failed to get backend proxy:', error);
    return null;
  }
}

/** Sync backend proxy only when effective endpoint changes. */
export async function syncBackendProxy(
  proxyUrl: string | null
): Promise<{ changed: boolean; current: string | null }> {
  if (!isTauri()) {
    return { changed: false, current: null };
  }

  const target = proxyUrl || null;
  const current = await getBackendProxy();
  if (current === target) {
    return { changed: false, current };
  }

  await setBackendProxy(target);
  return {
    changed: true,
    current: target,
  };
}

/** Proxy service object for convenient access */
export const proxyService = {
  isAvailable: isProxyAvailable,
  detectAll: detectAllProxies,
  test: testProxy,
  testMulti: testProxyMulti,
  getSystem: getSystemProxy,
  resolveSystemProxy,
  checkPort,
  getClashInfo,
  buildUrl: buildProxyUrlFromDetected,
  setBackendProxy,
  getBackendProxy,
  syncBackendProxy,
};

export default proxyService;
