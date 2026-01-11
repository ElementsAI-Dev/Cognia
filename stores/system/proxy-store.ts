/**
 * Proxy Store - Zustand store for managing network proxy configuration
 *
 * Features:
 * - Auto-detection of proxy software (Clash, V2Ray, etc.)
 * - Manual proxy configuration
 * - System proxy integration
 * - Proxy testing and status monitoring
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProxyMode,
  ProxyConfig,
  ProxyStatus,
  DetectedProxy,
  ProxyTestResult,
  ManualProxyConfig,
  DetectionStatus,
  ProxySoftware,
} from '@/types/system/proxy';
import { createDefaultProxyConfig, createDefaultProxyStatus } from '@/types/system/proxy';

export interface ProxyState {
  // Configuration
  config: ProxyConfig;

  // Status
  status: ProxyStatus;

  // Detection
  detectedProxies: DetectedProxy[];
  detectionStatus: DetectionStatus;

  // UI State
  isDetecting: boolean;
  isTesting: boolean;
  isApplying: boolean;

  // Error
  error: string | null;
}

export interface ProxyActions {
  // Configuration
  setMode: (mode: ProxyMode) => void;
  setEnabled: (enabled: boolean) => void;
  setManualConfig: (config: ManualProxyConfig) => void;
  setSelectedProxy: (software: ProxySoftware) => void;
  setTestUrl: (url: string) => void;
  setAutoDetectInterval: (interval: number) => void;
  updateConfig: (config: Partial<ProxyConfig>) => void;

  // Detection
  setDetectedProxies: (proxies: DetectedProxy[]) => void;
  addDetectedProxy: (proxy: DetectedProxy) => void;
  setDetectionStatus: (status: DetectionStatus) => void;

  // Status
  setStatus: (status: Partial<ProxyStatus>) => void;
  setTestResult: (result: ProxyTestResult) => void;

  // UI State
  setDetecting: (detecting: boolean) => void;
  setTesting: (testing: boolean) => void;
  setApplying: (applying: boolean) => void;

  // Error
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const initialState: ProxyState = {
  config: createDefaultProxyConfig(),
  status: createDefaultProxyStatus(),
  detectedProxies: [],
  detectionStatus: 'idle',
  isDetecting: false,
  isTesting: false,
  isApplying: false,
  error: null,
};

export const useProxyStore = create<ProxyState & ProxyActions>()(
  persist(
    (set) => ({
      ...initialState,

      setMode: (mode) =>
        set((state) => ({
          config: { ...state.config, mode },
          status: { ...state.status, mode },
        })),

      setEnabled: (enabled) =>
        set((state) => ({
          config: { ...state.config, enabled },
          status: { ...state.status, enabled },
        })),

      setManualConfig: (manual) =>
        set((state) => ({
          config: { ...state.config, manual },
        })),

      setSelectedProxy: (selectedProxy) =>
        set((state) => ({
          config: { ...state.config, selectedProxy },
        })),

      setTestUrl: (testUrl) =>
        set((state) => ({
          config: { ...state.config, testUrl },
        })),

      setAutoDetectInterval: (autoDetectInterval) =>
        set((state) => ({
          config: { ...state.config, autoDetectInterval },
        })),

      updateConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      setDetectedProxies: (detectedProxies) => set({ detectedProxies }),

      addDetectedProxy: (proxy) =>
        set((state) => ({
          detectedProxies: [
            ...state.detectedProxies.filter((p) => p.software !== proxy.software),
            proxy,
          ],
        })),

      setDetectionStatus: (detectionStatus) => set({ detectionStatus }),

      setStatus: (status) =>
        set((state) => ({
          status: { ...state.status, ...status },
        })),

      setTestResult: (result) =>
        set((state) => ({
          status: {
            ...state.status,
            connected: result.success,
            lastTest: result,
            lastTestTime: new Date().toISOString(),
          },
        })),

      setDetecting: (isDetecting) => set({ isDetecting }),
      setTesting: (isTesting) => set({ isTesting }),
      setApplying: (isApplying) => set({ isApplying }),

      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      reset: () => set(initialState),
    }),
    {
      name: 'proxy-store',
      partialize: (state) => ({
        config: state.config,
        detectedProxies: state.detectedProxies,
      }),
    }
  )
);

// Selector hooks
export const useProxyConfig = () => useProxyStore((state) => state.config);
export const useProxyStatus = () => useProxyStore((state) => state.status);
export const useProxyMode = () => useProxyStore((state) => state.config.mode);
export const useProxyEnabled = () => useProxyStore((state) => state.config.enabled);
export const useDetectedProxies = () => useProxyStore((state) => state.detectedProxies);
export const useProxyDetecting = () => useProxyStore((state) => state.isDetecting);
export const useProxyTesting = () => useProxyStore((state) => state.isTesting);

/** Get the currently active proxy URL */
export function getActiveProxyUrl(state: ProxyState): string | null {
  if (!state.config.enabled || state.config.mode === 'off') {
    return null;
  }

  if (state.config.mode === 'manual' && state.config.manual) {
    const { protocol, host, port, username, password } = state.config.manual;
    const auth = username && password ? `${username}:${password}@` : '';
    return `${protocol}://${auth}${host}:${port}`;
  }

  if (state.config.mode === 'auto' && state.config.selectedProxy) {
    const detected = state.detectedProxies.find(
      (p) => p.software === state.config.selectedProxy && p.running
    );
    if (detected) {
      const port = detected.mixedPort || detected.httpPort;
      if (port) {
        return `http://127.0.0.1:${port}`;
      }
    }
  }

  return null;
}

export default useProxyStore;
