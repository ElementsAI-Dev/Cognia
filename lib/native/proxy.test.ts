/**
 * Proxy Tests
 *
 * Tests for proxy service functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';
import {
  isProxyAvailable,
  detectAllProxies,
  testProxy,
  testProxyMulti,
  getSystemProxy,
  checkPort,
  getClashInfo,
  buildProxyUrlFromDetected,
  proxyService,
  type SystemProxySettings,
} from './proxy';
import type { DetectedProxy, ProxyTestResult } from '@/types/system/proxy';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

// Suppress console.error during tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('Proxy - isProxyAvailable', () => {
  it('should return true when in Tauri', () => {
    mockIsTauri.mockReturnValue(true);
    expect(isProxyAvailable()).toBe(true);
  });

  it('should return false when not in Tauri', () => {
    mockIsTauri.mockReturnValue(false);
    expect(isProxyAvailable()).toBe(false);
  });
});

describe('Proxy - detectAllProxies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await detectAllProxies();
    expect(result).toEqual([]);
  });

  it('should return detected proxies', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockProxies: DetectedProxy[] = [
      { name: 'Clash', software: 'clash', icon: '🔥', running: true, httpPort: 7890, mixedPort: 7890 },
    ];
    mockInvoke.mockResolvedValue(mockProxies);

    const result = await detectAllProxies();
    expect(mockInvoke).toHaveBeenCalledWith('proxy_detect_all');
    expect(result).toEqual(mockProxies);
  });

  it('should return empty array on error', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Test error'));

    const result = await detectAllProxies();
    expect(result).toEqual([]);
  });
});

describe('Proxy - testProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await testProxy('http://127.0.0.1:7890');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tauri');
  });

  it('should test proxy and return result', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockResult: ProxyTestResult = { success: true, latency: 100 };
    mockInvoke.mockResolvedValue(mockResult);

    const result = await testProxy('http://127.0.0.1:7890', 'https://google.com');
    expect(mockInvoke).toHaveBeenCalledWith('proxy_test', {
      proxyUrl: 'http://127.0.0.1:7890',
      testUrl: 'https://google.com',
    });
    expect(result).toEqual(mockResult);
  });

  it('should return error on invoke failure', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Connection failed'));

    const result = await testProxy('http://127.0.0.1:7890');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection failed');
  });
});

describe('Proxy - getSystemProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await getSystemProxy();
    expect(result).toBeNull();
  });

  it('should return system proxy settings', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockSettings: SystemProxySettings = {
      enabled: true,
      httpProxy: 'http://127.0.0.1:7890',
      httpsProxy: 'http://127.0.0.1:7890',
      socksProxy: null,
      noProxy: 'localhost,127.0.0.1',
    };
    mockInvoke.mockResolvedValue(mockSettings);

    const result = await getSystemProxy();
    expect(mockInvoke).toHaveBeenCalledWith('proxy_get_system');
    expect(result).toEqual(mockSettings);
  });

  it('should return null on error', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Test error'));

    const result = await getSystemProxy();
    expect(result).toBeNull();
  });
});

describe('Proxy - checkPort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return false when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await checkPort('127.0.0.1', 7890);
    expect(result).toBe(false);
  });

  it('should check if port is open', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue(true);

    const result = await checkPort('127.0.0.1', 7890);
    expect(mockInvoke).toHaveBeenCalledWith('proxy_check_port', { host: '127.0.0.1', port: 7890 });
    expect(result).toBe(true);
  });

  it('should return false on error', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Test error'));

    const result = await checkPort('127.0.0.1', 7890);
    expect(result).toBe(false);
  });
});

describe('Proxy - getClashInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await getClashInfo(9090);
    expect(result).toBeNull();
  });

  it('should return clash info', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockInfo = { version: '1.18.0', mode: 'rule' };
    mockInvoke.mockResolvedValue(mockInfo);

    const result = await getClashInfo(9090);
    expect(mockInvoke).toHaveBeenCalledWith('proxy_get_clash_info', { apiPort: 9090 });
    expect(result).toEqual(mockInfo);
  });

  it('should return null on error', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Test error'));

    const result = await getClashInfo(9090);
    expect(result).toBeNull();
  });
});

describe('Proxy - buildProxyUrlFromDetected', () => {
  it('should return null if proxy is not running', () => {
    const proxy: DetectedProxy = { name: 'Clash', software: 'clash', icon: '🔥', running: false };
    expect(buildProxyUrlFromDetected(proxy)).toBeNull();
  });

  it('should return null if no port is available', () => {
    const proxy: DetectedProxy = { name: 'Clash', software: 'clash', icon: '🔥', running: true };
    expect(buildProxyUrlFromDetected(proxy)).toBeNull();
  });

  it('should use mixedPort if available', () => {
    const proxy: DetectedProxy = { name: 'Clash', software: 'clash', icon: '🔥', running: true, mixedPort: 7890, httpPort: 7891 };
    expect(buildProxyUrlFromDetected(proxy)).toBe('http://127.0.0.1:7890');
  });

  it('should use httpPort if mixedPort not available', () => {
    const proxy: DetectedProxy = { name: 'Clash', software: 'clash', icon: '🔥', running: true, httpPort: 7891 };
    expect(buildProxyUrlFromDetected(proxy)).toBe('http://127.0.0.1:7891');
  });
});

describe('Proxy - proxyService', () => {
  it('should expose all functions', () => {
    expect(proxyService.isAvailable).toBe(isProxyAvailable);
    expect(proxyService.detectAll).toBe(detectAllProxies);
    expect(proxyService.test).toBe(testProxy);
    expect(proxyService.testMulti).toBe(testProxyMulti);
    expect(proxyService.getSystem).toBe(getSystemProxy);
    expect(proxyService.checkPort).toBe(checkPort);
    expect(proxyService.getClashInfo).toBe(getClashInfo);
    expect(proxyService.buildUrl).toBe(buildProxyUrlFromDetected);
  });
});

describe('Proxy - testProxyMulti', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty result when not in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);

    const result = await testProxyMulti('http://127.0.0.1:7890');
    expect(result.overallSuccess).toBe(false);
    expect(result.successfulEndpoints).toBe(0);
    expect(result.totalEndpoints).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('should test proxy with multiple endpoints', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockResult = {
      overall_success: true,
      successful_endpoints: 3,
      total_endpoints: 5,
      avg_latency: 150,
      best_endpoint: 'Google (204)',
      results: [
        { url: 'https://www.google.com/generate_204', name: 'Google (204)', success: true, latency: 100, status_code: 204 },
        { url: 'https://cp.cloudflare.com/', name: 'Cloudflare', success: true, latency: 120, status_code: 200 },
        { url: 'https://captive.apple.com/', name: 'Apple Captive', success: true, latency: 230, status_code: 200 },
        { url: 'https://www.msftconnecttest.com/connecttest.txt', name: 'Microsoft', success: false, error: 'timeout' },
        { url: 'https://www.gstatic.com/generate_204', name: 'Google Static', success: false, error: 'connection refused' },
      ],
      ip: '1.2.3.4',
      location: 'Tokyo, JP',
    };
    mockInvoke.mockResolvedValue(mockResult);

    const result = await testProxyMulti('http://127.0.0.1:7890');

    expect(mockInvoke).toHaveBeenCalledWith('proxy_test_multi', {
      proxyUrl: 'http://127.0.0.1:7890',
      testUrls: undefined,
    });
    expect(result.overallSuccess).toBe(true);
    expect(result.successfulEndpoints).toBe(3);
    expect(result.totalEndpoints).toBe(5);
    expect(result.avgLatency).toBe(150);
    expect(result.bestEndpoint).toBe('Google (204)');
    expect(result.results).toHaveLength(5);
    expect(result.ip).toBe('1.2.3.4');
    expect(result.location).toBe('Tokyo, JP');
  });

  it('should pass custom test URLs', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue({
      overall_success: true,
      successful_endpoints: 1,
      total_endpoints: 1,
      results: [{ url: 'https://custom.com', name: 'https://custom.com', success: true, latency: 50 }],
    });

    await testProxyMulti('http://127.0.0.1:7890', ['https://custom.com']);

    expect(mockInvoke).toHaveBeenCalledWith('proxy_test_multi', {
      proxyUrl: 'http://127.0.0.1:7890',
      testUrls: ['https://custom.com'],
    });
  });

  it('should return empty result on invoke failure', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Connection failed'));

    const result = await testProxyMulti('http://127.0.0.1:7890');

    expect(result.overallSuccess).toBe(false);
    expect(result.successfulEndpoints).toBe(0);
    expect(result.results).toEqual([]);
  });

  it('should convert snake_case to camelCase in results', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue({
      overall_success: true,
      successful_endpoints: 1,
      total_endpoints: 1,
      avg_latency: 100,
      best_endpoint: 'Test',
      results: [{ url: 'https://test.com', name: 'Test', success: true, latency: 100, status_code: 200 }],
    });

    const result = await testProxyMulti('http://127.0.0.1:7890');

    // Verify camelCase conversion
    expect(result.overallSuccess).toBeDefined();
    expect(result.successfulEndpoints).toBeDefined();
    expect(result.totalEndpoints).toBeDefined();
    expect(result.avgLatency).toBeDefined();
    expect(result.bestEndpoint).toBeDefined();
    expect(result.results[0].statusCode).toBe(200);
  });
});
