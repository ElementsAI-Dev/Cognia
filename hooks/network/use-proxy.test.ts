/**
 * useProxy Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useProxy } from './use-proxy';

// Mock dependencies
jest.mock('@/stores/system', () => ({
  useProxyStore: jest.fn(() => ({
    config: {
      mode: 'auto',
      enabled: true,
      manual: undefined,
      selectedProxy: undefined,
      testUrl: 'https://www.google.com',
      autoDetectInterval: 0,
    },
    status: {
      connected: false,
      currentProxy: null,
      lastTest: null,
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
    setStatus: jest.fn(),
    setTestResult: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
  })),
}));

jest.mock('@/lib/native/proxy', () => ({
  proxyService: {
    detectAll: jest.fn().mockResolvedValue([]),
    test: jest.fn(),
    buildUrl: jest.fn((proxy) => `http://${proxy.host}:${proxy.port}`),
  },
  isProxyAvailable: jest.fn(() => true),
}));

jest.mock('@/types/system/proxy', () => ({
  buildProxyUrl: jest.fn((config) => `http://${config.host}:${config.port}`),
}));

import { useProxyStore } from '@/stores/system';
import { proxyService, isProxyAvailable } from '@/lib/native/proxy';
import { buildProxyUrl } from '@/types/system/proxy';

const mockUseProxyStore = useProxyStore as jest.MockedFunction<typeof useProxyStore>;
const mockIsProxyAvailable = isProxyAvailable as jest.MockedFunction<typeof isProxyAvailable>;
const mockProxyService = proxyService as jest.Mocked<typeof proxyService>;
const mockBuildProxyUrl = buildProxyUrl as jest.MockedFunction<typeof buildProxyUrl>;

describe('useProxy', () => {
  const mockStoreFunctions = {
    config: {
      mode: 'auto' as const,
      enabled: true,
      manual: undefined,
      selectedProxy: undefined,
      testUrl: 'https://www.google.com',
      autoDetectInterval: 0,
    },
    status: {
      connected: false,
      currentProxy: null,
      lastTest: null,
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
    setStatus: jest.fn(),
    setTestResult: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProxyStore.mockReturnValue(mockStoreFunctions);
    mockIsProxyAvailable.mockReturnValue(true);
  });

  it('should return proxy state', () => {
    const { result } = renderHook(() => useProxy());

    expect(result.current.mode).toBe('auto');
    expect(result.current.enabled).toBe(true);
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.connected).toBe(false);
  });

  it('should return isAvailable as false when not in Tauri', () => {
    mockIsProxyAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useProxy());

    expect(result.current.isAvailable).toBe(false);
  });

  it('should detect proxies', async () => {
    const mockProxies = [
      { software: 'clash' as const, name: 'Clash', icon: '⚔️', running: true, httpPort: 7890 },
    ];
    mockProxyService.detectAll.mockResolvedValue(mockProxies);

    const { result } = renderHook(() => useProxy());

    await act(async () => {
      await result.current.detectProxies();
    });

    expect(mockStoreFunctions.setDetecting).toHaveBeenCalledWith(true);
    expect(mockProxyService.detectAll).toHaveBeenCalled();
    expect(mockStoreFunctions.setDetectedProxies).toHaveBeenCalledWith(mockProxies);
    expect(mockStoreFunctions.setDetecting).toHaveBeenCalledWith(false);
  });

  it('should auto-select first running proxy', async () => {
    const mockProxies = [
      { software: 'clash' as const, name: 'Clash', icon: '⚔️', running: true, httpPort: 7890 },
    ];
    mockProxyService.detectAll.mockResolvedValue(mockProxies);

    const { result } = renderHook(() => useProxy());

    await act(async () => {
      await result.current.detectProxies();
    });

    expect(mockStoreFunctions.setSelectedProxy).toHaveBeenCalledWith('clash');
  });

  it('should handle detect error', async () => {
    mockProxyService.detectAll.mockRejectedValue(new Error('Detection failed'));

    const { result } = renderHook(() => useProxy());

    await act(async () => {
      await result.current.detectProxies();
    });

    expect(mockStoreFunctions.setError).toHaveBeenCalledWith('Detection failed');
  });

  it('should test current proxy in manual mode', async () => {
    const manualConfig = { protocol: 'http' as const, host: '127.0.0.1', port: 8080 };
    mockUseProxyStore.mockReturnValue({
      ...mockStoreFunctions,
      config: {
        ...mockStoreFunctions.config,
        mode: 'manual',
        manual: manualConfig,
      },
    });
    mockBuildProxyUrl.mockReturnValue('http://127.0.0.1:8080');
    mockProxyService.test.mockResolvedValue({ success: true, latency: 100 });

    const { result } = renderHook(() => useProxy());

    let success;
    await act(async () => {
      success = await result.current.testCurrentProxy();
    });

    expect(mockStoreFunctions.setTesting).toHaveBeenCalledWith(true);
    expect(mockProxyService.test).toHaveBeenCalledWith('http://127.0.0.1:8080', 'https://www.google.com');
    expect(success).toBe(true);
  });

  it('should test current proxy in auto mode', async () => {
    const mockProxies = [
      { software: 'clash', running: true, host: '127.0.0.1', port: 7890 },
    ];
    mockUseProxyStore.mockReturnValue({
      ...mockStoreFunctions,
      config: {
        ...mockStoreFunctions.config,
        mode: 'auto',
        selectedProxy: 'clash',
      },
      detectedProxies: mockProxies,
    });
    mockProxyService.buildUrl.mockReturnValue('http://127.0.0.1:7890');
    mockProxyService.test.mockResolvedValue({ success: true, latency: 50 });

    const { result } = renderHook(() => useProxy());

    let success;
    await act(async () => {
      success = await result.current.testCurrentProxy();
    });

    expect(success).toBe(true);
  });

  it('should return false when no proxy configured', async () => {
    const { result } = renderHook(() => useProxy());

    let success;
    await act(async () => {
      success = await result.current.testCurrentProxy();
    });

    expect(mockStoreFunctions.setTestResult).toHaveBeenCalledWith({
      success: false,
      error: 'No proxy configured',
    });
    expect(success).toBe(false);
  });

  it('should test manual proxy', async () => {
    const manualConfig = { protocol: 'http' as const, host: '192.168.1.1', port: 1080 };
    mockBuildProxyUrl.mockReturnValue('http://192.168.1.1:1080');
    mockProxyService.test.mockResolvedValue({ success: true, latency: 200 });

    const { result } = renderHook(() => useProxy());

    let success;
    await act(async () => {
      success = await result.current.testManualProxy(manualConfig);
    });

    expect(mockBuildProxyUrl).toHaveBeenCalledWith(manualConfig);
    expect(success).toBe(true);
  });

  it('should handle test error', async () => {
    mockUseProxyStore.mockReturnValue({
      ...mockStoreFunctions,
      config: {
        ...mockStoreFunctions.config,
        mode: 'manual',
        manual: { protocol: 'http' as const, host: '127.0.0.1', port: 8080 },
      },
    });
    mockBuildProxyUrl.mockReturnValue('http://127.0.0.1:8080');
    mockProxyService.test.mockRejectedValue(new Error('Test failed'));

    const { result } = renderHook(() => useProxy());

    const success = await act(async () => {
      return await result.current.testCurrentProxy();
    });

    expect(success).toBe(false);
    expect(mockStoreFunctions.setTestResult).toHaveBeenCalledWith({
      success: false,
      error: 'Test failed',
    });
  });

  it('should apply proxy', async () => {
    const manualConfig = { host: '127.0.0.1', port: 8080 };
    mockUseProxyStore.mockReturnValue({
      ...mockStoreFunctions,
      config: {
        ...mockStoreFunctions.config,
        mode: 'manual',
        manual: manualConfig,
        enabled: true,
      },
    });
    mockBuildProxyUrl.mockReturnValue('http://127.0.0.1:8080');

    const { result } = renderHook(() => useProxy());

    await act(async () => {
      await result.current.applyProxy();
    });

    expect(mockStoreFunctions.setStatus).toHaveBeenCalledWith({
      currentProxy: 'http://127.0.0.1:8080',
      connected: true,
    });
  });

  it('should set null proxy when disabled', async () => {
    mockUseProxyStore.mockReturnValue({
      ...mockStoreFunctions,
      config: {
        ...mockStoreFunctions.config,
        enabled: false,
      },
    });

    const { result } = renderHook(() => useProxy());

    await act(async () => {
      await result.current.applyProxy();
    });

    expect(mockStoreFunctions.setStatus).toHaveBeenCalledWith({
      currentProxy: null,
      connected: false,
    });
  });

  it('should select proxy', () => {
    const { result } = renderHook(() => useProxy());

    act(() => {
      result.current.selectProxy('v2ray');
    });

    expect(mockStoreFunctions.setSelectedProxy).toHaveBeenCalledWith('v2ray');
  });

  it('should set mode', () => {
    const { result } = renderHook(() => useProxy());

    act(() => {
      result.current.setMode('manual');
    });

    expect(mockStoreFunctions.setMode).toHaveBeenCalledWith('manual');
  });

  it('should set enabled', () => {
    const { result } = renderHook(() => useProxy());

    act(() => {
      result.current.setEnabled(false);
    });

    expect(mockStoreFunctions.setEnabled).toHaveBeenCalledWith(false);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useProxy());

    act(() => {
      result.current.clearError();
    });

    expect(mockStoreFunctions.clearError).toHaveBeenCalled();
  });

  it('should not detect when unavailable', async () => {
    mockIsProxyAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useProxy());

    await act(async () => {
      await result.current.detectProxies();
    });

    expect(mockProxyService.detectAll).not.toHaveBeenCalled();
  });

  it('should return false from test when unavailable', async () => {
    mockIsProxyAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useProxy());

    const success = await act(async () => {
      return await result.current.testCurrentProxy();
    });

    expect(success).toBe(false);
  });
});
