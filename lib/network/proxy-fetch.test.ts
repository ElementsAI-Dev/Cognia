/**
 * Tests for Proxy-aware Fetch Utility
 */

import {
  getCurrentProxyUrl,
  isProxyEnabled,
  getProxyConfig,
  createProxyFetch,
  getProxyEnvironmentVars,
  formatProxiedUrl,
  getProxyAuthHeaders,
  proxyFetch,
} from './proxy-fetch';

// Mock the proxy store
const mockGetState = jest.fn();

jest.mock('@/stores/system', () => ({
  useProxyStore: {
    getState: () => mockGetState(),
  },
  getActiveProxyUrl: jest.fn((state) => {
    if (!state.config.enabled || state.config.mode === 'off') {
      return null;
    }
    if (state.config.mode === 'manual' && state.config.manual?.url) {
      return state.config.manual.url;
    }
    if (state.config.mode === 'system' && state.config.system?.url) {
      return state.config.system.url;
    }
    return null;
  }),
}));

// Mock global fetch and Response
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Response for Node.js environment
class MockResponse {
  constructor(public body: string) {}
}
(global as unknown as Record<string, unknown>).Response = MockResponse;

describe('getCurrentProxyUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when proxy is disabled', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: false,
        mode: 'off',
      },
    });

    const result = getCurrentProxyUrl();
    expect(result).toBeNull();
  });

  it('returns manual proxy URL when configured', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          url: 'http://proxy.example.com:8080',
        },
      },
    });

    const result = getCurrentProxyUrl();
    expect(result).toBe('http://proxy.example.com:8080');
  });

  it('returns system proxy URL when configured', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'system',
        system: {
          url: 'http://system-proxy:3128',
        },
      },
    });

    const result = getCurrentProxyUrl();
    expect(result).toBe('http://system-proxy:3128');
  });

  it('returns null when mode is off even if enabled', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'off',
      },
    });

    const result = getCurrentProxyUrl();
    expect(result).toBeNull();
  });
});

describe('isProxyEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when disabled', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: false,
        mode: 'manual',
      },
    });

    expect(isProxyEnabled()).toBe(false);
  });

  it('returns false when mode is off', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'off',
      },
    });

    expect(isProxyEnabled()).toBe(false);
  });

  it('returns true when enabled and mode is manual', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
      },
    });

    expect(isProxyEnabled()).toBe(true);
  });

  it('returns true when enabled and mode is system', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'system',
      },
    });

    expect(isProxyEnabled()).toBe(true);
  });
});

describe('getProxyConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns disabled config when no proxy', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: false,
        mode: 'off',
      },
    });

    const config = getProxyConfig();

    expect(config.enabled).toBe(false);
    expect(config.url).toBeNull();
    expect(config.host).toBeNull();
    expect(config.port).toBeNull();
    expect(config.protocol).toBeNull();
  });

  it('parses HTTP proxy URL correctly', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          url: 'http://proxy.example.com:8080',
        },
      },
    });

    const config = getProxyConfig();

    expect(config.enabled).toBe(true);
    expect(config.url).toBe('http://proxy.example.com:8080');
    expect(config.host).toBe('proxy.example.com');
    expect(config.port).toBe(8080);
    expect(config.protocol).toBe('http');
  });

  it('parses HTTPS proxy URL correctly', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          url: 'https://secure-proxy.example.com:443',
        },
      },
    });

    const config = getProxyConfig();

    expect(config.enabled).toBe(true);
    expect(config.host).toBe('secure-proxy.example.com');
    expect(config.port).toBe(443);
    expect(config.protocol).toBe('https');
  });

  it('uses default port 80 for HTTP without port', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          url: 'http://proxy.example.com',
        },
      },
    });

    const config = getProxyConfig();

    expect(config.port).toBe(80);
  });

  it('uses default port 443 for HTTPS without port', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          url: 'https://proxy.example.com',
        },
      },
    });

    const config = getProxyConfig();

    expect(config.port).toBe(443);
  });

  it('handles invalid URL gracefully', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: {
          url: 'not-a-valid-url',
        },
      },
    });

    const config = getProxyConfig();

    expect(config.enabled).toBe(false);
    expect(config.url).toBeNull();
  });
});

describe('createProxyFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue(new MockResponse('ok'));

    // Simulate browser environment (no Tauri)
    delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
  });

  it('creates a fetch function', () => {
    const fetch = createProxyFetch();
    expect(typeof fetch).toBe('function');
  });

  it('uses regular fetch in browser environment', async () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: { url: 'http://proxy:8080' },
      },
    });

    const fetch = createProxyFetch();
    await fetch('https://example.com');

    expect(mockFetch).toHaveBeenCalledWith('https://example.com', {});
  });

  it('respects skipProxy option', async () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: { url: 'http://proxy:8080' },
      },
    });

    const fetch = createProxyFetch();
    await fetch('https://example.com', { skipProxy: true });

    expect(mockFetch).toHaveBeenCalled();
  });

  it('supports timeout option', async () => {
    // Test that timeout option is accepted without throwing
    const fetch = createProxyFetch();
    // Just verify the function accepts timeout option
    mockFetch.mockResolvedValue(new MockResponse('ok'));
    const result = await fetch('https://example.com', { timeout: 5000 });
    expect(result).toBeDefined();
  });

  it('uses custom proxy URL when provided', async () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: { url: 'http://default-proxy:8080' },
      },
    });

    const fetch = createProxyFetch('http://custom-proxy:9090');
    await fetch('https://example.com');

    expect(mockFetch).toHaveBeenCalled();
  });

  it('passes through fetch options', async () => {
    const fetch = createProxyFetch();
    await fetch('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });

    expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    });
  });
});

describe('getProxyEnvironmentVars', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when no proxy', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: false,
        mode: 'off',
      },
    });

    const vars = getProxyEnvironmentVars();
    expect(vars).toEqual({});
  });

  it('returns all proxy environment variables', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: { url: 'http://proxy:8080' },
      },
    });

    const vars = getProxyEnvironmentVars();

    expect(vars).toEqual({
      HTTP_PROXY: 'http://proxy:8080',
      HTTPS_PROXY: 'http://proxy:8080',
      http_proxy: 'http://proxy:8080',
      https_proxy: 'http://proxy:8080',
    });
  });
});

describe('formatProxiedUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns original URL when no proxy', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: false,
        mode: 'off',
      },
    });

    const result = formatProxiedUrl('https://example.com');
    expect(result).toBe('https://example.com');
  });

  it('appends proxy info when proxy is enabled', () => {
    mockGetState.mockReturnValue({
      config: {
        enabled: true,
        mode: 'manual',
        manual: { url: 'http://proxy:8080' },
      },
    });

    const result = formatProxiedUrl('https://example.com');
    expect(result).toBe('https://example.com (via http://proxy:8080)');
  });
});

describe('getProxyAuthHeaders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object when no auth configured', () => {
    mockGetState.mockReturnValue({
      config: {
        mode: 'manual',
        manual: {},
      },
    });

    const headers = getProxyAuthHeaders();
    expect(headers).toEqual({});
  });

  it('returns empty object when not in manual mode', () => {
    mockGetState.mockReturnValue({
      config: {
        mode: 'system',
      },
    });

    const headers = getProxyAuthHeaders();
    expect(headers).toEqual({});
  });

  it('returns Basic auth header when credentials are configured', () => {
    mockGetState.mockReturnValue({
      config: {
        mode: 'manual',
        manual: {
          username: 'user',
          password: 'pass',
        },
      },
    });

    const headers = getProxyAuthHeaders();

    expect(headers['Proxy-Authorization']).toBeDefined();
    expect(headers['Proxy-Authorization']).toMatch(/^Basic /);

    // Verify the credentials are correctly encoded
    const encoded = headers['Proxy-Authorization'].replace('Basic ', '');
    const decoded = atob(encoded);
    expect(decoded).toBe('user:pass');
  });

  it('returns empty when only username is provided', () => {
    mockGetState.mockReturnValue({
      config: {
        mode: 'manual',
        manual: {
          username: 'user',
        },
      },
    });

    const headers = getProxyAuthHeaders();
    expect(headers).toEqual({});
  });

  it('returns empty when only password is provided', () => {
    mockGetState.mockReturnValue({
      config: {
        mode: 'manual',
        manual: {
          password: 'pass',
        },
      },
    });

    const headers = getProxyAuthHeaders();
    expect(headers).toEqual({});
  });
});

describe('proxyFetch', () => {
  it('is a function created by createProxyFetch', () => {
    expect(typeof proxyFetch).toBe('function');
  });
});
