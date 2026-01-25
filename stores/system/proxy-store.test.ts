/**
 * Tests for Proxy Store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useProxyStore,
  useProxyConfig,
  useProxyStatus,
  useProxyMode,
  useProxyEnabled,
  useDetectedProxies,
  useProxyDetecting,
  useProxyTesting,
  getActiveProxyUrl,
} from './proxy-store';
import type { ProxyState } from './proxy-store';
import type { DetectedProxy, ProxyTestResult } from '@/types/system/proxy';

describe('useProxyStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useProxyStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useProxyStore());

      expect(result.current.config).toBeDefined();
      expect(result.current.status).toBeDefined();
      expect(result.current.detectedProxies).toEqual([]);
      expect(result.current.detectionStatus).toBe('idle');
      expect(result.current.isDetecting).toBe(false);
      expect(result.current.isTesting).toBe(false);
      expect(result.current.isApplying).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Configuration', () => {
    it('sets proxy mode', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setMode('manual');
      });

      expect(result.current.config.mode).toBe('manual');
      expect(result.current.status.mode).toBe('manual');
    });

    it('sets enabled state', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.config.enabled).toBe(true);
      expect(result.current.status.enabled).toBe(true);
    });

    it('sets manual config', () => {
      const { result } = renderHook(() => useProxyStore());

      const manualConfig = {
        protocol: 'http' as const,
        host: '127.0.0.1',
        port: 8080,
        username: 'user',
        password: 'pass',
      };

      act(() => {
        result.current.setManualConfig(manualConfig);
      });

      expect(result.current.config.manual).toEqual(manualConfig);
    });

    it('sets selected proxy', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setSelectedProxy('clash');
      });

      expect(result.current.config.selectedProxy).toBe('clash');
    });

    it('sets test URL', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setTestUrl('https://google.com');
      });

      expect(result.current.config.testUrl).toBe('https://google.com');
    });

    it('sets auto detect interval', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setAutoDetectInterval(60000);
      });

      expect(result.current.config.autoDetectInterval).toBe(60000);
    });

    it('updates config partially', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.updateConfig({ enabled: true, mode: 'auto' });
      });

      expect(result.current.config.enabled).toBe(true);
      expect(result.current.config.mode).toBe('auto');
    });
  });

  describe('Detection', () => {
    it('sets detected proxies', () => {
      const { result } = renderHook(() => useProxyStore());

      const proxies: DetectedProxy[] = [
        { software: 'clash', running: true, httpPort: 7890 } as DetectedProxy,
        { software: 'v2ray', running: false } as DetectedProxy,
      ];

      act(() => {
        result.current.setDetectedProxies(proxies);
      });

      expect(result.current.detectedProxies).toHaveLength(2);
    });

    it('adds detected proxy and replaces existing with same software', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.addDetectedProxy({
          software: 'clash',
          running: true,
          httpPort: 7890,
        } as DetectedProxy);
      });

      act(() => {
        result.current.addDetectedProxy({
          software: 'clash',
          running: true,
          httpPort: 7891,
        } as DetectedProxy);
      });

      expect(result.current.detectedProxies).toHaveLength(1);
      expect(
        (result.current.detectedProxies[0] as DetectedProxy & { httpPort: number }).httpPort
      ).toBe(7891);
    });

    it('sets detection status', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setDetectionStatus('detecting');
      });

      expect(result.current.detectionStatus).toBe('detecting');
    });
  });

  describe('Status', () => {
    it('sets status partially', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setStatus({ connected: true });
      });

      expect(result.current.status.connected).toBe(true);
    });

    it('sets test result', () => {
      const { result } = renderHook(() => useProxyStore());

      const testResult = {
        success: true,
        latency: 100,
      } as ProxyTestResult;

      act(() => {
        result.current.setTestResult(testResult);
      });

      expect(result.current.status.connected).toBe(true);
      expect(result.current.status.lastTest).toEqual(testResult);
      expect(result.current.status.lastTestTime).toBeDefined();
    });
  });

  describe('UI State', () => {
    it('sets detecting state', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setDetecting(true);
      });

      expect(result.current.isDetecting).toBe(true);
    });

    it('sets testing state', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setTesting(true);
      });

      expect(result.current.isTesting).toBe(true);
    });

    it('sets applying state', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setApplying(true);
      });

      expect(result.current.isApplying).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('sets error', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setError('Connection failed');
      });

      expect(result.current.error).toBe('Connection failed');
    });

    it('clears error', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setError('Some error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Reset', () => {
    it('resets to initial state', () => {
      const { result } = renderHook(() => useProxyStore());

      act(() => {
        result.current.setEnabled(true);
        result.current.setMode('manual');
        result.current.setError('Error');
        result.current.setDetecting(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.config.enabled).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isDetecting).toBe(false);
    });
  });
});

describe('getActiveProxyUrl', () => {
  it('returns null when disabled', () => {
    const state = {
      config: {
        enabled: false,
        mode: 'manual',
        manual: { protocol: 'http', host: '127.0.0.1', port: 8080 },
        selectedProxy: undefined,
        testUrl: '',
        autoDetectInterval: 30000,
      },
      status: {
        enabled: false,
        mode: 'off',
        connected: false,
        lastTest: null,
        lastTestTime: null,
        currentProxy: undefined,
      },
      detectedProxies: [],
      detectionStatus: 'idle',
      isDetecting: false,
      isTesting: false,
      isApplying: false,
      error: null,
    } as unknown as ProxyState;

    expect(getActiveProxyUrl(state)).toBeNull();
  });

  it('returns null when mode is off', () => {
    const state = {
      config: {
        enabled: true,
        mode: 'off',
        manual: undefined,
        selectedProxy: undefined,
        testUrl: '',
        autoDetectInterval: 30000,
      },
      status: {
        enabled: true,
        mode: 'off',
        connected: false,
        lastTest: null,
        lastTestTime: null,
        currentProxy: undefined,
      },
      detectedProxies: [],
      detectionStatus: 'idle',
      isDetecting: false,
      isTesting: false,
      isApplying: false,
      error: null,
    } as unknown as ProxyState;

    expect(getActiveProxyUrl(state)).toBeNull();
  });

  it('returns manual proxy URL', () => {
    const state = {
      config: {
        enabled: true,
        mode: 'manual',
        manual: { protocol: 'http', host: '127.0.0.1', port: 8080 },
        selectedProxy: undefined,
        testUrl: '',
        autoDetectInterval: 30000,
      },
      status: {
        enabled: true,
        mode: 'manual',
        connected: false,
        lastTest: null,
        lastTestTime: null,
        currentProxy: undefined,
      },
      detectedProxies: [],
      detectionStatus: 'idle',
      isDetecting: false,
      isTesting: false,
      isApplying: false,
      error: null,
    } as unknown as ProxyState;

    expect(getActiveProxyUrl(state)).toBe('http://127.0.0.1:8080');
  });

  it('returns manual proxy URL with auth', () => {
    const state = {
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          protocol: 'http',
          host: '127.0.0.1',
          port: 8080,
          username: 'user',
          password: 'pass',
        },
        selectedProxy: undefined,
        testUrl: '',
        autoDetectInterval: 30000,
      },
      status: {
        enabled: true,
        mode: 'manual',
        connected: false,
        lastTest: null,
        lastTestTime: null,
        currentProxy: undefined,
      },
      detectedProxies: [],
      detectionStatus: 'idle',
      isDetecting: false,
      isTesting: false,
      isApplying: false,
      error: null,
    } as unknown as ProxyState;

    expect(getActiveProxyUrl(state)).toBe('http://user:pass@127.0.0.1:8080');
  });

  it('returns auto-detected proxy URL', () => {
    const state = {
      config: {
        enabled: true,
        mode: 'auto',
        manual: undefined,
        selectedProxy: 'clash',
        testUrl: '',
        autoDetectInterval: 30000,
      },
      status: {
        enabled: true,
        mode: 'auto',
        connected: false,
        lastTest: null,
        lastTestTime: null,
        currentProxy: undefined,
      },
      detectedProxies: [
        { software: 'clash', running: true, httpPort: 7890, mixedPort: 7890 } as DetectedProxy,
      ],
      detectionStatus: 'idle',
      isDetecting: false,
      isTesting: false,
      isApplying: false,
      error: null,
    } as unknown as ProxyState;

    expect(getActiveProxyUrl(state)).toBe('http://127.0.0.1:7890');
  });
});

describe('Selector Hooks', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useProxyStore());
    act(() => {
      result.current.reset();
    });
  });

  it('useProxyConfig returns config', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setMode('manual');
    });

    const { result } = renderHook(() => useProxyConfig());
    expect(result.current.mode).toBe('manual');
  });

  it('useProxyStatus returns status', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setStatus({ connected: true });
    });

    const { result } = renderHook(() => useProxyStatus());
    expect(result.current.connected).toBe(true);
  });

  it('useProxyMode returns mode', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setMode('auto');
    });

    const { result } = renderHook(() => useProxyMode());
    expect(result.current).toBe('auto');
  });

  it('useProxyEnabled returns enabled state', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setEnabled(true);
    });

    const { result } = renderHook(() => useProxyEnabled());
    expect(result.current).toBe(true);
  });

  it('useDetectedProxies returns detected proxies', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setDetectedProxies([
        { software: 'clash', running: true } as DetectedProxy,
      ]);
    });

    const { result } = renderHook(() => useDetectedProxies());
    expect(result.current).toHaveLength(1);
  });

  it('useProxyDetecting returns detecting state', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setDetecting(true);
    });

    const { result } = renderHook(() => useProxyDetecting());
    expect(result.current).toBe(true);
  });

  it('useProxyTesting returns testing state', () => {
    const store = renderHook(() => useProxyStore());
    act(() => {
      store.result.current.setTesting(true);
    });

    const { result } = renderHook(() => useProxyTesting());
    expect(result.current).toBe(true);
  });
});
