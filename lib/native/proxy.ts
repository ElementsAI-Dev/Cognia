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
    console.error('Failed to detect proxies:', error);
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
    return await invoke<SystemProxySettings>('proxy_get_system');
  } catch (error) {
    console.error('Failed to get system proxy:', error);
    return null;
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

/** Proxy service object for convenient access */
export const proxyService = {
  isAvailable: isProxyAvailable,
  detectAll: detectAllProxies,
  test: testProxy,
  testMulti: testProxyMulti,
  getSystem: getSystemProxy,
  checkPort,
  getClashInfo,
  buildUrl: buildProxyUrlFromDetected,
};

export default proxyService;
