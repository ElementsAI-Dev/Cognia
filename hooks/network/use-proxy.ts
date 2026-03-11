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
import {
  dedupeDetectedProxies,
  pickAutoSelectedProxy,
  resolveEffectiveProxy,
  validateManualProxyConfig,
} from '@/lib/network/proxy-resolution';
import type {
  ProxyMode,
  DetectedProxy,
  ManualProxyConfig,
  ProxySoftware,
} from '@/types/system/proxy';
import { buildProxyUrl } from '@/types/system/proxy';

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
  validationError: string | null;

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
    setApplying,
    setStatus,
    setTestResult,
    setLastKnownGood,
    setError,
    clearError,
  } = useProxyStore();

  const isAvailable = isProxyAvailable();
  const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

  const syncSelectedProxy = useCallback(
    (selectedProxy: ProxySoftware | undefined) => {
      if (selectedProxy !== config.selectedProxy) {
        setSelectedProxy(selectedProxy);
      }
    },
    [config.selectedProxy, setSelectedProxy]
  );

  const resolveCurrentProxy = useCallback(async () => {
    if (config.mode === 'system' && config.enabled) {
      const systemResult = await proxyService.resolveSystemProxy();
      return resolveEffectiveProxy(config, detectedProxies, {
        systemProxy: systemResult.settings,
        systemError: systemResult.error,
      });
    }

    return resolveEffectiveProxy(config, detectedProxies);
  }, [config, detectedProxies]);

  const detectProxies = useCallback(async () => {
    if (!isAvailable) return;

    setDetecting(true);
    try {
      const proxies = dedupeDetectedProxies(await proxyService.detectAll());
      setDetectedProxies(proxies);

      if (config.mode === 'auto') {
        const selectedProxy = pickAutoSelectedProxy(config.selectedProxy, proxies);
        syncSelectedProxy(selectedProxy);
        if (!selectedProxy) {
          setStatus({
            connected: false,
            currentProxy: null,
          });
          setError('No running auto-detected proxy is available');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetecting(false);
    }
  }, [
    isAvailable,
    config.mode,
    config.selectedProxy,
    setDetecting,
    setDetectedProxies,
    setError,
    setStatus,
    syncSelectedProxy,
  ]);

  // Auto-detect proxies on mount and periodically
  useEffect(() => {
    if (!isAvailable || initializedRef.current) return;
    initializedRef.current = true;

    // Initial detection
    detectProxies();

    // Set up periodic detection if enabled
    if (config.autoDetectInterval > 0) {
      detectIntervalRef.current = setInterval(detectProxies, config.autoDetectInterval * 1000);
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
      const resolution = await resolveCurrentProxy();
      syncSelectedProxy(resolution.selectedProxy);

      if (!resolution.proxyUrl) {
        const message = resolution.error || 'No proxy configured';
        setTestResult({
          success: false,
          error: message,
        });
        setStatus({
          connected: false,
          currentProxy: null,
        });
        setError(message);
        return false;
      }

      const endpoints = (config.testEndpoints || [])
        .filter((endpoint) => endpoint.enabled)
        .map((endpoint) => endpoint.url);

      const resultMulti = await proxyService.testMulti(
        resolution.proxyUrl,
        endpoints.length > 0 ? endpoints : undefined
      );
      const result = {
        success: resultMulti.overallSuccess,
        latency: resultMulti.avgLatency,
        ip: resultMulti.ip,
        location: resultMulti.location,
        error: resultMulti.overallSuccess
          ? undefined
          : resultMulti.results.find((item) => item.error)?.error || 'Proxy test failed',
      };

      setTestResult(result);
      setStatus({
        connected: result.success,
        currentProxy: resolution.proxyUrl,
      });
      if (result.success) {
        clearError();
        setLastKnownGood(resolution.proxyUrl);
      } else if (result.error) {
        setError(result.error);
      }

      return result.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResult({
        success: false,
        error: message,
      });
      setStatus({
        connected: false,
      });
      setError(message);
      return false;
    } finally {
      setTesting(false);
    }
  }, [
    isAvailable,
    config.testEndpoints,
    resolveCurrentProxy,
    syncSelectedProxy,
    setTesting,
    setStatus,
    setTestResult,
    setError,
    clearError,
    setLastKnownGood,
  ]);

  const testManualProxy = useCallback(
    async (manualConfig: ManualProxyConfig): Promise<boolean> => {
      if (!isAvailable) return false;

      setTesting(true);
      try {
        const validation = validateManualProxyConfig(manualConfig);
        if (!validation.valid) {
          const message = validation.error || 'Invalid manual proxy configuration';
          setTestResult({
            success: false,
            error: message,
          });
          setError(message);
          return false;
        }

        const proxyUrl = buildProxyUrl(manualConfig);
        const resultMulti = await proxyService.testMulti(proxyUrl, [config.testUrl]);
        const result = {
          success: resultMulti.overallSuccess,
          latency: resultMulti.avgLatency,
          ip: resultMulti.ip,
          location: resultMulti.location,
          error: resultMulti.overallSuccess
            ? undefined
            : resultMulti.results.find((item) => item.error)?.error || 'Proxy test failed',
        };
        setTestResult(result);
        setStatus({
          connected: result.success,
          currentProxy: result.success ? proxyUrl : null,
        });
        if (result.success) {
          clearError();
          setLastKnownGood(proxyUrl);
        } else if (result.error) {
          setError(result.error);
        }
        return result.success;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setTestResult({
          success: false,
          error: message,
        });
        setError(message);
        return false;
      } finally {
        setTesting(false);
      }
    },
    [
      isAvailable,
      config.testUrl,
      setTesting,
      setTestResult,
      setStatus,
      setError,
      clearError,
      setLastKnownGood,
    ]
  );

  const applyProxy = useCallback(async () => {
    if (!isAvailable) {
      setStatus({
        connected: false,
        currentProxy: null,
      });
      return;
    }

    setApplying(true);
    try {
      const resolution = await resolveCurrentProxy();
      syncSelectedProxy(resolution.selectedProxy);

      if (resolution.error) {
        setError(resolution.error);
      } else {
        clearError();
      }

      await proxyService.syncBackendProxy(resolution.proxyUrl);

      setStatus({
        currentProxy: resolution.proxyUrl,
        connected: !!resolution.proxyUrl,
      });
      if (resolution.proxyUrl) {
        setLastKnownGood(resolution.proxyUrl);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus({
        connected: false,
      });
    } finally {
      setApplying(false);
    }
  }, [
    isAvailable,
    resolveCurrentProxy,
    syncSelectedProxy,
    setApplying,
    setStatus,
    setLastKnownGood,
    clearError,
    setError,
  ]);

  const selectProxy = useCallback(
    (software: ProxySoftware) => {
      setSelectedProxy(software);
    },
    [setSelectedProxy]
  );

  // Keep backend proxy synchronized with effective endpoint.
  useEffect(() => {
    if (!isAvailable) {
      return;
    }
    void applyProxy();
  }, [
    isAvailable,
    applyProxy,
    config.enabled,
    config.mode,
    config.manual,
    config.selectedProxy,
    detectedProxies,
  ]);

  const manualValidation = validateManualProxyConfig(config.manual);
  const validationError =
    config.mode === 'manual' && config.enabled && !manualValidation.valid
      ? manualValidation.error
      : null;

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
    validationError,

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
