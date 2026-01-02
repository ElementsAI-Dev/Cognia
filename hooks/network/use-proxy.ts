/**
 * useProxy Hook - React hook for proxy management
 *
 * Provides a convenient interface for:
 * - Auto-detecting proxy software
 * - Testing proxy connectivity
 * - Managing proxy configuration
 */

import { useCallback, useEffect, useRef } from 'react';
import { useProxyStore } from '@/stores/system';
import { proxyService, isProxyAvailable } from '@/lib/native/proxy';
import type {
  ProxyMode,
  DetectedProxy,
  ManualProxyConfig,
  ProxySoftware,
} from '@/types/proxy';
import { buildProxyUrl } from '@/types/proxy';

export interface UseProxyReturn {
  // Configuration
  mode: ProxyMode;
  enabled: boolean;
  manualConfig: ManualProxyConfig | undefined;
  selectedProxy: ProxySoftware | undefined;
  testUrl: string;

  // Detection
  detectedProxies: DetectedProxy[];
  isDetecting: boolean;

  // Status
  connected: boolean;
  currentProxy: string | null;
  lastTestLatency: number | null;

  // UI State
  isTesting: boolean;
  isApplying: boolean;
  error: string | null;

  // Availability
  isAvailable: boolean;

  // Actions
  setMode: (mode: ProxyMode) => void;
  setEnabled: (enabled: boolean) => void;
  setManualConfig: (config: ManualProxyConfig) => void;
  selectProxy: (software: ProxySoftware) => void;
  detectProxies: () => Promise<void>;
  testCurrentProxy: () => Promise<boolean>;
  testManualProxy: (config: ManualProxyConfig) => Promise<boolean>;
  applyProxy: () => Promise<void>;
  clearError: () => void;
}

export function useProxy(): UseProxyReturn {
  const {
    config,
    status,
    detectedProxies,
    isDetecting,
    isTesting,
    isApplying,
    error,
    setMode,
    setEnabled,
    setManualConfig,
    setSelectedProxy,
    setDetectedProxies,
    setDetecting,
    setTesting,
    setStatus,
    setTestResult,
    setError,
    clearError,
  } = useProxyStore();

  const isAvailable = isProxyAvailable();
  const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  const detectProxies = useCallback(async () => {
    if (!isAvailable) return;

    setDetecting(true);
    try {
      const proxies = await proxyService.detectAll();
      setDetectedProxies(proxies);

      // Auto-select first running proxy if none selected
      if (!config.selectedProxy && proxies.length > 0) {
        const running = proxies.find((p) => p.running);
        if (running) {
          setSelectedProxy(running.software);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }, [isAvailable, config.selectedProxy, setDetecting, setDetectedProxies, setSelectedProxy, setError]);

  // Auto-detect proxies on mount and periodically
  useEffect(() => {
    if (!isAvailable || initializedRef.current) return;
    initializedRef.current = true;

    // Initial detection
    detectProxies();

    // Set up periodic detection if enabled
    if (config.autoDetectInterval > 0) {
      detectIntervalRef.current = setInterval(
        detectProxies,
        config.autoDetectInterval * 1000
      );
    }

    return () => {
      if (detectIntervalRef.current) {
        clearInterval(detectIntervalRef.current);
      }
    };
  }, [isAvailable, config.autoDetectInterval, detectProxies]);

  const testCurrentProxy = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    setTesting(true);
    try {
      let proxyUrl: string | null = null;

      if (config.mode === 'manual' && config.manual) {
        proxyUrl = buildProxyUrl(config.manual);
      } else if (config.mode === 'auto' && config.selectedProxy) {
        const detected = detectedProxies.find(
          (p) => p.software === config.selectedProxy && p.running
        );
        if (detected) {
          proxyUrl = proxyService.buildUrl(detected);
        }
      }

      if (!proxyUrl) {
        setTestResult({
          success: false,
          error: 'No proxy configured',
        });
        return false;
      }

      const result = await proxyService.test(proxyUrl, config.testUrl);
      setTestResult(result);
      return result.success;
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    } finally {
      setTesting(false);
    }
  }, [isAvailable, config, detectedProxies, setTesting, setTestResult]);

  const testManualProxy = useCallback(
    async (manualConfig: ManualProxyConfig): Promise<boolean> => {
      if (!isAvailable) return false;

      setTesting(true);
      try {
        const proxyUrl = buildProxyUrl(manualConfig);
        const result = await proxyService.test(proxyUrl, config.testUrl);
        setTestResult(result);
        return result.success;
      } catch (err) {
        setTestResult({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      } finally {
        setTesting(false);
      }
    },
    [isAvailable, config.testUrl, setTesting, setTestResult]
  );

  const applyProxy = useCallback(async () => {
    // In Tauri, we would set environment variables or configure the HTTP client
    // For now, this just updates the status
    let currentProxy: string | null = null;

    if (config.enabled && config.mode !== 'off') {
      if (config.mode === 'manual' && config.manual) {
        currentProxy = buildProxyUrl(config.manual);
      } else if (config.mode === 'auto' && config.selectedProxy) {
        const detected = detectedProxies.find(
          (p) => p.software === config.selectedProxy && p.running
        );
        if (detected) {
          currentProxy = proxyService.buildUrl(detected);
        }
      }
    }

    setStatus({
      currentProxy,
      connected: !!currentProxy,
    });
  }, [config, detectedProxies, setStatus]);

  const selectProxy = useCallback(
    (software: ProxySoftware) => {
      setSelectedProxy(software);
    },
    [setSelectedProxy]
  );

  return {
    // Configuration
    mode: config.mode,
    enabled: config.enabled,
    manualConfig: config.manual,
    selectedProxy: config.selectedProxy,
    testUrl: config.testUrl,

    // Detection
    detectedProxies,
    isDetecting,

    // Status
    connected: status.connected,
    currentProxy: status.currentProxy,
    lastTestLatency: status.lastTest?.latency ?? null,

    // UI State
    isTesting,
    isApplying,
    error,

    // Availability
    isAvailable,

    // Actions
    setMode,
    setEnabled,
    setManualConfig,
    selectProxy,
    detectProxies,
    testCurrentProxy,
    testManualProxy,
    applyProxy,
    clearError,
  };
}

export default useProxy;
