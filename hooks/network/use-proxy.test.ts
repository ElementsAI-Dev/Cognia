/**
 * useProxy Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useProxy } from './use-proxy';

const mockUseProxyStore = jest.fn();

jest.mock('@/stores/system', () => ({
  useProxyStore: () => mockUseProxyStore(),
}));

jest.mock('@/lib/native/proxy', () => ({
  proxyService: {
    detectAll: jest.fn().mockResolvedValue([]),
    testMulti: jest.fn(),
    resolveSystemProxy: jest.fn(),
    syncBackendProxy: jest.fn().mockResolvedValue({ changed: true, current: null }),
  },
  isProxyAvailable: jest.fn(() => true),
}));

import { proxyService, isProxyAvailable } from '@/lib/native/proxy';

const mockProxyService = proxyService as jest.Mocked<typeof proxyService>;
const mockIsProxyAvailable = isProxyAvailable as jest.MockedFunction<typeof isProxyAvailable>;

interface MockProxyStoreState {
  config: {
    mode: 'off' | 'system' | 'manual' | 'auto';
    enabled: boolean;
    manual?: { protocol: 'http' | 'https' | 'socks4' | 'socks5'; host: string; port: number };
    selectedProxy?: string;
    testUrl: string;
    testEndpoints: Array<{ url: string; enabled: boolean }>;
    autoDetectInterval: number;
    healthCheckInterval: number;
  };
  status: {
    connected: boolean;
    currentProxy: string | null;
    lastKnownGoodProxy: string | null;
    lastKnownGoodTime: string | null;
    lastTest: null;
    lastTestTime: null;
  };
  detectedProxies: unknown[];
  isDetecting: boolean;
  isTesting: boolean;
  isApplying: boolean;
  error: string | null;
  setMode: jest.Mock;
  setEnabled: jest.Mock;
  setManualConfig: jest.Mock;
  setSelectedProxy: jest.Mock;
  setDetectedProxies: jest.Mock;
  setDetecting: jest.Mock;
  setTesting: jest.Mock;
  setApplying: jest.Mock;
  setStatus: jest.Mock;
  setTestResult: jest.Mock;
  setLastKnownGood: jest.Mock;
  setError: jest.Mock;
  clearError: jest.Mock;
}

function createStoreState(overrides: Partial<MockProxyStoreState> = {}): MockProxyStoreState {
  return {
    config: {
      mode: 'auto',
      enabled: true,
      manual: undefined,
      selectedProxy: undefined,
      testUrl: 'https://www.google.com',
      testEndpoints: [{ url: 'https://www.google.com/generate_204', enabled: true }],
      autoDetectInterval: 0,
      healthCheckInterval: 60,
    },
    status: {
      connected: false,
      currentProxy: null,
      lastKnownGoodProxy: null,
      lastKnownGoodTime: null,
      lastTest: null,
      lastTestTime: null,
    },
    detectedProxies: [],
    isDetecting: false,
    isTesting: false,
    isApplying: false,
    error: null,
    setMode: jest.fn(),
    setEnabled: jest.fn(),
    setManualConfig: jest.fn(),
    setSelectedProxy: jest.fn(),
    setDetectedProxies: jest.fn(),
    setDetecting: jest.fn(),
    setTesting: jest.fn(),
    setApplying: jest.fn(),
    setStatus: jest.fn(),
    setTestResult: jest.fn(),
    setLastKnownGood: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
    ...overrides,
  };
}

describe('useProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsProxyAvailable.mockReturnValue(true);
    mockProxyService.resolveSystemProxy.mockResolvedValue({
      proxyUrl: null,
      settings: null,
      error: 'System proxy is not configured',
    });
    mockUseProxyStore.mockReturnValue(createStoreState());
  });

  it('returns proxy state', () => {
    const { result } = renderHook(() => useProxy());

    expect(result.current.mode).toBe('auto');
    expect(result.current.enabled).toBe(true);
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.connected).toBe(false);
  });

  it('exposes validation error for invalid manual config', () => {
    mockUseProxyStore.mockReturnValue(
      createStoreState({
        config: {
          mode: 'manual',
          enabled: true,
          manual: { protocol: 'http', host: '', port: 8080 },
          selectedProxy: undefined,
          testUrl: 'https://www.google.com',
          testEndpoints: [],
          autoDetectInterval: 0,
          healthCheckInterval: 60,
        },
      })
    );

    const { result } = renderHook(() => useProxy());
    expect(result.current.validationError).toContain('Proxy host');
  });

  it('detects proxies and applies deterministic fallback selection', async () => {
    const state = createStoreState({
      config: {
        mode: 'auto',
        enabled: true,
        selectedProxy: 'v2ray',
        testUrl: 'https://www.google.com',
        testEndpoints: [],
        autoDetectInterval: 0,
        healthCheckInterval: 60,
      },
    });
    mockUseProxyStore.mockReturnValue(state);
    mockProxyService.detectAll.mockResolvedValue([
      { software: 'clash', name: 'Clash', icon: '', running: true, mixedPort: 7890 },
    ] as never);

    const { result } = renderHook(() => useProxy());
    await act(async () => {
      await result.current.detectProxies();
    });

    expect(state.setDetectedProxies).toHaveBeenCalled();
    expect(state.setSelectedProxy).toHaveBeenCalledWith('clash');
  });

  it('tests current manual proxy via multi-endpoint flow', async () => {
    const state = createStoreState({
      config: {
        mode: 'manual',
        enabled: true,
        manual: { protocol: 'http', host: '127.0.0.1', port: 8080 },
        selectedProxy: undefined,
        testUrl: 'https://www.google.com',
        testEndpoints: [{ url: 'https://www.google.com/generate_204', enabled: true }],
        autoDetectInterval: 0,
        healthCheckInterval: 60,
      },
    });
    mockUseProxyStore.mockReturnValue(state);
    mockProxyService.testMulti.mockResolvedValue({
      overallSuccess: true,
      successfulEndpoints: 1,
      totalEndpoints: 1,
      avgLatency: 100,
      results: [{ url: 'u', name: 'n', success: true }],
      ip: '1.2.3.4',
      location: 'Tokyo',
    });

    const { result } = renderHook(() => useProxy());
    let success = false;
    await act(async () => {
      success = await result.current.testCurrentProxy();
    });

    expect(success).toBe(true);
    expect(state.setTestResult).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, latency: 100 })
    );
    expect(state.setStatus).toHaveBeenCalledWith({
      connected: true,
      currentProxy: 'http://127.0.0.1:8080',
    });
    expect(state.setLastKnownGood).toHaveBeenCalledWith('http://127.0.0.1:8080');
  });

  it('tests current system proxy when available', async () => {
    const state = createStoreState({
      config: {
        mode: 'system',
        enabled: true,
        manual: undefined,
        selectedProxy: undefined,
        testUrl: 'https://www.google.com',
        testEndpoints: [],
        autoDetectInterval: 0,
        healthCheckInterval: 60,
      },
    });
    mockUseProxyStore.mockReturnValue(state);
    mockProxyService.resolveSystemProxy.mockResolvedValue({
      proxyUrl: 'http://127.0.0.1:7890',
      settings: {
        enabled: true,
        httpProxy: 'http://127.0.0.1:7890',
        httpsProxy: null,
        socksProxy: null,
        noProxy: null,
      },
      error: null,
    });
    mockProxyService.testMulti.mockResolvedValue({
      overallSuccess: true,
      successfulEndpoints: 1,
      totalEndpoints: 1,
      avgLatency: 80,
      results: [{ url: 'u', name: 'n', success: true }],
    });

    const { result } = renderHook(() => useProxy());
    const success = await act(async () => result.current.testCurrentProxy());
    expect(success).toBe(true);
    expect(mockProxyService.resolveSystemProxy).toHaveBeenCalled();
  });

  it('returns false when no proxy is resolvable', async () => {
    const state = createStoreState({
      config: {
        mode: 'system',
        enabled: true,
        manual: undefined,
        selectedProxy: undefined,
        testUrl: 'https://www.google.com',
        testEndpoints: [],
        autoDetectInterval: 0,
        healthCheckInterval: 60,
      },
    });
    mockUseProxyStore.mockReturnValue(state);

    const { result } = renderHook(() => useProxy());
    const success = await act(async () => result.current.testCurrentProxy());
    expect(success).toBe(false);
    expect(state.setError).toHaveBeenCalledWith('System proxy is not configured');
  });

  it('syncs backend proxy through applyProxy', async () => {
    const state = createStoreState({
      config: {
        mode: 'manual',
        enabled: true,
        manual: { protocol: 'http', host: '127.0.0.1', port: 8080 },
        selectedProxy: undefined,
        testUrl: 'https://www.google.com',
        testEndpoints: [],
        autoDetectInterval: 0,
        healthCheckInterval: 60,
      },
    });
    mockUseProxyStore.mockReturnValue(state);

    const { result } = renderHook(() => useProxy());
    await act(async () => {
      await result.current.applyProxy();
    });

    expect(mockProxyService.syncBackendProxy).toHaveBeenCalledWith('http://127.0.0.1:8080');
    expect(state.setStatus).toHaveBeenCalledWith({
      currentProxy: 'http://127.0.0.1:8080',
      connected: true,
    });
  });

  it('handles applyProxy sync failures', async () => {
    const state = createStoreState({
      config: {
        mode: 'manual',
        enabled: true,
        manual: { protocol: 'http', host: '127.0.0.1', port: 8080 },
        selectedProxy: undefined,
        testUrl: 'https://www.google.com',
        testEndpoints: [],
        autoDetectInterval: 0,
        healthCheckInterval: 60,
      },
    });
    mockUseProxyStore.mockReturnValue(state);
    mockProxyService.syncBackendProxy.mockRejectedValueOnce(new Error('sync failed'));

    const { result } = renderHook(() => useProxy());
    await act(async () => {
      await result.current.applyProxy();
    });

    expect(state.setError).toHaveBeenCalledWith('sync failed');
    expect(state.setStatus).toHaveBeenCalledWith({
      connected: false,
    });
  });

  it('does not run network operations when unavailable', async () => {
    mockIsProxyAvailable.mockReturnValue(false);
    const state = createStoreState();
    mockUseProxyStore.mockReturnValue(state);

    const { result } = renderHook(() => useProxy());
    await act(async () => {
      await result.current.detectProxies();
    });
    const success = await act(async () => result.current.testCurrentProxy());

    expect(success).toBe(false);
    expect(mockProxyService.detectAll).not.toHaveBeenCalled();
  });
});
