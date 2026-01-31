/**
 * Proxy Configuration Types
 *
 * Type definitions for network proxy management:
 * - Auto-detection of Clash, V2Ray, Shadowsocks, etc.
 * - Manual proxy configuration
 * - System proxy integration
 */

/** Proxy protocol types */
export type ProxyProtocol = 'http' | 'https' | 'socks4' | 'socks5';

/** Proxy mode */
export type ProxyMode = 'off' | 'system' | 'manual' | 'auto';

/** Known proxy software */
export type ProxySoftware =
  | 'clash'
  | 'clash-verge'
  | 'clash-for-windows'
  | 'v2ray'
  | 'v2rayn'
  | 'shadowsocks'
  | 'shadowsocksr'
  | 'trojan'
  | 'sing-box'
  | 'surge'
  | 'quantumult'
  | 'proxifier'
  | 'unknown';

/** Proxy detection status */
export type DetectionStatus = 'idle' | 'detecting' | 'detected' | 'not_found' | 'error';

/** Manual proxy configuration */
export interface ManualProxyConfig {
  protocol: ProxyProtocol;
  host: string;
  port: number;
  username?: string;
  password?: string;
  /** Bypass list (comma-separated hosts) */
  bypass?: string;
}

/** Detected proxy software info */
export interface DetectedProxy {
  software: ProxySoftware;
  name: string;
  icon: string;
  running: boolean;
  httpPort?: number;
  socksPort?: number;
  mixedPort?: number;
  apiPort?: number;
  apiUrl?: string;
  version?: string;
  configPath?: string;
}

/** Proxy test result */
export interface ProxyTestResult {
  success: boolean;
  latency?: number; // ms
  ip?: string;
  location?: string;
  error?: string;
}

/** Test endpoint configuration */
export interface TestEndpoint {
  /** Endpoint URL */
  url: string;
  /** Display name */
  name: string;
  /** Expected response status (default: 200 or 204) */
  expectedStatus?: number[];
  /** Whether this endpoint is enabled */
  enabled: boolean;
}

/** Default test endpoints for proxy verification */
export const DEFAULT_TEST_ENDPOINTS: TestEndpoint[] = [
  {
    url: 'https://www.google.com/generate_204',
    name: 'Google (204)',
    expectedStatus: [204],
    enabled: true,
  },
  {
    url: 'https://www.gstatic.com/generate_204',
    name: 'Google Static (204)',
    expectedStatus: [204],
    enabled: true,
  },
  {
    url: 'https://cp.cloudflare.com/',
    name: 'Cloudflare',
    expectedStatus: [200],
    enabled: true,
  },
  {
    url: 'https://www.msftconnecttest.com/connecttest.txt',
    name: 'Microsoft',
    expectedStatus: [200],
    enabled: true,
  },
  {
    url: 'https://captive.apple.com/',
    name: 'Apple Captive',
    expectedStatus: [200],
    enabled: true,
  },
  {
    url: 'https://httpbin.org/status/200',
    name: 'HTTPBin',
    expectedStatus: [200],
    enabled: false,
  },
];

/** Proxy configuration */
export interface ProxyConfig {
  /** Proxy mode */
  mode: ProxyMode;
  /** Manual proxy settings (when mode is 'manual') */
  manual?: ManualProxyConfig;
  /** Selected detected proxy (when mode is 'auto') */
  selectedProxy?: ProxySoftware;
  /** Apply proxy to all requests */
  enabled: boolean;
  /** Test URL for proxy verification (primary) */
  testUrl: string;
  /** Multiple test endpoints for fallback */
  testEndpoints?: TestEndpoint[];
  /** Auto-detect interval in seconds (0 = disabled) */
  autoDetectInterval: number;
  /** Health check interval in seconds (0 = disabled) */
  healthCheckInterval?: number;
}

/** Proxy status */
export interface ProxyStatus {
  mode: ProxyMode;
  enabled: boolean;
  connected: boolean;
  currentProxy: string | null;
  lastTest: ProxyTestResult | null;
  lastTestTime: string | null;
}

/** Common proxy software default ports */
export const PROXY_SOFTWARE_DEFAULTS: Record<
  ProxySoftware,
  { httpPort: number; socksPort: number; mixedPort?: number; apiPort?: number }
> = {
  clash: { httpPort: 7890, socksPort: 7891, mixedPort: 7890, apiPort: 9090 },
  'clash-verge': { httpPort: 7897, socksPort: 7898, mixedPort: 7897, apiPort: 9097 },
  'clash-for-windows': { httpPort: 7890, socksPort: 7891, mixedPort: 7890, apiPort: 9090 },
  v2ray: { httpPort: 10809, socksPort: 10808 },
  v2rayn: { httpPort: 10809, socksPort: 10808 },
  shadowsocks: { httpPort: 1080, socksPort: 1080 },
  shadowsocksr: { httpPort: 1080, socksPort: 1080 },
  trojan: { httpPort: 1080, socksPort: 1080 },
  'sing-box': { httpPort: 2080, socksPort: 2081, mixedPort: 2080 },
  surge: { httpPort: 6152, socksPort: 6153 },
  quantumult: { httpPort: 8888, socksPort: 8889 },
  proxifier: { httpPort: 1080, socksPort: 1080 },
  unknown: { httpPort: 7890, socksPort: 7891 },
};

/** Proxy software display info */
export const PROXY_SOFTWARE_INFO: Record<
  ProxySoftware,
  { name: string; icon: string; description: string }
> = {
  clash: {
    name: 'Clash',
    icon: '⚔️',
    description: 'A rule-based tunnel in Go',
  },
  'clash-verge': {
    name: 'Clash Verge',
    icon: '🔷',
    description: 'Clash Verge - A Clash Meta GUI',
  },
  'clash-for-windows': {
    name: 'Clash for Windows',
    icon: '🪟',
    description: 'A Windows/macOS GUI based on Clash',
  },
  v2ray: {
    name: 'V2Ray',
    icon: '🚀',
    description: 'Project V - A platform for building proxies',
  },
  v2rayn: {
    name: 'V2RayN',
    icon: '🔵',
    description: 'V2Ray Windows client',
  },
  shadowsocks: {
    name: 'Shadowsocks',
    icon: '✈️',
    description: 'A fast tunnel proxy',
  },
  shadowsocksr: {
    name: 'ShadowsocksR',
    icon: '🛫',
    description: 'ShadowsocksR client',
  },
  trojan: {
    name: 'Trojan',
    icon: '🐴',
    description: 'An unidentifiable mechanism that helps bypass GFW',
  },
  'sing-box': {
    name: 'sing-box',
    icon: '📦',
    description: 'The universal proxy platform',
  },
  surge: {
    name: 'Surge',
    icon: '🌊',
    description: 'Advanced network toolbox for Mac & iOS',
  },
  quantumult: {
    name: 'Quantumult X',
    icon: '⚡',
    description: 'Powerful proxy client',
  },
  proxifier: {
    name: 'Proxifier',
    icon: '🔀',
    description: 'Proxifier allows network apps to use a proxy',
  },
  unknown: {
    name: 'Unknown Proxy',
    icon: '🌐',
    description: 'Unknown or custom proxy software',
  },
};

/** Default proxy configuration */
export function createDefaultProxyConfig(): ProxyConfig {
  return {
    mode: 'off',
    enabled: false,
    testUrl: 'https://www.google.com/generate_204',
    testEndpoints: DEFAULT_TEST_ENDPOINTS,
    autoDetectInterval: 30,
    healthCheckInterval: 60,
  };
}

/** Default proxy status */
export function createDefaultProxyStatus(): ProxyStatus {
  return {
    mode: 'off',
    enabled: false,
    connected: false,
    currentProxy: null,
    lastTest: null,
    lastTestTime: null,
  };
}

/** Build proxy URL from config */
export function buildProxyUrl(config: ManualProxyConfig): string {
  const { protocol, host, port, username, password } = config;
  const auth = username && password ? `${username}:${password}@` : '';
  return `${protocol}://${auth}${host}:${port}`;
}

/** Parse proxy URL to config */
export function parseProxyUrl(url: string): ManualProxyConfig | null {
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.replace(':', '') as ProxyProtocol;
    if (!['http', 'https', 'socks4', 'socks5'].includes(protocol)) {
      return null;
    }
    return {
      protocol,
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (protocol === 'https' ? 443 : 80),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
    };
  } catch {
    return null;
  }
}
