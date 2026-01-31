'use client';

/**
 * useProxyHealthMonitor - Periodic health monitoring for network proxy
 *
 * Features:
 * - Automatic periodic health checks using proxyService.test()
 * - Integration with proxy store health state
 * - Configurable check interval and failure thresholds
 * - Event callbacks for status changes
 *
 * Reuses patterns from:
 * - useApiHealth (hooks/network/use-network-status.ts)
 * - AvailabilityMonitor (lib/ai/infrastructure/availability-monitor.ts)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProxyStore, getActiveProxyUrl, type ProxyHealthCheckResult } from '@/stores/system';
import { proxyService } from '@/lib/native/proxy';
import { isTauri } from '@/lib/native/utils';

export interface ProxyHealthMonitorConfig {
  /** Health check interval in milliseconds (default: 30000 = 30 seconds) */
  checkInterval: number;
  /** Number of consecutive failures before marking unhealthy */
  failureThreshold: number;
  /** Enable automatic monitoring on mount */
  autoStart: boolean;
  /** Custom test URL (optional, uses store config if not provided) */
  testUrl?: string;
}

export interface ProxyHealthStatus {
  /** Whether the proxy is currently healthy */
  isHealthy: boolean;
  /** Whether monitoring is active */
  isMonitoring: boolean;
  /** Last health check result */
  lastCheck: ProxyHealthCheckResult | null;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Average latency from recent checks (ms) */
  avgLatency: number;
  /** Total checks performed */
  totalChecks: number;
  /** Uptime percentage */
  uptimePercentage: number;
}

export interface UseProxyHealthMonitorReturn extends ProxyHealthStatus {
  /** Start health monitoring */
  startMonitoring: () => void;
  /** Stop health monitoring */
  stopMonitoring: () => void;
  /** Perform a single health check */
  checkNow: () => Promise<ProxyHealthCheckResult>;
  /** Clear health history */
  clearHistory: () => void;
}

const DEFAULT_CONFIG: ProxyHealthMonitorConfig = {
  checkInterval: 30000, // 30 seconds
  failureThreshold: 3,
  autoStart: false,
};

/**
 * Hook for monitoring proxy health with periodic checks
 */
export function useProxyHealthMonitor(
  config?: Partial<ProxyHealthMonitorConfig>
): UseProxyHealthMonitorReturn {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const {
    config: proxyConfig,
    health,
    setHealthMonitoring,
    recordHealthCheck,
    clearHealthHistory,
  } = useProxyStore();

  const [totalChecks, setTotalChecks] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAvailable = isTauri();

  // Calculate uptime from history
  const uptimePercentage =
    health.checkHistory.length > 0
      ? (health.checkHistory.filter((r) => r.healthy).length / health.checkHistory.length) * 100
      : 100;

  // Determine if proxy is healthy based on consecutive failures
  const isHealthy = health.consecutiveFailures < mergedConfig.failureThreshold;

  /**
   * Perform a single health check
   */
  const checkNow = useCallback(async (): Promise<ProxyHealthCheckResult> => {
    const state = useProxyStore.getState();
    const proxyUrl = getActiveProxyUrl(state);

    // If proxy is not configured or disabled, return healthy (no proxy = direct connection)
    if (!proxyUrl || !state.config.enabled || state.config.mode === 'off') {
      const result: ProxyHealthCheckResult = {
        healthy: true,
        timestamp: new Date().toISOString(),
      };
      return result;
    }

    // If not in Tauri, we can't test proxy
    if (!isAvailable) {
      const result: ProxyHealthCheckResult = {
        healthy: false,
        error: 'Proxy health check requires Tauri environment',
        timestamp: new Date().toISOString(),
      };
      recordHealthCheck(result);
      setTotalChecks((c) => c + 1);
      return result;
    }

    const testUrl = mergedConfig.testUrl || state.config.testUrl;
    const startTime = Date.now();

    try {
      const testResult = await proxyService.test(proxyUrl, testUrl);
      const result: ProxyHealthCheckResult = {
        healthy: testResult.success,
        latency: testResult.latency,
        error: testResult.error,
        timestamp: new Date().toISOString(),
      };

      recordHealthCheck(result);
      setTotalChecks((c) => c + 1);
      return result;
    } catch (error) {
      const result: ProxyHealthCheckResult = {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      };

      recordHealthCheck(result);
      setTotalChecks((c) => c + 1);
      return result;
    }
  }, [isAvailable, mergedConfig.testUrl, recordHealthCheck]);

  /**
   * Start periodic health monitoring
   */
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return; // Already monitoring

    setHealthMonitoring(true);

    // Perform initial check
    checkNow();

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      checkNow();
    }, mergedConfig.checkInterval);
  }, [checkNow, mergedConfig.checkInterval, setHealthMonitoring]);

  /**
   * Stop health monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHealthMonitoring(false);
  }, [setHealthMonitoring]);

  /**
   * Clear health history
   */
  const clearHistory = useCallback(() => {
    clearHealthHistory();
    setTotalChecks(0);
  }, [clearHealthHistory]);

  // Auto-start monitoring if configured
  useEffect(() => {
    if (mergedConfig.autoStart && proxyConfig.enabled && proxyConfig.mode !== 'off') {
      queueMicrotask(startMonitoring);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mergedConfig.autoStart, proxyConfig.enabled, proxyConfig.mode, startMonitoring]);

  // Stop monitoring when proxy is disabled
  useEffect(() => {
    if (!proxyConfig.enabled || proxyConfig.mode === 'off') {
      stopMonitoring();
    }
  }, [proxyConfig.enabled, proxyConfig.mode, stopMonitoring]);

  return {
    isHealthy,
    isMonitoring: health.isMonitoring,
    lastCheck: health.lastCheck || null,
    consecutiveFailures: health.consecutiveFailures,
    avgLatency: health.avgLatency,
    totalChecks,
    uptimePercentage,
    startMonitoring,
    stopMonitoring,
    checkNow,
    clearHistory,
  };
}

/**
 * Simple hook to get current proxy health status (read-only)
 */
export function useProxyHealthStatus(): ProxyHealthStatus {
  const { health } = useProxyStore();

  const uptimePercentage =
    health.checkHistory.length > 0
      ? (health.checkHistory.filter((r) => r.healthy).length / health.checkHistory.length) * 100
      : 100;

  return {
    isHealthy: health.consecutiveFailures < 3,
    isMonitoring: health.isMonitoring,
    lastCheck: health.lastCheck || null,
    consecutiveFailures: health.consecutiveFailures,
    avgLatency: health.avgLatency,
    totalChecks: health.checkHistory.length,
    uptimePercentage,
  };
}

export default useProxyHealthMonitor;
